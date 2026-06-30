import { Request, Response } from "express";
import Movie from "../../model/Movie";
import Episode from "../../model/Episode";
import User from "../../model/User";
import Category from "../../model/Category";
import Country from "../../model/Country";
import Season from "../../model/Season";
import mongoose from "mongoose";

class AdminController {
  private async refreshMovieLocalVideoFlag(movieId: mongoose.Types.ObjectId | string) {
    const hasLocalVideo = await Episode.exists({
      movie_id: movieId,
      "videos.0": { $exists: true },
    });

    await Movie.updateOne(
      { _id: movieId },
      { $set: { has_local_video: Boolean(hasLocalVideo) } }
    );

    return Boolean(hasLocalVideo);
  }

  stats = async (_req: Request, res: Response) => {
    try {
      const [movies, episodes, uploadedEpisodes, users, categories, countries, seasons] = await Promise.all([
        Movie.countDocuments(),
        Episode.countDocuments(),
        Episode.countDocuments({ "videos.0": { $exists: true } }),
        User.countDocuments(),
        Category.countDocuments(),
        Country.countDocuments(),
        Season.countDocuments(),
      ]);
      return res.json({ status: true, data: { movies, episodes, uploadedEpisodes, users, categories, countries, seasons } });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Không lấy được thống kê admin" });
    }
  };

  users = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const q = String(req.query.q || "").trim();
      const filter = q ? { $or: [{ email: new RegExp(q, "i") }, { fullname: new RegExp(q, "i") }] } : {};
      const [docs, totalDocs] = await Promise.all([
        User.find(filter).select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
      ]);
      return res.json({ status: true, data: { docs, totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit) } });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Không lấy được danh sách user" });
    }
  };

  uploadedMovies = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const q = String(req.query.q || "").trim();
      const episodeAgg = await Episode.aggregate([
        { $match: { "videos.0": { $exists: true } } },
        { $group: { _id: "$movie_id", uploadedEpisodes: { $sum: 1 }, latestUpload: { $max: "$updatedAt" } } },
      ]);
      const uploadedMap = new Map(episodeAgg.map((x) => [String(x._id), x]));
      const ids = episodeAgg.map((x) => x._id);
      const filter: any = { _id: { $in: ids } };
      if (q) filter.$or = [{ name: new RegExp(q, "i") }, { origin_name: new RegExp(q, "i") }, { slug: new RegExp(q, "i") }];
      const [docs, totalDocs] = await Promise.all([
        Movie.find(filter).select("name origin_name slug poster_url thumb_url year type status updatedAt tmdb").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Movie.countDocuments(filter),
      ]);
      const mapped = docs.map((movie: any) => ({ ...movie, uploadedEpisodes: uploadedMap.get(String(movie._id))?.uploadedEpisodes || 0 }));
      return res.json({ status: true, data: { docs: mapped, totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit) } });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Không lấy được phim đã upload" });
    }
  };

  uploadedEpisodes = async (req: Request, res: Response) => {
    try {
      const { movieId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(movieId)) {
        return res.status(400).json({ status: false, message: "movieId không hợp lệ" });
      }
      const episodes = await Episode.find({ movie_id: movieId, "videos.0": { $exists: true } })
        .select("name slug episode season_id videos embed_url updatedAt")
        .populate("season_id", "name slug season_number")
        .sort({ episode: 1 })
        .lean();
      return res.json({ status: true, data: episodes });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Không lấy được tập đã upload" });
    }
  };

  clearEpisodeVideos = async (req: Request, res: Response) => {
    try {
      const { episodeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(episodeId)) {
        return res.status(400).json({ status: false, message: "episodeId không hợp lệ" });
      }
      const episode = await Episode.findByIdAndUpdate(
        episodeId,
        { $set: { videos: [] } },
        { new: true }
      ).select("_id movie_id name episode videos embed_url");
      if (episode) {
        await this.refreshMovieLocalVideoFlag(String(episode.movie_id));
      }
      if (!episode) return res.status(404).json({ status: false, message: "Không tìm thấy episode" });
      return res.json({ status: true, data: episode, message: "Đã xóa source tự host của tập" });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Không xóa được source tự host" });
    }
  };
}

export default new AdminController();
