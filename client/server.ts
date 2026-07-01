import express from 'express';
import next from 'next';
import cookieParser from 'cookie-parser';
import { csrfMiddleware } from './middleware/csrf';
import { initCronJobs } from './services/cron';

const dev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// Danh sách các đuôi file cần bảo vệ
const PROTECTED_EXTENSIONS = [
  '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.json', '.xml'
];

const PUBLIC_ASSET_ALLOWLIST = [
  /^\/favicon\.ico$/,
  /^\/apple-touch-icon\.png$/,
  /^\/site\.webmanifest$/,
  /^\/robots\.txt$/,
  /^\/sitemap(?:-\d+)?\.xml$/,
  /^\/images\/(?:logo|logo_rox|ro-icon|vn_flag)\.svg$/,
  /^\/images\/social\/telegram-icon\.svg$/,
  /^\/images\/icons\/[\w-]+\.svg$/,
  /^\/events\/snow\.js$/,
  /^\/gtag\.js$/,
];

const CACHEABLE_PUBLIC_EXTENSIONS = [
  '.avif', '.css', '.gif', '.ico', '.jpg', '.jpeg', '.js', '.json', '.png',
  '.svg', '.webp', '.woff', '.woff2', '.xml'
];

const isNextAssetPath = (path: string) =>
  path.startsWith('/_next/') || path.startsWith('/static/');

const isCacheablePublicAssetPath = (path: string) =>
  isNextAssetPath(path) ||
  PUBLIC_ASSET_ALLOWLIST.some((pattern) => pattern.test(path)) ||
  CACHEABLE_PUBLIC_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

// Origin nội bộ (dev) luôn được phép. Thêm domain production qua env CORS_ORIGINS
// (danh sách phân tách bằng dấu phẩy), ví dụ: CORS_ORIGINS=https://rophim.example
const defaultOrigins = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
  "http://localhost:8080",
  "https://localhost:8080",
  "http://127.0.0.1:8080",
  "https://127.0.0.1:8080",
  "http://localhost:4000",
  "https://localhost:4000",
  "http://127.0.0.1:4000",
  "https://127.0.0.1:4000",
];
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
const whitelist = Array.from(new Set([...defaultOrigins, ...envOrigins]));

declare global {
  namespace NodeJS {
    interface Process {
      noDeprecation?: boolean;
    }
  }
}

if (dev) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  process.noDeprecation = true;
}

app.prepare().then(() => {
  const server = express();

  initCronJobs();
  server.use(cookieParser());

  server.use((req, res, next) => {
    const path = req.path;

    if (PUBLIC_ASSET_ALLOWLIST.some((pattern) => pattern.test(path))) {
      return next();
    }

    // 1. Bỏ qua file hệ thống Next.js
    if (isNextAssetPath(path)) {
      return next();
    }

    // Kiểm tra xem request này có phải là Asset cần bảo vệ không
    const isAsset = PROTECTED_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));

    if (isAsset) {
      // --- LỚP 1: CHẶN TRUY CẬP TRỰC TIẾP (DIRECT ACCESS) ---
      // 'sec-fetch-dest': 'document' nghĩa là user gõ link vào thanh địa chỉ
      // 'sec-fetch-mode': 'navigate' nghĩa là trình duyệt đang chuyển hướng tới link này
      const fetchDest = req.headers['sec-fetch-dest'];
      const fetchMode = req.headers['sec-fetch-mode'];

      if (fetchDest === 'document' || fetchMode === 'navigate') {
        if (dev) console.warn(`[BLOCKED] Direct Access: ${path}`);
        return res.status(403).send('Forbidden: Direct access not allowed');
      }

      // --- LỚP 2: KIỂM TRA REFERER & SITE ---
      const referer = req.headers.referer || "";
      const currentHost = req.headers.host || ""; 
      
      // Kiểm tra Sec-Fetch-Site (Header này rất tin cậy trên Chrome/Edge/Firefox mới)
      // 'same-origin': Request từ chính web của bạn
      // 'cross-site': Request từ web khác
      // 'none': Request trực tiếp (thường đã bị chặn ở Lớp 1, nhưng check lại cho chắc)
      const fetchSite = req.headers['sec-fetch-site'];

      let isTrusted = false;

      // Case A: Có Referer (Cách truyền thống)
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererHost = refererUrl.host;
          const refererOrigin = refererUrl.origin;

          // Cho phép nếu cùng Host HOẶC nằm trong Whitelist
          if (refererHost === currentHost || whitelist.includes(refererOrigin)) {
            isTrusted = true;
          }
        } catch (e) { isTrusted = false; }
      } 
      
      // Case B: Không có Referer (thường gặp ở Localhost hoặc khi trình duyệt bảo mật cao)
      // Lúc này ta dựa vào 'sec-fetch-site'
      else if (fetchSite === 'same-origin') {
         // Nếu trình duyệt xác nhận đây là request nội bộ -> Cho phép
         isTrusted = true;
      }

      if (!isTrusted) {
        if (dev) console.warn(`[BLOCKED] Untrusted source: ${path} | Ref: ${referer} | Site: ${fetchSite}`);
        return res.status(403).send('Forbidden');
      }
    }

    // Nếu không phải asset, hoặc đã qua được các bài test -> Next
    next();
  });

  server.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && isCacheablePublicAssetPath(req.path)) {
      return next();
    }

    csrfMiddleware(req, res, next);
  });

  server.all(/(.*)/, (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, (err?: any) => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
