import "dotenv/config";
// Loại bỏ các lệnh gọi crawler bị lặp lại và lỗi cú pháp ở đầu tệp.

import express from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";
import { createServer } from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import routes from "./routes/web";
import stream from "./routes/stream";

import connectDB from "./utils/mongodb";
import CrawlerTool from "./app/plugin/crawler/index";
import { systemStream } from "./services/SystemService";
import { gaStream, DetailedTrafficData } from "./services/GoogleAnalytics";
import { gscStream, GSCData } from "./services/SearchConsole";
import { Worker } from "worker_threads"; // Giữ lại Worker nếu có ý định dùng
import path from "path";

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
  "http://localhost:3001",
  "https://localhost:3001",
  "http://127.0.0.1:3001",
  "https://127.0.0.1:3001",
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
  "http://localhost:5000",
  "https://localhost:5000",
  "http://127.0.0.1:5000",
  "https://127.0.0.1:5000",
];

// Đổi domain production chỉ cần set env CORS_ORIGINS (phẩy phân tách), không phải sửa code.
// VD: CORS_ORIGINS="https://rophim.com,https://admin.rophim.com,https://cdn.rophim.com"
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
    // Cache preflight 24h — giảm round-trip OPTIONS từ admin/client.
    maxAge: 86400,
  })
);

gaStream.startPolling(60000);
gscStream.startPolling(3600000);

const httpServer = createServer(app);

app.use(cookieParser());
// Nén response cho HTML/JSON/text — bỏ qua segment video (.ts) và manifest stream.
app.use(
  compression({
    filter: (req, res) => {
      const type = String(res.getHeader("Content-Type") || "");
      if (/video\/mp2t|octet-stream|mpegurl/i.test(type)) return false; // không nén stream
      return compression.filter(req, res);
    },
  })
);
app.use(express.static("public", { maxAge: "7d", etag: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/v1", routes);
app.use("/", stream);

app.set("view engine", "ejs");
app.set("views", "./views");

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: whitelist, // Đã sửa: Thay "*" bằng whitelist để bảo mật hơn
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
});

/**
 * Hàm chạy các tác vụ crawler song song.
 * Cần đảm bảo các hàm CrawlerTool.run... trả về Promise.
 */

const runCrawlers = async () => {
  console.log("🚀 Bắt đầu chạy các tác vụ crawler song song...");
  try {
    await Promise.all([
      CrawlerTool.runTMDB("tv"),
      CrawlerTool.runTMDB("movie"),
      // CrawlerTool.loc(),
      // runTap() ĐÃ GỠ: Episode giờ được sinh trực tiếp từ luồng TMDB
      // (kèm embed_url VidSrc) trong handleMovieImport — không còn crawl ophim/phimapi.
    ]);
    console.log("✅ Tất cả các tác vụ crawler đã hoàn thành.");
  } catch  {
  }
};

// Chỉ gọi các hàm crawler MỘT LẦN DUY NHẤT sau khi khởi tạo server
runCrawlers();

io.on("connection", (socket: Socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  const sendSystemData = (data: any) => {
    socket.emit("admin:system_stats", data);
  };

  const sendTrafficData = (data: DetailedTrafficData) => {
    socket.emit("admin:system_stats", { ga_traffic: data });
  };

  const sendGSCData = (data: GSCData) => {
    socket.emit("admin:system_stats", { gsc_stats: data });
  };

  socket.on("admin:start_monitoring", async () => {
    console.log(`🔍 Socket ${socket.id} started monitoring.`);

    systemStream.on("data", sendSystemData);
    await systemStream.start();

    if (gaStream.lastData) {
      console.log("⚡ [Cache] Gửi data GA cho client.");
      sendTrafficData(gaStream.lastData);
    } else {
      console.log("⏳ [Wait] Chờ data GA...");
    }
    gaStream.on("traffic_update", sendTrafficData);

    if (gscStream.lastData) {
      console.log("⚡ [Cache] Gửi data GSC cho client.");
      sendGSCData(gscStream.lastData);
    } else {
      console.log("⏳ [Wait] Đang tải data GSC lần đầu...");
    }
    gscStream.on("gsc_update", sendGSCData);
  });

  const stopClientMonitoring = () => {
    console.log(`zzz Socket ${socket.id} stopped monitoring.`);
    systemStream.off("data", sendSystemData);
    gaStream.off("traffic_update", sendTrafficData);
    gscStream.off("gsc_update", sendGSCData);
  };

  socket.on("disconnect", stopClientMonitoring);
  socket.on("error", stopClientMonitoring);
});

httpServer.listen(PORT, HOST_NAME as any, () => {
  // console.clear();
  console.info(`Server đang chạy trên ${HOST_NAME}:${PORT}`);
});
