import { generateKeyPairSync } from "crypto";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Lấy __dirname theo chuẩn ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, "..", "keys");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicExponent: 0x10001,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(path.join(outDir, "public.pem"), publicKey);
writeFileSync(path.join(outDir, "private.pem"), privateKey);

console.log("Keys generated to ./keys (public.pem + private.pem). Keep private.pem secret!");
