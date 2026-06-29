import mongoose from "mongoose";
// Tách import type riêng để không bị lỗi runtime với CommonJS
import type { Document, Model } from "mongoose";

export interface IActor extends Document {
  _id: mongoose.Types.ObjectId;
  tmdb_id?: number;
  name: string;
  slug: string;
  avatar: string;
  aka: string[];
  biography: string;
  gender: "Nam" | "Nữ" | "Khác" | "Unknown";
  birthday?: Date | null;
  place_of_birth?: string;
  movies?: mongoose.Types.ObjectId[];
}

const actorSchema = new mongoose.Schema<IActor>(
  {
    tmdb_id: { type: Number, index: true, unique: true, sparse: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    avatar: { type: String, default: "" },
    aka: { type: [String], default: [] },
    biography: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["Nam", "Nữ", "Khác", "Unknown"],
      default: "Unknown",
    },
    birthday: { type: Date, default: null },
    place_of_birth: { type: String, default: "" },
    movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

const Actor: Model<IActor> =
  mongoose.models.Actor || mongoose.model<IActor>("Actor", actorSchema);

export default Actor;
