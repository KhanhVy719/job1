import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

interface ResolvedSource {
  url: string;
  quality?: string;
  host?: string;
  format?: string;
  is_default?: boolean;
}

interface ResolvedSubtitle {
  language: string;
  label: string;
  url: string;
}

interface ResolveData {
  type: "hls" | "iframe";
  source: string;
  sources: ResolvedSource[];
  subtitles: ResolvedSubtitle[];
  poster?: string;
  embed_url?: string;
  reason?: string;
  resolvedAt?: string;
}

interface HlsPlayerProps {
  slug: string;
  episodeSlug: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
  onReady?: () => void;
}

const SUB_OFF = -1;

const withViewerToken = async (source: ResolvedSource): Promise<string> => {
  if (!source.host || !/([?&]token=|__TOKEN(PG)?__)/i.test(source.url)) {
    return source.url;
  }

  try {
    const response = await fetch(`https://${source.host}/generate.php`, {
      cache: "no-store",
      mode: "cors",
    });
    if (!response.ok) return source.url;

    const token = (await response.text()).trim();
    if (!token) return source.url;

    const updatedUrl = source.url.replace(/__TOKENPG__|__TOKEN__/g, token);
    try {
      const parsed = new URL(updatedUrl);
      if (parsed.searchParams.has("token")) {
        parsed.searchParams.set("token", token);
        return parsed.toString();
      }
      return updatedUrl;
    } catch {
      return updatedUrl.replace(
        /([?&]token=)[^&#]+/i,
        `$1${encodeURIComponent(token)}`
      );
    }
  } catch {
    return source.url;
  }
};

const HlsPlayer: React.FC<HlsPlayerProps> = ({
  slug,
  episodeSlug,
  poster,
  autoPlay = true,
  className,
  onEnded,
  onReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fatalRetryRef = useRef<Record<string, number>>({});

  const [data, setData] = useState<ResolveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [serverIndex, setServerIndex] = useState(0);
  const [subIndex, setSubIndex] = useState<number>(SUB_OFF);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!slug || !episodeSlug) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    setServerIndex(0);
    setSubIndex(SUB_OFF);
    setLevels([]);
    setCurrentLevel(-1);

    (async () => {
      try {
        const response = await axiosInstance.get(
          API_ENDPOINTS.movie.resolve(slug, episodeSlug)
        );
        const payload = response.data?.data as ResolveData | undefined;
        if (cancelled) return;

        if (!payload) {
          setError("Khong lay duoc nguon phat.");
          return;
        }

        setData(payload);
        if (payload.type === "hls" && !payload.sources?.length) {
          setError("Nguon phat HLS dang rong.");
        }
      } catch {
        if (!cancelled) {
          setError("Nguon phat chua san sang hoac da loi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, episodeSlug, reloadKey]);

  const sources = data?.type === "hls" ? data.sources || [] : [];
  const subtitles = data?.subtitles || [];

  const activeSource = useMemo(() => {
    if (!sources.length) return null;
    const safeIndex = Math.min(serverIndex, sources.length - 1);
    return sources[safeIndex];
  }, [serverIndex, sources]);

  const tryNextServer = useCallback(() => {
    setServerIndex((current) => {
      if (current + 1 < sources.length) return current + 1;
      return current;
    });
  }, [sources.length]);

  const refreshResolvedSource = useCallback(() => {
    fatalRetryRef.current = {};
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource?.url) return;
    let cancelled = false;
    let currentHls: Hls | null = null;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError("");
    setLevels([]);
    setCurrentLevel(-1);

    void (async () => {
      const streamUrl = await withViewerToken(activeSource);
      if (cancelled) return;

      const canPlayNative = video.canPlayType("application/vnd.apple.mpegurl");

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        currentHls = hls;
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, manifest) => {
          setLevels(
            manifest.levels.map((level, index) => ({
              height: level.height || 0,
              index,
            }))
          );
          onReady?.();
          if (autoPlay) {
            void video.play().catch(() => undefined);
          }
        });

        hls.on(Hls.Events.ERROR, (_event, errorData) => {
          if (!errorData.fatal) return;

          if (errorData.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }

          const retryKey = `${serverIndex}:${activeSource.url}`;
          const retryCount = fatalRetryRef.current[retryKey] || 0;

          if (errorData.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount < 1) {
            fatalRetryRef.current[retryKey] = retryCount + 1;
            refreshResolvedSource();
            return;
          }

          if (serverIndex + 1 < sources.length) {
            tryNextServer();
            return;
          }

          setError("Khong phat duoc nguon HLS hien tai.");
        });
      } else if (canPlayNative) {
        video.src = streamUrl;
        video.addEventListener(
          "loadedmetadata",
          () => {
            onReady?.();
            if (autoPlay) {
              void video.play().catch(() => undefined);
            }
          },
          { once: true }
        );
      } else {
        setError("Trinh duyet khong ho tro HLS.");
      }
    })();

    return () => {
      cancelled = true;
      if (currentHls) {
        currentHls.destroy();
      }
      if (hlsRef.current === currentHls) {
        hlsRef.current = null;
      }
    };
  }, [
    activeSource?.url,
    autoPlay,
    onReady,
    refreshResolvedSource,
    serverIndex,
    sources.length,
    tryNextServer,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].mode = index === subIndex ? "showing" : "hidden";
    }
  }, [activeSource?.url, subIndex, subtitles.length]);

  const changeLevel = useCallback((levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  }, []);

  const switchServer = useCallback((index: number) => {
    setServerIndex(index);
    setShowSettings(false);
  }, []);

  if (data?.type === "iframe" && data.embed_url) {
    return (
      <iframe
        className={className || "absolute inset-0 h-full w-full"}
        src={data.embed_url}
        allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="no-referrer"
        allowFullScreen
      />
    );
  }

  return (
    <div className={className || "absolute inset-0 h-full w-full"}>
      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        controls
        playsInline
        poster={data?.poster || poster}
        crossOrigin="anonymous"
        onEnded={onEnded}
      >
        {subtitles.map((subtitle, index) => (
          <track
            key={`${subtitle.language || "sub"}-${index}`}
            kind="subtitles"
            src={subtitle.url}
            srcLang={subtitle.language || "und"}
            label={subtitle.label || subtitle.language || `Sub ${index + 1}`}
          />
        ))}
      </video>

      {(loading || (!data && !error)) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
          <span className="text-sm text-white">Dang tai nguon phat...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black px-4 text-center text-sm text-white">
          {error}
        </div>
      )}

      {data?.type === "hls" && !loading && !error && (
        <div className="absolute right-2 top-2 z-30">
          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
            title="Cai dat phat"
          >
            <i className="fa-solid fa-gear text-sm" />
          </button>

          {showSettings && (
            <div className="mt-2 w-56 space-y-3 rounded-lg border border-white/10 bg-[#14151b] p-3 text-xs text-white shadow-xl">
              {sources.length > 1 && (
                <div>
                  <div className="mb-1.5 text-gray-400">Server</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((source, index) => (
                      <button
                        type="button"
                        key={`${source.url}-${index}`}
                        onClick={() => switchServer(index)}
                        className={`rounded border px-2 py-1 ${
                          serverIndex === index
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/15 text-gray-300 hover:text-white"
                        }`}
                      >
                        #{index + 1}
                        {source.quality ? ` ${source.quality}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {levels.length > 1 && (
                <div>
                  <div className="mb-1.5 text-gray-400">Chat luong</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => changeLevel(-1)}
                      className={`rounded border px-2 py-1 ${
                        currentLevel === -1
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/15 text-gray-300 hover:text-white"
                      }`}
                    >
                      Auto
                    </button>
                    {levels.map((level) => (
                      <button
                        type="button"
                        key={level.index}
                        onClick={() => changeLevel(level.index)}
                        className={`rounded border px-2 py-1 ${
                          currentLevel === level.index
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/15 text-gray-300 hover:text-white"
                        }`}
                      >
                        {level.height ? `${level.height}p` : `L${level.index}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-gray-400">Phu de</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubIndex(SUB_OFF)}
                    className={`rounded border px-2 py-1 ${
                      subIndex === SUB_OFF
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/15 text-gray-300 hover:text-white"
                    }`}
                  >
                    Tat
                  </button>
                  {subtitles.map((subtitle, index) => (
                    <button
                      type="button"
                      key={`${subtitle.language || "sub"}-${index}`}
                      onClick={() => setSubIndex(index)}
                      className={`rounded border px-2 py-1 ${
                        subIndex === index
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/15 text-gray-300 hover:text-white"
                      }`}
                    >
                      {subtitle.label || subtitle.language || `Sub ${index + 1}`}
                    </button>
                  ))}
                  {!subtitles.length && (
                    <span className="text-gray-500">Khong co phu de</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
