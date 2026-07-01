import { Request, Response } from "express";
import Category from "../../model/Category";
import Country from "../../model/Country";
import ViewerTranslationService, { resolveViewerLanguage } from "../../services/ViewerTranslationService";


class MetaController {
  static getAllCategories = async (req: Request, res: Response) => {
    try {
      const viewerLanguage = resolveViewerLanguage(req);
      const data = await Category.find({}).select("name slug").sort({ name: 1 }).lean();
      res.json({
        status: true,
        data: ViewerTranslationService.localizeCategories(data, viewerLanguage),
      });
    } catch (e) {
      res.json({ status: false, data: [] });
    }
  };

  static getAllCountries = async (req: Request, res: Response) => {
    try {
      const viewerLanguage = resolveViewerLanguage(req);
      const data = await Country.find({}).select("name slug code").sort({ name: 1 }).lean();
      res.json({
        status: true,
        data: ViewerTranslationService.localizeCountries(data, viewerLanguage),
      });
    } catch (e) {
      res.json({ status: false, data: [] });
    }
  };
}

export default MetaController;
