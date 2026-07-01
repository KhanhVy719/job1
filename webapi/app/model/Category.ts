import mongoose from "mongoose";
// Tách import type riêng để không bị lỗi runtime với CommonJS
import type { Document, Model } from "mongoose";


export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  translations?: Record<string, Record<string, string>>;
}
const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    translations: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema);

export default Category;
