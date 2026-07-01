import { Request } from "express";
import axios from "axios";
import https from "https";
import Movie from "../model/Movie";
import { TMDB_API_KEYS } from "../plugin/crawler/config";

export type ViewerLanguageCode = "en" | "fil";

interface MovieTranslation {
  name?: string;
  content?: string;
}

const SUPPORTED_LANGUAGES = new Set<ViewerLanguageCode>(["en", "fil"]);
const COOKIE_KEY = "viewer_language";

const tmdbHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
  keepAlive: true,
  maxSockets: Number(process.env.TMDB_TRANSLATION_MAX_SOCKETS) || 16,
  maxFreeSockets: 8,
});

const envTmdbKeys = (process.env.TMDB_API_KEYS || process.env.TMDB_API_KEY || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

const tmdbKeys = [...envTmdbKeys, ...TMDB_API_KEYS].filter(Boolean);
let tmdbKeyIndex = 0;

const getTmdbApiKey = () => {
  if (tmdbKeys.length === 0) return "";
  const key = tmdbKeys[tmdbKeyIndex % tmdbKeys.length];
  tmdbKeyIndex += 1;
  return key;
};

const normalizeLanguageCode = (value: unknown): ViewerLanguageCode | null => {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code === "fil" || code.startsWith("fil-") || code === "tl" || code.startsWith("tl-") || code === "ph") {
    return "fil";
  }
  return null;
};

const getCookie = (cookieHeader: string | undefined, key: string) => {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))
    ?.slice(key.length + 1) || "";
};

export const resolveViewerLanguage = (req: Request): ViewerLanguageCode | null => {
  const queryLanguage = Array.isArray(req.query.viewer_language)
    ? req.query.viewer_language[0]
    : req.query.viewer_language;
  const headerLanguage = req.get("x-viewer-language");
  const cookieLanguage = getCookie(req.headers.cookie, COOKIE_KEY);
  return normalizeLanguageCode(queryLanguage || headerLanguage || cookieLanguage);
};

const SECTION_TITLES: Record<ViewerLanguageCode, Record<string, string>> = {
  en: {
    newSingleMovies: "Brand-new movies",
    top10SeriesToday: "Top 10 series today",
    series: "Recently updated series",
    single: "Newly added movies",
    upcoming: "Upcoming movies",
    hanQuocMovies: "New Korean movies",
    trungQuocMovies: "New Chinese movies",
    japanMovies: "New Japanese movies",
    thailandMovies: "New Thai movies",
    usUkMovies: "New US-UK movies",
    anime: "Latest anime",
    cinemaHot: "Hot theatrical movies",
    cinemaNew: "Theatrical movies to enjoy",
    infinite_random: "More picks for you",
  },
  fil: {
    newSingleMovies: "Mga bagong pelikula",
    top10SeriesToday: "Top 10 serye ngayon",
    series: "Mga seryeng bagong update",
    single: "Mga bagong dagdag na pelikula",
    upcoming: "Paparating na pelikula",
    hanQuocMovies: "Bagong Korean movies",
    trungQuocMovies: "Bagong Chinese movies",
    japanMovies: "Bagong Japanese movies",
    thailandMovies: "Bagong Thai movies",
    usUkMovies: "Bagong US-UK movies",
    anime: "Pinakabagong anime",
    cinemaHot: "Hot theatrical movies",
    cinemaNew: "Mga pelikulang pang-sinehan",
    infinite_random: "Mga mungkahi para sa iyo",
  },
};

const CATEGORY_NAMES: Record<ViewerLanguageCode, Record<string, string>> = {
  en: {
    "phim-hanh-dong": "Action",
    "phim-tinh-cam": "Romance",
    "phim-hai": "Comedy",
    "phim-co-trang": "Costume drama",
    "phim-tam-ly": "Psychological",
    "phim-hinh-su": "Crime",
    "phim-chien-tranh": "War",
    "phim-the-thao": "Sports",
    "phim-vo-thuat": "Martial arts",
    "phim-vien-tuong": "Sci-Fi",
    "khoa-hoc-vien-tuong": "Sci-Fi",
    "phim-khoa-hoc-vien-tuong": "Sci-Fi",
    "gia-tuong": "Fantasy",
    "phim-gia-tuong": "Fantasy",
    "gay-can": "Thriller",
    "phim-gay-can": "Thriller",
    "phim-phieu-luu": "Adventure",
    "phieu-luu": "Adventure",
    "phim-khoa-hoc": "Science",
    "phim-kinh-di": "Horror",
    "phim-am-nhac": "Music",
    "phim-than-thoai": "Mythology",
    "phim-tai-lieu": "Documentary",
    "phim-gia-dinh": "Family",
    "phim-chinh-kich": "Drama",
    "phim-bi-an": "Mystery",
    "phim-hoc-duong": "School",
    "phim-kinh-dien": "Classic",
    "phim-hoat-hinh": "Animation",
    "hoat-hinh": "Animation",
    "phim-le": "Movies",
    "phim-bo": "Series",
    "phim-chieu-rap": "Theatrical movies",
    "tv-shows": "TV shows",
  },
  fil: {
    "phim-hanh-dong": "Aksyon",
    "phim-tinh-cam": "Romansa",
    "phim-hai": "Komedya",
    "phim-co-trang": "Costume drama",
    "phim-tam-ly": "Psychological",
    "phim-hinh-su": "Krimen",
    "phim-chien-tranh": "Digmaan",
    "phim-the-thao": "Sports",
    "phim-vo-thuat": "Martial arts",
    "phim-vien-tuong": "Sci-Fi",
    "khoa-hoc-vien-tuong": "Sci-Fi",
    "phim-khoa-hoc-vien-tuong": "Sci-Fi",
    "gia-tuong": "Fantasy",
    "phim-gia-tuong": "Fantasy",
    "gay-can": "Thriller",
    "phim-gay-can": "Thriller",
    "phim-phieu-luu": "Pakikipagsapalaran",
    "phieu-luu": "Pakikipagsapalaran",
    "phim-khoa-hoc": "Science",
    "phim-kinh-di": "Horror",
    "phim-am-nhac": "Musika",
    "phim-than-thoai": "Mythology",
    "phim-tai-lieu": "Dokumentaryo",
    "phim-gia-dinh": "Pamilya",
    "phim-chinh-kich": "Drama",
    "phim-bi-an": "Misteryo",
    "phim-hoc-duong": "School",
    "phim-kinh-dien": "Classic",
    "phim-hoat-hinh": "Animation",
    "hoat-hinh": "Animation",
    "phim-le": "Mga Pelikula",
    "phim-bo": "Mga Serye",
    "phim-chieu-rap": "Mga pelikulang pang-sinehan",
    "tv-shows": "TV shows",
  },
};

const COUNTRY_NAMES: Record<ViewerLanguageCode, Record<string, string>> = {
  en: {
    VN: "Vietnam",
    KR: "South Korea",
    CN: "China",
    JP: "Japan",
    TH: "Thailand",
    US: "United States",
    UK: "United Kingdom",
    GB: "United Kingdom",
    HK: "Hong Kong",
    TW: "Taiwan",
    IN: "India",
    PH: "Philippines",
    FR: "France",
    DE: "Germany",
    ES: "Spain",
    CA: "Canada",
    AU: "Australia",
  },
  fil: {
    VN: "Vietnam",
    KR: "Timog Korea",
    CN: "Tsina",
    JP: "Hapon",
    TH: "Thailand",
    US: "Estados Unidos",
    UK: "United Kingdom",
    GB: "United Kingdom",
    HK: "Hong Kong",
    TW: "Taiwan",
    IN: "India",
    PH: "Pilipinas",
    FR: "France",
    DE: "Germany",
    ES: "Spain",
    CA: "Canada",
    AU: "Australia",
  },
};

const EXACT_TEXT: Record<ViewerLanguageCode, Record<string, string>> = {
  en: {
    "Full": "Full",
    "Trailer": "Trailer",
    "Phu de": "Subtitles",
    "Phu De": "Subtitles",
    "Thuyet minh": "Dubbed",
    "Thuyet Minh": "Dubbed",
    "Long tieng": "Dubbed",
    "Long Tieng": "Dubbed",
  },
  fil: {
    "Full": "Full",
    "Trailer": "Trailer",
    "Phu de": "Subtitles",
    "Phu De": "Subtitles",
    "Thuyet minh": "May voice-over",
    "Thuyet Minh": "May voice-over",
    "Long tieng": "Dubbed",
    "Long Tieng": "Dubbed",
  },
};

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0111/g, "d").replace(/\u0110/g, "D");

const titleFromSlug = (slug: string) =>
  slug
    .replace(/^phim-/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getTranslation = (entity: any, language: ViewerLanguageCode, field: string) => {
  const translated = entity?.translations?.[language]?.[field];
  return typeof translated === "string" && translated.trim() ? translated.trim() : "";
};

class ViewerTranslationService {
  private static tmdbTranslationFlights = new Map<string, Promise<MovieTranslation | null>>();

  static isSupportedLanguage(language: ViewerLanguageCode | null): language is ViewerLanguageCode {
    return !!language && SUPPORTED_LANGUAGES.has(language);
  }

  static translateCommonText(value: unknown, language: ViewerLanguageCode | null) {
    if (!this.isSupportedLanguage(language) || typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return value;

    const asciiKey = stripAccents(text);
    const exact = EXACT_TEXT[language][text] || EXACT_TEXT[language][asciiKey];
    if (exact) return exact;

    const seasonMatch = text.match(/^Ph\u1ea7n\s+(.+)$/iu) || text.match(/^Season\s+(.+)$/iu);
    if (seasonMatch) return `Season ${seasonMatch[1]}`;

    const episodeMatch = text.match(/^T\u1eadp\s+(.+)$/iu) || text.match(/^Episode\s+(.+)$/iu);
    if (episodeMatch) return `Episode ${episodeMatch[1]}`;

    const minuteEpisodeMatch = text.match(/^(\d+)\s*ph\u00fat\s*\/\s*t\u1eadp$/iu);
    if (minuteEpisodeMatch) return `${minuteEpisodeMatch[1]} min/ep`;

    const minuteMatch = text.match(/^(\d+)\s*ph\u00fat$/iu);
    if (minuteMatch) return `${minuteMatch[1]} min`;

    return value;
  }

  static localizeSectionTitle(section: any, language: ViewerLanguageCode | null) {
    if (!this.isSupportedLanguage(language)) return section?.title || "";
    const key = section?.queryKey || section?.slug || section?.type;
    return SECTION_TITLES[language][key] || section?.title || "";
  }

  static localizeSectionConfig(section: any, language: ViewerLanguageCode | null) {
    if (!section || !this.isSupportedLanguage(language)) return section;
    return {
      ...section,
      title: this.localizeSectionTitle(section, language),
    };
  }

  static localizeCategory(category: any, language: ViewerLanguageCode | null) {
    if (!category || typeof category !== "object" || !this.isSupportedLanguage(language)) return category;
    const slug = String(category.slug || "");
    const translatedName =
      getTranslation(category, language, "name") ||
      CATEGORY_NAMES[language][slug] ||
      (slug ? titleFromSlug(slug) : category.name);
    return { ...category, name: translatedName };
  }

  static localizeCategories(categories: any, language: ViewerLanguageCode | null) {
    if (!Array.isArray(categories)) return categories;
    return categories.map((category) => this.localizeCategory(category, language));
  }

  static localizeCountry(country: any, language: ViewerLanguageCode | null) {
    if (!country || typeof country !== "object" || !this.isSupportedLanguage(language)) return country;
    const code = String(country.code || "").toUpperCase();
    const slug = String(country.slug || "");
    const translatedName =
      getTranslation(country, language, "name") ||
      COUNTRY_NAMES[language][code] ||
      (slug ? titleFromSlug(slug) : country.name);
    return { ...country, name: translatedName };
  }

  static localizeCountries(countries: any, language: ViewerLanguageCode | null) {
    if (!Array.isArray(countries)) return countries;
    return countries.map((country) => this.localizeCountry(country, language));
  }

  private static getFallbackMovieName(movie: any, language: ViewerLanguageCode) {
    const cachedName = getTranslation(movie, language, "name");
    if (cachedName) return cachedName;
    const originName = typeof movie?.origin_name === "string" ? movie.origin_name.trim() : "";
    if (originName) return originName;
    return movie?.name;
  }

  private static async fetchTmdbMovieTranslation(movie: any, language: ViewerLanguageCode) {
    const tmdbId = String(movie?.tmdb?.id || "").trim();
    if (!tmdbId) return null;

    const mediaType = movie?.tmdb?.type === "movie" || movie?.type === "movie" ? "movie" : "tv";
    const tmdbLanguages = language === "fil" ? ["tl-PH", "en-US"] : ["en-US"];
    let fallbackTranslation: MovieTranslation | null = null;

    for (const tmdbLanguage of tmdbLanguages) {
      const apiKey = getTmdbApiKey();
      if (!apiKey) return null;

      try {
        const response = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}`, {
          params: {
            api_key: apiKey,
            language: tmdbLanguage,
          },
          httpsAgent: tmdbHttpsAgent,
          timeout: Number(process.env.TMDB_TRANSLATION_TIMEOUT_MS) || 3500,
        });

        const payload = response.data || {};
        const name = String(mediaType === "movie" ? payload.title || "" : payload.name || "").trim();
        const content = String(payload.overview || "").trim();

        if (content) {
          return { name, content };
        }
        if (name && !fallbackTranslation) fallbackTranslation = { name };
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 429) break;
      }
    }

    return fallbackTranslation;
  }

  private static async getOrFetchMovieTranslation(movie: any, language: ViewerLanguageCode) {
    const cachedName = getTranslation(movie, language, "name");
    const cachedContent = getTranslation(movie, language, "content");
    if (cachedName && cachedContent) return { name: cachedName, content: cachedContent };
    if (!cachedName && cachedContent) return { content: cachedContent };

    const movieId = String(movie?._id || "");
    if (!movieId) return null;

    const flightKey = `${movieId}:${language}`;
    let flight = this.tmdbTranslationFlights.get(flightKey);
    if (!flight) {
      flight = this.fetchTmdbMovieTranslation(movie, language)
        .then(async (translation) => {
          if (!translation || (!translation.name && !translation.content)) return translation;

          const setPayload: Record<string, string> = {};
          if (translation.name) setPayload[`translations.${language}.name`] = translation.name;
          if (translation.content) setPayload[`translations.${language}.content`] = translation.content;

          if (Object.keys(setPayload).length > 0) {
            await Movie.updateOne(
              { _id: movieId },
              { $set: setPayload },
              { timestamps: false }
            ).exec().catch(() => undefined);
          }

          return translation;
        })
        .finally(() => {
          this.tmdbTranslationFlights.delete(flightKey);
        });
      this.tmdbTranslationFlights.set(flightKey, flight);
    }

    return flight;
  }

  static async localizeMovie(
    movie: any,
    language: ViewerLanguageCode | null,
    options: { hydrate?: boolean } = {}
  ) {
    if (!movie || typeof movie !== "object" || !this.isSupportedLanguage(language)) return movie;

    const tmdbTranslation = options.hydrate
      ? await this.getOrFetchMovieTranslation(movie, language)
      : null;

    const localized = {
      ...movie,
      name: tmdbTranslation?.name || this.getFallbackMovieName(movie, language),
      content: tmdbTranslation?.content || getTranslation(movie, language, "content") || movie.content,
      time: this.translateCommonText(movie.time, language),
      episode_current: this.translateCommonText(movie.episode_current, language),
      category: this.localizeCategories(movie.category, language),
      country: this.localizeCountries(movie.country, language),
    };

    if (Array.isArray(movie.badges)) {
      localized.badges = movie.badges.map((badge: any) => ({
        ...badge,
        text: this.translateCommonText(badge?.text, language),
      }));
    }

    return localized;
  }

  static async localizeMovies(
    movies: any[],
    language: ViewerLanguageCode | null,
    options: { hydrate?: boolean } = {}
  ) {
    if (!Array.isArray(movies) || !this.isSupportedLanguage(language)) return movies;
    return Promise.all(movies.map((movie) => this.localizeMovie(movie, language, options)));
  }

  static localizeEpisode(episode: any, language: ViewerLanguageCode | null) {
    if (!episode || typeof episode !== "object" || !this.isSupportedLanguage(language)) return episode;
    return {
      ...episode,
      name: getTranslation(episode, language, "name") || this.translateCommonText(episode.name, language),
      description:
        getTranslation(episode, language, "description") ||
        getTranslation(episode, language, "content") ||
        episode.description,
      audios: Array.isArray(episode.audios)
        ? episode.audios.map((audio: any) => ({ ...audio, label: this.translateCommonText(audio?.label, language) }))
        : episode.audios,
      subtitles: Array.isArray(episode.subtitles)
        ? episode.subtitles.map((subtitle: any) => ({ ...subtitle, label: this.translateCommonText(subtitle?.label, language) }))
        : episode.subtitles,
    };
  }

  static localizeSeason(season: any, language: ViewerLanguageCode | null) {
    if (!season || typeof season !== "object" || !this.isSupportedLanguage(language)) return season;
    return {
      ...season,
      name: getTranslation(season, language, "name") || this.translateCommonText(season.name, language),
      overview: getTranslation(season, language, "overview") || season.overview,
      episodes: Array.isArray(season.episodes)
        ? season.episodes.map((episode: any) => this.localizeEpisode(episode, language))
        : season.episodes,
    };
  }

  static localizeSeasons(seasons: any[], language: ViewerLanguageCode | null) {
    if (!Array.isArray(seasons) || !this.isSupportedLanguage(language)) return seasons;
    return seasons.map((season) => this.localizeSeason(season, language));
  }

  static async localizePaginationResult(result: any, language: ViewerLanguageCode | null) {
    if (!result || !Array.isArray(result.items) || !this.isSupportedLanguage(language)) return result;
    return { ...result, items: await this.localizeMovies(result.items, language) };
  }

  static async localizeUserProfile(user: any, language: ViewerLanguageCode | null) {
    if (!user || !this.isSupportedLanguage(language)) return user;
    const favorites = Array.isArray(user.favorites)
      ? await this.localizeMovies(user.favorites, language)
      : user.favorites;
    const history = Array.isArray(user.history)
      ? await Promise.all(
          user.history.map(async (entry: any) => ({
            ...entry,
            movie: await this.localizeMovie(entry.movie, language),
          }))
        )
      : user.history;
    return { ...user, favorites, history };
  }
}

export default ViewerTranslationService;
