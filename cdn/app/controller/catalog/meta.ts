import { Request, Response } from "express";
import Category from "../../model/Category";
import Country from "../../model/Country";

class MetaController {
  private static getAllowedPlayerOrigins = () => {
    const defaults = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://localhost:3000",
      "https://127.0.0.1:3000",
      "https://peakfilm.net",
      "https://flim.peakfilm.net",
    ];

    const envOrigins = (
      process.env.PLAYER_ALLOWED_ORIGINS ||
      process.env.CORS_ORIGINS ||
      process.env.ALLOWED_ORIGINS ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      ""
    )
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean);

    return Array.from(new Set([...defaults, ...envOrigins]));
  };

  static index = async (req: Request, res: Response) => {
    const allowedPlayerOrigins = MetaController.getAllowedPlayerOrigins();

    return res.render("index", { allowedPlayerOrigins });
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

  static index2 = async (req: Request, res: Response) => {
    try {
      const referer = req.headers.referer || "";
      const originHost = req.headers.host || "";
      const WHITELISTED_ORIGINS = MetaController.getAllowedPlayerOrigins();

      let isTrustedReferer = false;

      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

          if (WHITELISTED_ORIGINS.includes(refererOrigin)) {
            isTrustedReferer = true;
          }
        } catch (e) {
          isTrustedReferer = false;
        }
      }

      if (!isTrustedReferer && referer && referer.includes(originHost)) {
        isTrustedReferer = true;
      }

      if (!isTrustedReferer) {
        console.warn(`[Security] Referer blocked: ${referer}`);
        return res.status(403).end();
      }

      
       return res.status(200).end("oke");
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
