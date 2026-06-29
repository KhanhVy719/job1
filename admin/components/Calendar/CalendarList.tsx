"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Loader from "@/components/loading/list";
import Link from "next/link";
import icon from "@/types/icon";

interface Movie {
    id: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    thumbnail: string;
    badge: string; // ví dụ: 'HOT', 'Mới', 'Đặc biệt', hoặc rỗng
}

/**
 * Định nghĩa cấu trúc cho một Ngày trong Lịch
 * Bao gồm thông tin ngày và danh sách phim của ngày đó
 */
interface Calendar {
    date: string;       // ví dụ: "20/11"
    dayOfWeek: string;  // ví dụ: "Thứ 5"
    active: boolean;    // true nếu là ngày đang được chọn (màu xanh)
    listMovie: Movie[]; // Danh sách các phim chiếu trong ngày
}

const CalendarList: React.FC<{ calendar: Calendar[] }> = ({ calendar }) => {
    const [currentCalendar, setCurrentCalendar] = useState<Calendar | null>(null);

    const [loading, setLoading] = useState(true);
    const prevRef = useRef<HTMLDivElement | null>(null);
    const nextRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await new Promise((res) => setTimeout(res, 300));

            const defaultDay =
                calendar.find((d) => d.active) || calendar[0] || null;

            setCurrentCalendar(defaultDay);

            setLoading(false);
        };

        fetchData();
    }, [calendar]);

    const onSelectDay = (day: Calendar) => {
        setCurrentCalendar(day);
    };
    return (
        <div className="relative w-full ">
            {loading ? (<>
                <Loader />
            </>) : (<>
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={7}
                    loop={true}
                    slidesPerView={3}
                    className="mySwiper"
                    navigation={{
                        prevEl: prevRef.current,
                        nextEl: nextRef.current,
                    }}
                    onBeforeInit={(swiper: any) => {
                        if (typeof swiper.params !== "undefined") {
                            swiper.params.navigation.prevEl = prevRef.current;
                            swiper.params.navigation.nextEl = nextRef.current;
                        }
                    }}
                    breakpoints={{

                        768: { slidesPerView: 3 ,spaceBetween:7},
                        1024: { slidesPerView: 6 ,spaceBetween:10},
                        1280: { slidesPerView: 7 ,spaceBetween:15},
                    }}

                >
                    {calendar.map((day, index) => {
                        const isActive = (currentCalendar && currentCalendar.date === day.date);
                        return (
                            <SwiperSlide key={index}>
                                <div onClick={() => onSelectDay(day)}
                                    role="button"
                                    aria-label={`Chọn ngày ${day.date}`} className={`flex flex-col h-full  py-2 md:py-4 px-5 border-t-[3px]  ${isActive ? 'border-t-primary bg-[#ffffff10]' : 'border-t-transparent bg-[#ffffff06]'} justify-end`}>
                                    <p className="text-gray-400 text-sm md:text-base">{day.date}</p>
                                    <h3 className={`text-base md:text-lg font-bold truncate mt-1 ${isActive ? 'text-primary' : 'text-white'}`}>
                                        {day.dayOfWeek}
                                    </h3>
                                </div>
                            </SwiperSlide>
                        );
                    })}

                </Swiper>
                <div
                    ref={prevRef}
                    className="absolute z-30 top-[10px] lg:top-[2.2rem] -translate-y-1/2 left-[-43px] lg:w-9 lg:h-9 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all shadow"
                    role="button"
                    aria-label="Previous"
                >
                    <icon.ArrowLeft className="text-gray-400 " width={45} height={45} />
                </div>
                <div
                    ref={nextRef}
                    className="absolute z-30 top-[10px] lg:top-[2.2rem] -translate-y-1/2 right-[-43px] lg:w-9 lg:h-9 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all shadow"
                    role="button"
                    aria-label="Next"
                >
                    <icon.ArrowRight className="text-gray-400 " width={45} height={45} />
                </div>

                <div className="mt-6 flex flex-col space-y-6 w-full">
                    <div className="relative flex items-start min-h-[60px] justify-between before:content-[''] before:absolute before:left-0 before:right-0 before:top-[29px] before:h-[2px] before:bg-[#ffffff10]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 w-full px-4">
                            <div
                                className="relative w-full flex"
                            >
                                <Link href="/" className="relative text-sm px-3 py-2.5  bg-[#363840] rounded-lg border hover:border-primary group border-[#ffffff20] flex flex-row items-center w-full">
                                    <div className="w-[50px] flex-shrink-0  ">
                                        <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block">
                                            <Image
                                                src="https://static.nutscdn.com/vimg/0-100/aa092c8d4441b391d1a81530faa39a39.jpg"
                                                alt="Hãy Lấy Em Đi"
                                                fill
                                                className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full"
                                                sizes="150px"

                                            />
                                            </div>
                                    </div>
                                    <span className="absolute -top-3 text-xs leading-[1] px-1 py-0.5 rounded-[3px] bg-[#191B24] text-white group-hover:text-primary">22:00</span>
                                    <div className="flex-grow ml-4">
                                        <h4 className="mb-1.5 text-[13px] text-white line-clamp-2">"Lọt Hố" Gã Khó Ưa</h4>

                                        <div className="flex items-center">
                                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap mr-0 inline">Tập 5</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div
                                className="relative w-full flex"
                            >
                                <Link href="/" className="relative text-sm px-3 py-2.5  bg-[#363840] rounded-lg border hover:border-primary group border-[#ffffff20] flex flex-row items-center w-full">
                                    <div className="w-[50px] flex-shrink-0  ">
                                        <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block">
                                            <Image
                                                src="https://static.nutscdn.com/vimg/0-100/aa092c8d4441b391d1a81530faa39a39.jpg"
                                                alt="Hãy Lấy Em Đi"
                                                fill
                                                className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full"
                                                sizes="150px"

                                            /></div>
                                    </div>
                                    <span className="absolute -top-3 text-xs leading-[1] px-1 py-0.5 rounded-[3px] bg-[#191B24] text-white group-hover:text-primary">23:00</span>
                                    <div className="flex-grow ml-4">
                                        <h4 className="mb-1.5 text-[13px] text-white line-clamp-2">"Lọt Hố" Gã Khó Ưa</h4>

                                        <div className="flex items-center">
                                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap mr-0 inline">Tập 5</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div
                                className="relative w-full flex"
                            >
                                <Link href="/" className="relative text-sm px-3 py-2.5  bg-[#363840] rounded-lg border hover:border-primary group border-[#ffffff20] flex flex-row items-center w-full">
                                    <div className="w-[50px] flex-shrink-0  ">
                                        <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block">
                                            <Image
                                                src="https://static.nutscdn.com/vimg/0-100/aa092c8d4441b391d1a81530faa39a39.jpg"
                                                alt="Hãy Lấy Em Đi"
                                                fill
                                                className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full"
                                                sizes="150px"

                                            /></div>
                                    </div>
                                    <span className="absolute -top-3 text-xs leading-[1] px-1 py-0.5 rounded-[3px] bg-[#191B24] text-white group-hover:text-primary">02:00</span>
                                    <div className="flex-grow ml-4">
                                        <h4 className="mb-1.5 text-[13px] text-white line-clamp-2">"Lọt Hố" Gã Khó Ưa</h4>

                                        <div className="flex items-center">
                                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap mr-0 inline">Tập 5</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="relative flex items-start min-h-[60px] justify-between before:content-[''] before:absolute before:left-0 before:right-0 before:top-[29px] before:h-[2px] before:bg-[#ffffff10]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 w-full  px-4">
                            <div
                                className="relative w-full flex"
                            >
                                <Link href="/" className="relative text-sm px-3 py-2.5  bg-[#363840] rounded-lg border hover:border-primary group border-[#ffffff20] flex flex-row items-center w-full">
                                    <div className="w-[50px] flex-shrink-0  ">
                                        <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block">
                                            <Image
                                                src="https://static.nutscdn.com/vimg/0-100/aa092c8d4441b391d1a81530faa39a39.jpg"
                                                alt="Hãy Lấy Em Đi"
                                                fill
                                                className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full"
                                                sizes="150px"

                                            /></div>
                                    </div>

                                    <div className="flex-grow ml-4">
                                        <h4 className="mb-1.5 text-[13px] text-white line-clamp-2">"Lọt Hố" Gã Khó Ưa</h4>

                                        <div className="flex items-center">
                                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap mr-0 inline">Tập 5</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div
                                className="relative w-full flex"
                            >
                                <Link href="/" className="relative text-sm px-3 py-2.5  bg-[#363840] rounded-lg border hover:border-primary group border-[#ffffff20] flex flex-row items-center w-full">
                                    <div className="w-[50px] flex-shrink-0  ">
                                        <div className="pb-[150%] w-full rounded-md overflow-hidden relative h-0 block">
                                            <Image
                                                src="https://static.nutscdn.com/vimg/0-100/aa092c8d4441b391d1a81530faa39a39.jpg"
                                                alt="Hãy Lấy Em Đi"
                                                fill
                                                className="object-cover absolute top-0 left-0 bottom-0 right-0 h-full w-full"
                                                sizes="150px"

                                            /></div>
                                    </div>

                                    <div className="flex-grow ml-4">
                                        <h4 className="mb-1.5 text-[13px] text-white line-clamp-2">"Lọt Hố" Gã Khó Ưa</h4>

                                        <div className="flex items-center">
                                            <span className="text-[0.9em] text-[#aaa] whitespace-nowrap mr-0 inline">Tập 5</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>


            </>)}
        </div>
    );
};

export default CalendarList;
