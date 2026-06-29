import axios from "axios";
import { Request, Response } from "express";
import { URL } from "url";
import crypto from "crypto";
import Episode from "../../model/Episode";
import { localTokenService } from "./services/LocalTokenService";
import https from "https"; // <--- 1. IMPORT HTTPS
import { checkFixedWindowRateLimit, setRateLimitHeaders } from "../../../utils/redisRateLimit";

// Agent TLS: mặc định XÁC THỰC chứng chỉ (an toàn).
// Chỉ tắt verify khi upstream dùng cert tự ký VÀ đặt ALLOW_INSECURE_TLS=true (opt-out có chủ đích).
const ignoreSslAgent = new https.Agent({
    rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== "true"
});

interface StreamRequest extends Request {
    params: {
        encryptedToken: string;
        [key: string]: any;
    };
}

class StreamController {
    constructor() {
        this.handleStream = this.handleStream.bind(this);
        this.streamSegment = this.streamSegment.bind(this);
    }

    // --- Helpers ---
    private getClientIp(req: Request): string {
        const xForwardedFor = req.headers["x-forwarded-for"];
        if (typeof xForwardedFor === "string") {
            return xForwardedFor.split(",")[0].trim();
        }
        let ip = req.socket.remoteAddress || "0.0.0.0";
        if (ip === "::1") ip = "127.0.0.1";
        if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
        return ip;
    }

    private setCorsHeaders(res: Response) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "X-Playback-Session, X-Signature, X-Timestamp, Content-Type, Authorization, Range");
        res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    }

    private async checkSegmentRateLimit(req: Request, res: Response): Promise<boolean> {
        const limit = 100;
        const result = await checkFixedWindowRateLimit({
            scope: "hls-segment",
            identity: this.getClientIp(req),
            max: limit,
            windowSeconds: 60,
        });
        setRateLimitHeaders(res, result, limit);
        return result.allowed;
    }

    // --- VALIDATE CAO CẤP ---
    private validateRequest(req: Request, encryptedToken: string): any | null {
        const payload = localTokenService.decrypt(encryptedToken);
        if (!payload) return null;

        // 1. Check IP
        const currentIp = this.getClientIp(req);
        if (process.env.NODE_ENV === "production" && currentIp !== payload.ip) return null;

        // 2. Check User Agent
        const currentUaHash = localTokenService.hashUserAgent(req.headers["user-agent"] || "");
        if (currentUaHash !== payload.ua) return null;

        // 3. Check Signature
        const clientSignature = req.headers["x-signature"] as string;
        const clientTimestamp = req.headers["x-timestamp"] as string;

        if (!clientSignature || !clientTimestamp) return null;

        // Chống Replay Attack (10s)
        const reqTime = parseInt(clientTimestamp, 10);
        const now = Date.now();
        if (Math.abs(now - reqTime) > 10000) return null;

        // Verify Hash
        const serverSignature = crypto
            .createHmac("sha256", payload.secret)
            .update(clientTimestamp)
            .digest("hex");

        if (clientSignature !== serverSignature) return null;

        // Logic Ân Hạn
        const GRACE_PERIOD = 24 * 60 * 60 * 1000;
        if (Date.now() > payload.exp + GRACE_PERIOD) return null;

        return payload;
    }

    // --- Handlers ---

    public async handleStream(req: StreamRequest, res: Response): Promise<any> {
        try {
            const { encryptedToken } = req.params;
            if (req.method === "OPTIONS") { this.setCorsHeaders(res); return res.status(204).end(); }
            this.setCorsHeaders(res);

            const payload = this.validateRequest(req, encryptedToken);
            if (!payload) return res.status(403).send("Access Denied");

            const episode: any = await Episode.findById(payload.id, { videos: 1 }).lean();
            if (!episode || !episode.videos[payload.index]) return res.status(404).send("Not found");

            const video = episode.videos[payload.index];

            // <--- 3. FIX: Thêm httpsAgent vào request lấy m3u8 --->
            const m3u8Response = await axios.get(video.url, {
                timeout: 10000,
                httpsAgent: ignoreSslAgent
            });

            const host = `${req.protocol}://${req.get("host")}`;
            const baseUrl = `${host}/stream/${encryptedToken}/seg/`;

            const rewritten = m3u8Response.data.replace(/^(?!#)(.+)$/gm, (m: string) => `${baseUrl}${m.trim()}`);
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            return res.send(rewritten);

        } catch (error) {
            console.error("HandleStream Error:", error);
            // Trả về lỗi 500 thay vì để crash server
            if (!res.headersSent) res.status(500).send("Stream Error");
        }
    }

    public async streamSegment(req: StreamRequest, res: Response) {
        try {
            const { encryptedToken } = req.params;
            const segmentPath = req.params[0];

            if (req.method === "OPTIONS") { this.setCorsHeaders(res); return res.status(204).end(); }
            this.setCorsHeaders(res);

            if (!(await this.checkSegmentRateLimit(req, res))) return res.status(429).send("Too many requests, please slow down.");

            const payload = this.validateRequest(req, encryptedToken);
            if (!payload || !segmentPath) return res.status(403).end();

            const episode: any = await Episode.findById(payload.id, { videos: 1 }).lean();
            if (!episode) return res.status(404).end();

            const video = episode.videos[payload.index];
            const base = new URL(".", video.url).href;

            let originUrl = segmentPath.startsWith("http") ? segmentPath : new URL(segmentPath, base).href;
            const queryParams = new URLSearchParams(req.query as any).toString();
            if (queryParams) originUrl += (originUrl.includes('?') ? '&' : '?') + queryParams;

            const isPlaylist = originUrl.includes(".m3u8");

            // <--- 4. FIX: Thêm httpsAgent vào request lấy segment --->
            const response = await axios({
                url: originUrl,
                method: "GET",
                responseType: isPlaylist ? "text" : "stream",
                timeout: 20000,
                headers: { "User-Agent": req.get("User-Agent") || "Mozilla/5.0", "Referer": base },
                decompress: true,
                httpsAgent: ignoreSslAgent // QUAN TRỌNG: Bỏ qua lỗi SSL ở đây
            });

            if (isPlaylist) {
                const host = `${req.protocol}://${req.get("host")}`;
                const lastSlash = segmentPath.lastIndexOf('/');
                const parent = lastSlash !== -1 ? segmentPath.substring(0, lastSlash + 1) : '';
                const baseUrl = `${host}/stream/${encryptedToken}/seg/${parent}`;
                const rewritten = response.data.replace(/^(?!#)(.+)$/gm, (m: string) => {
                    const l = m.trim(); return (l && !l.startsWith('http')) ? `${baseUrl}${l}` : l;
                });
                res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
                return res.send(rewritten);
            }

            if (response.headers["content-type"]) res.setHeader("Content-Type", response.headers["content-type"]);
            if (response.headers["content-length"]) res.setHeader("Content-Length", response.headers["content-length"]);
            res.setHeader("Cache-Control", "public, max-age=86400");

            response.data.pipe(res);
            response.data.on("error", () => res.end());

        } catch (error) {
            console.error("StreamSegment Error:", error);
            // Ngăn chặn crash server
            if (!res.headersSent) res.status(500).end();
        }
    }
}

export default new StreamController();
