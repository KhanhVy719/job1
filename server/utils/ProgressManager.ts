// src/utils/ProgressManager.ts
import { Response } from "express";

class ProgressManager {
  // Lưu trữ các kết nối đang mở: Map<jobId, Response>
  private clients = new Map<string, Response>();

  // Khi Client gọi API /progress/:jobId, ta lưu response lại
  public addClient(jobId: string, res: Response) {
    this.clients.set(jobId, res);
    
    // Gửi header SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

  }

  // Hàm gửi tiến độ
  public sendProgress(jobId: string, percent: number, status: string) {
    const res = this.clients.get(jobId);
    if (res) {
      // Định dạng SSE: "data: ... \n\n"
      const data = JSON.stringify({ percent, status });
      res.write(`data: ${data}\n\n`);
    }
  }

  // Kết thúc kết nối
  public finish(jobId: string) {
    const res = this.clients.get(jobId);
    if (res) {
      this.sendProgress(jobId, 100, "done");
      res.end();
      this.clients.delete(jobId);
    }
  }
}

export default new ProgressManager();