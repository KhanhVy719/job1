// next-seo.config.ts
// Single source of truth: đổi domain chỉ cần đổi NEXT_PUBLIC_SITE_URL (hoặc NEXT_PUBLIC_BASE_URL)
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");
const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
const siteUrlWithSlash = `${SITE_URL}/`;

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "RoPhim";

export default {
  titleTemplate: `%s – Admin | ${APP_NAME}`,
  defaultTitle: `Admin | ${APP_NAME}`,
  description:
    "Trang quản trị nội bộ RoPhim: quản lý phim, tập, người dùng, crawler và hệ thống.",

  additionalMetaTags: [
    {
      property: "og:image",
      content: absoluteUrl("/images/og-cinema-banner.jpg"),
      keyOverride: "og:image",
      "data-react-helmet": "true",
    },
    {
      name: "sitemap",
      content: absoluteUrl("/sitemap.xml"),
    },
    {
      name: "keywords",
      content: ["RoPhim Admin", "quản trị RoPhim", "dashboard phim"].join(", "),
    },
    // Trang admin nội bộ: chặn index để không lọt lên kết quả tìm kiếm
    { name: "robots", content: "noindex,nofollow" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "theme-color", content: "#101631" },
    { name: "author", content: "RoPhim Team" },
  ],

  canonical: siteUrlWithSlash,

  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrlWithSlash,
    site_name: `${APP_NAME} Admin`,
    images: [
      {
        url: absoluteUrl("/images/og-cinema-banner.jpg"),
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Admin`,
      },
    ],
  },

  twitter: {
    handle: "@RoPhim",
    site: "@RoPhim",
    cardType: "summary_large_image",
  },

  additionalLinkTags: [
    { rel: "icon", href: "/favicon.ico" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "manifest", href: "/site.webmanifest" },
    { rel: "mask-icon", href: "/favicon.ico", color: "#101631" },
    { rel: "alternate", hrefLang: "vi", href: siteUrlWithSlash },
  ],

  additionalScriptTags: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: `${APP_NAME} Entertainment`,
        url: siteUrlWithSlash,
        logo: absoluteUrl("/images/logo_rox.svg"),
      }),
    },
  ],
};
