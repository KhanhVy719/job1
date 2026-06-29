import CryptoJS from 'crypto-js';

// Key obfuscation phía client. LƯU Ý: NEXT_PUBLIC_ => key này nằm trong bundle
// trình duyệt, chỉ có tác dụng làm rối (obfuscation), KHÔNG phải bảo mật thật.
// Dữ liệu nhạy cảm thật phải mã hoá/ký phía server.
const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("FATAL: NEXT_PUBLIC_SECRET_KEY chưa được cấu hình trong .env");
}

// Hàm mã hóa (Dùng ở Server)
export const encryptData = (data: any): string => {
  try {
    const jsonStr = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, SECRET_KEY).toString();
  } catch (error) {
    console.error("Encrypt Error:", error);
    return "";
  }
};

// Hàm giải mã (Dùng ở Client _app.tsx)
export const decryptData = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Decrypt Error:", error);
    return {};
  }
};