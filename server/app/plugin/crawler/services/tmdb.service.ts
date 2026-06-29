import Movie from "../../../model/Movie";
import Season from "../../../model/Season";
import Category from "../../../model/Category";
import Country from "../../../model/Country";
import Actor from "../../../model/Actor";
import Studio from "../../../model/Studio";
import Episode from "../../../model/Episode";
import { axiosInstance, getApiKey } from "../api";
import { IMAGES, STATE_FILES } from "../config";
import { generateSlug, sleep, saveState, loadState, buildVidSrcEmbed } from "../utils";
import { withTransaction } from "../../../../utils/withTransaction";

class TmdbService {
  public static async getEpisodeThumbnail(
    tmdbId: string | number,
    type: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<string> {
    try {
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/images?api_key=${getApiKey()}`;
      const { data } = await axiosInstance.get(url);

      if (data.stills && data.stills.length > 0) {
        const bestStill = data.stills.reduce((prev: any, current: any) => {
          return prev.vote_average > current.vote_average ? prev : current;
        });
        return `https://image.tmdb.org/t/p/original${bestStill.file_path}`;
      }
    } catch (error) {
      // Ignore
    }
    return "";
  }

  public static async fetchTmdbSeasonMetadata(
    tmdbId: string | number,
    type: string,
    seasonNumber: number
  ) {
    try {
      const apiKey = getApiKey();
      const [resVi, resEn] = await Promise.all([
        axiosInstance
          .get(
            `https://api.themoviedb.org/3/${type}/${tmdbId}/season/${seasonNumber}`,
            { params: { api_key: apiKey, language: "vi-VN" } }
          )
          .catch(() => null),
        axiosInstance
          .get(
            `https://api.themoviedb.org/3/${type}/${tmdbId}/season/${seasonNumber}`,
            { params: { api_key: apiKey, language: "en-US" } }
          )
          .catch(() => null),
      ]);

      const episodesVi = resVi?.data?.episodes || [];
      const episodesEn = resEn?.data?.episodes || [];
      const meta: Record<number, any> = {};

      episodesEn.forEach((ep: any) => {
        meta[ep.episode_number] = {
          name: ep.name,
          overview: ep.overview || "",
          runtime: ep.runtime || 0,
          still_path: ep.still_path,
        };
      });

      episodesVi.forEach((ep: any) => {
        if (!meta[ep.episode_number]) meta[ep.episode_number] = {};
        if (ep.name) meta[ep.episode_number].name = ep.name;
        if (ep.overview && ep.overview.trim() !== "")
          meta[ep.episode_number].overview = ep.overview;
        if (ep.runtime) meta[ep.episode_number].runtime = ep.runtime;
        if (ep.still_path) meta[ep.episode_number].still_path = ep.still_path;
      });

      return meta;
    } catch (error) {
      console.error(
        `[TMDB] Error fetching season ${seasonNumber} for TV ${tmdbId}:`,
        error
      );
      return {};
    }
  }

  public static async ensureCategories(items: any[]): Promise<any[]> {
    const ids: any[] = [];
    if (!items) return ids;
    for (const item of items) {
      const slug = generateSlug(item.name);
      const doc = await Category.findOneAndUpdate(
        { slug },
        { name: item.name, slug },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc) ids.push(doc._id);
    }
    return ids;
  }

  public static async ensureCountries(items: any[]): Promise<any[]> {
    const ids: any[] = [];
    if (!items) return ids;
    for (const item of items) {
      if (!item.iso_3166_1) continue;
      const doc = await Country.findOneAndUpdate(
        { code: item.iso_3166_1 },
        {
          code: item.iso_3166_1,
          name: item.native_name || item.name,
          slug: generateSlug(item.native_name || item.name),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc) ids.push(doc._id);
    }
    return ids;
  }

  public static async ensureActors(items: any[]): Promise<any[]> {
    const ids: any[] = [];
    if (!items) return ids;

    // Giới hạn 15 diễn viên đầu tiên và map sang Promise để lấy chi tiết
    const actorPromises = items.slice(0, 15).map(async (item) => {
      try {
        const detailUrl = `https://api.themoviedb.org/3/person/${item.id}?api_key=${getApiKey()}&language=vi-VN`;
        const detailRes = await axiosInstance.get(detailUrl);
        const detail = detailRes.data;

        const doc = await Actor.findOneAndUpdate(
          { tmdb_id: item.id },
          {
            tmdb_id: item.id,
            name: item.name,
            slug: generateSlug(item.name) + "-" + item.id,
            avatar: item.profile_path
              ? IMAGES.AVATAR_URL + item.profile_path
              : "",
            gender:
              item.gender === 2 ? "Nam" : item.gender === 1 ? "Nữ" : "Unknown",
            // FIX: Thêm biography, birthday, và aka từ detail
            biography: detail.biography || "",
            // birthday từ TMDB là chuỗi "YYYY-MM-DD" -> ép sang Date (null nếu trống/không hợp lệ)
            birthday: detail.birthday ? new Date(detail.birthday) : null,
            aka: detail.also_known_as || [],
            place_of_birth: detail.place_of_birth || "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return doc ? doc._id : null;
      } catch (e) {
        console.error(`[TMDB] Error fetching actor detail for ID ${item.id}:`, e);
        return null;
      }
    });

    // Chờ tất cả các promises hoàn thành và lọc ra các ID không null
    const results = await Promise.all(actorPromises);
    results.forEach(id => {
        if (id) ids.push(id);
    });

    return ids;
  }

  public static async ensureStudios(items: any[]): Promise<any[]> {
    const ids: any[] = [];
    if (!items) return ids;
    for (const item of items.filter((i: any) => i.name)) {
      const doc = await Studio.findOneAndUpdate(
        { tmdb_id: item.id.toString() },
        {
          tmdb_id: item.id.toString(),
          name: item.name,
          slug: generateSlug(item.name),
          logo_url: item.logo_path ? IMAGES.LOGO_URL + item.logo_path : "",
          origin_country: item.origin_country || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc) ids.push(doc._id);
    }
    return ids;
  }

  private static extractContentRating(detail: any, type: string): string {
    let rating = "";
    if (type === "movie") {
      const releases = detail.release_dates?.results || [];
      let target =
        releases.find((x: any) => x.iso_3166_1 === "VN") ||
        releases.find((x: any) => x.iso_3166_1 === "US");
      if (target)
        rating =
          target.release_dates?.find((x: any) => x.certification !== "")
            ?.certification || "";
    } else {
      const ratings = detail.content_ratings?.results || [];
      let target =
        ratings.find((x: any) => x.iso_3166_1 === "VN") ||
        ratings.find((x: any) => x.iso_3166_1 === "US");
      if (target) rating = target.rating || "";
    }
    const r = rating.toUpperCase();
    const map: any = {
      C18: "T18",
      "18+": "T18",
      R: "T16",
      "TV-MA": "T18",
      "NC-16": "T16",
      "PG-13": "T13",
    };
    return map[r] || "T13";
  }

  public static async handleMovieImport(tmdbId: string | number, type: string) {
    try {
      console.log(`[TMDB Import] Processing ID: ${tmdbId} (${type})`);

      // 1. Fetch Data
      const [detailResVi, detailResEn, creditsRes, imagesRes] = await Promise.all([
        // Lấy thông tin chi tiết bằng tiếng Việt (vi-VN)
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${getApiKey()}&language=vi-VN&append_to_response=videos,external_ids,release_dates,content_ratings`
        ),
        // Lấy thông tin chi tiết bằng tiếng Anh (en-US) để fallback cho overview/content
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${getApiKey()}&language=en-US`
        ),
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}/credits?api_key=${getApiKey()}&language=vi-VN`
        ),
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${getApiKey()}`
        ),
      ]);

      const detailVi = detailResVi.data;
      const detailEn = detailResEn.data;
      const images = imagesRes.data;

      // 2. Process Basic Info
      const trailer_urls =
        detailVi.videos?.results
          ?.filter((v: any) => v.site === "YouTube" && v.type === "Trailer")
          .map((t: any) => `https://www.youtube.com/watch?v=${t.key}`) || [];

      const backdrops = (images.backdrops || [])
        .slice(0, 10)
        .map((img: any) => IMAGES.BASE_URL + img.file_path)
        .filter((url: string) => !!url);

      const logos = images.logos || [];
      
      // FIX: Cải thiện logic lấy title_logo
      let bestLogoPath = (
        logos.find((l: any) => l.iso_639_1 === "en") || // Ưu tiên logo tiếng Anh
        logos.find((l: any) => !l.iso_639_1) || // Tiếp theo là logo không có ngôn ngữ
        logos[0] // Cuối cùng là logo đầu tiên
      )?.file_path;
      
      const title_logo = bestLogoPath ? IMAGES.BASE_URL + bestLogoPath : "";

      let episode_total = "???";
      let timeStr = "";

      if (type === "movie") {
        episode_total = "1";
        timeStr = detailVi.runtime ? detailVi.runtime : 0;
      } else {
        if (detailVi.number_of_episodes)
          episode_total = `${detailVi.number_of_episodes}`;
        if (detailVi.episode_run_time && detailVi.episode_run_time.length > 0)
          timeStr = detailVi.episode_run_time[0];
      }

      const studioIds = await this.ensureStudios(
        type === "movie"
          ? detailVi.production_companies
          : detailVi.networks || detailVi.production_companies
      );
      const categoryIds = await this.ensureCategories(detailVi.genres || []);
      const countryIds = await this.ensureCountries(
        detailVi.production_countries || []
      );
      // Đã sửa ensureActors ở trên để lấy thêm biography, aka, birthday
      const actorIds = await this.ensureActors(creditsRes.data.cast || []);

      // FIX: Cải thiện logic lấy content. Ưu tiên tiếng Việt, nếu trống thì dùng tiếng Anh
      const content = 
        detailVi.overview && detailVi.overview.trim() !== ""
          ? detailVi.overview
          : detailEn.overview || "";

      // 4. Handle Slug & Info
      const name = detailVi.title || detailVi.name || "Unknown";
      let slug = generateSlug(name);
      const year =
        detailVi.release_date || detailVi.first_air_date
          ? new Date(detailVi.release_date || detailVi.first_air_date).getFullYear()
          : 0;

      // Logic xử lý slug: Nếu là TV series, luôn thêm tmdbId vào slug để ưu tiên tránh trùng lặp
      if (type !== "movie") {
        slug = `${slug}-${tmdbId}`;
      } else {
        const movieCheckSlug = await Movie.findOne({ slug }).select("tmdb.id");
        if (movieCheckSlug) {
          if (movieCheckSlug.tmdb?.id !== tmdbId.toString()) {
            // Nếu slug đã tồn tại và không phải của chính nó, thêm year và tmdbId
            slug = `${slug}-${year}-${tmdbId}`;
          }
        }
      }

      const moviePayload: any = {
        name,
        origin_name: detailVi.original_title || detailVi.original_name || "",
        slug,
        content: content, // Đã sửa: Sử dụng content đã được fallback
        type,
        status: detailVi.status,
        thumb_url: detailVi.backdrop_path
          ? IMAGES.BASE_URL + detailVi.backdrop_path
          : "",
        poster_url: detailVi.poster_path
          ? IMAGES.BASE_URL + detailVi.poster_path
          : "",
        title_logo: title_logo, // Đã sửa: Sử dụng title_logo cải tiến
        time: timeStr,
        quality: "HD",
        studio: studioIds,
        category: categoryIds,
        country: countryIds,
        actor: actorIds,
        content_rating: this.extractContentRating(detailVi, type),
        tmdb: {
          id: tmdbId.toString(),
          type,
          vote_average: detailVi.vote_average,
          vote_count: detailVi.vote_count,
          total_seasons: detailVi.number_of_seasons || 1,
        },
        year,
        trailer_url: trailer_urls,
        backdrops: backdrops,
episode_total: episode_total,
};

      // IMDB id (từ TMDB external_ids) — chỉ lưu id để link sang imdb.com,
      // không lấy điểm IMDB (cần API riêng như OMDb, đã bỏ).
      const imdbId = detailVi.external_ids?.imdb_id;
      if (imdbId) moviePayload.imdb = { id: imdbId };

// PRE-FETCH metadata từng season (TÊN/THUMBNAIL tập) TRƯỚC transaction.
// Mỗi season 1 HTTP call (bounded) — KHÔNG gọi mạng bên trong transaction.
const seasonMetaMap: Record<number, Record<number, any>> = {};
if (type !== "movie" && Array.isArray(detailVi.seasons)) {
for (const s of detailVi.seasons) {
  if (s.season_number === 0) continue;
  const meta = await this.fetchTmdbSeasonMetadata(
    tmdbId,
    type,
    s.season_number
  );
  seasonMetaMap[s.season_number] = meta || {};
}
}

// Thumbnail dự phòng cấp phim (backdrop > poster)
const movieFallbackThumb = detailVi.backdrop_path
? IMAGES.BASE_URL + detailVi.backdrop_path
: detailVi.poster_path
? IMAGES.BASE_URL + detailVi.poster_path
: "";

// 5 + 6 + 7. Lưu Movie + Season + Episode trong CÙNG MỘT transaction để tránh
// lệch quan hệ 2 chiều (Movie.seasons[] ↔ Season.movie_id ↔ Episode.season_id).
// Toàn bộ HTTP/TMDB fetch đã xong ở trên — trong block này chỉ còn DB write.
const movieId = await withTransaction(async (session) => {
  // 5. Save Movie
  const movieDoc = await Movie.findOneAndUpdate(
    { "tmdb.id": tmdbId.toString() },
    moviePayload,
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );

  if (type === "movie" && movieDoc.episode_current === "0") {
    await Movie.updateOne(
      { _id: movieDoc._id },
      { episode_current: "Full" },
      { session }
    );
  }

  // 6. Handle Seasons
  const seasonIds: any[] = [];

  if (type === "movie") {
    const seasonSlug = "phan-1";
    const sDoc = await Season.findOneAndUpdate(
      { movie_id: movieDoc._id, season_number: 1 },
      {
        movie_id: movieDoc._id,
        season_number: 1,
        name: "Phim Lẻ",
        slug: seasonSlug,
        overview: detailVi.overview,
        episode_count: 1,
        poster_path: detailVi.poster_path
          ? IMAGES.BASE_URL + detailVi.poster_path
          : "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );
    if (sDoc) {
      seasonIds.push(sDoc._id);

      // 7. Phim lẻ: 1 tập "Full", nguồn xem = embed VidSrc (movie)
      const epDoc = await Episode.findOneAndUpdate(
        { season_id: sDoc._id, episode: 1 },
        {
          $set: {
            movie_id: movieDoc._id,
            season_id: sDoc._id,
            episode: 1,
            types: ["phude"],
            name: "Full",
            slug: "tap-full",
            embed_url: buildVidSrcEmbed(tmdbId, "movie"),
            thumbnail: movieFallbackThumb,
            description: detailVi.overview || "",
            duration: Number(timeStr) || 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      if (epDoc) {
        await Season.updateOne(
          { _id: sDoc._id },
          { $set: { episodes: [epDoc._id] } },
          { session }
        );
      }
    }
  } else {
    if (detailVi.seasons && Array.isArray(detailVi.seasons)) {
      for (const s of detailVi.seasons) {
        // Bỏ qua Season 0
        if (s.season_number === 0) continue;

        // Tự đặt tên phần tăng dần: "Phần 1", "Phần 2", ...
        const seasonName = `Phần ${s.season_number}`;
        const seasonSlug = `phan-${s.season_number}`;

        const sDoc = await Season.findOneAndUpdate(
          { movie_id: movieDoc._id, season_number: s.season_number },
          {
            movie_id: movieDoc._id,
            season_number: s.season_number,
            name: seasonName, // Đã sửa: Sử dụng tên tự động
            slug: seasonSlug,
            overview: s.overview,
            episode_count: s.episode_count,
            poster_path: s.poster_path
              ? IMAGES.BASE_URL + s.poster_path
              : "",
            air_date: s.air_date,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );
        if (!sDoc) continue;
        seasonIds.push(sDoc._id);

        // 7. Phim bộ: tạo N tập theo episode_count, mỗi tập 1 embed VidSrc (tv)
        const epCount = Number(s.episode_count) || 0;
        const meta = seasonMetaMap[s.season_number] || {};
        const epIds: any[] = [];
        for (let n = 1; n <= epCount; n++) {
          const mInfo = meta[n] || {};
          const epThumb = mInfo.still_path
            ? `https://image.tmdb.org/t/p/original${mInfo.still_path}`
            : movieFallbackThumb;
          const epDoc = await Episode.findOneAndUpdate(
            { season_id: sDoc._id, episode: n },
            {
              $set: {
                movie_id: movieDoc._id,
                season_id: sDoc._id,
                episode: n,
                types: ["phude"],
                name: mInfo.name || `Tập ${n}`,
                slug: `tap-${n}`,
                embed_url: buildVidSrcEmbed(tmdbId, "tv", s.season_number, n),
                thumbnail: epThumb,
                description: mInfo.overview || "",
                duration: mInfo.runtime || 0,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true, session }
          );
          if (epDoc) epIds.push(epDoc._id);
        }
        if (epIds.length > 0) {
          await Season.updateOne(
            { _id: sDoc._id },
            { $set: { episodes: epIds } },
            { session }
          );
        }
      }
    }
  }

  if (seasonIds.length > 0) {
    await Movie.updateOne(
      { _id: movieDoc._id },
      { $set: { seasons: seasonIds } },
      { session }
    );
  }

  return movieDoc._id;
});

return await Movie.findById(movieId).populate("seasons");
    } catch (err: any) {
      console.error(`[TMDB Import Error] ID ${tmdbId}: ${err.message}`);
      return null;
    }
  }

  private static async processPage(type: string, page: number) {
    try {
      console.log(`\n--- CRAWLING PAGE ${page} (${type.toUpperCase()}) ---`);
      const { data: listData } = await axiosInstance.get(
        `https://api.themoviedb.org/3/discover/${type}?api_key=${getApiKey()}&language=vi-VN&page=${page}&sort_by=popularity.desc`
      );

      if (!listData.results?.length) return;

      let countSuccess = 0;
      for (const item of listData.results) {
        const tmdbId = item.id;

        const existingMovie = await Movie.findOne({
          "tmdb.id": tmdbId.toString(),
        }).select("episode_current");

        if (
          existingMovie &&
          type === "movie" &&
          existingMovie.episode_current === "Full"
        ) {
          continue;
        }

        const result = await this.handleMovieImport(tmdbId, type);
        if (result) countSuccess++;

      }
      console.log(`>> Page ${page} Done. Imported: ${countSuccess}`);
    } catch (e: any) {
      console.error(e.message);
    }
  }

  public static async runMovie() {
    console.log("=== START: CRAWL MOVIES LOOP (STATE: MOVIE) ===");
    while (true) {
      let state = loadState(STATE_FILES.MOVIE);
      let currentPage = state.page || 1;
      console.log(`\n>> RESUMING MOVIE - Page ${currentPage}`);

      let totalPages = 500;
      try {
        const { data } = await axiosInstance.get(
          `https://api.themoviedb.org/3/discover/movie?api_key=${getApiKey()}&language=vi-VN&page=1`
        );
        totalPages = data.total_pages;
      } catch (e) {
        console.error("Err getting total pages");
      }

      if (currentPage <= totalPages) {
        await this.processPage("movie", currentPage);
        saveState(STATE_FILES.MOVIE, { page: currentPage + 1 });
      } else {
        console.log(">> FINISHED ALL MOVIE PAGES. RESTARTING...");
        saveState(STATE_FILES.MOVIE, { page: 1 });
      }
    }
  }

  public static async runTv() {
    console.log("=== START: CRAWL TV LOOP (STATE: TV) ===");
    while (true) {
      let state = loadState(STATE_FILES.TV);
      let currentPage = state.page || 1;
      console.log(`\n>> RESUMING TV - Page ${currentPage}`);

      let totalPages = 500;
      try {
        const { data } = await axiosInstance.get(
          `https://api.themoviedb.org/3/discover/tv?api_key=${getApiKey()}&language=vi-VN&page=1`
        );
        totalPages = data.total_pages;
      } catch (e) {
        console.error("Err getting total pages");
      }

      if (currentPage <= totalPages) {
        await this.processPage("tv", currentPage);
        saveState(STATE_FILES.TV, { page: currentPage + 1 });
      } else {
        console.log(">> FINISHED ALL TV PAGES. RESTARTING...");
        saveState(STATE_FILES.TV, { page: 1 });
      }
    }
  }
}

export default TmdbService;