import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";
import Season from "../app/model/Season";
import type { IZxcVerification } from "../app/model/ZxcVerification";
import ZxcVerifier from "../app/services/ZxcVerifier";

type EpisodeMode = "first" | "all" | "none";

interface Args {
  dryRun: boolean;
  force: boolean;
  limit: number;
  slug?: string;
  mode: EpisodeMode;
  statuses: string[];
}

interface EpisodeTarget {
  episodeId: unknown;
  season: number;
  episode: number;
}

const parseArgs = (): Args => {
  const flags = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=", 2);
    flags.set(key, value ?? "true");
  }

  const mode = (flags.get("episodes") || "first") as EpisodeMode;
  if (!["first", "all", "none"].includes(mode)) {
    throw new Error("--episodes must be first, all, or none");
  }

  return {
    dryRun: flags.get("dry-run") === "true",
    force: flags.get("force") === "true",
    limit: Math.max(1, Number(flags.get("limit") || 25)),
    slug: flags.get("slug"),
    mode,
    statuses: (flags.get("statuses") || "unknown,missing,error")
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean),
  };
};

const isTv = (movie: any) => movie.tmdb?.type === "tv" || movie.type === "tv";

const getEpisodeTargets = async (movieId: unknown, mode: EpisodeMode): Promise<EpisodeTarget[]> => {
  if (mode === "none") return [];

  const seasons = await Season.find({ movie_id: movieId })
    .select("_id season_number")
    .sort({ season_number: 1 })
    .lean();

  const targets: EpisodeTarget[] = [];
  for (const season of seasons) {
    const episodes = await Episode.find({ season_id: season._id })
      .select("_id episode")
      .sort({ episode: 1 })
      .lean();

    for (const episode of episodes) {
      targets.push({
        episodeId: episode._id,
        season: season.season_number,
        episode: episode.episode,
      });
      if (mode === "first") return targets;
    }
  }

  return targets;
};

const aggregateEpisodeResults = (
  results: IZxcVerification[],
  total: number
): IZxcVerification => {
  const available = results.filter((result) => result.status === "available");
  if (available.length) {
    return {
      ...available[0],
      reason: `${available.length}/${total}-episodes-available`,
      sourceCount: available.reduce((sum, result) => sum + (result.sourceCount || 0), 0),
    };
  }

  const statusPriority: IZxcVerification["status"][] = ["mismatch", "missing", "error", "unknown"];
  const fallbackStatus =
    statusPriority.find((status) => results.some((result) => result.status === status)) || "unknown";
  const sample = results.find((result) => result.status === fallbackStatus) || results[0];

  return {
    ...sample,
    status: fallbackStatus,
    reason: `0/${total}-episodes-available:${sample?.reason || fallbackStatus}`,
    sourceCount: 0,
    verifiedAt: undefined,
  };
};

const verifyMovie = async (
  verifier: ZxcVerifier,
  movie: any,
  args: Args
): Promise<IZxcVerification> => {
  if (!isTv(movie)) {
    const result = await verifier.verify({ movie });
    if (!args.dryRun) {
      await Episode.updateMany({ movie_id: movie._id }, { $set: { zxc: result } });
    }
    return result;
  }

  const targets = await getEpisodeTargets(movie._id, args.mode);
  if (!targets.length) {
    return {
      status: "missing",
      checkedAt: new Date(),
      reason: "no-local-episodes",
      mediaType: "tv",
      tmdbId: String(movie.tmdb?.id || ""),
      sourceCount: 0,
    };
  }

  const results: IZxcVerification[] = [];
  for (const target of targets) {
    const result = await verifier.verify({
      movie,
      season: target.season,
      episode: target.episode,
    });
    results.push(result);

    if (!args.dryRun) {
      await Episode.updateOne({ _id: target.episodeId }, { $set: { zxc: result } });
    }
  }

  return aggregateEpisodeResults(results, targets.length);
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
    .limit(args.limit)
    .lean();

  const verifier = new ZxcVerifier();
  let available = 0;
  let missing = 0;
  let mismatch = 0;
  let error = 0;

  for (const movie of movies) {
    if (!args.dryRun) {
      await Movie.updateOne(
        { _id: movie._id },
        { $set: { "zxc.status": "checking", "zxc.checkedAt": new Date() } }
      );
    }

    const result = await verifyMovie(verifier, movie, args);
    if (!args.dryRun) {
      await Movie.updateOne({ _id: movie._id }, { $set: { zxc: result } });
    }

    if (result.status === "available") available += 1;
    else if (result.status === "missing") missing += 1;
    else if (result.status === "mismatch") mismatch += 1;
    else if (result.status === "error") error += 1;

    console.log(
      `[${result.status}] ${movie.slug} tmdb=${movie.tmdb?.id || ""} reason=${result.reason || ""} server=${result.server || ""}`
    );
  }

  console.log(
    `Done. checked=${movies.length} available=${available} missing=${missing} mismatch=${mismatch} error=${error} dryRun=${args.dryRun}`
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
