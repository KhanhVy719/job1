interface IMovie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  play_url?: string;
  content: string;
  type: string;
  status: string;
  thumb_url: string;
  poster_url: string;
  trailer_url: string[];
  backdrops: string[];
  studio: IStudio[];
  title_logo: string;
  badges: IBadge[];
  time: string;
  episode_current: string;
  episode_total: string;
  quality: string;
  lang: number[];
  year: number;
  view: number;
  content_rating: string;
  actor: IActor[];
  director: IActor[];
  category: ICategory[];
  country: ICountry[];
  seasons: ISeason[];
  translations?: Record<string, Record<string, string>>;
  tmdb?: {
    type: string;
    id: string;
    total_seasons?: number;
    vote_average: number;
    vote_count: number;
    collection?: {
      id: string;
      name: string;
      poster_path?: string;
      backdrop_path?: string;
    };
  };
  imdb?: {
    id: string;
    vote_average?: number;
    vote_count?: number;
  };
  zxc?: IZxcVerification;
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IBadge {
  type: string; // 'ai_suggest', 'hot', 'new', 'vip'
  text: string; // 'AI Gợi Ý', 'Mới', 'Hot'
}

interface IZxcVerification {
  status: "unknown" | "checking" | "available" | "missing" | "mismatch" | "error";
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
