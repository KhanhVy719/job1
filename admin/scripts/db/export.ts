import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_BACKUP || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "test";
const backupDir = "./backup";

const client = new MongoClient(uri);

async function exportAllCollections() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    // Tạo thư mục backup nếu chưa có
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    for (const coll of collections) {
      const data = await db.collection(coll.name).find({}).toArray();

      // Chuyển ObjectId thành chuỗi để JSON không lỗi
      const jsonData = data.map(doc => ({
        ...doc,
        _id: doc._id?.toString(),
      }));

      const filePath = path.join(backupDir, `${coll.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      console.log(`✅ Exported ${coll.name}.json (${jsonData.length} docs)`);
    }

    console.log(`🎉 Export completed from database "${dbName}"`);
  } catch (err) {
    console.error("❌ Export failed:", err);
  } finally {
    await client.close();
  }
}

exportAllCollections();
