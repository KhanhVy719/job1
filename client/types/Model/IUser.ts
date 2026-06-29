
interface IUser{
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
    movie: IMovie[];
    watchedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}