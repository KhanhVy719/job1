import fs from "fs";
import path from "path";
import limax from 'limax';

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateSlug = (str: string): string => {
  if (!str) return "";
  // limax mặc định chuyển đổi sang dạng slug, hỗ trợ đa ngôn ngữ
  return limax(str, {
    tone: false, // bỏ dấu (cho tiếng Việt)
    separator: '-',
    lang: 'vi', // ngôn ngữ, nhưng limax tự động phát hiện
  });
};
export const loadState = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {}
  // Mặc định trả về
  if (filePath.includes("tap")) return { last_id: null };
  return { page: 1 };
};

export const saveState = (filePath: string, data: any) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- EMBED PROVIDER ---
// Override with VIDSRC_*_URL_TEMPLATE or EMBED_*_URL_TEMPLATE when the provider changes.
const VIDSRC_BASE = (process.env.VIDSRC_BASE || "").replace(/\/+$/, "");
const MOVIE_EMBED_TEMPLATE =
  process.env.VIDSRC_MOVIE_URL_TEMPLATE ||
  process.env.EMBED_MOVIE_URL_TEMPLATE ||
  (VIDSRC_BASE
    ? `${VIDSRC_BASE}/embed/movie/{tmdbId}`
    : "https://vsembed.ru/embed/movie/{tmdbId}");
const TV_EMBED_TEMPLATE =
  process.env.VIDSRC_TV_URL_TEMPLATE ||
  process.env.EMBED_TV_URL_TEMPLATE ||
  (VIDSRC_BASE
    ? `${VIDSRC_BASE}/embed/tv/{tmdbId}/{season}-{episode}`
    : "https://vsembed.ru/embed/tv/{tmdbId}/{season}-{episode}");

/**
 * Build iframe embed URL from TMDB id.
 *
 * @param tmdbId   TMDB id của phim
 * @param type     "movie" | "tv" (mọi giá trị khác "movie" coi là tv)
 * @param season   số phần (chỉ dùng cho tv)
 * @param episode  số tập (chỉ dùng cho tv)
 */
export const buildVidSrcEmbed = (
  tmdbId: string | number,
  type: string,
  season?: number,
  episode?: number
): string => {
  if (!tmdbId) return "";
  const template = type === "movie" ? MOVIE_EMBED_TEMPLATE : TV_EMBED_TEMPLATE;
  const s = season && season > 0 ? season : 1;
  const e = episode && episode > 0 ? episode : 1;
  return template
    .replace(/\{tmdbId\}|\{tmdb_id\}/g, encodeURIComponent(String(tmdbId)))
    .replace(/\{season\}/g, encodeURIComponent(String(s)))
    .replace(/\{episode\}/g, encodeURIComponent(String(e)));
};
