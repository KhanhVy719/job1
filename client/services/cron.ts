import cron from "node-cron";
import { exec } from "child_process";

export const initCronJobs = () => {
  if (process.env.RUN_SITEMAP_CRON !== "true") {
    console.log("[System] Sitemap cron disabled. Set RUN_SITEMAP_CRON=true to enable.");
    return;
  }

  cron.schedule("0 * * * *", () => {
    console.log("[System] 🔄 Đang bắt đầu cập nhật Sitemap...");
    exec("next-sitemap --config next-sitemap.config.cjs", (error) => {
      if (error) console.error(`[Sitemap Error] ❌: ${error.message}`);
      else console.log(`[Sitemap Success] ✅: Đã cập nhật xong!`);
    });
  });
};
