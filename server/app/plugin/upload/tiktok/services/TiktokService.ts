import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import crypto, { randomBytes } from "crypto";
import zlib from "zlib";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";

interface TiktokEnvConfig {
  cookie: string;
  userAgent: string;
}

// Type cho callback báo tiến độ
export type ProgressCallback = (percent: number, message: string) => void;
export type CancelCheck = () => boolean;

class TiktokService {
  private publicDir: string;
  private secureKeyDir: string;
  private readonly PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  private get config(): TiktokEnvConfig {
    const conf = {
      cookie: process.env.TIKTOK_COOKIE || "",
      userAgent:
        process.env.USER_AGENT ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    };

    if (!conf.cookie) {
      console.warn("⚠️ Runtime Warning: TIKTOK_COOKIE is missing!");
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
    onProgress?: ProgressCallback,
    shouldCancel?: CancelCheck
  ): Promise<void> {
    console.log("Run: ffmpeg", args.join(" "));
    return new Promise((resolve, reject) => {
      const ps = spawn("ffmpeg", args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      
      let stderr = "";
      let canceled = false;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(cancelTimer);
        if (error) reject(error);
        else resolve();
      };
      const cancelTimer = setInterval(() => {
        if (!shouldCancel?.()) return;
        canceled = true;
        try {
          ps.kill("SIGTERM");
        } catch {}
      }, 1000);
      
      ps.stderr.on("data", (d) => {
        const str = d.toString();
        stderr += str;
        if (shouldCancel?.()) {
          canceled = true;
          try {
            ps.kill("SIGTERM");
          } catch {}
          return;
        }

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
        if (canceled) finish(new Error("UPLOAD_JOB_CANCELED"));
        else if (code === 0) finish();
        else finish(new Error(`ffmpeg exited ${code}\n${stderr}`));
      });
    });
  }

  // --- TIKTOK API ---
  // --- TIKTOK LOSSLESS API BYPASS ---
  private hmacSha256(key: crypto.BinaryLike | crypto.KeyObject, msg: string | Buffer): Buffer {
    return crypto.createHmac("sha256", key).update(msg).digest();
  }

  private sha256Hex(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private getCanonicalQueryString(searchParams: URLSearchParams): string {
    const params: string[] = [];
    for (const [key, value] of searchParams.entries()) {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    return params.sort().join("&");
  }

  private async getSTSToken(cookieStr: string): Promise<any> {
    try {
      const res = await axios.get("https://www.tiktok.com/api/v1/video/upload/auth/?aid=1988", {
        headers: {
          Cookie: cookieStr,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.tiktok.com/",
        },
        timeout: 10000,
      });

      if (res.data?.video_token_v5) {
        return res.data.video_token_v5;
      }
      throw new Error("No video_token_v5 in response: " + JSON.stringify(res.data));
    } catch (err: any) {
      throw new Error(`Failed to get STS token: ${err.message}`);
    }
  }

  private async applyUpload(creds: any, cookieStr: string): Promise<any> {
    const applyUrl =
      "https://www.tiktok.com/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok_avatar&FileType=image&IsInner=1&s=yqpl39xuexr&device_platform=web";
    const urlObj = new URL(applyUrl);

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

    const headers: any = {
      host: urlObj.host,
      "x-amz-date": amzDate,
    };

    if (creds.securityToken) {
      headers["x-amz-security-token"] = creds.securityToken;
    }

    const canonQuery = this.getCanonicalQueryString(urlObj.searchParams);
    const sortedKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
    const canonHeaders =
      sortedKeys
        .map((k) => {
          const origKey = Object.keys(headers).find((h) => h.toLowerCase() === k);
          return `${k}:${headers[origKey!].trim()}`;
        })
        .join("\n") + "\n";
    const signedHdrs = sortedKeys.join(";");

    const canonicalRequest = ["GET", urlObj.pathname, canonQuery, canonHeaders, signedHdrs, this.sha256Hex("")].join(
      "\n"
    );
    const credentialScope = `${dateStamp}/${creds.region}/${creds.service}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, this.sha256Hex(canonicalRequest)].join("\n");

    const kDate = this.hmacSha256(`AWS4${creds.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, creds.region);
    const kService = this.hmacSha256(kRegion, creds.service);
    const kSigning = this.hmacSha256(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHdrs}, Signature=${signature}`;

    try {
      const res = await axios.get(applyUrl, {
        headers: {
          ...headers,
          Cookie: cookieStr,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      });
      if (res.data?.Result?.InnerUploadAddress) {
        return res.data;
      }
      throw new Error("No InnerUploadAddress in response: " + JSON.stringify(res.data));
    } catch (err: any) {
      throw new Error(`ApplyUploadInner failed: ${err.message}`);
    }
  }

  private async uploadToTOS(
    uploadHost: string,
    storeUri: string,
    authToken: string,
    fileBuffer: Buffer
  ): Promise<boolean> {
    const putUrl = `https://${uploadHost}/${storeUri}`;
    const res = await axios.put(putUrl, fileBuffer, {
      headers: {
        Authorization: authToken,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(fileBuffer.length),
        "X-Storage-U": "7000343721028862977",
        "content-crc32": "ignore",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });

    if (res.status === 200 && res.data?.success === 0) {
      return true;
    }
    throw new Error(`Upload failed with status ${res.status}: ${JSON.stringify(res.data)}`);
  }

  private async uploadToTiktokAPI(input: Buffer | string, originalFilename: string): Promise<string> {
    try {
      const fileBuffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
      const config = this.config;
      const cookieStr = config.cookie;
      if (!cookieStr) {
        throw new Error("Chưa cấu hình TIKTOK_COOKIE trong file .env");
      }

      // 1. Get STS Token
      const token = await this.getSTSToken(cookieStr);
      const creds = {
        accessKeyId: token.access_key_id,
        secretAccessKey: token.secret_acess_key,
        securityToken: token.session_token,
        region: "ap-singapore-1",
        service: "vod",
      };

      // 2. Apply Upload
      const applyData = await this.applyUpload(creds, cookieStr);
      const node = applyData.Result.InnerUploadAddress.UploadNodes[0];
      const storeUri = node.StoreInfos[0].StoreUri;
      const authToken = node.StoreInfos[0].Auth;
      const uploadHost = node.UploadHost;

      // 3. Upload file
      await this.uploadToTOS(uploadHost, storeUri, authToken, fileBuffer);

      // 4. Trả về URL bypass
      const publicUrl = `https://p16-oec-va.ibyteimg.com/origin/${storeUri}`;
      console.log(`[TiktokService] Lossless upload success: ${originalFilename} -> ${publicUrl}`);
      return publicUrl;
    } catch (e: any) {
      throw new Error(`Upload failed for ${originalFilename}: ${e.message}`);
    }
  }

  // --- ADAPTIVE SEGMENT SIZING (chia segment theo dung lượng MB) ---
  private positiveNumber(val: any, fallback: number): number {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return typeof n === "number" && isFinite(n) && n > 0 ? n : fallback;
  }

  private uploadThreadLimit(): number {
    return Math.max(
      1,
      Math.min(4, Math.floor(this.positiveNumber(process.env.UPLOAD_MAX_THREADS, 4)))
    );
  }

  private mbToBytes(mb: number): number {
    return Math.floor(mb * 1024 * 1024);
  }

  /**
   * Tính hls_time mục tiêu sao cho mỗi segment .ts xấp xỉ SEGMENT_TARGET_MB
   * và không vượt SEGMENT_MAX_MB, dựa trên bitrate nguồn.
   */
  private buildSizingPolicy(
    sourceBitrate: number,
    requestedSegDuration: number = 4
  ): {
    targetSegmentBytes: number;
    maxSegmentBytes: number;
    minSegmentDuration: number;
    maxSegmentDuration: number;
    selectedSegmentDuration: number;
    sourceBitrate: number;
    maxVideoBitrate: number;
    videoBufferSize: number;
  } {
    const targetMb = this.positiveNumber(process.env.SEGMENT_TARGET_MB, 3.5);
    const maxMb = this.positiveNumber(process.env.SEGMENT_MAX_MB, 5);
    const minSeconds = this.positiveNumber(process.env.SEGMENT_MIN_SECONDS, 0.5);
    const maxSeconds = this.positiveNumber(process.env.SEGMENT_MAX_SECONDS, 10);

    const targetBytes = this.mbToBytes(targetMb);
    const maxBytes = this.mbToBytes(maxMb);

    let selected = this.positiveNumber(requestedSegDuration, 4);
    const bitrate = this.positiveNumber(sourceBitrate, 0);
    if (bitrate > 0) {
      // Giữ segment <= 82% max để chừa biên cho dao động bitrate
      const sizingTargetBytes = Math.min(targetBytes, Math.floor(maxBytes * 0.82));
      selected = (sizingTargetBytes * 8) / bitrate; // giây
    }
    selected = Math.max(minSeconds, Math.min(maxSeconds, selected));
    selected = Math.round(selected * 100) / 100;

    const maxTotalBitrate = Math.floor((maxBytes * 8 * 0.85) / selected);
    const maxVideoBitrate = Math.max(300_000, maxTotalBitrate - 128_000);

    return {
      targetSegmentBytes: targetBytes,
      maxSegmentBytes: maxBytes,
      minSegmentDuration: minSeconds,
      maxSegmentDuration: maxSeconds,
      selectedSegmentDuration: selected,
      sourceBitrate: bitrate,
      maxVideoBitrate,
      videoBufferSize: Math.max(maxVideoBitrate, maxVideoBitrate * 2),
    };
  }

  // --- MAIN PROCESS ---
  public async processJob(
    inputFile: string,
    segDuration: number = 4,
    totalDurationSec: number, // Thời lượng video tổng (lấy từ probe)
    onProgress?: ProgressCallback,
    sourceBitrate?: number, // bitrate nguồn (bps) để chia segment theo MB
    shouldCancel?: CancelCheck
  ): Promise<{ jobId: string; playlistUrl: string }> {
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

    // Chia segment theo dung lượng MB dựa trên bitrate nguồn
    const policy = this.buildSizingPolicy(
      this.positiveNumber(sourceBitrate, 0),
      segDuration
    );
    let seg = policy.selectedSegmentDuration;
    const uploadThreads = this.uploadThreadLimit();
    const maxEncodeAttempts = Math.max(
      1,
      Math.min(
        3,
        Math.floor(
          this.positiveNumber(
            process.env.ENCODE_MAX_ATTEMPTS,
            process.env.ENCODE_RETRY_OVERSIZE === "true" ? 3 : 1
          )
        )
      )
    );
    console.log(
      `[Job ${jobId}] Sizing: target=${(policy.targetSegmentBytes / 1048576).toFixed(2)}MB ` +
      `max=${(policy.maxSegmentBytes / 1048576).toFixed(2)}MB ` +
      `bitrate=${policy.sourceBitrate || "?"}bps -> hls_time=${seg}s ` +
      `maxrate=${policy.maxVideoBitrate}bps attempts=${maxEncodeAttempts} threads=${uploadThreads}`
    );

    const buildArgs = (duration: number) => [
      "-y", "-i", inputFile, "-c:v", "libx264", "-preset", "ultrafast",
      "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "23", "-g", String(Math.max(1, Math.round(duration * 6))),
      "-threads", String(uploadThreads),
      "-maxrate:v", String(policy.maxVideoBitrate), "-bufsize:v", String(policy.videoBufferSize),
      "-force_key_frames", `expr:gte(t,n_forced*${duration})`,
      "-sc_threshold", "0", "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-hls_time", String(duration), "-hls_playlist_type", "vod",
      "-hls_segment_filename", segmentPattern,
      "-hls_key_info_file", keyInfoPath,
      "-hls_flags", "independent_segments",
      outM3u8,
    ];

    const clearGeneratedTs = async () => {
      try {
        const existing = await fsp.readdir(jobPublicDir);
        await Promise.all(
          existing
            .filter((f) => f.endsWith(".ts"))
            .map((f) => fsp.unlink(path.join(jobPublicDir, f)).catch(() => { }))
        );
      } catch { }
    };

    try {
      console.log(`[Job ${jobId}] FFmpeg Processing...`);
      if (onProgress) onProgress(0, "Starting encoding...");

      // Giai đoạn 1: FFmpeg + retry-shrink nếu segment vượt max (0-70%)
      let tsFiles: string[] = [];
      for (let attempt = 1; attempt <= maxEncodeAttempts; attempt++) {
        if (shouldCancel?.()) throw new Error("UPLOAD_JOB_CANCELED");
        await clearGeneratedTs();
        const attemptLabel = maxEncodeAttempts > 1 ? ` (${attempt}/${maxEncodeAttempts})` : "";
        if (onProgress) onProgress(0, `Starting encoding${attemptLabel}...`);
        console.log(`[Job ${jobId}] FFmpeg attempt ${attempt} với hls_time=${seg}s...`);
        await this.spawnFFmpeg(buildArgs(seg), totalDurationSec, onProgress, shouldCancel);
        if (shouldCancel?.()) throw new Error("UPLOAD_JOB_CANCELED");

        const files = await fsp.readdir(jobPublicDir);
        tsFiles = files.filter((f) => f.endsWith(".ts")).sort();

        // Kiểm tra segment lớn nhất
        let maxTsBytes = 0;
        for (const f of tsFiles) {
          try {
            const st = await fsp.stat(path.join(jobPublicDir, f));
            if (st.size > maxTsBytes) maxTsBytes = st.size;
          } catch { }
        }

        if (maxTsBytes <= policy.maxSegmentBytes || seg <= policy.minSegmentDuration) {
          break;
        }
        if (attempt >= maxEncodeAttempts) {
          console.warn(
            `[Job ${jobId}] Largest segment ${(maxTsBytes / 1048576).toFixed(2)}MB is above ` +
            `${(policy.maxSegmentBytes / 1048576).toFixed(2)}MB; continuing without another full re-encode.`
          );
          break;
        }
        const ratio = Math.max(0.1, Math.min(0.9, policy.maxSegmentBytes / maxTsBytes));
        const nextSeg = Math.max(
          policy.minSegmentDuration,
          Math.floor(seg * ratio * 0.9 * 100) / 100
        );
        if (nextSeg >= seg) break;
        console.log(
          `[Job ${jobId}] ⚠️ Segment lớn nhất ${(maxTsBytes / 1048576).toFixed(2)}MB > ` +
          `${(policy.maxSegmentBytes / 1048576).toFixed(2)}MB, retry với hls_time=${nextSeg}s...`
        );
        seg = nextSeg;
      }

      if (!tsFiles.length) {
        throw new Error("Không tạo được HLS segment từ video");
      }

      const uploadedData: { segment: string; imgUrl: string }[] = [];
      const BATCH_SIZE = uploadThreads;
      
      // Giai đoạn 2: Upload segment TS đã mã hóa lên TikTok PNG/iTXt (70-100%).
      const totalFiles = tsFiles.length;
      let processedFiles = 0;

      for (let i = 0; i < tsFiles.length; i += BATCH_SIZE) {
        if (shouldCancel?.()) throw new Error("UPLOAD_JOB_CANCELED");
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
        if (shouldCancel?.()) throw new Error("UPLOAD_JOB_CANCELED");
        uploadedData.push(...results);

        processedFiles += batch.length;
        if (onProgress) {
          const uploadPercent = 70 + Math.round((processedFiles / totalFiles) * 29);
          onProgress(uploadPercent, `Uploading segments... ${processedFiles}/${totalFiles}`);
        }
      }

      if (onProgress) onProgress(100, "Finalizing TikTok HLS playlist...");

      let m3u8Content = await fsp.readFile(outM3u8, "utf8");
      for (const item of uploadedData) {
        m3u8Content = m3u8Content.replace(item.segment, item.imgUrl);
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
  ): Promise<{ width: number; height: number; format: string; duration: number; bitrate: number }> {
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

          // bitrate (bps): ưu tiên format.bit_rate, fallback stream.bit_rate
          const bitrate =
            parseInt(format?.bit_rate || "0", 10) ||
            parseInt(stream?.bit_rate || "0", 10) ||
            0;

          resolve({
            width: stream.width,
            height: stream.height,
            format: format?.format_name || "unknown",
            duration: parseFloat(format?.duration || "0"),
            bitrate
          });
        } catch (e) {
          reject(new Error("Invalid probe output"));
        }
      });
    });
  }
}

export default new TiktokService();
