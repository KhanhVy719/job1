import { Request, Response } from "express";
import zlib from "zlib";

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function publicBase(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function extractPayloadFromPng(png: Buffer): Buffer {
  if (!png.slice(0, 8).equals(PNG_SIG)) {
    throw new Error("PNG signature invalid");
  }

  const parts: { keyword: string; value: string }[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.slice(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > png.length) throw new Error("PNG corrupted");

    if (type === "iTXt") {
      const data = png.slice(dataStart, dataEnd);
      const keywordEnd = data.indexOf(0);
      if (keywordEnd > 0) {
        const keyword = data.slice(0, keywordEnd).toString("latin1");
        if (keyword.startsWith("payload-")) {
          const compressed = data[keywordEnd + 1] === 1;
          let cursor = keywordEnd + 3; // null + compression flag + compression method
          const langEnd = data.indexOf(0, cursor);
          cursor = langEnd + 1;
          const translatedEnd = data.indexOf(0, cursor);
          cursor = translatedEnd + 1;
          const textBuf = data.slice(cursor);
          const text = (compressed ? zlib.inflateSync(textBuf) : textBuf).toString("utf8");
          parts.push({ keyword, value: text });
        }
      }
    }

    offset = dataEnd + 4;
  }

  if (!parts.length) throw new Error("Payload not found in PNG");
  const base64 = parts.sort((a, b) => a.keyword.localeCompare(b.keyword)).map((x) => x.value).join("");
  return Buffer.from(base64, "base64");
}

class HlsProxyController {
  playlist = async (req: Request, res: Response) => {
    try {
      const url = String(req.query.url || "");
      if (!isHttpUrl(url)) return res.status(400).send("Invalid playlist URL");

      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).send("Playlist fetch failed");
      const text = await response.text();
      const base = publicBase(req);
      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return line;
          if (!isHttpUrl(trimmed)) return line;
          return `${base}/api/v1/hls-proxy/segment?url=${encodeURIComponent(trimmed)}`;
        })
        .join("\n");

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      return res.send(rewritten);
    } catch (error: any) {
      return res.status(500).send(error.message || "Playlist proxy failed");
    }
  };

  jwDirectPlaylist = async (req: Request, res: Response) => {
    try {
      const url = String(req.query.url || "");
      if (!isHttpUrl(url)) return res.status(400).send("Invalid playlist URL");
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).send("Playlist fetch failed");
      const text = await response.text();
      const cdnBase = String(req.query.cdn || "http://localhost:5000").replace(/\/$/, "");
      const playlistBase = new URL(url);
      const serverBase = publicBase(req);
      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#EXT-X-KEY")) {
            return line.replace(/URI="([^"]+)"/, (_match, keyUri) => {
              const absoluteKey = new URL(String(keyUri), serverBase).toString();
              return `URI="${absoluteKey}"`;
            });
          }
          if (trimmed.startsWith("#")) return line;
          const absolute = new URL(trimmed, playlistBase).toString();
          if (!isHttpUrl(absolute)) return line;
          return `${cdnBase}/sw-hls/segment?url=${encodeURIComponent(absolute)}`;
        })
        .join("\n");
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      return res.send(rewritten);
    } catch (error: any) {
      return res.status(500).send(error.message || "JW direct playlist failed");
    }
  };

  segment = async (req: Request, res: Response) => {
    try {
      const url = String(req.query.url || "");
      if (!isHttpUrl(url)) return res.status(400).send("Invalid segment URL");
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).send("Segment fetch failed");
      const png = Buffer.from(await response.arrayBuffer());
      const segment = extractPayloadFromPng(png);
      res.setHeader("Content-Type", "video/mp2t");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(segment);
    } catch (error: any) {
      return res.status(500).send(error.message || "Segment proxy failed");
    }
  };
}

export default new HlsProxyController();
