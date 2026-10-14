import { MongoClient, type Db, type Collection, ObjectId } from "mongodb";
import dotenv from "dotenv";
import crypto from "node:crypto";

// Load .env variables if running in Node environment
if (typeof process !== "undefined" && process.env) {
  dotenv.config();
}

const MONGO_URI = process.env["MONGO_URI"];
const DB_NAME = process.env["MONGO_DB_NAME"] || "tracker_db";
const COLLECTION_NAME = "tracker";
const USERS_COLLECTION_NAME = "users";

if (!MONGO_URI) {
  console.warn("⚠️ [MongoDB] MONGO_URI is not defined in environment or .env file.");
}

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
  _mongoClientPromise?: Promise<MongoClient>;
}

const globalWithMongo = globalThis as typeof globalThis & GlobalMongo;

function getClientPromise(): Promise<MongoClient> {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing from environment variables.");
  }

  if (process.env["NODE_ENV"] === "development") {
    // In dev mode, use global variable to preserve connection across HMR
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(MONGO_URI);
      globalWithMongo._mongoClientPromise = client.connect().then((c) => {
        console.log("✅ [MongoDB] Connected to MongoDB Atlas cluster");
        return c;
      });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, avoid global variable
    const client = new MongoClient(MONGO_URI);
    return client.connect();
  }
}

export async function getTrackerDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

export async function getTrackerCollection(): Promise<Collection<TrackerItemDoc>> {
  const db = await getTrackerDb();
  const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`Creating collection '${COLLECTION_NAME}' in database '${DB_NAME}'...`);
    return await db.createCollection<TrackerItemDoc>(COLLECTION_NAME);
  }
  return db.collection<TrackerItemDoc>(COLLECTION_NAME);
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getTrackerDb();
  const collections = await db.listCollections({ name: USERS_COLLECTION_NAME }).toArray();
  if (collections.length === 0) {
    console.log(`Creating collection '${USERS_COLLECTION_NAME}' in database '${DB_NAME}'...`);
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
    return true;
  } catch (err) {
    console.error(`[MongoDB] Error syncing data for user '${userId}':`, err);
    return false;
  }
}

// Check connection status
export async function checkMongoStatus() {
  try {
    const client = await getClientPromise();
    await client.db().admin().ping();
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    return {
      connected: true,
      database: DB_NAME,
      collections: collections.map((c) => c.name),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || String(err),
    };
  }
}
