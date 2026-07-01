interface ICategory {
  _id: number;
  slug: string;
  name: string;
  translations?: Record<string, Record<string, string>>;
}
