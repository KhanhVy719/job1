"use client";

import React, { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Loader from "@/components/loading/list";
import Link from "next/link";
import icon from "@/types/icon";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import type { Swiper as SwiperType } from "swiper";

// --- Types ---

interface MovieSchedule {
  _id: string;
  air_time: string;
  episode_number: string | number;
  is_exist: boolean;
  local_data?: {
    slug: string;
    name: string;
    thumb_url: string;
    poster_url: string;
    episode_current: string;
  } | null;
  movie: {
    title: string;
    slug: string;
    images?: {
      posters?: { path: string }[];
    };
  };
}

interface CalendarDay {
  displayDate: string; 
  dayOfWeek: string;   
  queryDate: string;   
  fullDate: Date;
}

// --- Helper Functions ---

const getDayName = (date: Date) => {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[date.getDay()];
};

const formatDateQuery = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

const formatDisplayDate = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}`;
};

// --- Component ---

const CalendarList: React.FC = () => {
  // State
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(""); 
  const [movies, setMovies] = useState<MovieSchedule[]>([]);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(false);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(true);

  const prevRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);

  // 1. Init Calendar Data (Chỉ chạy ở Client)
  useEffect(() => {
    const initDays: CalendarDay[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) { 
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const qDate = formatDateQuery(d);
      initDays.push({
        displayDate: formatDisplayDate(d),
        dayOfWeek: i === 0 ? "Hôm nay" : getDayName(d),
        queryDate: qDate,
        fullDate: d
      });
    }

    setDays(initDays);
    setSelectedDate(initDays[0].queryDate); // Mặc định chọn hôm nay
    setLoadingCalendar(false);
  }, []);

  // 2. Fetch Movies khi selectedDate thay đổi
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedDate) return;

      setLoadingMovies(true);
      try {
        const res = await axiosInstance.get(API_ENDPOINTS.schedule || "/lich-chieu", {
          params: { date: selectedDate }
        });

        if (res.data && res.data.status && res.data.data) {
          setMovies(res.data.data);
        } else {
          setMovies([]);
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
        setMovies([]);
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchSchedule();
  }, [selectedDate]);

  const getPoster = (item: MovieSchedule) => {
    if (item.is_exist && item.local_data?.thumb_url) {
      if (item.local_data.thumb_url.startsWith("http")) return item.local_data.thumb_url;
      // Lưu ý: Đảm bảo biến môi trường này có tồn tại trong next.config.js nếu dùng
      return `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}/${item.local_data.thumb_url}`;
    }

    if (item.movie.images?.posters?.[0]?.path) {
      return item.movie.images.posters[0].path;
    }

    return "/images/logo_rox.svg";
  };

  const getTitle = (item: MovieSchedule) => {
    return item.is_exist ? item.local_data?.name : item.movie.title;
  };

  const getSlug = (item: MovieSchedule) => {
    return item.is_exist ? `/phim/${item.local_data?.slug}` : "#";
  };

  return (
    <div className="relative w-full">
      {/* --- PHẦN SLIDER NGÀY --- */}
      {loadingCalendar ? (
        <Loader />
      ) : (
        <>
          <Swiper
            modules={[Navigation]}
            spaceBetween={7}
            loop={false}
            slidesPerView={3}
            className="mySwiper"
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper: SwiperType) => {
                // Fix navigation ref issue
                if (typeof swiper.params.navigation !== 'boolean' && swiper.params.navigation) {
                    const navigation = swiper.params.navigation;
                    navigation.prevEl = prevRef.current;
                    navigation.nextEl = nextRef.current;
                }
            }}
            breakpoints={{
              320: { slidesPerView: 3, spaceBetween: 5 },
              768: { slidesPerView: 5, spaceBetween: 7 },
              1024: { slidesPerView: 6, spaceBetween: 10 },
              1280: { slidesPerView: 7, spaceBetween: 15 },
            }}
          >
            {days.map((day, index) => {
              const isActive = selectedDate === day.queryDate;
              return (
                <SwiperSlide key={index}>
                  <div
                    onClick={() => setSelectedDate(day.queryDate)}
                    role="button"
                    aria-label={`Chọn ngày ${day.displayDate}`}
                    className={`flex flex-col h-full py-2 md:py-4 px-2 md:px-5 border-t-[3px] cursor-pointer transition-colors
                      ${isActive
                        ? 'border-t-primary bg-[#ffffff10]'
                        : 'border-t-transparent bg-[#ffffff06] hover:bg-[#ffffff0a]'
                      } justify-end`}
                  >
                    <p className="text-gray-400 text-xs md:text-sm lg:text-base">{day.displayDate}</p>
                    <h3 className={`text-sm md:text-base lg:text-lg font-bold truncate mt-1 ${isActive ? 'text-primary' : 'text-white'}`}>
                      {day.dayOfWeek}
                    </h3>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Nút Navigation Swiper */}
          <div
            ref={prevRef}
            className="absolute z-30 top-[10px] lg:top-[2.2rem] -translate-y-1/2 left-[-43px] lg:w-9 lg:h-9 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all shadow hover:scale-110"
            role="button"
            aria-label="Previous"
          >
            <icon.ArrowLeft className="text-gray-400 hover:text-white" width={32} height={32} />
          </div>
          <div
            ref={nextRef}
            className="absolute z-30 top-[10px] lg:top-[2.2rem] -translate-y-1/2 right-[-43px] lg:w-9 lg:h-9 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all shadow hover:scale-110"
            role="button"
            aria-label="Next"
          >
            <icon.ArrowRight className="text-gray-400 hover:text-white" width={32} height={32} />
          </div>

          {/* --- PHẦN DANH SÁCH PHIM (GRID) --- */}
          <div className="mt-6 flex flex-col space-y-6 w-full min-h-[200px]">
            {loadingMovies ? (
              <div className="w-full h-40 flex items-center justify-center">
                <Loader />
              </div>
            ) : movies.length === 0 ? (
              <div className="w-full py-10 text-center text-gray-500">
                Chưa có lịch chiếu cho ngày này.
              </div>
            ) : (
              <div className="relative flex items-start justify-between before:content-[''] before:absolute before:left-0 before:right-0 before:top-[29px] before:h-[2px] before:bg-[#ffffff10]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full px-0 md:px-4">
                  {movies.map((item) => (
                    <div key={item._id} className="relative w-full flex">
                      <Link
                        href={getSlug(item)}
                        className={`relative text-sm px-3 py-2.5 bg-[#363840] rounded-lg border border-[#ffffff20] flex flex-row items-center w-full group
                          ${item.is_exist ? 'hover:border-primary cursor-pointer' : 'cursor-default opacity-70'}
                        `}
                        onClick={(e) => {
                          if (!item.is_exist) e.preventDefault();
                        }}
                      >
                        <div className="w-[50px] flex-shrink-0">
                          <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block bg-[#222]">
                            <Image
                              src={getPoster(item)}
                              alt={getTitle(item) || "Movie Thumbnail"}
                              fill
                              className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full group-hover:scale-110 transition-transform duration-300"
                              sizes="100px"
                              unoptimized
                            />
                          </div>
                        </div>
                        {item.air_time && (
                          <span className={`absolute -top-3 text-xs leading-[1] px-1 py-0.5 rounded-[3px] text-white ${item.is_exist ? 'bg-primary' : 'bg-[#191B24]'}`}>
                            {item.air_time}
                          </span>)}

                        <div className="flex-grow ml-4">
                          <h4 className={`mb-1.5 text-[13px] line-clamp-2 font-medium ${item.is_exist ? 'text-white group-hover:text-primary' : 'text-gray-400'}`}>
                            {getTitle(item)}
                          </h4>

                          <div className="flex items-center justify-between">
                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap">
                              Tập {item.episode_number}
                            </span>
                            {!item.is_exist && (
                              <span className="text-[10px] text-red-400 border border-red-400 px-1 rounded">Chưa có</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarList;