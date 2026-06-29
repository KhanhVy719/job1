import { Request, Response } from "express";
import Category from "../../model/Category";
import Country from "../../model/Country";

class MetaController {
  static index = async (req: Request, res: Response) => {
    return res.render("index");
  };
  static getAllCategories = async (req: Request, res: Response) => {
    try {
      const data = await Category.find({})
        .select("name slug")
        .sort({ name: 1 })
        .lean();
      res.json({ status: true, data });
    } catch (e) {
      res.json({ status: false, data: [] });
    }
  };

  static getAllCountries = async (req: Request, res: Response) => {
    try {
      const data = await Country.find({})
        .select("name slug code")
        .sort({ name: 1 })
        .lean();
      res.json({ status: true, data });
    } catch (e) {
      res.json({ status: false, data: [] });
    }
  };
}

export default MetaController;
