import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

export type FilmCommentUser = {
  _id: string;
  fullname: string;
  avatar: string;
  verify: boolean;
  gender: "male" | "female" | "other";
  level: number;
};

export type FilmCommentMovie = {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  poster_url: string;
};

export type FilmCommentEpisode = {
  _id: string;
  name: string;
  slug: string;
  episode: number;
};

export type FilmComment = {
  _id: string;
  id: string;
  content: string;
  is_spoiler: boolean;
  upvote_count: number;
  downvote_count: number;
  reply_count: number;
  score: number;
  viewer_vote: -1 | 0 | 1;
  createdAt: string;
  updatedAt: string;
  user: FilmCommentUser;
  movie: FilmCommentMovie;
  episode: FilmCommentEpisode | null;
  parent_id: string | null;
};

export type CommentListMeta = {
  page: number;
  limit: number;
  total: number;
  totalComments: number;
  hasMore: boolean;
};

export type CommentListResponse = {
  status: boolean;
  data: FilmComment[];
  meta: CommentListMeta;
};

export type ActiveCommentMovie = {
  id: string;
  title: string;
  href: string;
  thumb: string;
  trend: string;
  commentsCount: number;
  score: number;
  lastCommentAt: string;
};

export const getComments = async (params: {
  movieId?: string;
  episodeId?: string;
  parentId?: string;
  page?: number;
  limit?: number;
  sort?: "latest" | "top";
}) => {
  const response = await axiosInstance.get<CommentListResponse>(API_ENDPOINTS.comments.list, {
    params: {
      movie_id: params.movieId,
      episode_id: params.episodeId,
      parent_id: params.parentId,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
    },
  });
  return response.data;
};

export const createComment = async (payload: {
  movie_id?: string;
  episode_id?: string;
  parent_id?: string;
  content: string;
  is_spoiler?: boolean;
}) => {
  const response = await axiosInstance.post<{ status: boolean; data: FilmComment }>(
    API_ENDPOINTS.comments.create,
    payload
  );
  return response.data.data;
};

export const voteComment = async (id: string, value: -1 | 0 | 1) => {
  const response = await axiosInstance.post<{ status: boolean; data: FilmComment }>(
    API_ENDPOINTS.comments.vote(id),
    { value }
  );
  return response.data.data;
};

export const getLatestComments = async (limit = 12) => {
  const response = await axiosInstance.get<{ status: boolean; data: FilmComment[] }>(
    API_ENDPOINTS.comments.latest,
    { params: { limit } }
  );
  return response.data.data;
};

export const getTopComments = async (limit = 8) => {
  const response = await axiosInstance.get<{ status: boolean; data: FilmComment[] }>(
    API_ENDPOINTS.comments.top,
    { params: { limit } }
  );
  return response.data.data;
};

export const getActiveCommentMovies = async (limit = 5) => {
  const response = await axiosInstance.get<{ status: boolean; data: ActiveCommentMovie[] }>(
    API_ENDPOINTS.comments.activeMovies,
    { params: { limit } }
  );
  return response.data.data;
};
