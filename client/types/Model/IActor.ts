interface IActor {
  _id:string;
  tmdb_id?: number;
  name: string;
  slug: string;
  avatar: string;
  aka: string[];
  biography: string;
  gender: "Nam" | "Nữ" | "Khác" | "Unknown";
  birthday: string;
  place_of_birth?: string;
  movies?:string[];
}