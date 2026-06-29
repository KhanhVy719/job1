"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import MovieListHover from "./Hover/MovieList";
import Loader from "@/components/loading/list";

// --- Interfaces ---

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

const MovieSlider: React.FC<{ movies: IMovie[] }> = ({ movies }) => {
  const [currentMovie, setCurrentMovie] = useState<IMovie | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 300));
      setLoading(false);
    };

    fetchData();
  }, []);

  const pendingActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    (movie: IMovie, targetElement: HTMLElement) => {
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
    movie: IMovie,
    e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>
  ) => {
    const currentTargetElement = e.currentTarget as HTMLElement;

    clearMoveDebounceTimer();
    clearPendingActionTimer();

    moveDebounceTimerRef.current = setTimeout(() => {
      showTooltip(movie, currentTargetElement);
    }, STATIONARY_DEBOUNCE_DELAY);
  };

  const handleMouseLeave = () => {
    clearMoveDebounceTimer();
    hideTooltip();
  };

  return (
    <div className="relative w-full ">
      {loading ? (
        <>
          <Loader />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {movies.map((movie) => (
              <div key={movie._id}>
                <Link href={`/phim/${movie.slug}`} className="flex flex-col h-full">
                  <div
                    className="relative"
                    onMouseEnter={(e) => handleMouseActivity(movie, e)}
                    onMouseMove={(e) => handleMouseActivity(movie, e)}
                    onMouseLeave={handleMouseLeave}
                    onPointerMove={(e) => handleMouseActivity(movie, e)}
                  >
                    {/* --- RENDER BADGES --- */}
                    {movie.badges && movie.badges.length > 0 && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {movie.badges.map((badge, index) => (
                          <span
                            key={`badge-${index}`}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-white text-black shadow-sm"
                            style={{ 
                              textTransform: 'uppercase'
                            }}
                          >
                            {badge.text}
                          </span>
                        ))}
                      </div>
                    )}

                    <Image
                      width={300}
                      height={500}
                      src={movie.poster_url}
                      alt={movie.name}
                      style={{ objectFit: "cover" }}
                      loading="lazy"
                      className="rounded-xl w-full max-h-[300px] min-h-[250px] h-full"
                    />
                    
                    <div className="absolute bottom-0 left-0 justify-center w-full flex">
                      {movie.lang &&
                        movie.lang.map((lang, i) => {
                          const isFirst = i === 0;

                          let content;
                          const baseClasses = " text-[11px] px-2 py-1";
                          let specificClasses;

                          switch (lang) {
                            case 0: // Phụ đề
                              specificClasses = `text-white bg-gray-500 ${
                                isFirst ? "rounded-tl" : ""
                              } ${!isFirst ? "rounded-tr" : ""}`;
                              content = "Phụ đề";
                              break;
                            case 1: // Thuyết Minh
                              specificClasses = `bg-white text-black ${
                                isFirst ? "rounded-tl" : ""
                              } ${!isFirst ? "rounded-tr" : ""}`;
                              content = "Thuyết Minh";
                              break;
                            case 2:
                              specificClasses = `text-white bg-green-600 ${
                                isFirst ? "rounded-tl" : ""
                              } ${!isFirst ? "rounded-tr" : ""}`;
                              content = "Lồng tiếng";
                              break;
                            default:
                              return null;
                          }

                          return (
                            <span
                              key={`lang-${i}`}
                              className={`${baseClasses} ${specificClasses}`}
                            >
                              {content}
                            </span>
                          );
                        })}
                    </div>
                  </div>

                  <div className="px-4 mt-2 text-center">
                    <h3 className="text-sm font-semibold truncate text-white">
                      {movie.name}
                    </h3>
                    <p className="text-xs mt-1.5 text-gray-400">
                      {movie.origin_name}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

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