import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

// Import các Interface (Dùng type để tránh lỗi runtime circular)
import type { ICategory } from "./Category";
import type { IActor } from "./Actor";
// import type { IEpisode } from "./Episode"; // Movie có thể không cần link trực tiếp tới Episode nếu đã qua Season
import type { ICountry } from "./Country";
import type { IStudio } from "./Studio";
import type { ISeason } from "./Season";

export interface IMovie extends Document {
  _id: Types.ObjectId;
  name: string;
  origin_name: string;
  slug: string;
  content: string;
  type: string; // 'movie' | 'tv'
  status: string;
  thumb_url: string;
  poster_url: string;
  trailer_url: string[];
  backdrops: string[];
  studio: Types.ObjectId[] | IStudio[];
  title_logo: string;
  time: string;
  episode_current: string;
  episode_total: string;
  quality: string;
  lang: number[];
  year: number;
  view: number;
  content_rating: string;
  actor: Types.ObjectId[] | IActor[];
  director: Types.ObjectId[] | IActor[];
  category: Types.ObjectId[] | ICategory[];
  country: Types.ObjectId[] | ICountry[];

  // Tham chiếu đến Season Model
  seasons: Types.ObjectId[] | ISeason[];

  // Metadata từ TMDB/IMDB
  tmdb?: {
    type: string;
    id: string;
    total_seasons?: number;
    vote_average: number;
    vote_count: number;
    collection?: {
      id: string;
      name: string;
      poster_path?: string;
      backdrop_path?: string;
    };
  };
  imdb?: {
    id: string;
    vote_average: number;
    vote_count: number;
  };
  has_local_video: boolean;
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
}

// ==========================================================
// MOVIE SCHEMA
// ==========================================================
const movieSchema = new Schema<IMovie>(
  {
    name: { type: String, required: true, index: true },
    origin_name: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, default: "" },
    type: { type: String, default: "series" },
    status: { type: String, default: "ongoing" },
    thumb_url: { type: String, default: "" },
    poster_url: { type: String, default: "" },
    trailer_url: { type: [String], default: [] },
    backdrops: { type: [String], default: [] },
    
    // References
    studio: [{ type: Schema.Types.ObjectId, ref: "Studio", default: [] }],
    actor: [{ type: Schema.Types.ObjectId, ref: "Actor", default: [] }],
    director: [{ type: Schema.Types.ObjectId, ref: "Actor", default: [] }],
    category: [{ type: Schema.Types.ObjectId, ref: "Category", default: [] }],
    country: [{ type: Schema.Types.ObjectId, ref: "Country", default: [] }],
    seasons: [{ type: Schema.Types.ObjectId, ref: "Season", default: [] }],

    title_logo: { type: String, default: "" },
    time: { type: String, default: "" },
    episode_current: { type: String, default: "" },
    episode_total: { type: String, default: "" },
    quality: { type: String, default: "HD" },
    lang: { type: [Number], default: [1] },
    year: { type: Number },
    view: { type: Number, default: 0 },
    content_rating: { type: String, default: "P", index: true },

    tmdb: {
      type: { type: String },
      id: { type: String },
      total_seasons: { type: Number, default: 1 },
      vote_average: { type: Number },
      vote_count: { type: Number },
      collection: {
        id: { type: String },
        name: { type: String },
        poster_path: { type: String },
        backdrop_path: { type: String },
      },
    },
    imdb: {
      id: { type: String },
      vote_average: { type: Number },
      vote_count: { type: Number },
    },
    has_local_video: { type: Boolean, default: false, index: true },
    is_copyright: { type: Boolean, default: false },
    sub_docquyen: { type: Boolean, default: false },
    chieurap: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ==========================================================
// INDEXES — tối ưu cho các truy vấn lọc/sắp xếp phổ biến
// Tránh COLLSCAN khi filter theo type/status/year hoặc sort theo view/year.
// ==========================================================
movieSchema.index({ type: 1 });
movieSchema.index({ status: 1 });
movieSchema.index({ year: -1 });
movieSchema.index({ view: -1 });
// Compound: trang danh sách thường lọc type+status rồi sort theo năm/lượt xem mới nhất
movieSchema.index({ type: 1, status: 1, year: -1 });
movieSchema.index({ type: 1, view: -1 });
movieSchema.index({ createdAt: -1 });

const Movie: Model<IMovie> = mongoose.models.Movie || mongoose.model<IMovie>("Movie", movieSchema);

export default Movie;
