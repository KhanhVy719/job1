'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from "next/link";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';

interface Movie {
    title: string;
    alias: string;
    bgImage: string;
    titleImage: string;
    thumbImage: string;
    quality?: string;
    rating: string;
    year: string;
    imdb: string;
    duration: string;
    genres: string[];
    description: string;
}

interface MovieSliderProps {
    movies: Movie[];
}
const MovieSlider: React.FC<MovieSliderProps> = ({ movies }) => {
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
                            <div className="relative w-full h-full overflow-hidden">
                                <div className="absolute inset-0 z-0 overflow-hidden bg-black">

                                    <div className={`absolute inset-0 transition-transform duration-[500ms] ease-out `}>
                                        <Image
                                            src={movie.thumbImage}
                                            alt={movie.title}
                                            width={1920}
                                            height={1080}
                                            loading="lazy"

                                            className='object-cover h-full'
                                        />
                                    </div>
                                    <div
                                        className="h-full w-[70%] left-0 rounded-[1px] z-[1] absolute bottom-[0] bg-[linear-gradient(270deg,rgba(47,51,70,0)_0%,rgba(47,51,70,0.05)_16%,rgba(47,51,70,0.3)_30%,rgba(47,51,70,0.5)_43%,rgba(47,51,70,0.8)_55%,rgba(47,51,70,0.95)_68%,rgba(47,51,70,1)_82%,rgb(47,51,70)_98%)]" />

                                </div>

                                <div className="relative z-[10] flex items-center h-full px-5 lg:px-6 ">
                                    <div
                                        className={`max-w-xl text-left space-y-4  transition-all  ease-out duration-[500ms] `}
                                    >
                                        <h3 className="text-3xl font-bold text-white">{movie.title}</h3>

                                        <h3 className="text-sm text-primary opacity-80">{movie.alias}</h3>
                                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                                            {movie.imdb && <span className="text-primary border border-primary font-bold px-2 py-0.5 rounded">IMDb {movie.imdb}</span>}
                                            {movie.quality && <span className="bg-red-500 text-white font-bold px-2 py-0.5 rounded">{movie.quality}</span>}
                                            {movie.rating && <span className="border bg-white text-black font-semibold px-2 py-0.5 rounded">{movie.rating}</span>}
                                            {movie.year && <span className="border bg-white/5 rounded text-white font-semibold px-2 py-0.5 ">{movie.year}</span>}
                                            {movie.duration && <span className="border bg-white/5 rounded text-white font-semibold px-2 py-0.5 ">{movie.duration}</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {movie.genres.map((genre, i) => (
                                                <Link href="#" key={i} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
                                                    {genre}
                                                </Link>
                                            ))}
                                        </div>
                                        <p className="text-sm text-white w-[80%] opacity-80 pt-5 leading-relaxed hidden md:line-clamp-3">
                                            {movie.description}
                                        </p>
                                        <div className="pt-3 hidden lg:flex items-center gap-4">
                                            <Link href="#" className="h-16 w-16 flex items-center justify-center bg-[linear-gradient(39deg,rgb(var(--primary)),rgb(var(--primary-light)/1))] rounded-full  transition-colors bg-white">
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
                                    src={movie.bgImage}
                                    alt={`${movie.title} thumbnail`}
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