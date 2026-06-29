import * as crypto from "crypto";

// --- CẤU HÌNH ---
const passphrase = "U2FsdGVkX1/9C9SpUnD3VIgJGj6GOMVMHHn6i/9qbvXHlaTNurpJvsE+MHpFvegB";
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; 

// Tạo Key (32 bytes) từ passphrase
const key = crypto.createHash('sha256').update(String(passphrase)).digest();
// Dùng 16 bytes đầu của key làm IV cố định
const fixedIv = Buffer.from(key.slice(0, IV_LENGTH)); 

// --- BỘ NHỚ TẠM (QUAN TRỌNG) ---
// Dùng Set để lưu trữ các chuỗi đã được giải mã. 
// Lưu ý: Nếu khởi động lại server/ứng dụng, danh sách này sẽ bị reset.
const usedTokens = new Set<string>();

// --- HÀM MÃ HÓA (ENCRYPT) ---
export const Encrypt = (text: string): string => { 
  const cipher = crypto.createCipheriv(ALGORITHM, key, fixedIv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
    
  // Thay thế ký tự đặc biệt để an toàn trên URL
  return encrypted.replace(/\+/g, ".").replace(/\//g, '_');
};

// --- HÀM GIẢI MÃ (DECRYPT) - CHỈ DÙNG 1 LẦN ---
export const decrypt = (encryptedToken: string): string => {
  // 1. Kiểm tra xem token này đã dùng chưa
  if (usedTokens.has(encryptedToken)) {
      throw new Error("TOKEN_EXPIRED: Mã này đã được giải mã một lần và không thể sử dụng lại.");
  }

  try {
      // Khôi phục định dạng base64 chuẩn
      const standardBase64 = encryptedToken.replace(/\./g, '+').replace(/_/g, '/');
        
      const decipher = crypto.createDecipheriv(ALGORITHM, key, fixedIv);
        
      let decrypted = decipher.update(standardBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // 2. Nếu giải mã thành công, thêm token vào danh sách đen ngay lập tức
      usedTokens.add(encryptedToken);

      return decrypted;
  } catch (error) {
      // Ném lỗi ra ngoài nếu giải mã thất bại (do sai key hoặc sai định dạng)
      throw new Error("DECRYPTION_FAILED: Không thể giải mã chuỗi này.");
  }
};