import CryptoJS from "crypto-js";

type EncryptedData = {
    ct: string;
    iv: string;
    s: string;
};

/**
 * Decrypts the ciphertext using the provided key.
 * Attempts to parse the result as JSON.
 * Returns null if decryption fails instead of crashing.
 */
const decryptAES = <T = any>(ciphertext: string, key: string): T | null => {
    try {
        // 1. Kiểm tra đầu vào cơ bản
        if (!ciphertext || !key) return null;

        // 2. Thực hiện giải mã
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);

        // 3. Chuyển sang UTF-8 (Đây là bước hay gây lỗi Malformed UTF-8 nếu key sai)
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        // 4. Kiểm tra chuỗi rỗng sau khi giải mã
        if (!decryptedString) return null;

        // 5. Parse JSON
        return JSON.parse(decryptedString);
    } catch (error) {
        // Nếu lỗi (do sai key, sai format, hoặc JSON lỗi), trả về null
        // console.error("Decryption error:", error); // Uncomment nếu muốn log lỗi
        return null;
    }
};

const generateKey = (): string => {
    return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
};

const encryptAES = (data: any, key: string): string => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

const create = (e: any, t: any): EncryptedData => {
    const key: string = generateKey();
    const datax: string = encryptAES(e, key);
    const data: string = encryptAES(t, key);

    return {
        ct: datax,
        s: data,
        iv: key // Lưu ý: Logic của bạn đang dùng biến 'iv' để chứa 'key'
    };
};

export {
    decryptAES,
    generateKey,
    encryptAES,
    create
};