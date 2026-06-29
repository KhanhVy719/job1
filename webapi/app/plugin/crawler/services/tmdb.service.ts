import Movie from "../../../model/Movie";
import Season from "../../../model/Season";
import Category from "../../../model/Category";
import Country from "../../../model/Country";
import Actor from "../../../model/Actor";
import Studio from "../../../model/Studio";
import { axiosInstance, getApiKey } from "../api";
import { IMAGES, STATE_FILES } from "../config";
import { generateSlug, sleep, saveState, loadState } from "../utils";

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

  // --- Các hàm ensure helper (Categories, Countries, Actors, Studios) giữ nguyên ---
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
    for (const item of items.slice(0, 15)) {
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
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc) ids.push(doc._id);
    }
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

  // --- HÀM CORE MỚI: Xử lý import 1 phim dựa trên TMDB ID ---
  // Hàm này trả về Movie Document (nếu thành công) hoặc null
  public static async handleMovieImport(tmdbId: string | number, type: string) {
    try {
      console.log(`[TMDB Import] Processing ID: ${tmdbId} (${type})`);

      // 1. Fetch Data
      const [detailRes, creditsRes, imagesRes] = await Promise.all([
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${getApiKey()}&language=vi-VN&append_to_response=videos,external_ids,release_dates,content_ratings`
        ),
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}/credits?api_key=${getApiKey()}&language=vi-VN`
        ),
        axiosInstance.get(
          `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${getApiKey()}`
        ),
      ]);

      const detail = detailRes.data;
      const images = imagesRes.data;

      // 2. Process Basic Info
      const trailer_urls =
        detail.videos?.results
          ?.filter((v: any) => v.site === "YouTube" && v.type === "Trailer")
          .map((t: any) => `https://www.youtube.com/watch?v=${t.key}`) || [];

      const backdrops = (images.backdrops || [])
        .slice(0, 10)
        .map((img: any) => IMAGES.BASE_URL + img.file_path)
        .filter((url: string) => !!url);

      const logos = images.logos || [];
      const bestLogoPath = (
        logos.find((l: any) => l.iso_639_1 === "en") || logos[0]
      )?.file_path;
      const title_logo = bestLogoPath ? IMAGES.BASE_URL + bestLogoPath : "";

      let episode_total = "???";
      let timeStr = "";

      if (type === "movie") {
        episode_total = "1";
        timeStr = detail.runtime ? detail.runtime : 0;
      } else {
        if (detail.number_of_episodes)
          episode_total = `${detail.number_of_episodes}`;
        if (detail.episode_run_time && detail.episode_run_time.length > 0)
          timeStr = detail.episode_run_time[0];
      }

      const studioIds = await this.ensureStudios(
        type === "movie"
          ? detail.production_companies
          : detail.networks || detail.production_companies
      );
      const categoryIds = await this.ensureCategories(detail.genres || []);
      const countryIds = await this.ensureCountries(
        detail.production_countries || []
      );
      const actorIds = await this.ensureActors(creditsRes.data.cast || []);

      // 4. Handle Slug & Info
      const name = detail.title || detail.name || "Unknown";
      let slug = generateSlug(name);
      const year =
        detail.release_date || detail.first_air_date
          ? new Date(detail.release_date || detail.first_air_date).getFullYear()
          : 0;

      const movieCheckSlug = await Movie.findOne({ slug }).select("tmdb.id");
      if (movieCheckSlug) {
        if (movieCheckSlug.tmdb?.id === tmdbId.toString()) {
          // Update existing
        } else {
          slug = `${slug}-${year}-${tmdbId}`;
        }
      }

      const moviePayload: any = {
        name,
        origin_name: detail.original_title || detail.original_name || "",
        slug,
        content: detail.overview,
        type,
        status: detail.status,
        thumb_url: detail.backdrop_path
          ? IMAGES.BASE_URL + detail.backdrop_path
          : "",
        poster_url: detail.poster_path
          ? IMAGES.BASE_URL + detail.poster_path
          : "",
        title_logo: title_logo,
        time: timeStr,
        quality: "HD",
        studio: studioIds,
        category: categoryIds,
        country: countryIds,
        actor: actorIds,
        content_rating: this.extractContentRating(detail, type),
        tmdb: {
          id: tmdbId.toString(),
          type,
          vote_average: detail.vote_average,
          vote_count: detail.vote_count,
          total_seasons: detail.number_of_seasons || 1,
        },
        year,
        trailer_url: trailer_urls,
        backdrops: backdrops,
        episode_total: episode_total,
      };

      // IMDB id (từ TMDB external_ids) — chỉ lưu id để link sang imdb.com,
      // không lấy điểm IMDB (cần API riêng như OMDb, đã bỏ).
      const imdbId = detail.external_ids?.imdb_id;
      if (imdbId) moviePayload.imdb = { id: imdbId };

      // 5. Save Movie
      const movieDoc = await Movie.findOneAndUpdate(
        { "tmdb.id": tmdbId.toString() },
        moviePayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (type === "movie" && movieDoc.episode_current === "0") {
        await Movie.updateOne(
          { _id: movieDoc._id },
          { episode_current: "Full" }
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
            overview: detail.overview,
            episode_count: 1,
            poster_path: detail.poster_path
              ? IMAGES.BASE_URL + detail.poster_path
              : "",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (sDoc) seasonIds.push(sDoc._id);
      } else {
        if (detail.seasons && Array.isArray(detail.seasons)) {
          for (const s of detail.seasons) {
            if (s.season_number === 0 && s.episode_count === 0) continue;
            const seasonSlug = `phan-${s.season_number}`;
            const sDoc = await Season.findOneAndUpdate(
              { movie_id: movieDoc._id, season_number: s.season_number },
              {
                movie_id: movieDoc._id,
                season_number: s.season_number,
                name: s.name,
                slug: seasonSlug,
                overview: s.overview,
                episode_count: s.episode_count,
                poster_path: s.poster_path
                  ? IMAGES.BASE_URL + s.poster_path
                  : "",
                air_date: s.air_date,
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            if (sDoc) seasonIds.push(sDoc._id);
          }
        }
      }

      if (seasonIds.length > 0) {
        await Movie.updateOne(
          { _id: movieDoc._id },
          { $set: { seasons: seasonIds } }
        );
      }

      // Trả về phim đã cập nhật để dùng tiếp
      return await Movie.findById(movieDoc._id).populate("seasons");
    } catch (err: any) {
      console.error(`[TMDB Import Error] ID ${tmdbId}: ${err.message}`);
      return null;
    }
  }

  // Hàm processPage giờ sẽ gọi handleMovieImport để tránh lặp code
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

        // Check đơn giản để tránh spam API với phim đã hoàn thành
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

        // Gọi hàm xử lý chung
        const result = await this.handleMovieImport(tmdbId, type);
        if (result) countSuccess++;

        await sleep(50);
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
        await sleep(1000);
      } else {
        console.log(">> FINISHED ALL MOVIE PAGES. RESTARTING...");
        saveState(STATE_FILES.MOVIE, { page: 1 });
        await sleep(60000);
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
        await sleep(1000);
      } else {
        console.log(">> FINISHED ALL TV PAGES. RESTARTING...");
        saveState(STATE_FILES.TV, { page: 1 });
        await sleep(1000);
      }
    }
  }
}

export default TmdbService;
