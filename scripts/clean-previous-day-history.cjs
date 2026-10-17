const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || 'tracker_db';

  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection('tracker');

  const todayStr = '2026-10-17';
  const docs = await col.find({ key: 'daily-history-logs' }).toArray();

  for (const doc of docs) {
    const originalVal = doc.value || {};
    const cleanedVal = {};
    for (const [dateKey, log] of Object.entries(originalVal)) {
      const logStr = JSON.stringify(log);
      const isLegacyMock =
        logStr.includes('Complete Q4 priority planning') ||
        logStr.includes('Design system token review') ||
        logStr.includes('Deliverables implementation') ||
        logStr.includes('MongoDB indexing and query tuning') ||
        logStr.includes('Morning run & hydration');

      // Keep only today or future dates and non-legacy entries
      if (dateKey >= todayStr && !isLegacyMock) {
        cleanedVal[dateKey] = log;
      }
    }

    console.log(`[Clean] Doc ${doc._id} (User: ${doc.userId}) - Original dates: [${Object.keys(originalVal).join(', ')}] -> Kept dates: [${Object.keys(cleanedVal).join(', ')}]`);
    await col.updateOne(
      { _id: doc._id },
      { $set: { value: cleanedVal, updatedAt: new Date() } }
    );
  }

  console.log('✅ Successfully cleaned previous day / mock history from MongoDB.');
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
