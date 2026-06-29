import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import zlib from "zlib";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";

interface TiktokEnvConfig {
  orgId: string;
  cookie: string;
  csrfToken: string;
  originLink: string;
  userAgent: string;
}

// Type cho callback báo tiến độ
export type ProgressCallback = (percent: number, message: string) => void;

class TiktokService {
  private publicDir: string;
  private secureKeyDir: string;
  private readonly PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  private get config(): TiktokEnvConfig {
    const conf = {
      orgId: process.env.TIKTOK_ORG_ID || "",
      cookie: process.env.TIKTOK_COOKIE || "",
      csrfToken: process.env.TIKTOK_CSRF_TOKEN || "",
      originLink:
        process.env.TIKTOK_ORIGIN_LINK ||
        "https://p16-ad-sg.tiktokcdn.com/origin/",
      userAgent:
        process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    };

    if (!conf.orgId || !conf.cookie) {
      console.warn(
        "⚠️ Runtime Warning: TIKTOK_ORG_ID or TIKTOK_COOKIE is missing!"
      );
    }
    return conf;
  }

  constructor() {
    this.publicDir = path.join(process.cwd(), "public", "upload");
    this.secureKeyDir = path.join(process.cwd(), "/upload/tiktok/secure_keys");

    if (!fs.existsSync(this.publicDir))
      fs.mkdirSync(this.publicDir, { recursive: true });
    if (!fs.existsSync(this.secureKeyDir))
      fs.mkdirSync(this.secureKeyDir, { recursive: true });
  }

  // --- PNG HELPERS (Giữ nguyên) ---
  private crc32(bytes: Buffer): number {
    let c = ~0 >>> 0;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  }

  private u32be(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n >>> 0, 0);
    return b;
  }

  private buildChunk(type: string, data: Buffer): Buffer {
    const len = this.u32be(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const crcIn = Buffer.concat([typeBuf, data]);
    const crc = this.u32be(this.crc32(crcIn));
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  private buildITXtChunk(
    keyword: string,
    textUtf8: string,
    compress = true
  ): Buffer {
    const kw = Buffer.from(keyword, "latin1");
    const zero = Buffer.from([0]);
    const compFlag = Buffer.from([compress ? 1 : 0]);
    const compMethod = Buffer.from([0]);
    const lang = zero;
    const translated = zero;
    const text = compress
      ? zlib.deflateSync(Buffer.from(textUtf8, "utf8"))
      : Buffer.from(textUtf8, "utf8");
    const data = Buffer.concat([
      kw,
      zero,
      compFlag,
      compMethod,
      lang,
      translated,
      text,
    ]);
    return this.buildChunk("iTXt", data);
  }

  private insertBeforeIEND(pngBuf: Buffer, chunks: Buffer[]): Buffer {
    if (!pngBuf.slice(0, 8).equals(this.PNG_SIG))
      throw new Error("PNG signature invalid");
    let off = 8,
      iend = -1;
    while (off + 12 <= pngBuf.length) {
      const len = pngBuf.readUInt32BE(off);
      const type = pngBuf.slice(off + 4, off + 8).toString("ascii");
      const tot = 12 + len;
      if (off + tot > pngBuf.length) throw new Error("PNG corrupted");
      if (type === "IEND") {
        iend = off;
        break;
      }
      off += tot;
    }
    if (iend < 0) throw new Error("IEND not found");
    return Buffer.concat([
      pngBuf.slice(0, iend),
      ...chunks,
      pngBuf.slice(iend),
    ]);
  }

  private makeIdenticalPng(seed = "default-seed"): Buffer {
    const width = 64,
      height = 64,
      cell = 4;
    const cols = width / cell;
    const rows = height / cell;
    const hash32 = (str: string) => {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    let state = hash32(String(seed));
    const rnd = () => {
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state >>>= 0;
      state ^= state << 5;
      state >>>= 0;
      return state >>> 0;
    };
    const randByte = () => rnd() & 0xff;
    const r = 64 + (randByte() & 0x7f);
    const g = 64 + (randByte() & 0x7f);
    const b = 64 + (randByte() & 0x7f);
    const fg = [r, g, b, 255];
    const bg = [0, 0, 0, 0];
    const pattern = Array.from({ length: rows }, () => Array(cols).fill(false));
    const half = Math.ceil(cols / 2);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < half; x++) {
        const on = (rnd() & 1) === 1;
        pattern[y][x] = on;
        pattern[y][cols - 1 - x] = on;
      }
    }
    const raw = Buffer.alloc((width * 4 + 1) * height);
    let off = 0;
    for (let y = 0; y < height; y++) {
      raw[off++] = 0;
      const gy = Math.floor(y / cell);
      for (let x = 0; x < width; x++) {
        const gx = Math.floor(x / cell);
        const useFg = pattern[gy][gx];
        const c = useFg ? fg : bg;
        raw[off++] = c[0];
        raw[off++] = c[1];
        raw[off++] = c[2];
        raw[off++] = c[3];
      }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const IHDR = this.buildChunk("IHDR", ihdr);
    const IDAT = this.buildChunk("IDAT", zlib.deflateSync(raw));
    const IEND = this.buildChunk("IEND", Buffer.alloc(0));
    return Buffer.concat([this.PNG_SIG, IHDR, IDAT, IEND]);
  }

  private embedPayload(inputPath: string): Buffer {
    const payload = fs.readFileSync(inputPath);
    const b64 = payload.toString("base64");
    const MAX_TEXT = 32 * 1024;
    const chunks = [];
    for (let i = 0, part = 0; i < b64.length; i += MAX_TEXT, part++) {
      const piece = b64.slice(i, i + MAX_TEXT);
      const keyword = `payload-${String(part + 1).padStart(4, "0")}`;
      chunks.push(this.buildITXtChunk(keyword, piece, true));
    }
    const seed = randomBytes(8).toString("hex");
    const base = this.makeIdenticalPng(seed);
    return this.insertBeforeIEND(base, chunks);
  }

  // --- FFMPEG HELPER (Có tính toán tiến độ) ---
  private async spawnFFmpeg(
    args: string[],
    totalDurationSec: number,
    onProgress?: ProgressCallback
  ): Promise<void> {
    console.log("Run: ffmpeg", args.join(" "));
    return new Promise((resolve, reject) => {
      const ps = spawn("ffmpeg", args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      
      let stderr = "";
      
      ps.stderr.on("data", (d) => {
        const str = d.toString();
        stderr += str;

        // Phân tích cú pháp: time=00:00:05.12
        if (onProgress && totalDurationSec > 0) {
            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
            if (timeMatch) {
                const hours = parseFloat(timeMatch[1]);
                const minutes = parseFloat(timeMatch[2]);
                const seconds = parseFloat(timeMatch[3]);
                const currentSec = hours * 3600 + minutes * 60 + seconds;
                
                // Quy ước: FFmpeg chiếm 70% tổng quá trình
                const percent = Math.min(70, Math.round((currentSec / totalDurationSec) * 70));
                onProgress(percent, `Encoding video... ${percent}%`);
            }
        }
      });

      ps.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}\n${stderr}`));
      });
    });
  }

  // --- TIKTOK API ---
  private async uploadToTiktokAPI(
    input: Buffer | string,
    originalFilename: string
  ): Promise<string> {
    const formData = new FormData();
    const config = this.config;

    if (Buffer.isBuffer(input)) {
      formData.append("Filedata", input, {
        filename: originalFilename,
        contentType: "image/png",
      });
    } else {
      formData.append("Filedata", fs.createReadStream(input));
    }

    const commonHeaders = {
      ...formData.getHeaders(),
      accept: "application/json, text/plain, */*",
      "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: "https://business.tiktok.com",
      pragma: "no-cache",
      referer: `https://business.tiktok.com/manage/material/image?org_id=${config.orgId}`,
      "user-agent": config.userAgent,
      "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      Cookie: config.cookie,
    };

    try {
      const uploadRes = await axios.post(
        `https://business.tiktok.com/api/v3/bm/material/image/upload/?org_id=${config.orgId}`,
        formData,
        { headers: commonHeaders, maxBodyLength: Infinity }
      );

      const imgUrl = uploadRes.data?.data?.image_info?.web_uri;
      if (!imgUrl) {
        throw new Error("Failed to upload image: No web_uri returned");
      }

      const name = "image_" + uuidv4().substring(0, 8);
      const createPayload = JSON.stringify({
        web_uri: imgUrl,
        original_web_uri: imgUrl,
        name: name,
        show_error: false,
      });

      await axios.post(
        `https://business.tiktok.com/api/v3/bm/material/image/create/?org_id=${config.orgId}`,
        createPayload,
        {
          headers: {
            ...commonHeaders,
            "content-type": "application/json",
            "x-csrftoken": config.csrfToken,
          },
        }
      );

      return imgUrl;
    } catch (e: any) {
      throw new Error(`Upload failed for ${originalFilename}: ${e.message}`);
    }
  }

  // --- MAIN PROCESS ---
  public async processJob(
    inputFile: string,
    segDuration: number = 4,
    totalDurationSec: number, // Thời lượng video tổng (lấy từ probe)
    onProgress?: ProgressCallback
  ): Promise<{ jobId: string; playlistUrl: string }> {
    const seg = Math.max(2, Math.min(10, segDuration));
    const jobId = uuidv4();
    const config = this.config;

    const now = new Date();
    const day = now.getDate();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    const relativePath = `${day}/${month}/${year}/${jobId}`;
    const jobPublicDir = path.join(this.publicDir, String(day), month, String(year), jobId);
    const jobKeyDir = path.join(this.secureKeyDir, jobId);

    await fsp.mkdir(jobPublicDir, { recursive: true });
    await fsp.mkdir(jobKeyDir, { recursive: true });

    const key = randomBytes(16);
    const token = randomBytes(16);

    const keyPath = path.join(jobKeyDir, "enc.key");
    await fsp.writeFile(keyPath, key);

    const keyUri = `/api/v1/key/${jobId}?k=${token.toString("base64")}`;
    const keyInfoPath = path.join(jobKeyDir, "enc.keyinfo");
    await fsp.writeFile(keyInfoPath, `${keyUri}\n${keyPath}\n`);

    const outM3u8 = path.join(jobPublicDir, "master.m3u8");
    const segmentPattern = path.join(jobPublicDir, "seg_%05d.ts");

    const args = [
      "-y", "-i", inputFile, "-c:v", "libx264", "-preset", "ultrafast",
      "-profile:v", "main", "-crf", "23", "-g", String(seg * 6),
      "-sc_threshold", "0", "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-hls_time", String(seg), "-hls_playlist_type", "vod",
      "-hls_segment_filename", segmentPattern,
      "-hls_key_info_file", keyInfoPath,
      "-hls_flags", "independent_segments",
      outM3u8,
    ];

    try {
      console.log(`[Job ${jobId}] FFmpeg Processing...`);
      if (onProgress) onProgress(0, "Starting encoding...");
      
      // Giai đoạn 1: FFmpeg (0-70%)
      await this.spawnFFmpeg(args, totalDurationSec, onProgress);

      const files = await fsp.readdir(jobPublicDir);
      const tsFiles = files.filter((f) => f.endsWith(".ts")).sort();

      const uploadedData: { segment: string; imgUrl: string }[] = [];
      const BATCH_SIZE = 5;
      
      // Giai đoạn 2: Upload (70-100%)
      const totalFiles = tsFiles.length;
      let processedFiles = 0;

      for (let i = 0; i < tsFiles.length; i += BATCH_SIZE) {
        const batch = tsFiles.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (tsFile) => {
          const tsPath = path.join(jobPublicDir, tsFile);
          let pngBuf = this.embedPayload(tsPath);

          const remainder = pngBuf.length % 4;
          if (remainder !== 0) {
            const padding = 4 - remainder;
            const padBuf = Buffer.alloc(padding, 0);
            pngBuf = Buffer.concat([pngBuf, padBuf]);
          }

          const imgUrl = await this.uploadToTiktokAPI(pngBuf, tsFile + ".png");
          await fsp.unlink(tsPath).catch(() => {});
          
          return { segment: tsFile, imgUrl };
        });

        const results = await Promise.all(promises);
        uploadedData.push(...results);

        // Update Upload Progress
        processedFiles += batch.length;
        if (onProgress) {
            // Map từ 70 -> 99%
            const uploadPercent = 70 + Math.round((processedFiles / totalFiles) * 29);
            onProgress(uploadPercent, `Uploading segments... ${processedFiles}/${totalFiles}`);
        }
      }

      if (onProgress) onProgress(100, "Finalizing playlist...");

      let m3u8Content = await fsp.readFile(outM3u8, "utf8");
      for (const item of uploadedData) {
        m3u8Content = m3u8Content.replace(item.segment, config.originLink + item.imgUrl);
      }
      await fsp.writeFile(outM3u8, m3u8Content);
      await fsp.unlink(keyInfoPath).catch(() => {});

      return {
        jobId,
        playlistUrl: `/upload/${relativePath}/master.m3u8`,
      };
    } catch (err) {
      console.error(`[Job ${jobId}] Failed:`, err);
      throw err;
    }
  }

  public async probeVideo(
    filePath: string
  ): Promise<{ width: number; height: number; format: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const args = [
        "-v", "quiet", "-print_format", "json", "-show_format",
        "-show_streams", "-select_streams", "v:0", filePath,
      ];
      const ps = spawn("ffprobe", args);
      let stdout = "";
      ps.stdout.on("data", (data) => { stdout += data.toString(); });
      ps.on("close", (code) => {
        if (code !== 0) return reject(new Error("Failed to probe video file."));
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams[0];
          const format = data.format;
          if (!stream) return reject(new Error("No video stream found"));
          
          resolve({
            width: stream.width,
            height: stream.height,
            format: format?.format_name || "unknown",
            duration: parseFloat(format?.duration || "0")
          });
        } catch (e) {
          reject(new Error("Invalid probe output"));
        }
      });
    });
  }
}

export default new TiktokService();