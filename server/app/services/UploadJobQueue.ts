import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import mongoose from "mongoose";

import Episode, { VideoFormat } from "../model/Episode";
import Movie from "../model/Movie";
import UploadJob, { type IUploadJob } from "../model/UploadJob";
import TiktokService from "../plugin/upload/tiktok/services/TiktokService";

const CANCELED_ERROR = "UPLOAD_JOB_CANCELED";

type EnqueuePayload = {
  jobId: string;
  type: "file" | "url" | "torrent";
  publicBaseUrl: string;
  sourceUrl?: string;
  filePath?: string;
  originalName?: string;
  fileSize?: number;
  episodeId?: string;
  serverName?: string;
  videoType?: string;
  seg?: number;
};

class UploadJobQueue {
  private started = false;
  private running = false;
  private cancelRequested = new Set<string>();
  private lastProgressWrite = new Map<string, { at: number; progress: number }>();
  private readonly tmpDir = path.join(process.cwd(), "upload", "tiktok", "tmp");
  private readonly multerTmpDir = path.join(process.cwd(), "tmp");
  private readonly torrentMetadataTimeoutSec = this.getPositiveEnvInt(
    "TORRENT_METADATA_TIMEOUT_SEC",
    180
  );
  private readonly torrentDownloadTimeoutSec = this.getPositiveEnvInt(
    "TORRENT_DOWNLOAD_TIMEOUT_SEC",
    7200
  );
  private readonly videoExtensions = new Set([
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".webm",
    ".ts",
    ".m2ts",
    ".flv",
    ".wmv",
    ".m4v",
  ]);

  public start() {
    if (this.started) return;
    this.started = true;
    void this.waitForDbAndResume();
  }

  public async enqueue(payload: EnqueuePayload) {
    await fsp.mkdir(this.tmpDir, { recursive: true });

    let episode: any = null;
    let movie: any = null;
    if (payload.episodeId && mongoose.Types.ObjectId.isValid(payload.episodeId)) {
      episode = await Episode.findById(payload.episodeId)
        .select("_id movie_id name episode")
        .lean();
      if (episode?.movie_id) {
        movie = await Movie.findById(episode.movie_id)
          .select("_id name origin_name")
          .lean();
      }
    }

    const job = await UploadJob.create({
      job_id: payload.jobId,
      type: payload.type,
      status: "queued",
      phase: "queued",
      progress: 0,
      message: "Waiting in upload queue",
      source_url: payload.sourceUrl || "",
      file_path: payload.filePath || "",
      original_name: payload.originalName || payload.sourceUrl || "Upload job",
      file_size: payload.fileSize || 0,
      public_base_url: payload.publicBaseUrl,
      episode_id: episode?._id,
      movie_id: movie?._id || episode?.movie_id,
      movie_name: movie?.name || movie?.origin_name || "",
      episode_name: episode?.name || "",
      server_name: payload.serverName || "TikTok Manual Upload",
      video_type: payload.videoType || "phude",
      seg: payload.seg || 4,
    });

    void this.pump();
    return job;
  }

  public async list(limit = 50) {
    return UploadJob.find({})
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(100, limit)))
      .lean();
  }

  public async cancel(jobId: string) {
    const job = await UploadJob.findOne({ job_id: jobId });
    if (!job) return null;

    if (job.status === "success" || job.status === "error" || job.status === "canceled") {
      return job;
    }

    this.cancelRequested.add(jobId);

    if (job.status === "queued") {
      job.status = "canceled";
      job.phase = "canceled";
      job.progress = 0;
      job.message = "Canceled before processing";
      job.cancel_requested = true;
      job.finishedAt = new Date();
      await job.save();
      await this.cleanupFile(job.file_path);
      return job;
    }

    job.cancel_requested = true;
    job.message = "Cancel requested. Stopping current step...";
    await job.save();
    return job;
  }

  private async waitForDbAndResume() {
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connection.asPromise();
      } catch {
        // The app process handles DB connection failures globally.
      }
    }

    await UploadJob.updateMany(
      { status: "running" },
      {
        $set: {
          status: "queued",
          phase: "queued",
          progress: 0,
          message: "Requeued after server restart",
          cancel_requested: false,
        },
      }
    );

    void this.pump();
  }

  private async pump() {
    if (this.running) return;
    this.running = true;

    try {
      while (true) {
        const job = await UploadJob.findOne({ status: "queued" }).sort({ createdAt: 1 });
        if (!job) break;
        await this.process(job.job_id);
      }
    } finally {
      this.running = false;
    }
  }

  private async process(jobId: string) {
    let inputPath = "";
    let downloadedPath = "";
    let cleanupTarget = "";
    let sourceUploadPath = "";
    let cancelPoll: ReturnType<typeof setInterval> | null = null;

    try {
      const job = await UploadJob.findOneAndUpdate(
        { job_id: jobId, status: "queued" },
        {
          $set: {
            status: "running",
            phase: "processing",
            progress: 0,
            message: "Starting upload job",
            startedAt: new Date(),
          },
        },
        { new: true }
      );
      if (!job) return;

      cancelPoll = this.startCancelPoll(job.job_id);
      this.assertNotCanceled(job.job_id);

      inputPath = job.file_path || "";
      if (job.type === "url") {
        downloadedPath = await this.downloadUrl(job);
        inputPath = downloadedPath;
      } else if (job.type === "torrent") {
        sourceUploadPath = job.file_path || "";
        const torrentResult = await this.downloadTorrent(job);
        inputPath = torrentResult.inputPath;
        cleanupTarget = torrentResult.cleanupPath;
      }

      if (!inputPath) throw new Error("No upload source found");
      this.assertNotCanceled(job.job_id);

      const preprocessProgress = job.type === "torrent" ? 25 : job.type === "url" ? 10 : 0;
      await this.forceProgress(
        job.job_id,
        Math.max(5, preprocessProgress),
        "Analyzing video format...",
        "processing"
      );
      const metadata = await TiktokService.probeVideo(inputPath);
      const qualityLabel = this.getQualityLabel(metadata.width, metadata.height);

      await UploadJob.updateOne(
        { job_id: job.job_id },
        {
          $set: {
            quality: qualityLabel,
            duration: metadata.duration,
            format: metadata.format,
            bitrate: metadata.bitrate,
            message: "Video analyzed. Encoding will start...",
          },
        }
      );

      this.assertNotCanceled(job.job_id);

      const result = await TiktokService.processJob(
        inputPath,
        Math.max(2, Math.min(10, Number(job.seg) || 4)),
        metadata.duration,
        (percent, message) => {
          this.writeProgress(job.job_id, Math.max(preprocessProgress, percent), message, "processing");
        },
        metadata.bitrate,
        () => this.cancelRequested.has(job.job_id)
      );

      this.assertNotCanceled(job.job_id);

      const publicBase = String(job.public_base_url || "").replace(/\/$/, "");
      const playlistUrl = `${publicBase}${result.playlistUrl}`;

      if (job.episode_id) {
        await this.attachToEpisode(job, playlistUrl, qualityLabel);
      }

      await UploadJob.updateOne(
        { job_id: job.job_id },
        {
          $set: {
            status: "success",
            phase: "done",
            progress: 100,
            message: "Upload complete",
            playlist_url: playlistUrl,
            relative_playlist_url: result.playlistUrl,
            tiktok_job_id: result.jobId,
            finishedAt: new Date(),
          },
        }
      );
    } catch (error: any) {
      const canceled = error?.message === CANCELED_ERROR || this.cancelRequested.has(jobId);
      await UploadJob.updateOne(
        { job_id: jobId },
        {
          $set: {
            status: canceled ? "canceled" : "error",
            phase: canceled ? "canceled" : "error",
            message: canceled ? "Canceled" : error?.message || "Upload job failed",
            error: canceled ? "" : error?.message || String(error),
            finishedAt: new Date(),
          },
        }
      );
    } finally {
      if (cancelPoll) clearInterval(cancelPoll);
      this.cancelRequested.delete(jobId);
      this.lastProgressWrite.delete(jobId);
      await this.cleanupFile(downloadedPath);
      await this.cleanupPath(cleanupTarget);
      await this.cleanupFile(sourceUploadPath);
      await this.cleanupFile(inputPath);
    }
  }

  private async attachToEpisode(job: IUploadJob, playlistUrl: string, quality: string) {
    const episode = await Episode.findById(job.episode_id);
    if (!episode) throw new Error(`Episode not found: ${job.episode_id}`);

    episode.videos = (episode.videos || []).map((video: any) => ({
      ...video,
      is_default: false,
    }));
    episode.videos.unshift({
      server_name: job.server_name || "TikTok Manual Upload",
      quality,
      url: playlistUrl,
      type: job.video_type || "phude",
      format: VideoFormat.M3U8,
      skip_intro: { start: 0, end: 0 },
      skip_outro: { start: 0, end: 0 },
      is_default: true,
    } as any);
    episode.types = Array.from(new Set([...(episode.types || []), job.video_type || "phude"]));
    await episode.save();

    await Movie.updateOne(
      { _id: String(episode.movie_id) },
      { $set: { has_local_video: true } }
    );
  }

  private async downloadUrl(job: IUploadJob) {
    const outputPath = path.join(this.tmpDir, `download_${job.job_id}.mp4`);
    await this.forceProgress(job.job_id, 1, "Downloading source URL...", "downloading");

    await new Promise<void>((resolve, reject) => {
      const ps = ffmpeg(String(job.source_url || ""))
        .outputOptions(["-c copy", "-bsf:a aac_adtstoasc", "-movflags +faststart"])
        .output(outputPath)
        .on("progress", (progress) => {
          if (this.cancelRequested.has(job.job_id)) {
            try {
              ps.kill("SIGTERM");
            } catch {}
            reject(new Error(CANCELED_ERROR));
            return;
          }
          if (progress.percent) {
            this.writeProgress(
              job.job_id,
              Math.min(10, Math.round(progress.percent / 10)),
              "Downloading source URL...",
              "downloading"
            );
          }
        })
        .on("error", (error) => reject(error))
        .on("end", () => resolve());
      ps.run();
    });

    return outputPath;
  }

  private async downloadTorrent(job: IUploadJob) {
    const source = job.file_path || String(job.source_url || "");
    if (!source) throw new Error("No torrent source found");

    const outputDir = path.join(this.tmpDir, `torrent_${job.job_id}`);
    await fsp.rm(outputDir, { recursive: true, force: true });
    await fsp.mkdir(outputDir, { recursive: true });

    await this.forceProgress(job.job_id, 1, "Loading torrent metadata...", "downloading");
    await this.runAria2(job, source, outputDir);
    this.assertNotCanceled(job.job_id);

    await this.forceProgress(job.job_id, 25, "Torrent downloaded. Selecting video file...", "downloading");
    const inputPath = await this.findLargestVideoFile(outputDir);
    if (!inputPath) {
      throw new Error("Torrent downloaded but no supported video file was found");
    }

    const stats = await fsp.stat(inputPath);
    await UploadJob.updateOne(
      { job_id: job.job_id },
      {
        $set: {
          file_path: inputPath,
          file_size: stats.size,
          original_name: path.basename(inputPath),
          message: "Torrent video selected. Encoding will start...",
        },
      }
    );

    return { inputPath, cleanupPath: outputDir };
  }

  private async runAria2(job: IUploadJob, source: string, outputDir: string) {
    const metadataTimeoutMs = this.torrentMetadataTimeoutSec * 1000;
    const downloadTimeoutMs = this.torrentDownloadTimeoutSec * 1000;

    await new Promise<void>((resolve, reject) => {
      const args = [
        "--dir",
        outputDir,
        "--seed-time=0",
        "--follow-torrent=mem",
        "--bt-save-metadata=true",
        `--bt-stop-timeout=${this.torrentMetadataTimeoutSec}`,
        "--enable-dht=true",
        "--enable-peer-exchange=true",
        "--bt-enable-lpd=false",
        "--bt-max-peers=80",
        "--max-connection-per-server=8",
        "--split=8",
        "--file-allocation=none",
        "--connect-timeout=20",
        "--timeout=20",
        "--retry-wait=5",
        "--max-tries=3",
        "--summary-interval=1",
        "--console-log-level=notice",
        "--download-result=hide",
        source,
      ];

      const ps = spawn("aria2c", args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output = "";
      let canceled = false;
      let settled = false;
      let metadataLoaded = false;
      let metadataLoadedAt = 0;
      let pendingError: Error | null = null;
      let cancelTimer: ReturnType<typeof setInterval> | null = null;
      let monitorTimer: ReturnType<typeof setInterval> | null = null;
      let hardKillTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (cancelTimer) clearInterval(cancelTimer);
        if (monitorTimer) clearInterval(monitorTimer);
        if (hardKillTimer) clearTimeout(hardKillTimer);
        if (error) reject(error);
        else resolve();
      };

      const requestStop = (error: Error) => {
        if (settled || pendingError) return;
        pendingError = error;
        try {
          ps.kill("SIGTERM");
        } catch {}

        hardKillTimer = setTimeout(() => {
          if (settled) return;
          try {
            ps.kill("SIGKILL");
          } catch {}
          finish(error);
        }, 5000);
      };

      const markMetadataLoaded = () => {
        if (metadataLoaded) return;
        metadataLoaded = true;
        metadataLoadedAt = Date.now();
        this.writeProgress(
          job.job_id,
          2,
          "Torrent metadata loaded. Starting download...",
          "downloading"
        );
      };

      const startedAt = Date.now();
      cancelTimer = setInterval(() => {
        if (!this.cancelRequested.has(job.job_id)) return;
        canceled = true;
        requestStop(new Error(CANCELED_ERROR));
      }, 1000);

      monitorTimer = setInterval(() => {
        if (this.cancelRequested.has(job.job_id)) {
          canceled = true;
          requestStop(new Error(CANCELED_ERROR));
          return;
        }

        if (!metadataLoaded && this.hasVideoCandidateSync(outputDir)) {
          markMetadataLoaded();
        }

        const elapsedMs = Date.now() - startedAt;
        if (!metadataLoaded) {
          const elapsedSec = Math.floor(elapsedMs / 1000);
          this.writeProgress(
            job.job_id,
            1,
            `Loading torrent metadata... ${elapsedSec}s/${this.torrentMetadataTimeoutSec}s`,
            "downloading"
          );

          if (elapsedMs >= metadataTimeoutMs) {
            requestStop(
              new Error(
                "Torrent metadata timeout. No peers returned metadata; try another magnet/torrent with seeders."
              )
            );
          }
          return;
        }

        if (elapsedMs >= downloadTimeoutMs) {
          const elapsedDownloadSec = Math.floor((Date.now() - metadataLoadedAt) / 1000);
          requestStop(
            new Error(
              `Torrent download timeout after ${elapsedDownloadSec}s. Try a healthier torrent or increase TORRENT_DOWNLOAD_TIMEOUT_SEC.`
            )
          );
        }
      }, 1000);

      const handleOutput = (chunk: Buffer) => {
        const text = chunk.toString();
        output = `${output}${text}`.slice(-6000);
        if (this.cancelRequested.has(job.job_id)) {
          canceled = true;
          requestStop(new Error(CANCELED_ERROR));
          return;
        }

        if (!metadataLoaded && this.hasVideoCandidateSync(outputDir)) {
          markMetadataLoaded();
        }

        const percentMatch = text.match(/\((\d{1,3})%\)/) || text.match(/\b(\d{1,3})%/);
        if (!percentMatch) return;
        if (!metadataLoaded) return;

        const torrentPercent = Math.max(0, Math.min(100, Number(percentMatch[1])));
        const progress = Math.min(24, Math.max(2, Math.round(torrentPercent / 4)));
        this.writeProgress(
          job.job_id,
          progress,
          `Downloading torrent... ${torrentPercent}%`,
          "downloading"
        );
      };

      ps.stdout.on("data", handleOutput);
      ps.stderr.on("data", handleOutput);
      ps.on("error", (error: any) => {
        const message = error?.code === "ENOENT"
          ? "aria2c is not installed in the server image"
          : error?.message || "aria2c failed";
        finish(new Error(message));
      });
      ps.on("close", (code) => {
        if (pendingError) finish(pendingError);
        else if (canceled) finish(new Error(CANCELED_ERROR));
        else if (code === 0) finish();
        else if (!metadataLoaded && !this.hasVideoCandidateSync(outputDir)) {
          finish(
            new Error(
              `Torrent metadata failed. No peers returned metadata; try another magnet/torrent with seeders. ${this.summarizeAria2Output(output)}`
            )
          );
        } else {
          finish(
            new Error(
              `Torrent download failed: aria2c exited ${code}. ${this.summarizeAria2Output(output)}`
            )
          );
        }
      });
    });
  }

  private getPositiveEnvInt(name: string, fallback: number) {
    const parsed = Number(process.env[name]);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private summarizeAria2Output(output: string) {
    const summary = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-8)
      .join(" | ")
      .slice(-1200);
    return summary ? `aria2 output: ${summary}` : "";
  }

  private hasVideoCandidateSync(rootDir: string) {
    try {
      if (!fs.existsSync(rootDir)) return false;
      const pending = [rootDir];
      while (pending.length) {
        const currentDir = pending.pop();
        if (!currentDir) continue;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            pending.push(entryPath);
            continue;
          }
          if (!entry.isFile()) continue;
          if (this.videoExtensions.has(path.extname(entry.name).toLowerCase())) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  }

  private async findLargestVideoFile(rootDir: string) {
    const candidates: Array<{ filePath: string; size: number }> = [];

    const walk = async (currentDir: string) => {
      const entries = await fsp.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(entryPath);
          continue;
        }
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase();
        if (!this.videoExtensions.has(ext)) continue;

        const stats = await fsp.stat(entryPath);
        candidates.push({ filePath: entryPath, size: stats.size });
      }
    };

    await walk(rootDir);
    candidates.sort((a, b) => b.size - a.size);
    return candidates[0]?.filePath || "";
  }

  private writeProgress(jobId: string, percent: number, message: string, phase: string) {
    const progress = Math.max(0, Math.min(100, Math.round(percent)));
    const now = Date.now();
    const last = this.lastProgressWrite.get(jobId);
    if (last && now - last.at < 1000 && Math.abs(progress - last.progress) < 2) return;
    this.lastProgressWrite.set(jobId, { at: now, progress });

    void UploadJob.updateOne(
      { job_id: jobId, status: "running" },
      { $set: { progress, message, phase } }
    ).catch(() => {});
  }

  private async forceProgress(jobId: string, progress: number, message: string, phase: string) {
    this.lastProgressWrite.set(jobId, { at: Date.now(), progress });
    await UploadJob.updateOne(
      { job_id: jobId, status: "running" },
      { $set: { progress, message, phase } }
    );
  }

  private assertNotCanceled(jobId: string) {
    if (this.cancelRequested.has(jobId)) {
      throw new Error(CANCELED_ERROR);
    }
  }

  private startCancelPoll(jobId: string) {
    return setInterval(() => {
      void UploadJob.exists({ job_id: jobId, cancel_requested: true })
        .then((found) => {
          if (found) this.cancelRequested.add(jobId);
        })
        .catch(() => {});
    }, 1000);
  }

  private getQualityLabel(width: number, height: number): string {
    if (height >= 2160) return "4K";
    if (height >= 1440) return "2K";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return `${width}x${height}`;
  }

  private isAllowedTmpPath(targetPath: string) {
    const resolved = path.resolve(targetPath);
    const allowedBases = [this.tmpDir, this.multerTmpDir].map((dir) => path.resolve(dir));
    return allowedBases.some((base) => resolved === base || resolved.startsWith(`${base}${path.sep}`));
  }

  private async cleanupFile(filePath?: string) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath) && this.isAllowedTmpPath(filePath)) {
        await fsp.unlink(filePath);
      }
    } catch {}
  }

  private async cleanupPath(targetPath?: string) {
    if (!targetPath) return;
    try {
      if (fs.existsSync(targetPath) && this.isAllowedTmpPath(targetPath)) {
        await fsp.rm(targetPath, { recursive: true, force: true });
      }
    } catch {}
  }
}

export default new UploadJobQueue();
