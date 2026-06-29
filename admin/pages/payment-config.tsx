import { useEffect, useState } from "react";
import AdminCard from "@/components/AdminCard";

export default function PaymentConfigPage() {
  const [config, setConfig] = useState({ provider: "manual", bank: "", account: "", note: "" });
  useEffect(() => { const raw = localStorage.getItem("admin_payment_config"); if (raw) setConfig(JSON.parse(raw)); }, []);
  const save = () => { localStorage.setItem("admin_payment_config", JSON.stringify(config)); alert("Đã lưu cấu hình thanh toán local"); };
  return <AdminCard title="Cấu hình thanh toán" subtitle="Lưu cấu hình thanh toán local để quản trị thử nghiệm."><div className="grid gap-4 md:grid-cols-2"><input value={config.provider} onChange={(e)=>setConfig({...config, provider:e.target.value})} className="rounded-xl border p-3" placeholder="Provider"/><input value={config.bank} onChange={(e)=>setConfig({...config, bank:e.target.value})} className="rounded-xl border p-3" placeholder="Ngân hàng"/><input value={config.account} onChange={(e)=>setConfig({...config, account:e.target.value})} className="rounded-xl border p-3" placeholder="Số tài khoản"/><input value={config.note} onChange={(e)=>setConfig({...config, note:e.target.value})} className="rounded-xl border p-3" placeholder="Ghi chú"/><button onClick={save} className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-white">Lưu local</button></div></AdminCard>;
}
