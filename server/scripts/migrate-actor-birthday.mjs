// ============================================================
// migrate-actor-birthday.mjs
// Chuyển field Actor.birthday từ String -> Date (one-shot migration).
//
// Bối cảnh: schema Actor.birthday đã đổi từ String sang Date.
// Dữ liệu cũ trong DB có thể vẫn là chuỗi "YYYY-MM-DD" hoặc "" (rỗng).
// Script này:
//   - "" hoặc chuỗi không hợp lệ  -> null
//   - "YYYY-MM-DD" hợp lệ          -> Date
//   - đã là Date                   -> bỏ qua
//
// Cách dùng:
//   MONGODB_URI="mongodb+srv://..." node server/scripts/migrate-actor-birthday.mjs
//   (hoặc set MONGODB_URI trong .env rồi: node --env-file=server/.env server/scripts/migrate-actor-birthday.mjs)
//
// An toàn: chỉ update đúng những doc có birthday là string; chạy lại nhiều lần OK (idempotent).
// ============================================================
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB || "rophim";

if (!uri) {
  console.error("❌ Thiếu MONGODB_URI (hoặc MONGO_URI) trong môi trường.");
  process.exit(1);
}

const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const col = client.db(dbName).collection("actors");

    // Chỉ lấy doc mà birthday đang là string (dữ liệu cũ)
    const cursor = col.find({ birthday: { $type: "string" } });
    const total = await col.countDocuments({ birthday: { $type: "string" } });
    console.log(`Tìm thấy ${total} actor có birthday dạng string. Bắt đầu migrate...`);

    let toDate = 0;
    let toNull = 0;
    const ops = [];

    for await (const doc of cursor) {
      const raw = (doc.birthday || "").trim();
      let value = null;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) value = d;
      }
      if (value) toDate++;
      else toNull++;

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { birthday: value } },
        },
      });

      // flush theo lô 500
      if (ops.length >= 500) {
        await col.bulkWrite(ops, { ordered: false });
        ops.length = 0;
      }
    }

    if (ops.length) await col.bulkWrite(ops, { ordered: false });

    console.log(`✅ Hoàn tất: ${toDate} -> Date, ${toNull} -> null (tổng ${total}).`);
  } catch (e) {
    console.error("❌ Migration lỗi:", e.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
