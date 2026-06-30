"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import icon from "@/types/icon";
import Link from "next/link";

interface Comment {
    id: number | string;
    imageUrl: string;
    userAvatarUrl: string;
    userName: string;
    isVerified: boolean;
    content: string;
    likes: number;
    commentsCount: number;
    linkUrl: string;
}



const CommentSwiper: React.FC<{ comments: Comment[] }> = ({ comments }) => {

    const prevRef = useRef<HTMLDivElement | null>(null);
    const nextRef = useRef<HTMLDivElement | null>(null);

    if (comments.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
                Chưa có top bình luận.
            </div>
        );
    }

    return (
        <div className="relative w-full">
            <Swiper
                modules={[Navigation]}
                spaceBetween={17}
                loop={comments.length > 5}
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
                slidesPerView={5}
                className="mySwiper"
                breakpoints={{
                    0: { slidesPerView: 1 },
                    480: { slidesPerView: 1.5 },
                    640: { slidesPerView: 2.5 },
                    1024: { slidesPerView: 5 },
                }}
            >
                {comments.map((comment) => (
                    <SwiperSlide key={comment.id}>
                        <div className="relative h-[12.3rem] w-full rounded-xl overflow-hidden">
                            <Image
                                width={300}
                                height={100}
                                src={comment.imageUrl}
                                alt="Movie background"
                                style={{ objectFit: "cover" }}
                                loading="lazy"

                                className="w-full h-full blur-[5px] opacity-[0.5]"
                            />
                            <div
                                className="h-full w-full left-0 z-[1] absolute bottom-0  bg-[linear-gradient(0deg,rgba(17,19,25,1)_0%,rgba(17,19,25,0.95)_10%,rgba(17,19,25,0.7)_25%,rgba(17,19,25,0)_40%,rgba(17,19,25,0)_100%)]"
                            />
                            <div className="absolute z-[2] top-6 px-5 ">
                                <div className="flex w-full justify-between items-start">
                                    <div className="flex flex-col space-y-4">
                                        <Link href={comment.linkUrl}>
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                                                <Image
                                                    width={45}
                                                    height={45}
                                                    src={comment.userAvatarUrl}
                                                    alt={comment.userName}
                                                    loading="lazy"

                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </Link>

                                        <div >
                                            <Link href={comment.linkUrl} className="flex items-center space-x-2">
                                                <span className="text-white text-sm font-semibold hover:text-red-500 transition-colors">
                                                    {comment.userName}
                                                </span>
                                                <i className="fas fa-mars text-[#FFD875]"></i>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className=" w-11 rounded overflow-hidden">
                                        <Image
                                            width={56}
                                            height={80}
                                            src={comment.imageUrl}
                                            alt="Movie poster"
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="mt-2  flex-grow">
                                    <p className="text-[12px] text-[#fff8] line-clamp-3">
                                        {comment.content}
                                    </p>
                                </div>

                                <div className="flex items-center space-x-5 mt-5 text-xs">
                                    <div className="space-x-1.5 flex items-center text-[#fff8] hover:text-[#FFD875] cursor-pointer transition-colors">
                                        <i className="fa-solid fa-circle-up"></i><span>{comment.likes}</span>
                                    </div>

                                    <div className="space-x-1.5 flex items-center text-[#fff8] hover:text-[#FFD875] cursor-pointer transition-colors">
                                        <i className="fa-solid fa-circle-down"></i><span>{comment.commentsCount}</span>
                                    </div>

                                    <div className="space-x-1.5 flex items-center text-[#fff8] hover:text-[#FFD875] cursor-pointer transition-colors">
                                        <i className="fa-solid fa-message"></i>
                                        <span>{comment.commentsCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <div
                ref={prevRef}
                className="absolute z-30 top-1/2 bg-[rgb(17,19,25)] -translate-y-1/2 left-[-47px] lg:w-10 lg:h-10 w-8 h-8 flex items-center justify-center border border-gray-500 rounded-full cursor-pointer transition-all shadow"
                role="button"
                aria-label="Previous"
            >
                <icon.ArrowLeft className="text-white text-lg lg:text-xl" />
            </div>

            <div
                ref={nextRef}
                className="absolute z-30 top-1/2 bg-[rgb(17,19,25)] -translate-y-1/2 right-[-47px] lg:w-10 lg:h-10 w-8 h-8 flex items-center justify-center border border-gray-500 rounded-full cursor-pointer transition-all shadow"
                role="button"
                aria-label="Next"
            >
                <icon.ArrowRight className="text-white text-lg lg:text-xl" />
            </div>
        </div>
    );
};

export default CommentSwiper;
