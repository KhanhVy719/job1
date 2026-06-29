import { Request, Response } from "express";
import mongoose, { LeanDocument } from "mongoose";
import Movie from "../../model/Movie";
import Episode, { IEpisode, IVideoResource } from "../../model/Episode";
import Season from "../../model/Season";
interface IFrontendEpisode extends Omit<LeanDocument<IEpisode>, "type"> {
  type: string;
}

const buildVidSrcEmbed = (
  tmdbId: string | number,
  type: string,
  season?: number,
  episode?: number
): string => {
  const base = (process.env.VIDSRC_BASE || "https://vidsrc.sbs").replace(/\/+$/, "");
  if (!tmdbId) return "";
  if (type === "movie") return `${base}/embed/movie/${tmdbId}`;
  const s = season && season > 0 ? season : 1;
  const e = episode && episode > 0 ? episode : 1;
  return `${base}/embed/tv/${tmdbId}/${s}/${e}`;
};

class MovieController {
  static getAllSeasons = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: false, message: "ID phim không hợp lệ" });
    }

    try {
      const seasons = await Season.find({
        movie_id: id,
      })
        .sort({ season_number: 1 })
        .lean();

      if (!seasons || seasons.length === 0) {
        const movieExists = await Movie.exists({ _id: id });
        if (!movieExists) {
          return res
            .status(404)
            .json({ status: false, message: "Phim không tồn tại" });
        }
        return res.json({ status: true, data: [] });
      }

      const list = await Promise.all(
        seasons.map(async (data) => {
          const Episodes = await Episode.find({ season_id: data._id });
          return {
            ...data,
            episodes: Episodes,
          };
        })
      );

      res.json({ status: true, data: list });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Lỗi lấy danh sách seasons và tập phim",
      });
    }
  };

  static getDetail = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      const movie = await Movie.findOne({ slug })
        .populate("category", "name slug")
        .populate("country", "name slug code")
        .populate("actor", "name slug avatar aka")
        .populate("director", "name slug")
        .populate("studio", "name slug logo_url origin_country")
        .lean();

      if (!movie)
        return res
          .status(404)
          .json({ status: false, message: "Phim không tồn tại" });

      Movie.updateOne({ _id: movie._id }, { $inc: { view: 1 } }).exec();

      res.json({
        status: true,
        data: movie,
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: false, message: "Lỗi Server" });
    }
  };

  static getSource = async (req: Request, res: Response) => {
    const { slug: movieSlug, episode_slug: episodeSlug } = req.params;

    try {
      const movie = await Movie.findOne({ slug: movieSlug })
        .select("_id type tmdb")
        .lean();
      if (!movie)
        return res
          .status(404)
          .json({ status: false, message: "Phim không tồn tại" });

      const episode: any = await Episode.findOne({
        movie_id: movie._id,
        slug: episodeSlug,
      }).lean();
      if (!episode)
        return res
          .status(404)
          .json({ status: false, message: "Tập phim không tồn tại" });

      // Fallback cho dữ liệu cũ: nếu chưa backfill embed_url thì build từ TMDB id.
      if (!episode.embed_url && movie.tmdb?.id) {
        if (movie.type === "movie" || movie.tmdb?.type === "movie") {
          episode.embed_url = buildVidSrcEmbed(movie.tmdb.id, "movie");
        } else {
          const season = await Season.findById(episode.season_id)
            .select("season_number")
            .lean();
          episode.embed_url = buildVidSrcEmbed(
            movie.tmdb.id,
            "tv",
            season?.season_number || 1,
            episode.episode || 1
          );
        }
      }

      Episode.updateOne({ _id: episode._id }, { $inc: { views: 1 } }).exec();

      res.json({ status: true, data: episode });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: false, message: "Lỗi lấy nguồn phim" });
    }
  };

  static getRecommendations = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const limit = Number(req.query.limit) || 12;

    try {
      const escapeRegex = (text: string) =>
        text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

      const currentMovie = await Movie.findOne({ slug })
        .select({
          _id: 1,
          name: 1,
          origin_name: 1,
          type: 1,
          category: 1,
          actor: 1,
          director: 1,
          studio: 1,
          country: 1,
          year: 1,
          "tmdb.collection.id": 1,
          "tmdb.vote_average": 1,
          view: 1,
        })
        .lean();

      if (!currentMovie)
        return res.json({ status: false, message: "Phim không tồn tại" });

      const removeKeywords =
        /(\s(part|vol|tập|phần|season|chương)\s.*)|(\s\d+$)/iu;
      const cleanName = currentMovie.name.replace(removeKeywords, "").trim();
      const nameRegex = new RegExp(`^${escapeRegex(cleanName)}`, "i");
      const collectionId = currentMovie.tmdb?.collection?.id || null;

      const relatedMovies = await Movie.aggregate([
        {
          $match: {
            _id: { $ne: currentMovie._id },
            type: currentMovie.type,
            $or: [
              { category: { $in: currentMovie.category } },
              { actor: { $in: currentMovie.actor } },
              { director: { $in: currentMovie.director } },
              { studio: { $in: currentMovie.studio } },
              {
                ...(collectionId ? { "tmdb.collection.id": collectionId } : {}),
              },
              { name: { $regex: nameRegex } },
            ],
          },
        },
        {
          $addFields: {
            score_collection: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$tmdb.collection.id", collectionId] },
                    { $regexMatch: { input: "$name", regex: nameRegex } },
                  ],
                },
                1000,
                0,
              ],
            },
            score_category: {
              $multiply: [
                {
                  $size: {
                    $setIntersection: [
                      "$category",
                      currentMovie.category || [],
                    ],
                  },
                },
                15,
              ],
            },
            score_actor: {
              $multiply: [
                {
                  $size: {
                    $setIntersection: [
                      { $ifNull: ["$actor", []] },
                      currentMovie.actor || [],
                    ],
                  },
                },
                30,
              ],
            },
            score_director: {
              $multiply: [
                {
                  $size: {
                    $setIntersection: [
                      { $ifNull: ["$director", []] },
                      currentMovie.director || [],
                    ],
                  },
                },
                50,
              ],
            },
            score_studio: {
              $multiply: [
                {
                  $size: {
                    $setIntersection: [
                      { $ifNull: ["$studio", []] },
                      currentMovie.studio || [],
                    ],
                  },
                },
                20,
              ],
            },
            score_country: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          { $ifNull: ["$country", []] },
                          currentMovie.country || [],
                        ],
                      },
                    },
                    0,
                  ],
                },
                10,
                0,
              ],
            },
            score_year: {
              $let: {
                vars: {
                  diff: {
                    $abs: {
                      $subtract: [
                        { $ifNull: ["$year", 2020] },
                        { $ifNull: [currentMovie.year, 2020] },
                      ],
                    },
                  },
                },
                in: { $divide: [10, { $add: ["$$diff", 1] }] },
              },
            },
            score_popularity: {
              $add: [
                { $multiply: [{ $ifNull: ["$tmdb.vote_average", 0] }, 1] },
                { $divide: [{ $ifNull: ["$view", 0] }, 100000] },
              ],
            },
          },
        },
        {
          $addFields: {
            totalScore: {
              $add: [
                "$score_collection",
                "$score_category",
                "$score_actor",
                "$score_director",
                "$score_studio",
                "$score_country",
                "$score_year",
                "$score_popularity",
              ],
            },
          },
        },
        { $sort: { totalScore: -1, view: -1 } },
        { $limit: limit },
        {
          $project: {
            name: 1,
            slug: 1,
            origin_name: 1,
            thumb_url: 1,
            poster_url: 1,
            year: 1,
            quality: 1,
            lang: 1,
            episode_current: 1,
            type: 1,
            category: 1,
            totalScore: 1,
          },
        },
      ]);

      await Movie.populate(relatedMovies, {
        path: "category",
        select: "name slug",
      });
      res.json({ status: true, data: relatedMovies });
    } catch (e) {
      console.error(e);
      res.json({ status: false, message: "Lỗi lấy danh sách đề xuất" });
    }
  };
}

export default MovieController;
