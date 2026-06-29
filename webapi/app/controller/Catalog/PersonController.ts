import { Request, Response } from "express";
import Actor from "../../model/Actor";
import Movie from "../../model/Movie";
import { paginateResult, VALID_IMAGE_CONSTRAINT } from "../Shared/shared";


class PersonController {
  
  static getList = async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const result = await paginateResult(
        Actor,
        {},
        Number(page) || 1,
        Number(limit) || 24,
        { name: 1 },
        "name slug avatar aka gender"
      );
      res.json({ status: true, data: result });
    } catch (e) {
      res.json({ status: false, message: "Lỗi data Actor" });
    }
  };

  static getDetail = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      const data = await Actor.findOne({ slug }).lean();
      if (!data) return res.status(404).json({ status: false, message: "Không tìm thấy diễn viên" });
      res.json({ status: true, data });
    } catch (e) {
      res.status(404).json({ status: false, message: "Lỗi data" });
    }
  };

  static getMovies = async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { page, limit } = req.query;
    try {
      const parent = await Actor.findOne({ slug }).select("_id").lean();
      if (!parent) return res.json({ status: false, message: "Không tìm thấy dữ liệu" });

      const query = { actor: parent._id, ...VALID_IMAGE_CONSTRAINT };
      const result = await paginateResult(
        Movie,
        query,
        Number(page) || 1,
        Number(limit) || 24,
        { createdAt: -1 },
        "",
        [{ path: "category", select: "name slug" }]
      );
      res.json({ status: true, data: result });
    } catch (e) {
      res.json({ status: false, message: "Lỗi lấy danh sách phim" });
    }
  };
}

export default PersonController;