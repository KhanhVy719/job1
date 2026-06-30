import "dotenv/config";
// Loại bỏ các lệnh gọi crawler bị lặp lại và lỗi cú pháp ở đầu tệp.

import express from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";
import compression from "compression";
import routes from "./routes/web";
import stream from "./routes/stream";
import MetaController from "./app/controller/catalog/meta";

import connectDB from "./utils/mongodb";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

connectDB();
const PORT: number = Number(process.env.PORT) || 8001;
const HOST_NAME: string = process.env.URL || "localhost";

const app: Express = express();

// Origin localhost mặc định cho môi trường dev.
const baseWhitelist = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
  "http://localhost:5000",
  "https://localhost:5000",
  "http://127.0.0.1:8080",
  "https://127.0.0.1:8080",
];

// Đổi domain production chỉ cần set env CORS_ORIGINS (phẩy phân tách), không phải sửa code.
// VD: CORS_ORIGINS="https://rophim.com,https://cdn.rophim.com"
const envOrigins = (process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const whitelist = [...new Set([...baseWhitelist, ...envOrigins])];

app.use(
  cors({
    origin: function (origin, callback) {
      // Request không có Origin (server-to-server, SSR, health-check) được phép theo mặc định.
      // Đặt CORS_STRICT_NO_ORIGIN=true để chặn hoàn toàn các request thiếu Origin.
      if (!origin) {
        const strictNoOrigin = process.env.CORS_STRICT_NO_ORIGIN === "true";
        return callback(strictNoOrigin ? new Error("Not allowed by CORS") : null, !strictNoOrigin);
      }
      if (whitelist.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Playback-Session', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
  })
);

const httpServer = createServer(app);

// Gzip/brotli cho m3u8 (text, nén tốt) + JSON; KHÔNG nén .ts (đã là binary nén sẵn → phí CPU).
app.use(
  compression({
    filter: (req, res) => {
      const type = String(res.getHeader("Content-Type") || "");
      if (/video\/mp2t|octet-stream/i.test(type)) return false; // bỏ qua segment .ts
      return /mpegurl|json|text|javascript|css|html|xml/i.test(type) || compression.filter(req, res);
    },
  })
);

app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", "./views");
app.get("/", MetaController.index);
// Cache static assets: đỡ revalidate mỗi lần load. Asset có hash nên để lâu được.
app.use(express.static("public", { maxAge: "7d", etag: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/v1", routes);
app.use("/", stream);

// Keep-alive timeouts > timeout của reverse proxy để tránh đứt kết nối reuse khi fan-out segment.
httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;

httpServer.listen(PORT, HOST_NAME as any, () => {
  // console.clear();
  console.info(`Server đang chạy trên ${HOST_NAME}:${PORT}`);
});
