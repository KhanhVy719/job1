type AdminCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AdminCard({ title, subtitle, children }: AdminCardProps) {
  return (
    <main className="min-h-[calc(100vh-4.3rem)] bg-slate-50 px-6 py-8 text-slate-900">
      <section className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </section>
    </main>
  );
}
