import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "rophim";
const backupDir = "./backup";

const client = new MongoClient(uri);

// Danh sách các field cần chuyển sang ObjectId (Dạng đơn)
// VD: _id, user, movie_id
const objectIdFields = ["_id", "user", "movie_id", "playlist_id"];

// Danh sách các field cần chuyển sang ObjectId (Dạng mảng)
// QUAN TRỌNG: Phải có country, category để fix lỗi tìm kiếm
const objectIdArrayFields = [
  "movies", "country", "category", "studio", "actor", "director", "seasons", "episodes"
];

// Danh sách các field cần chuyển sang Date
const dateFields = ["createdAt", "updatedAt", "air_date", "birthday"];

/**
 * Hàm đệ quy hoặc xử lý từng document để ép kiểu dữ liệu
 */
function transformDocument(doc: any) {
  // 1. Xử lý các field ObjectId đơn lẻ (VD: _id, movie_id...)
  objectIdFields.forEach((field) => {
    if (doc[field] && typeof doc[field] === "string" && /^[0-9a-fA-F]{24}$/.test(doc[field])) {
      doc[field] = new ObjectId(doc[field]);
    }
  });

  // 2. Xử lý các field ObjectId dạng Mảng (VD: country: ["id1", "id2"])
  objectIdArrayFields.forEach((field) => {
    if (doc[field] && Array.isArray(doc[field])) {
      doc[field] = doc[field].map((item: any) => {
        // Nếu item là string ID chuẩn -> convert sang ObjectId
        if (typeof item === "string" && /^[0-9a-fA-F]{24}$/.test(item)) {
          return new ObjectId(item);
        }
        return item; // Giữ nguyên nếu không phải ID (hoặc là object population cũ)
      });
    }
  });

  // 3. Xử lý Date (để sort được theo thời gian)
  dateFields.forEach((field) => {
    if (doc[field] && typeof doc[field] === "string") {
      const date = new Date(doc[field]);
      // Kiểm tra nếu date hợp lệ
      if (!isNaN(date.getTime())) {
        doc[field] = date;
      }
    } else if (doc[field] && doc[field].$date) {
      // Trường hợp format mongoexport cũ: { "$date": "..." }
      doc[field] = new Date(doc[field].$date);
    }
  });

  return doc;
}

async function importAllCollections() {
  try {
    await client.connect();
    console.log("🔌 Connected to MongoDB");
    const db = client.db(dbName);

    if (!fs.existsSync(backupDir)) {
      console.log("⚠️  Backup folder not found!");
      return;
    }

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

    if (files.length === 0) {
      console.log("⚠️  No JSON files found in backup folder.");
      return;
    }

    for (const file of files) {
      const collectionName = path.basename(file, ".json");
      const jsonPath = path.join(backupDir, file);
      
      console.log(`⏳ Reading ${file}...`);
      const rawData = fs.readFileSync(jsonPath, "utf8");
      
      if (!rawData) {
          console.log(`⚠️  File ${file} is empty.`);
          continue;
      }

      const jsonData = JSON.parse(rawData);

      // Xóa dữ liệu cũ
      await db.collection(collectionName).deleteMany({});

      if (jsonData.length === 0) {
        console.log(`⚠️  ${collectionName} is empty JSON array, skipped.`);
        continue;
      }

      // ===> BƯỚC QUAN TRỌNG NHẤT: FORMAT DỮ LIỆU <===
      const formattedData = jsonData.map((doc: any) => transformDocument(doc));

      await db.collection(collectionName).insertMany(formattedData);
      console.log(`✅ Imported ${formattedData.length} documents into '${collectionName}'`);
    }

    console.log(`\n🎉 ALL DONE! Database "${dbName}" is ready.`);
  } catch (err) {
    console.error("❌ Import failed:", err);
  } finally {
    await client.close();
  }
}

importAllCollections();