// src/services/LocalTokenService.ts (Security Level: L5 - Military Grade)

import crypto, { CipherGCM, DecipherGCM } from 'crypto';
import zlib from 'zlib';

/**
 * @interface ILocalTokenPayload
 * Định nghĩa cấu trúc dữ liệu cơ bản của Payload (Claims)
 */
export interface ILocalTokenPayload {
  id: string;      // ID đối tượng (ví dụ: episodeId)
  type: string;   // Index video
  ip: string;      // IP của người dùng (Context Binding)
  ua: string;      // Hash User Agent (Context Binding)
  exp: number;     // Expiration Time (Thời điểm hết hạn)
  nbf?: number;    // Not Before Time (Thời điểm bắt đầu có hiệu lực)
  secret: string;  // Secret ngẫu nhiên cho phiên (Sử dụng cho Segment Signing)
  sid?: string;    // Session ID
  jti?: string;    // JWT ID (Unique token ID)
}

class LocalTokenService {
  private algorithm = 'aes-256-gcm';
  private rotationInterval = 60 * 60 * 1000; // 1 Giờ xoay key một lần (3,600,000 ms)
  private secretPhrase: string;
  private salt: string;

  // Cache khóa trong bộ nhớ. Key là TimeBucket (số giờ).
  private keyCache: Map<number, Buffer> = new Map();

  constructor() {
    // Bắt buộc đọc từ ENV. Không có fallback hardcode (lộ secret = lộ toàn bộ token).
    if (!process.env.TOKEN_MASTER_SECRET) {
      throw new Error("FATAL: TOKEN_MASTER_SECRET chưa được cấu hình trong .env");
    }
    this.secretPhrase = process.env.TOKEN_MASTER_SECRET;
    this.salt = process.env.TOKEN_MASTER_SALT || "STATIC_SALT_V2";
    
    // Tự động khởi tạo key của giờ hiện tại.
    this.getRotatingKey(Date.now());
  }

  /**
   * [CORE L5] KEY ROTATION + KDF (SCRYPT)
   * Tạo khóa Master Key động dựa trên Time Epoch.
   * => Nếu Key bị lộ, nó chỉ dùng được trong 1 giờ (rotationInterval).
   * => Dùng Scrypt để chống Brute-force.
   */
  private getRotatingKey(timestamp: number): Buffer {
    // Lấy time bucket (ví dụ: số giờ kể từ 1970)
    const timeBucket = Math.floor(timestamp / this.rotationInterval);
    
    if (this.keyCache.has(timeBucket)) {
      return this.keyCache.get(timeBucket)!;
    }

    // Salt động: Kết hợp Salt tĩnh + TimeBucket
    const dynamicSalt = `${this.salt}_${timeBucket}`;
    
    // Scrypt: Chậm và tốn RAM -> Chống Brute-force Master Key
    const key = crypto.scryptSync(this.secretPhrase, dynamicSalt, 32); // 32 bytes for AES-256
    
    // Cache lại để dùng nhanh
    this.keyCache.set(timeBucket, key);
    
    // Dọn dẹp key cũ (thường là key của 2 giờ trước) để giải phóng RAM
    const oldBucket = timeBucket - 2;
    if (this.keyCache.has(oldBucket)) {
      this.keyCache.delete(oldBucket);
    }

    return key;
  }

  public generateRandomSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public hashUserAgent(ua: string): string {
    // Dùng 'unknown' thay vì null để hash luôn luôn tạo ra giá trị, tránh lỗi
    return crypto.createHash('sha256').update(ua || 'unknown').digest('hex').substring(0, 16);
  }

  /**
   * [NEW CORE] Tạo và kiểm tra Proof-of-Work (PoW)
   * Client cần tìm một nonce sao cho SHA256(challenge + nonce) bắt đầu bằng difficulty.
   */
  public verifyProofOfWork(challenge: string, nonce: string, difficulty: string): boolean {
    if (!challenge || !nonce || !difficulty) return false;
    
    // Chỉ chấp nhận độ dài nhất định để tránh DOS
    if (challenge.length > 50 || nonce.length > 50 || difficulty.length > 10) return false;

    const hashInput = challenge + nonce;
    const computedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    // Kiểm tra xem hash có bắt đầu bằng chuỗi difficulty yêu cầu không
    return computedHash.startsWith(difficulty);
  }


  /**
   * [CORE L5] SECURE ENCRYPT: AES-256-GCM + KEY ROTATION + PADDING + COMPRESSION
   */
  public encrypt(payload: ILocalTokenPayload): string {
    try {
      const now = Date.now();
      
      // 1. Padding: Thêm rác ngẫu nhiên (0-15 bytes) để phá vỡ cấu trúc và chống đoán độ dài
      const paddingLength = Math.floor(Math.random() * 16);
      const padding = crypto.randomBytes(paddingLength).toString('hex');
      
      const finalPayload = {
        ...payload,
        iat: now,
        jti: payload.jti || crypto.randomUUID(),
        _p: padding // Dummy field để đảm bảo kích thước không đồng nhất
      };

      // 2. Nén (Deflate)
      const jsonStr = JSON.stringify(finalPayload);
      const compressed = zlib.deflateRawSync(jsonStr);

      // 3. Lấy Key động theo thời gian thực
      const currentKey = this.getRotatingKey(now);

      // 4. Encrypt AES-256-GCM
      const iv = crypto.randomBytes(12); // IV 12 bytes cho GCM
      const cipher = crypto.createCipheriv(this.algorithm, currentKey, iv) as CipherGCM;

      let encrypted = cipher.update(compressed);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag(); // Tag 16 bytes

      // 5. Đóng gói Final Buffer:
      // [TimeBucket (4)] + [IV (12)] + [Tag (16)] + [Data]
      const timeBucket = Math.floor(now / this.rotationInterval);
      const timeBuffer = Buffer.alloc(4);
      timeBuffer.writeUInt32BE(timeBucket, 0); // Ghi 4 bytes TimeBucket (dùng Big Endian)

      const finalBuffer = Buffer.concat([timeBuffer, iv, authTag, encrypted]);

      // Trả về Base64URL để thân thiện với URL/FS
      return finalBuffer.toString('base64url');

    } catch (error) {
      console.error("Encrypt Error:", error);
      throw new Error("Token encryption failed");
    }
  }

  /**
   * [CORE L5] SECURE DECRYPT
   */
  public decrypt(token: string): ILocalTokenPayload | null {
    try {
      if (!token || typeof token !== 'string') return null;

      const buffer = Buffer.from(token, 'base64url');
      // Min length: 4 (Time) + 12 (IV) + 16 (Tag) = 32 bytes
      if (buffer.length < 32) return null;

      // 1. Parse Header
      const timeBucket = buffer.readUInt32BE(0);
      const iv = buffer.subarray(4, 16);
      const authTag = buffer.subarray(16, 32);
      const encryptedContent = buffer.subarray(32);

      // 2. Lấy lại key của thời điểm tạo token
      const key = this.getRotatingKey(timeBucket * this.rotationInterval);
      
      // 3. Decrypt
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as DecipherGCM;
      decipher.setAuthTag(authTag);

      let decryptedCompressed: Buffer;
      try {
        decryptedCompressed = Buffer.concat([
          decipher.update(encryptedContent),
          decipher.final()
        ]);
      } catch (e) {
        // Lỗi tại đây thường là do AuthTag không khớp (Token bị sửa đổi hoặc Key sai)
        return null; // AuthTag fail -> Token giả mạo
      }

      // 4. Decompress
      const jsonStr = zlib.inflateRawSync(decryptedCompressed).toString('utf8');
      const payload = JSON.parse(jsonStr) as ILocalTokenPayload;
      
      // Xóa padding (không cần thiết vì Padding chỉ là rác trong JSON)
      delete (payload as any)._p;

      // 5. Validate Logic (Thời gian)
      const now = Date.now();
      if (payload.exp && now > payload.exp) return null; // Check hết hạn
      if (payload.nbf && now < payload.nbf) return null; // Check chưa có hiệu lực

      return payload;

    } catch (error) {
      // Bắt tất cả lỗi còn lại (Parse JSON, Decompress...)
      return null;
    }
  }

  /**
   * So sánh an toàn (Timing Safe Comparison)
   * Ngăn chặn các cuộc tấn công dựa trên thời gian so sánh byte-by-byte (Timing Attacks).
   */
  public secureCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      // timingSafeEqual yêu cầu 2 buffer cùng độ dài
      return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

export const localTokenService = new LocalTokenService();