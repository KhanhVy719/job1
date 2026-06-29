import * as dns from "dns";
import mongoose from "mongoose";

const configureMongoDns = () => {
  const servers = (process.env.MONGODB_DNS_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (servers.length) dns.setServers(servers);
};

const connectDB = async (): Promise<typeof mongoose | void> => {
  configureMongoDns();
  const MONGODB_URI: string = process.env.MONGODB_URI || "";

  if (!MONGODB_URI) {
    console.error("Lỗi: Chưa cấu hình MONGODB_URI trong file .env");
    process.exit(1);
  }

  // Nếu đã kết nối rồi thì tái sử dụng, tránh tạo nhiều pool trùng
  // (readyState: 1 = connected, 2 = connecting)
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      // Giới hạn pool để 1 service không chiếm hết connection của cả cluster
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 0,
      // Thoát nhanh khi DB không phản hồi thay vì treo request
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(
      `MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );

    // Log các sự cố runtime (mất kết nối, lỗi) để dễ chẩn đoán
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB lỗi runtime:", err?.message || err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB đã ngắt kết nối.");
    });

    return conn;
  } catch (err) {
    // Log chi tiết thay vì nuốt lỗi
    console.error(
      "Lỗi kết nối Database:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
};

export default connectDB;
