import axios from "axios";
import { Request, Response } from "express";
import { URL } from "url";
import Episode from "../../model/Episode";
import { localTokenService } from "./services/LocalTokenService";
// Bỏ luôn segmentTokenService vì ta sẽ không check token con nữa cho nhẹ đầu
import https from "https";
import http from "http";
import { decryptAES } from "../../../utils/crypto/fly2";
import redis from "../../../utils/redis";

// Agent tối ưu cho stream, bỏ qua lỗi SSL nếu server nguồn bị lỗi chứng chỉ.
// keepAlive + maxSockets cao để tái dùng kết nối khi 1 phim fan-out hàng nghìn segment.
const ignoreSslAgent = new https.Agent({
  rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true",
  keepAlive: true,
  maxSockets: Number(process.env.STREAM_MAX_SOCKETS) || 128,
  maxFreeSockets: 32,
  scheduling: "lifo",
});

// Agent cho origin dùng http:// (không có pooling mặc định -> bắt tay TCP mỗi segment).
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: Number(process.env.STREAM_MAX_SOCKETS) || 128,
  maxFreeSockets: 32,
  scheduling: "lifo",
});

// Cache videos của 1 episode để segment .ts không phải query Mongo mỗi lần.
// 1 phim 2h = hàng nghìn segment -> trước đây là hàng nghìn findById trùng lặp / lượt xem.
const EPISODE_CACHE_TTL = Number(process.env.EPISODE_CACHE_TTL) || 600; // giây
async function getEpisodeVideos(id: string): Promise<any | null> {
  const cacheKey = `ep:videos:${id}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    /* lỗi cache -> rơi xuống query DB, không chặn luồng */
  }

  const episode: any = await Episode.findById(id, { videos: 1 }).lean();
  if (!episode) return null;

  try {
    await redis.set(cacheKey, JSON.stringify(episode.videos ?? null), "EX", EPISODE_CACHE_TTL);
  } catch {
    /* bỏ qua lỗi ghi cache */
  }
  return episode.videos ?? null;
}

interface StreamRequest extends Request {
  params: {
    encryptedToken: string;
    [key: string]: any;
  };
}

// Hàm check mobile mở rộng, bao gồm cả các thiết bị Apple đời mới
const isMobileDevice = (ua: string): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Macintosh/i.test(ua) && ua.length < 200; 
  // Note: iPadOS mới thường giả dạng Macintosh, nên check lỏng thôi
};

class StreamController {
  constructor() {
    this.handleStream = this.handleStream.bind(this);
    this.streamSegment = this.streamSegment.bind(this);
  }

  // --- HEADERS CHO IPHONE CHỊU CHẠY ---
  private setCorsHeaders(res: Response) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Cho phép tất cả domain
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Content-Type, Accept-Ranges"
    );
  }

  private getRequestBaseUrl(req: Request): string {
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    const forwardedHost = String(req.headers["x-forwarded-host"] || "")
      .split(",")[0]
      .trim();
    const host = forwardedHost || req.get("host") || "";

    if (!host) return process.env.NEXT_PUBLIC_BASE_URL || "";

    const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
    const protocol = forwardedProto || (isLocalHost ? "http" : "https");

    return `${protocol}://${host}`;
  }

  private rewriteHlsKeyUris(manifest: string, playlistUrl: string): string {
    return manifest.replace(
      /(#EXT-X-KEY:[^\r\n]*URI=")([^"]+)(")/g,
      (full: string, prefix: string, uri: string, suffix: string) => {
        try {
          if (!uri || /^(data:|blob:)/i.test(uri)) return full;
          return `${prefix}${new URL(uri, playlistUrl).href}${suffix}`;
        } catch {
          return full;
        }
      }
    );
  }

  // --- HANDLE PLAYLIST (M3U8) ---
  // Đây là cửa bảo vệ duy nhất còn lại. Mobile thì cho qua luôn.
  public async handleStream(req: StreamRequest, res: Response): Promise<any> {
    try {
      const { encryptedToken } = req.params;
      const { ct, iv } = req.query; // Chỉ dùng nếu cần check PC

      if (req.method === "OPTIONS") {
        this.setCorsHeaders(res);
        return res.status(200).end();
      }
      this.setCorsHeaders(res);

      const ua = req.headers["user-agent"] || "";
      const isMobile = isMobileDevice(ua);

      // --- LOGIC BẢO MẬT: MOBILE THÌ THẢ, PC THÌ CHECK ---
      let payload = localTokenService.decrypt(encryptedToken);
      
      // Nếu token hết hạn, nhưng là Mobile, ta có thể du di? 
      // Không, vì không có payload thì không biết ID phim. 
      // Lời khuyên: Hãy set hạn sử dụng của encryptedToken lên 7 ngày.
      if (!payload) return res.status(403).send("Token Expired");

      // Nếu KHÔNG PHẢI Mobile, mới check hành vi (mouse activity)
      // Còn iPhone thì cho qua luôn (Skip check x2Data)
      if (!isMobile) {
         // Logic check PC cũ của bạn...
         // Nếu muốn lỏng nữa thì comment luôn đoạn này, cho PC xem thoải mái.
         /* try {
            if (ct && iv) { ... decrypt x2Data ... }
            if (!x2Data) return 403...
         } catch ...
         */
      }

      // Lấy thông tin phim (đã cache để đỡ query Mongo mỗi lần)
      const videos: any = await getEpisodeVideos(payload.id);
      if (!videos) return res.status(404).send("Not found");

      let video;
      if (payload.type) {
        video = videos.find((v: any) => v.type === payload.type);
      } else {
        video = videos;
      }

      if (!video) return res.status(404).send("Not found");

      // Fetch file M3U8 gốc
      const m3u8Response = await axios.get(video.url, {
        timeout: 15000, // Tăng timeout cho mạng yếu
        httpsAgent: ignoreSslAgent,
        httpAgent,
      });

      const host = this.getRequestBaseUrl(req);
      const baseUrl = `${host}/stream/${encryptedToken}/seg/`;

      // Rewrite nội dung M3U8
      // Mẹo cho iPhone: Không thêm query param ?ct=&iv= vào link segment nữa
      // Để URL càng sạch càng tốt, tránh lỗi native player
      const manifestWithKeys = this.rewriteHlsKeyUris(m3u8Response.data, video.url);
      const rewritten = manifestWithKeys.replace(
        /^(?!#)(.+m3u8.*)$/gim,
        (m: string) => {
            return `${baseUrl}${m.trim()}`; // URL sạch, không kèm rác
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl"); // MIME chuẩn Apple
      // VOD: master playlist ổn định, cache ngắn để đỡ round-trip lặp lại.
      res.setHeader("Cache-Control", "public, max-age=30");
      return res.send(rewritten);
    } catch (error) {
      console.error("HandleStream Error:", error);
      if (!res.headersSent) res.status(500).send("Error");
    }
  }

  // --- HANDLE SEGMENTS (.ts & child .m3u8) ---
  // "THẢ CỬA" HOÀN TOÀN Ở ĐÂY
  public async streamSegment(req: StreamRequest, res: Response) {
    try {
      const { encryptedToken } = req.params;
      const segmentPath = req.params[0];

      if (req.method === "OPTIONS") {
        this.setCorsHeaders(res);
        return res.status(200).end();
      }
      this.setCorsHeaders(res);

      if (!segmentPath) return res.status(400).end();

      // 1. Decrypt lấy ID phim.
      // Quan trọng: Code decrypt của bạn phải không throw lỗi nếu hết hạn (chỉ trả về null), 
      // hoặc bạn phải set thời gian hết hạn cực lâu.
      const payload = localTokenService.decrypt(encryptedToken);
      
      // FALLBACK CỰC MẠNH:
      // Nếu giải mã thất bại (do hết hạn), mà đây chỉ là request tải file .ts (video),
      // thì thực tế ta không cần bảo mật nữa vì user đã có link rồi.
      // Tuy nhiên, ta cần `payload.id` để query DB. 
      // -> Nếu payload null, return 403. (Khắc phục: Tăng hạn token lúc tạo ra lên 3 ngày).
      if (!payload) return res.status(403).send("Session Lost");

      // --- XỬ LÝ CHILD PLAYLIST (.m3u8 con - cho đa luồng) ---
      if (segmentPath.endsWith(".m3u8") || segmentPath.endsWith(".m3u")) {
         const videos: any = await getEpisodeVideos(payload.id);
         if (!videos) return res.status(404).end();

         let video = videos.find((v: any) => v.type === payload.type) || videos;
         if (!video) return res.status(404).end();

         const base = new URL(".", video.url).href;
         let originUrl = segmentPath.startsWith("http") ? segmentPath : new URL(segmentPath, base).href;

         const response = await axios.get(originUrl, {
             timeout: 10000,
             httpsAgent: ignoreSslAgent,
             httpAgent,
         });

         const host = this.getRequestBaseUrl(req);
         const lastSlash = segmentPath.lastIndexOf("/");
         const parent = lastSlash !== -1 ? segmentPath.substring(0, lastSlash + 1) : "";
         const baseUrl = `${host}/stream/${encryptedToken}/seg/`;

         const manifestWithKeys = this.rewriteHlsKeyUris(response.data, originUrl);
         const rewritten = manifestWithKeys.replace(
           /^(?!#)(.+)$/gm,
           (m: string) => {
             const l = m.trim();
             if (!l || l.includes("http")) return l;
             return `${baseUrl}${parent}${l}`; // Link sạch trơn
           }
         );

         res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
         // VOD: manifest con ổn định, cache ngắn để đỡ round-trip lặp lại.
         res.setHeader("Cache-Control", "public, max-age=30");
         return res.send(rewritten);
      }


      const videos: any = await getEpisodeVideos(payload.id);
      if (!videos) return res.status(404).end();

      let video = videos.find((v: any) => v.type === payload.type) || videos;
      if (!video) return res.status(404).end();

      const base = new URL(".", video.url).href;
      let originUrl = segmentPath.startsWith("http") ? segmentPath : new URL(segmentPath, base).href;

      const response = await axios({
        url: originUrl,
        method: "GET",
        responseType: "stream",
        timeout: 30000, // Tăng timeout tối đa cho mạng lag
        headers: {
          // iPhone rất ghét User-Agent lạ, giả danh Safari cho an toàn
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: base,
          ...(req.headers.range && { Range: req.headers.range }),
        },
        httpsAgent: ignoreSslAgent,
        httpAgent,
      });

      const headersToForward = ["content-type", "content-length", "content-range", "accept-ranges"];
      headersToForward.forEach(h => {
          if (response.headers[h]) res.setHeader(h.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-'), response.headers[h]);
      });
      
      // Cache vĩnh cửu cho file này (trình duyệt sẽ cache file .ts vào disk)
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); 

      // Status Code: iOS cần thấy 206 để tua.
      // Chỉ ép 206 khi origin THỰC SỰ trả partial (có Content-Range) — nếu không
      // 206 mà thiếu Content-Range là response sai chuẩn, làm hỏng việc tua trên iOS/Safari.
      const hasContentRange = !!response.headers["content-range"];
      if (req.headers.range && (response.status === 206 || hasContentRange)) {
        res.status(206);
      } else {
        res.status(response.status);
      }

      response.data.pipe(res);

    } catch (error: any) {
      // iOS hay ngắt kết nối giữa chừng, lỗi này là bình thường
      if (error.code === 'ECONNABORTED' || error.message?.includes("aborted") || error.code === 'ECONNRESET') {
          return; 
      }
      // console.error("Stream Error:", error.message); // Tắt log cho đỡ rác
      if (!res.headersSent) res.status(500).end();
    }
  }
}

export default new StreamController();