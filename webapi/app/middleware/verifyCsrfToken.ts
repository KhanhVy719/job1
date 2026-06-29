import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const secret = process.env.ACCESS_TOKEN_SECRET;
if (!secret) {
  throw new Error("FATAL: ACCESS_TOKEN_SECRET chưa được cấu hình trong .env");
}

const verifyCsrfToken = (req: Request, res: Response, next: NextFunction) => {

  let token: string | undefined;

  if (req.query._csrf || req.query.token) {
    token = String(req.query._csrf || req.query.token);
  } 
  else if (req.headers["x-xsrf-token"] || req.headers["x-csrf-token"]) {
    const headerToken = req.headers["x-xsrf-token"] || req.headers["x-csrf-token"];
    token = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  } 
  else if (req.cookies && req.cookies["XSRF-TOKEN"]) {
    token = req.cookies["XSRF-TOKEN"];
  }

  if (!token) {
    return res.status(403).json({ 
      success: false,
      message: "Missing CSRF Token" 
    });
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return res.status(403).json({ message: "Invalid Token Format (Expected 3 parts)" });
  }

  const [value, expiryStr, signature] = parts;

  const expiry = parseInt(expiryStr, 10);
  const now = Date.now();

  if (isNaN(expiry)) { 
     return res.status(403).json({ message: "Invalid Expiration Timestamp" });   
  }

  if (now > expiry) {
    console.warn(`⚠️ [CSRF EXPIRED] Token expired at ${new Date(expiry).toISOString()}, Now: ${new Date(now).toISOString()}`);
    return res.status(403).json({ 
      success: false, 
      message: "Token Expired", 
      code: "CSRF_EXPIRED" 
    });
  }

  // --- 3. KIỂM TRA CHỮ KÝ (Integrity Check) ---
  try {
    const dataToVerify = `${value}.${expiryStr}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToVerify)
      .digest('hex');

    // Chuyển về Buffer để so sánh an toàn (Timing Safe)
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    // Kiểm tra độ dài trước để tránh lỗi của hàm timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      
      console.error(`❌ [CSRF FAIL] Invalid Signature! IP: ${req.ip}, Token: ${token}`);
      return res.status(403).json({ 
        success: false, 
        message: "Invalid CSRF Signature", 
        code: "CSRF_TAMPERED" 
      });
    }

    // Token Hợp lệ -> Cho qua
    next();

  } catch (error) {
    console.error("CSRF Verification Error:", error);
    return res.status(403).json({ message: "Token Verification Failed" });
  }
};

export default verifyCsrfToken;