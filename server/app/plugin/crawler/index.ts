import ffmpeg from "fluent-ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import CleanupService from "./services/cleanup.service";
import TMDBSERVICE from "./services/tmdb.service";

ffmpeg.setFfprobePath(ffprobeInstaller.path);

class CrawlerTool {
  static async runTMDB(type = "ALL") {
    // TMDBSERVICE giờ tạo cả Movie + Season + Episode (kèm embed_url VidSrc).
    // Không còn phụ thuộc ophim/phimapi để lấy m3u8.
    if (type == "tv") {
      await TMDBSERVICE.runTv();
    } else if (type == "movie") {
      await TMDBSERVICE.runMovie();
    } else {
      await TMDBSERVICE.runTv();
      await TMDBSERVICE.runMovie();
    }
  }

  static async loc() {
    await CleanupService.runAllCleanupTasks();
  }
}

export default CrawlerTool;
