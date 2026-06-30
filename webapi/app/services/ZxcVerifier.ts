import axios, { AxiosInstance } from "axios";
import { createHash } from "crypto";

import type { IZxcVerification } from "../model/ZxcVerification";

const ZXC_KEYS = {
  salt: "213125663234242",
  tmdbId: "rgrwsdsdfgwrwrwwr",
  xt: "xfgdfgdsffgrwgrwyjhkjt",
  ts: "rdghhdghhfssft",
  sig: "ZDDVHJFGHYRHG",
  title: "TUKTHFSSFGDGHJS",
  year: "53653TRFG647GF",
  season: "adkljfhdahfladhfjahfjlahfhfljkadfdf",
  episode: "546745ygy46ytfgty",
  imdb: "564745ygtuy5yi75yuy",
};

const DEFAULT_SERVERS = ["icarus", "orion", "daedalus", "athena", "zeus", "atlas_v2"];

type ZxcMediaType = "movie" | "tv";

interface MovieLike {
  name?: string;
  origin_name?: string;
  slug?: string;
  type?: string;
  year?: number;
  tmdb?: {
    type?: string;
    id?: string;
  };
  imdb?: {
    id?: string;
  };
}

export interface ZxcVerifyInput {
  movie: MovieLike;
  season?: number;
  episode?: number;
}

interface ZxcDetails {
  id?: string | number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
  };
}

interface ZxcSourceResponse {
  success?: boolean;
  links?: Array<{ link?: string; type?: string; resolution?: number }>;
}

class ZxcVerifier {
  private client: AxiosInstance;
  private baseUrl: string;
  private servers: string[];

  constructor() {
    this.baseUrl = (process.env.ZXC_API_BASE || "https://a.zxcstream.xyz").replace(/\/+$/, "");
    this.servers = (process.env.ZXC_VERIFY_SERVERS || DEFAULT_SERVERS.join(","))
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: Number(process.env.ZXC_VERIFY_TIMEOUT_MS) || 8000,
      headers: {
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`,
        "User-Agent":
          process.env.ZXC_VERIFY_USER_AGENT ||
          "Mozilla/5.0 (compatible; RoPhim-ZXC-Verifier/1.0)",
      },
    });
  }

  async verify(input: ZxcVerifyInput): Promise<IZxcVerification> {
    const checkedAt = new Date();
    const tmdbId = String(input.movie.tmdb?.id || "").trim();
    const mediaType = this.mediaTypeFor(input.movie);

    if (!tmdbId) {
      return this.result("missing", checkedAt, {
        reason: "missing-tmdb-id",
        mediaType,
      });
    }

    if (mediaType === "tv" && (!input.season || !input.episode)) {
      return this.result("missing", checkedAt, {
        reason: "missing-season-episode",
        mediaType,
        tmdbId,
      });
    }

    try {
      const details = await this.fetchDetails(mediaType, tmdbId);
      const metadataResult = this.validateMetadata(input.movie, details, mediaType, tmdbId);
      if (metadataResult) {
        return this.result("mismatch", checkedAt, {
          ...metadataResult,
          mediaType,
          tmdbId,
          imdbId: this.imdbId(details),
          season: input.season,
          episode: input.episode,
        });
      }

      const token = await this.fetchToken(tmdbId);
      const sourceContext = this.buildSourceContext(input, details, mediaType, tmdbId, token);

      for (const server of this.servers) {
        try {
          const source = await this.fetchSource(server, sourceContext);
          const links = (source.links || []).filter((link) => !!link.link);
          if (source.success !== false && links.length > 0) {
            return this.result("available", checkedAt, {
              reason: "zxc-links-found",
              server,
              sourceCount: links.length,
              mediaType,
              tmdbId,
              imdbId: sourceContext.imdbId,
              season: input.season,
              episode: input.episode,
              matchedTitle: sourceContext.title,
              matchedYear: sourceContext.year ? Number(sourceContext.year) : undefined,
            });
          }
        } catch {
          // Try the next ZXC server. One failing server should not decide the movie.
        }
      }

      return this.result("missing", checkedAt, {
        reason: "no-zxc-links",
        mediaType,
        tmdbId,
        imdbId: sourceContext.imdbId,
        season: input.season,
        episode: input.episode,
        matchedTitle: sourceContext.title,
        matchedYear: sourceContext.year ? Number(sourceContext.year) : undefined,
      });
    } catch (error) {
      return this.result("error", checkedAt, {
        reason: error instanceof Error ? error.message : "zxc-verify-error",
        mediaType,
        tmdbId,
        season: input.season,
        episode: input.episode,
      });
    }
  }

  private mediaTypeFor(movie: MovieLike): ZxcMediaType {
    if (movie.tmdb?.type === "tv" || movie.type === "tv") return "tv";
    return "movie";
  }

  private async fetchDetails(mediaType: ZxcMediaType, tmdbId: string): Promise<ZxcDetails> {
    const language = process.env.ZXC_TMDB_LANGUAGE || "en-US";
    const { data } = await this.client.get<ZxcDetails>(
      `/backend/tmdb/details/${mediaType}/${tmdbId}`,
      { params: { language } }
    );
    if (!data?.id) throw new Error("zxc-details-not-found");
    return data;
  }

  private async fetchToken(tmdbId: string) {
    const rt = Date.now();
    const xt = createHash("sha512")
      .update(`${rt}:${ZXC_KEYS.salt}:${tmdbId}`)
      .digest("hex")
      .slice(0, 64);

    const { data } = await this.client.post("/backend/token", {
      [ZXC_KEYS.tmdbId]: tmdbId,
      [ZXC_KEYS.xt]: xt,
      [ZXC_KEYS.ts]: rt,
    });

    if (!data?.[ZXC_KEYS.ts] || !data?.[ZXC_KEYS.sig]) {
      throw new Error("zxc-token-failed");
    }

    return {
      xt,
      ts: data[ZXC_KEYS.ts],
      sig: data[ZXC_KEYS.sig],
    };
  }

  private buildSourceContext(
    input: ZxcVerifyInput,
    details: ZxcDetails,
    mediaType: ZxcMediaType,
    tmdbId: string,
    token: { xt: string; ts: string | number; sig: string }
  ) {
    const date = this.releaseDate(details);
    const title = this.remoteTitle(details);
    const year = this.yearFromDate(date) || input.movie.year || "";

    return {
      mediaType,
      tmdbId,
      imdbId: this.imdbId(details),
      season: input.season,
      episode: input.episode,
      title,
      year: String(year),
      date,
      ...token,
    };
  }

  private async fetchSource(
    server: string,
    context: ReturnType<ZxcVerifier["buildSourceContext"]>
  ): Promise<ZxcSourceResponse> {
    const params = new URLSearchParams({
      [ZXC_KEYS.tmdbId]: context.tmdbId,
      b: context.mediaType,
      [ZXC_KEYS.ts]: String(context.ts),
      [ZXC_KEYS.sig]: context.sig,
      [ZXC_KEYS.xt]: context.xt,
      [ZXC_KEYS.title]: context.title,
      [ZXC_KEYS.year]: context.year,
      date: context.date,
    });

    if (context.mediaType === "tv") {
      params.append(ZXC_KEYS.season, String(context.season || 1));
      params.append(ZXC_KEYS.episode, String(context.episode || 1));
    }

    if (context.imdbId) params.append(ZXC_KEYS.imdb, context.imdbId);

    const { data } = await this.client.get<ZxcSourceResponse>(
      `/backend_/servers/${server}?${params.toString()}`
    );
    return data;
  }

  private validateMetadata(
    movie: MovieLike,
    details: ZxcDetails,
    mediaType: ZxcMediaType,
    tmdbId: string
  ) {
    const remoteTmdbId = String(details.id || "");
    if (remoteTmdbId && remoteTmdbId !== tmdbId) {
      return { reason: `tmdb-mismatch:${remoteTmdbId}` };
    }

    const remoteImdb = this.imdbId(details);
    const localImdb = String(movie.imdb?.id || "").trim();
    if (localImdb && remoteImdb && localImdb !== remoteImdb) {
      return { reason: `imdb-mismatch:${remoteImdb}` };
    }

    const localYear = Number(movie.year) || 0;
    const remoteYear = this.yearFromDate(this.releaseDate(details));
    if (localYear && remoteYear && Math.abs(localYear - remoteYear) > 1) {
      return {
        reason: `year-mismatch:${remoteYear}`,
        matchedTitle: this.remoteTitle(details),
        matchedYear: remoteYear,
      };
    }

    if (localImdb && remoteImdb && localImdb === remoteImdb) return null;

    const strictTitle = process.env.ZXC_VERIFY_STRICT_TITLE !== "false";
    if (!strictTitle) return null;

    const score = this.bestTitleScore(
      [movie.name, movie.origin_name, movie.slug],
      [details.title, details.name, details.original_title, details.original_name]
    );

    if (score < (mediaType === "tv" ? 0.45 : 0.5)) {
      return {
        reason: `title-mismatch:${score.toFixed(2)}`,
        matchedTitle: this.remoteTitle(details),
        matchedYear: remoteYear || undefined,
      };
    }

    return null;
  }

  private bestTitleScore(localTitles: Array<string | undefined>, remoteTitles: Array<string | undefined>) {
    let best = 0;
    for (const localTitle of localTitles.map((value) => this.normalizeTitle(value)).filter(Boolean)) {
      for (const remoteTitle of remoteTitles.map((value) => this.normalizeTitle(value)).filter(Boolean)) {
        if (localTitle === remoteTitle) best = Math.max(best, 1);
        else if (localTitle.includes(remoteTitle) || remoteTitle.includes(localTitle)) best = Math.max(best, 0.9);
        else best = Math.max(best, this.tokenOverlap(localTitle, remoteTitle));
      }
    }
    return best;
  }

  private tokenOverlap(left: string, right: string) {
    const leftTokens = new Set(left.split(" ").filter((token) => token.length > 1));
    const rightTokens = new Set(right.split(" ").filter((token) => token.length > 1));
    if (!leftTokens.size || !rightTokens.size) return 0;
    let hits = 0;
    for (const token of leftTokens) {
      if (rightTokens.has(token)) hits += 1;
    }
    return hits / Math.min(leftTokens.size, rightTokens.size);
  }

  private normalizeTitle(value?: string) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(the|a|an|movie|series|season|part|tap|phan)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private remoteTitle(details: ZxcDetails) {
    return details.title || details.name || details.original_title || details.original_name || "";
  }

  private imdbId(details: ZxcDetails) {
    return String(details.imdb_id || details.external_ids?.imdb_id || "").trim();
  }

  private releaseDate(details: ZxcDetails) {
    return String(details.release_date || details.first_air_date || "");
  }

  private yearFromDate(date: string) {
    const match = String(date || "").match(/^(\d{4})/);
    return match ? Number(match[1]) : 0;
  }

  private result(
    status: IZxcVerification["status"],
    checkedAt: Date,
    data: Omit<Partial<IZxcVerification>, "status" | "checkedAt" | "verifiedAt">
  ): IZxcVerification {
    return {
      status,
      checkedAt,
      verifiedAt: status === "available" ? checkedAt : undefined,
      reason: data.reason || "",
      server: data.server || "",
      sourceCount: data.sourceCount || 0,
      mediaType: data.mediaType,
      tmdbId: data.tmdbId,
      imdbId: data.imdbId,
      season: data.season,
      episode: data.episode,
      matchedTitle: data.matchedTitle,
      matchedYear: data.matchedYear,
    };
  }
}

export default ZxcVerifier;
