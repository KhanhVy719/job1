import { FilterQuery } from "mongoose";

export interface SearchParams {
  q?: string;
  countries?: string;
  genres?: string;
  years?: string;
  status?: string;
  type?: string;
  quality?: string;
  chieurap?: string;
  sort?: string;
  page?: number | string;
  limit?: number | string;
}

export interface PaginationData<T> {
  items: T[];
  pagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
}

export const VALID_IMAGE_CONSTRAINT = {
  thumb_url: { $ne: "" },
  poster_url: { $ne: "" },
};

export const isZxcVerifiedRequired = () =>
  process.env.REQUIRE_ZXC_VERIFIED === "true";

export const ZXC_AVAILABLE_CONSTRAINT = {
  "zxc.status": "available",
};

export const LOCAL_VIDEO_AVAILABLE_CONSTRAINT = {
  has_local_video: true,
};

export const PLAYABLE_MOVIE_CONSTRAINT = {
  $or: [ZXC_AVAILABLE_CONSTRAINT, LOCAL_VIDEO_AVAILABLE_CONSTRAINT],
};

export const publicPlayableMovieConstraint = () =>
  isZxcVerifiedRequired() ? { $and: [PLAYABLE_MOVIE_CONSTRAINT] } : {};

export const publicMovieConstraint = () => ({
  ...VALID_IMAGE_CONSTRAINT,
  ...publicPlayableMovieConstraint(),
});
export const ALL_SECTIONS_CONFIG = [
  // --- HOT & TRENDING ---
  { title: "Phim Điện Ảnh Mới Coóng", slug: "phim-dien-anh-moi", type: "single_new", queryKey: "newSingleMovies" },
  { title: "Top 10 Phim Bộ Hôm Nay", slug: "top-10-phim-bo-hom-nay", type: "top_series", queryKey: "top10SeriesToday" },
  { title: "Phim Bộ Mới Cập Nhật", slug: "phim-bo", type: "series", queryKey: "series" },
  { title: "Phim Lẻ Mới Đến", slug: "phim-le", type: "single", queryKey: "single" },
  { title: "Phim Sắp Tới", slug: "phim-sap-toi", type: "upcoming", queryKey: "upcoming" },
  { title: "Phim Hàn Quốc mới", slug: "han-quoc", type: "country", queryKey: "hanQuocMovies" },
  { title: "Phim Trung Quốc mới", slug: "trung-quoc", type: "country", queryKey: "trungQuocMovies" },
  { title: "Phim Nhật Mới Oanh Tạc", slug: "phim-nhat", type: "country", queryKey: "japanMovies" },
  { title: "Phim Thái: Không Drama Đời Không Nể", slug: "phim-thai", type: "country", queryKey: "thailandMovies" },
  { title: "Phim US-UK mới", slug: "au-my", type: "country", queryKey: "usUkMovies" },
  { title: "Kho Tàng Anime Mới Nhất", slug: "hoat-hinh", type: "hoathinh", queryKey: "anime" },
  { title: "Phim Chiếu Rạp Hot", slug: "phim-chieu-rap-hot", type: "cinema_hot", queryKey: "cinemaHot" },
  { title: "Mãn Nhãn với Phim Chiếu Rạp", slug: "phim-chieu-rap", type: "cinema", queryKey: "cinemaNew" },
];

export const QUERY_MAPPING: Record<string, any> = {
  newSingleMovies: { type: "custom_query", query: { type: "movie" }, sort: { createdAt: -1 } },
  top10SeriesToday: { type: "custom_query", query: { type: "tv" }, sort: { view: -1 }, limit: 10 },
  series: { type: "custom_query", query: { type: "tv" }, sort: { updatedAt: -1 } },
  single: { type: "custom_query", query: { type: "movie" }, sort: { createdAt: -1 } },
  upcoming: { type: "upcoming" },
  cinemaHot: { type: "custom_query", query: { chieurap: true }, sort: { view: -1 }, limit: 10 },
  cinemaNew: { type: "custom_query", query: { chieurap: true }, sort: { createdAt: -1 } },
  hanQuocMovies: { type: "country", code: "KR" },
  trungQuocMovies: { type: "country", code: "CN" },
  japanMovies: { type: "country", code: "JP" },
  thailandMovies: { type: "country", code: "TH" },
  usUkMovies: { type: "country_group", codes: ["US", "UK"] },
  anime: { type: "combo", categorySlug: "phim-hoat-hinh", countryCode: "JP" },
};
export const PRELOAD_KEYS = [
  "hanQuocMovies", "trungQuocMovies", "usUkMovies", "newSingleMovies",
  "top10SeriesToday", "cinemaNew", "japanMovies", "thailandMovies",
  "upcoming", "anime", "series", "single", "cinemaHot",
];


export const paginateResult = async <T>(
  model: any,
  query: FilterQuery<any>,
  page: number,
  limit: number,
  sort: string | Record<string, any> = { updatedAt: -1 },
  select: string = "",
  populate: any[] = []
): Promise<PaginationData<T>> => {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    model.find(query).select(select).sort(sort).skip(skip).limit(limit).populate(populate).lean(),
    model.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      totalItems: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      itemsPerPage: limit,
    },
  };
};

export const toSlug = (str: string): string => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
};
