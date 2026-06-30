import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Comment from "../../model/Comment";
import Movie from "../../model/Movie";
import Episode from "../../model/Episode";
import { extractToken } from "../../../utils/extractToken";

type AuthRequest = Request & {
  user?: {
    _id: Types.ObjectId;
  };
};

const MAX_COMMENT_LENGTH = 1000;

const populateFields = [
  { path: "user_id", select: "fullname avatar verify gender level" },
  { path: "movie_id", select: "name origin_name slug thumb_url poster_url" },
  { path: "episode_id", select: "name slug episode" },
];

const toObjectId = (value?: string | null) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const getPagination = (req: Request) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const getViewerId = (req: Request) => {
  try {
    return extractToken(req.headers.authorization);
  } catch {
    return null;
  }
};

const hasId = (items: unknown[] = [], id?: string | null) => {
  if (!id) return false;
  return items.some((item) => String(item) === id);
};

const serializeComment = (comment: any, viewerId?: string | null) => {
  const user = comment.user_id || {};
  const movie = comment.movie_id || {};
  const episode = comment.episode_id || null;

  return {
    _id: String(comment._id),
    id: String(comment._id),
    content: comment.content,
    is_spoiler: Boolean(comment.is_spoiler),
    upvote_count: comment.upvote_count || 0,
    downvote_count: comment.downvote_count || 0,
    reply_count: comment.reply_count || 0,
    score: comment.score || 0,
    viewer_vote: hasId(comment.upvotes, viewerId)
      ? 1
      : hasId(comment.downvotes, viewerId)
        ? -1
        : 0,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: {
      _id: user._id ? String(user._id) : "",
      fullname: user.fullname || "Người dùng",
      avatar: user.avatar || "",
      verify: Boolean(user.verify),
      gender: user.gender || "other",
      level: user.level || 1,
    },
    movie: {
      _id: movie._id ? String(movie._id) : "",
      name: movie.name || "",
      origin_name: movie.origin_name || "",
      slug: movie.slug || "",
      thumb_url: movie.thumb_url || "",
      poster_url: movie.poster_url || "",
    },
    episode: episode
      ? {
          _id: episode._id ? String(episode._id) : "",
          name: episode.name || "",
          slug: episode.slug || "",
          episode: episode.episode || 0,
        }
      : null,
    parent_id: comment.parent_id ? String(comment.parent_id) : null,
  };
};

class CommentController {
  static list = async (req: Request, res: Response) => {
    try {
      const { page, limit, skip } = getPagination(req);
      const movieId = toObjectId(req.query.movie_id as string);
      const episodeId = toObjectId(req.query.episode_id as string);
      const parentId = toObjectId(req.query.parent_id as string);

      if (!movieId && !parentId) {
        return res.status(400).json({
          status: false,
          message: "Thiếu movie_id hoặc parent_id",
        });
      }

      const filter: Record<string, unknown> = { status: "visible" };
      if (movieId) filter.movie_id = movieId;
      if (episodeId) filter.episode_id = episodeId;
      filter.parent_id = parentId || null;

      const totalFilter: Record<string, unknown> = { status: "visible" };
      if (movieId) totalFilter.movie_id = movieId;
      if (episodeId) totalFilter.episode_id = episodeId;

      const sort =
        req.query.sort === "top"
          ? { score: -1, reply_count: -1, upvote_count: -1, createdAt: -1 }
          : { createdAt: -1 };

      const [comments, total, totalComments] = await Promise.all([
        Comment.find(filter)
          .sort(sort as any)
          .skip(skip)
          .limit(limit)
          .populate(populateFields)
          .lean(),
        Comment.countDocuments(filter),
        movieId ? Comment.countDocuments(totalFilter) : Promise.resolve(0),
      ]);

      const viewerId = getViewerId(req);

      return res.json({
        status: true,
        data: comments.map((comment) => serializeComment(comment, viewerId)),
        meta: {
          page,
          limit,
          total,
          totalComments,
          hasMore: skip + comments.length < total,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy danh sách bình luận",
      });
    }
  };

  static create = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Bạn cần đăng nhập để bình luận",
        });
      }

      const content = String(req.body.content || "").trim();
      if (!content) {
        return res.status(400).json({
          status: false,
          message: "Vui lòng nhập nội dung bình luận",
        });
      }
      if (content.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({
          status: false,
          message: `Bình luận không được vượt quá ${MAX_COMMENT_LENGTH} ký tự`,
        });
      }

      let movieId = toObjectId(req.body.movie_id);
      let episodeId = toObjectId(req.body.episode_id);
      const parentId = toObjectId(req.body.parent_id);
      let parent = null;

      if (parentId) {
        parent = await Comment.findOne({ _id: parentId, status: "visible" });
        if (!parent) {
          return res.status(404).json({
            status: false,
            message: "Bình luận cha không tồn tại",
          });
        }
        movieId = parent.movie_id;
        episodeId = parent.episode_id || null;
      }

      if (!movieId) {
        return res.status(400).json({
          status: false,
          message: "Thiếu movie_id",
        });
      }

      const movieExists = await Movie.exists({ _id: movieId });
      if (!movieExists) {
        return res.status(404).json({
          status: false,
          message: "Phim không tồn tại",
        });
      }

      if (episodeId) {
        const episodeExists = await Episode.exists({
          _id: episodeId,
          movie_id: movieId,
        });
        if (!episodeExists) {
          return res.status(404).json({
            status: false,
            message: "Tập phim không tồn tại",
          });
        }
      }

      const created = await Comment.create({
        movie_id: movieId,
        episode_id: episodeId || null,
        parent_id: parentId || null,
        user_id: userId,
        content,
        is_spoiler: Boolean(req.body.is_spoiler),
      });

      if (parentId) {
        await Comment.updateOne(
          { _id: parentId },
          { $inc: { reply_count: 1, score: 1 } }
        );
      }

      const populated = await Comment.findById(created._id)
        .populate(populateFields)
        .lean();

      return res.status(201).json({
        status: true,
        data: serializeComment(populated, String(userId)),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi gửi bình luận",
      });
    }
  };

  static vote = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Bạn cần đăng nhập để đánh giá bình luận",
        });
      }

      const commentId = toObjectId(req.params.id);
      if (!commentId) {
        return res.status(400).json({
          status: false,
          message: "ID bình luận không hợp lệ",
        });
      }

      const value = Number(req.body.value);
      if (![1, -1, 0].includes(value)) {
        return res.status(400).json({
          status: false,
          message: "Giá trị vote không hợp lệ",
        });
      }

      const comment = await Comment.findOne({ _id: commentId, status: "visible" });
      if (!comment) {
        return res.status(404).json({
          status: false,
          message: "Bình luận không tồn tại",
        });
      }

      const userIdString = String(userId);
      comment.upvotes = comment.upvotes.filter((id) => String(id) !== userIdString);
      comment.downvotes = comment.downvotes.filter((id) => String(id) !== userIdString);

      if (value === 1) comment.upvotes.push(userId);
      if (value === -1) comment.downvotes.push(userId);

      comment.upvote_count = comment.upvotes.length;
      comment.downvote_count = comment.downvotes.length;
      comment.score =
        comment.upvote_count - comment.downvote_count + comment.reply_count;

      await comment.save();

      const populated = await Comment.findById(comment._id)
        .populate(populateFields)
        .lean();

      return res.json({
        status: true,
        data: serializeComment(populated, userIdString),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi đánh giá bình luận",
      });
    }
  };

  static latest = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
      const comments = await Comment.find({ status: "visible" })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate(populateFields)
        .lean();

      return res.json({
        status: true,
        data: comments.map((comment) => serializeComment(comment)),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy bình luận mới",
      });
    }
  };

  static top = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 30);
      const comments = await Comment.find({
        status: "visible",
        parent_id: null,
      })
        .sort({ score: -1, reply_count: -1, upvote_count: -1, createdAt: -1 })
        .limit(limit)
        .populate(populateFields)
        .lean();

      return res.json({
        status: true,
        data: comments.map((comment) => serializeComment(comment)),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy top bình luận",
      });
    }
  };

  static activeMovies = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const aggregate = async (match: Record<string, unknown>) =>
        Comment.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$movie_id",
              commentsCount: { $sum: 1 },
              score: { $sum: "$score" },
              lastCommentAt: { $max: "$createdAt" },
            },
          },
          { $sort: { commentsCount: -1, score: -1, lastCommentAt: -1 } },
          { $limit: limit },
        ]);

      let activity = await aggregate({
        status: "visible",
        createdAt: { $gte: since },
      });

      if (activity.length === 0) {
        activity = await aggregate({ status: "visible" });
      }

      const movieIds = activity.map((item) => item._id);
      const movies = await Movie.find({ _id: { $in: movieIds } })
        .select("name slug thumb_url poster_url")
        .lean();
      const movieMap = new Map(movies.map((movie) => [String(movie._id), movie]));

      const data = activity
        .map((item) => {
          const movie = movieMap.get(String(item._id));
          if (!movie) return null;
          return {
            id: String(movie._id),
            title: movie.name,
            href: `/phim/${movie.slug}`,
            thumb: movie.thumb_url || movie.poster_url || "/images/placeholder-poster.svg",
            trend: "up",
            commentsCount: item.commentsCount || 0,
            score: item.score || 0,
            lastCommentAt: item.lastCommentAt,
          };
        })
        .filter(Boolean);

      return res.json({ status: true, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy phim sôi nổi",
      });
    }
  };
}

export default CommentController;
