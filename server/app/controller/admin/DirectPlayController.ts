import { Request, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const SECRET = process.env.PLAYBACK_TOKEN_SECRET || process.env.JWT_SECRET || "local-direct-play-secret";
const TTL_SECONDS = Number(process.env.PLAYBACK_TOKEN_TTL || 900);
const hitLog = new Map<string, { count: number; resetAt: number }>();

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function unbase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function clientFingerprint(req: Request): string {
  const ua = req.get("user-agent") || "";
  // Local iframe/player requests can flip between 127.0.0.1, ::1 and ::ffff:127.0.0.1.
  // Keep direct-play stable by binding to browser identity here; rate limit still uses the same fingerprint.
  return crypto.createHash("sha256").update(ua).digest("base64url").slice(0, 22);
}

function makeToken(req: Request, playlistUrl: string) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const nonce = crypto.randomBytes(10).toString("base64url");
  const fp = clientFingerprint(req);
  const u = base64url(playlistUrl);
  const payload = `${u}.${exp}.${nonce}.${fp}`;
  return { u, exp, nonce, fp, sig: sign(payload) };
}

function verifyToken(req: Request, q: any): { ok: boolean; reason?: string; playlistUrl?: string } {
  const { u, exp, nonce, fp, sig } = q;
  if (!u || !exp || !nonce || !fp || !sig) return { ok: false, reason: "missing token" };
  if (Number(exp) < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  const localHost = String(req.get("host") || "").startsWith("127.0.0.1") || String(req.get("host") || "").startsWith("localhost");
  if (!localHost && fp !== clientFingerprint(req)) return { ok: false, reason: "fingerprint mismatch" };
  const expected = sign(`${u}.${exp}.${nonce}.${fp}`);
  if (!crypto.timingSafeEqual(Buffer.from(String(sig)), Buffer.from(expected))) return { ok: false, reason: "bad signature" };
  return { ok: true, playlistUrl: unbase64url(String(u)) };
}

function rateLimit(req: Request, scope: string, max = 240): boolean {
  const key = `${scope}:${clientFingerprint(req)}`;
  const now = Date.now();
  const rec = hitLog.get(key);
  if (!rec || rec.resetAt < now) {
    hitLog.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

function publicBase(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function keyGuardQuery(q: any): string {
  return `u=${encodeURIComponent(q.u)}&exp=${encodeURIComponent(q.exp)}&nonce=${encodeURIComponent(q.nonce)}&fp=${encodeURIComponent(q.fp)}&sig=${encodeURIComponent(q.sig)}`;
}

class DirectPlayController {
  session = async (req: Request, res: Response) => {
    const playlistUrl = String(req.body?.playlist_url || req.query.url || "");
    const title = String(req.body?.title || req.query.title || "Direct play");
    if (!isHttpUrl(playlistUrl)) return res.status(400).json({ status: false, message: "Invalid playlist_url" });
    const token = makeToken(req, playlistUrl);
    const qs = keyGuardQuery(token);
    return res.json({
      status: true,
      data: {
        title,
        expires_at: token.exp,
        playlist_url: `${publicBase(req)}/api/v1/direct-play/playlist?${qs}`,
        player_url: `${process.env.CDN_PLAYER_URL || "http://localhost:5000/video.html"}?direct=1&src=${encodeURIComponent(`${publicBase(req)}/api/v1/direct-play/playlist?${qs}`)}&title=${encodeURIComponent(title)}`,
      },
    });
  };

  playlist = async (req: Request, res: Response) => {
    if (!rateLimit(req, "playlist", 60)) return res.status(429).send("rate limited");
    const token = verifyToken(req, req.query);
    if (!token.ok || !token.playlistUrl) return res.status(403).send(token.reason || "forbidden");
    const response = await fetch(token.playlistUrl);
    if (!response.ok) return res.status(response.status).send("playlist fetch failed");
    const text = await response.text();
    let segIndex = 0;
    const guard = keyGuardQuery(req.query);
    const rewritten = text.split(/\r?\n/).map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#EXT-X-KEY")) {
        return trimmed.replace(/URI="([^"]+)"/, (_m, uri) => {
          const absoluteKey = new URL(uri, publicBase(req)).toString();
          const jobId = absoluteKey.match(/\/key\/([^?]+)/)?.[1] || "unknown";
          const k = new URL(absoluteKey).searchParams.get("k") || "";
          return `URI="${publicBase(req)}/api/v1/direct-play/key/${jobId}?k=${encodeURIComponent(k)}&${guard}"`;
        });
      }
      if (!trimmed || trimmed.startsWith("#") || !isHttpUrl(trimmed)) return line;
      const packed = base64url(trimmed);
      const segSig = sign(`${packed}.${req.query.exp}.${req.query.nonce}.${req.query.fp}.${segIndex}`);
      return `${publicBase(req)}/api/v1/direct-play/segment-meta?seg=${packed}&i=${segIndex++}&s=${segSig}&${guard}`;
    }).join("\n");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    return res.send(rewritten);
  };

  segmentMeta = async (req: Request, res: Response) => {
    if (!rateLimit(req, "segment-meta", 600)) return res.status(429).json({ status: false, message: "rate limited" });
    const token = verifyToken(req, req.query);
    if (!token.ok) return res.status(403).json({ status: false, message: token.reason });
    const seg = String(req.query.seg || "");
    const i = String(req.query.i || "0");
    const s = String(req.query.s || "");
    const expected = sign(`${seg}.${req.query.exp}.${req.query.nonce}.${req.query.fp}.${i}`);
    if (!s || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) {
      return res.status(403).json({ status: false, message: "bad segment signature" });
    }
    return res.json({ status: true, data: { url: unbase64url(seg) } });
  };

  key = async (req: Request, res: Response) => {
    if (!rateLimit(req, "key", 120)) return res.status(429).send("rate limited");
    const token = verifyToken(req, req.query);
    if (!token.ok) return res.status(403).send(token.reason || "forbidden");
    const keyPath = path.join(process.cwd(), "/upload/tiktok/secure_keys", req.params.jobId, "enc.key");
    if (!fs.existsSync(keyPath)) return res.status(404).send("Key not found");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.send(fs.readFileSync(keyPath));
  };
}

export default new DirectPlayController();
