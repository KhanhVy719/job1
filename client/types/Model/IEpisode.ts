interface ISkipTime {
  start: number;
  end: number;
}

interface IVideo {
  server_name?: string;
  quality: string;
  url: string;
  type: string;
  format: string;
  skip_intro?: ISkipTime;
  skip_outro?: ISkipTime;
  is_default: boolean;
}

interface IAudio {
  language: string;
  label: string;
  url: string;
}

interface ISubtitle {
  language: string;
  label: string;
  url: string;
}

interface IEpisode {
  _id: string;

  // Reference
  movie_id: string | IMovie; // Link đến Movie
  season_id: string | ISeason; // Link đến Season (Đã đổi tên từ seasons -> season_id)
  types: [string];
  // Định danh tập phim
  name: string;
  slug: string;
  episode: number;

  // Metadata
  embed_url?: string;
  thumbnail?: string;
  description?: string;
  duration?: number;
  air_date?: Date;
  vote_average?: number;

  //  Lists
  videos: IVideo[];
  audios: IAudio[];
  subtitles: ISubtitle[];
  zxc?: IZxcVerification;

  // System
  sort_order: number;
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
}
