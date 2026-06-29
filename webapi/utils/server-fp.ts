import bs58 from "bs58";

// --- 1. CẤU HÌNH MAP (MAPPING VỚI SOURCE MÃ HÓA) ---
// Dựa trên mảng _D trong file fingerprint.ts
const MAP: Record<string, string> = {
  "__0": "os",                   // L1
  "__1": "ua",                   // L2
  "__2": "device",               // L1
  "__3": "is_f12_open",          // L1 (Detect Flag)
  "__4": "browser",              // L2
  "__5": "is_bot_check_runtime", // L1 (Detect Flag)
  "__6": "episode_id_wb",        // L2 -> Decrypts to Whitebox Encrypted String
  "__7": "gpu",                  // L2
  "__8": "reserved",             // [Reserved]
  "__9": "hardware",             // L1 (Format: "concurrency|memory")
  "__a": "meta",                 // Container containing Key & Timestamp
  "__b": "aesKey",               // Encrypted AES Key (inside meta)
  "__c": "timestamp",            // Encrypted Timestamp (inside meta)
  "__d": "reserved_d",           // [Reserved]
  "__e": "vm_result_wb"          // Raw Whitebox String (Direct assignment, no L1/L2)
};

const MAGIC_BYTE = 0x3f; // Must match _M in source

// --- WHITEBOX TABLES (Copy from whitebox-core.ts, fill in full tables in production) ---
const T_BOX_1 = [0xA3, 0x1F, 0x88, 0x4C, /* ... Complete the 256 bytes table here ... */ 0x55]; 
const T_BOX_2 = [0x11, 0xF4, 0x2B, 0x90, /* ... Complete the 256 bytes table here ... */ 0xAA];

// --- WHITEBOX HELPER FUNCTIONS (Reversed from whitebox-core.ts) ---
const subWord = (w: number) => {
  return (T_BOX_1[(w >>> 24) & 0xFF] << 24) |
         (T_BOX_1[(w >>> 16) & 0xFF] << 16) |
         (T_BOX_1[(w >>> 8) & 0xFF] << 8) |
         (T_BOX_1[w & 0xFF]);
};

const getDomBindingSeed = (ua: string, hardwareConcurrency: number): number => {
  const nav = ua + hardwareConcurrency;
  let hash = 0;
  for (let i = 0; i < nav.length; i++) {
    hash = ((hash << 5) - hash + nav.charCodeAt(i)) | 0;
  }
  return hash;
};

const whiteBoxDecrypt = (b64: string, binding: number): string => {
  try {
    const cipherBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const result = new Uint8Array(cipherBytes.length);
    
    for (let i = 0; i < cipherBytes.length; i++) {
      const noise = T_BOX_2[(i + binding) % 255];
      const sub = subWord(noise);
      const xor_val = sub ^ (binding & 0xFF);
      const xor_byte = xor_val & 0xFF;
      result[i] = cipherBytes[i] ^ xor_byte;
    }
    
    return new TextDecoder().decode(result);
  } catch (e) {
    console.error("Whitebox Decrypt Error:", e);
    return "DecErr_WB";
  }
};

// --- 2. HELPER FUNCTIONS ---

const textDec = (b: ArrayBuffer | Uint8Array) => new TextDecoder().decode(b);

/**
 * Convert URL-Safe Base64 back to Standard Base64/Buffer
 * Handles padding and character replacement (-_ to +/)
 */
const b64Dec = (s: string) => {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  
  // Node.js environment
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b, 'base64');
  }
  
  // Browser environment
  const bin = atob(b);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
};

// --- 3. CORE DECODING LOGIC ---

/**
 * Reverse _salt function
 * Logic: Source inserts 4 random chars at index 2.
 * Reverse: Keep first 2 chars, skip next 4, keep the rest.
 */
const _unsalt = (s: string) => {
  if (s.length < 6) return s.substring(4); // Fallback for short strings
  return s.slice(0, 2) + s.slice(6);
};

/**
 * Reverse _rot function
 * Logic: Source did `charCode + k + i`.
 * Reverse: `charCode - k - i`.
 */
const _unrot = (s: string, k: number) => {
  return Array.from(s).map((c, i) => {
    return String.fromCharCode(c.charCodeAt(0) - (k % 10) - (i % 5));
  }).join("");
};

/**
 * Decode Layer 1 (Obfuscation)
 * Flow: Base58 Decode -> Text Decode -> UnRot -> UnSalt
 */
const _decL1 = (s: string, k: number) => {
  try {
    const rotStr = textDec(bs58.decode(s));
    const salted = _unrot(rotStr, k);
    return _unsalt(salted);
  } catch (e) { 
    return "Malform_L1"; 
  }
};

/**
 * Decode Layer 2 (AES-GCM)
 * Flow: Base64 Decode -> Extract IV/Cipher -> AES Decrypt -> Text Decode -> UnSalt
 */
const _decL2 = async (key: CryptoKey, b64: string) => {
  try {
    const buf = new Uint8Array(b64Dec(b64) as ArrayBuffer);
    
    // First 12 bytes are IV, rest is Ciphertext
    const iv = buf.slice(0, 12);
    const cip = buf.slice(12);
    
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cip);
    const salted = textDec(plainBuf);
    return _unsalt(salted);
  } catch (e) { 
    console.error("AES Decrypt Error:", e);
    return "DecErr_L2"; 
  }
};

/**
 * Decode Timestamp
 * Source: t ^ k ^ _M
 */
const _decTime = (hex: string, k: number) => {
  try {
    const t = BigInt("0x" + hex) ^ BigInt(k) ^ BigInt(MAGIC_BYTE);
    return Number(t);
  } catch { return 0; }
};

// --- 4. MAIN EXPORT FUNCTION ---

export async function decodeFingerprint(data: any) {
  const result: any = {};

  // --- STEP A: EXTRACT META DATA ---
  const metaKey = Object.keys(MAP).find(k => MAP[k] === "meta");
  if (!data[metaKey!]) throw new Error("Invalid Payload: Missing Meta Container");
  
  const meta = data[metaKey!];

  // --- STEP B: RECOVER KEYS & TIMESTAMP ---
  const kKey = Object.keys(MAP).find(k => MAP[k] === "aesKey");     // __b
  const tKey = Object.keys(MAP).find(k => MAP[k] === "timestamp");  // __c

  // 1. Get AES Key Raw (Base64 -> Buffer)
  const rawKBuf = b64Dec(meta[kKey!]); 
  const rawK = new Uint8Array(rawKBuf as ArrayBuffer);
  
  // 2. Extract Seed (First byte of Key) - Used for L1
  const seed = rawK[0]; 

  // 3. Import Key for Crypto API - Used for L2
  const aesKey = await crypto.subtle.importKey(
    "raw", 
    rawK, 
    { name: "AES-GCM" }, 
    true, 
    ["decrypt"]
  );

  // 4. Decode Timestamp
  result.timestamp = _decTime(meta[tKey!], seed);
  result.ts_iso = new Date(result.timestamp).toISOString();

  // --- STEP C: DECODE FIELDS ---
  for (const [key, val] of Object.entries(data)) {
    if (key === metaKey) continue;
    
    const field = MAP[key];
    if (!field || field.startsWith("reserved")) continue;

    const v = val as string;

    switch (field) {
      // === GROUP 1: L1 DECRYPTION (Uses Seed) ===
      case "os":
      case "device":
      case "hardware":
      case "is_f12_open":
      case "is_bot_check_runtime":
        const decVal = _decL1(v, seed);
        
        // Convert string "1"/"0" back to boolean
        if (field === "is_f12_open" || field === "is_bot_check_runtime") {
             result[field] = decVal === "1";
        } else {
             result[field] = decVal;
        }
        break;
      
      // === GROUP 2: L2 DECRYPTION (Uses AES Key) ===
      case "browser":
      case "gpu":
      case "ua":
      case "episode_id_wb": 
        // Note: episode_id_wb is Double Encrypted (Whitebox -> AES).
        // Decrypting L2 here yields the Whitebox Encrypted string.
        result[field] = await _decL2(aesKey, v);
        break;

      // === GROUP 3: RAW DATA (Whitebox Only) ===
      case "vm_result_wb":
        // This field was assigned directly: R[_D[14]] = whiteBoxEncrypt(...)
        // It bypasses L1/L2, so we take the value as-is.
        result[field] = v;
        break;
    }
  }

  // --- STEP D: POST-PROCESSING ---
  
  // Parse Hardware String ("Concurrency|Memory")
  if (result.hardware && result.hardware !== "Malform_L1") {
    const parts = result.hardware.split("|");
    if (parts.length === 2) {
        result.cpu_concurrency = parseInt(parts[0]);
        result.device_memory = parseInt(parts[1]);
    }
    // Remove the raw string to keep result clean
    delete result.hardware;
  }

  if (result.ua && result.cpu_concurrency !== undefined) {
    const binding = getDomBindingSeed(result.ua, result.cpu_concurrency);
    
    if (result.episode_id_wb && result.episode_id_wb !== "DecErr_L2") {
      result.episode_id = whiteBoxDecrypt(result.episode_id_wb, binding);
      delete result.episode_id_wb;
    }
    
    if (result.vm_result_wb) {
      const vm_str = whiteBoxDecrypt(result.vm_result_wb, binding);
      result.is_compromised = vm_str === "1";
      delete result.vm_result_wb;
    }
  }

  return result;
}