
interface IUserPlaylist {
  _id: string;
  name: string;
  movies?: Array<IMovie | string>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface IUser{
  _id?: string;
  fullname: string;
  email: string;
  password: string; 
  gender: "male" | "female" | "other";
  verify: boolean;
  avatar: string;
  coin: number;
  vip: number;
  expiryDate:Date;
  level: number;
  favorites: IMovie[];
  history: {
    movie: IMovie | null;
    watchedAt: string | Date;
  }[];
  playlists?: IUserPlaylist[];
  createdAt: Date;
  updatedAt: Date;
}
