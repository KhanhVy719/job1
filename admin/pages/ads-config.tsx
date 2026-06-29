import { useEffect, useState } from "react";
import AdminCard from "@/components/AdminCard";

export default function AdsConfigPage() {
  const [config, setConfig] = useState({ enabled: "false", script: "", banner: "" });
  useEffect(() => { const raw = localStorage.getItem("admin_ads_config"); if (raw) setConfig(JSON.parse(raw)); }, []);
  const save = () => { localStorage.setItem("admin_ads_config", JSON.stringify(config)); alert("Đã lưu cấu hình Ads local"); };
  return <AdminCard title="Cấu hình Ads" subtitle="Cấu hình local cho giao diện admin; chưa publish ra client production.">
    <div className="grid gap-4"><label className="text-sm font-semibold">Bật quảng cáo<select value={config.enabled} onChange={(e)=>setConfig({...config, enabled:e.target.value})} className="mt-2 block w-full rounded-xl border p-2"><option value="false">Tắt</option><option value="true">Bật</option></select></label><label className="text-sm font-semibold">Script ads<textarea value={config.script} onChange={(e)=>setConfig({...config, script:e.target.value})} className="mt-2 min-h-32 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Banner URL<input value={config.banner} onChange={(e)=>setConfig({...config, banner:e.target.value})} className="mt-2 w-full rounded-xl border p-2" /></label><button onClick={save} className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-white">Lưu local</button></div>
  </AdminCard>;
}
