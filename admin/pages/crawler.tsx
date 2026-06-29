import { useEffect, useState } from "react";
import AdminCard from "@/components/AdminCard";
import axiosInstance from "@/utils/axios";

export default function CrawlerPage() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { axiosInstance.get("/api/v1/admin/stats").then((r) => setStats(r.data?.data)); }, []);
  const items = stats ? Object.entries(stats) : [];
  return <AdminCard title="Film Crawler" subtitle="Theo dõi dữ liệu crawler TMDB/VidSrc hiện có. Start/stop crawler vẫn chạy qua service server.">
    <div className="grid gap-4 md:grid-cols-4">{items.map(([k,v]) => <div key={k} className="rounded-2xl border border-slate-200 p-4"><div className="text-sm text-slate-500">{k}</div><div className="mt-2 text-3xl font-bold">{String(v)}</div></div>)}</div>
    <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Crawler hiện được chạy trong backend server. Nếu cần nút start/stop thật, cần tách crawler thành job service có API điều khiển an toàn.</div>
  </AdminCard>;
}
