import "dotenv/config";
import fs from "fs";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";
import type { IZxcVerification } from "../app/model/ZxcVerification";

interface ResultRow {
  movieId: string;
  episodeId?: string | null;
  result: IZxcVerification;
}

const parseArgs = () => {
  const flags = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=", 2);
    flags.set(key, value ?? "true");
  }

  return {
    dryRun: flags.get("dry-run") === "true",
    input: flags.get("input") || "/tmp/zxc-results.json",
  };
};

const readRows = (input: string): ResultRow[] => {
  const rows = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!Array.isArray(rows)) throw new Error("Result file must be a JSON array");
  return rows;
};

const main = async () => {
  const args = parseArgs();
  const rows = readRows(args.input);

  await connectDB();

  const counts: Record<string, number> = {};
  let moviesMatched = 0;
  let episodesMatched = 0;

  for (const row of rows) {
    if (!row.movieId || !row.result?.status) continue;
    counts[row.result.status] = (counts[row.result.status] || 0) + 1;

    if (args.dryRun) continue;

    const movieUpdate = await Movie.updateOne(
      { _id: row.movieId },
      { $set: { zxc: row.result } }
    );
    moviesMatched += movieUpdate.matchedCount || 0;

    if (row.episodeId) {
      const episodeUpdate = await Episode.updateOne(
        { _id: row.episodeId },
        { $set: { zxc: row.result } }
      );
      episodesMatched += episodeUpdate.matchedCount || 0;
    } else {
      const episodeUpdate = await Episode.updateMany(
        { movie_id: row.movieId },
        { $set: { zxc: row.result } }
      );
      episodesMatched += episodeUpdate.matchedCount || 0;
    }
  }

  console.log(
    JSON.stringify(
      {
        input: args.input,
        rows: rows.length,
        dryRun: args.dryRun,
        counts,
        moviesMatched,
        episodesMatched,
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
