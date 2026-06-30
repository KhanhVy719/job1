import axios from "axios";

const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000",
  withCredentials: true,
});

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

export const getLatestComments = async (limit = 12) => {
  const response = await publicApi.get<{ status: boolean; data: FilmComment[] }>(
    "/api/v1/comments/latest",
    { params: { limit } }
  );
  return response.data.data;
};

export const getTopComments = async (limit = 8) => {
  const response = await publicApi.get<{ status: boolean; data: FilmComment[] }>(
    "/api/v1/comments/top",
    { params: { limit } }
  );
  return response.data.data;
};

export const getActiveCommentMovies = async (limit = 5) => {
  const response = await publicApi.get<{ status: boolean; data: ActiveCommentMovie[] }>(
    "/api/v1/comments/active-movies",
    { params: { limit } }
  );
  return response.data.data;
};
