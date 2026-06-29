"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import MovieListHover from "./Hover/MovieList";
import { useRouter } from 'next/router';
import Loader from "@/components/loading/list";

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
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await new Promise((res) => setTimeout(res, 300));

            setCurrentMovie(currentMovie);
            setLoading(false);
        };

        fetchData();
    }, []);


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
            {loading ? (<>
                <Loader />
            </>) : (<>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {movies.map((movie) => (
                        <div key={movie.id}>
                            <Link href="/" className="flex flex-col h-full">
                                <div
                                    className="relative"
                                    onMouseEnter={(e) => handleMouseActivity(movie, e)}
                                    onMouseMove={(e) => handleMouseActivity(movie, e)}
                                    onMouseLeave={handleMouseLeave}
                                    onPointerMove={(e) => handleMouseActivity(movie, e)}

                                >
                                    <Image
                                        width={300}
                                        height={500}
                                        src={movie.thumbnail}
                                        alt={movie.title}
                                        style={{ objectFit: "cover" }}
                                        loading="lazy"

                                        className="rounded-xl w-full max-h-[300px] min-h-[250px] h-full"
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

                                <div className="px-4 mt-2 text-center">
                                    <h3 className="text-sm font-semibold truncate text-white">
                                        {movie.title}
                                    </h3>
                                    <p className="text-xs mt-1.5 text-gray-400">{movie.subtitle}</p>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div></>)}
            <div className="w-full flex items-center justify-center my-20">
                <div className="flex items-center space-x-3">
                    <button className="h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center">
                        <i className="fa-solid fa-arrow-left text-gray-400"></i>
                    </button>
                    <div className="h-[50px] px-8 rounded-full bg-[#2F3346] flex items-center justify-center space-x-1.5">
                        <div className="text-white text-sm">Trang</div>
                        <input className="text-white   w-auto   text-[13px] text-center px-3 py-1.5 outline-0 rounded-md max-w-[50px] font-bold flex items-center justify-center border border-gray-600 focus:border-gray-500 bg-transparent placeholder:text-[#7a7c81]l" max="461" type="number" value="1" />
                        <div className="text-white text-sm">/461</div>

                    </div>
                    <button className="h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-white"></i>
                    </button>
                </div>
            </div>
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
        </div >
    );
};

export default MovieSlider;
