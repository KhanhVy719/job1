'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import Link from "next/link";

import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';


const MovieSlider: React.FC<{
  movies: IMovie[];
}> = ({ movies }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!movies?.length) {
    return null;
  }

  return (<>
    <div className="relative w-full  text-white overflow-hidden">

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
        loop={false}
        className=" h-[320px] md:h-[500px] lg:h-[670px]"
      >
        {movies.map((movie, index) => (
          <SwiperSlide key={index}>
            {({ isActive }) => (
              <div className="relative w-full h-full overflow-hidden">
         
                <div  className="absolute inset-0 z-0 overflow-hidden">

                  <Link href={`/phim/${movie.slug}`} className=" before:absolute  before:inset-0  before:bg-[url('/images/dotted.png')]  before:bg-repeat  before:opacity-20  before:z-10 before:content-['']"/>

                  <div className={`absolute inset-0 
                      transition-transform duration-[500ms] ease-out ${isActive ? ' translate-x-0' : ' translate-x-[100px]'} `}>
                    <Image
                      src={movie.thumb_url}
                      alt={movie.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      priority={index === 0}
                      sizes="100vw"
                    />

                    <div className="h-[20%] w-[100%] bg-[linear-gradient(359deg,rgba(var(--bg-body)/0)_1%,rgba(var(--bg-body)/0.05)_17%,rgba(var(--bg-body)/0.2)_31%,rgba(var(--bg-body)/0.39)_44%,rgba(var(--bg-body)/0.61)_56%,rgba(var(--bg-body)/0.8)_69%,rgba(var(--bg-body)/0.95)_83%,rgb(25,27,36)_99%)] rounded-[1px] z-[1] absolute top-[0]"></div>
                    <div
                      className="h-full w-[50%] left-0 rounded-[1px] z-[1] absolute bottom-[0] bg-[linear-gradient(270deg,rgba(var(--bg-body)/0)_0%,rgba(var(--bg-body)/0.05)_16%,rgba(var(--bg-body)/0.2)_30%,rgba(var(--bg-body)/0.39)_43%,rgba(var(--bg-body)/0.61)_55%,rgba(var(--bg-body)/0.8)_68%,rgba(var(--bg-body)/0.95)_82%,rgb(25,27,36)_98%)]" />
                    <div
                      className="h-full w-[100%] left-0 rounded-[1px] z-[1] absolute bottom-[0]   bg-[linear-gradient(0deg,rgba(var(--bg-body)/0.95)_0%,rgba(var(--bg-body)/0.85)_20%,rgba(var(--bg-body)/0.7)_40%,rgba(var(--bg-body)/0.5)_60%,rgba(var(--bg-body)/0.3)_80%,rgba(var(--bg-body)/0)_100%)]"
                    />
                    <div
                      className="h-full w-[50%] right-0 rounded-[1px] z-[1] absolute bottom-[0]  bg-[linear-gradient(90deg,rgba(var(--bg-body)/0)_0%,rgba(var(--bg-body)/0.02)_16%,rgba(var(--bg-body)/0.1)_30%,rgba(var(--bg-body)/0.2)_43%,rgba(var(--bg-body)/0.35)_55%,rgba(var(--bg-body)/0.5)_68%,rgba(var(--bg-body)/0.7)_82%,rgba(var(--bg-body)/0.85)_98%)]"
                    />
                  </div>

                  {/* FIX: Added 'pointer-events-none' to this container. 
                      This allows clicks on non-interactive areas (like empty space or plain text) 
                      to pass through to the main Link (z-10) behind it.
                  */}
                  <div className="relative z-[20] top-[-3rem]  lg:top-8 flex justify-center lg:justify-start items-center h-full  w-full px-5 sm:px-8 lg:px-10 pointer-events-none">
                    <div
                      className={`max-w-xl text-left space-y-3 lg:space-y-4 transition-all flex lg:block items-center justify-center flex-col  ease-out duration-[500ms] ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1/2'
                        }`}
                    >
                      <div className="flex items-center lg:ml-0 ml-12 justify-center lg:block h-[3rem] md:h-[4rem] lg:h-[5rem]  xl:h-[7rem] lg:w-max">
                        <Image
                          src={movie.title_logo}
                          alt={`${movie.origin_name} title`}
                          width={600}
                          height={600}
                          className='w-full h-full'
                        />

                      </div>

                      <h3 className="text-sm text-primary opacity-80 text-center lg:text-left">{movie.origin_name}</h3>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 ">
                        <span className="border border-primary text-primary text-[13px] rounded px-1 py-0.5">IMDb <span className='text-white font-medium'>{movie.tmdb?.vote_average
                          ? parseFloat(movie.tmdb.vote_average.toFixed(1)).toString()
                          : 'N/A'
                        }</span></span>

                        <span className="bg-[linear-gradient(220deg,rgb(var(--primary)),rgb(var(--primary-light)/1))] text-black font-bold text-[13px] rounded px-1.5 py-0.5">{movie.quality}</span>
                        <span className="bg-white font-medium text-black text-[13px] rounded px-1.5 py-0.5">tập {movie.episode_total}</span>

                        <span className="bg-[#ffffff10] text-gray-300 text-[13px] rounded px-1.5 py-0.5">{movie.year}</span>
                        <span className="bg-[#ffffff10] text-gray-300 text-[13px] rounded px-1.5 py-0.5">{movie.time}</span>

                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        {movie.category.map((genre, i) => (
                           /* FIX: Added 'pointer-events-auto' so these specific links can be clicked */
                          <div key={i} className="pointer-events-auto">
                            <Link href={`/c/${genre.slug}`} className="text-xs bg-white/10 hover:text-primary px-2 py-1 rounded transition-colors">
                              {genre.name}
                            </Link>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-white w-[80%] md:w-full opacity-80 pt-5 leading-relaxed text-center lg:text-left hidden md:line-clamp-3">
                        {movie.content}
                      </p>
                      
                      <div className="pt-3 hidden items-center gap-4 lg:flex pointer-events-auto">
                        <Link href={`/phim/${movie.slug}`} className="h-16 w-16 flex items-center justify-center bg-[linear-gradient(39deg,rgb(var(--primary)),rgb(var(--primary-light)/1))] rounded-full  transition-colors bg-white">
                          <i className="fa-solid fa-play text-black text-2xl"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </SwiperSlide>
        ))}

      </Swiper>

      <div
        className={`absolute swiper-thumb bottom-[3.5rem] w-full lg:w-auto  flex lg:bottom-[5.5rem] right-0 md:right-8 lg:right-10 z-[20] transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
          }`}
      >
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          spaceBetween={15}
          slidesPerView={6}
          watchSlidesProgress={true}
          className="top-slide-small lg:w-[650px] w-full flex"
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={index} className="cursor-pointer rounded-full lg:rounded-md overflow-hidden transition-opacity swiper-slide-thumb !w-[30px] !h-[30px] lg:!w-[85px] lg:!h-[48px]">
              <Image
                src={movie.thumb_url}
                alt={`${movie.name} thumbnail`}
                width={150}
                height={85}
                className='h-full'
                style={{ objectFit: 'cover' }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  </>
  );
};

export default MovieSlider;
