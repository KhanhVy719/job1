import "dotenv/config";
// Loại bỏ các lệnh gọi crawler bị lặp lại và lỗi cú pháp ở đầu tệp.

import express from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";
import routes from "./routes/web";

import connectDB from "./utils/mongodb";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

connectDB();
const PORT: number = Number(process.env.PORT) || 8001;
const HOST_NAME: string = process.env.URL || "localhost";

const app: Express = express();

const whitelist = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
  "http://localhost:4000",
  "https://localhost:4000",
  "http://127.0.0.1:4000",
  "https://127.0.0.1:4000",
];

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Playback-Session', 'Accept','x-csrf-token','X-XSRF-TOKEN', 'Origin', 'X-Requested-With'],
    credentials: true,
  })
);

const httpServer = createServer(app);

app.use(cookieParser());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/v1", routes);

app.set("view engine", "ejs");
app.set("views", "./views");

httpServer.listen(PORT, HOST_NAME as any, () => {
  // console.clear();
  console.info(`Server đang chạy trên ${HOST_NAME}:${PORT}`);
});
