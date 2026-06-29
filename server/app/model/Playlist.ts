import mongoose, { Schema, Document } from "mongoose";

export interface IPlaylist extends Document {
  name: string;
  user: mongoose.Types.ObjectId;
  movies: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    movies: [{ type: Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

export default mongoose.models.Playlist || mongoose.model<IPlaylist>("Playlist", PlaylistSchema);