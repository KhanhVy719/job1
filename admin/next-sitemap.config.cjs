/** @type {import('next-sitemap').IConfig} */
const config = {
  // Đổi domain chỉ cần set env SITE_URL (hoặc NEXT_PUBLIC_SITE_URL)
  siteUrl:
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3001",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "daily",
  priority: 0.8,

  transform: async (_config, path) => {
    return {
      loc: path,
      changefreq: path === "/" ? "hourly" : _config.changefreq,
      priority: path === "/" ? 1.0 : _config.priority,
      lastmod: new Date().toISOString(),
    };
  },
};

module.exports = config;
