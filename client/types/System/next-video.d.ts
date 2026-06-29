declare module 'next-video/plugin' {
  /**
   * Kiểu cho hàm withNextVideo
   * Nó nhận vào một NextConfig và trả về một NextConfig đã được bọc.
   */
  const withNextVideo: (config: import('next').NextConfig) => import('next').NextConfig;
  export { withNextVideo };
}