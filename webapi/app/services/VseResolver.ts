import axios, { AxiosInstance } from "axios";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const UA = process.env.VSE_USER_AGENT || DEFAULT_UA;
const EMBED_BASE = (
  process.env.VSE_EMBED_BASE ||
  process.env.VSEMBED_ORIGIN ||
  process.env.VSEMBED_BASE ||
  "https://vsembed.ru"
).replace(/\/+$/, "");
const RCP_HOST = process.env.VSE_RCP_HOST || "cloudorchestranova.com";
const TOKEN_TTL_MS = Number(process.env.VSE_TOKEN_TTL_MS) || 20_000;
const TIMEOUT_MS = Number(process.env.VSE_TIMEOUT_MS) || 15_000;

type MediaType = "movie" | "tv";

export interface VseSource {
  url: string;
  quality: string;
  host: string;
}

export interface VseSubtitle {
  language: string;
  label: string;
  url: string;
}

export interface VseResolveResult {
  status: "ok" | "empty" | "error";
  type: "hls";
  sources: VseSource[];
  subtitles: VseSubtitle[];
  poster?: string;
  reason?: string;
  resolvedAt: string;
}

const tokenCache = new Map<string, { token: string; at: number }>();

class VseResolver {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      responseType: "text",
      transformResponse: [(data) => data],
    });
  }

  async resolve(
    tmdbId: string | number,
    type: MediaType = "movie",
    season = 1,
    episode = 1
  ): Promise<VseResolveResult> {
    const resolvedAt = new Date().toISOString();
    const tmdb = String(tmdbId || "").trim();

    if (!tmdb) {
      return this.empty("missing-tmdb-id", resolvedAt, "error");
    }

    try {
      const embedUrl = this.buildEmbedUrl(tmdb, type, season, episode);
      const embedHtml = await this.get(embedUrl, `${EMBED_BASE}/`);
      const rcpUrl = this.parseRcpUrl(embedHtml);

      if (!rcpUrl) {
        return this.empty("no-rcp", resolvedAt);
      }

      const rcpHtml = await this.get(rcpUrl, `${EMBED_BASE}/`);
      const prorcpUrl = this.parseProrcpUrl(rcpHtml, rcpUrl);

      if (!prorcpUrl) {
        const directUrls = this.findM3u8(rcpHtml);
        if (!directUrls.length) {
          return this.empty("no-prorcp", resolvedAt);
        }
        const sources = await this.tokenize(directUrls);
        return this.result(sources, [], undefined, resolvedAt);
      }

      const prorcpHtml = await this.get(prorcpUrl, rcpUrl);
      const rawUrls = this.parseMasterUrls(prorcpHtml);

      if (!rawUrls.length) {
        return this.empty("no-master-urls", resolvedAt);
      }

      const sources = await this.tokenize(rawUrls);
      const subtitles = this.parseSubtitles(prorcpHtml);
      const poster = this.parsePoster(prorcpHtml);

      if (!sources.length) {
        return {
          ...this.empty("tokenize-failed", resolvedAt),
          subtitles,
          poster,
        };
      }

      return this.result(sources, subtitles, poster, resolvedAt);
    } catch (error) {
      return this.empty(
        error instanceof Error ? error.message : "resolve-error",
        resolvedAt,
        "error"
      );
    }
  }

  private buildEmbedUrl(
    tmdb: string,
    type: MediaType,
    season: number,
    episode: number
  ) {
    if (type === "movie") {
      return `${EMBED_BASE}/embed/movie/${encodeURIComponent(tmdb)}`;
    }

    const s = season && season > 0 ? season : 1;
    const e = episode && episode > 0 ? episode : 1;
    const template =
      process.env.VSE_TV_URL_TEMPLATE ||
      process.env.VIDSRC_TV_URL_TEMPLATE ||
      `${EMBED_BASE}/embed/tv/{tmdbId}/{season}-{episode}`;

    return template
      .replace(/\{tmdbId\}|\{tmdb_id\}/g, encodeURIComponent(tmdb))
      .replace(/\{season\}/g, encodeURIComponent(String(s)))
      .replace(/\{episode\}/g, encodeURIComponent(String(e)));
  }

  private async get(url: string, referer: string): Promise<string> {
    const { data } = await this.client.get<string>(url, {
      headers: { Referer: referer },
    });
    return typeof data === "string" ? data : String(data);
  }

  private parseRcpUrl(html: string): string {
    const escapedHost = RCP_HOST.replace(/\./g, "\\.");
    const match =
      html.match(new RegExp(`https?:\\/\\/${escapedHost}\\/rcp\\/[A-Za-z0-9+/=_-]+`)) ||
      html.match(new RegExp(`\\/\\/${escapedHost}\\/rcp\\/[A-Za-z0-9+/=_-]+`)) ||
      html.match(/https?:\/\/[^"'\s<>]+\/rcp\/[A-Za-z0-9+/=_-]+/) ||
      html.match(/\/\/[^"'\s<>]+\/rcp\/[A-Za-z0-9+/=_-]+/);

    return match ? this.toAbsoluteUrl(match[0], `https://${RCP_HOST}`) : "";
  }

  private parseProrcpUrl(html: string, baseUrl: string): string {
    const match =
      html.match(/https?:\/\/[^"'\s<>]+\/prorcp\/[A-Za-z0-9+/=_-]+/) ||
      html.match(/\/\/[^"'\s<>]+\/prorcp\/[A-Za-z0-9+/=_-]+/) ||
      html.match(/\/prorcp\/[A-Za-z0-9+/=_-]+/);

    return match ? this.toAbsoluteUrl(match[0], baseUrl) : "";
  }

  private toAbsoluteUrl(url: string, baseUrl: string): string {
    if (url.startsWith("//")) return `https:${url}`;
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(url, baseUrl).toString();
  }

  private findM3u8(text: string): string[] {
    const matches = text.match(/https?:\/\/[^"'\s\\)<>]+\.m3u8[^"'\s\\)<>]*/g);
    return matches ? [...new Set(matches.map((url) => this.cleanUrl(url)))] : [];
  }

  private parseMasterUrls(html: string): string[] {
    const match = html.match(/var\s+master_urls\s*=\s*(['"])([\s\S]*?)\1/);
    if (!match) return this.findM3u8(html);

    return match[2]
      .split(/\s+or\s+/g)
      .map((url) => this.cleanUrl(url.trim()))
      .filter((url) => /\.m3u8/i.test(url));
  }

  private cleanUrl(url: string): string {
    return url
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .replace(/^['"]|['"]$/g, "");
  }

  private async tokenize(rawUrls: string[]): Promise<VseSource[]> {
    const sources: VseSource[] = [];

    for (const rawUrl of rawUrls) {
      const labelMatch = rawUrl.match(/^\[([^\]]+)\]/);
      const quality = labelMatch ? labelMatch[1].trim() : "auto";
      const urlPart = rawUrl.replace(/^\[[^\]]+\]/, "");

      let host = "";
      try {
        host = new URL(urlPart).host;
      } catch {
        continue;
      }

      let finalUrl = urlPart;
      if (/__TOKEN(PG)?__/i.test(finalUrl)) {
        const token = await this.getToken(host);
        if (!token) continue;
        finalUrl = finalUrl.replace(/__TOKENPG__|__TOKEN__/g, token);
      }

      sources.push({ url: finalUrl, quality, host });
    }

    return sources;
  }

  private async getToken(host: string): Promise<string | null> {
    const cached = tokenCache.get(host);
    if (cached && Date.now() - cached.at < TOKEN_TTL_MS) {
      return cached.token;
    }

    try {
      const { data } = await this.client.get<string>(`https://${host}/generate.php`, {
        headers: { Referer: `https://${host}/` },
      });
      const token = (typeof data === "string" ? data : String(data)).trim();
      if (!token) return null;
      tokenCache.set(host, { token, at: Date.now() });
      return token;
    } catch {
      return null;
    }
  }

  private parseSubtitles(html: string): VseSubtitle[] {
    const match = html.match(/default_subtitles\s*=\s*(['"])([\s\S]*?)\1/);
    if (!match || !match[2] || match[2] === "[]") return [];

    const raw = this.cleanUrl(match[2]);

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((sub: any) => ({
            language:
              String(sub.language || sub.lang || sub.srclang || "").trim() ||
              this.langFromLabel(sub.label || sub.name),
            label: String(sub.label || sub.name || sub.title || "Sub").trim(),
            url: String(sub.file || sub.url || sub.src || "").trim(),
          }))
          .filter((sub) => /^https?:\/\//i.test(sub.url));
      }
    } catch {
      // PlayerJS subtitle format is handled below.
    }

    return raw
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const labelMatch = chunk.match(/^\[([^\]]+)\](.+)$/);
        if (!labelMatch) {
          return { language: "", label: "Sub", url: chunk };
        }
        return {
          language: this.langFromLabel(labelMatch[1]),
          label: labelMatch[1].trim(),
          url: labelMatch[2].trim(),
        };
      })
      .filter((sub) => /^https?:\/\//i.test(sub.url));
  }

  private langFromLabel(label?: string): string {
    const normalized = String(label || "").toLowerCase();
    if (/viet|vietnam|\bvi\b/.test(normalized)) return "vi";
    if (/eng|english|\ben\b/.test(normalized)) return "en";
    return normalized.slice(0, 2) || "un";
  }

  private parsePoster(html: string): string | undefined {
    const match = html.match(/poster\s*:\s*(['"])([^'"]+)\1/);
    if (!match) return undefined;
    return match[2].startsWith("//") ? `https:${match[2]}` : match[2];
  }

  private empty(
    reason: string,
    resolvedAt: string,
    status: "empty" | "error" = "empty"
  ): VseResolveResult {
    return {
      status,
      type: "hls",
      sources: [],
      subtitles: [],
      reason,
      resolvedAt,
    };
  }

  private result(
    sources: VseSource[],
    subtitles: VseSubtitle[],
    poster: string | undefined,
    resolvedAt: string
  ): VseResolveResult {
    return {
      status: "ok",
      type: "hls",
      sources,
      subtitles,
      poster,
      resolvedAt,
    };
  }
}

export default VseResolver;
