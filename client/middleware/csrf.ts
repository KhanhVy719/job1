import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { signToken, verifyToken } from '../utils/crypto';

// --- 1. MỞ RỘNG TYPE CHO EXPRESS REQUEST ---
// Khai báo này giúp TypeScript hiểu req.token là hợp lệ
declare global {
  namespace Express {
    interface Request {
      token?: string;
    }
  }
}

const TOKEN_MAX_AGE = 60 * 60 * 1000; 
const TOKEN_REFRESH_THRESHOLD = 10 * 60 * 1000; 

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const currentToken = req.cookies['XSRF-TOKEN'];
  
  let shouldSetCookie = false;
  let newToken = currentToken;

  // Logic kiểm tra Token cũ
  if (currentToken) {
    const verification = verifyToken(currentToken);
    if (!verification.isValid) {
      shouldSetCookie = true;
    } else if (verification.timeLeft && verification.timeLeft < TOKEN_REFRESH_THRESHOLD) {
      shouldSetCookie = true;
    }
  } else {
    shouldSetCookie = true;
  }

  // Nếu cần tạo mới hoặc refresh token
  if (shouldSetCookie) {
    const randomValue = crypto.randomUUID();
    newToken = signToken(randomValue, TOKEN_MAX_AGE);
    
    // 1. Gán vào req để dùng nội bộ Express (nếu cần)
    req.token = newToken;

    // 2. Set Cookie cho Browser (Response)
    res.cookie('XSRF-TOKEN', newToken, {
      httpOnly: false, // Để Client (Axios/Fetch) đọc được và gửi lại header
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOKEN_MAX_AGE
    });

    // 3. Cập nhật Headers cho Request (Để Next.js phía sau đọc được ngay lập tức)
    // Cập nhật chuỗi Cookie header để Next.js tưởng là cookie đã tồn tại
    const prevCookies = req.headers.cookie || '';
    // Xóa token cũ khỏi chuỗi (nếu có) và thêm token mới
    const cleanCookies = prevCookies.replace(/XSRF-TOKEN=[^;]+;?\s*/, '');
    const separator = cleanCookies && cleanCookies.trim() !== '' ? '; ' : '';
    req.headers.cookie = `${cleanCookies}${separator}XSRF-TOKEN=${newToken}`;
    
    // Gán thêm header riêng để dễ lấy trong Server Component (dùng headers().get('x-xsrf-token'))
    req.headers['x-xsrf-token'] = newToken;
  } else {
    // Nếu token cũ còn tốt, vẫn gán vào req.token để đồng bộ logic
    req.token = currentToken;
    // Đảm bảo header cũng có để Next.js đọc thống nhất
    if (!req.headers['x-xsrf-token']) {
        req.headers['x-xsrf-token'] = currentToken;
    }
  }

  next();
};