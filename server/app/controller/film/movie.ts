import Movie from "../../model/Movie";
import Episode, { IVideoResource, VideoFormat } from "../../model/Episode";
import Category from "../../model/Category";
import Country from "../../model/Country";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Season, { ISeason } from "../../model/Season";

interface InputVideo {
  server_name?: string;
  quality: string;
  url: string;
  type: string;
  format: string;
  skip_intro?: { start: number; end: number };
  skip_outro?: { start: number; end: number };
  is_default?: boolean;
}

interface InputSubtitle {
  language?: string;
  lang?: string;
  label?: string;
  url?: string;
  value?: string;
}

interface InputEpisode {
  id: string; // ID từ nguồn crawl/upload
  name: string;
  part?: string;
  videos: InputVideo[];
  server?: string;
  type?: string;
  quality?: string;
  duration?: string; // "00:24"
  season: number;
  subtitles?: InputSubtitle[];
  episode?: number;
  episode_number?: number;
}

interface IFrontendEpisode {
  [key: string]: any;
  type: string;
}

class MovieController {

  private toSlug(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/([^0-9a-z-\s])/g, "")
      .replace(/(\s+)/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private parseDuration(durationStr?: string): number {
    if (!durationStr) return 0;
    const parts = durationStr.split(":").map(Number);
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS hoặc HH:MM
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  private getEpisodeNumber(item: InputEpisode, fallback: number): number {
    const explicit = Number(item.episode ?? item.episode_number);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const match = item.name?.match(/\d+/);
    const fromName = match ? Number(match[0]) : NaN;
    return Number.isFinite(fromName) && fromName > 0 ? fromName : fallback;
  }

  private normalizeSubtitles(input?: InputSubtitle[]) {
    if (!Array.isArray(input)) return [];

    return input
      .map((sub) => ({
        language: sub.language || sub.lang || "vi",
        label: sub.label || sub.language || sub.lang || "Subtitle",
        url: sub.url || sub.value || "",
      }))
      .filter((sub) => Boolean(sub.url));
  }

  // --- CONTROLLER METHODS (Dùng Arrow Function để sửa lỗi 'this' undefined) ---

  get = async (req: Request, res: Response) => {
    try {
      const { tmdb } = req.params;

      if (!tmdb) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu ID TMDB" });
      }

      const movie = await Movie.findOne({ "tmdb.id": tmdb }).lean();

      if (!movie) {
        return res
          .status(404)
          .json({ status: false, message: "Phim không tồn tại" });
      }

      const rawEpisodes = await Episode.find({ movie_id: movie._id })
        .sort({ sort_order: 1, episode: 1 })
        .lean();
      const seasonIds = Array.from(
        new Set(rawEpisodes.map((ep) => ep.season_id?.toString()).filter(Boolean))
      );
      const seasons = await Season.find({ _id: { $in: seasonIds } })
        .select("season_number")
        .lean();
      const seasonNumberById = new Map(
        seasons.map((season) => [season._id.toString(), season.season_number])
      );

      const processedEpisodes: IFrontendEpisode[] = [];

      for (const ep of rawEpisodes) {
        if (!ep.videos || ep.videos.length === 0) continue;

        const availableTypes = new Set(ep.videos.map((v: any) => v.type));

        availableTypes.forEach((type) => {
          const feEpisode: IFrontendEpisode = {
            ...ep,
            type: type as string,
            season_number:
              seasonNumberById.get(ep.season_id?.toString() || "") || 1,
          };
          processedEpisodes.push(feEpisode);
        });
      }

      Movie.updateOne({ _id: movie._id }, { $inc: { view: 1 } }).exec();

      return res.status(200).json({
        status: true,
        data: {
          movie,
          episodes: processedEpisodes,
        },
      });
    } catch (e: any) {
      console.error("Lỗi Get Movie:", e);
      return res.status(500).json({ status: false, message: "Lỗi Server" });
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const {
        q,
        countries,
        genres,
        years,
        status,
        type,
        chieurap,
        sort = "newest",
        page = 1,
        limit = 24,
      } = req.query;

      const pageNumber = Number(page) || 1;
      const limitNumber = Number(limit) || 24;
      const skip = (pageNumber - 1) * limitNumber;

      const filter: any = {};

      if (q) {
        const queryString = Array.isArray(q) ? String(q[0]) : String(q);
        const regex = new RegExp(queryString, "i");
        filter.$or = [{ name: regex }, { origin_name: regex }, { slug: regex }];
      }

      if (genres && genres !== "all") {
        const category = await Category.findOne({ slug: genres }).select("_id");
        if (category) {
          filter.category = category._id;
        } else {
          return res.status(200).json({
            status: true,
            data: {
              docs: [],
              totalDocs: 0,
              page: pageNumber,
              totalPages: 0,
              limit: limitNumber,
            },
          });
        }
      }

      if (countries && countries !== "all") {
        const country = await Country.findOne({ code: countries }).select(
          "_id"
        );
        if (country) {
          filter.country = country._id;
        } else {
          return res.status(200).json({
            status: true,
            data: {
              docs: [],
              totalDocs: 0,
              page: pageNumber,
              totalPages: 0,
              limit: limitNumber,
            },
          });
        }
      }

      if (type && type !== "all") filter.type = type;
      if (status && status !== "all") filter.status = status;
      if (years && years !== "all") filter.year = Number(years);

      if (chieurap === "true" || chieurap === "1") filter.chieurap = true;

      let sortCondition: any = { updatedAt: -1 };
      switch (sort) {
        case "newest":
          sortCondition = { updatedAt: -1 };
          break;
        case "oldest":
          sortCondition = { updatedAt: 1 };
          break;
        case "view":
          sortCondition = { view: -1 };
          break;
        case "rating":
          sortCondition = { "tmdb.vote_average": -1 };
          break;
        case "year":
          sortCondition = { year: -1 };
          break;
        default:
          sortCondition = { updatedAt: -1 };
      }

      const [movies, totalDocs] = await Promise.all([
        Movie.find(filter)
          .select("-content -trailer_url -seasons")
          .populate("category", "name slug")
          .populate("country", "name slug")
          .sort(sortCondition)
          .skip(skip)
          .limit(limitNumber)
          .lean(),
        Movie.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalDocs / limitNumber);

      return res.status(200).json({
        status: true,
        data: {
          docs: movies,
          totalDocs,
          limit: limitNumber,
          page: pageNumber,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      });
    } catch (e) {
      console.error("Lỗi List Movie:", e);
      return res
        .status(500)
        .json({ status: false, message: "Lỗi Server khi tải danh sách phim" });
    }
  };

  upload = async (req: Request, res: Response) => {
    try {
      const {
        movie_id,
        movie_title,
        episodes,
        subtitles,
      } = req.body;

      const inputEpisodes: InputEpisode[] = Array.isArray(episodes) ? episodes : [];
      if (inputEpisodes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No episodes provided.",
        });
      }

      const movie = await Movie.findOne({ "tmdb.id": movie_id });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: `Movie with TMDB ID ${movie_id} not found. Please create the movie first.`,
        });
      }

      const fallbackSubtitles = this.normalizeSubtitles(subtitles);
      const episodesBySeason = new Map<number, InputEpisode[]>();

      inputEpisodes.forEach((ep) => {
        const seasonNum = Number(ep.season) || 1;
        if (!episodesBySeason.has(seasonNum)) {
          episodesBySeason.set(seasonNum, []);
        }
        episodesBySeason.get(seasonNum)?.push(ep);
      });

      const updatedSeasonIds: mongoose.Types.ObjectId[] = [];
      const savedEpisodes: Array<{
        clientId?: string;
        _id: mongoose.Types.ObjectId;
        name: string;
        season: number;
        episode: number;
      }> = [];

      for (const [seasonNum, epList] of episodesBySeason) {
        let season = await Season.findOne({
          movie_id: movie._id,
          season_number: seasonNum,
        });

        if (!season) {
          season = new Season({
            movie_id: movie._id,
            season_number: seasonNum,
            name: `Phần ${seasonNum}`,
            slug: `phan-${seasonNum}`,
            episode_count: 0,
            episodes: [],
          });
        }
        if (!season.slug) {
          season.slug = `phan-${seasonNum}`;
        }

        for (let i = 0; i < epList.length; i++) {
          const item = epList[i];
          const episodeNumber = this.getEpisodeNumber(item, i + 1);

          const apiBase = `${req.protocol}://${req.get("host")}`;
          const toPlayableUrl = (url: string) => {
            if (!url || url.includes("/api/v1/hls-proxy/playlist")) return url;
            if (url.includes("/upload/") && url.endsWith(".m3u8")) {
              return `${apiBase}/api/v1/hls-proxy/playlist?url=${encodeURIComponent(url)}`;
            }
            return url;
          };

          const videos: IVideoResource[] = (item.videos || []).map((v) => ({
            server_name: v.server_name || "Vip Server",
            quality: v.quality || "HD",
            // TikTok HLS: playlist local trỏ segment TikTok PNG/iTXt, JWPlayer đi qua hls-proxy để decode TS.
            url: toPlayableUrl(v.url),
            type: v.type || "phude",
            format: (v.format as VideoFormat) || VideoFormat.M3U8,
            skip_intro: v.skip_intro || { start: 0, end: 0 },
            skip_outro: v.skip_outro || { start: 0, end: 0 },
            is_default: v.is_default || false,
          }));
          if (videos.length > 0 && !videos.some((video) => video.is_default)) {
            videos[0].is_default = true;
          }
          const types = Array.from(
            new Set(
              [...videos.map((video) => video.type), item.type || ""].filter(
                Boolean
              )
            )
          );
          const itemSubtitles = this.normalizeSubtitles(item.subtitles);
          const normalizedSubtitles = itemSubtitles.length
            ? itemSubtitles
            : fallbackSubtitles;

          // Bây giờ `this.toSlug` và `this.parseDuration` sẽ hoạt động chính xác
          const episodeDoc = await Episode.findOneAndUpdate(
            {
              movie_id: movie._id,
              season_id: season._id,
              episode: episodeNumber,
            },
            {
              $set: {
                movie_id: movie._id,
                season_id: season._id,
                name: item.name,
                slug: this.toSlug(item.name),
                episode: episodeNumber,
                sort_order: episodeNumber,
                types: types.length ? types : ["phude"],
                thumbnail: movie.thumb_url,
                duration: this.parseDuration(item.duration),
                videos: videos,
                audios: [],
                subtitles: normalizedSubtitles,
                updatedAt: new Date(),
              },
            },
            {
              new: true,
              upsert: true,
              setDefaultsOnInsert: true,
            }
          );
          if (episodeDoc) {
            savedEpisodes.push({
              clientId: item.id,
              _id: episodeDoc._id as mongoose.Types.ObjectId,
              name: episodeDoc.name,
              season: seasonNum,
              episode: episodeDoc.episode,
            });
          }

        }

        const allSeasonEpisodes = await Episode.find({ season_id: season._id })
          .select("_id")
          .sort({ episode: 1, sort_order: 1 })
          .lean();

        season.episodes = allSeasonEpisodes.map((episode) => episode._id) as any;
        season.episode_count = allSeasonEpisodes.length;
        await season.save();

        updatedSeasonIds.push(season._id);
      }

      const currentSeasonIds = movie.seasons.map((s) => s.toString());
      const newSeasonIds = updatedSeasonIds.map((s) => s.toString());
      const finalSeasonIds = Array.from(
        new Set([...currentSeasonIds, ...newSeasonIds])
      );

      const totalEpisodes = await Episode.countDocuments({
        movie_id: movie._id,
      });
      const hasLocalVideo = await Episode.exists({
        movie_id: movie._id,
        "videos.0": { $exists: true },
      });

      movie.seasons = finalSeasonIds as any;
      movie.episode_total = totalEpisodes.toString();
      movie.episode_current = totalEpisodes.toString();
      movie.has_local_video = Boolean(hasLocalVideo);

      await movie.save();

      return res.status(200).json({
        success: true,
        message: "Movie updated successfully",
        data: {
          movieId: movie._id,
          tmdbId: movie_id,
          totalEpisodes: totalEpisodes,
          seasonsUpdated: updatedSeasonIds.length,
          episodes: savedEpisodes,
        },
      });
    } catch (error: any) {
      console.error("Update Movie Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };
}

export default new MovieController();
