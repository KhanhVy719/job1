import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

import type { IMovie } from "./Movie";

export interface IScheduledEpisodeMovieSnapshot {
  id?: string;
  name: string;
  slug: string;
  thumbnail?: string;
  poster?: string;
  quality?: string;
}

export interface IScheduledEpisode extends Document {
  _id: Types.ObjectId;
  movie_id?: Types.ObjectId | IMovie;
  movie_slug: string;
  movie_name: string;
  episode: string;
  episode_number?: string;
  show_date: string;
  show_time?: string | null;
  thumbnail?: string;
  poster?: string;
  quality?: string;
  source: string;
  source_id?: string;
  is_active: boolean;
  movie_snapshot?: IScheduledEpisodeMovieSnapshot;
  createdAt?: Date;
  updatedAt?: Date;
}

const MovieSnapshotSchema = new Schema<IScheduledEpisodeMovieSnapshot>(
  {
    id: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: "" },
    poster: { type: String, default: "" },
    quality: { type: String, default: "" },
  },
  { _id: false }
);

const ScheduledEpisodeSchema = new Schema<IScheduledEpisode>(
  {
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    movie_slug: { type: String, required: true, trim: true, index: true },
    movie_name: { type: String, required: true, trim: true },
    episode: { type: String, required: true, trim: true },
    episode_number: { type: String, default: "", trim: true },
    show_date: { type: String, required: true, index: true },
    show_time: { type: String, default: null },
    thumbnail: { type: String, default: "" },
    poster: { type: String, default: "" },
    quality: { type: String, default: "" },
    source: { type: String, default: "local", index: true },
    source_id: { type: String, default: "", index: true },
    is_active: { type: Boolean, default: true, index: true },
    movie_snapshot: { type: MovieSnapshotSchema },
  },
  { timestamps: true }
);

ScheduledEpisodeSchema.index({ show_date: 1, show_time: 1 });
ScheduledEpisodeSchema.index({ show_date: 1, movie_slug: 1, episode: 1 }, { unique: true });
ScheduledEpisodeSchema.index({ source: 1, source_id: 1 });

const ScheduledEpisode: Model<IScheduledEpisode> =
  mongoose.models.ScheduledEpisode ||
  mongoose.model<IScheduledEpisode>("ScheduledEpisode", ScheduledEpisodeSchema);

export default ScheduledEpisode;
