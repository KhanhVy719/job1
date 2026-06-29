import { useEffect, useState } from "react";
import AdminCard from "@/components/AdminCard";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

type Item = { _id: string; name: string; slug?: string; code?: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Item[]>([]);
  const [countries, setCountries] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosInstance.get(API_ENDPOINTS.category.get),
      axiosInstance.get(API_ENDPOINTS.country.get),
    ])
      .then(([cat, country]) => {
        setCategories(cat.data?.data || []);
        setCountries(country.data?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderList = (title: string, data: Item[]) => (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h2 className="font-semibold">{title} ({data.length})</h2>
      <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr><th className="p-3">Tên</th><th className="p-3">Slug/Code</th></tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item._id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-slate-500">{item.slug || item.code || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminCard title="Phân loại" subtitle="Danh sách thể loại và quốc gia đang được backend trả về.">
      {loading ? <p>Đang tải...</p> : <div className="grid gap-6 lg:grid-cols-2">{renderList("Thể loại", categories)}{renderList("Quốc gia", countries)}</div>}
    </AdminCard>
  );
}
