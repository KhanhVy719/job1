import * as crypto from "crypto-js";

type EncryptedData = {
    ct: string;
    iv: string; 
    s: string;
};

/**
 * Decrypts the ciphertext using the provided key.
 * Attempts to parse the result as JSON.
 */
const decryptAES = <T = any>(ciphertext: string, key: string): T => {
    const bytes = crypto.AES.decrypt(ciphertext, key);
    const decryptedString = bytes.toString(crypto.enc.Utf8);
    
    // Parse the JSON string back to the original object
    return JSON.parse(decryptedString);
};

const generateKey = (): string => {
    return crypto.lib.WordArray.random(16).toString(crypto.enc.Hex);
};

const encryptAES = (data: any, key: string): string => {
    return crypto.AES.encrypt(JSON.stringify(data), key).toString();
};

const create = (e: any, t: any): EncryptedData => {
    const key: string = generateKey();
    const datax: string = encryptAES(e, key); 
    const data: string = encryptAES(t, key);
    
    return {
        ct: datax,
        s: data,
        iv: key // Note: In this logic, 'iv' is actually containing the 'key'
    };
};

export {
    decryptAES,
    generateKey,
    encryptAES,
    create
};