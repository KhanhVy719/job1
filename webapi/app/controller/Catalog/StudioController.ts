import { Request, Response } from "express";
import Studio from "../../model/Studio";
import Movie from "../../model/Movie";
import { paginateResult, publicMovieConstraint } from "../Shared/shared";
import ViewerTranslationService, { resolveViewerLanguage } from "../../services/ViewerTranslationService";


class StudioController {
  
  // 1. Danh sách Studio (có phân trang)
  static getList = async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const result = await paginateResult(
        Studio,
        {},
        Number(page) || 1,
        Number(limit) || 24,
        { name: 1 },
        "name slug logo_url origin_country"
      );
      res.json({ status: true, data: result });
    } catch (e) {
      res.json({ status: false, message: "Lỗi data Studio" });
    }
  };

  // 2. Chi tiết Studio
  static getDetail = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      const data = await Studio.findOne({ slug }).lean();
      if (!data) return res.status(404).json({ status: false, message: "Không tìm thấy Studio" });
      res.json({ status: true, data });
    } catch (e) {
      res.status(404).json({ status: false, message: "Lỗi data" });
    }
  };

  // 3. Phim thuộc Studio (Sub-resource)
  static getMovies = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { page, limit } = req.query;
    const viewerLanguage = resolveViewerLanguage(req);
    try {
      const parent = await Studio.findOne({ slug }).select("_id").lean();
      if (!parent) return res.json({ status: false, message: "Không tìm thấy dữ liệu" });

      const query = { studio: parent._id, ...publicMovieConstraint() };
      const result = await paginateResult(
        Movie,
        query,
        Number(page) || 1,
        Number(limit) || 24,
        { createdAt: -1 },
        "",
        [{ path: "category", select: "name slug" }]
      );
      res.json({
        status: true,
        data: await ViewerTranslationService.localizePaginationResult(result, viewerLanguage),
      });
    } catch (e) {
      res.json({ status: false, message: "Lỗi lấy danh sách phim" });
    }
  };
}

export default StudioController;
