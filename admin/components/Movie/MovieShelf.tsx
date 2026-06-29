"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import icon from "@/types/icon";
import Link from "next/link";
import MovieListHover from "./Hover/MovieList";

interface Movie {
    id: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    thumbnail: string;
    badge: string;
}

interface Position {
    top: number;
    left: number;
}

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia(query);
        const handler = () => setMatches(media.matches);

        // modern browsers
        if (media.addEventListener) {
            media.addEventListener("change", handler);
        } else {
            media.addListener(handler);
        }

        return () => {
            if (media.removeEventListener) {
                media.removeEventListener("change", handler);
            } else {
                media.removeListener(handler);
            }
        };
    }, [query]);

    return matches;
}

const MovieSlider: React.FC<{ movies: Movie[] }> = ({ movies }) => {
    const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const pendingActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );
    const moveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );
    const isXlScreen = useMediaQuery("(min-width: 1280px)");

    const HOVER_INTENT_DELAY = 200;
    const HIDE_DELAY = 200;
    const ANIMATION_DURATION = 200;
    const STATIONARY_DEBOUNCE_DELAY = 50;

    useEffect(() => {
        setIsClient(true);
        return () => {
            if (pendingActionTimerRef.current) {
                clearTimeout(pendingActionTimerRef.current);
            }
            if (moveDebounceTimerRef.current) {
                clearTimeout(moveDebounceTimerRef.current);
            }
        };
    }, []);

    const clearPendingActionTimer = useCallback(() => {
        if (pendingActionTimerRef.current) {
            clearTimeout(pendingActionTimerRef.current);
            pendingActionTimerRef.current = null;
        }
    }, []);

    const clearMoveDebounceTimer = useCallback(() => {
        if (moveDebounceTimerRef.current) {
            clearTimeout(moveDebounceTimerRef.current);
            moveDebounceTimerRef.current = null;
        }
    }, []);

    const showTooltip = useCallback(
        (movie: Movie, targetElement: HTMLElement) => {
            clearPendingActionTimer();

            pendingActionTimerRef.current = setTimeout(() => {
                if (!targetElement) return;

                const rect = targetElement.getBoundingClientRect();
                const position: Position = {
                    top: rect.top + rect.height / 2 + window.scrollY,
                    left: rect.left + rect.width / 2 + window.scrollX,
                };

                setCurrentMovie(movie);
                setCurrentPosition(position);
                setIsVisible(true);
            }, HOVER_INTENT_DELAY);
        },
        [clearPendingActionTimer]
    );

    const hideTooltip = useCallback(() => {
        clearPendingActionTimer();
        clearMoveDebounceTimer();

        pendingActionTimerRef.current = setTimeout(() => {
            setIsVisible(false);

            pendingActionTimerRef.current = setTimeout(() => {
                setCurrentMovie(null);
                setCurrentPosition(null);
            }, ANIMATION_DURATION);
        }, HIDE_DELAY);
    }, [clearMoveDebounceTimer, clearPendingActionTimer]);

    const immediateHide = useCallback(() => {
        clearPendingActionTimer();
        clearMoveDebounceTimer();
        setIsVisible(false);
        setCurrentMovie(null);
        setCurrentPosition(null);
    }, [clearMoveDebounceTimer, clearPendingActionTimer]);

    useEffect(() => {
        const handleScroll = () => {
            if (isVisible) {
                immediateHide();
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isVisible, immediateHide]);

    useEffect(() => {
        if (!isXlScreen && isVisible) {
            immediateHide();
        }
    }, [isXlScreen, isVisible, immediateHide]);

    const handleMouseActivity = (
        movie: Movie,
        e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>
    ) => {
        if (isDragging) return;

        const currentTargetElement = e.currentTarget as HTMLElement;

        clearMoveDebounceTimer();
        clearPendingActionTimer();

        moveDebounceTimerRef.current = setTimeout(() => {
            showTooltip(movie, currentTargetElement);
        }, STATIONARY_DEBOUNCE_DELAY);
    };

    const handleMouseLeave = () => {
        if (isDragging) return;

        clearMoveDebounceTimer();
        hideTooltip();
    };

    return (
        <div className="relative w-full ">
            <Swiper
                modules={[Navigation]}
                spaceBetween={10}
                loop={true}

                slidesPerView={7}
                className="mySwiper"
                breakpoints={{
                    0: { slidesPerView: 1.2,spaceBetween:10 },
                    640: { slidesPerView: 3,spaceBetween:17 },
                }}
                onTouchStart={() => {
                    setIsDragging(true);
                    immediateHide();
                }}
                onTouchEnd={() => {
                    setTimeout(() => setIsDragging(false), 50);
                }}
                onPointerDown={() => {
                    setIsDragging(true);
                    immediateHide();
                }}
                onPointerUp={() => {
                    setTimeout(() => setIsDragging(false), 50);
                }}
            >
                {movies.map((movie) => (
                    <SwiperSlide key={movie.id}>

                        <Link href="/" className="block group">

                            <div
                                className="relative w-full"
                                onMouseEnter={(e) => handleMouseActivity(movie, e)}
                                onMouseMove={(e) => handleMouseActivity(movie, e)}
                                onMouseLeave={handleMouseLeave}
                                onPointerMove={(e) => handleMouseActivity(movie, e)}
                            >
                                <Image
                                    width={300}
                                    height={169}
                                    src={movie.imageUrl}
                                    alt={movie.title}
                                    style={{ objectFit: "cover" }}
                                      loading="lazy"

                                    className="rounded-lg w-full lg:h-[220px] xl:h-[250px] aspect-video"
                                />

                                <div className="absolute bottom-0 left-[-5rem] justify-center w-full flex">
                                    <span className="bg-gray-500 rounded-tl text-white text-[11px] px-2 py-1">
                                        {movie.badge}
                                    </span>
                                    <span className="bg-green-600 text-white text-[11px] rounded-tr px-2 py-1">
                                        {movie.badge}
                                    </span>
                                </div>
                                <div className="absolute  z-10 bottom-[-75px] left-[18px]">
                                    <Image
                                        width={80}
                                        height={110}
                                        src={movie.thumbnail}
                                        alt=""
                                        className="rounded-xl w-[80px] h-auto "
                                        style={{ objectFit: "cover" }}
                                    />
                                </div>
                            </div>


                            <div className="ml-28 mt-2 flex-grow min-w-0">
                                <h3 className="text-sm font-semibold truncate text-white">
                                    {movie.title} {/* <-- Dùng title từ interface */}
                                </h3>
                                <p className="text-xs mt-1 text-gray-400 truncate">
                                    {movie.subtitle} {/* <-- Dùng subtitle từ interface */}
                                </p>

                                {/* Dòng thông tin DEMO TẠM (T16, 2025, ...) */}
                                <div className="flex items-center space-x-1.5 text-xs text-gray-400 mt-2">
                                    <span>T16</span>
                                    <span className="text-gray-600">&bull;</span>
                                    <span>2025</span>
                                    <span className="text-gray-600">&bull;</span>
                                    <span>1h 45m</span>
                                </div>
                            </div>

                        </Link>
                    </SwiperSlide>
                ))}
            </Swiper>


            {isClient && currentMovie && currentPosition && createPortal(
                <MovieListHover
                    movie={currentMovie}
                    position={currentPosition}
                    isVisible={isVisible}
                    onMouseEnter={() => {
                        clearPendingActionTimer();
                    }}
                    onMouseLeave={hideTooltip}
                />,
                document.body
            )}
        </div>
    );
};

export default MovieSlider;
