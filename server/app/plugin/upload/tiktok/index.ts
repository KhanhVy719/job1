import { Request, Response } from "express";
import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { pipeline } from "stream/promises";
import TiktokService from "./services/TiktokService";
import Episode, { VideoFormat } from "../../../model/Episode";
import Movie from "../../../model/Movie";
import UploadJobQueue from "../../../services/UploadJobQueue";
import ffmpeg from "fluent-ffmpeg";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface VideoInput {
  filePath: string;
  originalName: string;
  size: number;
  isTempDownload: boolean;
}

class UploadController {
  private readonly ALLOWED_EXTENSIONS = [
    ".mp4",
    ".m3u8",
    ".mov",
    ".avi",
    ".mkv",
    ".ts",
    ".flv",
    ".webm",
  ];
  private readonly TMP_DIR = path.join(process.cwd(), "/upload/tiktok/tmp");

  constructor() {
    if (!fs.existsSync(this.TMP_DIR)) {
      fs.mkdirSync(this.TMP_DIR, { recursive: true });
    }
  }

  // Helper: Gửi dữ liệu Stream (Newline Delimited JSON)
  private sendStreamData(
    res: Response,
    type: "info" | "progress" | "result" | "error",
    data: any
  ) {
    if (!res.writableEnded) {
      res.write(JSON.stringify({ type, ...data }) + "\n");
      (res as any).flush?.();
    }
  }

  // Helper: Format chất lượng (Width x Height -> Label)
  private getQualityLabel(width: number, height: number): string {
    if (height >= 2160) return "4K";
    if (height >= 1440) return "2K";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return `${width}x${height}`;
  }

  private downloadVideoWithFfmpeg = (
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      ffmpeg(url)
        .outputOptions([
          "-c copy", // Copy codec gốc cho nhanh (không encode lại)
          "-bsf:a aac_adtstoasc", // Filter quan trọng để fix lỗi audio khi tải từ M3U8 sang MP4
          "-movflags +faststart", // Tối ưu hóa file MP4
        ])
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("Spawned Ffmpeg with command: " + commandLine);
        })
        .on("progress", (progress) => {
          // Lưu ý: Download stream đôi khi không có % chính xác nếu không biết total duration
          if (onProgress && progress.percent) {
            onProgress(progress.percent);
          }
        })
        .on("error", (err) => {
          console.error("Download Error:", err);
          reject(new Error(`Failed to download video: ${err.message}`));
        })
        .on("end", () => {
          console.log("Download finished successfully");
          resolve();
        })
        .run();
    });
  };
  public upload = async (req: Request, res: Response): Promise<void> => {
    let videoInput: VideoInput | null = null;
    const reqFile = (req as MulterRequest).file;
    const reqUrl = req.body.url;

    // 1. SETUP HEADERS CHO STREAMING (QUAN TRỌNG)
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    (res as any).flushHeaders?.();

    try {
      this.sendStreamData(res, "info", { message: "Initializing..." });

      // 2. XỬ LÝ ĐẦU VÀO (FILE vs URL)
      if (reqFile) {
        // Case A: File Upload (Giữ nguyên)
        videoInput = {
          filePath: reqFile.path,
          originalName: reqFile.originalname,
          size: reqFile.size,
          isTempDownload: true,
        };
      } else if (reqUrl && typeof reqUrl === "string") {
        // Case B: URL (M3U8, HLS, Direct MP4)
        this.sendStreamData(res, "info", {
          message: "Downloading & Converting stream...",
        });

        // 1. ĐỊNH NGHĨA ĐƯỜNG DẪN (Nên đưa ra ngoài thư mục source code)
        // Thay vì để trong controller, hãy để ở root server/uploads/temp
        const tempDir = path.join(process.cwd(), "upload/tiktok", "tmp");

        // 2. QUAN TRỌNG: TẠO THƯ MỤC NẾU CHƯA CÓ
        if (!fs.existsSync(tempDir)) {
          // recursive: true giúp tạo cả folder cha nếu thiếu (vd: tạo cả uploads lẫn temp)
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // 3. Tạo tên file và đường dẫn đầy đủ
        const tempFileName = `download_${uuidv4()}.mp4`;
        const tempFilePath = path.join(tempDir, tempFileName);

        console.log("Saving to:", tempFilePath); // Log ra để kiểm tra

        // 4. GỌI HÀM DOWNLOAD (Giữ nguyên logic cũ)
        await this.downloadVideoWithFfmpeg(reqUrl, tempFilePath, (progress) => {
          this.sendStreamData(res, 'progress', { percent: progress, message: 'Downloading...' });
        });

        const stats = await fs.promises.stat(tempFilePath);
        const urlBasename = path.basename(reqUrl).split("?")[0];
        const cleanName =
          urlBasename && !urlBasename.endsWith(".m3u8")
            ? urlBasename
            : "livestream_record.mp4";

        videoInput = {
          filePath: tempFilePath,
          originalName: cleanName,
          size: stats.size,
          isTempDownload: true,
        };
      } else {
        throw new Error("No video provided.");
      }

      // 3. PROBE METADATA (Lấy thông tin kỹ thuật)
      this.sendStreamData(res, "info", {
        message: "Analyzing video format...",
      });

      const metadata = await TiktokService.probeVideo(videoInput.filePath);
      const qualityLabel = this.getQualityLabel(
        metadata.width,
        metadata.height
      );

      // --- TRẢ VỀ THÔNG TIN FILE (Theo đúng yêu cầu) ---
      // Gửi ngay lập tức để client hiển thị trước khi bắt đầu encode
      this.sendStreamData(res, "info", {
        fileName: videoInput.originalName,
        quality: qualityLabel, // VD: "1080p"
        duration: metadata.duration, // VD: 120.5 (seconds)
        format: metadata.format, // VD: "mov,mp4,m4a,3gp,3g2,mj2" hoặc "hls"
        size: videoInput.size, // VD: 1048576 (bytes)
      });
      // -------------------------------------------------

      // 4. BẮT ĐẦU XỬ LÝ JOB (FFMPEG + UPLOAD)
      let seg = Number(req.body.seg || 4);
      seg = Math.max(2, Math.min(10, seg));

      const result = await TiktokService.processJob(
        videoInput.filePath,
        seg,
        metadata.duration,
        // Callback tiến độ
        (percent, message) => {
          this.sendStreamData(res, "progress", { percent, message });
        },
        // bitrate nguồn (bps) để chia segment theo dung lượng MB
        (metadata as any).bitrate
      );

      // 5. HOÀN THÀNH
      const publicPlaylistUrl = `${req.protocol}://${req.get("host")}${result.playlistUrl}`;
      const episodeId = req.body.episode_id || req.body.episodeId;
      let attachedEpisode = false;

      // Upload thủ công: nếu admin gửi episode_id thì gắn playlist TikTok vào Episode.videos[].
      // Player sẽ ưu tiên videos[] tự host và chỉ fallback sang embed_url VidSrc khi videos[] rỗng.
      if (episodeId) {
        const episode = await Episode.findById(episodeId);
        if (!episode) {
          throw new Error(`Episode not found: ${episodeId}`);
        }

        const videoType = req.body.type || "phude";
        episode.videos = (episode.videos || []).map((v: any) => ({
          ...v,
          is_default: false,
        }));
        episode.videos.unshift({
          server_name: "TikTok Manual Upload",
          quality: qualityLabel,
          url: publicPlaylistUrl,
          type: videoType,
          format: VideoFormat.M3U8,
          skip_intro: { start: 0, end: 0 },
          skip_outro: { start: 0, end: 0 },
          is_default: true,
        } as any);
        episode.types = Array.from(new Set([...(episode.types || []), videoType]));
        await episode.save();
        await Movie.updateOne(
          { _id: String(episode.movie_id) },
          { $set: { has_local_video: true } }
        );
        attachedEpisode = true;
      }

      this.sendStreamData(res, "result", {
        success: true,
        data: {
          job_id: result.jobId,
          playlist_url: publicPlaylistUrl,
          relative_playlist_url: result.playlistUrl,
          attached_episode: attachedEpisode,
          preview_url: `${req.protocol}://${req.get("host")}/player.html?key=${
            result.jobId
          }`,
        },
      });

      res.end(); // Đóng stream
    } catch (error: any) {
      console.error("Upload Error:", error.message);
      this.sendStreamData(res, "error", {
        message: error.message || "Internal Server Error",
      });
      res.end();
    } finally {
      // 6. DỌN DẸP FILE TMP
      if (videoInput && videoInput.isTempDownload) {
        await this.cleanupFile(videoInput.filePath);
      }
    }
  };

  public enqueue = async (req: Request, res: Response): Promise<void> => {
    const reqFile = (req as MulterRequest).file;

    try {
      const sourceUrl = typeof req.body.url === "string" ? req.body.url.trim() : "";
      if (!reqFile && !sourceUrl) {
        res.status(400).json({ status: false, message: "No video or URL provided." });
        return;
      }

      const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
        .split(",")[0]
        .trim();
      const publicBaseUrl = `${proto}://${req.get("host")}`;
      const job = await UploadJobQueue.enqueue({
        jobId: uuidv4(),
        type: reqFile ? "file" : "url",
        publicBaseUrl,
        sourceUrl,
        filePath: reqFile?.path,
        originalName: reqFile?.originalname || sourceUrl.split("/").pop()?.split("?")[0] || "Remote video",
        fileSize: reqFile?.size || 0,
        episodeId: req.body.episode_id || req.body.episodeId,
        serverName: req.body.server_name || req.body.serverName || "TikTok Manual Upload",
        videoType: req.body.type || "phude",
        seg: Number(req.body.seg || 4),
      });

      res.status(202).json({ status: true, data: job, message: "Upload job queued" });
    } catch (error: any) {
      if (reqFile?.path) await this.cleanupFile(reqFile.path);
      res.status(500).json({
        status: false,
        message: error?.message || "Cannot queue upload job",
      });
    }
  };

  public jobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobs = await UploadJobQueue.list(Number(req.query.limit) || 50);
      res.json({ status: true, data: jobs });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error?.message || "Cannot load upload jobs",
      });
    }
  };

  public cancelJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await UploadJobQueue.cancel(req.params.jobId);
      if (!job) {
        res.status(404).json({ status: false, message: "Upload job not found" });
        return;
      }
      res.json({ status: true, data: job, message: "Upload job canceled" });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        message: error?.message || "Cannot cancel upload job",
      });
    }
  };

  /**
   * Tải file từ URL về thư mục tmp.
   * Hỗ trợ tải binary (mp4) hoặc text (m3u8).
   */
  private async downloadFileFromUrl(url: string): Promise<string> {
    try {
      // Dự đoán extension
      let ext = path.extname(url.split("?")[0]).toLowerCase();
      if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
        // Nếu không có đuôi, tạm gán .mp4, ffprobe sẽ check lại sau
        ext = ".mp4";
      }

      const filename = `${uuidv4()}${ext}`;
      const destPath = path.join(this.TMP_DIR, filename);

      const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream",
        timeout: 120000, // 2 phút timeout cho file to
        headers: {
          // Giả lập browser để tránh bị chặn tải
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      await pipeline(response.data, fs.createWriteStream(destPath));
      return destPath;
    } catch (err: any) {
      throw new Error(`Failed to download URL: ${err.message}`);
    }
  }

  public getKey = (req: Request, res: Response): void => {
    try {
      const { jobId } = req.params;
      const keyPath = path.join(
        process.cwd(),
        "/upload/tiktok/secure_keys",
        jobId,
        "enc.key"
      );
      if (!fs.existsSync(keyPath)) {
        res.status(404).send("Key not found");
        return;
      }
      const key = fs.readFileSync(keyPath);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Expires", "0");
      res.send(key);
    } catch (e) {
      res.status(500).end();
    }
  };

  private async cleanupFile(filePath: string) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fsp.unlink(filePath);
      }
    } catch (e) {}
  }
}

export default new UploadController();
