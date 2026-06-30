/** @type {import('next-sitemap').IConfig} */

// Cấu hình URL API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

module.exports = {
  siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "daily",
  priority: 0.8,
  exclude: ["/yeu-thich", "/danh-sach", "/lich-su", "/tai-khoan"],

  robotsTxtOptions: {
    additionalSitemaps: [],
  },

  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: path === "/" ? "hourly" : config.changefreq,
      priority: path === "/" ? 1.0 : config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },

  additionalPaths: async (config) => {
    const resultPaths = [];
    const dateNow = new Date().toISOString();

    // 1. Thêm Quốc gia
    const countries = ["GB", "CA", "KR", "HK", "US"];
    console.log(`\n🌍 [1/4] Đang thêm ${countries.length} trang quốc gia...`);
    countries.forEach((code) => {
      resultPaths.push({
        loc: `/quoc-gia/${code}`,
        changefreq: "daily",
        priority: 0.9,
        lastmod: dateNow,
      });
    });

    // 2. Thêm Thể loại
    try {
      console.log(`📂 [2/4] Đang lấy danh sách Thể loại...`);
      const catRes = await fetch(`${API_BASE_URL}/api/v1/menu/the-loai`);
      const catJson = await catRes.json();
      
      if (catJson.status && Array.isArray(catJson.data)) {
        console.log(`   -> Tìm thấy ${catJson.data.length} thể loại.`);
        catJson.data.forEach((cat) => {
          if (cat.slug) {
            resultPaths.push({
              loc: `/c/${cat.slug}`,
              changefreq: "daily",
              priority: 0.9,
              lastmod: dateNow,
            });
          }
        });
      }
    } catch (error) {
      console.error("⚠️ Lỗi khi lấy Thể loại:", error.message);
    }

    // 3. Thêm Phim và Tập phim
    const movieBatchSize = 20; // Tăng nhẹ batch size để chạy nhanh hơn chút
    
    try {
      console.log(`🎬 [3/4] Đang lấy danh sách Phim & Tập phim...`);

      // Lấy trang 1 để biết tổng số trang
      const firstPageRes = await fetch(`${API_BASE_URL}/api/v1/duyet-tim?page=1`);
      const firstPageData = await firstPageRes.json();

      if (!firstPageData.status) throw new Error("API Phim trả về status false");

      const totalPages = firstPageData.data.pagination.totalPages;
      const totalItems = firstPageData.data.pagination.totalItems;
      console.log(`   -> Tổng cộng: ${totalItems} phim trên ${totalPages} trang.`);

      const allPageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

      // Hàm xử lý từng trang
      const fetchPageData = async (pageNum) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/duyet-tim?page=${pageNum}`);
          const json = await res.json();
          const items = json.data?.items || [];
          const pagePaths = [];

          // Xử lý từng phim trong trang
          const moviePromises = items.map(async (movie) => {
            // 3.1. Thêm URL chính của phim (Luôn thêm)
            pagePaths.push({
              loc: `/phim/${movie.slug}`,
              lastmod: movie.updatedAt || dateNow,
              changefreq: "weekly",
              priority: 0.8,
            });

            // 3.2. Gọi API chi tiết để lấy danh sách tập
            try {
              const detailRes = await fetch(`${API_BASE_URL}/api/v1/phim/${movie.slug}`);
              const detailJson = await detailRes.json();
              
              // FIX: Kiểm tra kỹ nếu có mảng episodes và độ dài > 0 mới chạy
              if (
                detailJson.status && 
                detailJson.data && 
                Array.isArray(detailJson.data.episodes) && 
                detailJson.data.episodes.length > 0
              ) {
                const episodes = detailJson.data.episodes;
                
                episodes.forEach((ep) => {
                  // Chỉ thêm nếu có slug tập hợp lệ
                  if (ep.slug) {
                    pagePaths.push({
                      loc: `/xem-phim/${movie.slug}/${ep.slug}`,
                      lastmod: ep.updatedAt || movie.updatedAt || dateNow,
                      changefreq: "weekly",
                      priority: 0.6, 
                    });
                  }
                });
              } else {
                // Nếu không có tập phim (mảng rỗng hoặc null), code sẽ tự động bỏ qua (skip) tại đây
                // Không làm gì cả
              }
            } catch (err) {
              // Nếu lỗi API chi tiết phim thì chỉ log nhẹ, không chặn luồng
              // console.error(`   -> Skip lấy tập phim: ${movie.slug}`);
            }
          });

          await Promise.all(moviePromises);
          return pagePaths;

        } catch (err) {
          console.error(`   -> ⚠️ Lỗi trang ${pageNum}:`);
          return [];
        }
      };

      // Chạy vòng lặp theo batch
      for (let i = 0; i < allPageNumbers.length; i += movieBatchSize) {
        const batch = allPageNumbers.slice(i, i + movieBatchSize);
        console.log(`   -> Đang xử lý trang ${batch[0]} đến ${batch[batch.length - 1] || batch[0]}...`);
        
        const batchResults = await Promise.all(batch.map(num => fetchPageData(num)));
        batchResults.forEach(items => resultPaths.push(...items));
      }

    } catch (error) {
      console.error("🔥 Lỗi nghiêm trọng khi lấy Phim:");
    }

    console.log(`✅ HOÀN TẤT! Tổng cộng sitemap chứa ${resultPaths.length} URLs.`);
    return resultPaths;
  },
};
