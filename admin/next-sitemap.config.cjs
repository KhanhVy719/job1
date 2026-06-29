/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: process.env.SITE_URL || "https://shop-divine.vercel.app",
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
