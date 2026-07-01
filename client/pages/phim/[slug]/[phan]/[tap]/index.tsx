import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import Image from 'next/image';
import dynamic from "next/dynamic";
import { GetServerSideProps, NextPage } from 'next';
import { NextSeo, VideoJsonLd } from 'next-seo';
import clsx from "clsx";

import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { useAccountMovieActions } from "@/hooks/useAccountMovieActions";
import { Encrypt } from "@/utils/crypto/fly";
import { create } from "@/utils/crypto/fly2";
import { withEncryptedProps } from '@/utils/server-props';
import { decryptData } from '@/utils/security';

import CommentItems from "@/sections/film/Comment";
import RatedItems from "@/sections/film/Rated";
import icon from '@/types/icon';
import Play from "@/components/loading/play";

const ProposalGird2 = dynamic(() => import("@/components/Movie/ProposalGird2"), { ssr: false });

interface IEpisodeVideo {
  type: string;
  url?: string;
  format?: string;
  is_default?: boolean;
  [key: string]: unknown;
}

interface IPageProps {
  initialMovie: IMovie;
  initialSessions: ISeason[];
  initialEpisodes: IEpisode[];
  initialProposals: IMovie[];
  dynamicData: string;
  __e?: string;
}

interface PluginMimeType {
  type: string;
  suffixes: string;
  description: string;
}

interface PluginData {
  name: string;
  description: string;
  filename: string;
  version: string;
  mimeTypes: PluginMimeType[];
}

interface ConsoleExtended extends Console {
  firebug?: unknown;
  table: (...data: unknown[]) => void;
  memory?: unknown;
  [key: string]: unknown;
}

interface NetworkInformation extends EventTarget {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  onChange?: (e: Event) => void;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  oscpu?: string;
  connection?: NetworkInformation;
  getBattery?: () => Promise<BatteryManager>;
  msMaxTouchPoints?: number;
  buildID?: string;
}

interface ScreenExtended extends Screen {
  availLeft?: number;
  availTop?: number;
  deviceXDPI?: number;
  deviceYDPI?: number;
  logicalXDPI?: number;
  logicalYDPI?: number;
  fontSmoothingEnabled?: boolean;
  isExtended?: boolean;
}

interface InfoCollector {
  browser?: Record<string, unknown>;
  screen?: Record<string, unknown>;
  mouseActivity?: Record<string, unknown>;
  devTools?: { isOpen: boolean; methods: Record<string, boolean> };
  other?: Record<string, unknown>;
  [key: string]: unknown;
}

interface WindowExtended extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

interface IPlayerMessageData {
  action?: string;
  type?: string;
  payload?: unknown;
  value?: unknown;
  data?: unknown;
}

const LANGUAGE_MAPPING: Record<string, { id: string; label: string; backendType: string }> = {
  'phude': { id: 'phude', label: 'Phụ đề', backendType: 'phude' },
  'thuyetminh': { id: 'thuyetminh', label: 'Thuyết minh', backendType: 'thuyetminh' },
  'longtieng': { id: 'longtieng', label: 'Lồng tiếng', backendType: 'longtieng' },
  'raw': { id: 'raw', label: 'RAW', backendType: 'raw' },
};

const BottomItems = [{ id: "comment", label: "Bình luận" }, { id: "rate", label: "Đánh giá" }];

interface EmbedServerOption {
  id: string;
  label: string;
  url: string;
}

const EMBED_PROVIDERS = [
  {
    id: "vsembed",
    label: "VSEmbed",
    movie: (tmdbId: string) => `https://vsembed.su/embed/movie?tmdb=${tmdbId}`,
    tv: (tmdbId: string, season: number, episode: number) =>
      `https://vsembed.su/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
  },
];

const SELF_HOSTED_PLAYER_VERSION = "captcha-query-20260630-allow-origin";

const getUrlOrigin = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const XemPhim: NextPage<IPageProps> = (props) => {
  const router = useRouter();

  const data = useMemo<IPageProps>(() => {
    if (props?.__e) {
      try {
        const decrypted = decryptData(props.__e);
        return { ...props, ...decrypted };
      } catch {
        return props;
      }
    }
    return props;
  }, [props]);

  const { initialProposals, initialMovie, initialEpisodes, initialSessions, dynamicData } = data;
  const { slug, tap, phan, type } = router.query;
  const playerRef = useRef<HTMLIFrameElement>(null);
  const lastPlaybackRequestRef = useRef<string>("");
  const lastHistorySyncRef = useRef<string>("");

  const [encryptedPayload, setEncryptedPayload] = useState<Record<string, unknown> | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadedSourceEpisodeId, setLoadedSourceEpisodeId] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [serverIndex, setServerIndex] = useState(0);

  const [proposals, setProposals] = useState<IMovie[]>(initialProposals);
  const [isPart, setIsPart] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("comment");
  const [commentCount, setCommentCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [autoNext, setAutoNext] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);

  const [movie] = useState<IMovie | null>(initialMovie);
  const {
    favoriteLoading,
    isAuthenticated,
    isFavorite,
    recordHistory,
    toggleFavorite,
  } = useAccountMovieActions(movie);
  const [sessions] = useState<ISeason[]>(initialSessions || []);

  const CDN_URL = process.env.NEXT_PUBLIC_CDN || "http://localhost:5000";
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cdnOrigin = useMemo(() => {
    try {
      return new URL(CDN_URL).origin;
    } catch {
      return CDN_URL.replace(/\/$/, "");
    }
  }, [CDN_URL]);

  const processInitialEpisodes = useMemo(() => {
    if (!initialMovie) return { all: [], theatricals: [] };
    const isSingleMovie = initialMovie.episode_total === '1' || initialMovie.type === 'movie' || initialMovie.category.some(c => c.slug === 'phim-le');

    const hasNoSeparateTracks = initialEpisodes.length > 0 && initialEpisodes.every(ep =>
      (!ep.audios || ep.audios.length === 0) &&
      (!ep.subtitles || ep.subtitles.length === 0)
    );

    if (isSingleMovie && hasNoSeparateTracks) {
      const seenTypes = new Set<string>();
      const mappedTheatricals: (IEpisode & { type: string })[] = [];
      initialEpisodes.forEach((ep: IEpisode) => {
        if (ep.videos) {
          ep.videos.forEach((ex: unknown) => {
            const video = ex as IEpisodeVideo;
            if (!seenTypes.has(video.type)) {
              seenTypes.add(video.type);
              mappedTheatricals.push({ ...ep, type: video.type });
            }
          });
        }
      });
      return { all: [], theatricals: mappedTheatricals };
    }
    return { all: initialEpisodes, theatricals: [] };
  }, [initialMovie, initialEpisodes]);

  const { theatricals: initTheatricals } = processInitialEpisodes;
  const [currentEpData, setCurrentEpData] = useState<IEpisode | null>(null);
  const [theatricals] = useState<(IEpisode & { type: string })[]>(initTheatricals);
  const [galleryImages] = useState<string[]>(initialMovie?.backdrops || []);

  const [currentSeasonId, setCurrentSeasonId] = useState<string>(() => {
    if (typeof phan === 'string' && initialSessions) {
      const matched = initialSessions.find(s => s.slug === phan);
      if (matched) return matched._id;
    }
    return initialSessions?.[0]?._id || "";
  });

  const [currentType, setCurrentType] = useState<string>(() => {
    if (typeof type === 'string' && LANGUAGE_MAPPING[type]) return type;
    return initialEpisodes[0]?.types?.[0] || 'phude';
  });

  useEffect(() => {
    try {
      const sNext = localStorage.getItem('setting_auto_next');
      const sIntro = localStorage.getItem('setting_skip_intro');
      const sTheater = localStorage.getItem('setting_theater_mode');
      if (sNext !== null) setAutoNext(JSON.parse(sNext));
      if (sIntro !== null) setSkipIntro(JSON.parse(sIntro));
      if (sTheater !== null) setTheaterMode(JSON.parse(sTheater));
    } catch { }
  }, []);

  const toggleNext = () => setAutoNext(p => { const v = !p; localStorage.setItem('setting_auto_next', JSON.stringify(v)); return v; });
  const toggleIntro = () => setSkipIntro(p => { const v = !p; localStorage.setItem('setting_skip_intro', JSON.stringify(v)); return v; });
  const toggleTheater = () => setTheaterMode(p => { const v = !p; localStorage.setItem('setting_theater_mode', JSON.stringify(v)); return v; });

  useEffect(() => {
    if (!isAuthenticated || !movie?._id || !currentEpData?._id) return;

    const historyKey = `${movie._id}:${currentEpData._id}`;
    if (lastHistorySyncRef.current === historyKey) return;

    lastHistorySyncRef.current = historyKey;
    void recordHistory({ silent: true });
  }, [currentEpData?._id, isAuthenticated, movie?._id, recordHistory]);

  const partItems = useMemo(() => sessions.map(s => ({ id: s._id, name: s.name, slug: s.slug || "" })), [sessions]);

  const langItems = useMemo(() => {
    const currentSeason = sessions.find(s => s._id === currentSeasonId);
    if (!currentSeason?.episodes) return [LANGUAGE_MAPPING['phude']];
    const uniqueTypes = new Set<string>();
    currentSeason.episodes.forEach(ep => ep.types?.forEach(t => uniqueTypes.add(t)));
    const res = Array.from(uniqueTypes).map(t => LANGUAGE_MAPPING[t]).filter(Boolean);
    return res.length ? res : [LANGUAGE_MAPPING['phude']];
  }, [sessions, currentSeasonId]);

  const episodeList = useMemo(() => {
    const currentSeason = sessions.find(s => s._id === currentSeasonId);
    if (!currentSeason) return [];
    let filtered = currentSeason.episodes.filter(ep => ep.types?.includes(currentType));
    if (!filtered.length && langItems.length) {
      filtered = currentSeason.episodes.filter(ep => ep.types?.includes(langItems[0].backendType));
    }
    return filtered.sort((a, b) => a.episode - b.episode);
  }, [sessions, currentSeasonId, currentType, langItems]);

  const currentSeason = useMemo(
    () => sessions.find(s => s._id === currentSeasonId),
    [sessions, currentSeasonId]
  );

  const embedServerOptions = useMemo<EmbedServerOption[]>(() => {
    const tmdbId = movie?.tmdb?.id;
    if (!tmdbId || !currentEpData) {
      return [];
    }

    const normalizedTmdbId = encodeURIComponent(String(tmdbId));
    const seasonNumber = currentSeason?.season_number || 1;
    const episodeNumber = currentEpData.episode || 1;
    const isMovie = movie.type === "movie" || movie.tmdb?.type === "movie";
    return EMBED_PROVIDERS.map((provider) => ({
      id: provider.id,
      label: provider.label,
      url: isMovie
        ? provider.movie(normalizedTmdbId)
        : provider.tv(normalizedTmdbId, seasonNumber, episodeNumber),
    })).filter((option) => !!option.url);
  }, [
    currentEpData,
    currentSeason?.season_number,
    movie?.tmdb?.id,
    movie?.tmdb?.type,
    movie?.type,
  ]);

  const embedPreconnectOrigins = useMemo(() => {
    const origins = embedServerOptions
      .map((option) => getUrlOrigin(option.url))
      .filter(Boolean);
    return Array.from(new Set(origins));
  }, [embedServerOptions]);

  useEffect(() => {
    if (typeof phan === 'string' && sessions.length) {
      const matched = sessions.find(s => s.slug === phan);
      if (matched && matched._id !== currentSeasonId) setCurrentSeasonId(matched._id);
    }
  }, [phan, sessions, currentSeasonId]);

  useEffect(() => {
    if (!langItems.some(t => t.backendType === currentType) && langItems.length) {
      setCurrentType(langItems[0].backendType);
    }
  }, [langItems, currentType]);

  const fetchAndPlayVideo = useCallback(async (epSlug: string, preferredType?: string, index = 0) => {
    if (!slug || !epSlug) return;

    const slugValue = Array.isArray(slug) ? slug[0] : slug;
    const requestedType = preferredType || (typeof type === 'string' ? type : '') || currentType || 'phude';
    const playbackRequestKey = `${slugValue}:${epSlug}:${requestedType}:${index}`;
    if (lastPlaybackRequestRef.current === playbackRequestKey) return;
    lastPlaybackRequestRef.current = playbackRequestKey;

    setEncryptedPayload(null);
    setLoadedSourceEpisodeId("");
    setSourceError("");
    try {
      const res = await axiosInstance.get(API_ENDPOINTS.movie.watch(slug as string, epSlug));
      const payload = res.data?.data || res.data?.playlist?.[0];
      if (payload) {
        const payloadEpisode = payload as IEpisode;
        const hasSelfHosted = (payloadEpisode.videos || []).some((v) => {
          const video = v as unknown as IEpisodeVideo;
          return !!video.url && video.format !== 'embed';
        });

        // Luôn cập nhật episode từ API để nhận embed_url fallback cho dữ liệu cũ.
        setCurrentEpData((prev) => prev ? { ...prev, ...payloadEpisode } : payloadEpisode);
        setLoadedSourceEpisodeId(payloadEpisode._id);

        if (!hasSelfHosted) {
          setEncryptedPayload(null);
          return;
        }

        if (index !== serverIndex) setServerIndex(index);
        const nav = navigator as NavigatorExtended;
        const scr = screen as unknown as ScreenExtended;

        const info: InfoCollector = {};

        info.browser = {
          userAgent: nav.userAgent,
          appCodeName: nav.appCodeName,
          appName: nav.appName,
          appVersion: nav.appVersion,
          buildID: nav.buildID || "N/A",
          cookieEnabled: nav.cookieEnabled,
          doNotTrack: nav.doNotTrack,
          hardwareConcurrency: nav.hardwareConcurrency,
          language: nav.language,
          languages: nav.languages ? Array.from(nav.languages) : [],
          maxTouchPoints: nav.maxTouchPoints,
          onLine: nav.onLine,
          oscpu: nav.oscpu || "N/A",
          pdfViewerEnabled: nav.pdfViewerEnabled || "N/A",
          platform: nav.platform,
          product: nav.product,
          productSub: nav.productSub,
          vendor: nav.vendor,
          vendorSub: nav.vendorSub,
          webdriver: nav.webdriver,
          deviceMemory: nav.deviceMemory || "N/A",
          permissions: {},
        };

        if (nav.permissions) {
          const perms = [
            "geolocation",
            "notifications",
            "midi",
            "camera",
            "microphone",
          ] as const;

          perms.forEach((perm) => {
            nav.permissions
              .query({ name: perm as PermissionName })
              .then((status) => {
                if (
                  info.browser &&
                  typeof info.browser.permissions === "object" &&
                  info.browser.permissions !== null
                ) {
                  (info.browser.permissions as Record<string, string>)[perm] = status.state;
                }
              })
              .catch(() => {
                if (
                  info.browser &&
                  typeof info.browser.permissions === "object" &&
                  info.browser.permissions !== null
                ) {
                  (info.browser.permissions as Record<string, string>)[perm] = "error";
                }
              });
          });
        }

        info.screen = {
          availHeight: scr.availHeight,
          availLeft: scr.availLeft,
          availTop: scr.availTop,
          availWidth: scr.availWidth,
          colorDepth: scr.colorDepth,
          deviceXDPI: scr.deviceXDPI || "N/A",
          deviceYDPI: scr.deviceYDPI || "N/A",
          height: scr.height,
          logicalXDPI: scr.logicalXDPI || "N/A",
          logicalYDPI: scr.logicalYDPI || "N/A",
          orientation: scr.orientation
            ? { angle: scr.orientation.angle, type: scr.orientation.type }
            : "N/A",
          pixelDepth: scr.pixelDepth,
          width: scr.width,
          fontSmoothingEnabled: scr.fontSmoothingEnabled || "N/A",
          isExtended: scr.isExtended || "N/A",
        };

        const realtime = Date.now();

        info.mouseActivity = {
          lastPosition: { x: 0, y: 0 },
          timestamp: realtime,
        };

        info.devTools = {
          isOpen: false,
          methods: {} as Record<string, boolean>,
        };

        info.devTools.methods.sizeDiff =
          window.outerWidth - window.innerWidth > 100 ||
          window.outerHeight - window.innerHeight > 100;

        const devToolsCheck = new RegExp("").toString();
        info.devTools.methods.regexToString = devToolsCheck !== "/(?:)/";

        const consoleExt = console as unknown as ConsoleExtended;
        info.devTools.methods.firebug = !!(
          typeof consoleExt.firebug !== "undefined" ||
          (consoleExt.table &&
            /firebug/i.test((consoleExt.table).toString()))
        );

        const start = performance.now();
        for (let i = 0; i < 1000; i++) { }
        const end = performance.now();
        info.devTools.methods.perfDiff = end - start > 1;

        info.devTools.isOpen = Object.values(info.devTools.methods).some(
          (v) => v
        );

        info.other = {};

        info.other.plugins = [] as PluginData[];
        if (nav.plugins) {
          Array.from(nav.plugins).forEach((plugin) => {
            const mimeTypes = Array.from(plugin).map((mime) => ({
              type: mime.type,
              suffixes: mime.suffixes,
              description: mime.description,
            }));

            (info.other!.plugins as PluginData[]).push({
              name: plugin.name,
              description: plugin.description,
              filename: plugin.filename,
              version:
                (plugin as unknown as { version?: string }).version || "N/A",
              mimeTypes,
            });
          });
        }

        info.other.mimeTypes = [] as PluginMimeType[];
        if (nav.mimeTypes) {
          Array.from(nav.mimeTypes).forEach((mime) => {
            (info.other!.mimeTypes as PluginMimeType[]).push({
              type: mime.type,
              suffixes: mime.suffixes,
              description: mime.description,
            });
          });
        }

        info.other.fonts = [] as string[];
        const testFonts = [
          "Arial",
          "Times New Roman",
          "Courier New",
          "Verdana",
          "Georgia",
        ];
        const testString = "abcdefghijklmnopqrstuvwxyz0123456789";
        const baseFont = "monospace";
        const detector = document.createElement("span");
        detector.style.fontSize = "72px";
        detector.innerHTML = testString;
        document.body.appendChild(detector);

        testFonts.forEach((font) => {
          detector.style.fontFamily = `${font}, ${baseFont}`;
          const width = detector.offsetWidth;
          detector.style.fontFamily = baseFont;
          const baseWidth = detector.offsetWidth;
          if (width !== baseWidth) {
            (info.other!.fonts as string[]).push(font);
          }
        });
        document.body.removeChild(detector);

        info.other.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        info.other.locale = Intl.DateTimeFormat().resolvedOptions().locale;
        info.other.calendar = Intl.DateTimeFormat().resolvedOptions().calendar;
        info.other.numberingSystem = Intl.DateTimeFormat().resolvedOptions().numberingSystem;

        if (nav.getBattery) {
          nav.getBattery().then((battery) => {
            if (info.other) {
              info.other.battery = {
                charging: battery.charging,
                level: battery.level,
              };
            }
          });
        }

        if (nav.connection) {
          info.other.connection = {
            downlink: nav.connection.downlink,
            effectiveType: nav.connection.effectiveType,
            rtt: nav.connection.rtt,
            saveData: nav.connection.saveData,
            type: nav.connection.type,
          };
        }

        try {
          const glCanvas = document.createElement("canvas");
          const gl = (glCanvas.getContext("webgl") ||
            glCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

          if (gl) {
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            info.other.webgl = {
              vendor: gl.getParameter(gl.VENDOR),
              renderer: debugInfo
                ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                : gl.getParameter(gl.RENDERER),
              version: gl.getParameter(gl.VERSION),
            };

            const loseContext = gl.getExtension("WEBGL_lose_context");
            loseContext?.loseContext();
          }

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.textBaseline = "top";
            ctx.font = "14px Arial";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("captcha_check", 2, 15);
            info.other.canvasFingerprint = canvas.toDataURL().slice(-50);
          }
        } catch { }

        try {
          const Win = window as unknown as WindowExtended;
          const AudioContextConstructor = Win.AudioContext || Win.webkitAudioContext;
          info.other.audioFingerprint = AudioContextConstructor ? "available" : "unavailable";
        } catch { }

        info.other.historyLength = window.history.length;
        info.other.referrer = document.referrer;
        info.other.location = window.location.href;

        const selectedType =
          preferredType ||
          (typeof type === 'string' ? type : '') ||
          payloadEpisode.videos?.find((v) => (v as unknown as IEpisodeVideo).is_default)?.type ||
          payloadEpisode.types?.[0] ||
          currentType ||
          'phude';

        const enc = create(info, "/0_8b2:");
        setEncryptedPayload({ ...enc, s: realtime, t: dynamicData, type: selectedType });
      } else {
        lastPlaybackRequestRef.current = "";
        setSourceError("Chưa có nguồn phát đã xác minh cho tập này.");
      }
    } catch {
      lastPlaybackRequestRef.current = "";
      setSourceError("Nguồn phát chưa sẵn sàng hoặc không có trên VSEmbed.");
    }
  }, [slug, serverIndex, type, currentType, dynamicData]);

  const handleSeasonChange = (item: { id: string }) => {
    setCurrentSeasonId(item.id);
    setIsPart(false);
  };

  const handleChangeType = (newType: string) => {
    setCurrentType(newType);
    setServerIndex(0);
    const sessionSlug = sessions.find(s => s._id === currentSeasonId)?.slug;
    if (currentEpData) {
      const base = sessionSlug ? `/phim/${slug}/${sessionSlug}/${currentEpData.slug}` : (phan ? `/phim/${slug}/${phan}/${currentEpData.slug}` : `/phim/${slug}/${currentEpData.slug}`);
      router.replace(`${base}?type=${newType}`, undefined, { scroll: false });
      fetchAndPlayVideo(currentEpData.slug, newType, 0);
    }
  };

  const handleNextEpisode = useCallback(() => {
    if (!currentEpData || !episodeList.length) return;
    const idx = episodeList.findIndex(e => e._id === currentEpData._id);
    if (idx !== -1 && idx < episodeList.length - 1) {
      const nextEp = episodeList[idx + 1];
      setCurrentEpData(nextEp);
      setIframeLoaded(false);
      const sessionSlug = sessions.find(s => s._id === currentSeasonId)?.slug;
      const base = sessionSlug ? `/phim/${slug}/${sessionSlug}/${nextEp.slug}` : (phan ? `/phim/${slug}/${phan}/${nextEp.slug}` : `/phim/${slug}/${nextEp.slug}`);
      router.push(currentType ? `${base}?type=${currentType}` : base, undefined, { scroll: false });
    }
  }, [currentEpData, episodeList, router, slug, phan, currentType, currentSeasonId, sessions]);

  useEffect(() => {
    let allEps: IEpisode[] = [];
    sessions.forEach(s => { if (s.episodes) allEps = [...allEps, ...s.episodes]; });
    const combined = [...allEps, ...theatricals];
    if (!combined.length) return;

    setProposals(initialProposals);
    let epToPlay: IEpisode | undefined;

    if (typeof phan === 'string') {
      const sSlug = sessions.find(s => s.slug === phan);
      if (sSlug) epToPlay = sSlug.episodes.find(e => e.slug === tap);
    }
    if (!epToPlay) epToPlay = combined.find(e => e.slug === tap);

    if (!epToPlay && allEps.length > 0) {
      const activeS = sessions.find(s => s._id === currentSeasonId);
      if (activeS) {
        const filtered = activeS.episodes.filter(e => e.types?.includes(currentType)).sort((a, b) => a.episode - b.episode);
        epToPlay = filtered.length > 0 ? filtered[0] : activeS.episodes[0];
      }
    } else if (!epToPlay && theatricals.length > 0) { epToPlay = theatricals[0]; }

    if (epToPlay) {
      if (currentEpData?.slug !== epToPlay.slug) {
        setIframeLoaded(false);
      }

      const sId = typeof epToPlay.season_id === 'string' ? epToPlay.season_id : (epToPlay.season_id as { _id: string })?._id;
      if (sId && sId !== currentSeasonId && !isPart) setCurrentSeasonId(sId);

      const epTypeSingle = (epToPlay as IEpisode & { type?: string }).type;
      const targetType = epTypeSingle || ((type && typeof type === 'string' && epToPlay.types?.includes(type)) ? type : (epToPlay.types?.includes(currentType) ? currentType : epToPlay.types?.[0]));

      if (targetType && targetType !== currentType) setCurrentType(targetType);

      const targetPlaybackType = targetType || 'phude';
      const shouldLoadEpisode = currentEpData?._id !== epToPlay._id;
      const shouldLoadType = targetPlaybackType !== currentType;

      if (shouldLoadEpisode) setCurrentEpData(epToPlay);
      if (shouldLoadEpisode || shouldLoadType) {
        fetchAndPlayVideo(epToPlay.slug, targetPlaybackType);
      }
    }
  }, [tap, phan, theatricals, initialProposals, type, dynamicData, currentEpData, currentSeasonId, currentType, fetchAndPlayVideo, isPart, sessions]);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    if (!playerRef.current?.contentWindow) return;
    const targetWindow = playerRef.current.contentWindow;
    requestAnimationFrame(() => {
      targetWindow.postMessage(msg, cdnOrigin);
    });
  }, [cdnOrigin]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== cdnOrigin || !event.data) return;
      const msgData = event.data as IPlayerMessageData;

      if (msgData.action === 'ready') {
        return;
      }

      if (msgData.type === 'PLAY' && currentEpData && typeof msgData.payload === 'object') {
        sendMessage({ action: "PLAYS", data: { ...msgData.payload } });
      }

      if (msgData.action === 'next_episode') {
        handleNextEpisode();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendMessage, currentEpData, handleNextEpisode, CDN_URL]);

  useEffect(() => {
    if (encryptedPayload && iframeLoaded) {
      sendMessage({ action: "play", value: encryptedPayload });
    }
  }, [encryptedPayload, iframeLoaded, sendMessage]);

  useEffect(() => { if (iframeLoaded) sendMessage({ action: 'auto_next', value: autoNext }); }, [autoNext, iframeLoaded, sendMessage]);
  useEffect(() => { if (iframeLoaded) sendMessage({ action: 'introduction', value: skipIntro }); }, [skipIntro, iframeLoaded, sendMessage]);

  const handleTheatricalClick = (item: IEpisode & { type: string }) => {
    if (currentEpData?._id === item._id && currentType === item.type) return;
    setCurrentType(item.type);
    setCurrentEpData(item);
    setIframeLoaded(false);
    const url = phan ? `/phim/${slug}/${phan}/${item.slug}?type=${item.type}` : `/phim/${slug}/${item.slug}?type=${item.type}`;
    router.push(url, undefined, { scroll: false });
  };

  const getTheatricalInfo = (t: string) => {
    switch (t) {
      case 'phude': return { icon: '/images/icons/pd.svg', label: 'Phụ đề', color: 'bg-[#5e6070]' };
      case 'thuyetminh': return { icon: '/images/icons/tm.svg', label: 'Thuyết minh', color: 'bg-[#297447]' };
      case 'longtieng': return { icon: '/images/icons/lt.svg', label: 'Lồng tiếng', color: 'bg-[#1d2e79]' };
      default: return { icon: '/images/icons/pd.svg', label: 'Bản Full', color: 'bg-[#b63535]' };
    }
  };

  const calculateDisplayEpisode = (curr: IEpisode, nextEp?: IEpisode) => {
    if (movie?.episode_current === "Full" && movie.episode_total === "1" && episodeList.length === 1) return "FULL";
    const currNum = curr.episode;
    if (!nextEp || nextEp.episode === currNum + 1) return `Tập ${currNum}`;
    return nextEp.episode - currNum - 1 > 0 ? `Tập ${currNum}-${nextEp.episode - 1}` : `Tập ${currNum}`;
  };

  const getTitleName = () => {
    if (!movie) return null;
    const nameStr = currentEpData ? String(currentEpData.name).trim() : "";
    if (/tập/i.test(nameStr)) return nameStr;
    if (/episode/i.test(nameStr)) return nameStr.replace(/episode/gi, "Tập").trim();
    if (/^\d+$/.test(nameStr)) return `Tập ${nameStr}`;
    return movie.name + (currentEpData ? (movie.episode_current == "Full" && movie.episode_total == "1" ? "FULL" : nameStr) : movie.name);
  };

  if (!movie) return null;

  const movieUrl = `${SITE_URL}/phim/${slug}/${phan || ''}/${tap || ''}`;
  const hasSelfHostedVideo = !!currentEpData?.videos?.some((v) => {
    const video = v as unknown as IEpisodeVideo;
    return !!video.url && video.format !== 'embed';
  });
  const activeEmbedServer = embedServerOptions[0];
  const embedPlayerUrl = activeEmbedServer?.url || "";
  const hasLoadedSource = !!currentEpData?._id && loadedSourceEpisodeId === currentEpData._id;
  const playerSrc = hasLoadedSource ? (hasSelfHostedVideo ? `${CDN_URL}/?v=${SELF_HOSTED_PLAYER_VERSION}` : embedPlayerUrl) : "";
  const seoTitle = `${movie.name} (${movie.year}) ${movie.quality || 'HD'} Vietsub - Xem Phim ${movie.origin_name || ''}`;
  const seoDesc = movie.content ? movie.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + "..." : `Xem phim ${movie.name} full HD...`;
  const sessionSlug = sessions.find(s => s._id === currentSeasonId)?.slug;
  return (
    <>
      <Head>
        <link rel="preconnect" href={CDN_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={CDN_URL} />
        {embedPreconnectOrigins.map((origin) => (
          <React.Fragment key={origin}>
            <link rel="preconnect" href={origin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={origin} />
          </React.Fragment>
        ))}
      </Head>
      <NextSeo
        title={seoTitle} description={seoDesc} canonical={movieUrl}
        openGraph={{
          type: 'video.movie', url: movieUrl, title: seoTitle, description: seoDesc,
          images: [{ url: movie.thumb_url, width: 1200, height: 630, alt: `${movie.name} Backdrop` }],
          site_name: 'TungMMO Cinema',
          video: { actors: movie.actor?.map(a => ({ profile: '', role: a.name })) || [], directors: movie.director?.map(d => d.name) || [], duration: parseInt(movie.time || '0') * 60, releaseDate: movie.year?.toString() || new Date().toISOString(), tags: movie.category?.map(c => c.name) || [] },
        }}
        twitter={{ handle: '@tungmmo', site: '@tungmmo', cardType: 'summary_large_image' }}
      />
      <VideoJsonLd name={getTitleName() || ""} thumbnailUrls={[movie.thumb_url]} dateCreated={movie.createdAt || ''} uploadDate={movie.updatedAt || ''} description={seoDesc} url={movieUrl} embedUrl={`${CDN_URL}/video.html`} />

      <div className='px-5 lg:px-6'>
        <div className='flex items-center justify-between py-1.5 md:py-3'>
          <div className='flex items-center space-x-3 md:space-x-4 text-white'>
            <Link scroll={false} href={`/phim/${slug}`} className='w-6 h-6 md:h-8 md:w-8 flex items-center justify-center border border-gray-400 rounded-full hover:bg-white/10'>
              <i className="fa-solid fa-angle-left"></i>
            </Link>
            <span className='text-base md:text-lg lg:text-xl font-medium'>{getTitleName()}</span>
          </div>
        </div>
      </div>

      <div className='my-3 md:px-5 lg:px-6'>
        <div className='relative z-[15] w-full bg-gray-400 md:rounded-t-xl overflow-hidden aspect-video'>
          {playerSrc ? (
            <iframe
              key={`${currentEpData ? currentEpData._id : 'loading'}-${hasSelfHostedVideo ? 'cdn' : activeEmbedServer?.id || 'embed'}`}
              ref={playerRef}
              className="absolute top-0 left-0 w-full h-full"
              id="player"
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              sandbox={hasSelfHostedVideo ? undefined : "allow-scripts allow-same-origin allow-forms allow-presentation"}
              allowFullScreen
              src={playerSrc}
              onLoad={() => setIframeLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-sm">
              {sourceError || "Đang kiểm tra nguồn phát..."}
            </div>
          )}
          {playerSrc && !iframeLoaded && (<div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20"><span className="text-white text-sm">Đang tải player...</span></div>)}
        </div>
        <div className='md:rounded-b-xl bg-[#08080A] py-3'>
          <div className='flex justify-between w-full px-5'>
            <div className='flex items-center space-x-3'>
              <button
                type="button"
                aria-pressed={isFavorite}
                disabled={favoriteLoading}
                onClick={toggleFavorite}
                className={clsx(
                  'flex items-center px-3 py-2 space-x-2 hover:bg-primary/5 hover:text-primary rounded-lg disabled:opacity-60',
                  isFavorite ? 'text-primary bg-primary/10' : 'text-white',
                  !isAuthenticated && 'open-login'
                )}
              >
                <i className="fas fa-heart text-xs"></i>
                <span className='hidden md:flex'>{isFavorite ? "Đã thích" : "Yêu thích"}</span>
              </button>
              <button onClick={toggleNext} className={`hidden lg:flex items-center px-3 py-2 ${autoNext ? "text-primary bg-primary/10" : "hover:bg-white/5 text-white"} space-x-2 rounded-lg`}><span>Chuyển tập</span><span className={`border px-2 py-1 text-[10px] rounded-md ${autoNext ? "text-primary border-primary" : " text-white border-gray-500"}`}>{autoNext ? "ON" : "OFF"}</span></button>
              <button onClick={toggleTheater} className={`hidden lg:flex relative z-[15] items-center px-3 py-2 ${theaterMode ? "text-primary bg-primary/10" : "hover:bg-white/5 text-white"} space-x-2 rounded-lg`}><span>Rạp phim</span><span className={`border px-2 py-1 text-[10px] rounded-md ${theaterMode ? "text-primary border-primary" : " text-white border-gray-500"}`}>{theaterMode ? "ON" : "OFF"}</span></button>
              <button onClick={toggleIntro} className={`hidden lg:flex items-center px-3 py-2 ${skipIntro ? "text-primary bg-primary/10" : "hover:bg-white/5 text-white"} space-x-2 rounded-lg`}><span>Bỏ qua giới thiệu</span><span className={`border px-2 py-1 text-[10px] rounded-md ${skipIntro ? "text-primary border-primary" : " text-white border-gray-500"}`}>{skipIntro ? "ON" : "OFF"}</span></button>
              <button className='flex items-center px-3 py-2 text-white space-x-2 hover:bg-primary/5 hover:text-primary rounded-lg'><Image alt="live" src="/images/icons/live.svg" width={300} height={300} className="w-4 h-4" /><span className='hidden md:flex'>Xem chung</span></button>
              <button className='flex items-center px-3 py-2 text-white space-x-2 hover:bg-primary/5 hover:text-primary rounded-lg'><i className="fas fa-share-alt text-xs"></i><span className='hidden md:flex'>Chia sẻ</span></button>
            </div>
            <div><button className='flex items-center px-3 py-2 text-white space-x-2 hover:bg-primary/5 hover:text-primary rounded-lg'><i className="fa-solid fa-flag text-xs"></i><span className='hidden md:flex'>Báo lỗi</span></button></div>
          </div>
        </div>
      </div>

      <div className='px-5 lg:px-6'>
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4">
          <div className='col-span-1 lg:col-span-8 lg:border-r lg:border-gray-800'>
            <div className='p-3 xl:block hidden'>
              <div className='grid grid-cols-1 pb-12 border-b lg:grid-cols-12 border-gray-800 pr-8'>
                <div className='col-span-7'>
                  <div className='flex items-start space-x-6'>
                    <div className='w-[60px] md:w-[80px] lg:w-[90px] flex-shrink-0'>
                      <div className="pb-[160%] w-full rounded-md overflow-hidden relative h-0 block">
                        <Image src={movie.thumb_url || movie.poster_url} alt={movie.name} fill className="object-cover z-[5] absolute inset-0" sizes="150px" />
                      </div>
                    </div>
                    <div className='flex flex-col'>
                      <h3 className="text-xl font-semibold truncate text-white">{movie.name}</h3>
                      <p className="text-[14px] mt-3 text-primary">{movie.origin_name}</p>
                      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 mt-5 text-[11.5px] lg:px-0 px-5">
                        <span className="text-primary border border-primary px-2 py-0.5 rounded">IMDb <span className='text-white'>{movie.tmdb?.vote_average || 'N/A'}</span></span>
                        <span className="border bg-white text-black px-2 py-0.5 rounded font-semibold">{movie.content_rating || 'HD'}</span>
                        <span className="border bg-white/5 rounded text-white px-2 py-0.5">{movie.year}</span>
                        <span className="border bg-white/5 rounded text-white px-2 py-0.5">{movie.quality}</span>
                        <span className="border bg-white/5 rounded text-white px-2 py-0.5">{movie.episode_total}</span>
                      </div>
                      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 lg:px-0 px-5 mt-3">
                        {movie.category?.map(cat => (<a key={cat._id} href="#" className="text-xs bg-white/5 hover:text-primary px-2 py-1 rounded transition-colors text-gray-300">{cat.name}</a>))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className='col-span-5'>
                  <div>
                    <div className="text-gray-400 leading-6 overflow-hidden whitespace-normal [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]" dangerouslySetInnerHTML={{ __html: movie.content || '' }} />
                    <div className='mt-5'>
                      <Link scroll={false} href={`/phim/${slug}`} className="flex items-center space-x-1.5 text-primary"><span className="text-sm">Thông tin phim</span><i className="fa-solid fa-angle-right text-xs mt-1"></i></Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='lg:px-3 lg:pr-8'>
              <div className='w-full py-5 lg:py-8 justify-between flex items-start lg:items-center'>
                <div className='flex lg:flex-row flex-col lg:space-y-0 space-y-5 items-start lg:items-center'>
                  {partItems.length > 1 && (
                    <div className='flex items-center relative lg:border-r lg:pr-6 lg:border-[#ffffff30]'>
                      <button className='flex items-center space-x-3 text-white font-semibold text-xl' onClick={() => setIsPart(!isPart)}>
                        <i className="fa-solid fa-bars-staggered text-primary"></i>
                        <span>{partItems.find(p => p.id === currentSeasonId)?.name}</span>
                        <i className="fa-solid fa-caret-down text-gray-400 text-sm"></i>
                      </button>
                      <div className={clsx("absolute !ml-0 w-48 bg-white rounded-lg shadow-lg top-0 translate-y-[33.6px] left-0 overflow-hidden z-50", isPart ? 'block' : 'hidden')}>
                        {partItems.map(item => (
                          <button key={item.id} onClick={() => handleSeasonChange(item)} className={`w-full text-[#191B24] text-left px-4 py-2 text-[14px] border-t border-t-gray-100 font-semibold ${currentSeasonId === item.id ? "bg-[#51f085]" : "hover:bg-gray-100"}`}>{item.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={`flex items-center gap-3 ${partItems.length > 1 && "lg:pl-6"}`}>
                    {langItems.map(item => (
                      <button key={item.id} onClick={() => handleChangeType(item.backendType)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all duration-200 text-xs ${currentType === item.backendType ? "border-white text-white bg-transparent" : "border-transparent text-gray-400 hover:text-white"}`}>
                        <icon.SubTitles width={13} height={13} />{item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className='flex items-center'>
                  <button onClick={() => setIsCollapsed(!isCollapsed)} className='flex items-center space-x-2 cursor-pointer'>
                    <span className='text-white text-[13px]'>Rút gọn</span>
                    <div className={clsx("relative flex-shrink-0 rounded-2xl w-[30px] border h-[18px] transition-colors duration-300", isCollapsed ? 'bg-[#ffffff10] border-primary' : 'border-gray-600')}>
                      <span className={clsx("absolute h-[8px] w-[8px] rounded-[20px] transition-all duration-300 ease-in-out", "top-[4px]", isCollapsed ? "bg-primary left-[18px]" : "bg-gray-600 left-[4px]")}></span>
                    </div>
                  </button>
                </div>
              </div>

              {!episodeList.length ? <div className="text-gray-400 text-sm mb-12">Chưa có tập phim nào.</div> : isCollapsed ? (
                <div className="grid grid-cols-4 lg:grid-cols-6 gap-4 w-full mb-12">
                  {episodeList.map((item, index) => {
                    const isActive = currentEpData?._id === item._id;
                    const base = sessionSlug ? `/phim/${slug}/${sessionSlug}/${item.slug}` : (phan ? `/phim/${slug}/${phan}/${item.slug}` : `/phim/${slug}/${item.slug}`);
                    return (
                      <div key={item._id}>
                        <Link scroll={false} href={`${base}${currentType ? `?type=${currentType}` : ''}`} className={`flex hover:text-primary ${!isActive ? 'text-white bg-[#1c2343]' : 'bg-primary/10 text-primary'} items-center justify-center py-2.5 md:py-3 lg:py-4 px-1 gap-2 rounded-md`}>
                          {isActive ? <Play /> : <i className="fa-solid fa-play text-xs"></i>}
                          <span>{calculateDisplayEpisode(item, episodeList[index + 1])}</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-12">
                  {episodeList.map((item, index) => {
                    const isActive = currentEpData?._id === item._id;
                    const base = sessionSlug ? `/phim/${slug}/${sessionSlug}/${item.slug}` : (phan ? `/phim/${slug}/${phan}/${item.slug}` : `/phim/${slug}/${item.slug}`);
                    return (
                      <div key={item._id}>
                        <Link scroll={false} href={`${base}${currentType ? `?type=${currentType}` : ''}`} className="group block">
                          <div className="relative overflow-hidden mb-3.5">
                            <div className="pb-[56%] rounded-lg w-full h-0 relative overflow-hidden block bg-[#2F3346]">
                              <div className={`${isActive ? "opacity-100" : "group-hover:opacity-100 opacity-0 border border-white"} absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 pl-[2px]`}>
                                {!isActive ? <i className="fa-solid fa-play group-hover:text-primary"></i> : <Play />}
                              </div>
                            </div>
                            <Image src={item.thumbnail || galleryImages[index % galleryImages.length] || movie.thumb_url} alt={item.name} width={200} height={200} className={`absolute w-full h-full inset-0 object-contain aspect-video ${!isActive ? 'group-hover:opacity-50' : 'opacity-50'}`} />
                          </div>
                          <div className={`text-left text-sm ${!isActive ? 'group-hover:text-primary text-white' : 'text-primary'}`}>{item.name}</div>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}


              {theatricals.length > 0 && (
                <>
                  <h4 className="text-white font-semibold mb-4 text-2xl">Các bản chiếu</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {theatricals.map((item, index) => {
                      const info = getTheatricalInfo(item.type || '');
                      return (
                        <div key={item.slug} onClick={() => handleTheatricalClick(item)} className={`${info.color} cursor-pointer text-white transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden relative rounded-xl`}>
                          <div className='lg:max-w-[110px] absolute top-0 right-0 bottom-0 w-[40%] max-w-[130px] [-webkit-mask-image:linear-gradient(270deg,black_0,transparent_95%)]'>
                            <Image alt={`Xem Phim ${movie.name}`} loading="lazy" src={galleryImages[index % galleryImages.length] || movie.thumb_url} width={100} height={200} className='object-cover w-full h-full' />
                          </div>
                          <div className='w-[90%] justify-start items-start flex-col flex relative z-2 p-4 gap-3'>
                            <div className='inline-flex items-center gap-2'>
                              <div className='w-[20px] h-[20px]'><Image alt="icon" src={info.icon} width={23} height={23} className='object-cover' /></div><span>{info.label}</span>
                            </div>
                            <div className='line-clamp-2 font-semibold text-[16px] mb-2 overflow-hidden whitespace-normal [-webkit-box-orient:vertical]'>{movie.name}</div>
                            <div className="inline-flex items-center justify-center font-medium bg-white text-black border border-white text-[12px] px-2.5 py-1.5 rounded-md min-h-[30px]">Xem bản này</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className='flex items-center mt-12'>
                <icon.Comment width={34} className='text-white' /><div className='text-white text-lg lg:text-xl font-medium ml-1 lg:ml-2'>Bình luận ({commentCount})</div>
                <div className='flex items-center border border-white p-1 rounded-lg ml-auto lg:ml-8'>
                  {BottomItems.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 text-xs ${activeTab === item.id ? "text-black bg-white" : "text-white hover:text-primary"}`}>{item.label}</button>
                  ))}
                </div>
              </div>

              {activeTab == "comment" ? (
                <CommentItems
                  movieId={movie?._id}
                  episodeId={currentEpData?._id}
                  onCountChange={setCommentCount}
                />
              ) : <RatedItems />}
            </div>
          </div>
          <div className='col-span-1 lg:col-span-3'>
            <div className='hidden lg:flex items-center justify-between py-4 px-4 pb-8 border-b border-gray-800'>
              <div className='flex items-center text-white'>
                <div className='flex flex-col space-y-1 items-center justify-center pr-6'><icon.Star width={22} height={22} /><span className='text-[13px]'>Đánh giá</span></div>
                <div className='flex flex-col space-y-1 border-l border-gray-800 items-center justify-center pl-6'><icon.Comment width={22} height={22} /><span className='text-[13px]'>Bình luận</span></div>
              </div>
              <div className='flex items-center'>
                <button className='flex items-center ml-4 lg:ml-0 px-3 py-2.5 rounded-full text-white space-x-1 lg:space-x-2 bg-[#3556b6]'>
                  <span className="bg-[url('/images/ro-icon.svg')] w-4 h-4 lg:w-5 lg:h-5 bg-position-[50%] bg-cover"></span><span className='font-bold lg:text-sm text-xs'>10</span><span className='text-xs underline lg:block hidden'>Đánh giá</span>
                </button>
              </div>
            </div>
            <div className='py-6'>
              <div className='text-lg px-4 text-white font-medium'>Diễn viên</div>
              <div className="grid grid-cols-3 gap-4 mt-4 pb-8">
                {movie.actor?.map((actor, index) => (
                  <div key={index} className="flex flex-col items-center justify-start p-2">
                    <Link scroll={false} href="/" className="flex flex-col items-center group w-full">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden transition-opacity duration-300 hover:opacity-80">
                        <Image width={80} height={80} src={actor.avatar || "https://image.tmdb.org/t/p/w500/pI6g1iVlUy7cUAZ6AspVXWq4kli.jpg"} alt={actor.name} loading="lazy" className="object-cover w-full h-full" />
                      </div>
                      <div className="mt-3 w-full text-center"><h3 className="text-sm text-white truncate transition-colors duration-200 group-hover:text-primary">{actor.name}</h3></div>
                    </Link>
                  </div>
                ))}
              </div>
              <div className='text-lg px-4 text-white font-medium pt-8 border-t border-gray-800'>Đề xuất</div>
              <div className='mt-6 px-4'><ProposalGird2 movies={proposals} /></div>
            </div>
          </div>
        </div>
      </div>
      {theaterMode && <div className='block fixed inset-0 bg-[#08080A] z-[10]'></div>}
    </>
  );
};

export const getServerSideProps: GetServerSideProps = withEncryptedProps(async (context) => {
  if (!context.params) return { notFound: true };

  const { slug, tap, phan } = context.params;
  const { type } = context.query;

  if (!slug || Array.isArray(slug)) return { notFound: true };

  const finalTap = Array.isArray(tap) ? tap[0] : (tap || 'N/A');
  const finalPhan = Array.isArray(phan) ? phan[0] : (phan || 'N/A');
  const finalType = Array.isArray(type) ? type[0] : (type || '');

  const { req, resolvedUrl, locale } = context;
  const headers = req.headers;

  const getHeader = (h: string | string[] | undefined) => Array.isArray(h) ? h[0] : (h || '');

  const forwarded = headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0]
    : (Array.isArray(forwarded) ? forwarded[0] : (getHeader(headers['x-real-ip']) || getHeader(headers['cf-connecting-ip']) || req.socket.remoteAddress || 'unknown'));

  const userAgent = getHeader(headers["user-agent"]) || "NextJS-Server";
  const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone/i.test(userAgent);
  const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

  const geo = {
    country: getHeader(headers['x-vercel-ip-country']) || getHeader(headers['cf-ipcountry']) || 'unknown',
    region: getHeader(headers['x-vercel-ip-region']) || getHeader(headers['cf-region-code']) || 'unknown',
    city: getHeader(headers['x-vercel-ip-city']) || getHeader(headers['cf-ipcity']) || 'unknown',
    latitude: getHeader(headers['x-vercel-ip-latitude']) || 'unknown',
    longitude: getHeader(headers['x-vercel-ip-longitude']) || 'unknown',
  };

  const requestInfo = {
    method: req.method || 'GET',
    host: getHeader(headers['host']) || 'unknown',
    referer: getHeader(headers['referer']) || 'direct',
    protocol: getHeader(headers['x-forwarded-proto']) || 'http',
    url: resolvedUrl,
    acceptLanguage: getHeader(headers['accept-language']) || locale || 'unknown',
    secChUaPlatform: getHeader(headers['sec-ch-ua-platform']) || 'unknown',
  };

  const dynamicDetect = {
    phim: slug, tap: finalTap, phan: finalPhan, type: finalType,
    timestamp: Date.now().toString(), ip: clientIp, userAgent,
    deviceType: isMobile ? 'Mobile' : 'PC', isBot,
    country: geo.country, city: geo.city, region: geo.region,
    referer: requestInfo.referer, language: requestInfo.acceptLanguage.split(',')[0],
    platform: requestInfo.secChUaPlatform.toString().replace(/"/g, ''),
    host: requestInfo.host, fullPath: requestInfo.url, step: 0
  };


  try {
    const resDetail = await axiosInstance.get(API_ENDPOINTS.movie.detail(slug));
    const dataDetail = resDetail.data;

    if (!dataDetail || !dataDetail.data) return { notFound: true };

    const [resProposal, resSessionsData] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.movie.filterByProposal(slug), { params: { limit: 12 } }),
      axiosInstance.get(API_ENDPOINTS.movie.Season(dataDetail.data._id)),
    ]);

    const proposals = resProposal.data.status ? resProposal.data.data : [];
    const sessions = resSessionsData.data.data || [];

    return {
      props: {
        initialMovie: dataDetail.data,
        initialSessions: sessions,
        initialEpisodes: sessions[0]?.episodes || [],
        initialProposals: proposals,
        dynamicData: await Encrypt(JSON.stringify(dynamicDetect)),
      }
    };
  } catch {
    return { notFound: true };
  }
});

export default XemPhim;
