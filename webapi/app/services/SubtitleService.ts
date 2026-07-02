import axios, { AxiosInstance } from "axios";
import { gunzipSync } from "zlib";
import iconv from "iconv-lite";

/**
 * SubtitleService — lấy phụ đề từ OpenSubtitles REST API công khai (rest.opensubtitles.org).
 *
 * Vì vsembed không còn nhúng sub inline (default_subtitles luôn "[]"), plugin
 * subtitles_pjs_24.04.js của nó load động qua đúng API này bằng IMDB id + sublanguageid.
 * Ta replicate lại server-side:
 *   list -> GET /search/imdbid-{imdb}/sublanguageid-{lang}          (phim)
 *           GET /search/episode-{e}/imdbid-{imdb}/season-{s}/sublanguageid-{lang}  (tv)
 *   file -> SubDownloadLink (.gz) -> gunzip -> decode encoding -> SRT→VTT
 *
 * Browser không tự gunzip .gz và bị CORS/encoding, nên tải + convert VTT phải làm ở server.
 * Endpoint proxy trả text/vtt cho <track>.
 */

const OS_BASE = process.env.OS_API_BASE || "https://rest.opensubtitles.org";
// Header bắt buộc của OpenSubtitles REST (chính plugin vsembed cũng dùng UA này).
const OS_UA = process.env.OS_USER_AGENT || "trailers.to-UA";

// Ngôn ngữ ưu tiên hiển thị. sublanguageid theo chuẩn ISO 639-2 của OpenSubtitles.
const DEFAULT_LANGS = (process.env.OS_LANGS || "vie,eng").split(",").map((s) => s.trim()).filter(Boolean);

// Số sub tối đa mỗi ngôn ngữ để tránh danh sách quá dài (chọn bản điểm cao nhất).
const PER_LANG = Number(process.env.OS_PER_LANG) || 1;

const LIST_TTL_MS = Number(process.env.OS_LIST_TTL_MS) || 6 * 60 * 60 * 1000; // 6h

export interface SubtitleEntry {
  language: string; // iso639-1: vi, en...
  label: string; // "Tiếng Việt", "English"
  fileId: string; // IDSubtitleFile — dùng để proxy tải
  format: string; // srt, ass...
  encoding: string; // encoding gốc để decode
  url: string; // link proxy VTT nội bộ (điền sau ở controller)
}

const LANG_META: Record<string, { iso1: string; label: string }> = {
  vie: { iso1: "vi", label: "Tiếng Việt" },
  eng: { iso1: "en", label: "English" },
};

const listCache = new Map<string, { entries: SubtitleEntry[]; at: number }>();

class SubtitleService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: Number(process.env.OS_TIMEOUT_MS) || 15_000,
      maxRedirects: 5,
      headers: { "X-User-Agent": OS_UA, "User-Agent": OS_UA },
    });
  }

  /**
   * Lấy danh sách sub cho 1 imdb id. Trả entries CHƯA có url proxy (controller tự gắn).
   * imdb: chỉ phần số (bỏ tiền tố "tt"). type/season/episode để build query tv.
   */
  async list(
    imdbId: string,
    type: "movie" | "tv" = "movie",
    season?: number,
    episode?: number
  ): Promise<SubtitleEntry[]> {
    const imdb = String(imdbId || "").replace(/^tt/i, "").replace(/\D/g, "");
    if (!imdb) return [];

    const cacheKey = `${imdb}:${type}:${season || 0}:${episode || 0}`;
    const cached = listCache.get(cacheKey);
    if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.entries;

    const results = await Promise.all(
      DEFAULT_LANGS.map((lang) => this.fetchLang(imdb, lang, type, season, episode))
    );

    const entries = results.flat();
    listCache.set(cacheKey, { entries, at: Date.now() });
    return entries;
  }

  private async fetchLang(
    imdb: string,
    lang: string,
    type: "movie" | "tv",
    season?: number,
    episode?: number
  ): Promise<SubtitleEntry[]> {
    // OpenSubtitles REST không cho nhiều lang trong 1 request -> gọi riêng từng lang.
    let path = "/search";
    if (type === "tv" && season && episode) {
      path += `/episode-${episode}/imdbid-${imdb}/season-${season}`;
    } else {
      path += `/imdbid-${imdb}`;
    }
    path += `/sublanguageid-${lang}`;

    try {
      const { data } = await this.client.get(OS_BASE + path, {
        headers: { Accept: "application/json" },
      });
      if (!Array.isArray(data)) return [];

      const meta = LANG_META[lang] || { iso1: lang.slice(0, 2), label: lang };

      // Chọn bản điểm cao nhất, không hearing-impaired ưu tiên.
      const sorted = data
        .filter((s: any) => s && s.IDSubtitleFile && s.SubDownloadLink)
        .sort((a: any, b: any) => Number(b.Score || 0) - Number(a.Score || 0));

      return sorted.slice(0, PER_LANG).map((s: any) => ({
        language: (s.ISO639 || meta.iso1 || "").toLowerCase(),
        label: s.LanguageName || meta.label,
        fileId: String(s.IDSubtitleFile),
        format: String(s.SubFormat || "srt").toLowerCase(),
        encoding: String(s.SubEncoding || "").trim(),
        url: "",
      }));
    } catch {
      return [];
    }
  }

  /**
   * Tải file sub theo IDSubtitleFile, giải nén + decode + convert sang WEBVTT.
   * Dùng URL canonical (download/file/{id}.gz) — không phụ thuộc vrf token dễ hết hạn.
   */
  async toVtt(fileId: string, encodingHint?: string): Promise<string | null> {
    const id = String(fileId || "").replace(/\D/g, "");
    if (!id) return null;

    const url = `https://dl.opensubtitles.org/en/download/file/${id}.gz`;
    try {
      const { data } = await this.client.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
        headers: { Accept: "*/*" },
      });

      let buf = Buffer.from(data);
      // Giải nén nếu là gzip (magic 1f 8b).
      if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        buf = gunzipSync(buf);
      }

      const text = this.decode(buf, encodingHint);
      return this.srtToVtt(text);
    } catch {
      return null;
    }
  }

  /** Decode buffer về UTF-8 string, ưu tiên hint encoding từ OpenSubtitles, fallback tự đoán. */
  private decode(buf: Buffer, hint?: string): string {
    // BOM UTF-8
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return buf.slice(3).toString("utf8");
    }
    const enc = this.normEnc(hint);
    if (enc && iconv.encodingExists(enc)) {
      try {
        const out = iconv.decode(buf, enc);
        // Nếu decode ra nhiều ký tự thay thế (), thử utf8.
        if (!/�{2,}/.test(out)) return out;
      } catch {
        /* fallthrough */
      }
    }
    // Thử UTF-8; nếu hỏng nhiều thì về CP1252 (mặc định phổ biến của .srt).
    const asUtf8 = buf.toString("utf8");
    if (!/�/.test(asUtf8)) return asUtf8;
    try {
      return iconv.decode(buf, "win1252");
    } catch {
      return asUtf8;
    }
  }

  private normEnc(hint?: string): string | undefined {
    if (!hint) return undefined;
    const h = hint.toLowerCase().replace(/[^a-z0-9]/g, "");
    const map: Record<string, string> = {
      cp1252: "win1252",
      windows1252: "win1252",
      cp1250: "win1250",
      windows1250: "win1250",
      cp1251: "win1251",
      windows1251: "win1251",
      utf8: "utf8",
      utf16: "utf16",
      iso88591: "latin1",
      latin1: "latin1",
    };
    return map[h] || hint;
  }

  /** Chuyển SRT (hoặc text có timestamp) sang WEBVTT. Nếu đã là VTT thì trả nguyên. */
  private srtToVtt(input: string): string {
    let s = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    if (/^\s*WEBVTT/.test(s)) return s;

    // SRT timestamp dùng dấu phẩy cho mili-giây; VTT dùng dấu chấm.
    s = s.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      (_m, t: string, ms: string) => `${t}.${ms}`
    );

    return "WEBVTT\n\n" + s.trim() + "\n";
  }
}

export default SubtitleService;
