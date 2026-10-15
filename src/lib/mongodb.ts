import { MongoClient, type Db, type Collection, ObjectId } from "mongodb";
import dotenv from "dotenv";
import crypto from "node:crypto";

// Load .env variables if running in Node environment
if (typeof process !== "undefined" && process.env) {
  dotenv.config();
}

export function getMongoUri(): string {
  if (typeof process !== "undefined" && process.env) {
    try {
      dotenv.config({ override: true });
    } catch {}
  }
  return (typeof process !== "undefined" && process.env ? process.env["MONGO_URI"] : "") || "";
}

export function getDbName(): string {
  return (typeof process !== "undefined" && process.env ? process.env["MONGO_DB_NAME"] : "") || "tracker_db";
}

const COLLECTION_NAME = "tracker";
const USERS_COLLECTION_NAME = "users";
const CHALLENGES_COLLECTION_NAME = "challenges";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackerItemDoc {
  _id: any;
  userId?: string;
  key: string;
  value: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient> | undefined;
  _activeMongoUri?: string | undefined;
}

const globalWithMongo = globalThis as typeof globalThis & GlobalMongo;

function getClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error("MONGO_URI is missing from environment variables or .env file.");
  }

  // If the URI changed (e.g. .env was updated), invalidate old promise so we reconnect
  if (globalWithMongo._activeMongoUri && globalWithMongo._activeMongoUri !== uri) {
    console.log("🔄 [MongoDB] Detected updated MONGO_URI, reconnecting to new cluster...");
    globalWithMongo._mongoClientPromise = undefined;
  }
  globalWithMongo._activeMongoUri = uri;

  if (process.env["NODE_ENV"] === "development") {
    // In dev mode, use global variable to preserve connection across HMR
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      globalWithMongo._mongoClientPromise = client
        .connect()
        .then((c) => {
          console.log("✅ [MongoDB] Connected to MongoDB Atlas cluster");
          return c;
        })
        .catch((err) => {
          // IMPORTANT: Clear cached promise on failure so subsequent requests can retry
          globalWithMongo._mongoClientPromise = undefined;
          console.error(`❌ [MongoDB] Connection error: ${err.message}`);
          throw err;
        });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, avoid global variable
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    return client.connect();
  }
}

export async function getTrackerDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getDbName());
}

export async function getTrackerCollection(): Promise<Collection<TrackerItemDoc>> {
  const db = await getTrackerDb();
  const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`Creating collection '${COLLECTION_NAME}' in database '${getDbName()}'...`);
    return await db.createCollection<TrackerItemDoc>(COLLECTION_NAME);
  }
  return db.collection<TrackerItemDoc>(COLLECTION_NAME);
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getTrackerDb();
  const collections = await db.listCollections({ name: USERS_COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`Creating collection '${USERS_COLLECTION_NAME}' in database '${getDbName()}'...`);
    const col = await db.createCollection<UserDoc>(USERS_COLLECTION_NAME);
    try {
      await col.createIndex({ email: 1 }, { unique: true });
    } catch (e) {
      console.warn("Index creation warning:", e);
    }
    return col;
  }
  return db.collection<UserDoc>(USERS_COLLECTION_NAME);
}

export interface CustomChallengeDoc {
  _id?: any;
  id: string;
  userId: string;
  type: "custom";
  name: string;
  days: number;
  level: "Easy" | "Medium" | "Hard";
  reqs: string[];
  createdAt: string;
  updatedAt?: Date;
}

export interface ActiveChallengeProgressDoc {
  _id?: any;
  userId: string;
  type: "active_progress";
  activeName: string;
  totalDays: number;
  day: number;
  streak: number;
  checked: string[];
  activeReqs: string[];
  history?: Array<{ name: string; status: string; completedAt?: string }>;
  updatedAt: Date;
}

export async function getChallengesCollection(): Promise<Collection<any>> {
  const db = await getTrackerDb();
  const collections = await db.listCollections({ name: CHALLENGES_COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`Creating collection '${CHALLENGES_COLLECTION_NAME}' in database '${getDbName()}'...`);
    const col = await db.createCollection(CHALLENGES_COLLECTION_NAME);
    try {
      await col.createIndex({ userId: 1, type: 1 });
      await col.createIndex({ userId: 1, id: 1 });
    } catch (e) {
      console.warn("Challenges index creation warning:", e);
    }
    return col;
  }
  return db.collection(CHALLENGES_COLLECTION_NAME);
}

// Password hashing helpers using native node:crypto
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHash, "hex"));
  } catch {
    return false;
  }
}

// User signup with MongoDB ID generation
export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<{ success: boolean; user?: { id: string; name: string; email: string }; error?: string }> {
  try {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Please enter your name (at least 2 characters)." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    const usersCol = await getUsersCollection();
    const existing = await usersCol.findOne({ email: cleanEmail });
    if (existing) {
      return { success: false, error: "An account with this email already exists. Please log in." };
    }

    const { hash, salt } = hashPassword(password);
    const now = new Date();

    const insertResult = await usersCol.insertOne({
      _id: new ObjectId(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      createdAt: now,
      updatedAt: now,
    });

    const mongoUserId = insertResult.insertedId.toString();

    // Link initial details of this user in the tracker collection using the MongoDB _id
    const trackerCol = await getTrackerCollection();
    await trackerCol.updateOne(
      { _id: `${mongoUserId}:profile` as any },
      {
        $set: {
          userId: mongoUserId,
          key: "profile",
          value: {
            name: cleanName,
            email: cleanEmail,
            mongoId: mongoUserId,
            joinedAt: now.toISOString(),
          },
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    console.log(`✅ [MongoDB] User created with ID: ${mongoUserId} (${cleanEmail})`);

    return {
      success: true,
      user: {
        id: mongoUserId,
        name: cleanName,
        email: cleanEmail,
      },
    };
  } catch (err: any) {
    console.error("[MongoDB] createUser error:", err);
    return { success: false, error: err?.message || "Failed to create user." };
  }
}

// User login authentication
export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ success: boolean; user?: { id: string; name: string; email: string }; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ email: cleanEmail });
    if (!user) {
      return { success: false, error: "No account found with this email. Please sign up." };
    }

    const valid = verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    const mongoUserId = user._id.toString();

    return {
      success: true,
      user: {
        id: mongoUserId,
        name: user.name,
        email: user.email,
      },
    };
  } catch (err: any) {
    console.error("[MongoDB] authenticateUser error:", err);
    return { success: false, error: err?.message || "Authentication failed." };
  }
}

// Fetch user by Mongo ID
export async function getUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const usersCol = await getUsersCollection();
    let objId: ObjectId;
    try {
      objId = new ObjectId(userId);
    } catch {
      return null;
    }
    const doc = await usersCol.findOne({ _id: objId });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
    };
  } catch {
    return null;
  }
}

// Fetch all tracker data linked to a specific user's MongoDB ID
export async function getUserTrackerData(userId: string): Promise<Record<string, unknown>> {
  try {
    const col = await getTrackerCollection();
    const docs = await col.find({ userId }).toArray();
    const result: Record<string, unknown> = {};
    for (const doc of docs) {
      if (doc.key) {
        result[doc.key] = doc.value;
      }
    }
    return result;
  } catch (err) {
    console.error(`[MongoDB] Error reading data for user '${userId}':`, err);
    return {};
  }
}

// Save a tracker data item linked to a user's MongoDB ID
export async function setUserTrackerItem<T = unknown>(
  userId: string,
  key: string,
  value: T,
): Promise<boolean> {
  try {
    const col = await getTrackerCollection();
    const now = new Date();
    await col.updateOne(
      { _id: `${userId}:${key}` as any },
      {
        $set: {
          userId,
          key,
          value,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    // If saving custom challenge list, also ensure each item is saved to challenges collection
    if (key === "challenge-custom-list" && Array.isArray(value)) {
      try {
        const challengesCol = await getChallengesCollection();
        for (const item of value) {
          if (item && item.name) {
            await challengesCol.updateOne(
              { userId, id: item.id || `cust_${item.name}`, type: "custom" },
              {
                $set: {
                  id: item.id || `cust_${item.name}`,
                  userId,
                  type: "custom",
                  name: item.name,
                  days: Number(item.days) || 30,
                  level: item.level || "Medium",
                  reqs: Array.isArray(item.reqs) ? item.reqs : [],
                  createdAt: item.createdAt || now.toISOString(),
                  updatedAt: now,
                },
              },
              { upsert: true }
            );
          }
        }
      } catch (syncErr) {
        console.warn("[MongoDB] Secondary sync to challenges collection warning:", syncErr);
      }
    }

    return true;
  } catch (err) {
    console.error(`[MongoDB] Error setting '${key}' for user '${userId}':`, err);
    return false;
  }
}

// Bulk sync all tracker items linked to a user's MongoDB ID
export async function syncUserTrackerData(
  userId: string,
  items: Record<string, unknown>,
): Promise<boolean> {
  try {
    const col = await getTrackerCollection();
    const now = new Date();
    const ops = Object.entries(items).map(([key, value]) => ({
      updateOne: {
        filter: { _id: `${userId}:${key}` as any },
        update: {
          $set: { userId, key, value, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await col.bulkWrite(ops);
    }

    if (items["challenge-custom-list"] && Array.isArray(items["challenge-custom-list"])) {
      const challengesCol = await getChallengesCollection();
      for (const item of items["challenge-custom-list"] as any[]) {
        if (item && item.name) {
          await challengesCol.updateOne(
            { userId, id: item.id || `cust_${item.name}`, type: "custom" },
            {
              $set: {
                id: item.id || `cust_${item.name}`,
                userId,
                type: "custom",
                name: item.name,
                days: Number(item.days) || 30,
                level: item.level || "Medium",
                reqs: Array.isArray(item.reqs) ? item.reqs : [],
                createdAt: item.createdAt || now.toISOString(),
                updatedAt: now,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    return true;
  } catch (err) {
    console.error(`[MongoDB] Error syncing data for user '${userId}':`, err);
    return false;
  }
}

// Save a custom challenge directly into the MongoDB 'challenges' collection
export async function saveCustomChallenge(
  userId: string,
  challenge: {
    id: string;
    name: string;
    days: number;
    level: "Easy" | "Medium" | "Hard";
    reqs: string[];
    createdAt?: string;
  },
): Promise<{ success: boolean; challenge?: any; error?: string }> {
  try {
    const col = await getChallengesCollection();
    const now = new Date();
    const doc: CustomChallengeDoc = {
      id: challenge.id || `cust_${Date.now()}`,
      userId,
      type: "custom",
      name: challenge.name.trim(),
      days: Number(challenge.days) || 30,
      level: challenge.level || "Medium",
      reqs: challenge.reqs || [],
      createdAt: challenge.createdAt || now.toISOString(),
      updatedAt: now,
    };

    await col.updateOne(
      { userId, id: doc.id, type: "custom" },
      { $set: doc },
      { upsert: true },
    );

    // Also update custom challenge list in the tracker collection for complete consistency
    const allCustoms = await getCustomChallenges(userId);
    await setUserTrackerItem(userId, "challenge-custom-list", allCustoms);

    console.log(`✅ [MongoDB] Saved custom challenge "${doc.name}" in 'challenges' collection for user: ${userId}`);
    return { success: true, challenge: doc };
  } catch (err: any) {
    console.error("[MongoDB] Error saving custom challenge:", err);
    return { success: false, error: err?.message || "Failed to save challenge." };
  }
}

// Fetch all custom challenges for a specific user from MongoDB
export async function getCustomChallenges(userId: string): Promise<any[]> {
  try {
    const col = await getChallengesCollection();
    const docs = await col
      .find({ userId, type: "custom" })
      .sort({ createdAt: -1 })
      .toArray();

    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      days: d.days,
      level: d.level,
      reqs: d.reqs || [],
      createdAt: d.createdAt,
    }));
  } catch (err) {
    console.error("[MongoDB] Error fetching custom challenges:", err);
    return [];
  }
}

// Delete a custom challenge from MongoDB
export async function deleteCustomChallenge(userId: string, challengeId: string): Promise<boolean> {
  try {
    const col = await getChallengesCollection();
    await col.deleteOne({ userId, id: challengeId, type: "custom" });

    // Also sync the tracker collection list directly by filtering
    const trackerCol = await getTrackerCollection();
    const trackerDoc = await trackerCol.findOne({ _id: `${userId}:challenge-custom-list` as any });
    if (trackerDoc && Array.isArray(trackerDoc.value)) {
      const filtered = trackerDoc.value.filter((item: any) => item?.id !== challengeId);
      const now = new Date();
      await trackerCol.updateOne(
        { _id: `${userId}:challenge-custom-list` as any },
        { $set: { userId, key: "challenge-custom-list", value: filtered, updatedAt: now } },
        { upsert: true },
      );
    }

    console.log(`✅ [MongoDB] Deleted custom challenge ${challengeId} for user ${userId}`);
    return true;
  } catch (err) {
    console.error("[MongoDB] Error deleting custom challenge:", err);
    return false;
  }
}

// Save active taken challenge state and day streak to MongoDB
export async function saveActiveChallenge(
  userId: string,
  data: {
    activeName: string;
    totalDays: number;
    day: number;
    streak: number;
    checked: string[];
    activeReqs: string[];
    history?: Array<{ name: string; status: string; completedAt?: string }>;
  },
): Promise<boolean> {
  try {
    const col = await getChallengesCollection();
    const now = new Date();
    await col.updateOne(
      { userId, type: "active_progress" },
      {
        $set: {
          userId,
          type: "active_progress",
          activeName: data.activeName,
          totalDays: Number(data.totalDays),
          day: Number(data.day),
          streak: Number(data.streak),
          checked: data.checked || [],
          activeReqs: data.activeReqs || [],
          history: data.history || [],
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    // Keep individual tracker keys updated in a single bulk operation for fast reading by other dashboard widgets
    await syncUserTrackerData(userId, {
      "challenge-name": data.activeName,
      "challenge-total-days": Number(data.totalDays),
      "challenge-day": Number(data.day),
      "challenge-streak": Number(data.streak),
      "challenge-checked": data.checked || [],
      "challenge-active-reqs": data.activeReqs || [],
      ...(data.history ? { "challenge-history": data.history } : {}),
    });

    console.log(`✅ [MongoDB] Saved active challenge "${data.activeName}" (Day ${data.day}/${data.totalDays}) for user: ${userId}`);
    return true;
  } catch (err) {
    console.error("[MongoDB] Error saving active challenge:", err);
    return false;
  }
}

// Fetch active taken challenge state from MongoDB
export async function getActiveChallenge(userId: string): Promise<any | null> {
  try {
    const col = await getChallengesCollection();
    const doc = await col.findOne({ userId, type: "active_progress" });
    if (!doc) {
      // Fallback to reading from tracker collection
      const trackerCol = await getTrackerCollection();
      const nameDoc = await trackerCol.findOne({ _id: `${userId}:challenge-name` as any });
      if (!nameDoc) return null;
      const totalDaysDoc = await trackerCol.findOne({ _id: `${userId}:challenge-total-days` as any });
      const dayDoc = await trackerCol.findOne({ _id: `${userId}:challenge-day` as any });
      const streakDoc = await trackerCol.findOne({ _id: `${userId}:challenge-streak` as any });
      const checkedDoc = await trackerCol.findOne({ _id: `${userId}:challenge-checked` as any });
      const reqsDoc = await trackerCol.findOne({ _id: `${userId}:challenge-active-reqs` as any });
      const historyDoc = await trackerCol.findOne({ _id: `${userId}:challenge-history` as any });

      return {
        activeName: nameDoc.value as string,
        totalDays: (totalDaysDoc?.value as number) || 30,
        day: (dayDoc?.value as number) || 0,
        streak: (streakDoc?.value as number) || 0,
        checked: (checkedDoc?.value as string[]) || [],
        activeReqs: (reqsDoc?.value as string[]) || [],
        history: (historyDoc?.value as any[]) || [],
      };
    }

    return {
      activeName: doc.activeName,
      totalDays: doc.totalDays,
      day: doc.day,
      streak: doc.streak,
      checked: doc.checked || [],
      activeReqs: doc.activeReqs || [],
      history: doc.history || [],
      updatedAt: doc.updatedAt,
    };
  } catch (err) {
    console.error("[MongoDB] Error fetching active challenge:", err);
    return null;
  }
}

// Migrate guest challenge and tracker data to newly authenticated user
export async function migrateGuestChallenges(guestId: string, authUserId: string): Promise<boolean> {
  try {
    if (!guestId || !authUserId || guestId === authUserId) return false;
    const col = await getChallengesCollection();
    await col.updateMany({ userId: guestId }, { $set: { userId: authUserId } });

    const trackerCol = await getTrackerCollection();
    const guestTrackerItems = await trackerCol.find({ userId: guestId }).toArray();
    for (const item of guestTrackerItems) {
      await trackerCol.updateOne(
        { _id: `${authUserId}:${item.key}` as any },
        {
          $set: {
            userId: authUserId,
            key: item.key,
            value: item.value,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
    console.log(`✅ [MongoDB] Migrated data from guest ${guestId} to auth user ${authUserId}`);
    return true;
  } catch (err) {
    console.error("[MongoDB] Error migrating guest challenges:", err);
    return false;
  }
}

// Check connection status
export async function checkMongoStatus() {
  try {
    const client = await getClientPromise();
    await client.db().admin().ping();
    const db = client.db(getDbName());
    const collections = await db.listCollections().toArray();
    return {
      connected: true,
      database: getDbName(),
      collections: collections.map((c) => c.name),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || String(err),
    };
  }
}
