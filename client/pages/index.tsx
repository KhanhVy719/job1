import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { GetServerSideProps } from "next";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { getViewerLanguageRequestHeaders } from "@/utils/viewer-language";
import Loader from "@/components/loading/list";
import ICON from "@/types/icon"; 
import { GRADIENTS } from "@/utils/Items";

// --- DYNAMIC IMPORTS ---
const AnimelList = dynamic(() => import("@/components/Movie/AnimeList"), { ssr: false });
const BannerSlider = dynamic(() => import("@/components/home/Banner"), { ssr: false });
const MovieSlider = dynamic(() => import("@/components/Movie/MovieSlider"), { ssr: false });
const MovieList = dynamic(() => import("@/components/Movie/MovieList"), { ssr: false });
const TopList = dynamic(() => import("@/sections/home/Rank/list"), { ssr: false });
const KeyArt = dynamic(() => import("@/components/Movie/KeyArt"), { ssr: false });
const NewsList = dynamic(() => import("@/components/Movie/NewsList"), { ssr: false });
const MovieShelf = dynamic(() => import("@/components/Movie/MovieShelf"), { ssr: false });

interface SectionData {
  slug: string;
  title: string;
  type: string;
  queryKey?: string;
  data: IMovie[];
}

interface HomePageProps {
  sliderData: IMovie[];
  fixedSections: SectionData[];
  lazyConfig: SectionData[];
  topics: IMovie[];
}

// --- COMPONENTS ---
const SectionHeader = ({ title, link }: { title: string; link: string }) => (
  <div className="flex items-center space-x-2 text-lg lg:text-xl xl:text-2xl mt-6 lg:mt-12">
    <span className="font-semibold text-white">{title}</span>
    <Link
      href={link}
      scroll={false}
      className="group w-8 h-8 flex items-center justify-center border border-white/15 rounded-full cursor-pointer transition-width duration-[2000ms] relative text-white hover:text-[var(--primary)] hover:w-auto text-xl px-2 leading-none"
    >
      <span className="group-hover:block hidden text-xs whitespace-nowrap">Xem thêm</span>
      <ICON.ArrowRight />
    </Link>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({
  sliderData,
  fixedSections,
  lazyConfig,
  topics = [],
}) => {
  // Helper lấy data từ các section cố định (SSR)
  const getData = (slug: string) => fixedSections.find((s) => s.slug === slug)?.data || [];

  // --- STATE ---
  const [dynamicSections, setDynamicSections] = useState<SectionData[]>([]); 
  const [queue, setQueue] = useState<SectionData[]>(lazyConfig); 
  const [isLoading, setIsLoading] = useState(false);
  const loadRef = useRef<HTMLDivElement>(null); 

  // State cho Topics
  const [isTopicExpanded, setIsTopicExpanded] = useState(false);
  const initialDisplayCount = 6;
  const displayedTopics = isTopicExpanded ? topics : topics.slice(0, initialDisplayCount);
  const remainingTopicsCount = topics.length - initialDisplayCount;

  // --- RENDER DYNAMIC SECTION ---
  const renderDynamicSection = (section: SectionData) => {
    const { type, slug, data, title = "Gợi ý cho bạn" } = section; 
    
    if (!data || data.length === 0) return null;

    let ComponentToRender = MovieList; 

    if (["cinema", "phim-chieu-rap", "single_tuyen"].includes(type)) {
      ComponentToRender = MovieShelf;
    } else if (["top_series", "top_single", "trending"].includes(type)) {
      ComponentToRender = KeyArt;
    } 
    
    let linkUrl = `/c/${slug}`;
    // Fix link logic
    if (slug && slug.includes("pha-an")) linkUrl = "/quoc-gia/han-quoc";
    if (type === "infinite_random") linkUrl = "/tim-kiem"; 

    return (
      <div key={slug} className="animate-fade-in-up">
        <SectionHeader title={title} link={linkUrl} />
        <div className="mt-6">
          <ComponentToRender movies={data} />
        </div>
      </div>
    );
  };

  // --- INFINITE SCROLL LOGIC (ĐÃ TỐI ƯU CHO VÒNG LẶP VÔ TẬN) ---
  const loadNextSection = useCallback(async () => {
    if (isLoading) return; 
    
    setIsLoading(true);

    try {
      // Logic: Nếu còn hàng chờ (queue) thì lấy queue, nếu hết thì gọi infinite_random
      const currentQueueItem = queue.length > 0 ? queue[0] : null;
      const pageParam = currentQueueItem ? currentQueueItem.queryKey : "infinite_random";

      // Tạo delay giả lập nhỏ để tránh spam API quá nhanh nếu mạng quá mạnh
      await new Promise((resolve) => setTimeout(resolve, 300));

      const res = await axiosInstance.get(API_ENDPOINTS.home, {
        params: { page: pageParam },
      });

      const fetchedData = res.data?.data || [];
      const fetchedTitle = res.data?.title || "Có thể bạn sẽ thích";

      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        const newSection: SectionData = {
            // QUAN TRỌNG: Tạo slug unique theo timestamp để React luôn render mới
            slug: currentQueueItem ? currentQueueItem.slug : `infinite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: fetchedTitle,
            type: currentQueueItem ? currentQueueItem.type : "infinite_random",
            queryKey: pageParam,
            data: fetchedData
        };

        setDynamicSections((prev) => [...prev, newSection]);
      } else {
         console.warn("API returned empty data for:", pageParam);
      }

      // Nếu đang dùng queue, xóa item đã dùng
      if (currentQueueItem) {
        setQueue((prev) => prev.slice(1));
      }

    } catch (error) {
      console.error("Load section error", error);
      // Nếu lỗi ở queue item, bỏ qua nó để không bị kẹt
      if (queue.length > 0) setQueue((prev) => prev.slice(1));
    } finally {
      setIsLoading(false);
    }
  }, [queue, isLoading]);

  // --- OBSERVER ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Chỉ trigger khi thấy loader VÀ không đang loading
        if (entries[0].isIntersecting && !isLoading) {
          loadNextSection();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "400px" // Load trước khi cuộn tới đáy 400px cho mượt
      } 
    );

    const el = loadRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [loadNextSection, isLoading]); // Thêm isLoading vào dep để re-attach observer

  // Check content SSR
  const hasHanQuoc = getData("han-quoc").length > 0;
  const hasTrungQuoc = getData("trung-quoc").length > 0;
  const hasAuMy = getData("au-my").length > 0;
  const hasAnyContent = hasHanQuoc || hasTrungQuoc || hasAuMy;

  return (
    <>
      <div className="pb-28">
        <BannerSlider movies={sliderData} />

        {/* --- TOPIC LIST --- */}
        <div className="relative top-[-2rem] z-10 px-5 lg:px-6 ">
          <div className="text-2xl font-semibold text-white">
            Bạn đang quan tâm gì?
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
            {displayedTopics.map((topic, index) => {
              const gradientClass = GRADIENTS[index % GRADIENTS.length];
              return (
                <Link
                  href={`/c/${topic.slug}`}
                  scroll={false}
                  key={topic._id}
                  className={`relative transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden rounded-xl p-6 text-white bg-gradient-to-br ${gradientClass} 
                  after:absolute after:inset-0 after:bg-[url(/images/wave.png)] after:bg-no-repeat after:opacity-30
                  after:[mask-image:linear-gradient(-45deg,black,transparent_40%)] 
                  after:bg-[length:200px_140px] after:bg-[position:right_-2rem_bottom_0] 
                  flex flex-col justify-end h-24 sm:h-30 lg:h-36`}
                >
                  <h3 className="text-base md:text-lg lg:text-xl font-bold relative z-10 w-[80%] line-clamp-2">
                    {topic.name}
                  </h3>
                  <div className="md:flex hidden font-medium mt-3 items-center relative space-x-2 leading-none z-10">
                    <span>Xem chủ đề</span>
                    <i className="fa-solid fa-angle-right"></i>
                  </div>
                </Link>
              );
            })}

            {!isTopicExpanded && remainingTopicsCount > 0 && (
              <div
                onClick={() => setIsTopicExpanded(true)}
                className="cursor-pointer relative transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden rounded-xl p-6 text-white bg-gradient-to-br from-gray-600 to-gray-800
                after:absolute after:inset-0 after:bg-[url(/images/wave.png)] after:bg-no-repeat after:opacity-30
                after:[mask-image:linear-gradient(-45deg,black,transparent_40%)] 
                after:bg-[length:200px_140px] after:bg-[position:right_-2rem_bottom_0] 
                flex flex-col justify-end h-24 sm:h-30 lg:h-full hover:brightness-110"
              >
                <h3 className="text-base md:text-lg lg:text-xl font-bold relative z-10">
                  + {remainingTopicsCount} Chủ đề
                </h3>
              </div>
            )}
          </div>
        </div>

        {/* --- COUNTRY SECTIONS (SSR) --- */}
        {hasAnyContent && (
          <div className="relative z-10 px-0 md:px-5 lg:px-6 ">
            <div className="bg-[linear-gradient(0deg,rgba(40,43,58,0)_20%,rgba(40,43,58,1))] rounded-xl lg:py-6 py-5 px-5 lg:px-6 mt-12 flex flex-col lg:space-y-12 space-y-4">
              
              {getData("han-quoc").length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  <div className="col-span-1 xl:col-span-2 ">
                    <div className="xl:flex xl:h-full xl:items-center xl:justify-center w-full xpx-6 2xl:px-8 ">
                      <div className="flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start ">
                        <div className="text-lg md:text-xl lg:text-xl  xl:text-[2rem] 
    !leading-[2.3rem] 2xl:text-4xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(103,65,150)_130%)] bg-clip-text text-transparent tracking-[1px]">
                          Phim Hàn Quốc mới
                        </div>
                        <Link scroll={false} href="/quoc-gia/han-quoc" className="text-xs md:text-sm 2xl:text-lg text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-primary ">
                          <span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 xl:col-span-10">
                    <MovieSlider movies={getData("han-quoc")} />
                  </div>
                </div>
              )}
              
              {getData("trung-quoc").length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="col-span-1 xl:col-span-2">
                        <div className="xl:flex xl:h-full xl:items-center xl:justify-center w-full xpx-6 2xl:px-8">
                            <div className="flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start">
                                <div className="text-lg md:text-xl lg:text-xl  xl:text-[2rem] 
    !leading-[2.3rem] 2xl:text-4xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(247,161,11)_130%)] bg-clip-text text-transparent tracking-[1px]">Phim Trung Quốc mới</div>
                                <Link scroll={false} href="/quoc-gia/trung-quoc" className="text-xs md:text-sm 2xl:text-lg text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-primary"><span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i></Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1 xl:col-span-10"><MovieSlider movies={getData("trung-quoc")} /></div>
                </div>
              )}
               {getData("au-my").length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="col-span-1 xl:col-span-2">
                        <div className="xl:flex xl:h-full xl:items-center xl:justify-center w-full xpx-6 2xl:px-8">
                            <div className="flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start">
                                <div className="text-lg md:text-xl lg:text-xl  xl:text-[2rem] 
    !leading-[2.3rem] 2xl:text-4xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(255,0,153)_130%)] bg-clip-text text-transparent tracking-[1px]">Phim US-UK mới</div>
                                <Link scroll={false} href="/quoc-gia/au-my" className="text-xs md:text-sm 2xl:text-lg text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-primary"><span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i></Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1 xl:col-span-10"><MovieSlider movies={getData("au-my")} /></div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 px-5 lg:px-6 ">
          <TopList />

          {getData("phim-dien-anh-moi").length > 0 && (
            <>
              <SectionHeader title="Phim Điện Ảnh Mới Coóng" link="/the-loai/phim-le" />
              <div className="mt-6"><MovieList movies={getData("phim-dien-anh-moi")} /></div>
            </>
          )}
          {getData("top-10-phim-bo-hom-nay").length > 0 && (
            <>
              <SectionHeader title="Top 10 Phim Bộ Hôm Nay" link="/tim-kiem?type=tv&sort=view" />
              <div className="mt-6"><KeyArt movies={getData("top-10-phim-bo-hom-nay")} /></div>
            </>
          )}
           {getData("phim-chieu-rap").length > 0 && (
            <>
              <SectionHeader title="Mãn Nhãn với Phim Chiếu Rạp" link="/the-loai/phim-chieu-rap" />
              <div className="mt-6"><MovieShelf movies={getData("phim-chieu-rap")} /></div>
            </>
          )}
           {getData("top-10-phim-le-hom-nay").length > 0 && (
            <>
              <SectionHeader title="Top 10 Phim Lẻ Hôm Nay" link="/tim-kiem?type=movie&sort=view" />
              <div className="mt-6"><KeyArt movies={getData("top-10-phim-le-hom-nay")} /></div>
            </>
          )}
           {getData("phim-nhat").length > 0 && (
            <>
              <SectionHeader title="Phim Nhật Mới Oanh Tạc Chốn Này" link="/quoc-gia/nhat-ban" />
              <div className="mt-6"><MovieList movies={getData("phim-nhat")} /></div>
            </>
          )}
          {getData("phim-thai").length > 0 && (
            <>
              <SectionHeader title="Phim Thái New: Không Drama Đời Không Nể" link="/quoc-gia/thai-lan" />
              <div className="mt-6"><MovieList movies={getData("phim-thai")} /></div>
            </>
          )}
          {getData("phim-sap-toi").length > 0 && (
            <>
              <SectionHeader title="Phim Sắp Tới trên rổ" link="/status/trailer" />
              <div className="mt-6"><NewsList movies={getData("phim-sap-toi")} /></div>
            </>
          )}
          {getData("hoat-hinh").length > 0 && (
            <div className="py-5 lg:pt-0">
              <SectionHeader title="Kho Tàng Anime Mới Nhất" link="/the-loai/hoat-hinh" />
              <div className="mt-6"><AnimelList movies={getData("hoat-hinh")} /></div>
            </div>
          )}
          {getData("phim-bo").length > 0 && (
            <>
              <SectionHeader title="Phim Bộ Mới Cập Nhật" link="/the-loai/phim-bo" />
              <div className="my-6"><MovieList movies={getData("phim-bo")} /></div>
            </>
          )}
          {getData("phim-le").length > 0 && (
            <>
              <SectionHeader title="Phim Lẻ Mới Đến" link="/the-loai/phim-le" />
              <div className="mt-6"><MovieList movies={getData("phim-le")} /></div>
            </>
          )}
           {getData("phim-chieu-rap-hot").length > 0 && (
            <>
              <SectionHeader title="Phim Chiếu Rạp Hot" link="/the-loai/phim-chieu-rap" />
              <div className="mt-6"><KeyArt movies={getData("phim-chieu-rap-hot")} /></div>
            </>
          )}

          {dynamicSections.map((section) => renderDynamicSection(section))}
          
          <div ref={loadRef} className="h-24 w-full flex items-center justify-center mt-12 mb-20">
             {isLoading ? <Loader /> : <div className="text-gray-500 text-sm">Đang tải thêm nội dung...</div>}
          </div>

        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context; 

  const cookieHeader = req.headers.cookie || ""; 
  const requestConfig = {
    headers: {
      Cookie: cookieHeader, 
      "User-Agent": req.headers["user-agent"] || "NextJS-Server",
      ...getViewerLanguageRequestHeaders(cookieHeader),
    }
  };

  try {
    const [resHome, resTopics] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.home, requestConfig),
      axiosInstance.get(API_ENDPOINTS.menu.categories, requestConfig)
    ]);

    const homeData = resHome.data;
    const topicsData = resTopics.data;

    const slider = homeData?.data?.slider || [];
    const sections = homeData?.data?.sections || [];
    const remainingSectionsConfig = homeData?.data?.remainingSectionsConfig || [];
    const topics = topicsData?.data || [];

    return {
      props: {
        sliderData: slider,
        fixedSections: sections,
        lazyConfig: remainingSectionsConfig,
        topics: topics,
      },
    };
  } catch  {

    return {
      props: {
        sliderData: [],
        fixedSections: [],
        lazyConfig: [],
        topics: [],
      },
    };
  }
};

export default HomePage;
