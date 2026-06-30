import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../utils/mongodb";
import Episode from "../app/model/Episode";
import Movie from "../app/model/Movie";

const main = async () => {
  await connectDB();

  const rows = await Episode.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { "videos.0": { $exists: true } } },
    { $group: { _id: "$movie_id" } },
  ]);

  const movieIds = rows
    .map((row) => row._id)
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));

  const markTrue = movieIds.length
    ? await Movie.updateMany(
        { _id: { $in: movieIds }, has_local_video: { $ne: true } },
        { $set: { has_local_video: true } }
      )
    : { matchedCount: 0, modifiedCount: 0 };

  const markFalseFilter = movieIds.length
    ? { has_local_video: true, _id: { $nin: movieIds } }
    : { has_local_video: true };

  const markFalse = await Movie.updateMany(markFalseFilter, {
    $set: { has_local_video: false },
  });

  console.log(
    JSON.stringify(
      {
        moviesWithLocalVideo: movieIds.length,
        markedTrue: markTrue.modifiedCount || 0,
        markedFalse: markFalse.modifiedCount || 0,
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
