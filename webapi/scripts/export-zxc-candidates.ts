import "dotenv/config";
import fs from "fs";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";
import Season from "../app/model/Season";

type EpisodeMode = "first" | "none";

interface Args {
  force: boolean;
  limit: number;
  mode: EpisodeMode;
  output: string;
  skip: number;
  slug?: string;
  statuses: string[];
}

const parseArgs = (): Args => {
  const flags = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=", 2);
    flags.set(key, value ?? "true");
  }

  const mode = (flags.get("episodes") || "first") as EpisodeMode;
  if (!["first", "none"].includes(mode)) {
    throw new Error("--episodes must be first or none");
  }

  return {
    force: flags.get("force") === "true",
    limit: Math.max(1, Number(flags.get("limit") || 500)),
    mode,
    output: flags.get("output") || "/tmp/zxc-candidates.json",
    skip: Math.max(0, Number(flags.get("skip") || 0)),
    slug: flags.get("slug"),
    statuses: (flags.get("statuses") || "unknown,missing,error")
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean),
  };
};

const isTv = (movie: any) => movie.tmdb?.type === "tv" || movie.type === "tv";

const firstEpisodeTarget = async (movieId: unknown) => {
  const seasons = await Season.find({ movie_id: movieId })
    .select("_id season_number")
    .sort({ season_number: 1 })
    .lean();

  for (const season of seasons) {
    const episode = await Episode.findOne({ season_id: season._id })
      .select("_id episode")
      .sort({ episode: 1 })
      .lean();

    if (episode) {
      return {
        episodeId: String(episode._id),
        season: season.season_number,
        episode: episode.episode,
      };
    }
  }

  return undefined;
};

const main = async () => {
  const args = parseArgs();
  await connectDB();

  const query: any = {
    "tmdb.id": { $exists: true, $nin: ["", null] },
  };

  if (args.slug) {
    query.slug = args.slug;
  } else if (!args.force) {
    query.$or = [
      { "zxc.status": { $exists: false } },
      { "zxc.status": { $in: args.statuses } },
    ];
  }

  const movies = await Movie.find(query)
    .select("name origin_name slug type year tmdb imdb zxc")
    .sort({ updatedAt: -1 })
    .skip(args.skip)
    .limit(args.limit)
    .lean();

  const candidates = [];
  let tvWithoutEpisode = 0;

  for (const movie of movies) {
    const candidate: any = { movie };
    if (args.mode !== "none" && isTv(movie)) {
      const target = await firstEpisodeTarget(movie._id);
      if (!target) {
        tvWithoutEpisode += 1;
      } else {
        candidate.target = target;
      }
    }
    candidates.push(candidate);
  }

  fs.writeFileSync(args.output, JSON.stringify(candidates));
  console.log(
    `Exported ${candidates.length} candidates to ${args.output}. tvWithoutEpisode=${tvWithoutEpisode}`
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
