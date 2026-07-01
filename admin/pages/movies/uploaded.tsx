import { useEffect, useMemo, useState } from "react";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

type Movie = { _id: string; name: string; origin_name?: string; slug: string; year?: number; type?: string; status?: string; uploadedEpisodes: number };
type Video = { server_name?: string; name?: string; url: string; type?: string; format?: string; quality?: string; is_default?: boolean };
type UploadedEpisode = { _id: string; name: string; slug: string; episode: number; embed_url?: string; videos: Video[]; season_id?: { name?: string; slug?: string; season_number?: number } };
type PreviewState = { url: string; title: string; direct?: boolean } | null;
type UploadJob = {
  _id: string;
  job_id: string;
  status: "queued" | "running" | "success" | "error" | "canceled";
  phase?: string;
  progress: number;
  message?: string;
  original_name?: string;
  movie_name?: string;
  episode_name?: string;
  quality?: string;
  playlist_url?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

const isActiveUploadJob = (job: UploadJob) => job.status === "queued" || job.status === "running";

export default function UploadedMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [episodes, setEpisodes] = useState<UploadedEpisode[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>("");
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const playableUrl = (url: string) => {
    if (url.includes("/api/v1/hls-proxy/playlist")) return url;
    const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:8000";
    return `${apiBase}/api/v1/hls-proxy/playlist?url=${encodeURIComponent(url)}`;
  };

  const originalPlaylistUrl = (url: string) => {
    if (url.includes("/api/v1/direct-play/playlist")) return url;
    if (!url.includes("/api/v1/hls-proxy/playlist")) return url;
    try { return new URL(url).searchParams.get("url") || url; } catch { return url; }
  };

  const createDirectSession = async (url: string, title: string, inline = true) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/api/v1/direct-play/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playlist_url: originalPlaylistUrl(url), title }),
      });
      const json = await res.json();
      const data = json?.data;
      if (!data?.playlist_url) throw new Error(json?.message || "Không tạo được direct session");
      if (inline) setPreview({ url: data.playlist_url, title, direct: true });
      else window.open(data.player_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Direct preview failed", error);
      alert("Không mở được preview direct. Mở console để xem lỗi chi tiết.");
    }
  };

  const playerUrl = (url: string, title: string, mode: "proxy" | "direct" | "jw-direct" = "proxy") => {
    const base = process.env.NEXT_PUBLIC_CDN || "http://localhost:5000";
    const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:8000";
    const src = mode === "proxy"
      ? playableUrl(url)
      : mode === "jw-direct"
        ? `${apiBase}/api/v1/hls-proxy/jw-direct-playlist?cdn=${encodeURIComponent(base)}&url=${encodeURIComponent(originalPlaylistUrl(url))}`
        : originalPlaylistUrl(url);
    const modeParam = mode === "direct" ? "direct=1&" : mode === "jw-direct" ? "jw-direct=1&" : "";
    return `${base}/video.html?${modeParam}v=direct-preview-4&title=${encodeURIComponent(title)}&src=${encodeURIComponent(src)}`;
  };

  const load = () => {
    setLoading(true);
    axiosInstance.get("/api/v1/admin/movies/uploaded", { params: { q, limit: 50 } })
      .then((res) => { setMovies(res.data?.data?.docs || []); setTotal(res.data?.data?.totalDocs || 0); })
      .finally(() => setLoading(false));
  };

  const loadEpisodes = (movie: Movie) => {
    setSelectedMovie(movie);
    setPreview(null);
    setEpisodeLoading(true);
    axiosInstance.get(`/api/v1/admin/movies/${movie._id}/uploaded-episodes`)
      .then((res) => {
        const list = res.data?.data || [];
        setEpisodes(list);
        setActiveEpisodeId(list[0]?._id || "");
      })
      .finally(() => setEpisodeLoading(false));
  };

  const clearEpisodeVideos = async (episode: UploadedEpisode) => {
    if (!confirm(`Xóa toàn bộ source tự host của tập "${episode.name}"? Tập sẽ fallback về embed_url nếu có.`)) return;
    await axiosInstance.delete(`/api/v1/admin/episodes/${episode._id}/videos`);
    if (selectedMovie) await loadEpisodes(selectedMovie);
    load();
  };

  const loadJobs = () => {
    axiosInstance.get(API_ENDPOINTS.uploadJobs, { params: { limit: 50 } })
      .then((res) => {
        const nextJobs: UploadJob[] = (res.data?.data || []).filter(
          (job: UploadJob) => job.status !== "canceled"
        );
        setJobs((prevJobs) => {
          const previouslyActive = new Set(
            prevJobs.filter(isActiveUploadJob).map((job) => job.job_id)
          );
          const justFinished = nextJobs.some(
            (job) => previouslyActive.has(job.job_id) && !isActiveUploadJob(job)
          );
          if (justFinished) window.setTimeout(load, 0);
          return nextJobs;
        });
      })
      .catch((error) => console.error("Load upload jobs failed", error));
  };

  const cancelJob = async (job: UploadJob) => {
    if (!confirm(`Hủy job upload "${job.original_name || job.job_id}"?`)) return;
    setJobs((prevJobs) => prevJobs.filter((item) => item.job_id !== job.job_id));
    try {
      await axiosInstance.post(API_ENDPOINTS.cancelUploadJob(job.job_id));
      loadJobs();
    } catch (error) {
      console.error("Cancel upload job failed", error);
      loadJobs();
    }
  };

  const jobStatusLabel = (status: UploadJob["status"]) => {
    if (status === "queued") return "Đang chờ";
    if (status === "running") return "Đang upload";
    if (status === "success") return "Hoàn thành";
    if (status === "canceled") return "Đã hủy";
    return "Lỗi";
  };

  useEffect(load, []);
  useEffect(() => {
    loadJobs();
    const timer = window.setInterval(loadJobs, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const activeEpisode = useMemo(() => episodes.find((ep) => ep._id === activeEpisodeId) || episodes[0], [episodes, activeEpisodeId]);
  const titleFor = (ep: UploadedEpisode, index = 0) => `${selectedMovie?.name || "Preview"} - ${ep.name} / Source ${index + 1}`;

  return (
    <div className="px-3 py-5 lg:px-5 xl:px-8">
      <div className="text-xl font-semibold">Phim đã upload</div>
      <div className="mt-1 text-base text-gray-400">Danh sách phim có source TikTok/HLS tự host trên hệ thống</div>

      <div className="mt-5 grid w-full max-w-full grid-cols-2 items-center gap-3 md:grid-cols-3 lg:flex">
        <div className="relative col-span-2 w-full md:col-span-1">
          <input id="uploadedSearch" type="text" placeholder="Tìm kiếm" className="peer h-12 w-full rounded-md border border-gray-300 px-2 pb-1 pt-4 text-sm text-black placeholder-transparent ring-1 ring-transparent hover:border-black hover:ring-black focus:border-black focus:outline-none focus:ring-black" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <label htmlFor="uploadedSearch" className="absolute left-2 top-1.5 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-black">Tìm kiếm</label>
        </div>
        <button type="button" onClick={load} className="flex h-12 w-full items-center justify-center space-x-2 rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800 md:w-auto">
          <i className="fa-solid fa-filter" />
          <span>Lọc</span>
        </button>
        <div className="text-sm text-gray-500">Tổng: <span className="font-semibold text-black">{total}</span> phim</div>
      </div>

      {jobs.length > 0 && <div className="mt-5 rounded-md border bg-white">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <div>
            <div className="font-semibold">Hàng đợi upload</div>
            <div className="text-xs text-gray-500">Tiến độ tự cập nhật mỗi 2 giây, có thể reload trang.</div>
          </div>
          <button onClick={loadJobs} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-white">Tải lại</button>
        </div>
        <div className="divide-y">
          {jobs.map((job) => {
            const active = isActiveUploadJob(job);
            const progress = Math.max(0, Math.min(100, Math.round(job.progress || 0)));
            return (
              <div key={job.job_id} className="px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{job.original_name || job.job_id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${job.status === "success" ? "bg-green-100 text-green-700" : job.status === "error" ? "bg-red-100 text-red-700" : job.status === "canceled" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>{jobStatusLabel(job.status)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{job.movie_name || "Chưa rõ phim"}{job.episode_name ? ` - ${job.episode_name}` : ""}</div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full transition-all ${job.status === "error" ? "bg-red-500" : job.status === "success" ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${job.status === "queued" ? 0 : progress}%` }} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{job.status === "queued" ? "Chờ đến lượt" : `${progress}%`}</span>
                      <span>{job.message || job.error || "-"}</span>
                    </div>
                  </div>
                  {active && <button onClick={() => cancelJob(job)} className="h-9 rounded-md bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100">Hủy hàng đợi</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>}

      <div className="overflow-x-auto">
        <table className="mt-5 w-full table-auto text-nowrap rounded-md border-0 bg-white text-left text-sm">
          <thead className="border-b bg-gray-50 font-bold">
            <tr>
              <th className="border px-3 py-2 font-semibold">Tên phim</th>
              <th className="border px-3 py-2 font-semibold">Slug</th>
              <th className="border px-3 py-2 text-center font-semibold">Năm</th>
              <th className="border px-3 py-2 text-center font-semibold">Loại</th>
              <th className="border px-3 py-2 text-center font-semibold">Tập upload</th>
              <th className="border px-3 py-2 text-center font-semibold">Tùy chọn</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-5 text-center">Đang tải dữ liệu...</td></tr> : movies.length === 0 ? <tr><td colSpan={6} className="py-5 text-center">Không tìm thấy phim đã upload.</td></tr> : movies.map((movie) => (
              <tr key={movie._id} className={`transition-colors hover:bg-gray-50 ${selectedMovie?._id === movie._id ? "bg-blue-50" : ""}`}>
                <td className="border px-3 py-2"><div className="flex flex-col"><span className="font-semibold">{movie.name}</span><span className="text-xs text-gray-500">{movie.origin_name}</span></div></td>
                <td className="border px-3 py-2">{movie.slug}</td>
                <td className="border px-3 py-2 text-center">{movie.year || "-"}</td>
                <td className="border px-3 py-2 text-center"><span className="rounded bg-gray-200 px-2 py-1 text-xs font-bold">{movie.type || "movie"}</span></td>
                <td className="border px-3 py-2 text-center"><span className="rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-medium text-green-700">{movie.uploadedEpisodes}</span></td>
                <td className="border px-3 py-2 text-center"><button onClick={() => loadEpisodes(movie)} className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800">Hiển thị danh mục</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMovie && <div className="mt-5 rounded-md border bg-white p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div><div className="text-lg font-semibold">Danh mục source: {selectedMovie.name}</div><div className="text-sm text-gray-400">Chọn tập bên dưới để xem source direct/proxy và embed fallback</div></div>
          <button onClick={() => { setSelectedMovie(null); setEpisodes([]); setPreview(null); }} className="h-9 rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50">Đóng</button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-md border bg-gray-50 p-2">
            <div className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">Danh sách tập</div>
            {episodeLoading ? <div className="p-3 text-sm text-gray-500">Đang tải tập...</div> : episodes.map((ep) => <button key={ep._id} onClick={() => setActiveEpisodeId(ep._id)} className={`mb-2 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-white ${activeEpisode?._id === ep._id ? "border-black bg-white" : "border-gray-200 bg-gray-50"}`}><div className="font-semibold">Tập {ep.episode}: {ep.name}</div><div className="text-xs text-gray-500">{ep.videos.length} source</div></button>)}
            {!episodeLoading && !episodes.length && <div className="p-3 text-sm text-gray-500">Không còn tập có source.</div>}
          </div>

          {activeEpisode && <div className="rounded-md border">
            <div className="flex flex-col justify-between gap-3 border-b bg-gray-50 px-4 py-3 md:flex-row md:items-center">
              <div><div className="font-semibold">Tập {activeEpisode.episode}: {activeEpisode.name}</div><div className="text-xs text-gray-500">Season: {activeEpisode.season_id?.name || activeEpisode.season_id?.slug || "-"}</div></div>
              <button onClick={() => clearEpisodeVideos(activeEpisode)} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Xóa source tập này</button>
            </div>

            <div className="divide-y">
              {activeEpisode.videos.map((v, idx) => <details key={`${activeEpisode._id}-${idx}`} className="group" open={idx === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div><span className="font-semibold">{v.server_name || v.name || `Source ${idx + 1}`}</span>{v.is_default && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">default</span>}<div className="text-xs text-gray-500">{v.format || "m3u8"} · {v.type || "phude"} · {v.quality || "auto"}</div></div>
                  <span className="text-xs text-gray-500 group-open:hidden">Mở danh mục</span><span className="hidden text-xs text-gray-500 group-open:inline">Thu gọn</span>
                </summary>
                <div className="border-t bg-white px-4 py-3">
                  <div className="break-all rounded-md bg-gray-100 p-3 font-mono text-xs text-gray-700">{v.url}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setPreview({ url: v.url, title: titleFor(activeEpisode, idx), direct: true })} className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">Preview JWPlayer direct</button>
                    <button onClick={() => createDirectSession(v.url, titleFor(activeEpisode, idx), false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Mở direct secure</button>
                    <button onClick={() => setPreview({ url: v.url, title: titleFor(activeEpisode, idx) })} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Preview proxy</button>
                    <a href={playerUrl(v.url, titleFor(activeEpisode, idx))} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Mở proxy</a>
                    <a href={originalPlaylistUrl(v.url)} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Mở m3u8 gốc</a>
                    {activeEpisode.embed_url && <a href={activeEpisode.embed_url} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">VidSrc embed</a>}
                  </div>
                </div>
              </details>)}
            </div>
          </div>}
        </div>
      </div>}

      {preview && <div className="mt-5 overflow-hidden rounded-md border bg-black">
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white"><div className="truncate text-sm font-semibold">{preview.direct ? "JWPlayer direct" : "JWPlayer proxy"}: {preview.title}</div><button onClick={() => setPreview(null)} className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Đóng</button></div>
        <div className="aspect-video w-full"><iframe key={`${preview.url}-${preview.direct ? "direct" : "proxy"}`} src={playerUrl(preview.url, preview.title, preview.direct ? "jw-direct" : "proxy")} className="h-full w-full" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
      </div>}
    </div>
  );
}
