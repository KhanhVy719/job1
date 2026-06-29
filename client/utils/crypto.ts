import crypto from 'crypto';

if (!process.env.ACCESS_TOKEN_SECRET) {
  throw new Error("FATAL: ACCESS_TOKEN_SECRET chưa được cấu hình trong .env");
}
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export const createSignature = (data: string) => {
  return crypto.createHmac('sha256', ACCESS_TOKEN_SECRET).update(data).digest('hex');
};

export const signToken = (value: string, expiresInMs: number) => {
  const expiry = Date.now() + expiresInMs;
  const dataToSign = `${value}.${expiry}`;
  const signature = createSignature(dataToSign);
  return `${dataToSign}.${signature}`;
};

export const verifyToken = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { isValid: false };
    
    const [value, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr);
    
    if (isNaN(expiry) || Date.now() > expiry) return { isValid: false };
    
    const expectedSignature = createSignature(`${value}.${expiryStr}`);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature), 
      Buffer.from(expectedSignature)
    );

    return { isValid, timeLeft: expiry - Date.now() };
  } catch {
    return { isValid: false };
  }
};