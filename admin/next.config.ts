// Đổi domain chỉ cần set NEXT_PUBLIC_ALLOWED_DEV_ORIGINS (danh sách ngăn cách dấu phẩy)
const devOrigins = (process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: devOrigins,
  },
  reactStrictMode: false
};

export default nextConfig;
