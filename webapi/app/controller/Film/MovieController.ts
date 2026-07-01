import { Request, Response } from "express";
import mongoose, { LeanDocument } from "mongoose";
import Movie from "../../model/Movie";
import Episode, { IEpisode } from "../../model/Episode";
import Season from "../../model/Season";
import {
  publicMovieConstraint,
  publicPlayableMovieConstraint,
} from "../Shared/shared";
import ViewerTranslationService, { resolveViewerLanguage } from "../../services/ViewerTranslationService";
interface IFrontendEpisode extends Omit<LeanDocument<IEpisode>, "type"> {
  type: string;
}

const VSEMBED_ORIGIN = (process.env.VSEMBED_ORIGIN || process.env.VSEMBED_BASE || "https://vsembed.su").replace(/\/+$/, "");
const VSEMBED_LEGACY_HOSTS = new Set([
  "vidsrc.me",
  "vidsrc-embed.ru",
  "vidsrc-embed.su",
  "vidsrcme.su",
  "vsrc.su",
  "vsembed.ru",
  "vsembed.su",
]);

const normalizeEmbedBase = (base: string): string => {
  try {
    const parsed = new URL(base);
    if (VSEMBED_LEGACY_HOSTS.has(parsed.hostname.replace(/^www\./, "").toLowerCase())) {
      return VSEMBED_ORIGIN;
    }
  } catch {
    return VSEMBED_ORIGIN;
  }
  return base.replace(/\/+$/, "");
};

const normalizeManagedEmbedUrl = (
  url: string,
  type: string,
  tmdbId: string | number,
  season?: number,
  episode?: number
): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const isVsembedHost = VSEMBED_LEGACY_HOSTS.has(host);
    if (!isVsembedHost) return parsed.toString();

    const normalizedTmdbId = encodeURIComponent(String(tmdbId));
    if (type === "movie" && parsed.pathname.includes("/embed/movie")) {
      return `${VSEMBED_ORIGIN}/embed/movie/${normalizedTmdbId}`;
    }
    if (type !== "movie" && parsed.pathname.includes("/embed/tv")) {
      const s = season && season > 0 ? season : 1;
      const e = episode && episode > 0 ? episode : 1;
      return `${VSEMBED_ORIGIN}/embed/tv/${normalizedTmdbId}/${s}-${e}`;
    }
    return `${VSEMBED_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

const buildVidSrcEmbed = (
  tmdbId: string | number,
  type: string,
  season?: number,
  episode?: number
): string => {
  if (!tmdbId) return "";
  const embedBase = normalizeEmbedBase(process.env.VIDSRC_BASE || VSEMBED_ORIGIN);
  const movieTemplate =
    process.env.VIDSRC_MOVIE_URL_TEMPLATE ||
    process.env.EMBED_MOVIE_URL_TEMPLATE ||
    `${embedBase}/embed/movie/{tmdbId}`;
  const tvTemplate =
    process.env.VIDSRC_TV_URL_TEMPLATE ||
    process.env.EMBED_TV_URL_TEMPLATE ||
    `${embedBase}/embed/tv/{tmdbId}/{season}-{episode}`;
  const template = type === "movie" ? movieTemplate : tvTemplate;
  const s = season && season > 0 ? season : 1;
  const e = episode && episode > 0 ? episode : 1;
  const embedUrl = template
    .replace(/\{tmdbId\}|\{tmdb_id\}/g, encodeURIComponent(String(tmdbId)))
    .replace(/\{season\}/g, encodeURIComponent(String(s)))
    .replace(/\{episode\}/g, encodeURIComponent(String(e)));
  return normalizeManagedEmbedUrl(embedUrl, type, tmdbId, s, e);
};

const AUTO_EMBED_HOSTS = [
  "vidsrc.me",
  "vidsrc.sbs",
  "web.nxsha.app",
  "cinesrc.st",
  "zxcstream.xyz",
  "vidlux.xyz",
  "vsembed.su",
  "vsembed.ru",
  "vidsrc-embed.ru",
  "vidsrc-embed.su",
  "vidsrcme.su",
  "vsrc.su",
];

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const isAutoManagedEmbed = (url: string, expectedUrl: string): boolean => {
  const host = getHostname(url);
  if (!host) return false;
  const expectedHost = getHostname(expectedUrl);
  const extraHosts = (process.env.AUTO_EMBED_HOSTS || "")
    .split(",")
    .map((x) => x.trim().replace(/^www\./, "").toLowerCase())
    .filter(Boolean);
  return [expectedHost, ...AUTO_EMBED_HOSTS, ...extraHosts].includes(host);
};

class MovieController {
  static getAllSeasons = async (req: Request, res: Response) => {
    const { id } = req.params;
    const viewerLanguage = resolveViewerLanguage(req);

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
          const Episodes = await Episode.find({ season_id: data._id }).lean();
          return {
            ...data,
            episodes: Episodes,
          };
        })
      );

      res.json({
        status: true,
        data: ViewerTranslationService.localizeSeasons(list, viewerLanguage),
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Lỗi lấy danh sách seasons và tập phim",
      });
    }
  };

  static getDetail = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const viewerLanguage = resolveViewerLanguage(req);
    try {
      const movie = await Movie.findOne({
        slug,
        ...publicMovieConstraint(),
      })
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
        data: await ViewerTranslationService.localizeMovie(movie, viewerLanguage, { hydrate: true }),
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: false, message: "Lỗi Server" });
    }
  };

  static getSource = async (req: Request, res: Response) => {
    const { slug: movieSlug, episode_slug: episodeSlug } = req.params;
    const viewerLanguage = resolveViewerLanguage(req);

    try {
      const movie = await Movie.findOne({
        slug: movieSlug,
        ...publicPlayableMovieConstraint(),
      })
        .select("_id type tmdb imdb zxc")
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

      // Rebuild auto-provider embeds from current TMDB metadata; keep custom embeds.
      if (movie.tmdb?.id) {
        const isMovie = movie.type === "movie" || movie.tmdb?.type === "movie";
        const season = isMovie
          ? null
          : await Season.findById(episode.season_id)
              .select("season_number")
              .lean();
        const expectedEmbedUrl = buildVidSrcEmbed(
          movie.tmdb.id,
          isMovie ? "movie" : "tv",
          season?.season_number || 1,
          episode.episode || 1
        );
        if (
          expectedEmbedUrl &&
          (!episode.embed_url ||
            (episode.embed_url !== expectedEmbedUrl &&
              isAutoManagedEmbed(episode.embed_url, expectedEmbedUrl)))
        ) {
          episode.embed_url = expectedEmbedUrl;
          Episode.updateOne(
            { _id: episode._id },
            { $set: { embed_url: expectedEmbedUrl } }
          ).exec();
        }
      }

      Episode.updateOne({ _id: episode._id }, { $inc: { views: 1 } }).exec();

      res.json({ status: true, data: ViewerTranslationService.localizeEpisode(episode, viewerLanguage) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ status: false, message: "Lỗi lấy nguồn phim" });
    }
  };

  static getRecommendations = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const limit = Number(req.query.limit) || 12;
    const viewerLanguage = resolveViewerLanguage(req);

    try {
      const escapeRegex = (text: string) =>
        text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

      const currentMovie = await Movie.findOne({
        slug,
        ...publicMovieConstraint(),
      })
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
            ...publicMovieConstraint(),
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
            translations: 1,
            totalScore: 1,
          },
        },
      ]);

      await Movie.populate(relatedMovies, {
        path: "category",
        select: "name slug",
      });
      res.json({
        status: true,
        data: await ViewerTranslationService.localizeMovies(relatedMovies, viewerLanguage),
      });
    } catch (e) {
      console.error(e);
      res.json({ status: false, message: "Lỗi lấy danh sách đề xuất" });
    }
  };
}

export default MovieController;
