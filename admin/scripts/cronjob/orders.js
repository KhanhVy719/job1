import axios from "axios";

class Orders {
  constructor() {
    this.intervalMs = 1 * 60 * 1000; // mặc định 1 phút
    this.timer = null;
    this.running = false;
    this.stopped = false;
  }

  // Gọi API một lần
  async runOnce() {
    const res = await axios.get("/api/orders/cron");
    return res.data;
  }

  // Lên lịch cho lần chạy tiếp theo
  scheduleNext(delay = this.intervalMs) {
    if (this.stopped) return;
    this.timer = setTimeout(() => this.loop(), delay);
    if (typeof this.timer?.unref === "function") this.timer.unref();
  }

  // Vòng lặp chính
  async loop() {
    if (this.stopped) return;
    if (this.running) {
      console.warn(
        "OrdersCron: previous run still running — skipping this tick."
      );
      this.scheduleNext();
      return;
    }

    this.running = true;
    try {
      console.log("OrdersCron: runOnce starting...");
      const result = await this.runOnce();
      console.log("OrdersCron: runOnce success", {
        resultSummary: result ?? null,
      });
    } catch (err) {
      console.error("OrdersCron: runOnce failed:", err?.message ?? err);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }

  /**
   * Bắt đầu cron loop
   * @param {number} intervalMinutes số phút giữa mỗi lần chạy (mặc định 1)
   */
  start(intervalMinutes = 1) {
    this.intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    if (this.timer) {
      console.warn("OrdersCron already started");
      return;
    }
    this.stopped = false;
    this.loop(); // chạy ngay lần đầu
    console.log(`🚀 OrdersCron started, interval: ${intervalMinutes} minute(s)`);
  }

  // Dừng cron
  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("⏹️ OrdersCron stopped.");
  }
}

export default Orders;
