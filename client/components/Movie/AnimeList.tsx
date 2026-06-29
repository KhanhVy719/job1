'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from "next/link";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';

const MovieSlider: React.FC<{movies: IMovie[]}> = ({ movies }) => {
    const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

    return (<>
        <div className='flex max-w-full w-full relative'>
            <div className=" w-full text-white overflow-hidden ">
                <Swiper
                    modules={[Thumbs, Autoplay, EffectFade]}
                    spaceBetween={0}
                    slidesPerView={1}
                    effect="fade"
                    fadeEffect={{ crossFade: true }}
                    speed={1200}
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    autoplay={{
                        delay: 5000,
                        disableOnInteraction: false,
                    }}
                    loop={true}
                    className="h-[230px] md:h-[350px] lg:h-[450px] rounded-3xl"
                >
                    {movies.map((movie, index) => (
                        <SwiperSlide key={index}>
                            {/* FIX: Changed wrapping Link to div to prevent <a> inside <a> error */}
                            <div className="relative w-full h-full overflow-hidden">
                                
                                {/* FIX: Added absolute positioned Link for the main slide click */}
                                <Link href={`/phim/${movie.slug}`} className="absolute inset-0 z-10" aria-label={movie.name}></Link>

                                <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none">

                                    <div className={`absolute inset-0 transition-transform duration-[500ms] ease-out `}>
                                        <Image
                                            src={movie.thumb_url}
                                            alt={movie.name}
                                            width={1920}
                                            height={1080}
                                            loading="lazy"

                                            className='object-cover h-full'
                                        />
                                    </div>
                                    <div
                                        className="h-full w-[70%] left-0 rounded-[1px] z-[1] absolute bottom-[0] bg-[linear-gradient(270deg,rgba(47,51,70,0)_0%,rgba(47,51,70,0.05)_16%,rgba(47,51,70,0.3)_30%,rgba(47,51,70,0.5)_43%,rgba(47,51,70,0.8)_55%,rgba(47,51,70,0.95)_68%,rgba(47,51,70,1)_82%,rgb(47,51,70)_98%)]" />

                                </div>

                                {/* FIX: Added pointer-events-none to container so clicks pass through to background link, 
                                    but added z-[20] to sit above the background link */}
                                <div className="relative z-[20] flex items-center h-full px-5 lg:px-6 pointer-events-none">
                                    <div
                                        className={`max-w-xl text-left space-y-4  transition-all  ease-out duration-[500ms] `}
                                    >
                                        <h3 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white">{movie.name}</h3>

                                        <h3 className="text-sm text-primary opacity-80">{movie.origin_name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                                            <span className="border border-primary text-primary text-[11px] rounded px-1 py-0.5">IMDb <span className='text-white font-medium'>{movie.tmdb?.vote_average
                                                ? parseFloat(movie.tmdb.vote_average.toFixed(1)).toString()
                                                : 'N/A'
                                            }</span></span>

                                            <span className="bg-[linear-gradient(220deg,rgb(var(--primary)),rgb(var(--primary-light)/1))] text-black font-bold text-[11px] rounded px-1.5 py-0.5">{movie.quality}</span>
                                            <span className="bg-white font-medium text-black text-[11px] rounded px-1.5 py-0.5">{movie.episode_total}</span>

                                            <span className="bg-[#ffffff10] text-gray-300 text-[11px] rounded px-1.5 py-0.5">{movie.year}</span>
                                            <span className="bg-[#ffffff10] text-gray-300 text-[11px] rounded px-1.5 py-0.5">{movie.time}</span>

                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {movie.category.map((genre, i) => (
                                                <React.Fragment key={i}>
                                                    {/* FIX: Added pointer-events-auto to enable clicking this specific link */}
                                                    <Link href={`/c/${genre.slug}`} className="text-[12px] bg-gray-500/20 space-x-2 py-1 px-2 transition-colors rounded-md pointer-events-auto hover:bg-gray-500/40 relative z-30">
                                                        <span className="text-gray-200">{genre.name.replace(/\s*phim\s*/gi, ' ').trim().replace(/\s+/g, ' ')}</span>
                                                    </Link>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        <p className="text-sm text-white w-[80%] opacity-80 leading-relaxed hidden md:line-clamp-3">
                                            {movie.content}
                                        </p>
                                        <div className="pt-3 hidden lg:flex items-center gap-4">
                                            {/* FIX: Added pointer-events-auto to enable clicking this specific link */}
                                            <Link href={`/phim/${movie.slug}`} className="h-16 w-16 flex items-center justify-center bg-[linear-gradient(39deg,rgb(var(--primary)),rgb(var(--primary-light)/1))] rounded-full  transition-colors bg-white pointer-events-auto relative z-30 hover:scale-105 transform duration-200">
                                                <i className="fa-solid fa-play text-black text-2xl"></i>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}

                </Swiper>

                <div
                    className={`absolute hidden lg:flex swiper-thumb2 bottom-[-1.5rem]   xl:bottom-[-2.5rem]   justify-center items-center z-20 w-full transition-all duration-700 ease-out '
          }`}
                >
                    <Swiper
                        onSwiper={setThumbsSwiper}
                        modules={[Thumbs]}
                        spaceBetween={13}
                        slidesPerView={20}
                        watchSlidesProgress={true}
                        className="top-slide-small w-full"
                        breakpoints={{
                            320: {
                                slidesPerView: 3,
                                spaceBetween: 5
                            },
                            768: {
                                slidesPerView: 16,
                                spaceBetween: 10
                            },
                            1240: {
                                slidesPerView: 17,
                                spaceBetween: 13
                            },
                            1640: {
                                slidesPerView: 20,
                                spaceBetween: 13
                            },
                        }}
                    >
                        {movies.map((movie, index) => (
                            <SwiperSlide key={index} className="cursor-pointer rounded-full overflow-hidden transition-opacity swiper-slide-thumb xl:rounded-md">
                                <Image
                                    src={movie.poster_url}
                                    alt={`${movie.name} thumbnail`}
                                    width={130}
                                    height={90}
                                    loading="lazy"

                                    className='xl:w-[130px] xl:h-[90px] w-[57px] h-[57px] '
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </div>
    </>
    );
};

export default MovieSlider;