import { useEffect, useState } from "react";
import AdminCard from "@/components/AdminCard";
import axiosInstance from "@/utils/axios";

type User = { _id: string; fullname: string; email: string; coin?: number; vip?: number; level?: number; createdAt?: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    axiosInstance.get("/api/v1/admin/users", { params: { q, limit: 50 } })
      .then((res) => { setUsers(res.data?.data?.docs || []); setTotal(res.data?.data?.totalDocs || 0); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <AdminCard title="Người dùng" subtitle={`Tổng user: ${total}`}>
      <div className="mb-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm email/tên" className="w-full rounded-xl border border-slate-300 px-4 py-2" />
        <button onClick={load} className="rounded-xl bg-slate-900 px-4 py-2 text-white">Tìm</button>
      </div>
      {loading ? <p>Đang tải...</p> : <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600"><tr><th className="p-3">Tên</th><th className="p-3">Email</th><th className="p-3">Coin</th><th className="p-3">VIP</th><th className="p-3">Ngày tạo</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u._id} className="border-t border-slate-100"><td className="p-3 font-medium">{u.fullname}</td><td className="p-3">{u.email}</td><td className="p-3">{u.coin ?? 0}</td><td className="p-3">{u.vip ?? 0}</td><td className="p-3 text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td></tr>)}</tbody>
        </table>
        {!users.length && <p className="p-4 text-slate-500">Chưa có user.</p>}
      </div>}
    </AdminCard>
  );
}
