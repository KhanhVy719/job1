import Category from "../model/Category";
import Country from "../model/Country";
import Movie from "../model/Movie";
import { publicMovieConstraint } from "./Shared/shared";

export interface AICreativeSection {
  title: string;
  filters: any;
}

type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatPayload = {
  message?: {
    content?: string;
  };
};

let DYNAMIC_VOCAB = {
  prefixes: [] as string[],
  adjectives: [] as string[],
  verbs: [] as string[],
  nouns: [] as string[],
  suffixes: [] as string[],
  emojis: [] as string[],
  templates: [] as string[],
  lastUpdated: 0,
};

let DB_CACHE = {
  categories: [] as any[],
  countries: [] as any[],
  lastUpdated: 0,
};

const STATIC_VOCAB = {
  prefixes: ["Top", "Tuyển tập", "Đề cử", "Đáng xem", "Nổi bật"],
  adjectives: ["gay cấn", "cuốn hút", "đặc sắc", "mới nhất", "đáng chú ý"],
  verbs: ["Khám phá", "Thưởng thức", "Xem ngay", "Chọn lọc", "Bắt đầu"],
  nouns: ["bộ sưu tập", "lựa chọn", "chủ đề", "danh sách", "gu phim"],
  suffixes: ["đáng xem nhất", "cho cuối tuần", "không nên bỏ lỡ", "hot hiện nay"],
  emojis: [] as string[],
  templates: [
    "{keyword} đáng xem nhất",
    "Tuyển tập {keyword}",
    "{keyword} không nên bỏ lỡ",
    "Đề cử {keyword} cho bạn",
  ],
};

const SEARCH_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

const TITLE_HISTORY = new Set<string>();
const MAX_HISTORY_SIZE = 2000;

const envNumber = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://ollama:11434").replace(/\/$/, "");
const AI_TIMEOUT_MS = envNumber("AI_OLLAMA_TIMEOUT_MS", 8000);
const AI_FAILURE_COOLDOWN_MS = envNumber("AI_FAILURE_COOLDOWN_MS", 5 * 60 * 1000);
const AI_VOCAB_REFRESH_MS = envNumber("AI_VOCAB_REFRESH_MS", 6 * 60 * 60 * 1000);
const AI_SEMANTIC_MIN_INTERVAL_MS = envNumber("AI_SEMANTIC_MIN_INTERVAL_MS", 30 * 1000);
const ENABLE_AI_VOCAB_WORKER = process.env.AI_ENABLE_VOCAB_WORKER === "true";
const ENABLE_SEMANTIC_AI = process.env.AI_ENABLE_SEMANTIC_SEARCH !== "false";

let creativeRefreshInFlight: Promise<void> | null = null;
let creativeRefreshDisabledUntil = 0;
let semanticSearchInFlight: Promise<any> | null = null;
let semanticSearchDisabledUntil = 0;
let semanticSearchNextAllowedAt = 0;

class AIService {
  private static MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

  public static async initWorker() {
    await this._refreshDbCache();
    if (!ENABLE_AI_VOCAB_WORKER) {
      console.log("AI Creative Worker disabled.");
      return;
    }

    console.log("AI Creative Worker started.");
    void this._refreshCreativeVocabulary();
    setInterval(() => void this._refreshCreativeVocabulary(), AI_VOCAB_REFRESH_MS);
    setInterval(() => void this._refreshDbCache(), 60 * 60 * 1000);
  }

  private static async _refreshDbCache() {
    try {
      const [cats, countries] = await Promise.all([
        Category.find({}).select("name slug").lean(),
        Country.find({}).select("name slug").lean(),
      ]);
      DB_CACHE.categories = cats;
      DB_CACHE.countries = countries;
      DB_CACHE.lastUpdated = Date.now();
    } catch (e) {
      console.error("Cache DB Error", e);
    }
  }

  private static _fallbackSearchData(description: string) {
    const keywords = description
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 1)
      .slice(0, 8);

    return {
      predicted_titles: [description],
      keywords,
    };
  }

  private static async _chatJson(
    messages: OllamaChatMessage[],
    options: Record<string, any> = {}
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, AI_TIMEOUT_MS));

    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.MODEL,
          format: "json",
          stream: false,
          messages,
          options,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama chat failed with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as OllamaChatPayload;
      const content = String(payload.message?.content || "")
        .replace(/```json|```/g, "")
        .trim();

      return JSON.parse(content);
    } finally {
      clearTimeout(timer);
    }
  }

  private static async _refreshCreativeVocabulary() {
    const now = Date.now();
    if (creativeRefreshInFlight) return creativeRefreshInFlight;
    if (now < creativeRefreshDisabledUntil) return;

    creativeRefreshInFlight = this._doRefreshCreativeVocabulary().finally(() => {
      creativeRefreshInFlight = null;
    });

    return creativeRefreshInFlight;
  }

  private static async _doRefreshCreativeVocabulary() {
    try {
      const data = await this._chatJson(
        [
          {
            role: "system",
            content: `You are a creative Vietnamese movie copywriter.
Generate a JSON object with unique, trendy, slang Vietnamese words for movie titles.
Fields: verbs, adjectives, nouns, prefixes, suffixes, emojis, templates.
Generate 10 items for EACH category.`,
          },
          { role: "user", content: "Give me fresh vocabulary." },
        ],
        { temperature: 0.8 }
      );

      const merge = (oldArr: string[], newArr: any[]): string[] => {
        const safeNewArr = (newArr || []).filter(
          (item) => typeof item === "string" && item.trim().length > 0
        );

        const combined = [...safeNewArr, ...oldArr];
        return combined.sort(() => 0.5 - Math.random()).slice(0, 100);
      };

      DYNAMIC_VOCAB.verbs = merge(DYNAMIC_VOCAB.verbs, data.verbs);
      DYNAMIC_VOCAB.adjectives = merge(DYNAMIC_VOCAB.adjectives, data.adjectives);
      DYNAMIC_VOCAB.nouns = merge(DYNAMIC_VOCAB.nouns, data.nouns);
      DYNAMIC_VOCAB.prefixes = merge(DYNAMIC_VOCAB.prefixes, data.prefixes);
      DYNAMIC_VOCAB.suffixes = merge(DYNAMIC_VOCAB.suffixes, data.suffixes);
      DYNAMIC_VOCAB.emojis = merge(DYNAMIC_VOCAB.emojis, data.emojis);
      DYNAMIC_VOCAB.templates = merge(DYNAMIC_VOCAB.templates, data.templates);

      DYNAMIC_VOCAB.lastUpdated = Date.now();
      if (TITLE_HISTORY.size > MAX_HISTORY_SIZE) TITLE_HISTORY.clear();

      console.log("AI Vocabulary Updated & Merged!");
    } catch (error: any) {
      creativeRefreshDisabledUntil = Date.now() + AI_FAILURE_COOLDOWN_MS;
      console.error("AI Update Error", error?.message || error);
    }
  }

  private static _getRandom(arr: any[]) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private static _getTitleVocab() {
    return {
      prefixes: DYNAMIC_VOCAB.prefixes.length ? DYNAMIC_VOCAB.prefixes : STATIC_VOCAB.prefixes,
      adjectives: DYNAMIC_VOCAB.adjectives.length ? DYNAMIC_VOCAB.adjectives : STATIC_VOCAB.adjectives,
      verbs: DYNAMIC_VOCAB.verbs.length ? DYNAMIC_VOCAB.verbs : STATIC_VOCAB.verbs,
      nouns: DYNAMIC_VOCAB.nouns.length ? DYNAMIC_VOCAB.nouns : STATIC_VOCAB.nouns,
      suffixes: DYNAMIC_VOCAB.suffixes.length ? DYNAMIC_VOCAB.suffixes : STATIC_VOCAB.suffixes,
      emojis: DYNAMIC_VOCAB.emojis.length ? DYNAMIC_VOCAB.emojis : STATIC_VOCAB.emojis,
      templates: DYNAMIC_VOCAB.templates.length ? DYNAMIC_VOCAB.templates : STATIC_VOCAB.templates,
    };
  }

  private static _assembleTitle(keyword: string): string {
    const p = this._getTitleVocab();
    let title = "";
    let attempts = 0;

    do {
      const mode = Math.random();
      const verb = String(this._getRandom(p.verbs) || "");
      const adj = String(this._getRandom(p.adjectives) || "");
      const noun = String(this._getRandom(p.nouns) || "");
      const prefix = String(this._getRandom(p.prefixes) || "");
      const suffix = String(this._getRandom(p.suffixes) || "");
      const template = String(this._getRandom(p.templates) || "");
      const emoji =
        Math.random() > 0.6
          ? ` ${String(this._getRandom(p.emojis) || "")}`
          : "";

      if (mode < 0.2 && template.includes("{keyword}"))
        title = template.replace("{keyword}", keyword);
      else if (mode < 0.35) title = `${prefix} ${noun} ${keyword}`;
      else if (mode < 0.55) title = `${verb} ${keyword} ${adj}`;
      else if (mode < 0.7) title = `${keyword}: ${suffix}`;
      else if (mode < 0.85) title = `${noun} ${keyword}`;
      else title = `${prefix} ${verb} ${keyword}`;

      title = title + emoji;
      title = title.replace(/\s+/g, " ").trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
      title = title.replace("::", ":");
      attempts++;
    } while (TITLE_HISTORY.has(title) && attempts < 20);

    if (TITLE_HISTORY.has(title))
      title = `${title} #${Math.floor(Math.random() * 999)}`;
    TITLE_HISTORY.add(title);
    return title;
  }

  static async generateFastSection(): Promise<AICreativeSection> {
    if (DB_CACHE.categories.length === 0) await this._refreshDbCache();

    const dice = Math.random();
    const filters: any = {};
    let keyword = "";

    if (dice < 0.35 && DB_CACHE.categories.length > 0) {
      const cat = this._getRandom(DB_CACHE.categories);
      filters.genre_slug = cat.slug;
      filters.sort_by = Math.random() > 0.5 ? "view" : "latest";
      keyword = cat.name;
    } else if (dice < 0.6 && DB_CACHE.countries.length > 0) {
      const country = this._getRandom(DB_CACHE.countries);
      filters.country_slug = country.slug;
      filters.sort_by = "latest";
      keyword = `Phim ${country.name}`;
    } else if (dice < 0.8) {
      const currentYear = new Date().getFullYear();
      const year = currentYear - Math.floor(Math.random() * 5);
      filters.year = year;
      filters.sort_by = "view";
      keyword = `Phim Năm ${year}`;
    } else {
      filters.is_cinema = true;
      filters.sort_by = "view";
      keyword = "Phim Chiếu Rạp";
    }

    const title = this._assembleTitle(keyword);
    if (Math.random() > 0.7)
      filters.type = Math.random() > 0.5 ? "movie" : "tv";
    return { title, filters };
  }

  private static async _getSemanticSearchData(description: string, cacheKey: string) {
    const now = Date.now();
    const cached = SEARCH_CACHE.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log(`Using AI Cache for: "${description}"`);
      return cached.data;
    }

    let aiData: any;
    const canUseAi =
      ENABLE_SEMANTIC_AI &&
      now >= semanticSearchDisabledUntil &&
      now >= semanticSearchNextAllowedAt &&
      !semanticSearchInFlight;

    if (!canUseAi) {
      aiData = this._fallbackSearchData(description);
    } else {
      console.log(`AI Analyzing: "${description}"`);
      semanticSearchNextAllowedAt = now + AI_SEMANTIC_MIN_INTERVAL_MS;
      semanticSearchInFlight = this._chatJson(
        [
          {
            role: "system",
            content: `You are a semantic search engine for a Vietnamese movie database.
Analyze the user's query. Return a JSON object with:
1. "predicted_titles": Array of strings. Guess exact movie names.
2. "keywords": Array of strings. Extract core topics, synonyms in Vietnamese.
3. "year": Number or null.`,
          },
          { role: "user", content: description },
        ],
        { temperature: 0.2 }
      ).finally(() => {
        semanticSearchInFlight = null;
      });

      try {
        aiData = await semanticSearchInFlight;
      } catch (error: any) {
        semanticSearchDisabledUntil = Date.now() + AI_FAILURE_COOLDOWN_MS;
        console.error("Semantic AI Error", error?.message || error);
        aiData = this._fallbackSearchData(description);
      }
    }

    SEARCH_CACHE.set(cacheKey, { data: aiData, timestamp: now });
    if (SEARCH_CACHE.size > 500) {
      const firstKey = SEARCH_CACHE.keys().next().value;
      if (firstKey) SEARCH_CACHE.delete(firstKey);
    }

    return aiData;
  }

  static async searchByNaturalLanguage(
    description: string,
    page: number = 1,
    limit: number = 24
  ) {
    try {
      if (!description || description.length < 2)
        return { items: [], totalItems: 0 };

      const cacheKey = description.toLowerCase().trim();
      const aiData = await this._getSemanticSearchData(description, cacheKey);
      const { predicted_titles, keywords } = aiData;
      const orConditions: any[] = [];

      if (predicted_titles?.length > 0) {
        predicted_titles.forEach((title: string) => {
          orConditions.push({ name: { $regex: title, $options: "i" } });
          orConditions.push({ origin_name: { $regex: title, $options: "i" } });
        });
      }

      const validKeywords = (keywords || []).filter(
        (k: string) => k.length > 1
      );
      if (validKeywords.length > 0) {
        validKeywords.forEach((k: string) => {
          orConditions.push({ name: { $regex: k, $options: "i" } });
          orConditions.push({ origin_name: { $regex: k, $options: "i" } });
          orConditions.push({ content: { $regex: k, $options: "i" } });
        });
      }

      if (orConditions.length === 0) return { items: [], totalItems: 0 };

      const query = {
        ...publicMovieConstraint(),
        $or: orConditions,
      };

      const skip = (page - 1) * limit;

      const [totalItems, items] = await Promise.all([
        Movie.countDocuments(query),
        Movie.find(query)
          .sort({ view: -1, _id: 1 })
          .skip(skip)
          .limit(limit)
          .populate("category", "name slug")
          .populate("country", "name slug")
          .lean(),
      ]);

      return { items, totalItems };
    } catch (e) {
      console.error("Semantic Search Error", e);
      return { items: [], totalItems: 0 };
    }
  }
}

export default AIService;
