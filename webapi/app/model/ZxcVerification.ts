import { Schema } from "mongoose";

export type ZxcStatus =
  | "unknown"
  | "checking"
  | "available"
  | "missing"
  | "mismatch"
  | "error";

export interface IZxcVerification {
  status: ZxcStatus;
  checkedAt?: Date;
  verifiedAt?: Date;
  reason?: string;
  server?: string;
  sourceCount?: number;
  mediaType?: "movie" | "tv";
  tmdbId?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  matchedTitle?: string;
  matchedYear?: number;
}

export const ZxcVerificationSchema = new Schema<IZxcVerification>(
  {
    status: {
      type: String,
      enum: ["unknown", "checking", "available", "missing", "mismatch", "error"],
      default: "unknown",
      index: true,
    },
    checkedAt: { type: Date },
    verifiedAt: { type: Date },
    reason: { type: String, default: "" },
    server: { type: String, default: "" },
    sourceCount: { type: Number, default: 0 },
    mediaType: { type: String, enum: ["movie", "tv"] },
    tmdbId: { type: String, default: "" },
    imdbId: { type: String, default: "" },
    season: { type: Number },
    episode: { type: Number },
    matchedTitle: { type: String, default: "" },
    matchedYear: { type: Number },
  },
  { _id: false }
);
