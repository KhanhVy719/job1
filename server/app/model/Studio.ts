import mongoose from "mongoose";
import type { Document, Model } from "mongoose";

export interface IStudio extends Document {
  _id: mongoose.Types.ObjectId;
  tmdb_id: string;      
  name: string;       
  slug: string;       
  logo_url: string;   
  origin_country: string;
}
const StudioSchema = new mongoose.Schema<IStudio>(
  {
    tmdb_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true },
    logo_url: { type: String, default: "" },
    origin_country: { type: String, default: "" },
  },
  { timestamps: true }
);


const Studio: Model<IStudio> =
  mongoose.models.Studio || mongoose.model<IStudio>("Studio", StudioSchema);

export default Studio;
