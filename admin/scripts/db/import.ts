import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "test";
const backupDir = "./backup";

const client = new MongoClient(uri);

async function importAllCollections() {
  try {
    await client.connect();
    const db = client.db(dbName);

    if (!fs.existsSync(backupDir)) {
      console.log("⚠️  Backup folder not found!");
      return;
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".json"));

    if (files.length === 0) {
      console.log("⚠️  No JSON files found in backup folder.");
      return;
    }

    for (const file of files) {
      const collectionName = path.basename(file, ".json");
      const jsonPath = path.join(backupDir, file);
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      // Xóa dữ liệu cũ để tránh trùng lặp
      await db.collection(collectionName).deleteMany({});

      if (jsonData.length === 0) {
        console.log(`⚠️  ${collectionName}.json is empty, skipped.`);
        continue;
      }

      // Chuyển chuỗi _id → ObjectId
      const formattedData = jsonData.map((doc: any) => {
        if (doc._id && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
          doc._id = new ObjectId(doc._id);
        }
        return doc;
      });

      await db.collection(collectionName).insertMany(formattedData);
      console.log(`✅ Imported ${formattedData.length} documents into ${collectionName}`);
    }

    console.log(`🎉 Import completed into database "${dbName}"`);
  } catch (err) {
    console.error("❌ Import failed:", err);
  } finally {
    await client.close();
  }
}

importAllCollections();
