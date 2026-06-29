import AdminCard from "@/components/AdminCard";
const urls=["/","/movies","/movies/upload","/movies/uploaded","/categories","/users","/crawler"];
export default function SitemapPage(){return <AdminCard title="SiteMap" subtitle="Danh sách route admin quan trọng."><ul className="grid gap-2">{urls.map(u=><li key={u} className="rounded-xl border p-3 font-mono text-sm">{u}</li>)}</ul></AdminCard>}
