import { Ollama } from "ollama";
import Category from "../model/Category";
import Country from "../model/Country";
import Movie from "../model/Movie";

export interface AICreativeSection {
  title: string;
  filters: any;
}

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

const SEARCH_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

const TITLE_HISTORY = new Set<string>();
const MAX_HISTORY_SIZE = 2000;

class AIService {
  private static client = new Ollama({ host: "http://127.0.0.1:11434" });
  private static MODEL = "qwen2.5:1.5b";

  public static async initWorker() {
    console.log("🚀 AI Creative Worker started...");
    await this._refreshCreativeVocabulary();
    await this._refreshDbCache();
    setInterval(() => this._refreshCreativeVocabulary(), 10 * 60 * 1000);
    setInterval(() => this._refreshDbCache(), 60 * 60 * 1000);
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

  private static async _refreshCreativeVocabulary() {
    try {
      const response = await this.client.chat({
        model: this.MODEL,
        format: "json",
        messages: [
          {
            role: "system",
            content: `You are a creative Vietnamese movie copywriter.
            Generate a JSON object with unique, trendy, slang Vietnamese words for movie titles.
            Fields: verbs, adjectives, nouns, prefixes, suffixes, emojis, templates.
            Generate 10 items for EACH category.`,
          },
          { role: "user", content: "Give me fresh vocabulary." },
        ],
      });

      let cleanContent = response.message.content
        .replace(/```json|```/g, "")
        .trim();
      let data;
      try {
        data = JSON.parse(cleanContent);
      } catch (e) {
        console.error("AI JSON Parse Error", e); // Thêm log lỗi JSON
        return;
      }

      const merge = (oldArr: string[], newArr: any[]): string[] => {
        // Lọc: Đảm bảo các phần tử là chuỗi và không rỗng
        const safeNewArr = (newArr || []).filter(
          (item) => typeof item === "string" && item.trim().length > 0
        );

        const combined = [...safeNewArr, ...oldArr];
        return combined.sort(() => 0.5 - Math.random()).slice(0, 100);
      };

      DYNAMIC_VOCAB.verbs = merge(DYNAMIC_VOCAB.verbs, data.verbs);
      DYNAMIC_VOCAB.adjectives = merge(
        DYNAMIC_VOCAB.adjectives,
        data.adjectives
      );
      DYNAMIC_VOCAB.nouns = merge(DYNAMIC_VOCAB.nouns, data.nouns);
      DYNAMIC_VOCAB.prefixes = merge(DYNAMIC_VOCAB.prefixes, data.prefixes);
      DYNAMIC_VOCAB.suffixes = merge(DYNAMIC_VOCAB.suffixes, data.suffixes);
      DYNAMIC_VOCAB.emojis = merge(DYNAMIC_VOCAB.emojis, data.emojis);
      DYNAMIC_VOCAB.templates = merge(DYNAMIC_VOCAB.templates, data.templates);

      DYNAMIC_VOCAB.lastUpdated = Date.now();
      if (TITLE_HISTORY.size > MAX_HISTORY_SIZE) TITLE_HISTORY.clear();

      console.log("AI Vocabulary Updated & Merged!");
    } catch {
      console.error("AI Update Error");
    }
  }

  private static _getRandom(arr: any[]) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private static _assembleTitle(keyword: string): string {
    if (DYNAMIC_VOCAB.adjectives.length === 0)
      return `Phim ${keyword} Hay Nhất`;
    let title = "";
    let attempts = 0;
    do {
      const mode = Math.random();
      const p = DYNAMIC_VOCAB;
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
    if (DYNAMIC_VOCAB.adjectives.length === 0)
      this._refreshCreativeVocabulary();

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

  static async searchByNaturalLanguage(
    description: string,
    page: number = 1,
    limit: number = 24
  ) {
    try {
      if (!description || description.length < 2)
        return { items: [], totalItems: 0 };

      const cacheKey = description.toLowerCase().trim();
      let aiData;

      const cached = SEARCH_CACHE.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_TTL) {
        console.log(`⚡ Using AI Cache for: "${description}"`);
        aiData = cached.data;
      } else {
        console.log(`🤖 AI Analyzing: "${description}"`);

        const aiResponse = await this.client.chat({
          model: this.MODEL,
          format: "json",
          messages: [
            {
              role: "system",
              content: `You are a semantic search engine for a Vietnamese movie database.
              Analyze the user's query. Return a JSON object with:
              1. "predicted_titles": Array of strings. Guess exact movie names.
              2. "keywords": Array of strings. Extract core topics, synonyms in Vietnamese.
              3. "year": Number or null.
              `,
            },
            { role: "user", content: description },
          ],
          options: { temperature: 0.2 }, // Giảm nhiệt độ để kết quả ổn định hơn
        });

        try {
          const cleanJson = aiResponse.message.content
            .replace(/```json|```/g, "")
            .trim();
          aiData = JSON.parse(cleanJson);
        } catch (e) {
          aiData = { predicted_titles: [], keywords: description.split(" ") };
        }

        // Lưu vào cache
        SEARCH_CACHE.set(cacheKey, { data: aiData, timestamp: now });

        // Dọn dẹp cache nếu quá lớn (tránh tràn RAM)
        if (SEARCH_CACHE.size > 500) {
          const firstKey = SEARCH_CACHE.keys().next().value;
          if (firstKey) SEARCH_CACHE.delete(firstKey);
        }
      }

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
        $or: orConditions,
        thumb_url: { $ne: "" },
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
