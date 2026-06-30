import React, { useState, useRef } from 'react';
import 'simplebar-react/dist/simplebar.min.css';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import toast from 'react-hot-toast';
import axios from 'axios'; // Import axios để dùng isAxiosError

// --- 1. CONSTANTS ---
const LANGUAGES = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'Tiếng Anh', flag: '🇺🇸' },
    { code: 'zh', name: 'Tiếng Trung', flag: '🇨🇳' },
    { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷' },
    { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵' },
    { code: 'th', name: 'Tiếng Thái', flag: '🇹🇭' },
];

const STORAGE_SERVERS = [
    { id: '1', name: 'Tiktok' },
    { id: '2', name: 'Google Drive' },
    { id: '3', name: 'CloudFlare' },
    { id: '4', name: 'AWS S3' },
    { id: '5', name: 'Local Cloud' },
];

enum VideoFormat {
    M3U8 = "m3u8",
    MP4 = "mp4",
    MKV = "mkv"
}

// --- 2. INTERFACES (DEFINED STRICTLY) ---

// Interface cho cấu trúc Skip Intro/Outro
interface SkipTime {
    start: number;
    end: number;
}

// Interface cho Video bên trong 1 tập phim
interface VideoResource {
    server_name: string;
    quality: string;
    type: string;
    url: string;
    format: VideoFormat;
    is_default: boolean;
    skip_intro: SkipTime;
    skip_outro: SkipTime;
    storage_server_id?: string;
}

// Interface cho Subtitle
interface SubtitleItem {
    lang: string;
    label: string;
    type: 'upload' | 'import'; // 'upload' là file local, 'import' là URL
    value: string | File;      // value chứa URL string hoặc File object
    fileName?: string;         // Tên file để hiển thị UI
}

// Interface chính cho Episode hiển thị trên UI
interface EpisodeUI {
    id: string;
    name: string;
    part: string;
    videos: VideoResource[]; // KHÔNG DÙNG any[]
    server: string;
    type: string;
    quality: string;
    duration: string;
    skip_intro_start: string;
    skip_intro_end: string;
    skip_outro_start: string;
    skip_outro_end: string;
    subtitles: SubtitleItem[];
    season?: number;
}

// Interface cho hàng đợi Upload Video
interface VideoQueueItem {
    id: string;
    type: 'file' | 'url';
    file?: File;
    url?: string;
    name: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    progress: number;
    message: string;
    storageId: string;
    storageName: string;
    info?: { duration: string; quality: string; };
    resultUrl?: string;
    jobId?: string;
    displayServer: string;
    displayType: string;
    detectedQuality: string;
    phase?: 'queued' | 'uploading' | 'processing' | 'done';
    uploadProgress?: number;
    uploadedBytes?: number;
    totalBytes?: number;
    speedBps?: number;
    etaSeconds?: number;
}

// Interface cho dữ liệu trả về từ Stream Upload (JSON Parse Line)
interface StreamData {
    type: 'info' | 'progress' | 'result' | 'error';
    message?: string;
    percent?: number;
    duration?: number;
    quality?: string;
    data?: {
        playlist_url: string;
        job_id: string;
    };
}

// Interface cho Response từ API TMDB/Backend
interface BackendEpisode {
    _id: string;
    name: string;
    season_number: number;
    videos: VideoResource[];
    type: string;
    duration: number;
    skip_intro?: SkipTime;
    skip_outro?: SkipTime;
    subtitles?: { language: string; label: string; url: string }[];
}

interface TMDBResponse {
    status: boolean;
    data: {
        movie: { name?: string; origin_name?: string };
        episodes: BackendEpisode[];
    };
}

// --- 3. HELPER FUNCTIONS ---
const secondsToHms = (d: number | string): string => {
    const numD = Number(d);
    if (isNaN(numD)) return "";
    const h = Math.floor(numD / 3600);
    const m = Math.floor((numD % 3600) / 60);
    const s = Math.floor(numD % 60);
    const hDisplay = h > 0 ? h + ":" : "";
    const mDisplay = m.toString().padStart(2, '0') + ":";
    const sDisplay = s.toString().padStart(2, '0');
    return hDisplay + mDisplay + sDisplay;
};

const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr) return 0;
    if (!durationStr.includes(':')) return parseInt(durationStr) || 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
};

const CLIENT_UPLOAD_WEIGHT = 15;

const clampPercent = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
};

const mapServerProgress = (itemType: VideoQueueItem['type'], percent?: number): number => {
    const serverPercent = clampPercent(percent || 0);
    if (itemType !== 'file') return serverPercent;
    return Math.min(100, CLIENT_UPLOAD_WEIGHT + Math.round((serverPercent / 100) * (100 - CLIENT_UPLOAD_WEIGHT)));
};

const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const formatShortDuration = (seconds?: number): string => {
    if (!seconds || seconds < 0 || !Number.isFinite(seconds)) return "";
    const rounded = Math.ceil(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return mins > 0 ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;
};

const formatUploadProgressMessage = (
    loaded: number,
    total: number,
    speedBps: number,
    etaSeconds?: number
): string => {
    const speed = speedBps > 0 ? `${formatBytes(speedBps)}/s` : "";
    const eta = etaSeconds && etaSeconds > 0 ? `ETA ${formatShortDuration(etaSeconds)}` : "";
    const size = total > 0 ? `${formatBytes(loaded)}/${formatBytes(total)}` : formatBytes(loaded);
    return ["Uploading file", size, speed, eta].filter(Boolean).join(" - ");
};

const getQueueProgressLabel = (item: VideoQueueItem): string => {
    if (item.phase === 'uploading') {
        return `${item.uploadProgress || 0}% - ${item.message}`;
    }
    return `${item.progress}% - ${item.message}`;
};

const extractSeasonNumber = (partStr: string): number => {
    if (!partStr) return 1;
    const match = partStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
};

// --- 4. COMPONENT ---
const Upload: React.FC = () => {
    // --- STATES ---
    const [uploadTab, setUploadTab] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);

    const [importVideoUrl, setImportVideoUrl] = useState('');
    const videoFileInputRef = useRef<HTMLInputElement>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);

    const [movieConfig, setMovieConfig] = useState({ title: '', tmdbId: '' });
    const [currentStorageId, setCurrentStorageId] = useState('1');

    const [parts, setParts] = useState<string[]>(['Phần 1']);
    const [episodes, setEpisodes] = useState<EpisodeUI[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isAddingNewServer, setIsAddingNewServer] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        name: '',
        part: 'Phần 1',
        server: 'VIP',
        type: 'phude',
        duration: '',
        skip_intro_start: '',
        skip_intro_end: '',
        skip_outro_start: '',
        skip_outro_end: '',
        subtitles: [] as SubtitleItem[],
        quality: '720p',
    });

    const [subMethod, setSubMethod] = useState<0 | 1>(0);
    const [tempSubLang, setTempSubLang] = useState('vi');
    const [tempSubLabel, setTempSubLabel] = useState('');
    const [tempSubUrl, setTempSubUrl] = useState('');
    const [tempSubFile, setTempSubFile] = useState<File | null>(null);

    // --- COMPUTED VALUES ---
    const filteredEpisodes = episodes.filter(ep => ep.part === formData.part);
    const currentSelectedEpisode = episodes.find(e => e.id === selectedId);

    const uniqueServers = currentSelectedEpisode
        ? Array.from(new Set(currentSelectedEpisode.videos.map(v => v.server_name)))
        : [];

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'phude': return 'Phụ đề';
            case 'thuyetminh': return 'Thuyết minh';
            case 'longtieng': return 'Lồng tiếng';
            default: return type;
        }
    }

    // --- API HANDLERS ---
    const fetchTMDBData = async () => {
        if (!movieConfig.tmdbId.trim()) return;
        const toastId = toast.loading("Đang tải thông tin...");
        try {
            // Generic Type cho axios response
            const tmdbId = movieConfig.tmdbId.trim();
            const res = await axiosInstance.get<TMDBResponse>(API_ENDPOINTS.movie.tmdb(tmdbId));
            const responseData = res.data; // Type: TMDBResponse

            if (responseData.status && responseData.data) {
                const { movie, episodes: backendEpisodes } = responseData.data;
                setMovieConfig(prev => ({ ...prev, title: movie.name || movie.origin_name || "" }));

                const uniqueSeasons = Array.from(new Set(backendEpisodes.map(ep => `Phần ${ep.season_number}`))).sort();
                const newParts = uniqueSeasons.length > 0 ? uniqueSeasons : ['Phần 1'];
                setParts(newParts);
                setFormData(prev => ({ ...prev, part: newParts[0] }));

                const mappedEpisodes: EpisodeUI[] = backendEpisodes.map((ep) => {
                    const firstVideo = ep.videos && ep.videos.length > 0 ? ep.videos[0] : null;
                    const mappedSubtitles: SubtitleItem[] = (ep.subtitles || []).map((sub) => ({
                        lang: sub.language || 'vi',
                        label: sub.label || 'Default',
                        type: 'import',
                        value: sub.url,
                        fileName: sub.url
                    }));

                    return {
                        id: ep._id,
                        name: ep.name,
                        part: `Phần ${ep.season_number}`,
                        videos: ep.videos || [],
                        server: firstVideo ? firstVideo.server_name : "VIP",
                        type: ep.type || (firstVideo ? firstVideo.type : 'phude'),
                        quality: firstVideo ? firstVideo.quality : "720p",
                        duration: ep.duration ? secondsToHms(ep.duration) : "",
                        skip_intro_start: ep.skip_intro?.start ? secondsToHms(ep.skip_intro.start) : "",
                        skip_intro_end: ep.skip_intro?.end ? secondsToHms(ep.skip_intro.end) : "",
                        skip_outro_start: ep.skip_outro?.start ? secondsToHms(ep.skip_outro.start) : "",
                        skip_outro_end: ep.skip_outro?.end ? secondsToHms(ep.skip_outro.end) : "",
                        subtitles: mappedSubtitles,
                        season: ep.season_number
                    };
                });
                setEpisodes(mappedEpisodes);
                toast.success("Đã tải thông tin phim!", { id: toastId });
            } else {
                toast.error("Không tìm thấy dữ liệu phim!", { id: toastId });
            }
        } catch (error: unknown) {
            console.error("Error:", error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Lỗi API TMDB", { id: toastId });
            } else {
                toast.error("Lỗi không xác định khi lấy thông tin", { id: toastId });
            }
        }
    };

    // --- FORM HANDLERS ---
    const handleSelectEpisode = (id: string | null) => {
        if (isLoading) return;
        setSelectedId(id);
        setIsAddingNewServer(false);
        if (id) {
            const ep = episodes.find(e => e.id === id);
            if (ep) {
                setFormData({
                    name: ep.name,
                    part: ep.part,
                    server: ep.server,
                    type: ep.type,
                    quality: ep.quality,
                    duration: ep.duration,
                    skip_intro_start: ep.skip_intro_start,
                    skip_intro_end: ep.skip_intro_end,
                    skip_outro_start: ep.skip_outro_start,
                    skip_outro_end: ep.skip_outro_end,
                    subtitles: ep.subtitles || [],
                });
            }
        } else {
            setFormData({
                name: '',
                part: formData.part || 'Phần 1',
                server: 'VIP',
                type: 'phude',
                quality: '720p',
                duration: '',
                skip_intro_start: '',
                skip_intro_end: '',
                skip_outro_start: '',
                skip_outro_end: '',
                subtitles: [],
            });
        }
    };

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        if (isLoading) return;
        // Sử dụng spread và ép kiểu để đảm bảo type safe
        const newFormData = { ...formData, [field]: value };
        
        let shouldAutoFill = false;

        if (field === 'server') {
            if (value === 'Thêm Mới') {
                setIsAddingNewServer(true);
                newFormData.server = '';
            } else {
                if (!isAddingNewServer) shouldAutoFill = true;
            }
        }

        if (shouldAutoFill && selectedId) {
            const currentEp = episodes.find(e => e.id === selectedId);
            if (currentEp) {
                const targetVideo = currentEp.videos.find(v => v.server_name === value);
                if (targetVideo) {
                    newFormData.type = targetVideo.type;
                    newFormData.quality = targetVideo.quality;
                    setEpisodes(prev => prev.map(ep => ep.id === selectedId ? { ...ep, server: value, type: newFormData.type, quality: newFormData.quality } : ep));
                }
            }
        }

        setFormData(newFormData);

        if (selectedId) {
            setEpisodes(prev => prev.map(ep => ep.id === selectedId ? { ...ep, [field]: newFormData[field] } : ep));
        } else {
            if (field === 'name' && value.trim() !== '') {
                const newId = Date.now().toString();
                const newEpisode: EpisodeUI = {
                    id: newId,
                    name: value,
                    part: newFormData.part,
                    videos: [],
                    server: newFormData.server,
                    type: newFormData.type,
                    quality: newFormData.quality,
                    duration: newFormData.duration,
                    skip_intro_start: newFormData.skip_intro_start,
                    skip_intro_end: newFormData.skip_intro_end,
                    skip_outro_start: newFormData.skip_outro_start,
                    skip_outro_end: newFormData.skip_outro_end,
                    subtitles: newFormData.subtitles,
                };
                setEpisodes(prev => [...prev, newEpisode]);
                setSelectedId(newId);
            }
        }

        if (field === 'server' || field === 'type') {
            setVideoQueue(prev => prev.map(item => ({
                ...item,
                displayServer: field === 'server' ? value : item.displayServer,
                displayType: field === 'type' ? value : item.displayType,
            })));
        }
    };

    // --- UPLOAD LOGIC ---
    const uploadQueueItemWithProgress = async (
        item: VideoQueueItem,
        bodyData: FormData
    ): Promise<VideoQueueItem> => {
        let buffer = "";
        let finalResultUrl = "";
        let finalJobId = "";
        let finalErrorMessage = "";
        let metadata = { duration: "", quality: "" };

        const handleStreamData = (data: StreamData) => {
            setVideoQueue(prev => prev.map(qItem => {
                if (qItem.id !== item.id) return qItem;

                if (data.type === 'info') {
                    if (data.duration || data.quality) {
                        metadata = {
                            duration: secondsToHms(data.duration || 0),
                            quality: data.quality || ''
                        };
                        setFormData(f => ({ ...f, duration: f.duration || metadata.duration }));
                    }

                    return {
                        ...qItem,
                        phase: 'processing',
                        progress: Math.max(qItem.progress, item.type === 'file' ? CLIENT_UPLOAD_WEIGHT : 0),
                        uploadProgress: item.type === 'file' ? 100 : qItem.uploadProgress,
                        info: metadata.quality ? metadata : qItem.info,
                        message: data.message || qItem.message || "Processing...",
                        detectedQuality: data.quality || qItem.detectedQuality
                    };
                }

                if (data.type === 'progress') {
                    return {
                        ...qItem,
                        phase: 'processing',
                        progress: mapServerProgress(item.type, data.percent),
                        uploadProgress: item.type === 'file' ? 100 : qItem.uploadProgress,
                        message: data.message || 'Processing...'
                    };
                }

                if (data.type === 'result' && data.data) {
                    finalResultUrl = data.data.playlist_url;
                    finalJobId = data.data.job_id;
                    return {
                        ...qItem,
                        phase: 'done',
                        status: 'success',
                        progress: 100,
                        uploadProgress: 100,
                        message: 'Done!',
                        resultUrl: finalResultUrl,
                        jobId: finalJobId
                    };
                }

                if (data.type === 'error') {
                    finalErrorMessage = data.message || "Unknown Error";
                    return { ...qItem, status: 'error', message: finalErrorMessage };
                }

                return qItem;
            }));

            if (data.type === 'result' && data.data) {
                finalResultUrl = data.data.playlist_url;
                finalJobId = data.data.job_id;
            }
            if (data.type === 'error') finalErrorMessage = data.message || "Unknown Error";
        };

        const parseStreamBuffer = (flush = false) => {
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            if (flush && buffer.trim()) {
                lines.push(buffer);
                buffer = "";
            }

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    handleStreamData(JSON.parse(line) as StreamData);
                } catch (e) {
                    console.error("JSON Parse Error", e);
                }
            }
        };

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let uploadUrl = API_ENDPOINTS.upload;
            try {
                uploadUrl = axiosInstance.resolveURL(API_ENDPOINTS.upload);
            } catch {}

            const uploadStartedAt = Date.now();
            let parsedLength = 0;

            xhr.open("POST", uploadUrl, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Accept", "application/x-ndjson");

            const token = localStorage.getItem("access_token");
            if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            if (item.type === 'url') xhr.setRequestHeader("Content-Type", "application/json");

            xhr.upload.onprogress = (event) => {
                if (item.type !== 'file') return;

                const loaded = event.loaded || 0;
                const total = event.lengthComputable ? event.total : (item.file?.size || 0);
                const uploadProgress = total > 0 ? clampPercent((loaded / total) * 100) : 0;
                const elapsedSec = Math.max((Date.now() - uploadStartedAt) / 1000, 0.1);
                const speedBps = loaded / elapsedSec;
                const etaSeconds = total > 0 && speedBps > 0 ? (total - loaded) / speedBps : undefined;

                setVideoQueue(prev => prev.map(qItem => qItem.id === item.id ? {
                    ...qItem,
                    status: 'processing',
                    phase: 'uploading',
                    uploadProgress,
                    uploadedBytes: loaded,
                    totalBytes: total,
                    speedBps,
                    etaSeconds,
                    progress: Math.min(CLIENT_UPLOAD_WEIGHT, Math.round((uploadProgress / 100) * CLIENT_UPLOAD_WEIGHT)),
                    message: formatUploadProgressMessage(loaded, total, speedBps, etaSeconds)
                } : qItem));
            };

            xhr.upload.onload = () => {
                if (item.type !== 'file') return;
                setVideoQueue(prev => prev.map(qItem => qItem.id === item.id ? {
                    ...qItem,
                    phase: 'processing',
                    uploadProgress: 100,
                    progress: Math.max(qItem.progress, CLIENT_UPLOAD_WEIGHT),
                    message: 'Upload sent. Waiting for server...'
                } : qItem));
            };

            xhr.onprogress = () => {
                const responseText = xhr.responseText || "";
                if (responseText.length <= parsedLength) return;
                buffer += responseText.slice(parsedLength);
                parsedLength = responseText.length;
                parseStreamBuffer();
            };

            xhr.onload = () => {
                const responseText = xhr.responseText || "";
                if (responseText.length > parsedLength) {
                    buffer += responseText.slice(parsedLength);
                    parsedLength = responseText.length;
                }
                parseStreamBuffer(true);

                if (xhr.status >= 200 && xhr.status < 300) {
                    if (finalErrorMessage) reject(new Error(finalErrorMessage));
                    else resolve();
                    return;
                }

                reject(new Error(`Upload Failed (${xhr.status})`));
            };

            xhr.onerror = () => reject(new Error("Network error during upload"));
            xhr.onabort = () => reject(new Error("Upload aborted"));

            xhr.send(item.type === 'file' ? bodyData : JSON.stringify({ url: item.url, seg: 4 }));
        });

        if (finalErrorMessage || !finalResultUrl) {
            const msg = finalErrorMessage || "Upload finished without playlist URL";
            setVideoQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: msg } : i));
            return { ...item, status: 'error', message: msg };
        }

        const finalQuality = metadata.quality || item.detectedQuality || '720p';
        return {
            ...item,
            status: 'success',
            progress: 100,
            phase: 'done',
            uploadProgress: item.type === 'file' ? 100 : item.uploadProgress,
            resultUrl: finalResultUrl,
            jobId: finalJobId,
            info: metadata.quality ? metadata : item.info,
            detectedQuality: finalQuality
        };
    };

    const processQueueItem = async (item: VideoQueueItem): Promise<VideoQueueItem> => {
        setVideoQueue(prev => prev.map(i => i.id === item.id ? {
            ...i,
            status: 'processing',
            progress: 0,
            phase: item.type === 'file' ? 'uploading' : 'processing',
            uploadProgress: 0,
            message: item.type === 'file' ? 'Preparing upload...' : 'Connecting...'
        } : i));

        const bodyData = new FormData();
        if (item.type === 'file' && item.file) bodyData.append('video', item.file);
        else if (item.url) bodyData.append('url', item.url);
        bodyData.append('seg', '4');

        try {
            return await uploadQueueItemWithProgress(item, bodyData);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Upload Failed";
            setVideoQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: msg } : i));
            return { ...item, status: 'error', message: msg };
        }
    };

    const processQueueItemLegacy = async (item: VideoQueueItem): Promise<VideoQueueItem> => {
        setVideoQueue(prev => prev.map(i => i.id === item.id ? {
            ...i,
            status: 'processing',
            progress: 0,
            phase: item.type === 'file' ? 'uploading' : 'processing',
            uploadProgress: 0,
            message: item.type === 'file' ? 'Preparing upload...' : 'Connecting...'
        } : i));

        const bodyData = new FormData();
        if (item.type === 'file' && item.file) bodyData.append('video', item.file);
        else if (item.url) bodyData.append('url', item.url);
        bodyData.append('seg', '4');

        try {
            const response = await axiosInstance.post(API_ENDPOINTS.upload,
                item.type === 'file' ? bodyData : { url: item.url },
                {
                    headers: item.type === 'url' ? { 'Content-Type': 'application/json' } : undefined,
                    responseType: 'stream',
                    adapter: 'fetch',
                }
            );

            if (!response.data) throw new Error("No response data");
            
            // Ép kiểu cho stream reader
            const reader = (response.data as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let finalResultUrl = "";
            let finalJobId = "";
            let metadata = { duration: "", quality: "" };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        // Cast JSON parsed object to StreamData interface
                        const data = JSON.parse(line) as StreamData;

                        setVideoQueue(prev => prev.map(qItem => {
                            if (qItem.id !== item.id) return qItem;
                            
                            if (data.type === 'info' && (data.duration || data.quality)) {
                                metadata = { 
                                    duration: secondsToHms(data.duration || 0), 
                                    quality: data.quality || '' 
                                };
                                setFormData(f => ({ ...f, duration: f.duration || metadata.duration }));
                                return {
                                    ...qItem,
                                    info: metadata,
                                    message: data.message || "Metadata loaded",
                                    detectedQuality: data.quality || qItem.detectedQuality
                                };
                            }
                            
                            if (data.type === 'progress') {
                                return { ...qItem, progress: data.percent || 0, message: data.message || '' };
                            }
                            
                            if (data.type === 'result' && data.data) {
                                finalResultUrl = data.data.playlist_url;
                                finalJobId = data.data.job_id;
                                return { ...qItem, status: 'success', progress: 100, message: 'Done!', resultUrl: finalResultUrl, jobId: finalJobId };
                            }
                            
                            if (data.type === 'error') {
                                return { ...qItem, status: 'error', message: data.message || "Unknown Error" };
                            }
                            
                            return qItem;
                        }));

                        if (data.type === 'result' && data.data) { 
                            finalResultUrl = data.data.playlist_url; 
                            finalJobId = data.data.job_id; 
                        }
                    } catch (e) { console.error("JSON Parse Error", e); }
                }
            }
            const finalQuality = metadata.quality || item.detectedQuality || '720p';
            return { ...item, status: finalResultUrl ? 'success' : 'error', resultUrl: finalResultUrl, jobId: finalJobId, info: metadata.quality ? metadata : item.info, detectedQuality: finalQuality };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Upload Failed";
            setVideoQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: msg } : i));
            return { ...item, status: 'error', message: msg };
        }
    };
    void processQueueItemLegacy;

    // --- MAIN SUBMIT ---
    const handleMainSubmit = async () => {
        if (!movieConfig.tmdbId && !movieConfig.title) return toast.error("Vui lòng nhập Tên phim hoặc ID TMDB!");
        
        if (videoQueue.length === 0 && episodes.length === 0) {
            return toast.error("Vui lòng thêm video hoặc tạo ít nhất một tập phim!");
        }

        setIsLoading(true);
        const toastId = toast.loading("Đang xử lý dữ liệu...");

        try {
            // 1. Process Queue
            const pendingItems = videoQueue.filter(i => i.status !== 'success');
            let processedQueueItems = [...videoQueue];

            if (pendingItems.length > 0) {
                toast.loading("Đang upload video...", { id: toastId });
                const results = await Promise.all(pendingItems.map(item => processQueueItem(item)));
                processedQueueItems = videoQueue.map(item => {
                    const found = results.find(r => r.id === item.id);
                    return found ? { ...item, ...found } : item;
                });
            }

            if (processedQueueItems.some(i => i.status === 'error')) {
                setIsLoading(false);
                return toast.error("Có video lỗi. Kiểm tra lại!", { id: toastId });
            }

            // 2. Prepare Data
            toast.loading("Đang lưu thông tin phim...", { id: toastId });
            
            const currentServer = formData.server || 'VIP';
            const currentType = formData.type || 'phude';
            const skipTime = {
                skip_intro: { start: parseDurationToSeconds(formData.skip_intro_start), end: parseDurationToSeconds(formData.skip_intro_end) },
                skip_outro: { start: parseDurationToSeconds(formData.skip_outro_start), end: parseDurationToSeconds(formData.skip_outro_end) }
            };

            const queueVideosList: VideoResource[] = processedQueueItems
                .filter(item => item.status === 'success' && item.resultUrl)
                .map((item) => ({
                    format: VideoFormat.M3U8,
                    quality: item.info?.quality || item.detectedQuality || '720p',
                    type: currentType,
                    url: item.resultUrl || '',
                    server_name: currentServer,
                    storage_server_id: item.storageId,
                    is_default: false,
                    skip_intro: skipTime.skip_intro,
                    skip_outro: skipTime.skip_outro
                }));

            let detectedDuration = "";
            const videoWithDuration = processedQueueItems.find(i => i.info?.duration);
            if (videoWithDuration && videoWithDuration.info) {
                detectedDuration = videoWithDuration.info.duration;
            }
            const finalDurationForEpisode = formData.duration || detectedDuration;

            // 3. Update Episodes List
            let finalEpisodesList = [...episodes];
            
            const defaultQualityForEpisode = queueVideosList.length > 0 
                ? queueVideosList[0].quality 
                : (currentSelectedEpisode?.quality || '720p');

            if (selectedId) {
                finalEpisodesList = finalEpisodesList.map(ep => {
                    if (ep.id === selectedId) {
                        const updatedVideos = [...ep.videos, ...queueVideosList];
                        if (updatedVideos.length > 0 && !updatedVideos.some(v => v.is_default)) updatedVideos[0].is_default = true;

                        return {
                            ...ep,
                            name: formData.name,
                            part: formData.part,
                            duration: finalDurationForEpisode || ep.duration,
                            skip_intro_start: formData.skip_intro_start,
                            skip_intro_end: formData.skip_intro_end,
                            skip_outro_start: formData.skip_outro_start,
                            skip_outro_end: formData.skip_outro_end,
                            videos: updatedVideos,
                            subtitles: formData.subtitles
                        };
                    }
                    return ep;
                });
            } else {
                if (queueVideosList.length > 0 || (formData.name && formData.name.trim() !== '')) {
                    const existingIdx = finalEpisodesList.findIndex(e => e.name === formData.name && e.part === formData.part);
                    const newEpObj: EpisodeUI = {
                        id: Date.now().toString(),
                        name: formData.name || `Tập ${finalEpisodesList.length + 1}`,
                        part: formData.part,
                        videos: queueVideosList,
                        server: currentServer,
                        type: currentType,
                        quality: defaultQualityForEpisode,
                        duration: finalDurationForEpisode,
                        skip_intro_start: formData.skip_intro_start,
                        skip_intro_end: formData.skip_intro_end,
                        skip_outro_start: formData.skip_outro_start,
                        skip_outro_end: formData.skip_outro_end,
                        subtitles: formData.subtitles
                    };

                    if (existingIdx >= 0) {
                        finalEpisodesList[existingIdx] = {
                            ...finalEpisodesList[existingIdx],
                            ...newEpObj,
                            videos: [...finalEpisodesList[existingIdx].videos, ...queueVideosList],
                            quality: finalEpisodesList[existingIdx].quality || defaultQualityForEpisode,
                            duration: finalEpisodesList[existingIdx].duration || finalDurationForEpisode
                        };
                    } else {
                        finalEpisodesList.push(newEpObj);
                    }
                }
            }

            // Prepare Payload (Strict Typing)
            const episodesPayload = finalEpisodesList.map(ep => ({
                ...ep,
                season: extractSeasonNumber(ep.part),
                subtitles: ep.subtitles.map(sub => ({
                    language: sub.lang,
                    label: sub.label,
                    type: 'url',
                    url: sub.type === 'upload' ? '' : (sub.value as string)
                }))
            }));

            const subtitlesPayload = formData.subtitles.map((sub) => ({
                language: sub.lang,
                label: sub.label,
                type: 'url',
                url: sub.type === 'upload' ? '' : (sub.value as string)
            }));

            const payload = {
                movie_id: movieConfig.tmdbId.trim(),
                movie_title: movieConfig.title.trim(),
                episodes: episodesPayload,
                subtitles: subtitlesPayload
            };

            const res = await axiosInstance.post(API_ENDPOINTS.movie.upload, payload);

            if (res.data) {
                toast.success("Thành công! Đã lưu dữ liệu.", { id: toastId });
                setVideoQueue([]);
            }

        } catch (error: unknown) {
            console.error("Upload Failed:", error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Lỗi API", { id: toastId });
            } else {
                toast.error("Đã có lỗi xảy ra", { id: toastId });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- DRAG & DROP ---
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragItemRef = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number, id: string) => {
        if (isLoading) return;
        dragItemRef.current = index;
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnter = (index: number, id: string) => {
        if (isLoading || dragItemRef.current === null) return;
        setDragOverId(id);
        
        const dragIndex = dragItemRef.current;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        const newEpisodes = [...episodes];
        const draggedItem = newEpisodes[dragIndex];
        
        newEpisodes.splice(dragIndex, 1);
        newEpisodes.splice(hoverIndex, 0, draggedItem);

        setEpisodes(newEpisodes);
        dragItemRef.current = hoverIndex;
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverId(null);
        dragItemRef.current = null;
    };

    // --- OTHER HANDLERS ---
    const getStorageName = (id: string) => STORAGE_SERVERS.find(s => s.id === id)?.name || 'Unknown';

    const getInitialQualityFromFileName = (name: string): string => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('2160p') || lowerName.includes('4k')) return '4K';
        if (lowerName.includes('1080p') || lowerName.includes('fhd')) return '1080p';
        if (lowerName.includes('720p') || lowerName.includes('hd')) return '720p';
        if (lowerName.includes('480p')) return '480p';
        if (lowerName.includes('360p')) return '360p';
        return '720p';
    };

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLoading) return;
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const newItems: VideoQueueItem[] = newFiles.map(file => ({
                id: Date.now() + Math.random().toString(),
                type: 'file',
                file,
                name: file.name,
                status: 'pending',
                progress: 0,
                message: 'Waiting...',
                storageId: currentStorageId,
                storageName: getStorageName(currentStorageId),
                displayServer: formData.server || 'VIP',
                displayType: formData.type || 'phude',
                detectedQuality: getInitialQualityFromFileName(file.name),
            }));
            setVideoQueue(prev => [...prev, ...newItems]);
        }
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    };

    const handleAddUrl = () => {
        if (isLoading) return;
        if (!importVideoUrl.trim()) { toast.error("Vui lòng nhập URL!"); return; }
        const newItem: VideoQueueItem = {
            id: Date.now() + Math.random().toString(),
            type: 'url',
            url: importVideoUrl,
            name: importVideoUrl.split('/').pop()?.split('?')[0] || 'Link Video',
            status: 'pending',
            progress: 0,
            message: 'Waiting...',
            storageId: currentStorageId,
            storageName: getStorageName(currentStorageId),
            displayServer: formData.server || 'VIP',
            displayType: formData.type || 'phude',
            detectedQuality: getInitialQualityFromFileName(importVideoUrl),
        };
        setVideoQueue(prev => [...prev, newItem]);
        setImportVideoUrl('');
    };

    const handleRemoveQueueItem = (id: string) => {
        if (isLoading) return;
        setVideoQueue(prev => prev.filter(item => item.id !== id));
    };

    const triggerVideoFileSelect = () => { if (!isLoading) videoFileInputRef.current?.click(); };
    const triggerSubtitleFileSelect = () => { if (!isLoading) subtitleInputRef.current?.click(); };
    const handleSubtitleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setTempSubFile(e.target.files[0]); };
    const handleAddSubtitle = () => {
        if (isLoading) return;
        if (!tempSubLabel.trim()) return toast.error("Nhập tên sub");
        const newSub: SubtitleItem = { lang: tempSubLang, label: tempSubLabel, type: subMethod === 0 ? 'upload' : 'import', value: subMethod === 0 ? tempSubFile! : tempSubUrl, fileName: subMethod === 0 ? tempSubFile?.name : undefined };
        setFormData(prev => ({ ...prev, subtitles: [...prev.subtitles, newSub] })); setTempSubUrl(''); setTempSubFile(null); if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    };
    const handleRemoveSubtitle = (index: number) => {
        if (isLoading) return;
        setFormData(prev => ({ ...prev, subtitles: prev.subtitles.filter((_, i) => i !== index) }));
    };

    const handleBlurTime = (field: keyof typeof formData, isDurationInput: boolean) => {
        let value = formData[field];
        if (typeof value !== 'string' || !value || value.includes(':')) return;
        const num = parseInt(value, 10);
        if (isNaN(num)) return;
        const formattedTime = secondsToHms(isDurationInput ? num * 60 : num);
        setFormData(prev => ({ ...prev, [field]: formattedTime }));
    };
    const cancelAddServerMode = () => { if (!isLoading) { setIsAddingNewServer(false); handleInputChange('server', ''); } };

    const handleDeleteServer = () => {
        if (isLoading) return;
        if (!selectedId) return;
        if (!formData.server) { toast.error("Vui lòng chọn server cần xóa!"); return; }
        if (window.confirm(`Bạn có chắc muốn xóa tất cả video thuộc server "${formData.server}" khỏi tập này?`)) {
            const updatedEpisodes = episodes.map(ep => {
                if (ep.id === selectedId) {
                    const newVideos = ep.videos.filter(v => v.server_name !== formData.server);
                    let nextServer = "", nextType = ep.type, nextQuality = ep.quality;
                    if (newVideos.length > 0) {
                        nextServer = newVideos[0].server_name;
                        nextType = newVideos[0].type;
                        nextQuality = newVideos[0].quality;
                    }
                    setFormData(p => ({ ...p, server: nextServer, type: nextType, quality: nextQuality }));
                    return { ...ep, videos: newVideos, server: nextServer, type: nextType, quality: nextQuality };
                }
                return ep;
            });
            setEpisodes(updatedEpisodes);
            toast.success("Đã xóa server!");
        }
    };

    const handleDeleteEpisode = () => {
        if (isLoading) return;
        if (selectedId && window.confirm("Bạn có chắc chắn muốn xóa tập phim này?")) {
            setEpisodes(prev => prev.filter(ep => ep.id !== selectedId));
            handleSelectEpisode(null);
            toast.success("Đã xóa tập phim!");
        }
    };

    return (
        <div className='px-3 lg:px-5 xl:px-8 py-5 '>
            <div className='text-xl font-semibold'>Đăng tải phim</div>
            <div className='text-base mt-1 text-gray-400'>Upload video từ file hoặc import từ URL</div>

            <div className={`grid grid-cols-1 mt-6 lg:grid-cols-10 gap-5 h-full ${isLoading ? 'pointer-events-none opacity-60' : ''}`}>
                <div className='lg:col-span-3'>
                    <div className='border border-gay-300 px-5 pt-3 pb-5 rounded-xl bg-white'>
                        <div className='text-lg font-semibold'>Nguồn Video</div>
                        <div className='text-sm mt-1 text-gray-400'>Quản lý danh sách video đầu vào</div>
                        <div className='bg-gray-100 rounded-lg mt-4 p-1 flex items-center space-x-2'>
                            <button disabled={isLoading} className={`flex-1 text-sm py-2 rounded-lg transition ${uploadTab === 0 ? 'bg-white shadow text-black' : 'text-gray-500'}`} onClick={() => setUploadTab(0)}><i className="fa-regular fa-upload mr-2"></i>Upload</button>
                            <button disabled={isLoading} className={`flex-1 text-sm py-2 rounded-lg transition ${uploadTab === 1 ? 'bg-white shadow text-black' : 'text-gray-500'}`} onClick={() => setUploadTab(1)}><i className="fa-regular fa-link mr-2"></i>Import</button>
                        </div>
                        <div className='mt-3'>
                            {uploadTab === 0 ? (
                                <div onClick={triggerVideoFileSelect} className={`border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition ${isLoading ? 'cursor-not-allowed' : ''}`}>
                                    <input disabled={isLoading} type="file" ref={videoFileInputRef} onChange={handleVideoFileSelect} accept="video/mp4,video/x-m4v,video/*,.mkv,.ts" multiple className="hidden" />
                                    <i className="fa-regular fa-cloud-arrow-up text-5xl text-gray-400 mb-3"></i>
                                    <span className='text-black font-medium text-sm bg-gray-200 px-3 py-1.5 rounded-md'>Chọn files</span>
                                    <p className='mt-2.5 text-[12px] text-gray-400 text-center'>MP4, MKV, AVI<br />(Cho phép nhiều file)</p>
                                </div>
                            ) : (
                                <div className='mt-4'>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Link Video (m3u8, mp4)</label>
                                    <div className="flex space-x-2">
                                        <input disabled={isLoading} type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg text-sm' placeholder='https://...' value={importVideoUrl} onChange={e => setImportVideoUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddUrl()} />
                                        <button disabled={isLoading} onClick={handleAddUrl} className='bg-black text-white px-3 py-2.5 rounded-lg hover:bg-gray-800 transition'><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            )}
                            <div className="mt-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Danh sách ({videoQueue.length})</span>
                                    {videoQueue.length > 0 && <button disabled={isLoading} onClick={() => setVideoQueue([])} className="text-[11px] text-red-500 hover:underline">Xóa tất cả</button>}
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {videoQueue.length === 0 && <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg"><span className="text-xs text-gray-400">Chờ cấu hình</span></div>}
                                    {videoQueue.map((item) => (
                                        <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 relative overflow-hidden">
                                            {item.status === 'processing' && (
                                                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                            )}

                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="flex items-start space-x-2.5 overflow-hidden w-full">
                                                    <div className={`mt-0.5 w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-xs ${item.type === 'file' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}><i className={`fa-solid ${item.type === 'file' ? 'fa-file-video' : 'fa-link'}`}></i></div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-medium text-gray-700 truncate block" title={item.name}>{item.name}</span>
                                                        <div className='flex flex-wrap gap-1 mt-1 mb-1'>
                                                            <span className='text-[9px] px-1 rounded bg-black text-white font-medium'>{formData.server || item.displayServer || 'VIP'}</span>
                                                            <span className='text-[9px] px-1 rounded bg-gray-300 text-gray-700'>{getTypeLabel(formData.type || item.displayType || 'phude')}</span>
                                                            <span className='text-[9px] px-1 rounded bg-green-200 text-green-700 font-bold'>{(item.info?.quality || item.detectedQuality)}</span>
                                                        </div>
                                                        <div className='flex items-center space-x-2'>
                                                            <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium whitespace-nowrap'>{item.storageName}</span>
                                                            <div className="flex items-center space-x-1 flex-1 overflow-hidden">
                                                                {item.status === 'processing' && <span className="text-[10px] text-blue-600 truncate"><i className="fa-solid fa-sync fa-spin mr-1"></i>{getQueueProgressLabel(item)}</span>}
                                                                {item.status === 'error' && <span className="text-[10px] text-red-600 truncate">{item.message}</span>}
                                                                {item.status === 'pending' && <span className="text-[10px] text-gray-400">Chờ tải lên</span>}
                                                                {item.status === 'success' && item.info && <span className="text-[10px] text-green-600 font-medium">{item.info.quality} • {item.info.duration}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button disabled={isLoading} onClick={() => handleRemoveQueueItem(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition ml-2"><i className="fa-solid fa-trash-can text-xs"></i></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='lg:col-span-7'>
                    <div className='border border-gay-300 px-5 py-3 rounded-xl h-full bg-white'>
                        <div className='text-lg font-semibold'>Cấu hình upload</div>
                        <div className='text-[15px] my-5 font-semibold'>Thông tin cơ bản</div>
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
                            <div className='col-span-1 lg:col-span-2'><label className='font-medium'>Tên Phim</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='Tên phim...' value={movieConfig.title} onChange={e => setMovieConfig({ ...movieConfig, title: e.target.value })} /></div>
                            <div className='col-span-1'><label className='font-medium'>ID TMDB</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='ID TMDB...' value={movieConfig.tmdbId} onChange={e => setMovieConfig({ ...movieConfig, tmdbId: e.target.value })} onBlur={fetchTMDBData} /></div>
                            <div className='col-span-1'><label className='font-medium'>Server Lưu trữ <span className='text-xs text-gray-400 font-normal'>(Cho file sắp thêm)</span></label><div className='mt-2'><select disabled={isLoading} className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' value={currentStorageId} onChange={e => setCurrentStorageId(e.target.value)}>{STORAGE_SERVERS.map(sv => (<option key={sv.id} value={sv.id}>{sv.name}</option>))}</select></div></div>
                        </div>

                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5'>
                            <div className='col-span-1 space-y-3'>
                                <div><label className='font-medium'>Chọn phần</label><div className='mt-2'><select disabled={isLoading} className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' value={formData.part} onChange={e => handleInputChange('part', e.target.value)}>{parts.map((p, idx) => <option key={idx} value={p}>{p}</option>)}</select></div></div>
                                <div><label className='font-medium'>Tên Tập</label><div className='mt-2'><input disabled={isLoading} type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='Tập 1...' value={formData.name} onChange={e => handleInputChange('name', e.target.value)} /></div></div>

                                <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8'>
                                    <div className='col-span-1 lg:col-span-2'><label className='font-medium'>Thời lượng</label><div className='mt-2 relative'><input disabled={isLoading} type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='HH:MM:SS' value={formData.duration} onChange={e => handleInputChange('duration', e.target.value)} onBlur={() => handleBlurTime('duration', true)} /></div></div>
                                    <div className='col-span-1'><label className='font-medium'>Skip Intro (Start)</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='0' value={formData.skip_intro_start} onChange={e => handleInputChange('skip_intro_start', e.target.value)} onBlur={() => handleBlurTime('skip_intro_start', false)} /></div>
                                    <div className='col-span-1'><label className='font-medium'>Skip Intro (End)</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='0' value={formData.skip_intro_end} onChange={e => handleInputChange('skip_intro_end', e.target.value)} onBlur={() => handleBlurTime('skip_intro_end', false)} /></div>
                                    <div className='col-span-1'><label className='font-medium'>Skip Outro (Start)</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='0' value={formData.skip_outro_start} onChange={e => handleInputChange('skip_outro_start', e.target.value)} onBlur={() => handleBlurTime('skip_outro_start', false)} /></div>
                                    <div className='col-span-1'><label className='font-medium'>Skip Outro (End)</label><input disabled={isLoading} type="text" className='mt-2 px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='0' value={formData.skip_outro_end} onChange={e => handleInputChange('skip_outro_end', e.target.value)} onBlur={() => handleBlurTime('skip_outro_end', false)} /></div>
                                </div>

                                <div><label className='font-medium'>Server Video (Tên Server)</label><div className='mt-2'>{isAddingNewServer ? (<div className="flex items-center space-x-2"><input disabled={isLoading} type="text" autoFocus className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='Nhập tên server...' value={formData.server} onChange={e => handleInputChange('server', e.target.value)} /><button disabled={isLoading} onClick={cancelAddServerMode} className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500" title="Hủy"><i className="fa-solid fa-xmark"></i></button></div>) : (<select disabled={isLoading} className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' value={formData.server} onChange={e => handleInputChange('server', e.target.value)}><option value="">Chọn Server</option>{uniqueServers.map((name, idx) => (<option key={idx} value={name}>{name}</option>))}<option value="Thêm Mới">Thêm Mới</option></select>)}</div></div>
                                <div><label className='font-medium'>Loại</label><div className='mt-2'>
                                    <select disabled={isLoading} className='px-3 py-2.5 border w-full rounded-lg' value={formData.type} onChange={e => handleInputChange('type', e.target.value)}>
                                        <option value="embed">Nhúng Player</option>
                                        <option value="phude">Phụ đề</option>
                                        <option value="thuyetminh">Thuyết minh</option>
                                        <option value="longtieng">Lồng tiếng</option>
                                    </select></div>
                                </div>

                                {selectedId && (
                                    <div className='flex items-center space-x-3 mt-4'>
                                        <button disabled={isLoading} onClick={handleDeleteServer} className='text-black w-full rounded-lg bg-white px-4 py-2.5 font-medium text-sm border-black border transition hover:bg-gray-50'>Xóa Server này</button>
                                        <button disabled={isLoading} onClick={handleDeleteEpisode} className='text-white w-full rounded-lg bg-red-600 px-4 py-2.5 font-medium text-sm hover:bg-red-700 transition'>Xóa tập phim</button>
                                    </div>
                                )}
                            </div>

                            <div className='col-span-1 flex flex-col'>
                                <div className='text-[15px] mt-5 font-semibold'>Độ phân giải <span className='text-xs font-normal text-gray-400'>(Được xác định tự động)</span></div>
                                <div className='grid grid-cols-3 gap-3 w-full mt-2'>
                                    {['240p', '360p', '480p', '720p', '1080p', '4K'].map(q => {
                                        const isChecked =
                                            !!(videoQueue.some(item => (item.info?.quality === q || item.detectedQuality === q) && item.status !== 'error')
                                                || (selectedId && currentSelectedEpisode?.videos.some(v => v.quality === q && v.server_name === formData.server)));

                                        return (<div key={q} className='col-span-1 flex items-center gap-2'><input disabled={isLoading} type="checkbox" checked={isChecked} readOnly className='appearance-none w-4 h-4 border border-black rounded bg-white checked:bg-black checked:bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E")] checked:bg-center checked:bg-no-repeat checked:bg-[length:75%]' /><label className='text-sm'>{q}</label></div>);
                                    })}
                                </div>
                                <div className='flex items-center mt-5 justify-between'><label className='font-medium'>Danh sách tập</label><span onClick={() => handleSelectEpisode(null)} className='cursor-pointer font-semibold text-black'>+ Thêm tập mới</span></div>
                                <div className='mt-2 px-1 py-1 h-full flex flex-col border border-gray-300 w-full rounded-lg overflow-y-auto bg-white max-h-[300px]'>
                                    {filteredEpisodes.length === 0 && <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Chưa có tập nào</div>}
                                    {filteredEpisodes.map((item, index) => (
                                        <div
                                            key={item.id}
                                            draggable={!isLoading}
                                            onDragStart={(e) => handleDragStart(e, index, item.id)}
                                            onDragEnter={() => handleDragEnter(index, item.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleSelectEpisode(item.id)}
                                            className={`
                                                p-2 cursor-pointer rounded-md flex justify-between items-center transition-all duration-300 ease-in-out
                                                ${selectedId === item.id ? 'bg-black/5' : 'hover:bg-gray-100'}
                                                ${draggingId === item.id ? 'opacity-50 scale-105 shadow-lg bg-gray-50 border border-dashed border-gray-400' : ''}
                                            `}
                                        >
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${draggingId === item.id ? 'text-gray-500' : 'text-gray-800'}`}>{item.name}</span>
                                                <span className='text-[10px] text-gray-400'>{item.part}</span>
                                            </div>
                                            <div className="cursor-move text-gray-300 hover:text-gray-500 p-1"><i className="fa-solid fa-grip-lines"></i></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className='text-[15px] my-5 font-semibold'>Phụ đề</div>
                        <div className='bg-gray-100 rounded-lg p-1 flex items-center space-x-2 mb-4 w-fit'><button disabled={isLoading} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${subMethod === 0 ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`} onClick={() => setSubMethod(0)}>Upload file</button><button disabled={isLoading} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${subMethod === 1 ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`} onClick={() => setSubMethod(1)}>Import URL</button></div>
                        <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="col-span-1"><select disabled={isLoading} className='px-3 py-2 border outline-0 w-full rounded-lg text-sm' value={tempSubLang} onChange={e => setTempSubLang(e.target.value)}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>[{l.flag}] {l.name}</option>)}</select></div>
                                <div className="col-span-1"><input disabled={isLoading} type="text" className='px-3 py-2 border outline-0 w-full rounded-lg text-sm' placeholder='Nhãn (VD: Vietsub...)' value={tempSubLabel} onChange={e => setTempSubLabel(e.target.value)} /></div>
                                <div className="col-span-1 lg:col-span-2 flex flex-col lg:flex-row gap-3">
                                    <div className="flex-1">{subMethod === 0 ? (<><input disabled={isLoading} ref={subtitleInputRef} type="file" className="hidden" onChange={handleSubtitleFileChange} accept=".srt,.vtt,.ass" /><div onClick={triggerSubtitleFileSelect} className={`px-3 py-2 border border-dashed border-gray-300 bg-white rounded-lg text-sm text-gray-500 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition ${isLoading ? 'cursor-not-allowed' : ''}`}><span className='truncate max-w-[250px]'>{tempSubFile ? tempSubFile.name : "Chọn file (.srt, .vtt)"}</span><i className="fa-solid fa-upload text-gray-400"></i></div></>) : (<input disabled={isLoading} type="text" className='px-3 py-2 border outline-0 w-full rounded-lg text-sm' placeholder='https://domain.com/sub.vtt' value={tempSubUrl} onChange={e => setTempSubUrl(e.target.value)} />)}</div>
                                    <button disabled={isLoading} onClick={handleAddSubtitle} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition">Thêm</button>
                                </div>
                            </div>
                        </div>
                        {formData.subtitles.length > 0 && (<div className="mt-4 space-y-2">{formData.subtitles.map((sub, index) => { const lang = LANGUAGES.find(l => l.code === sub.lang); return (<div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm"><div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-lg">{lang?.flag}</div><div className="flex flex-col"><div className='flex items-center space-x-2'><span className="text-sm font-bold">{lang?.name}</span><span className='text-xs bg-black text-white px-1.5 py-0.5 rounded'>{sub.label}</span></div><div className='flex items-center space-x-1 text-xs text-gray-400 mt-0.5'><i className={`fa-solid ${sub.type === 'upload' ? 'fa-file' : 'fa-link'}`}></i><span className="truncate max-w-[200px]">{sub.type === 'upload' && sub.fileName ? sub.fileName : (sub.value as string)}</span></div></div></div><button disabled={isLoading} onClick={() => handleRemoveSubtitle(index)} className="text-gray-400 hover:text-red-500 px-2"><i className="fa-solid fa-trash-can"></i></button></div>); })}</div>)}

                        <button onClick={handleMainSubmit} disabled={isLoading} className={`text-white w-full mt-8 rounded-lg bg-black px-4 py-3 font-medium text-sm transition ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}>{isLoading ? 'Lưu Phim & Cập nhật' : 'Tải lên & Lưu'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Upload;
