import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";
import Season from "../app/model/Season";

type EpisodeDoc = {
  _id: mongoose.Types.ObjectId;
  movie_id: mongoose.Types.ObjectId;
  season_id?: mongoose.Types.ObjectId;
  episode?: number;
  sort_order?: number;
  types?: string[];
  videos?: Array<{ type?: string; url?: string }>;
  createdAt?: Date;
};

const uniqueStrings = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const toId = (value: unknown) => String(value || "");

const getOrCreateSeason = async (episode: EpisodeDoc) => {
  if (episode.season_id) {
    const season = await Season.findById(episode.season_id);
    if (season) return season;
  }

  const seasonByMember = await Season.findOne({
    movie_id: episode.movie_id,
    episodes: episode._id,
  });
  if (seasonByMember) return seasonByMember;

  return Season.findOneAndUpdate(
    { movie_id: episode.movie_id, season_number: 1 },
    {
      $setOnInsert: {
        movie_id: episode.movie_id,
        season_number: 1,
        name: "Phan 1",
        slug: "phan-1",
        episode_count: 0,
        episodes: [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const main = async () => {
  await connectDB();

  const playableEpisodes = await Episode.find({ "videos.0": { $exists: true } })
    .select("_id movie_id season_id episode sort_order types videos.type videos.url createdAt")
    .sort({ movie_id: 1, season_id: 1, episode: 1, sort_order: 1, createdAt: 1 })
    .lean<EpisodeDoc[]>();

  const resolved = [];
  for (const episode of playableEpisodes) {
    const season = await getOrCreateSeason(episode);
    if (!season) continue;

    resolved.push({
      episode,
      seasonId: season._id as mongoose.Types.ObjectId,
      seasonNumber: season.season_number || 1,
    });
  }

  const bySeason = new Map<string, typeof resolved>();
  for (const row of resolved) {
    const key = toId(row.seasonId);
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key)?.push(row);
  }

  let episodesUpdated = 0;
  for (const rows of bySeason.values()) {
    rows.sort((a, b) => {
      const aOrder = a.episode.episode || a.episode.sort_order || 0;
      const bOrder = b.episode.episode || b.episode.sort_order || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(a.episode.createdAt || 0) - Number(b.episode.createdAt || 0);
    });

    const used = new Set<number>();
    for (const row of rows) {
      const currentNumber = Number(row.episode.episode || row.episode.sort_order || 0);
      let episodeNumber = currentNumber > 0 && !used.has(currentNumber) ? currentNumber : 0;
      if (!episodeNumber) {
        episodeNumber = 1;
        while (used.has(episodeNumber)) episodeNumber += 1;
      }
      used.add(episodeNumber);

      const videoTypes = uniqueStrings((row.episode.videos || []).map((video) => video.type));
      const types = row.episode.types?.length ? row.episode.types : videoTypes;

      const update: Record<string, unknown> = {
        season_id: row.seasonId,
        episode: episodeNumber,
        sort_order: episodeNumber,
      };
      if (types.length) update.types = types;

      const result = await Episode.updateOne({ _id: row.episode._id }, { $set: update });
      episodesUpdated += result.modifiedCount || 0;
    }
  }

  const movieIds = uniqueStrings(resolved.map((row) => toId(row.episode.movie_id)));
  let seasonsUpdated = 0;

  for (const movieId of movieIds) {
    const seasons = await Season.find({ movie_id: movieId }).sort({ season_number: 1 });
    const seasonIds: mongoose.Types.ObjectId[] = [];

    for (const season of seasons) {
      if (!season.slug) season.slug = `phan-${season.season_number || 1}`;

      const episodes = await Episode.find({ season_id: season._id })
        .select("_id")
        .sort({ episode: 1, sort_order: 1 })
        .lean();

      season.episodes = episodes.map((episode) => episode._id) as any;
      season.episode_count = episodes.length;
      await season.save();
      seasonsUpdated += 1;
      seasonIds.push(season._id as mongoose.Types.ObjectId);
    }

    await Movie.updateOne(
      { _id: movieId },
      {
        $set: { has_local_video: true },
        $addToSet: { seasons: { $each: seasonIds } },
      }
    );
  }

  console.log(
    JSON.stringify(
      {
        playableEpisodes: playableEpisodes.length,
        episodesUpdated,
        moviesMarked: movieIds.length,
        seasonsUpdated,
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
