import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is not defined in .env");
  process.exit(1);
}

console.log("Connecting to MongoDB Atlas...");

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");

    // Default db from URI or "tracker_db"
    const db = client.db("tracker_db");
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log("Collections in tracker_db before:", collections.map(c => c.name));

    // Ensure collection 'tracker' exists
    let trackerCol;
    if (!collections.some(c => c.name === "tracker")) {
      trackerCol = await db.createCollection("tracker");
      console.log("Created collection 'tracker'");
    } else {
      trackerCol = db.collection("tracker");
      console.log("Collection 'tracker' already exists");
    }

    // Insert an initial verification record
    const pingDoc = {
      _id: "system_ping",
      type: "system_info",
      name: "Lifeboard Tracker",
      status: "connected",
      connectedAt: new Date().toISOString()
    };

    await trackerCol.updateOne(
      { _id: "system_ping" },
      { $set: pingDoc },
      { upsert: true }
    );

    console.log("Successfully saved verification record to 'tracker' collection!");
    const result = await trackerCol.findOne({ _id: "system_ping" });
    console.log("Retrieved record from 'tracker':", result);

  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  } finally {
    await client.close();
  }
}

run();
