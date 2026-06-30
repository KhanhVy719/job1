import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  fullname: string;
  email: string;
  password: string; 
  gender: "male" | "female" | "other";
  verify: boolean;
  avatar: string;
  coin: number;
  vip: number;
  level: number;
  favorites: mongoose.Types.ObjectId[];
  history: {
    movie: mongoose.Types.ObjectId;
    watchedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    verify: {
      type: Boolean,
      default: false,
    },
    avatar: { type: String, default: "" },
    coin: { type: Number, default: 1000 },
    level: { type: Number, default: 1 },
    vip: { type: Number, default: 0 },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Movie" }],
    history: [
      {
        movie: { type: Schema.Types.ObjectId, ref: "Movie" },
        watchedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
