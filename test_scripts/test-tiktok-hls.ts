import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Force working directory to the server folder so process.cwd() resolves correctly
process.chdir(path.join(__dirname, "../server"));

dotenv.config(); // Will now read .env from the server folder

const videoPath = "D:/rophim/video_20260605_160015 copy.mp4";

async function runTest() {
  console.log("Checking if video file exists at:", videoPath);
  if (!fs.existsSync(videoPath)) {
    console.error("❌ Video file does not exist!");
    process.exit(1);
  }

  // Dynamically import TiktokService to prevent hoisting so process.chdir runs first
  const { default: TiktokService } = await import("../server/services/TiktokService");

  console.log("Probing video...");
  try {
    const metadata = await TiktokService.probeVideo(videoPath);
    console.log("Video Metadata:", metadata);

    console.log("Starting job process...");
    const result = await TiktokService.processJob(
      videoPath,
      4, // seg duration
      metadata.duration,
      (percent, message) => {
        console.log(`[Progress] ${percent}%: ${message}`);
      }
    );

    console.log("✅ Job completed successfully!");
    console.log("Result:", result);
  } catch (error) {
    console.error("❌ Job failed with error:", error);
  }
}

runTest();
