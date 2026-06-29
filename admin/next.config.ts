const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://shop-divine.vercel.app",
    ],
  },
  reactStrictMode: false
};

export default nextConfig;
