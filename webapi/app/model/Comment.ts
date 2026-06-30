import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  movie_id: Types.ObjectId;
  episode_id?: Types.ObjectId | null;
  parent_id?: Types.ObjectId | null;
  user_id: Types.ObjectId;
  content: string;
  is_spoiler: boolean;
  upvotes: Types.ObjectId[];
  downvotes: Types.ObjectId[];
  upvote_count: number;
  downvote_count: number;
  reply_count: number;
  score: number;
  status: "visible" | "hidden" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    episode_id: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      default: null,
      index: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    is_spoiler: { type: Boolean, default: false },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    upvote_count: { type: Number, default: 0 },
    downvote_count: { type: Number, default: 0 },
    reply_count: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["visible", "hidden", "deleted"],
      default: "visible",
      index: true,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ movie_id: 1, episode_id: 1, parent_id: 1, createdAt: -1 });
CommentSchema.index({ movie_id: 1, parent_id: 1, score: -1, createdAt: -1 });
CommentSchema.index({ status: 1, score: -1, createdAt: -1 });

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
