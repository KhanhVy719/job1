import { Request, Response } from "express";
import { FilterQuery, PipelineStage } from "mongoose";
import Movie from "../../model/Movie";
import Category from "../../model/Category";
import Country from "../../model/Country";
import { SearchParams, toSlug } from "../Shared/shared";
import AIService from "../AIService";

class SearchController {
  private static async _resolveId(model: any, key: string | undefined) {
    if (!key || key === "ALL") return null;
    const query = {
      $or: [
        { slug: key },
        { slug: key.toLowerCase() },
        { code: key },
        { code: key.toUpperCase() },
      ],
    };
    return await model.findOne(query).select("_id").lean();
  }

  private static _buildMatchStage(
    params: SearchParams,
    ids: { cat?: any; country?: any }
  ) {
    const { q, years, status, type, quality, chieurap } = params;

    const match: FilterQuery<any> = {
      thumb_url: { $ne: "" },
      poster_url: { $ne: "" },
    };

    if (ids.cat) match.category = ids.cat;
    if (ids.country) match.country = ids.country;
    if (years && years !== "ALL") match.year = parseInt(years);
    if (status && status !== "ALL") match.status = status;
    if (type && type !== "ALL") match.type = type;
    if (quality && quality !== "ALL") match.quality = quality;
    if (String(chieurap) === "1" || String(chieurap) === "true")
      match.chieurap = true;

    if (q?.trim()) {
      const keyword = q.trim();
      const regex = new RegExp(keyword, "i");
      match.$or = [
        { name: regex },
        { origin_name: regex },
        { slug: new RegExp(toSlug(keyword), "i") },
      ];
    }

    return match;
  }

  private static _getSortStage(
    sort: string = "updatedAt",
    isSearching: boolean
  ) {
    if (isSearching) return { view: -1 };

    const sortMap: Record<string, any> = {
      view: { view: -1 },
      year: { year: -1 },
      vote_average: { "tmdb.vote_average": -1 },
      updatedAt: { updatedAt: -1 },
    };

    return sortMap[sort] || sortMap.updatedAt;
  }

  private static async _execute(params: SearchParams) {
    const { genres, countries, page = 1, limit = 24 } = params;

    const limitNum = Math.max(1, Number(limit));
    const skip = (Math.max(1, Number(page)) - 1) * limitNum;

    const [catObj, countryObj] = await Promise.all([
      SearchController._resolveId(Category, genres),
      SearchController._resolveId(Country, countries),
    ]);

    if (
      (genres && genres !== "ALL" && !catObj) ||
      (countries && countries !== "ALL" && !countryObj)
    ) {
      return {
        items: [],
        pagination: {
          totalItems: 0,
          currentPage: Number(page),
          totalPages: 0,
          itemsPerPage: limitNum,
        },
      };
    }

    const matchStage = SearchController._buildMatchStage(params, {
      cat: catObj?._id,
      country: countryObj?._id,
    });

    const sortStage = SearchController._getSortStage(
      params.sort,
      !!params.q?.trim()
    );

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1, slug: 1 } }],
        },
      },
      {
        $lookup: {
          from: "countries",
          localField: "country",
          foreignField: "_id",
          as: "country",
          pipeline: [{ $project: { name: 1, slug: 1, code: 1 } }],
        },
      },
      {
        $lookup: {
          from: "studios",
          localField: "studio",
          foreignField: "_id",
          as: "studio",
          pipeline: [{ $project: { name: 1, slug: 1 } }],
        },
      },
      { $project: { content: 0, actor: 0, director: 0, __v: 0 } },
    ];

    const [totalItems, items] = await Promise.all([
      Movie.countDocuments(matchStage),
      Movie.aggregate(pipeline),
    ]);

    return {
      items,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: Number(page),
        itemsPerPage: limitNum,
      },
    };
  }

  static search = async (req: Request, res: Response) => {
    try {
      const { q, page, limit } = req.query;
      const description = String(q || "").trim();
      const currentPage = Number(page) || 1;
      const limitNum = Number(limit) || 24;

      const dbResult = await SearchController._execute(req.query);

      if (dbResult.items.length > 0) {
        return res.json({
          status: true,
          data: {
            ...dbResult,
            is_mixed: false,
            message: "Kết quả tìm kiếm",
          },
        });
      }

      if (description.length > 2) {
        const aiResult = await AIService.searchByNaturalLanguage(
          description,
          currentPage,
          limitNum
        );
        if (aiResult && aiResult.items.length > 0) {
          const itemsWithBadges = aiResult.items.map((item: any) => ({
            ...item,
            badges: [
              { type: "ai_suggest", text: "✦ AI Gợi Ý", color: "#8b5cf6" },
            ],
          }));

          return res.json({
            status: true,
            data: {
              items: itemsWithBadges,
              pagination: {
                totalItems: aiResult.totalItems,
                currentPage: currentPage,
                totalPages: Math.ceil(aiResult.totalItems / limitNum),
                itemsPerPage: limitNum,
              },
              is_mixed: true,
              message: `Gợi ý thông minh cho: "${description}"`,
            },
          });
        }
      }

      res.json({ status: true, data: dbResult });
    } catch {
      res.status(500).json({ status: false, message: "Search Error" });
    }
  };

  static byGenre = async (req: Request, res: Response) => {
    try {
      const data = await SearchController._execute({
        ...req.query,
        genres: req.params.slug,
      });
      res.json({ status: true, data });
    } catch (e) {
      res.status(500).json({ status: false, message: "Genre Error" });
    }
  };

  static byCountry = async (req: Request, res: Response) => {
    try {
      const data = await SearchController._execute({
        ...req.query,
        countries: req.params.slug,
      });
      res.json({ status: true, data });
    } catch (e) {
      res.status(500).json({ status: false, message: "Country Error" });
    }
  };
}

export default SearchController;
