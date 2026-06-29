import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

import type { IMovie } from "./Movie";
import type { ISeason } from "./Season";

export enum VideoFormat {
  M3U8 = "m3u8",
  MP4 = "mp4",
  MKV = "mkv"
}

export interface ISkipTime {
  start: number;
  end: number;
}

export interface IVideoResource {
  server_name?: string;
  quality: string;
  url: string;
  type: string;
  format: VideoFormat;
  skip_intro?: ISkipTime;
  skip_outro?: ISkipTime;
  is_default: boolean;
}

export interface IAudioResource {
  language: string;
  label: string;
  url: string;
}

export interface ISubtitleResource {
  language: string;
  label: string;
  url: string;
}

const SkipTimeSchema = new Schema<ISkipTime>(
  {
    start: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
  },
  { _id: false }
);

const VideoSchema = new Schema<IVideoResource>(
  {
    server_name: { type: String, default: "Main Server" },
    quality: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: 'phude', required: true },
    format: { 
      type: String, 
      enum: Object.values(VideoFormat), 
      default: VideoFormat.M3U8 
    },
    skip_intro: { type: SkipTimeSchema, default: { start: 0, end: 0 } },
    skip_outro: { type: SkipTimeSchema, default: { start: 0, end: 0 } },
    is_default: { type: Boolean, default: false },
  },
  { _id: false }
);

const AudioSchema = new Schema<IAudioResource>(
  {
    language: { type: String, default: "vi" },
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const SubtitleSchema = new Schema<ISubtitleResource>(
  {
    language: { type: String, default: "vi" },
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

export interface IEpisode extends Document {
  _id: Types.ObjectId;
  
  movie_id: Types.ObjectId | IMovie;
  season_id: Types.ObjectId | ISeason;

  name: string;
  slug: string;
  episode: number;
  types: string[]; // <--- TRƯỜNG MỚI ĐÃ THÊM

  // URL nhúng iframe (VidSrc) — nguồn xem mặc định khi chưa có bản tự host trong videos[]
  embed_url?: string;

  thumbnail?: string;
  description?: string;
  duration?: number;
  air_date?: Date;
  vote_average?: number;

  videos: IVideoResource[]; 
  audios: IAudioResource[];
  subtitles: ISubtitleResource[];

  sort_order: number;
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    season_id: {
      type: Schema.Types.ObjectId,
      ref: "Season", 
      required: true,
      index: true
    },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true, trim: true },
    episode: { type: Number, required: true, index: true },
    types: { type: [String], default: [] }, // <--- SCHEMA MỚI ĐÃ THÊM

    embed_url: { type: String, default: "" }, // URL nhúng iframe (VidSrc)

    thumbnail: { type: String, default: "" },
    description: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    
    air_date: { type: Date },
    vote_average: { type: Number, default: 0 },

    videos: { type: [VideoSchema], default: [] },
    audios: { type: [AudioSchema], default: [] },
    subtitles: { type: [SubtitleSchema], default: [] },

    sort_order: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

EpisodeSchema.index(
  { season_id: 1, episode: 1 }, 
  { unique: true }
);

const Episode: Model<IEpisode> = mongoose.models.Episode || mongoose.model<IEpisode>("Episode", EpisodeSchema);

export default Episode;