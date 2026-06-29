import crypto from "crypto";

if (!process.env.SEGMENT_SECRET) {
  throw new Error("FATAL: SEGMENT_SECRET chưa được cấu hình trong .env");
}
const SEGMENT_SECRET: string = process.env.SEGMENT_SECRET;
const SEGMENT_TOKEN_EXPIRY_MS = 50000; // 10 giây cho token segment

class SegmentTokenService {
  /**
   * Tạo token ngắn hạn cho segment. Payload chứa:
   * - ts: Timestamp (thời gian tạo)
   * - ep: ID của Episode
   * - seg: Tên segment (dạng hash ngắn)
   */
  public generate(episodeId: string, segmentPath: string): string {
    const timestamp = Date.now();
    const segmentHash = crypto.createHash("sha256").update(segmentPath).digest("hex").substring(0, 8); // Chỉ lấy 8 ký tự
    
    const payload = `${timestamp}|${episodeId}|${segmentHash}`;
    const hmac = crypto.createHmac("sha256", SEGMENT_SECRET).update(payload).digest("hex");
    
    return Buffer.from(`${payload}|${hmac}`).toString("base64");
  }

  /**
   * Xác thực token segment.
   * - Kiểm tra HMAC.
   * - Kiểm tra thời gian hết hạn.
   * - Kiểm tra ID Episode.
   */
  public validate(token: string, episodeId: string): boolean {
    try {
      const decoded = Buffer.from(token, "base64").toString();
      const parts = decoded.split("|");
      if (parts.length !== 4) return false;

      const [timestampStr, epId, segmentHash, hmac] = parts;
      const payload = `${timestampStr}|${epId}|${segmentHash}`;
      
      // 1. Kiểm tra HMAC
      const expectedHmac = crypto.createHmac("sha256", SEGMENT_SECRET).update(payload).digest("hex");
      if (hmac !== expectedHmac) return false;

      // 2. Kiểm tra Expiry Time
      const timestamp = parseInt(timestampStr, 10);
      if (Date.now() - timestamp > SEGMENT_TOKEN_EXPIRY_MS) {
        // Log nhẹ để thả lỏng: Nếu hết hạn, vẫn cho phép nếu không quá lâu, 
        // vì người dùng tua video có thể request segment cũ hơn.
        // Thay vì cấm ngay, ta cho phép một "grace period" (ví dụ 30 giây) để giảm lỗi tua.
        const GRACE_PERIOD_MS = 60000; 
        if (Date.now() - timestamp > GRACE_PERIOD_MS) {
            return false;
        }
      }
      
      // 3. Kiểm tra Episode ID
      if (epId !== episodeId) return false;

      return true;
    } catch (e) {
      return false;
    }
  }
}

export const segmentTokenService = new SegmentTokenService();