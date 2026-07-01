interface ICountry {
  _id:string;
  code: string; 
  name: string; 
  slug: string; 
  translations?: Record<string, Record<string, string>>;
}
