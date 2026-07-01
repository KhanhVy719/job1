import mongoose from "mongoose";
import type { Document, Model } from "mongoose";

export interface ICountry extends Document {
  _id: mongoose.Types.ObjectId;
  code: string; // Mã quốc gia (VD: VN, US, JP)
  name: string; // Tên hiển thị (VD: Việt Nam)
  slug: string; // Slug (VD: viet-nam)
  translations?: Record<string, Record<string, string>>;
}

const CountrySchema = new mongoose.Schema<ICountry>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // Tự động viết hoa
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true }, // Bỏ unique ở slug, dùng iso làm key chính
    translations: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Country: Model<ICountry> =
  mongoose.models.Country || mongoose.model<ICountry>("Country", CountrySchema);

export default Country;
