import { Request, Response } from "express";
import { Types } from "mongoose";
import Episode, {
  IEpisode,
  ISubtitleResource,
  IVideoResource,
} from "../../model/Episode";
import { localTokenService } from "./services/LocalTokenService";
import { decrypt, Encrypt } from "../../../utils/crypto/fly";
import { decryptAES } from "../../../utils/crypto/fly2";
import Movie from "../../model/Movie";
import Season from "../../model/Season";

// Helper check mobile
const isMobileDevice = (ua: string): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
};

class PlayController {
  public getFilm = async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug || req.query.slug || "");
      const { ct, iv } = req.query;

      if (!slug) {
        return res.status(400).json({ action: "error", message: "MISSING_TOKEN" });
      }

      const requestUA = req.headers["user-agent"] || "";
      const isMobile = isMobileDevice(requestUA);

      const decryptedSlugStr = await decrypt(slug);
      const obj = JSON.parse(decryptedSlugStr);

      let x2Data: any = {};
      try {
        if (ct && iv) {
          x2Data = await decryptAES(ct as string, iv as string);
        }
      } catch (e) {
        // Nếu mobile mà lỗi decrypt thì bỏ qua, nếu PC thì có thể strict hơn ở dưới
        if (!isMobile) console.warn("Failed to decrypt x2Data on Desktop");
      }
      
      const requestIP = this.getClientIp(req);

      // 3. Kiểm tra bảo mật
      const securityCheck = this.verifySecurity(
        obj,
        x2Data,
        requestIP,
        requestUA,
        isMobile // Truyền cờ mobile vào
      );

      if (!securityCheck.isValid) {
        console.warn(
          `[Security Challenge] IP: ${requestIP} - IsMobile: ${isMobile} - Reason: ${securityCheck.reason}`
        );

        const captchaHtmlContent = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding: 20px; text-align:center; font-family: sans-serif; color: #fff;">
                <h3 style="margin-bottom: 10px; color: #e74c3c;">Xác thực bảo mật</h3>
                <p style="font-size: 14px; margin-bottom: 20px; opacity: 0.8;">
                    Hệ thống phát hiện bất thường (${securityCheck.reason}).<br>
                    Vui lòng xác thực để tiếp tục xem phim.
                </p>
            </div>
        `;

        const encryptedView = Encrypt(captchaHtmlContent);

        return res.json({
          action: "captcha",
          view: encryptedView,
          reason: securityCheck.reason,
        });
      }

      // Query Database
      var phim = await Movie.findOne({ slug: obj.phim });
      var phan = await Season.findOne({
        slug: obj.phan,
        movie_id: phim?._id,
      });

      var tap = await Episode.findOne({
        slug: obj.tap,
        season_id: phan?._id,
      }).select("name description thumbnail videos subtitles type");

      if (!tap || !phan || !phim) {
        return res.status(404).json({ message: "Episode not found" });
      }

      // --- LOGIC MỚI: TÌM VIDEO THEO TYPE ---
      const requestedType = String(req.query.type || obj.type || "").trim();
      const shouldUseRequestedType = !!requestedType && requestedType !== "unknown";

      const selectedVideo: IVideoResource | undefined = shouldUseRequestedType
        ? tap.videos.find((v) => v.type === requestedType)
        : tap.videos.find((v) => v.is_default) || tap.videos[0];

      if (!selectedVideo) {
        return res
          .status(404)
          .json({ message: `Video source type '${requestedType || "default"}' not found.` });
      }

      // --- BẢO MẬT: TẠO SECRET VÀ HASH USER-AGENT ---
      const playbackSecret = localTokenService.generateRandomSecret();
      const clientIp = this.getClientIp(req);
      
      // Hash UA: Nếu mobile app thay đổi UA dynamic thì cân nhắc bỏ qua hoặc hash phần tĩnh
      const uaHash = localTokenService.hashUserAgent(requestUA);

      const encryptedToken = localTokenService.encrypt({
        id: tap._id.toString(),
        type: selectedVideo.type,
        ip: clientIp,
        ua: uaHash,
        exp: Date.now() + 10800000, // 3 hours
        secret: playbackSecret,
      });
      const host = this.getRequestBaseUrl(req);
      const localProxyUrl = `${host}/stream/${encryptedToken}`;

      const skipConfig = {
        intro: selectedVideo.skip_intro,
        outro: selectedVideo.skip_outro,
      };

      const sources = [
        {
          file: localProxyUrl,
          label: selectedVideo.quality,
          type: "hls",
          default: true,
        },
      ];

      const tracks = tap.subtitles.map((sub: ISubtitleResource) => ({
        file: sub.url,
        label: sub.label,
        kind: "captions",
        default: sub.language === "vi",
      }));

      return res.json({
        ...obj,
        status: "success",
        session: {
          secret: playbackSecret,
          token: encryptedToken,
        },
        playlist: [
          {
            title: tap.name,
            description: tap.description,
            image: tap.thumbnail,
            sources: sources,
            tracks: tracks,
          },
        ],
        skip: skipConfig,
      });
    } catch (error) {
      console.error("Error in PlayController getFilm:", error);
      return res
        .status(500)
        .json({ action: "error", message: "INTERNAL_SERVER_ERROR" });
    }
  };

  private verifySecurity(
    obj: any,
    x2Data: any,
    reqIP: string,
    reqUA: string,
    isMobile: boolean
  ): { isValid: boolean; reason?: string } {
    
    // 1. Check Link Expire (Giữ lại cho cả Mobile để tránh link cũ bị share)
    const LINK_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 tiếng
    const now = Date.now();
    const linkTime = parseInt(obj.timestamp);

    if (now - linkTime > LINK_EXPIRY_MS) {
      return { isValid: false, reason: "Link expired" };
    }

    // --- NẾU LÀ MOBILE: BỎ QUA CÁC CHECK KHẮT KHE BÊN DƯỚI ---
    if (isMobile) {
        return { isValid: true };
    }

    // --- CÁC CHECK CHO DESKTOP (PC) ---

    // Check User Agent khớp với Slug
    if (obj.userAgent !== reqUA) {
      return {
        isValid: false,
        reason: "User-Agent mismatch (Slug vs Request)",
      };
    }

    // Check UA khớp với Fingerprint
    if (x2Data.browser && x2Data.browser.userAgent !== reqUA) {
      return {
        isValid: false,
        reason: "User-Agent mismatch (Fingerprint vs Request)",
      };
    }

    // Do not hard-bind playback to IP here. In production the page request and
    // CDN iframe request can pass through different Cloudflare edge IPs, so an
    // exact IP match blocks valid viewers even though the encrypted token is OK.

    // Check Webdriver (Automation)
    if (x2Data.browser && x2Data.browser.webdriver === true) {
      return { isValid: false, reason: "Automation tool detected (Webdriver)" };
    }

    // Check Screen Resolution
    if (
      x2Data.screen &&
      (x2Data.screen.width === 0 || x2Data.screen.height === 0)
    ) {
      return { isValid: false, reason: "Invalid screen resolution" };
    }

    // Check Plugins (Chỉ PC mới check kỹ)
    if (
      obj.deviceType === "PC" &&
      x2Data.other &&
      x2Data.other.plugins.length === 0
    ) {
      return { isValid: false, reason: "No plugins detected on PC" };
    }

    return { isValid: true };
  }

  private getRequestBaseUrl(req: Request): string {
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    const forwardedHost = String(req.headers["x-forwarded-host"] || "")
      .split(",")[0]
      .trim();
    const host = forwardedHost || req.get("host") || "";

    if (!host) return process.env.NEXT_PUBLIC_BASE_URL || "";

    const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
    const protocol = forwardedProto || (isLocalHost ? "http" : "https");

    return `${protocol}://${host}`;
  }

  private getClientIp(req: Request): string {
    const ip =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "";
    return ip.split(",")[0].trim();
  }
}

export default new PlayController();
