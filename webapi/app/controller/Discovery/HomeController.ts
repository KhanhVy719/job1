import { Request, Response } from "express";
import axios from "axios";
import { FilterQuery } from "mongoose";
import https from "https";
import Movie from "../../model/Movie";
import Episode from "../../model/Episode";
import Season from "../../model/Season";
import ScheduledEpisode from "../../model/ScheduledEpisode";
import Category from "../../model/Category";
import Country from "../../model/Country";
import {
  ALL_SECTIONS_CONFIG,
  QUERY_MAPPING,
  PRELOAD_KEYS,
  VALID_IMAGE_CONSTRAINT,
} from "../Shared/shared";
import AIService, { AICreativeSection } from "../AIService";

// Agent dùng chung cho gọi lịch chiếu bên ngoài — keepAlive để tái dùng kết nối,
// tránh tạo agent mới (rò rỉ socket) mỗi lần fetchExternalSchedule chạy.
const scheduleHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
  keepAlive: true,
  maxSockets: Number(process.env.SCHEDULE_MAX_SOCKETS) || 32,
  maxFreeSockets: 8,
});

class HomeController {
  private static async _attachFirstPlayUrls(movies: any[]) {
    if (!Array.isArray(movies) || movies.length === 0) return movies;

    const movieIds = movies.map((movie) => movie?._id).filter(Boolean);
    if (movieIds.length === 0) return movies;

    const seasons = await Season.find({ movie_id: { $in: movieIds } })
      .select("_id movie_id slug season_number")
      .sort({ season_number: 1 })
      .lean();

    const firstSeasonByMovie = new Map<string, any>();
    for (const season of seasons) {
      const movieId = String(season.movie_id);
      if (!firstSeasonByMovie.has(movieId)) {
        firstSeasonByMovie.set(movieId, season);
      }
    }

    const firstSeasons = Array.from(firstSeasonByMovie.values());
    const seasonIds = firstSeasons.map((season) => season._id).filter(Boolean);
    if (seasonIds.length === 0) return movies;

    const episodes = await Episode.find({ season_id: { $in: seasonIds } })
      .select("season_id slug episode sort_order types videos.type")
      .sort({ season_id: 1, episode: 1, sort_order: 1 })
      .lean();

    const firstEpisodeBySeason = new Map<string, any>();
    for (const episode of episodes) {
      const seasonId = String(episode.season_id);
      if (!firstEpisodeBySeason.has(seasonId)) {
        firstEpisodeBySeason.set(seasonId, episode);
      }
    }

    return movies.map((movie) => {
      const season = firstSeasonByMovie.get(String(movie._id));
      const episode = season ? firstEpisodeBySeason.get(String(season._id)) : null;
      const playbackType = episode?.types?.[0] || episode?.videos?.[0]?.type || "phude";
      const playUrl =
        movie?.slug && season?.slug && episode?.slug
          ? `/phim/${movie.slug}/${season.slug}/${episode.slug}?type=${encodeURIComponent(playbackType)}`
          : undefined;

      return playUrl ? { ...movie, play_url: playUrl } : movie;
    });
  }

  private static async _buildQueryConfig(config: any) {
    const baseQuery: any = { ...VALID_IMAGE_CONSTRAINT };

    switch (config.type) {
      case "category": {
        const cat = await Category.findOne({ slug: config.slug })
          .select("_id")
          .lean();
        if (!cat) return null;
        baseQuery.category = cat._id;
        break;
      }
      case "country": {
        const condition = config.code
          ? { code: config.code }
          : { slug: config.slug };
        const country = await Country.findOne(condition).select("_id").lean();
        if (!country) return null;
        baseQuery.country = country._id;
        break;
      }
      case "country_group": {
        const countries = await Country.find({ code: { $in: config.codes } })
          .select("_id")
          .lean();
        if (!countries.length) return null;
        baseQuery.country = { $in: countries.map((c) => c._id) };
        break;
      }
      case "combo": {
        const [cat, country] = await Promise.all([
          Category.findOne({ slug: config.categorySlug }).select("_id").lean(),
          Country.findOne({ code: config.countryCode }).select("_id").lean(),
        ]);
        if (!cat || !country) return null;
        baseQuery.category = cat._id;
        baseQuery.country = country._id;
        break;
      }
      case "upcoming": {
        baseQuery.$and = [
          { trailer_url: { $ne: "" } },
          {
            $or: [
              { status: "trailer" },
              { episode_current: "Trailer" },
              { episode_current: "0" },
            ],
          },
        ];
        break;
      }
      case "custom_query": {
        Object.assign(baseQuery, config.query);
        break;
      }
      default:
        return null;
    }

    return {
      query: baseQuery,
      sort: config.sort || { updatedAt: -1 },
      limit: config.limit || 12,
    };
  }

  private static _fixExternalImage(path: string) {
    if (!path) return "/images/placeholder-poster.svg";
    const fileName = path.split("/").pop();
    return `https://static.nutscdn.com/vimg/300-0/${fileName}`;
  }

  /**
   * Lấy dữ liệu cho các section cố định (Pre-defined)
   */
  private static async _fetchSectionData(key: string) {
    const config = QUERY_MAPPING[key];
    if (!config) return { status: false, data: [] };

    const queryConfig = await this._buildQueryConfig(config);
    if (!queryConfig) return { status: false, data: [] };

    const data = await Movie.find(queryConfig.query)
      .sort(queryConfig.sort)
      .limit(queryConfig.limit)
      .populate("category", "name slug")
      .populate("country", "name slug")
      .lean();

    return { status: true, data };
  }

  // =========================================================================
  //  2. PRIVATE HELPERS: XỬ LÝ QUERY SÁNG TẠO (AI GENERATED)
  // =========================================================================

  /**
   * Biến ý tưởng của AI (AICreativeSection) thành Query MongoDB thực tế
   * bằng cách tra cứu ID từ các Model (Category, Country).
   */
  private static async _resolveCreativeQuery(aiData: AICreativeSection) {
    const { filters } = aiData;
    const query: FilterQuery<any> = { ...VALID_IMAGE_CONSTRAINT };
    let sort: any = { updatedAt: -1 };

    // 1. Xử lý Thể loại (Category) -> Tìm ID từ slug AI đưa
    if (filters.genre_slug) {
      const cat = await Category.findOne({ slug: filters.genre_slug })
        .select("_id")
        .lean();
      if (cat) query.category = cat._id;
    }

    // 2. Xử lý Quốc gia (Country) -> Tìm ID từ slug AI đưa
    if (filters.country_slug) {
      const country = await Country.findOne({ slug: filters.country_slug })
        .select("_id")
        .lean();
      if (country) query.country = country._id;
    }

    // 3. Xử lý Loại phim (Movie/TV)
    if (filters.type) {
      query.type = filters.type;
    }

    // 4. Xử lý Năm
    if (filters.year) {
      query.year = filters.year;
    }

    // 5. Xử lý Phim Chiếu Rạp
    if (filters.is_cinema === true) {
      query.chieurap = true;
    }

    // 6. Xử lý Sắp xếp
    if (filters.sort_by === "view") sort = { view: -1 };
    else if (filters.sort_by === "rating") sort = { "tmdb.vote_average": -1 };
    else sort = { updatedAt: -1 }; // Mặc định là mới nhất

    return { query, sort };
  }

  // =========================================================================
  //  3. PUBLIC HANDLERS
  // =========================================================================

  static getHomeData = async (req: Request, res: Response) => {
    try {
      const pageKey = req.query.page as string;

      // ---------------------------------------------------------
      // CASE 1: INFINITE SCROLL (Cuộn vô tận - AI Tự nghĩ ra chủ đề)
      // ---------------------------------------------------------
      if (pageKey === "infinite_random") {
        // B1: Hỏi AI: "Nghĩ ra một chủ đề phim độc lạ xem nào?"
        const aiSection = await AIService.generateFastSection();

        // B2: Dịch ý tưởng AI sang Query MongoDB (Tìm ID Category/Country thật)
        const { query, sort } = await this._resolveCreativeQuery(aiSection);

        // B3: Query Database
        // Thêm skip ngẫu nhiên nhỏ (0-20) để tránh lặp lại nếu AI nghĩ trùng ý tưởng
        const randomSkip = Math.floor(Math.random() * 20);

        const data = await Movie.find(query)
          .sort(sort)
          .skip(randomSkip)
          .limit(12)
          .populate("category", "name slug")
          .populate("country", "name slug")
          .lean();


        console.log("[DONE]" + aiSection.title);
        return res.json({
          status: true,
          data: data,
          title: aiSection.title, // Tiêu đề AI đặt (VD: "Phim Hành Động Mãn Nhãn 2024")
          is_infinite: true,
        });
      }

      // ---------------------------------------------------------
      // CASE 2: STATIC LAZY LOAD (Tải lẻ các mục cố định như Top 10, Phim lẻ...)
      // ---------------------------------------------------------
      if (pageKey) {
        const config = ALL_SECTIONS_CONFIG.find((c) => c.queryKey === pageKey);

        // Lấy dữ liệu phim
        const dataResult = await this._fetchSectionData(pageKey);

        // (Optional) Gọi AI đặt tên lại cho hay hơn, hoặc dùng tên gốc
        // Ở đây dùng tên gốc cho nhanh, hoặc bạn có thể dùng generateCatchyTitle nếu muốn
        return res.json({
          status: true,
          data: dataResult.data,
          title: config?.title || "Phim Hay",
        });
      }

      // ---------------------------------------------------------
      // CASE 3: INITIAL LOAD (Lần đầu vào trang - Tải Slider + Preload Sections)
      // ---------------------------------------------------------

      // A. Lấy Slider
      const sliderTask = Movie.find({
        title_logo: { $ne: "" },
        ...VALID_IMAGE_CONSTRAINT,
      })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate("category", "name slug")
        .populate("country", "name slug")
        .lean();

      // B. Lấy các Section cố định (Preload)
      const sectionTasks = PRELOAD_KEYS.map(async (key) => {
        const config = ALL_SECTIONS_CONFIG.find((c) => c.queryKey === key);
        if (!config) return null;

        // Có thể thêm logic AI đặt tên ở đây nếu muốn (như phiên bản trước)
        // Hiện tại giữ đơn giản để load nhanh
        const dbResult = await this._fetchSectionData(key);

        return {
          ...config,
          title: config.title,
          data: dbResult.data || [],
        };
      });

      const [slider, ...sectionsRaw] = await Promise.all([
        sliderTask,
        ...sectionTasks,
      ]);
      const sliderWithPlayUrls = await this._attachFirstPlayUrls(slider);

      const validSections = sectionsRaw.filter(
        (s: any) => s && s.data.length > 0
      );
      const loadedSlugs = validSections.map((s: any) => s.slug);
      const remaining = ALL_SECTIONS_CONFIG.filter(
        (s) => !loadedSlugs.includes(s.slug)
      );

      res.json({
        status: true,
        data: {
          slider: sliderWithPlayUrls,
          sections: validSections,
          remainingSectionsConfig: remaining,
        },
      });
    } catch (e) {
      console.error(e);
      res.json({ status: false, message: "Lỗi tải trang chủ" });
    }
  };

  // =========================================================================
  //  4. API LỊCH CHIẾU (Local DB + Optional External Fallback)
  // =========================================================================

  private static normalizeScheduleDate(date: unknown): string | null {
    if (typeof date !== "string") return null;
    const value = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [day, month, year] = value.split("-");
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  private static toLegacyScheduleDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
  }

  private static normalizeEpisodeLabel(value: unknown): string {
    const label = String(value || "").trim();
    if (!label) return "";
    return label.replace(/^tập\s*/i, "").trim();
  }

  private static toImagePath(path?: string) {
    if (!path) return "/images/placeholder-poster.svg";
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `/${path.replace(/^\/+/, "")}`;
  }

  private static async buildLegacyScheduleResponse(scheduleItems: any[]) {
    const slugs = Array.from(new Set(scheduleItems.map((item) => item.movie_slug).filter(Boolean)));
    const localMovies = await Movie.find({ slug: { $in: slugs } })
      .select("slug name thumb_url poster_url episode_current quality")
      .lean();
    const localMovieMap = new Map(localMovies.map((movie: any) => [movie.slug, movie]));

    return scheduleItems.map((item: any) => {
      const localMovie = localMovieMap.get(item.movie_slug);
      const movie = {
        id: item.movie_id || item.movie_snapshot?.id || item.source_id || item._id,
        title: item.movie_name,
        name: item.movie_name,
        slug: item.movie_slug,
        quality: item.quality || item.movie_snapshot?.quality || localMovie?.quality || "",
        thumbnail: this.toImagePath(item.thumbnail || item.movie_snapshot?.thumbnail || localMovie?.thumb_url),
        poster: this.toImagePath(item.poster || item.movie_snapshot?.poster || localMovie?.poster_url),
        images: {
          posters: [
            {
              path: this.toImagePath(item.poster || item.thumbnail || item.movie_snapshot?.poster || item.movie_snapshot?.thumbnail || localMovie?.poster_url || localMovie?.thumb_url),
            },
          ],
        },
      };

      return {
        _id: String(item._id),
        id: String(item._id),
        air_time: item.show_time || "",
        episode: item.episode,
        episode_number: item.episode_number || this.normalizeEpisodeLabel(item.episode),
        show_date: item.show_date,
        show_time: item.show_time || null,
        is_exist: !!localMovie,
        local_data: localMovie || null,
        movie,
        api_poster_url: movie.images.posters[0].path,
        source: item.source || "local",
      };
    });
  }

  private static async buildShowtimesResponse(scheduleItems: any[]) {
    return scheduleItems.map((item: any) => ({
      id: String(item._id),
      episode: item.episode,
      show_date: item.show_date,
      show_time: item.show_time || null,
      movie: {
        id: item.movie_id ? String(item.movie_id) : item.movie_snapshot?.id || item.source_id || String(item._id),
        name: item.movie_name,
        slug: item.movie_slug,
        thumbnail: this.toImagePath(item.thumbnail || item.movie_snapshot?.thumbnail),
        poster: this.toImagePath(item.poster || item.movie_snapshot?.poster),
        quality: item.quality || item.movie_snapshot?.quality || "",
      },
    }));
  }

  private static async getLocalScheduleByDate(date: string) {
    const schedules = await ScheduledEpisode.find({ show_date: date, is_active: true })
      .sort({ show_time: 1, createdAt: -1 })
      .lean();

    if (schedules.length > 0) return schedules;

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const episodes = await Episode.find({ air_date: { $gte: start, $lte: end } })
      .populate("movie_id", "slug name thumb_url poster_url episode_current quality")
      .sort({ air_date: 1, episode: 1 })
      .lean();

    return episodes
      .map((episode: any) => {
        const movie = episode.movie_id;
        if (!movie?.slug) return null;
        return {
          _id: episode._id,
          movie_id: movie._id,
          movie_slug: movie.slug,
          movie_name: movie.name || episode.name,
          episode: episode.name || `Tập ${episode.episode}`,
          episode_number: String(episode.episode || ""),
          show_date: date,
          show_time: episode.air_date
            ? new Date(episode.air_date).toISOString().slice(11, 16)
            : null,
          thumbnail: episode.thumbnail || movie.thumb_url || "",
          poster: movie.poster_url || episode.thumbnail || "",
          quality: movie.quality || "",
          source: "episode_air_date",
          source_id: String(episode._id),
          is_active: true,
        };
      })
      .filter(Boolean);
  }

  private static async fetchExternalSchedule(date: string) {
    const baseURL = (process.env.SCHEDULE_API_BASE_URL || "").replace(/\/$/, "");
    if (!baseURL) return [];

    const pathTemplate = process.env.SCHEDULE_API_PATH || "/showtimes/by-date/:date";
    const externalDate = process.env.SCHEDULE_API_DATE_FORMAT === "DD-MM-YYYY"
      ? this.toLegacyScheduleDate(date)
      : date;
    const urlPath = pathTemplate.replace(":date", encodeURIComponent(externalDate));

    const response = await axios.get(`${baseURL}${urlPath}`, {
      withCredentials: false,
      httpsAgent: scheduleHttpsAgent,
      timeout: Number(process.env.SCHEDULE_API_TIMEOUT_MS || 8000),
    });

    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  }

  private static normalizeExternalSchedule(rawItems: any[], date: string) {
    return rawItems.map((item) => {
      const movie = item.movie || item.local_data || {};
      const slug = movie.slug || item.movie_slug || item.slug || "";
      const name = movie.name || movie.title || item.movie_name || item.name || "";
      const episode = item.episode || item.episode_name || `Tập ${item.episode_number || ""}`.trim();

      return {
        _id: item._id || item.id || `${slug}-${episode}-${date}`,
        movie_id: item.movie_id || movie.id || item.source_id || "",
        movie_slug: slug,
        movie_name: name,
        episode,
        episode_number: item.episode_number || this.normalizeEpisodeLabel(episode),
        show_date: this.normalizeScheduleDate(item.show_date) || date,
        show_time: item.show_time || item.air_time || null,
        thumbnail: item.thumbnail || movie.thumbnail || movie.thumb_url || movie.images?.posters?.[0]?.path || "",
        poster: item.poster || movie.poster || movie.poster_url || movie.images?.posters?.[0]?.path || "",
        quality: item.quality || movie.quality || "",
        source: item.source || "external",
        source_id: String(item.id || item._id || ""),
        is_active: true,
        movie_snapshot: {
          id: String(movie.id || item.movie_id || ""),
          name,
          slug,
          thumbnail: item.thumbnail || movie.thumbnail || movie.thumb_url || "",
          poster: item.poster || movie.poster || movie.poster_url || "",
          quality: item.quality || movie.quality || "",
        },
      };
    }).filter((item) => item.movie_slug && item.movie_name && item.episode);
  }

  static getScheduledMovies = async (req: Request, res: Response) => {
    const date = this.normalizeScheduleDate(req.query.date);
    if (!date) return res.status(400).json({ status: false, message: "Missing or invalid date" });

    try {
      const localItems = await this.getLocalScheduleByDate(date);
      if (localItems.length > 0 || process.env.SCHEDULE_DISABLE_EXTERNAL_FALLBACK === "true") {
        const data = await this.buildLegacyScheduleResponse(localItems);
        return res.json({ status: true, data, source: localItems.length > 0 ? "local" : "empty", message: "Lấy lịch chiếu thành công" });
      }

      const externalItems = this.normalizeExternalSchedule(await this.fetchExternalSchedule(date), date);
      const data = await this.buildLegacyScheduleResponse(externalItems);
      return res.json({ status: true, data, source: externalItems.length > 0 ? "external" : "empty", message: "Lấy lịch chiếu thành công" });
    } catch (error: any) {
      console.error("[MovieService] Scheduled API ERROR:", error?.response?.data || error.message);
      res.status(500).json({ status: false, message: "Lỗi server khi lấy lịch chiếu" });
    }
  };

  static getShowtimesByDate = async (req: Request, res: Response) => {
    const date = this.normalizeScheduleDate(req.params.date || req.query.date);
    if (!date) return res.status(400).json({ status: false, message: "Missing or invalid date" });

    try {
      const localItems = await this.getLocalScheduleByDate(date);
      const scheduleItems = localItems.length > 0 || process.env.SCHEDULE_DISABLE_EXTERNAL_FALLBACK === "true"
        ? localItems
        : this.normalizeExternalSchedule(await this.fetchExternalSchedule(date), date);
      const data = await this.buildShowtimesResponse(scheduleItems);
      return res.json(data);
    } catch (error: any) {
      console.error("[MovieService] Showtimes API ERROR:", error.message);
      res.status(500).json({ status: false, message: "Lỗi server khi lấy lịch chiếu" });
    }
  };
}

export default HomeController;
