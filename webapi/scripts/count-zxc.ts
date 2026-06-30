import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";

const groupByZxcStatus = async (model: typeof Movie | typeof Episode) => {
  const rows = await model.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$zxc.status", "unknown"] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row._id || "unknown"] = row.count;
    return acc;
  }, {});
};

const main = async () => {
  await connectDB();

  const [movies, episodes, totalMovies, totalEpisodes] = await Promise.all([
    groupByZxcStatus(Movie),
    groupByZxcStatus(Episode),
    Movie.countDocuments(),
    Episode.countDocuments(),
  ]);

  const payload = {
    movies: {
      total: totalMovies,
      byStatus: movies,
      strictVisible: movies.available || 0,
    },
    episodes: {
      total: totalEpisodes,
      byStatus: episodes,
      strictPlayable: episodes.available || 0,
    },
  };

  console.log(JSON.stringify(payload, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
