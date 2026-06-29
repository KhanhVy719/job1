import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="min-h-[calc(100vh-4.3rem)] bg-slate-50 px-6 py-8 text-slate-900">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
          Đang hoàn thiện
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          {description || "Trang này đã được khai báo route để không còn 404, nhưng chức năng chi tiết chưa được triển khai trong admin hiện tại."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Về bảng điều khiển
          </Link>
          <Link href="/movies" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Quản lý phim
          </Link>
        </div>
      </section>
    </main>
  );
}
