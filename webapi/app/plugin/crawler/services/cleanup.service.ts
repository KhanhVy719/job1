import { sleep, generateSlug } from "../utils";

import Movie from "../../../model/Movie";
import Season from "../../../model/Season";
import Episode from "../../../model/Episode";

class CleanupService {
  public static async setupIndexes() {
    try {
      console.log("\n=======================================================");
      console.log(" 🚀 STEP 1: SETTING UP/REBUILDING UNIQUE INDEXES ");
      console.log("=======================================================");

      await Episode.collection
        .createIndex(
          { season_id: 1, episode: 1 },
          { unique: true, background: true }
        )
        .catch(() => {});
      console.log(" ✅ Episode Index (season_id + episode) verified.");

      await Season.collection
        .createIndex(
          { movie_id: 1, season_number: 1 },
          { unique: true, background: true }
        )
        .catch(() => {});
      console.log(" ✅ Season Index (movie_id + season_number) verified.");

      await Movie.collection
        .createIndex(
          { "tmdb.id": 1, "tmdb.type": 1 },
          { unique: true, background: true, sparse: true }
        )
        .catch(() => {});
      console.log(" ✅ Movie TMDB Index verified.");
    } catch (e) {
      console.error("❌ ERROR during Index setup.", e);
      throw e;
    }
  }

  public static async cleanupOrphanedReferences() {
    console.log("\n=======================================================");
    console.log(" 🧹 STEP 2: CLEANUP ORPHANED REFERENCES ");
    console.log("=======================================================");

    console.log(" 🔎 Cleaning Episode references in Season...");
    const seasons = await Season.find({
      "episodes.0": { $exists: true },
    }).lean();
    for (const season of seasons) {
      const existingEpisodeIds = season.episodes.map((id) => id.toString());
      const actualEpisodes = await Episode.find(
        { _id: { $in: existingEpisodeIds } },
        { _id: 1 }
      ).lean();
      const actualEpisodeIds = actualEpisodes.map((ep) => ep._id);

      if (actualEpisodeIds.length !== existingEpisodeIds.length) {
        const missingCount =
          existingEpisodeIds.length - actualEpisodeIds.length;
        await Season.updateOne(
          { _id: season._id },
          { $set: { episodes: actualEpisodeIds } }
        );
        console.log(
          ` -> Fixed Season ${season.season_number}. Removed ${missingCount} orphaned Episode IDs.`
        );
      }
      await sleep(50);
    }
    console.log(" ✅ Episode ID cleanup complete.");

    console.log(" 🔎 Cleaning Season references in Movie...");
    const movies = await Movie.find({ "seasons.0": { $exists: true } }).lean();
    for (const movie of movies) {
      const existingSeasonIds = movie.seasons.map((id) => id.toString());
      const actualSeasons = await Season.find(
        { _id: { $in: existingSeasonIds } },
        { _id: 1 }
      ).lean();
      const actualSeasonIds = actualSeasons.map((s) => s._id);
      if (actualSeasonIds.length !== existingSeasonIds.length) {
        const missingCount = existingSeasonIds.length - actualSeasonIds.length;
        await Movie.updateOne(
          { _id: movie._id },
          { $set: { seasons: actualSeasonIds } }
        );
        console.log(
          ` -> Fixed Movie "${movie.name}". Removed ${missingCount} orphaned Season IDs.`
        );
      }
      await sleep(50);
    }
    console.log(" ✅ Season ID cleanup complete.");
  }

  public static async deleteVideoDuplicates() {
    console.log("\n=======================================================");
    console.log(" 🗑️ STEP 3: DELETING VIDEO DUPLICATES (URL) ");
    console.log("=======================================================");
    const duplicateCheck = await Episode.aggregate([
      { $unwind: "$videos" },
      {
        $group: {
          _id: "$videos.url",
          count: { $sum: 1 },
          episodeIds: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 2000 },
    ]).allowDiskUse(true);

    if (duplicateCheck.length === 0) {
      console.log(" ✅ No episode video duplicates found.");
      return;
    }

    console.log(
      ` 🚨 Found ${duplicateCheck.length} duplicate video URLs! Deleting redundant episodes...`
    );
    let deletedCount = 0;
    for (const group of duplicateCheck) {
      if (group.episodeIds.length > 1) {
        const episodesToDelete = group.episodeIds.slice(1);

        await Episode.deleteMany({ _id: { $in: episodesToDelete } });
        deletedCount += episodesToDelete.length;
      }
      await sleep(10);
    }

    console.log(` ✅ Total video duplicates deleted: ${deletedCount}.`);

    await this.cleanupOrphanedReferences();
  }

  public static async fixInvalidSlugs() {
    console.log("\n=======================================================");
    console.log(" 🔧 STEP 4: FIXING INVALID OR MISSING SLUGS ");
    console.log("=======================================================");

    // --- Movie Slugs ---
    console.log(" 🔎 Fixing Movie slugs...");
    // FIX: Explicitly select 'name' and 'release_date'
    const invalidMovies = await Movie.find(
      {
        $or: [
          { slug: { $exists: false } },
          { slug: "" },
          { slug: { $regex: /^-?\d+-\d+$/ } },
        ],
      },
      { name: 1, release_date: 1 }
    ).lean();
    let movieFixedCount = 0;
    for (const movie of invalidMovies) {
      const year =
        movie.year || new Date().getFullYear();
      const baseName = `${movie.name} ${year} ${movie._id}`;
      const newSlug = generateSlug(baseName);

      await Movie.updateOne({ _id: movie._id }, { $set: { slug: newSlug } });
      console.log(` -> Fixed Movie "${movie.name}" slug to "${newSlug}".`);
      movieFixedCount++;
      await sleep(50);
    }
    console.log(` ✅ Fixed ${movieFixedCount} Movie slugs.`);

    // --- Season Slugs ---
    console.log(" 🔎 Fixing Season slugs...");
    // FIX: Explicitly select 'movie_id', 'season_number', and 'air_date'
    const invalidSeasons = await Season.find(
      {
        $or: [
          { slug: { $exists: false } },
          { slug: "" },
          { slug: { $regex: /^-?\d+-\d+$/ } },
        ],
      },
      { movie_id: 1, season_number: 1, air_date: 1 }
    ).lean();
    let seasonFixedCount = 0;
    for (const season of invalidSeasons) {
      // Note: movie.name is safe because findById has an explicit projection { name: 1 }
      const movie = await Movie.findById(season.movie_id, { name: 1 }).lean();
      const year = season.air_date?.getFullYear() || new Date().getFullYear();

      const baseName = movie
        ? `${movie.name} Season ${season.season_number} ${year} ${season._id}`
        : `Season ${season.season_number} ${year} ${season._id}`;

      const newSlug = generateSlug(baseName);

      await Season.updateOne({ _id: season._id }, { $set: { slug: newSlug } });
      console.log(
        ` -> Fixed Season ${season.season_number} slug to "${newSlug}".`
      );
      seasonFixedCount++;
      await sleep(50);
    }
    console.log(` ✅ Fixed ${seasonFixedCount} Season slugs.`);

    // --- Episode Slugs ---
    console.log(" 🔎 Fixing Episode slugs...");
    // FIX: Explicitly select 'season_id', 'episode', and 'air_date'
    const invalidEpisodes = await Episode.find(
      {
        $or: [
          { slug: { $exists: false } },
          { slug: "" },
          { slug: { $regex: /^-?\d+-\d+$/ } },
        ],
      },
      { season_id: 1, episode: 1, air_date: 1 }
    ).lean();
    let episodeFixedCount = 0;
    for (const episode of invalidEpisodes) {
      const season = await Season.findById(episode.season_id, {
        movie_id: 1,
        season_number: 1,
      }).lean();
      const movie = season
        ? await Movie.findById(season.movie_id, { name: 1 }).lean()
        : null;
      const year = episode.air_date?.getFullYear() || new Date().getFullYear();

      const baseName = movie
        ? `${movie.name} S${season?.season_number}E${episode.episode} ${year} ${episode._id}`
        : `Episode ${episode.episode} ${year} ${episode._id}`;

      const newSlug = generateSlug(baseName);

      await Episode.updateOne(
        { _id: episode._id },
        { $set: { slug: newSlug } }
      );
      console.log(` -> Fixed Episode ${episode.episode} slug to "${newSlug}".`);
      episodeFixedCount++;
      await sleep(50);
    }
    console.log(` ✅ Fixed ${episodeFixedCount} Episode slugs.`);
  }

  public static async runAllCleanupTasks() {
    console.log("\n--- BẮT ĐẦU CHƯƠNG TRÌNH BẢO TRÌ DỮ LIỆU ---");
    try {
      await this.setupIndexes();
      await this.cleanupOrphanedReferences();
      await this.deleteVideoDuplicates();
      await this.fixInvalidSlugs();
      console.log("--- HOÀN TẤT BẢO TRÌ THÀNH CÔNG ---");
    } catch (error) {
      console.error("Lỗi nghiêm trọng trong quá trình bảo trì:", error);
      throw error;
    }
  }
}
export default CleanupService;
