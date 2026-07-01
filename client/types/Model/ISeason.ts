 interface ISeason {
  _id: string;
  movie_id: string;   // Link ngược lại Movie
  season_number: number;      // Số thứ tự mùa
  name: string;               // Tên mùa
  overview?: string;
  slug?:string;
  poster_path?: string;
  air_date?: string;
  episode_count: number;
  episodes: IEpisode[]; // Ref đến Episode
  translations?: Record<string, Record<string, string>>;
}
