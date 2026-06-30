import "dotenv/config";
import fs from "fs";

import ZxcVerifier from "../app/services/ZxcVerifier";
import type { IZxcVerification } from "../app/model/ZxcVerification";

interface Candidate {
  movie: any;
  target?: {
    episodeId: string;
    season: number;
    episode: number;
  };
}

interface ResultRow {
  movieId: string;
  episodeId: string | null;
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
    concurrency: Math.max(1, Number(flags.get("concurrency") || 2)),
    force: flags.get("force") === "true",
    input: flags.get("input") || "zxc-candidates.json",
    limit: Math.max(0, Number(flags.get("limit") || 0)),
    offset: Math.max(0, Number(flags.get("offset") || 0)),
    output: flags.get("output") || "zxc-results.json",
  };
};

const resultKey = (movieId: string, episodeId: string | null) => {
  return `${movieId}:${episodeId || "movie"}`;
};

const readJsonArray = <T>(file: string, fallback: T[] = []): T[] => {
  if (!fs.existsSync(file)) return fallback;
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(value)) throw new Error(`${file} must be a JSON array`);
  return value;
};

const writeResults = (file: string, rows: ResultRow[]) => {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows));
  fs.renameSync(tmp, file);
};

const verifyCandidate = async (
  verifier: ZxcVerifier,
  candidate: Candidate
): Promise<ResultRow> => {
  const movie = candidate.movie;
  const target = candidate.target;
  const result = await verifier.verify({
    movie,
    season: target?.season,
    episode: target?.episode,
  });

  return {
    movieId: String(movie._id),
    episodeId: target?.episodeId ? String(target.episodeId) : null,
    result,
  };
};

const main = async () => {
  const args = parseArgs();
  const allCandidates = readJsonArray<Candidate>(args.input);
  const selected = allCandidates.slice(
    args.offset,
    args.limit ? args.offset + args.limit : undefined
  );

  const results = readJsonArray<ResultRow>(args.output, []);
  const done = new Set(
    args.force
      ? []
      : results.map((row) => resultKey(String(row.movieId), row.episodeId || null))
  );
  const pending = selected.filter((candidate) => {
    const movieId = String(candidate.movie?._id || "");
    if (!movieId) return false;
    const episodeId = candidate.target?.episodeId ? String(candidate.target.episodeId) : null;
    return !done.has(resultKey(movieId, episodeId));
  });

  console.log(
    `Loaded candidates=${allCandidates.length} selected=${selected.length} pending=${pending.length} existingResults=${results.length}`
  );

  let cursor = 0;
  const verifier = new ZxcVerifier();

  const worker = async () => {
    while (cursor < pending.length) {
      const index = cursor;
      cursor += 1;
      const candidate = pending[index];
      const slug = candidate.movie?.slug || candidate.movie?._id || "unknown";

      try {
        const row = await verifyCandidate(verifier, candidate);
        results.push(row);
        writeResults(args.output, results);
        console.log(
          `[${results.length}] ${row.result.status} ${slug} reason=${row.result.reason || ""} server=${row.result.server || ""}`
        );
      } catch (error) {
        const checkedAt = new Date();
        const row: ResultRow = {
          movieId: String(candidate.movie?._id || ""),
          episodeId: candidate.target?.episodeId ? String(candidate.target.episodeId) : null,
          result: {
            status: "error",
            checkedAt,
            reason: error instanceof Error ? error.message : "verify-file-error",
            mediaType:
              candidate.movie?.tmdb?.type === "tv" || candidate.movie?.type === "tv"
                ? "tv"
                : "movie",
            tmdbId: String(candidate.movie?.tmdb?.id || ""),
            season: candidate.target?.season,
            episode: candidate.target?.episode,
          },
        };
        results.push(row);
        writeResults(args.output, results);
        console.log(`[${results.length}] error ${slug} reason=${row.result.reason || ""}`);
      }
    }
  };

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  const counts = results.reduce<Record<string, number>>((acc, row) => {
    acc[row.result.status] = (acc[row.result.status] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ output: args.output, results: results.length, counts }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
