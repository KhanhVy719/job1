import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Image from 'next/image';
// Giả sử icon, ICategory, ICountry, IStudio, IActor, IMovie, ISeason, IEpisode là các type đã được định nghĩa
import icon from "@/types/icon"
import clsx from "clsx";
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import CommentItems from "@/sections/film/Comment";
import RatedItems from "@/sections/film/Rated";
import ActorList from "@/components/Actor/FilmList";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import styles from './styles.module.css';
import LoadingOverlay from "@/components/loading/loader";
import { GetServerSideProps, NextPage } from 'next';

// --- SEO IMPORTS ---
import { NextSeo, VideoJsonLd } from 'next-seo';
import Head from 'next/head';

// Đã loại bỏ ProposalGird2 không dùng đến
const ProposalGird = dynamic(() => import("@/components/Movie/ProposalGird"), {
  ssr: false,
});


interface ITrailer {
  id: number;
  title: string;
  thumbnail: string;
  url: string;
}

interface PhimPageProps {
  initialMovie: IMovie;
  initialSessions: ISeason[];
  initialEpisodes: IEpisode[];
  initialProposals: IMovie[];
}

// Định nghĩa cho các loại bản chiếu đơn lẻ (ví dụ: phim lẻ)
interface ITheatricalItem extends IEpisode {
  type?: string; // Loại ngôn ngữ/bản (phude, thuyetminh, etc.)
  slug: string; // Slug đầy đủ để dẫn đến trang xem phim
}

type NextPageWithCustomProps = NextPage<PhimPageProps>;

const tabs = [
  { id: 'episodes', label: 'Tập phim' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'cast', label: 'Diễn viên' },
  { id: 'recommend', label: 'Đề xuất' },
];

const BottomItems = [
  { id: "comment", label: "Bình luận" },
  { id: "rate", label: "Đánh giá" },
];

const LANGUAGE_MAPPING: Record<string, { id: string; label: string; backendType: string }> = {
  'phude': { id: 'phude', label: 'Phụ đề', backendType: 'phude' },
  'thuyetminh': { id: 'thuyetminh', label: 'Thuyết minh', backendType: 'thuyetminh' },
  'longtieng': { id: 'longtieng', label: 'Lồng tiếng', backendType: 'longtieng' },
  'raw': { id: 'raw', label: 'RAW', backendType: 'raw' },
};


const Phim: NextPageWithCustomProps = ({ initialMovie, initialSessions, initialEpisodes, initialProposals }) => {

  const router = useRouter();
  // Ensure slug is a string for correct usage
  const slug = router.query.slug as string;

  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const movieUrl = `${SITE_URL}/phim/${initialMovie?.slug}`;

  const seoTitle = initialMovie
    ? `${initialMovie.name} (${initialMovie.year}) ${initialMovie.quality || 'HD'} Vietsub - Xem Phim ${initialMovie.origin_name || ''}`
    : "Đang tải phim...";

  const seoDescription = initialMovie?.content
    ? initialMovie.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + "..."
    : `Xem phim ${initialMovie?.name} full HD, vietsub, thuyết minh tại RoPhim.`;

  const actorsList = initialMovie?.actor?.map(a => a.name) || [];
  const directorsList = initialMovie?.director?.map(d => d.name) || [];
  const tagsList = initialMovie?.category?.map(c => c.name) || [];

  const [activeTab, setActiveTab] = useState<string>('episodes');
  const [isMore, setIsMore] = useState(false);
  const [isPart, setIsPart] = useState(false);
  // Đảm bảo currentSeason có giá trị mặc định hợp lệ
  const [currentSeason, setCurrentSeason] = useState<string>(initialSessions[0]?._id || '');
  const [Sessions, setSessions] = useState<ISeason[]>(initialSessions);

  // REMOVED: allEpisodes state was unused because displayEpisodes handles the logic

  // State
  const [movie, setMovie] = useState<IMovie | null>(initialMovie);
  // Thay thế `any[]` bằng interface cụ thể
  const [theatricals, setTheatricals] = useState<ITheatricalItem[]>([]);
  const [proposals, setProposals] = useState<IMovie[]>(initialProposals);

  const [actors, setActors] = useState<IActor[]>(initialMovie?.actor || []);
  const [galleryImages, setGalleryImages] = useState<string[]>(initialMovie?.backdrops || []);
  const [videos, setVideos] = useState<ITrailer[]>(
    initialMovie?.trailer_url?.map((url: string, idx: number) => ({
      id: idx + 1,
      title: 'Trailer',
      thumbnail: initialMovie.thumb_url,
      url: url
    })) || []
  );

  const [CMT, setCMT] = useState("comment");
  const [text, setText] = useState("");
  const MAX_COMMENT = 1000;

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isReveal, setIsReveal] = useState(false);

  const [showTrailer, setShowTrailer] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState("");
  // Đảm bảo currentType có giá trị mặc định, sử dụng hàm useMemo để xác định loại mặc định
  const [currentType, setCurrentType] = useState<string>(
    initialEpisodes[0]?.types?.[0] || initialSessions[0]?.episodes?.[0]?.types?.[0] || LANGUAGE_MAPPING['phude'].backendType
  );

  const handleToggleCollapse = useCallback(() => setIsCollapsed(prev => !prev), []);
  const handleToggleReveal = useCallback(() => setIsReveal(prev => !prev), []);
  const galleryRef = useRef<HTMLDivElement>(null);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0&showinfo=0`;
    }
    return url;
  };


  // Danh sách các loại ngôn ngữ/bản có sẵn cho mùa hiện tại
  const availableTypes = useMemo(() => {
    // 1. Lấy mùa hiện tại
    const currentSeasonData = Sessions.find((p) => p._id === currentSeason);
    if (!currentSeasonData || !currentSeasonData.episodes || currentSeasonData.episodes.length === 0) {
      // Nếu không có dữ liệu mùa, trả về mặc định là Phụ đề
      return [LANGUAGE_MAPPING['phude']];
    }

    // 2. Thu thập TẤT CẢ các loại (type) có trong TẤT CẢ các tập phim (IEpisode.types là MẢNG)
    const allUniqueTypes = new Set<string>();
    currentSeasonData.episodes.forEach((ep: IEpisode) => {
      ep.types?.forEach(type => {
        allUniqueTypes.add(type);
      });
    });

    // 3. Map các type duy nhất này sang cấu trúc LANGUAGE_MAPPING
    const result = Array.from(allUniqueTypes)
      .map(type => LANGUAGE_MAPPING[type])
      .filter(Boolean);

    // 4. Đảm bảo luôn có ít nhất một loại, nếu không có thì mặc định là Phụ đề
    if (result.length === 0) {
      return [LANGUAGE_MAPPING['phude']];
    }
    return result;
  }, [Sessions, currentSeason]);

  // Các tập phim hiển thị cho mùa và loại (type) đã chọn
  const displayEpisodes = useMemo(() => {
    const currentSeasonData = Sessions.find((p) => p._id === currentSeason);
    if (!currentSeasonData || !currentSeasonData.episodes) return [];

    // Lọc các tập phim mà mảng 'types' của chúng chứa 'currentType' đã chọn
    const filteredEpisodes = currentSeasonData.episodes.filter((ep: IEpisode) =>
      ep.types?.includes(currentType)
    );

    // Sắp xếp theo số tập
    return filteredEpisodes.sort((a, b) => a.episode - b.episode);
  }, [Sessions, currentSeason, currentType]);

  // Điều chỉnh currentType nếu nó không còn hợp lệ trong danh sách mới
  useEffect(() => {
    // Kiểm tra xem currentType hiện tại có hợp lệ trong danh sách mới không
    const isValid = availableTypes.some(t => t.backendType === currentType);

    // Nếu không hợp lệ và có loại nào đó khả dụng, đặt lại về loại đầu tiên
    if (!isValid && availableTypes.length > 0) {
      setCurrentType(availableTypes[0].backendType);
    }
  }, [availableTypes, currentType]);


  // Logic khởi tạo lại state khi props thay đổi (chuyển trang phim khác)
  useEffect(() => {
    if (initialMovie) {
      const isNewMovie = initialMovie._id !== movie?._id;

      if (isNewMovie) {
        setMovie(initialMovie);
        setProposals(initialProposals);
        setActors(initialMovie.actor || []);
        setGalleryImages(initialMovie.backdrops || []);
        setVideos(initialMovie.trailer_url?.map((url: string, idx: number) => ({
          id: idx + 1,
          title: 'Trailer',
          thumbnail: initialMovie.thumb_url,
          url: url
        })) || []);
        setSessions(initialSessions);
        setCurrentSeason(initialSessions[0]?._id || '');
      }

      // Xác định nếu là phim lẻ/phim có 1 tập
      const isSingleMovie = initialMovie.episode_total === '1' ||
        initialMovie.type === 'movie' ||
        initialMovie.category.some(c => c.slug === 'phim-le');

      // Xác định nếu các tập phim KHÔNG có track audio/subtitle riêng (cần xử lý như Theatricals)
      const hasNoSeparateTracks = initialEpisodes.length > 0 && initialEpisodes.every(ep =>
        (!ep.audios || ep.audios.length === 0) &&
        (!ep.subtitles || ep.subtitles.length === 0)
      );

      if (isSingleMovie && hasNoSeparateTracks) {
        const mappedTheatricals: ITheatricalItem[] = [];
        const seenTypes = new Set();

        const check = Sessions.find((p) => p._id === currentSeason) || initialSessions[0]; // Sử dụng mùa hiện tại hoặc mùa đầu tiên

        check?.episodes.forEach((ep: IEpisode) => {
          ep.videos.forEach((ex) => {
            if (!seenTypes.has(ex.type)) {
              seenTypes.add(ex.type);
              // Đảm bảo slug đầy đủ và type được map đúng
              mappedTheatricals.push({
                ...ep,
                slug: `/${check?.slug}/${ep.slug}`,
                type: ex.type
              });
            }
          });
        });

        setTheatricals(mappedTheatricals);
      } else {
        setTheatricals([]);
      }
    }
  }, [initialMovie, initialEpisodes, initialProposals, initialSessions, movie?._id, currentSeason, Sessions]);


  // Khởi tạo ViewerJS cho Gallery
  useEffect(() => {
    let viewerInstance: Viewer | null = null;
    if (activeTab === 'gallery' && galleryRef.current && galleryImages.length > 0) {
      // Chỉ khởi tạo Viewer nếu có ảnh
      viewerInstance = new Viewer(galleryRef.current, {
        button: true, navbar: true, title: false, toolbar: true, tooltip: true,
        movable: true, zoomable: true, rotatable: true, scalable: true, transition: true, fullscreen: true, keyboard: true,
      });
    }
    return () => {
      if (viewerInstance) viewerInstance.destroy();
    };
  }, [activeTab, galleryImages]);

  // Helper function để lấy thông tin hiển thị cho bản chiếu
  const getTheatricalInfo = (type: string) => {
    switch (type) {
      case 'phude': return { icon: '/images/icons/pd.svg', label: 'Phụ đề', color: 'bg-[#5e6070]' };
      case 'thuyetminh': return { icon: '/images/icons/tm.svg', label: 'Thuyết minh', color: 'bg-[#297447]' };
      case 'longtieng': return { icon: '/images/icons/lt.svg', label: 'Lồng tiếng', color: 'bg-[#1d2e79]' };
      default: return { icon: '/images/icons/pd.svg', label: 'Bản Full', color: 'bg-[#b63535]' };
    }
  }

  // Logic tính toán hiển thị tên tập phim liền mạch
  const calculateDisplayEpisode = (currentEp: IEpisode, nextEp: IEpisode | undefined) => {
    if (movie && movie.episode_current === "Full" && movie.episode_total === "1") {
      return "FULL";
    }
    const currentNumber = currentEp.episode;
    // Nếu không có tập tiếp theo hoặc tập tiếp theo là số liền kề (currentNumber + 1)
    if (!nextEp || nextEp.episode === currentNumber + 1) {
      return `Tập ${currentNumber}`;
    }
    // Nếu có khoảng trống giữa các tập (ví dụ: tập 1 sau đó là tập 5)
    const missingCount = nextEp.episode - currentNumber - 1;
    if (missingCount > 0) {
      const endNumber = nextEp.episode - 1;
      return `Tập ${currentNumber}-${endNumber}`;
    }
    // Trường hợp mặc định (chỉ nên xảy ra nếu logic số tập không chuẩn)
    return `Tập ${currentNumber}`;
  };


  // Tính toán URL của tập đầu tiên để nhấn nút "Xem ngay"
  const firstEpisodeUrl = useMemo(() => {
    if (theatricals.length > 0) {
      // Dành cho phim lẻ/bản chiếu (Theatricals)
      return `/phim/${slug}${theatricals[0].slug}`;
    }

    if (Sessions.length > 0) {
      // Dành cho phim bộ/nhiều tập
      const firstSeason = Sessions.find((p) => p._id === currentSeason) || Sessions[0]; // Ưu tiên mùa hiện tại
      const episodesInCurrentType = displayEpisodes; // Đã được lọc và sắp xếp

      if (episodesInCurrentType && episodesInCurrentType.length > 0) {
        const firstEp = episodesInCurrentType[0];

        // Lấy slug của mùa/season hiện tại
        const seasonSlug = firstSeason?.slug;

        let url = `/phim/${slug}/${seasonSlug}/${firstEp.slug}`;

        // Thêm type vào query params
        if (currentType) {
          url += `?type=${currentType}`;
        }

        return url;
      }
    }

    return "";
  }, [Sessions, theatricals, slug, currentType, displayEpisodes, currentSeason]);

  if (!movie) return <LoadingOverlay />;

  const BGthumnaib = movie.thumb_url;

  return (
    <>
      <NextSeo
        title={seoTitle}
        description={seoDescription}
        canonical={movieUrl}
        openGraph={{
          type: 'video.movie',
          url: movieUrl,
          title: seoTitle,
          description: seoDescription,
          images: [
            { url: movie.thumb_url, width: 1200, height: 630, alt: `${movie.name} Backdrop` },
            { url: movie.poster_url, width: 800, height: 1200, alt: `${movie.name} Poster` },
          ],
          site_name: 'TungMMO Cinema',
          video: {
            actors: actorsList.map(name => ({ profile: '', role: name })),
            directors: directorsList,
            duration: parseInt(movie.time || '0') * 60,
            releaseDate: movie.year?.toString() || new Date().toISOString(),
            tags: tagsList,
          },
        }}
        twitter={{
          handle: '@tungmmo',
          site: '@tungmmo',
          cardType: 'summary_large_image',
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: `${movie.name}, ${movie.origin_name}, phim ${movie.name}, xem phim ${movie.name}, phim ${movie.year}, ${tagsList.join(', ')}`
          },
          {
            property: 'og:updated_time',
            content: (movie.updatedAt instanceof Date ? movie.updatedAt.toISOString() : movie.updatedAt) || new Date().toISOString()
          }
        ]}
      />

      <VideoJsonLd
        name={movie.name}

        thumbnailUrls={[
          movie.thumb_url,
          movie.poster_url
        ].filter(Boolean)}

        dateCreated={movie.createdAt || new Date().toISOString()}
        uploadDate={movie.updatedAt || movie.createdAt || new Date().toISOString()}

        director={directorsList.map(name => ({ name }))}
        actor={actorsList.map(name => ({ name }))}
        description={seoDescription}
        url={movieUrl}
        datePublished={movie.year?.toString() || new Date().toISOString()}

        review={{
          author: {
            '@type': 'Person',
            name: 'TUNGMMO'
          },
          datePublished: new Date().toISOString(),
          reviewBody: `Phim ${movie.name} cực hay, chất lượng HD`,
          name: `${movie.name} Review`,
          reviewRating: { bestRating: "10", worstRating: "1", ratingValue: (movie.tmdb?.vote_average || 8).toString() }
        }}

        aggregateRating={{
          ratingValue: (movie.tmdb?.vote_average || 8).toString(),
          bestRating: "10",
          worstRating: "1",
          ratingCount: (movie.tmdb?.vote_count || 100).toString(),
        }}

        embedUrl={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")}/video.html`}
      />

      {movie.type === 'tv' && (
        <Head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TVSeries",
                "name": movie.name,
                "image": movie.thumb_url,
                "description": seoDescription,
                "startDate": movie.year,
                "numberOfSeasons": movie.tmdb?.total_seasons || 1,
                "actor": actorsList.map(name => ({ "@type": "Person", "name": name })),
                "director": directorsList.map(name => ({ "@type": "Person", "name": name })),
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": movie.tmdb?.vote_average || 8,
                  "ratingCount": movie.tmdb?.vote_count || 100,
                  "bestRating": 10,
                  "worstRating": 1
                }
              })
            }}
          />
        </Head>
      )}

      {/* Background Section (Styles.a/b/c/d) */}
      <div className={styles.a}>
        <div className={styles.b} style={BGthumnaib ? { backgroundImage: `url(${BGthumnaib})` } : {}}></div>
        <div className={styles.c}>
          <div className={styles.d} style={BGthumnaib ? { backgroundImage: `url(${BGthumnaib})` } : {}}></div>
        </div>
      </div>

      {/* Main Content (Styles.e/f/i) */}
      <div className={styles.e}>
        <div className={styles.f}>
          {/* Movie Details (Left Column) */}
          <div className={styles.i}>
            <div className={styles.m}>
              <div className={styles.l}>
                <div className={styles.n}>
                  <Image src={movie.poster_url} alt={movie.name} fill className={styles.x} sizes="150px" />
                </div>
              </div>

              <h1 className={styles.o}>{movie.name}</h1>
              <h2 className={styles.q}>{movie.origin_name} ({movie.year})</h2>

              {/* More Info Section */}
              <div className={clsx(styles.k, isMore ? styles.is_block : styles.is_hidden)}>
                <div className={styles.j}>
                  <span className={styles.s}>IMDb <span className={styles.y}>{movie.tmdb?.vote_average || 'N/A'}</span></span>
                  <span className={styles.u}>{movie.content_rating}</span>
                  <span className={styles.r}>{movie.year}</span>
                  <span className={styles.r}>{movie.episode_current}</span>
                  <span className={styles.r}>{movie.episode_total}</span>
                </div>

                <div className={styles.t}>
                  {movie.category.map((cat: ICategory) => (
                    <Link scroll={false} key={cat._id} href={`/the-loai/${cat.slug}`} className={styles.w}>
                      {cat.name}
                    </Link>
                  ))}
                </div>

                {/* Progress Bar (Styles.v/z/g) */}
                <div className={styles.v}>
                  <div className={styles.z}>
                    <div className={styles.g}></div>
                    <span className='font-light'>Đã chiếu: {movie.episode_current} / {movie.episode_total}</span>
                  </div>
                </div>

                {/* Detailed Info (Giới thiệu, Thời lượng, Quốc gia, etc.) */}
                <div className={styles.as}>
                  <div className={styles.ad}>
                    <div className={styles.ag}>Giới thiệu</div>
                    <p className={styles.ah}>{movie.content}</p>
                  </div>
                  <div className={styles.af}>
                    <div className='flex items-center space-x-3'>
                      <span className='font-medium'>Thời lượng:</span>
                      <p className='text-gray-400'>{movie.time}</p>
                    </div>
                    <div className='flex items-center space-x-3'>
                      <span className='font-medium whitespace-nowrap'>Quốc gia:</span>
                      <div className='flex items-center space-x-2'>
                        {movie.country.map((c: ICountry) => (
                          <Link scroll={false} key={c._id} href={`/quoc-gia/${c.slug}`} className='text-gray-300 hover:text-primary'>{c.name}</Link>
                        ))}
                      </div>
                    </div>
                    <div className='flex items-start gap-3'>
                      <div className='font-medium whitespace-nowrap'>Sản xuất:</div>
                      <div className='flex flex-wrap text-start gap-2'>
                        {movie.studio?.map((studio: IStudio) => (
                          <Link scroll={false} key={studio._id} href={`/nha-san-xuat/${studio.slug}`} className='text-gray-300 hover:text-primary'>
                            {studio.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className='flex items-start gap-3'>
                      <div className='font-medium whitespace-nowrap'>Đạo diễn:</div>
                      <div className='space-x-2'>
                        {movie.director.map((d: IActor) => (
                          // Sửa Link href để nó dẫn đến trang đạo diễn nếu có
                          <Link scroll={false} key={d._id} href='#' className='text-gray-300 hover:text-primary'>{d.name}</Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actors/Cast */}
                <div className={styles.aj}>
                  <div className={styles.ak}>Diễn viên</div>
                  <div className={styles.al}>
                    {actors.map((Actor, index) => (
                      <div key={index} className={styles.aq}>
                        {/* Sửa Link href để nó dẫn đến trang diễn viên nếu có */}
                        <Link scroll={false} href="/" className={clsx(styles.aw, "group")}>
                          <div className={styles.ae}>
                            <Image width={80} height={80} src={Actor.avatar} alt={Actor.name} loading="lazy" className={styles.au} />
                          </div>
                          <div className={styles.ar}>
                            <h3 className={styles.at}>{Actor.name}</h3>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggle More Info Button */}
              <div className={styles.ay}>
                <button onClick={() => setIsMore(!isMore)} className={styles.ai}>
                  <span className='text-sm'>{isMore ? 'Thu gọn' : 'Thông tin phim'}</span>
                  <i className={`fa-solid fa-angle-down text-xs mt-0.5 transition-transform duration-300 ${isMore ? 'rotate-180' : ''}`}></i>
                </button>
              </div>

              {/* Proposal/Recommendation List (on the left side for large screens) */}
              <div className='lg:flex hidden items-center space-x-2 '>
                <icon.TopStar />
                <span className='text-white text-xl font-medium'>Top phim tuần này</span>
              </div>
              <div className='lg:flex hidden flex-col mt-5 w-full'>
                {Array.isArray(proposals) && proposals.slice(0, 15).map((movie, index) => (
                  <div key={movie._id}>
                    <Link scroll={false} href={`/phim/${movie.slug}`} className="flex w-auto space-x-3 mt-3 items-center group">
                      <div className="leading-none text-center text-[3.3em] xl:text-[4em] font-extrabold bg-clip-text [text-shadow:-1px_0_#fff,0_1px_#fff,1px_0_#fff,0_-1px_#fff] text-[rgba(var(--bg-body))] w-[75px] shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex items-center space-x-2 bg-[#ffffff05] rounded-lg p-1 w-full overflow-hidden">
                        <div className="relative w-[75px] h-[100px] shrink-0">
                          <Image fill src={movie.thumb_url} alt={movie.name} loading="lazy" sizes="75px" style={{ objectFit: "cover" }} className="rounded-xl" />
                        </div>
                        <div className="flex flex-col space-y-2 items-start px-3 min-w-0 flex-1">
                          <h3 className="text-sm truncate w-full text-white group-hover:text-primary transition-colors">{movie.name}</h3>
                          <p className="text-xs text-gray-400 truncate w-full">{movie.origin_name}</p>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-400 border border-gray-600 px-1 rounded">{movie.quality}</span>
                            <span className="text-xs text-primary">{movie.episode_current}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Player/Actions/Tabs/Content (Right Column) */}
          <div className="lg:col-span-8 ">
            {/* Play Button & Actions */}
            <div className="lg:backdrop-blur-[20px] px-0 lg:px-8 pt-6 pb-3 lg:pb-6 lg:shadow-[0_15px_15px_0_rgba(0,0,0,0.125)] lg:rounded-2xl lg:mb-1 lg:bg-[rgba(255,255,255,.05)]">
              <div className='flex text-white lg:flex-row flex-col items-center justify-between '>

                <Link scroll={false} href={firstEpisodeUrl || "#"}>
                  <button
                    disabled={!firstEpisodeUrl}
                    className={clsx(
                      "px-20 py-3 lg:px-8 lg:py-3.5 text-nowrap w-auto flex items-center space-x-3 justify-center text-black font-medium rounded-full",
                      firstEpisodeUrl
                        ? "bg-[linear-gradient(39deg,rgb(var(--primary)),rgb(211,255,221))] hover:opacity-90 transition-opacity"
                        : "bg-gray-500 cursor-not-allowed opacity-50"
                    )}
                  >
                    <i className="fa-solid fa-play text-sm lg:text-base"></i>
                    <span className='text-base lg:text-lg '>
                      {firstEpisodeUrl ? "Xem ngay" : "Đang cập nhật"}
                    </span>
                  </button>
                </Link>

                <div className='flex-row items-center lg:mt-0 mt-6 lg:w-[-webkit-fill-available] flex justify-between'>
                  <div className='flex items-center space-x-3 lg:space-x-4 lg:ml-9'>
                    {/* Action Buttons (Yêu thích, Thêm, Chia sẻ, Bình luận) */}
                    <button className='flex flex-col items-center h-[4rem] px-4 rounded-lg space-y-1 justify-center hover:bg-[#ffffff05] hover:text-primary '>
                      <icon.Love className='lg:w-[18px] w-[15px]' width={18} height={18} />
                      <span className='text-white lg:text-sm text-xs'>Yêu thích</span>
                    </button>
                    <button className='flex flex-col items-center h-[4rem] px-4 rounded-lg space-y-1 justify-center hover:bg-[#ffffff05] hover:text-primary '>
                      <icon.Add className='lg:w-[18px] w-[15px]' width={18} height={18} />
                      <span className='text-white lg:text-sm text-xs'>Thêm</span>
                    </button>
                    <button className='flex flex-col items-center h-[4rem] px-4 rounded-lg space-y-1 justify-center hover:bg-[#ffffff05] hover:text-primary '>
                      <icon.Share className='lg:w-[18px] w-[15px]' width={17} height={17} />
                      <span className='text-white lg:text-sm text-xs'>Chia sẻ</span>
                    </button>
                    <button className='hidden md:flex flex-col items-center h-[4rem] px-4 rounded-lg space-y-1 justify-center hover:bg-[#ffffff05] hover:text-primary '>
                      <icon.Comment className='lg:w-[18px] w-[15px]' width={21} height={21} />
                      <span className='text-white lg:text-sm text-xs'>Bình luận</span>
                    </button>
                  </div>
                  {/* Rating Button */}
                  <button className='flex items-center ml-4 lg:ml-0 px-3 py-2.5 rounded-full text-white space-x-1 lg:space-x-2 bg-[#3556b6] '>
                    <span className="bg-[url('/images/ro-icon.svg')] w-4 h-4 lg:w-5 lg:h-5 bg-position-[50%] bg-cover"></span>
                    <span className='font-bold lg:text-base text-sm'>10</span>
                    <span className='text-xs underline lg:block hidden'>Đánh giá</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className='lg:mt-6 lg:bg-transparent bg-gradient-to-t from-white/5 to-white/0 lg:bg-none lg:px-0 px-5 lg:mx-10 border-b-[#ffffff10] border-b flex items-center justify-between lg:justify-start lg:space-x-12'>
              {tabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    'font-medium py-3.5 border-b-2 px-1 transition-colors',
                    activeTab === t.id ? 'text-primary border-primary' : 'text-gray-300 border-b-transparent hover:text-white'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-8 px-5 lg:px-10">
              {activeTab === 'episodes' && (
                <>
                  <div>
                    {/* Season/Type Selector & Collapse Toggle */}
                    {theatricals.length === 0 && (
                      <div className='w-full justify-between flex items-start lg:items-center lg:mb-5'>
                        <div className='flex lg:flex-row flex-col lg:space-y-0 space-y-5 items-start lg:items-center lg:space-x-5'>
                          {/* Season Selector (Phim bộ) */}
                          {Sessions.length > 1 && (
                            <div className='flex items-center relative lg:border-r lg:pr-10 lg:border-[#ffffff30]'>
                              <button className='flex items-center space-x-3 text-white font-semibold text-xl' onClick={() => setIsPart(!isPart)}>
                                <i className="fa-solid fa-bars-staggered text-primary"></i>
                                <span className="">{Sessions.find((p: ISeason) => p._id === currentSeason)?.name}</span>
                                <i className="fa-solid fa-caret-down text-gray-400 text-sm"></i>
                              </button>
                              <div className={clsx("absolute !ml-0 w-48 bg-white rounded-lg shadow-lg top-0 translate-y-[33.6px] left-0 overflow-hidden z-50", isPart ? 'block' : 'hidden')}>
                                <div className=" px-4 py-3 text-gray-600 text-[13px]">Danh sách phần</div>
                                <div className="overflow-y-auto h-[155px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-500/20 hover:scrollbar-thumb-gray-500/50 scrollbar-thumb-rounded-full">
                                  {Sessions.map((item) => (
                                    <button
                                      key={item._id}
                                      onClick={() => { setCurrentSeason(item._id); setIsPart(false); }}
                                      className={`w-full text-[#191B24] text-left px-4 py-2 text-[14px] border-t border-t-gray-100 font-semibold ${currentSeason === item._id ? "bg-[#51f085]" : "hover:bg-gray-100"}`}
                                    >
                                      {item.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Type Selector (Phụ đề/Thuyết minh/...) */}
                          <div className={`flex items-center gap-3 ${Sessions.length > 1 && "lg:pl-5"}`}>
                            {availableTypes.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setCurrentType(item.backendType)}
                                className={` flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all duration-200 text-xs ${currentType === item.backendType ? "border-white text-white bg-transparent" : "border-transparent text-gray-400 hover:text-white"} `}
                              >
                                <icon.SubTitles width={13} height={13} />
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Collapse/Expand Toggle */}
                        {displayEpisodes.length > 0 && (
                          <div className='flex items-center'>
                            <button onClick={handleToggleCollapse} className='flex items-center space-x-2 cursor-pointer'>
                              <span className='text-white text-[13px] '>Rút gọn</span>
                              <div className={clsx("relative flex-shrink-0 rounded-2xl w-[30px] border h-[18px] transition-colors duration-300", isCollapsed ? 'bg-[#ffffff10] border-primary' : ' border-gray-600')}>
                                <span className={clsx("absolute h-[8px] w-[8px] rounded-[20px] transition-all duration-300 ease-in-out", "top-[4px]", isCollapsed ? "bg-primary left-[18px]" : "bg-gray-600 left-[4px]")}></span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Episode List */}
                    {Sessions.find((p) => p._id === currentSeason)?.episodes.length === 0 && theatricals.length === 0 ? (
                      <div className="text-gray-400 text-sm mb-12 mt-8">Chưa có tập phim nào.</div>
                    ) : theatricals.length > 0 ? (
                      // Hiển thị Bản chiếu (Theatricals) ở dưới
                      <></>
                    ) : isCollapsed ? (
                      // Dạng danh sách rút gọn (Chỉ hiển thị số tập)
                      <div className="grid mb-12 mt-8 grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                        {displayEpisodes.map((item, index) => {
                          const nextItem = displayEpisodes[index + 1];
                          const displayText = calculateDisplayEpisode(item, nextItem);
                          const seasonSlug = Sessions.find((p) => p._id === currentSeason)?.slug;
                          return (
                            <div key={item._id}>
                              <Link href={`/phim/${slug}/${seasonSlug}/${item.slug}${currentType ? `?type=${currentType}` : ''}`} className='flex hover:text-primary items-center justify-center py-2.5 md:py-3 lg:py-4 px-1 gap-2 rounded-md bg-[#1c2343]'>
                                <i className="fa-solid fa-play text-xs"></i>
                                <span> {displayText}</span>
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      // Dạng xem chi tiết (Có thumbnail)
                      <div className="grid mb-12 mt-8 grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        {displayEpisodes.map((item, index) => {
                          const nextItem = displayEpisodes[index + 1];
                          let displayText = item.name;
                          // Ưu tiên hiển thị số tập nếu tên tập có chữ "tập", "episode" hoặc chỉ là số
                          if (/tập/i.test(item.name) || /episode/i.test(item.name) || /^\d+$/.test(item.name)) {
                            displayText = calculateDisplayEpisode(item, nextItem);
                          }
                          const seasonSlug = Sessions.find((p) => p._id === currentSeason)?.slug;
                          return (
                            <div key={item._id} >
                              <Link href={`/phim/${slug}/${seasonSlug}/${item.slug}${currentType ? `?type=${currentType}` : ''
                                }`} className="group block">
                                <div className="relative overflow-hidden mb-3.5 ">
                                  <div className="pb-[56%] rounded-lg w-full h-0 relative overflow-hidden block bg-[#2F3346]">
                                    <div className="group-hover:opacity-100 opacity-0 absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full border border-white bg-black/50 pl-[2px]">
                                      <i className="fa-solid fa-play group-hover:text-primary"></i>
                                    </div>
                                    {/* Thêm fallback cho thumbnail nếu không có */}
                                    <Image src={item.thumbnail || movie.thumb_url} alt={item.name} width={200} height={200} className="absolute w-full h-full top-0 left-0 right-0 bottom-0 object-contain aspect-video group-hover:opacity-50" />
                                  </div>
                                </div>
                                <div className="text-left text-sm text-white group-hover:text-primary">{displayText}</div>
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Theatricals (Bản chiếu riêng cho phim lẻ) */}
                  {theatricals.length > 0 && (
                    <>
                      <h4 className="text-white font-semibold mb-4 text-2xl">Các bản chiếu</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {theatricals.map((item, index) => {
                          // item.type đã được thêm trong logic useEffect
                          const info = getTheatricalInfo(item.type || '');
                          return (
                            <div key={item.slug} className={`${info.color} text-white transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden relative rounded-xl`}>
                              <div className='lg:max-w-[110px] absolute top-0 right-0 bottom-0 w-[40%] max-w-[130px] [-webkit-mask-image:linear-gradient(270deg,black_0,transparent_95%)]'>
                                <Image alt={`Xem Phim ${movie.name}`} loading="lazy" src={galleryImages[index] || movie.thumb_url} width={100} height={200} className='object-cover w-full h-full' />
                              </div>
                              <div className='w-[90%] justify-start items-start flex-col flex relative z-2 p-4 gap-3'>
                                <div className='inline-flex items-center gap-2'>
                                  <div className='w-[20px] h-[20px]'>
                                    <Image alt="icon" src={info.icon} width={23} height={23} className='object-cover' />
                                  </div>
                                  <span>{info.label}</span>
                                </div>
                                <div className='line-clamp-2 font-semibold text-[16px] mb-2 overflow-hidden whitespace-normal [-webkit-box-orient:vertical]'>{movie.name}</div>
                                <Link scroll={false} href={`/phim/${slug}${item.slug}`} className="inline-flex items-center justify-center font-medium bg-white text-black border border-white text-[12px] px-2.5 py-1.5 rounded-md min-h-[30px]">
                                  Xem bản này
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}


              {activeTab === 'gallery' && (
                <div>
                  {/* Videos (Trailers) */}
                  <div className=" text-xl text-white font-medium">Videos</div>
                  <div className='mt-6'>
                    {!videos || videos.length === 0 ? (
                      <div className='bg-[rgba(0,0,0,.2)] flex items-center justify-center flex-col px-6 py-14 rounded-lg'>
                        <div className='w-[3rem] h-[3rem] opacity-[0.5]'>
                          <Image alt="Empty" loading="lazy" src="/images/icons/empty-box.svg" width={100} height={200} className='object-cover w-full h-full' />
                        </div>
                        <div className='text-gray-500 mt-3'>Chưa có video nào</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        {videos.map((item) => (
                          <div key={item.id} >
                            <div onClick={() => { if (item.url) { setCurrentTrailerUrl(item.url); setShowTrailer(true); } }} className="group block cursor-pointer">
                              <div className="relative overflow-hidden mb-3.5 ">
                                <div className="pb-[56%] rounded-lg w-full h-0 relative overflow-hidden block bg-[#2F3346]">
                                  <div className="absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full border border-white bg-black/50 pl-[2px]">
                                    <i className="fa-solid fa-play group-hover:text-primary"></i>
                                  </div>
                                </div>
                                <Image src={item.thumbnail} alt={item.title} width={200} height={200} className="absolute w-full h-full top-0 left-0 right-0 bottom-0 object-contain aspect-video" />
                              </div>
                              <div className="text-left text-sm text-white font-medium">{item.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Gallery Images (Backdrops) */}
                  <div className=" text-xl text-white font-medium mt-8">Ảnh</div>
                  <div ref={galleryRef} className="flex overflow-hidden flex-wrap mt-6 gap-1.5">
                    {galleryImages.map((image, index) => (
                      <div className='relative block h-[100px] lg:h-[150px] xl:h-[200px] flex-grow cursor-pointer' key={index}>
                        <Image src={image} width={100} height={100} alt={`Gallery ${index + 1}`} className='h-full object-cover max-w-full min-w-full align-bottom w-full' />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'cast' && (
                <div>
                  <h4 className="text-white font-semibold mb-8 text-2xl">Diễn viên</h4>
                  <ActorList actor={actors} />
                </div>
              )}

              {activeTab === 'recommend' && (
                <div>
                  <h4 className="text-white font-semibold mb-8 text-2xl">Có thể bạn sẽ thích</h4>
                  <ProposalGird movies={proposals} />
                </div>
              )}

              {/* Comment & Rating Section */}
              <div className='mt-10 lg:mt-14 xl:mt-16'>
                <div className='flex items-center'>
                  <icon.Comment width={34} />
                  <div className='text-white text-lg lg:text-xl font-medium ml-1 lg:ml-2'>Bình luận (111)</div>
                  {/* Comment/Rating Toggle */}
                  <div className='flex items-center border border-white p-1 rounded-lg ml-auto lg:ml-8'>
                    {BottomItems.map((item) => (
                      <button key={item.id} onClick={() => setCMT(item.id)} className={` flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 text-xs ${CMT === item.id ? "text-black bg-white" : "text-white hover:text-primary"} `}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                {CMT === "comment" ? (
                  <>
                    <div className='flex items-center space-x-3 mt-6'>
                      <Image src="/images/logo_rox.svg" alt='...' width={46} height={48} className='object-cover rounded-full border-white border-2' />
                      <div className='flex flex-col'>
                        <div className='text-gray-400 text-xs'>Bình luận với tên</div>
                        <div className='text-white font-medium text-sm mt-1'>Thanh Tùng Vương</div>
                      </div>
                    </div>
                    {/* Comment Input */}
                    <div className='mt-4 px-3 py-3 rounded-xl bg-[#ffffff10]'>
                      <div className='relative'>
                        <textarea
                          className={`border-transparent border p-2 rounded-lg bg-bg-body w-full outline-none resize-none overflow-hidden ${text.length > MAX_COMMENT ? "border-red-500" : ""}`}
                          rows={4}
                          maxLength={MAX_COMMENT + 100}
                          placeholder="Viết bình luận"
                          value={text}
                          onChange={(e) => {
                            setText(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                        />
                        <div className={`absolute top-[6px] right-[10px] rounded-lg px-1 py-1 text-[11px] ${text.length > MAX_COMMENT ? "text-red-400" : "text-gray-400"}`}>{text.length}/{MAX_COMMENT}</div>
                        {text.length > MAX_COMMENT && <p className="text-xs text-red-400 mt-1">Bạn đã vượt quá giới hạn ký tự!</p>}
                      </div>
                      <div className='my-1.5 flex justify-between items-center'>
                        <button onClick={handleToggleReveal} className='flex items-center space-x-2 cursor-pointer'>
                          <div className={clsx("relative flex-shrink-0 rounded-2xl w-[30px] border h-[18px] transition-colors duration-300", isReveal ? 'bg-primary/10 border-primary' : ' border-gray-600')}>
                            <span className={clsx("absolute h-[8px] w-[8px] rounded-[20px] transition-all duration-300 ease-in-out", "top-[4px]", isReveal ? "bg-primary left-[18px]" : "bg-gray-600 left-[4px]")}></span>
                          </div>
                          <span className='text-white text-[13px] '>Tiết lộ?</span>
                        </button>
                        <button className='flex items-center space-x-2 text-primary' disabled={text.length === 0 || text.length > MAX_COMMENT}>
                          <span className='font-medium text-sm'>Gửi</span>
                          <icon.Send width={20} />
                        </button>
                      </div>
                    </div>
                    <div className='mt-8 space-y-4'><CommentItems /></div>
                  </>
                ) : (<><RatedItems /></>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity duration-300" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#ffffff10]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTrailer(false)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 hover:bg-white hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 group border border-white/20">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
            <iframe src={getEmbedUrl(currentTrailerUrl)} className="w-full h-full" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
          </div>
        </div>
      )}
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug as string;
  const { req } = context;

  if (!slug) return { notFound: true };

  // Sử dụng let thay vì var
  let proposals: IMovie[] = [];

  try {
    const cookieHeader = req.headers.cookie || "";

    const headers = {
      Cookie: cookieHeader,
      "User-Agent": req.headers["user-agent"] || "NextJS-Server",
    };

    const resDetail = await axiosInstance.get(API_ENDPOINTS.movie.detail(slug), { headers: headers });
    const resProposal = await axiosInstance.get(API_ENDPOINTS.movie.filterByProposal(slug), { params: { limit: 12 }, headers: headers });

    // Kiểm tra và gán kiểu cho dataDetail.data
    const dataDetail = resDetail.data as { status: boolean; data: IMovie };

    if (!dataDetail.status || !dataDetail.data) {
      return { notFound: true };
    }

    // Kiểm tra resProposal.data.status
    if (resProposal.data.status) {
      // Gán kiểu cụ thể cho proposals
      proposals = (resProposal.data as { status: boolean; data: IMovie[] }).data;
    }

    const resSessions = await axiosInstance.get(API_ENDPOINTS.movie.Season(dataDetail.data._id), {
      headers: headers
    });

    // Kiểm tra và gán kiểu cho resSessions.data
    const sessionData = (resSessions.data as { status: boolean; data: ISeason[] }).data;

    const initialEpisodes: IEpisode[] = sessionData.length > 0 && sessionData[0].episodes
      ? sessionData[0].episodes
      : [];
    return {
      props: {
        initialMovie: dataDetail.data,
        initialSessions: sessionData,
        initialEpisodes: initialEpisodes,
        initialProposals: proposals
      },
      
    }

  } catch (error) {
    // In lỗi ra console để debug, nhưng vẫn trả về notFound
    console.error("Error fetching movie data:", error);
    return { notFound: true };
  }
}

export default Phim;