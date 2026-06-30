import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type UploadJobStatus = "queued" | "running" | "success" | "error" | "canceled";
export type UploadJobType = "file" | "url";

export interface IUploadJob extends Document {
  _id: Types.ObjectId;
  job_id: string;
  type: UploadJobType;
  status: UploadJobStatus;
  phase: string;
  progress: number;
  message: string;
  source_url?: string;
  file_path?: string;
  original_name: string;
  file_size: number;
  public_base_url: string;
  episode_id?: Types.ObjectId;
  movie_id?: Types.ObjectId;
  movie_name: string;
  episode_name: string;
  server_name: string;
  video_type: string;
  seg: number;
  quality?: string;
  duration?: number;
  format?: string;
  bitrate?: number;
  playlist_url?: string;
  relative_playlist_url?: string;
  tiktok_job_id?: string;
  error?: string;
  cancel_requested: boolean;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const UploadJobSchema = new Schema<IUploadJob>(
  {
    job_id: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["file", "url"], required: true },
    status: {
      type: String,
      enum: ["queued", "running", "success", "error", "canceled"],
      default: "queued",
      index: true,
    },
    phase: { type: String, default: "queued", index: true },
    progress: { type: Number, default: 0 },
    message: { type: String, default: "Queued" },
    source_url: { type: String, default: "" },
    file_path: { type: String, default: "" },
    original_name: { type: String, default: "" },
    file_size: { type: Number, default: 0 },
    public_base_url: { type: String, default: "" },
    episode_id: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    movie_name: { type: String, default: "" },
    episode_name: { type: String, default: "" },
    server_name: { type: String, default: "TikTok Manual Upload" },
    video_type: { type: String, default: "phude" },
    seg: { type: Number, default: 4 },
    quality: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    format: { type: String, default: "" },
    bitrate: { type: Number, default: 0 },
    playlist_url: { type: String, default: "" },
    relative_playlist_url: { type: String, default: "" },
    tiktok_job_id: { type: String, default: "" },
    error: { type: String, default: "" },
    cancel_requested: { type: Boolean, default: false },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

UploadJobSchema.index({ status: 1, createdAt: 1 });
UploadJobSchema.index({ movie_id: 1, status: 1, createdAt: -1 });
UploadJobSchema.index({ episode_id: 1, status: 1, createdAt: -1 });

const UploadJob: Model<IUploadJob> =
  mongoose.models.UploadJob || mongoose.model<IUploadJob>("UploadJob", UploadJobSchema);

export default UploadJob;
