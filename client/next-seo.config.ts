
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
const siteUrlWithSlash = `${SITE_URL}/`;

export default {
  titleTemplate: "%s | RoPhim Cinema - Netflix Vietsub, Phimmoi HD, iQIYI Drama, Bilibili Anime Miễn Phí",
  defaultTitle: "RoPhim | Xem Phim Online HD - Phim Netflix Mới, Phimmoi Cập Nhật, iQIYI Vietsub, Bilibili Thuyết Minh Mượt Nhất",

  description:
    "Trải nghiệm xem phim online miễn phí tốc độ cao tại RoPhim. Kho phim khổng lồ: Phim Netflix hay nhất 2024, Phimmoi phim lậu cập nhật mới, series iQIYI drama độc quyền, anime Bilibili Trung Quốc vietsub, phim chiếu rạp, K-Drama, Anime, phim bộ. Cập nhật tập mới hàng giờ, Vietsub/Thuyết minh chuẩn, không giật lag, phim Netflix codes, phụ đề tiếng Việt Netflix.",

  additionalMetaTags: [
    {
      property: "og:image",
      content: absoluteUrl("/images/og-cinema-banner.jpg"), // Hãy thiết kế 1 banner màu #101631 đẹp
      keyOverride: "og:image",
      "data-react-helmet": "true",
    },
    {
      property: "og:image:width",
      content: "1200",
    },
    {
      property: "og:image:height",
      content: "630",
    },

    // 2. Khai báo Sitemap cho Google Bot
    {
      name: "sitemap",
      content: absoluteUrl("/sitemap.xml"),
    },
     // 2. Khai báo Sitemap cho Google Bot
    {
      name: "admaven-placement",
      content: "BqjwHrTUG",
    },

    // 3. Bộ từ khóa SEO (Keywords) - Phân loại chi tiết, thêm gấp 4 lần từ khóa liên quan đến Netflix, Phimmoi, iQIYI, Bilibili để tối ưu top search
    {
      name: "keywords",
      content: [
        // Thương hiệu & Định danh
        "RoPhim", "RoPhim Phim", "Web phim RoPhim",

        // Từ khóa chính (High Volume)
        "xem phim", "phim online", "phim moi", "phim hay", "phim hd",
        "xem phim online mien phi", "web xem phim nhanh", "phim chat luong cao",
        "phim chiếu rạp mới nhất", "phim bom tấn", "xem phim 4k", "phim full hd", "xem phim truc tuyen", "phim moi cap nhat", "web phim hay",

        // Định dạng & Chất lượng
        "phim 4k", "phim 1080p", "phim bluray", "phim vietsub",
        "phim thuyết minh", "phim lồng tiếng", "phim không quảng cáo", "phim full vietsub", "phim thuyet minh hd", "phim long tieng viet", "phim khong quang cao",

        // Nền tảng & Thể loại Hot - Tập trung thêm gấp 4 lần cho Netflix, Phimmoi, iQIYI, Bilibili với nhiều biến thể
        "phim netflix", "netflix vietsub", "series netflix hay", "phim netflix moi nhat", "netflix online mien phi", "xem netflix hd", "phim netflix 2024", "netflix vietsub full", "netflix phim hay", "netflix series vietsub", "netflix phim bom tan", "netflix kdrama", "netflix anime", "netflix trung quoc",
        "netflix codes", "code bi mat netflix", "phim kinh di netflix", "phim tinh cam netflix", "phim hanh dong netflix", "phim khoa hoc vien tuong netflix", "phim netflix hay 2024", "top phim netflix", "netflix viet nam", "phu de tieng viet netflix", "xem netflix mien phi", "netflix phim lau", "netflix drama", "netflix series moi", "netflix phim chau a", "netflix phim my", "netflix phim han quoc", "netflix phim nhat ban", "netflix phim trung quoc hay", "netflix top series", "netflix review phim", "netflix lich chieu", "netflix phim 4k", "netflix bluray", "netflix thuyet minh", "netflix long tieng", "netflix khong quang cao", "netflix phim hot", "netflix phim moi cap nhat", "netflix web phim", "netflix phim online hd", "netflix phim bom tan 2024", "netflix kdrama vietsub", "netflix anime vietsub", "netflix trung quoc vietsub", "netflix codes kinh di", "netflix codes tinh cam", "netflix codes hanh dong", "netflix codes khoa hoc", "netflix phim hay nhat", "netflix series hay nhat", "netflix phim mien phi", "netflix xem phim nhanh", "netflix chat luong cao", "netflix phim chieu rap", "netflix phim netflix",

        "phim phimmoi", "phimmoi net", "phimmoi tv", "phimmoi online", "phimmoi hd", "phimmoi vietsub", "phimmoi moi nhat", "phimmoi phim hay", "phimmoi series", "phimmoi netflix", "phimmoi bilibili", "phimmoi iqiyi", "phimmoi kdrama", "phimmoi anime",
        "phimmoi phim lau", "phimmoi mien phi", "phimmoi full hd", "phimmoi web phim", "phimmoi xem phim online", "phimmoi phim moi cap nhat", "phimmoi phim bom tan", "phimmoi phim hay 2024", "phimmoi top phim", "phimmoi phim trung quoc", "phimmoi phim han quoc", "phimmoi phim my", "phimmoi phim nhat", "phimmoi anime vietsub", "phimmoi drama", "phimmoi series moi", "phimmoi phim chau a", "phimmoi review phim", "phimmoi lich chieu", "phimmoi phim 4k", "phimmoi bluray", "phimmoi thuyet minh", "phimmoi long tieng", "phimmoi khong quang cao", "phimmoi phim hot", "phimmoi web phim hay", "phimmoi phim online hd", "phimmoi phim bom tan 2024", "phimmoi kdrama vietsub", "phimmoi anime vietsub", "phimmoi trung quoc vietsub", "phimmoi kinh di", "phimmoi tinh cam", "phimmoi hanh dong", "phimmoi khoa hoc", "phimmoi phim hay nhat", "phimmoi series hay nhat", "phimmoi phim mien phi", "phimmoi xem phim nhanh", "phimmoi chat luong cao", "phimmoi phim chieu rap", "phimmoi phim moi net", "phimmoi phim lau hay", "phimmoi phim lậu mien phi", "phimmoi phim lau hd", "phimmoi phim lau vietsub", "phimmoi phim lau moi nhat",

        "phim iqiyi", "iqiyi vietsub", "series iqiyi hay", "iqiyi online", "iqiyi hd", "iqiyi phim trung quoc", "iqiyi drama", "iqiyi moi nhat", "iqiyi full vietsub", "iqiyi phim hay 2024", "iqiyi netflix", "iqiyi bilibili", "iqiyi kdrama", "iqiyi anime",
        "iqiyi phim bo", "iqiyi phim hoa ngu", "iqiyi hoc tieng trung", "iqiyi phim han quoc", "iqiyi phim nhat ban", "iqiyi phim chau a", "iqiyi drama trung quoc", "iqiyi series moi", "iqiyi phim hot", "iqiyi web phim", "iqiyi xem phim online", "iqiyi phim moi cap nhat", "iqiyi phim bom tan", "iqiyi top phim", "iqiyi review phim", "iqiyi lich chieu", "iqiyi phim 4k", "iqiyi bluray", "iqiyi thuyet minh", "iqiyi long tieng", "iqiyi khong quang cao", "iqiyi phim mien phi", "iqiyi xem phim nhanh", "iqiyi chat luong cao", "iqiyi phim chieu rap", "iqiyi drama vietsub", "iqiyi anime vietsub", "iqiyi trung quoc vietsub", "iqiyi kinh di", "iqiyi tinh cam", "iqiyi hanh dong", "iqiyi khoa hoc", "iqiyi phim hay nhat", "iqiyi series hay nhat", "iqiyi phim online hd", "iqiyi phim bom tan 2024", "iqiyi kdrama vietsub", "iqiyi phim trung quoc hay", "iqiyi show truyen hinh", "iqiyi phim tai lieu", "iqiyi phim co trang", "iqiyi phim ngon tinh", "iqiyi phim kinh di hay", "iqiyi phim hanh dong my", "iqiyi phim khoa hoc vien tuong", "iqiyi top drama 2024", "iqiyi phim moi trung quoc", "iqiyi phim han hay",

        "phim bilibili", "bilibili vietsub", "bilibili trung quoc", "bilibili anime", "bilibili online mien phi", "bilibili hd", "bilibili series", "bilibili phim hay", "bilibili moi nhat", "bilibili drama", "bilibili netflix", "bilibili iqiyi", "bilibili kdrama", "bilibili phim bom tan",
        "bilibili app", "bilibili viet nam", "xem anime bilibili", "bilibili anime vietsub", "bilibili phim trung quoc", "bilibili hoc tieng trung", "bilibili phim han quoc", "bilibili phim nhat ban", "bilibili phim chau a", "bilibili drama trung quoc", "bilibili series moi", "bilibili phim hot", "bilibili web phim", "bilibili xem phim online", "bilibili phim moi cap nhat", "bilibili phim bom tan", "bilibili top phim", "bilibili review phim", "bilibili lich chieu", "bilibili phim 4k", "bilibili bluray", "bilibili thuyet minh", "bilibili long tieng", "bilibili khong quang cao", "bilibili phim mien phi", "bilibili xem phim nhanh", "bilibili chat luong cao", "bilibili phim chieu rap", "bilibili drama vietsub", "bilibili trung quoc vietsub", "bilibili kinh di", "bilibili tinh cam", "bilibili hanh dong", "bilibili khoa hoc", "bilibili phim hay nhat", "bilibili series hay nhat", "bilibili phim online hd", "bilibili phim bom tan 2024", "bilibili kdrama vietsub", "bilibili phim trung quoc hay", "bilibili show truyen hinh", "bilibili phim tai lieu", "bilibili phim co trang", "bilibili phim ngon tinh", "bilibili phim kinh di hay", "bilibili phim hanh dong my", "bilibili phim khoa hoc vien tuong", "bilibili top anime 2024", "bilibili anime moi", "bilibili anime hay", "bilibili anime lau", "bilibili anime mien phi", "bilibili anime hd",

        "phim bộ hàn quốc", "phim cổ trang trung quốc", "phim ngôn tình", "phim bộ full vietsub", "phim co trang hay", "phim ngon tinh trung quoc", "phim han quoc hay 2024", "phim trung quoc moi", "phim my bom tan",
        "phim hành động mỹ", "phim khoa học viễn tưởng", "phim kinh dị", "phim hanh dong hay", "phim khoa hoc vien tuong 2024", "phim kinh di my", "phim kinh di chau a", "phim hanh dong trung quoc",
        "anime vietsub", "hoạt hình 3d trung quốc", "tv show hay", "anime hay 2024", "anime vietsub full", "anime moi cap nhat", "hoat hinh trung quoc hay", "tv show han quoc", "tv show trung quoc",

        // Từ khóa hành vi người dùng (User Intent)
        "review phim", "tóm tắt phim", "lịch chiếu phim", "top phim hay nhất 2024",
        "phim bộ full", "phim lẻ hay", "tải phim hd", "review phim netflix", "tom tat phim netflix", "lich chieu netflix", "top phim netflix 2024", "phim bo netflix full", "phim le netflix hay", "tai phim netflix hd",
        "xem phim trên điện thoại", "xem phim smart tv", "xem phim dien thoai", "xem phim tv thong minh", "xem phim android", "xem phim ios",
        "top phim netflix", "review netflix", "lich phim netflix", "top series netflix 2024", "netflix phim bo full", "netflix phim le hay", "netflix tai phim hd", "netflix xem tren dien thoai", "netflix xem smart tv",
        "top phim phimmoi", "review phimmoi", "phimmoi full hd", "phimmoi top phim hay", "phimmoi phim bo full", "phimmoi phim le hay", "phimmoi tai phim hd", "phimmoi xem tren dien thoai", "phimmoi xem smart tv",
        "top phim iqiyi", "iqiyi review", "iqiyi top drama", "iqiyi phim moi 2024", "iqiyi phim bo full", "iqiyi phim le hay", "iqiyi tai phim hd", "iqiyi xem tren dien thoai", "iqiyi xem smart tv",
        "top phim bilibili", "bilibili review", "bilibili top anime", "bilibili phim trung quoc hay", "bilibili phim bo full", "bilibili phim le hay", "bilibili tai phim hd", "bilibili xem tren dien thoai", "bilibili xem smart tv",

        // Từ khóa cạnh tranh (để hút traffic từ các web cũ)
        "motphim", "phimmoi", "phimmoizz", "tvhay", "dongphym", "rophim", "chillhay",
        "netflix phimmoi", "iqiyi phimmoi", "bilibili phimmoi", "netflix iqiyi", "netflix bilibili", "iqiyi bilibili", "phimmoi motphim", "phimmoi tvhay", "phimmoi dongphym", "phimmoi rophim", "phimmoi chillhay", "netflix motphim", "netflix tvhay", "netflix dongphym", "netflix chillhay", "iqiyi motphim", "iqiyi tvhay", "iqiyi dongphym", "iqiyi chillhay", "bilibili motphim", "bilibili tvhay", "bilibili dongphym", "bilibili chillhay"
      ].join(", "),
    },

    // 4. Các thẻ kỹ thuật cho Mobile & Bot - Thêm thẻ để tối ưu top search
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
    { name: "theme-color", content: "#101631" }, // Màu theo yêu cầu (Thanh trạng thái trình duyệt Mobile)
    { name: "msapplication-TileColor", content: "#101631" }, // Màu tile trên Windows
    { name: "revisit-after", content: "1 days" }, // Yêu cầu Bot quay lại mỗi ngày
    { name: "author", content: "RoPhim Team" },
    { name: "copyright", content: "RoPhim Cinema" },
    { name: "geo.region", content: "VN" }, // SEO Local Việt Nam
    { name: "geo.position", content: "14.058324;108.277199" }, // Tọa độ trung tâm VN
    { name: "ICBM", content: "14.058324, 108.277199" },
    { name: "google-site-verification", content: "your-google-verification-code" }, // Thêm nếu có mã xác thực Google
    { name: "bing-site-verification", content: "your-bing-verification-code" }, // Thêm nếu có mã Bing
    { name: "yandex-verification", content: "your-yandex-verification-code" }, // Thêm nếu cần SEO Nga/Yandex
    { name: "rating", content: "general" }, // Xếp hạng nội dung chung
    { name: "distribution", content: "global" }, // Phân phối toàn cầu
    { name: "classification", content: "Movies, Streaming, Entertainment" }, // Phân loại nội dung
    { name: "language", content: "vi" }, // Ngôn ngữ
    { name: "og:locale:alternate", content: "en_US" }, // Ngôn ngữ thay thế
  ],

  // Canonical URL (Rất quan trọng để tránh trùng lặp nội dung)
  canonical: siteUrlWithSlash,

  // Cấu hình Open Graph (Hiển thị khi share link) - Tích hợp nhiều từ khóa Netflix, Phimmoi, iQIYI, Bilibili hơn
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrlWithSlash,
    site_name: "RoPhim Cinema",
    title: "RoPhim | Thế Giới Phim Ảnh Netflix Vietsub, Phimmoi HD, iQIYI Drama, Bilibili Anime Trong Tầm Tay",
    description: "Thưởng thức hàng ngàn bộ phim bom tấn Netflix hay 2024, series Phimmoi cập nhật, drama iQIYI độc quyền, anime Bilibili vietsub với chất lượng hình ảnh tuyệt đỉnh. Cập nhật liên tục 24/7, Vietsub full, phim Netflix codes, phụ đề tiếng Việt.",
    images: [
      {
        url: absoluteUrl("/images/og-cinema-banner.jpg"),
        width: 1200,
        height: 630,
        alt: "RoPhim Cinema - Xem phim Netflix Vietsub, Phimmoi Online, iQIYI Drama, Bilibili Anime HD",
      },
    ],
  },

  // Cấu hình Twitter Card - Tích hợp nhiều từ khóa hơn
  twitter: {
    handle: "@RoPhim",
    site: "@RoPhim",
    cardType: "summary_large_image",
    title: "RoPhim | Xem Phim Netflix Vietsub, Phimmoi HD, iQIYI Drama, Bilibili Anime Miễn Phí",
    description: "Kho phim Netflix hay 2024, Phimmoi cập nhật mới, iQIYI drama vietsub, Bilibili anime miễn phí tại RoPhim. Xem ngay với phụ đề tiếng Việt, codes Netflix!",
    image: absoluteUrl("/images/og-cinema-banner.jpg"),
  },

  // Favicon & Icons
  additionalLinkTags: [
    { rel: "icon", href: "/favicon.ico" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "manifest", href: "/site.webmanifest" },
    // Mask icon cho Safari, dùng màu thương hiệu
    { rel: "mask-icon", href: "/favicon.ico", color: "#101631" },
    { rel: "alternate", hrefLang: "vi", href: siteUrlWithSlash },
    { rel: "preconnect", href: "https://fonts.googleapis.com" }, // Tối ưu tốc độ load font
    { rel: "dns-prefetch", href: SITE_URL }, // Tối ưu DNS
    { rel: "prefetch", href: "/images/logo.svg" }, // Prefetch hình ảnh
  ],

  additionalScriptTags: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "RoPhim Cinema",
        alternateName: ["RoPhim Phim", "Netflix Vietsub Việt Nam", "Phimmoi HD Online", "iQIYI Drama Vietsub", "Bilibili Anime Miễn Phí"],
        url: siteUrlWithSlash,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: absoluteUrl("/tim-kiem?q={search_term_string}")
          },
          "query-input": "required name=search_term_string"
        },
        inLanguage: "vi-VN",
        copyrightYear: new Date().getFullYear(),
        publisher: {
          "@type": "Organization",
          name: "RoPhim Entertainment",
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl("/images/logo_rox.svg") // Thay logo của bạn
          }
        },
        keywords: ["phim netflix vietsub", "phimmoi online hd", "iqiyi drama vietsub", "bilibili anime vietsub", "xem phim online mien phi", "phim hay 2024", "netflix codes", "phimmoi phim lau", "iqiyi phim trung quoc", "bilibili app viet nam"]
      }),
    },
  ],
};