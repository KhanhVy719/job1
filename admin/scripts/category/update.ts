

import mongoose from "mongoose";
import Category from "@/model/Category"; // Nếu chạy ngoài môi trường hỗ trợ alias, đổi thành đường dẫn tương đối
import dbConnect from "@/utils/mongodb"; // tương tự như trên
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const Category_FILE = path.join(__dirname, "./category.json");

type CategoryItem = { icon: string; name: string; path: string; [k: string]: any };

class CategoryUpdate {
  async update(data: CategoryItem[]): Promise<void> {
    console.log("📌 Updating Categorys...", data?.length ?? 0);

    if (!Array.isArray(data) || data.length === 0) {
      console.log("⚠️ No Category items to sync.");
      return;
    }

    const ops = data.map((c) => ({
      updateOne: {
        filter: { path: c.path },
        update: {
          // dùng $set để cập nhật fields nếu đã có, và upsert nếu chưa có
          $set: {
            name: c.name,
            path: c.path,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      const result = await Category.bulkWrite(ops);
      console.log("✅ bulkWrite result:", result);
      console.log(`✅ Synced ${data.length} Categorys`);
    }
  }

  async runFromFile(file = Category_FILE): Promise<void> {
    try {
      await dbConnect();

      const raw = await fs.readFile(file, "utf-8");
      const json = JSON.parse(raw) as CategoryItem[];

      await this.update(json);

      console.log("🎉 Update completed!");
    } catch (error) {
      console.error("❌ Error updating:", error);
      throw error;
    } finally {
      try {
        await mongoose.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
  }
}

new CategoryUpdate().runFromFile();
