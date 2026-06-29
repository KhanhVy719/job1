/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig; // Chỉ xuất cấu hình Next.js thuần
