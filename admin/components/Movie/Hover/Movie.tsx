
"use client";

import 'swiper/css';
import 'swiper/css/navigation';
import Image from 'next/image';
import Link from "next/link";

interface Movie {
    id: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    badge: string;
}

interface Position {
    top: number;
    left: number;
}

interface MovieHoverProps {
    movie: Movie;
    position: Position;
    isVisible: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function MovieHover({
    movie,
    position,
    isVisible,
    onMouseEnter,
    onMouseLeave
}: MovieHoverProps) {

    const cardStyle = {
        position: 'absolute' as const,
        top: `${position.top - 227}px`,
        left: `${position.left - 212}px`,
        zIndex: 50,

    };

    return (
        <div
            style={cardStyle}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}

            className={`
                w-[380px] animate-qtip bg-[#2F3346] rounded-xl shadow-xl overflow-hidden
                transform-gpu transition-all duration-200 ease-in-out
                ${isVisible
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                }
            `}
        >

            <div className="relative  ">
                <Image
                    width={550}
                    height={197}
                    src={movie.imageUrl}
                    alt={movie.title}
                    
                    objectFit="cover"
                      loading="lazy"

                    className="w-full h-full"
                />
                <div
                    className="h-full w-full left-0 z-[1] absolute bottom-0
    bg-[linear-gradient(0deg,rgba(47,51,70,1)_0%,rgba(47,51,70,0.95)_10%,rgba(47,51,70,0.7)_25%,rgba(47,51,70,0)_40%,rgba(47,51,70,0)_100%)]"
                />


            </div>
            <div className="px-4 pb-8">
                <h3 className="text-[15px] font-semibold truncate text-white">{movie.title}</h3>
                <p className="text-xs mt-1 text-primary">{movie.subtitle}</p>
                <div className="flex space-x-2 mt-5">
                    <Link href="/" className="flex-1 bg-primary text-black text-sm  py-2 px-3 rounded-lg justify-center font-medium hover:bg-primary transition-colors flex items-center space-x-2">
                        <i className="fa-solid fa-play"></i>
                        <span>Xem ngay</span>
                    </Link>
                    <button className="flex-1 border border-gray-200 text-gray-200 text-sm  py-2 px-3 rounded-lg justify-center font-medium transition-colors flex items-center space-x-2">
                        <i className="fa-solid fa-play"></i>
                        <span>Thích</span>
                    </button>
                    <button className="flex-1 border font-medium border-gray-200 text-gray-200 text-sm  py-2 px-3 rounded-lg justify-center transition-colors flex items-center space-x-2">
                        <i className="fa-solid fa-play"></i>
                        <span>Chi tiết</span>
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-6">
                    <span className="bg-white px-1.5 font-medium py-1 rounded-md text-black text-[12px]">T13</span>
                    <span className="bg-[#676e8f7b] text-[#ccd4fd] px-1.5 font-medium py-1 rounded-md text-[12px]">IMDb 7.7</span>
                    <span className="bg-[#676e8f7b] text-[#ccd4fd] px-1.5 font-medium py-1 rounded-md text-[12px]">2025</span>
                </div>

                <div className="flex items-center mt-6 space-x-2 text-[12px]">
                    <span className="text-gray-200">Chính Kịch</span>

                    <span className="text-gray-400" aria-hidden="true">•</span>

                    <span className="text-gray-200">Cổ Trang</span>

                    <span className="text-gray-400" aria-hidden="true">•</span>

                    <span className="text-gray-200">Tâm Lý</span>

                    <span className="text-gray-400" aria-hidden="true">•</span>

                    <span className="text-gray-200">Võ Thuật</span>
                </div>
            </div>

        </div>
    );
}
export default MovieHover;