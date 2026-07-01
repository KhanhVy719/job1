import mongoose, { Schema } from "mongoose";
import type { Document, Model, Types } from "mongoose";

// Dùng import type để tránh vòng lặp dependency
import type { IMovie } from "./Movie"; 
import type { IEpisode } from "./Episode";

export interface ISeason extends Document {
  _id: Types.ObjectId;
  movie_id: Types.ObjectId | IMovie; 
  season_number: number;
  name: string;
  slug: string;
  overview?: string;
  poster_path?: string;
  air_date?: Date;
  episode_count: number;
  translations?: Record<string, Record<string, string>>;
  
  // Array chứa ObjectId hoặc Object Episode đã populate
  episodes: Types.ObjectId[] | IEpisode[];
}

const SeasonSchema = new Schema<ISeason>(
  {
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    season_number: { type: Number, required: true },
    name: { type: String, required: true },
    overview: { type: String, default: "" },
    slug: { type: String, required: true },
    poster_path: { type: String, default: "" },
    air_date: { type: Date },
    episode_count: { type: Number, default: 0 },
    episodes: [{ type: Schema.Types.ObjectId, ref: "Episode", default: [] }],
    translations: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true } 
);

// Index đảm bảo: Một phim không thể có 2 season trùng số thứ tự
SeasonSchema.index({ movie_id: 1, season_number: 1 }, { unique: true });

const Season: Model<ISeason> = mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema);

export default Season;
