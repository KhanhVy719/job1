import { Request, Response } from "express";
import { Types } from "mongoose";
import Episode, { IEpisode, ISubtitleResource } from "../../model/Episode";
import { localTokenService } from "./services/LocalTokenService";

class PlayController {
    
    constructor() {
        this.getSecuredEpisodeData = this.getSecuredEpisodeData.bind(this);
    }

    /**
     * Helper: Lấy IP thực (Bypass Nginx/Cloudflare/Proxy)
     */
    private getClientIp(req: Request): string {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (typeof xForwardedFor === 'string') {
            return xForwardedFor.split(',')[0].trim();
        }
        return req.socket.remoteAddress || '0.0.0.0';
    }

    public async getSecuredEpisodeData(req: Request, res: Response) {
        const { episodeId } = req.params;
        const videoIndex = parseInt(req.query.ep as string, 10) || 0;

        if (!Types.ObjectId.isValid(episodeId)) {
            return res.status(400).json({ message: "Invalid Episode ID" });
        }

        try {
            // Lấy thông tin tập phim
            const episode: IEpisode | null = await Episode.findById(episodeId, {
                name: 1, description: 1, thumbnail: 1, videos: 1, subtitles: 1
            });

            if (!episode) return res.status(404).json({ message: "Episode not found" });

            if (videoIndex < 0 || videoIndex >= episode.videos.length) {
                return res.status(404).json({ message: "Video source not found." });
            }

            const selectedVideo = episode.videos[videoIndex];

            // --- BẢO MẬT: TẠO SECRET VÀ HASH USER-AGENT ---
            const playbackSecret = localTokenService.generateRandomSecret(); // Secret này cần gửi về Client
            const clientIp = this.getClientIp(req);
            const userAgent = req.headers['user-agent'] || '';
            const uaHash = localTokenService.hashUserAgent(userAgent);

            // Tạo Token Mã Hóa (Token này sẽ được giải mã bên StreamController)
            const encryptedToken = localTokenService.encrypt({
                id: episodeId,
                index: videoIndex,
                ip: clientIp,
                ua: uaHash,
                exp: Date.now() + 10800000, // 3 hours
                secret: playbackSecret // StreamController sẽ check secret này với header
            });

            // URL trỏ về Proxy Server (StreamController)
            const host = `${req.protocol}://${req.get("host")}`; 
            const localProxyUrl = `${host}/stream/${encryptedToken}`;

            const skipConfig = {
                intro: selectedVideo.skip_intro,
                outro: selectedVideo.skip_outro,
            };

            const sources = [{
                file: localProxyUrl,
                label: selectedVideo.quality,
                type: "hls",
                default: true
            }];

            const tracks = episode.subtitles.map((sub: ISubtitleResource) => ({
                file: sub.url,
                label: sub.label,
                kind: "captions",
                default: sub.language === "vi"
            }));

            return res.json({
                action: 'play',
                // Quan trọng: Gửi session info về để Client config header "x-playback-session"
                session: {
                    secret: playbackSecret,
                    token: encryptedToken
                },
                playlist: [{
                    title: episode.name,
                    description: episode.description,
                    image: episode.thumbnail,
                    sources: sources,
                    tracks: tracks,
                }],
                skip: skipConfig,
            });

        } catch (error) {
            console.error("Error in PlayController:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export default new PlayController();