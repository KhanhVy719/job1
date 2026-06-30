import Image from "next/image";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";

type AccountPageKind = "favorites" | "playlists" | "history" | "profile";

type AccountPageProps = {
  kind: AccountPageKind;
};

type NavItem = {
  kind: AccountPageKind;
  href: string;
  icon: string;
  label: string;
};

const navItems: NavItem[] = [
  { kind: "favorites", href: "/yeu-thich", icon: "fa-heart", label: "Yêu thích" },
  { kind: "playlists", href: "/danh-sach", icon: "fa-list", label: "Danh sách" },
  { kind: "history", href: "/lich-su", icon: "fa-clock-rotate-left", label: "Lịch sử" },
  { kind: "profile", href: "/tai-khoan", icon: "fa-user", label: "Tài khoản" },
];

const pageMeta: Record<AccountPageKind, { title: string; description: string }> = {
  favorites: {
    title: "Phim yêu thích",
    description: "Danh sách phim bạn đã lưu vào mục yêu thích.",
  },
  playlists: {
    title: "Danh sách của tôi",
    description: "Các playlist phim đã tạo trong tài khoản.",
  },
  history: {
    title: "Lịch sử xem",
    description: "Các phim bạn đã xem gần đây.",
  },
  profile: {
    title: "Tài khoản",
    description: "Thông tin tài khoản RoPhim của bạn.",
  },
};

const formatDate = (value?: string | Date) => {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getMoviePoster = (movie: IMovie) =>
  movie.poster_url || movie.thumb_url || "/images/logo.svg";

const getMovieSubtitle = (movie: IMovie) =>
  movie.origin_name || movie.episode_current || movie.year?.toString() || "";

const AccountMovieGrid = ({ movies }: { movies: IMovie[] }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
    {movies.map((movie) => (
      <Link key={movie._id || movie.slug} href={`/phim/${movie.slug}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5">
          <Image
            src={getMoviePoster(movie)}
            alt={movie.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {movie.episode_current && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1 text-center text-[11px] text-white">
              {movie.episode_current}
            </div>
          )}
        </div>
        <div className="mt-2 min-w-0 text-center">
          <div className="truncate text-sm font-semibold text-white group-hover:text-primary">
            {movie.name}
          </div>
          {getMovieSubtitle(movie) && (
            <div className="mt-1 truncate text-xs text-gray-400">
              {getMovieSubtitle(movie)}
            </div>
          )}
        </div>
      </Link>
    ))}
  </div>
);

const AccountShell = ({
  kind,
  children,
}: {
  kind: AccountPageKind;
  children: React.ReactNode;
}) => {
  const meta = pageMeta[kind];

  return (
    <>
      <NextSeo title={meta.title} description={meta.description} noindex nofollow />
      <div className="px-5 pb-28 pt-8 lg:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3 text-2xl font-semibold text-white">
                <i className={`fa-solid ${navItems.find((item) => item.kind === kind)?.icon}`} />
                <span>{meta.title}</span>
              </div>
              <p className="mt-2 max-w-[640px] text-sm text-gray-400">{meta.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = item.kind === kind;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary text-black"
                        : "border-white/10 bg-white/5 text-white hover:border-white/25"
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} text-xs`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {children}
        </div>
      </div>
    </>
  );
};

const LoadingState = () => (
  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="h-[220px] animate-pulse rounded-lg bg-white/5" />
    ))}
  </div>
);

const LoginRequired = () => (
  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white">
      <i className="fa-solid fa-lock text-xl" />
    </div>
    <div className="text-lg font-semibold text-white">Bạn cần đăng nhập</div>
    <p className="mt-2 max-w-[420px] text-sm text-gray-400">
      Đăng nhập để xem dữ liệu tài khoản của bạn.
    </p>
    <button
      type="button"
      className="open-login mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-black"
    >
      <i className="fa-solid fa-user" />
      <span>Đăng nhập</span>
    </button>
  </div>
);

const EmptyState = ({ icon, title }: { icon: string; title: string }) => (
  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white">
      <i className={`fa-solid ${icon} text-xl`} />
    </div>
    <div className="text-lg font-semibold text-white">{title}</div>
  </div>
);

const FavoritesView = ({ user }: { user: IUser }) => {
  const movies = user.favorites || [];

  if (!movies.length) {
    return <EmptyState icon="fa-heart" title="Chưa có phim yêu thích" />;
  }

  return <AccountMovieGrid movies={movies} />;
};

const HistoryView = ({ user }: { user: IUser }) => {
  const movies = (user.history || [])
    .map((item) => item.movie)
    .filter((movie): movie is IMovie => Boolean(movie?.slug));

  if (!movies.length) {
    return <EmptyState icon="fa-clock-rotate-left" title="Chưa có lịch sử xem" />;
  }

  return <AccountMovieGrid movies={movies} />;
};

const PlaylistsView = ({ user }: { user: IUser }) => {
  const playlists = user.playlists || [];

  if (!playlists.length) {
    return <EmptyState icon="fa-list" title="Chưa có danh sách phim" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {playlists.map((playlist) => (
        <div key={playlist._id} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">{playlist.name}</div>
              <div className="mt-2 text-sm text-gray-400">
                {(playlist.movies || []).length} phim
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black">
              <i className="fa-solid fa-list text-sm" />
            </div>
          </div>
          <div className="mt-5 text-xs text-gray-500">
            Tạo ngày {formatDate(playlist.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
};

const ProfileView = ({ user }: { user: IUser }) => {
  const stats = [
    { label: "Phim yêu thích", value: (user.favorites || []).length },
    { label: "Danh sách", value: (user.playlists || []).length },
    { label: "Lịch sử xem", value: (user.history || []).length },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Image
            src={user.avatar || "/images/logo.svg"}
            alt={user.fullname}
            width={88}
            height={88}
            className="h-[88px] w-[88px] rounded-full border-2 border-white object-cover"
          />
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold text-white">{user.fullname}</div>
            <div className="mt-1 truncate text-sm text-gray-400">{user.email}</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/50 px-3 py-1 text-xs font-semibold text-primary">
              <i className="fa-solid fa-infinity" />
              <span>{user.vip ? "ROX" : "Thành viên"}</span>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/[0.04] p-4">
            <div className="text-xs text-gray-400">Số dư</div>
            <div className="mt-1 text-xl font-semibold text-primary">{user.coin || 0}B</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-4">
            <div className="text-xs text-gray-400">Ngày tham gia</div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatDate(user.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4"
          >
            <span className="text-sm text-gray-300">{item.label}</span>
            <span className="text-xl font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AccountPage = ({ kind }: AccountPageProps) => {
  const { user, loading } = useAuthContext();

  const content = useMemo(() => {
    if (loading) return <LoadingState />;
    if (!user) return <LoginRequired />;

    switch (kind) {
      case "favorites":
        return <FavoritesView user={user} />;
      case "playlists":
        return <PlaylistsView user={user} />;
      case "history":
        return <HistoryView user={user} />;
      case "profile":
        return <ProfileView user={user} />;
      default:
        return null;
    }
  }, [kind, loading, user]);

  return <AccountShell kind={kind}>{content}</AccountShell>;
};

export default AccountPage;
