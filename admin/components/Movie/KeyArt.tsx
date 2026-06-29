"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import MovieListHover from "./Hover/MovieList";

interface Movie {
    id: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    thumbnail: string;
    badge?: string;
    badgeFB?: string;
    badgeTM?: string;
    episodeInfo?: string;
}

interface Position {
    top: number;
    left: number;
}

// ... (Phần useMediaQuery không đổi) ...
function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia(query);
        const handler = () => setMatches(media.matches);

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

    const HOVER_INTENT_DELAY = 500;
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

    const clipPathEven =
        "polygon(5.761% 100%, 94.239% 100%, 94.239% 100%, 95.174% 99.95%, 96.06% 99.803%, 96.887% 99.569%, 97.642% 99.256%, 98.313% 98.87%, 98.889% 98.421%, 99.357% 97.915%, 99.706% 97.362%, 99.925% 96.768%, 100% 96.142%, 100% 3.858%, 100% 3.858%, 99.913% 3.185%, 99.662% 2.552%, 99.263% 1.968%, 98.731% 1.442%, 98.08% .984%, 97.328% .602%, 96.488% .306%, 95.577% .105%, 94.609% .008%, 93.6% .024%, 5.121% 6.625%, 5.121% 6.625%, 4.269% 6.732%, 3.468% 6.919%, 2.728% 7.178%, 2.058% 7.503%, 1.467% 7.887%, .962% 8.323%, .555% 8.805%, .253% 9.326%, .065% 9.88%, 0 10.459%, 0 96.142%, 0 96.142%, .075% 96.768%, .294% 97.362%, .643% 97.915%, 1.111% 98.421%, 1.687% 98.87%, 2.358% 99.256%, 3.113% 99.569%, 3.94% 99.803%, 4.826% 99.95%, 5.761% 100%)";

    const clipPathOdd =
        "polygon(94.239% 100%, 5.761% 100%, 5.761% 100%, 4.826% 99.95%, 3.94% 99.803%, 3.113% 99.569%, 2.358% 99.256%, 1.687% 98.87%, 1.111% 98.421%, .643% 97.915%, .294% 97.362%, .075% 96.768%, 0 96.142%, 0 3.858%, 0 3.858%, .087% 3.185%, .338% 2.552%, .737% 1.968%, 1.269% 1.442%, 1.92% .984%, 2.672% .602%, 3.512% .306%, 4.423% .105%, 5.391% .008%, 6.4% .024%, 94.879% 6.625%, 94.879% 6.625%, 95.731% 6.732%, 96.532% 6.919%, 97.272% 7.178%, 97.942% 7.503%, 98.533% 7.887%, 99.038% 8.323%, 99.445% 8.805%, 99.747% 9.326%, 99.935% 9.88%, 100% 10.459%, 100% 96.142%, 100% 96.142%, 99.925% 96.768%, 99.706% 97.362%, 99.357% 97.915%, 98.889% 98.421%, 98.313% 98.87%, 97.642% 99.256%, 96.887% 99.569%, 96.06% 99.803%, 95.174% 99.95%, 94.239% 100%)";

    return (
        <div className="relative w-full ">
            <Swiper
                modules={[Navigation]}
                spaceBetween={7}
                loop={true}
                slidesPerView={4.2}
                className="mySwiper"
                breakpoints={{
                    0: { slidesPerView: 1.2 ,spaceBetween:7 },
                    640: { slidesPerView: 1.5,spaceBetween:10 },
                    768: { slidesPerView: 2.5 ,spaceBetween:15},
                    1024: { slidesPerView: 3.3 ,spaceBetween:17},
                    1280: { slidesPerView: 4.2 ,spaceBetween:17},
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
                {movies.map((movie, index) => {
                    const currentClipPath = index % 2 === 0 ? clipPathOdd : clipPathEven;

                    return (
                        <SwiperSlide key={movie.id}>
                            <Link href="/" className="flex flex-col h-full group">

                                <div
                                    className="relative bg-transparent group-hover:bg-primary transition-colors duration-300"
                                    style={{
                                        clipPath: currentClipPath,
                                        padding: "4px",
                                    }}
                                    onMouseEnter={(e) => handleMouseActivity(movie, e)}
                                    onMouseMove={(e) => handleMouseActivity(movie, e)}
                                    onMouseLeave={handleMouseLeave}
                                    onPointerMove={(e) => handleMouseActivity(movie, e)}
                                >

                                    <div
                                        className="relative w-full h-[500px] overflow-hidden"
                                        style={{
                                            clipPath: currentClipPath,
                                        }}
                                    >
                                        <Image
                                            width={300}
                                            height={500}
                                            src={movie.thumbnail}
                                            alt={movie.title}
                                            style={{ objectFit: "cover" }}
                                              loading="lazy"

                                            className="w-full h-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                                        />

                                        <div
                                            className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
                                            aria-hidden="true"
                                        />
                                        <div className="absolute bottom-0 left-0 justify-center w-full flex">
                                            <span className="bg-gray-500 rounded-tl text-white text-[11px] px-2 py-1">
                                                {movie.badge}
                                            </span>
                                            <span className="bg-green-600 text-white text-[11px] rounded-tr px-2 py-1">
                                                {movie.badge}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full space-x-5 mt-3 items-center">
                                    <div className="leading-none text-center text-[4.2em] font-extrabold italic bg-clip-text text-primary">{index + 1}</div>
                                    <div className="flex flex-col space-y-2">
                                        <h3 className="text-sm truncate text-white">
                                            {movie.title}
                                        </h3>
                                        <p className="text-xs text-gray-400">{movie.subtitle}</p>
                                        <div className="flex items-center space-x-2 rounded-lg bg-gray-900 ">
                                            <span className="text-xs font-bold text-white">T18</span>
                                            <span className="text-gray-500">&bull;</span>
                                            <span className="text-xs text-gray-300">Phần 1</span>
                                            <span className="text-gray-500">&bull;</span>
                                            <span className="text-xs text-gray-300">Tập 4</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </SwiperSlide>
                    );
                })}
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