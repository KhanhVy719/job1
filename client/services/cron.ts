import cron from "node-cron";
import { exec } from "child_process";

export const initCronJobs = () => {
  cron.schedule("0 * * * *", () => {
    console.log("[System] 🔄 Đang bắt đầu cập nhật Sitemap...");
    exec("next-sitemap --config next-sitemap.config.cjs", (error) => {
      if (error) console.error(`[Sitemap Error] ❌: ${error.message}`);
      else console.log(`[Sitemap Success] ✅: Đã cập nhật xong!`);
    });
  });
};