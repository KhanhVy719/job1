// crypto.ts
import * as crypto from "crypto";
import redis from "../redis";

const passphrase = "U2FsdGVkX1/9C9SpUnD3VIgJGj6GOMVMHHn6i/9qbvXHlaTNurpJvsE+MHpFvegB";
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const key = crypto.createHash("sha256").update(String(passphrase)).digest();
const fixedIv = Buffer.from(key.slice(0, IV_LENGTH));

const REDIS_KEY_PREFIX = "used_token:";
const TOKEN_CACHE_TTL = 3 * 60 * 60;

// --- HÀM MÃ HÓA (ENCRYPT) ---
// Hàm này giữ nguyên (sync) vì không đụng đến Redis
export const Encrypt = (text: string): string => {
  const cipher = crypto.createCipheriv(ALGORITHM, key, fixedIv);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted.replace(/\+/g, ".").replace(/\//g, "_");
};

export const decrypt = async (encryptedToken: string): Promise<string> => {
  const redisKey = `${REDIS_KEY_PREFIX}${encryptedToken}`;

  const cachedPayload = await redis.get(redisKey);
  if (cachedPayload) {
    return cachedPayload;
  }

  try {
    // Khôi phục định dạng base64 chuẩn
    const standardBase64 = encryptedToken.replace(/\./g, "+").replace(/_/g, "/");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, fixedIv);

    let decrypted = decipher.update(standardBase64, "base64", "utf8");
    decrypted += decipher.final("utf8");

    // Cache payload để các request lặp do React StrictMode/HMR/player retry vẫn phát được.
    await redis.set(redisKey, decrypted, "EX", TOKEN_CACHE_TTL);

    return decrypted;
  } catch (error) {
    // Ném lỗi ra ngoài nếu giải mã thất bại
    throw new Error("DECRYPTION_FAILED: Không thể giải mã chuỗi này.");
  }
};
