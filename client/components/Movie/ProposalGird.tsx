"use client";

import React, { useState, useEffect } from "react";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import Loader from "@/components/loading/list";


const ProposalGird: React.FC<{ movies: IMovie[] }> = ({ movies }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 300));
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="relative w-full ">
      {loading ? (
        <>
          <Loader />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <div key={movie._id}>
                <Link href={`/phim/${movie.slug}`} className="flex flex-col h-full group">
                  <div className="relative w-full">
                    <Image
                      width={300}
                      height={450}
                      src={movie.poster_url}
                      alt={movie.name}
                      loading="lazy"
                      className="rounded-xl w-full aspect-[2/3] object-cover shadow-lg"
                    />

                    <div className="absolute bottom-0 left-0 justify-center w-full flex z-10">
                      {movie.lang && movie.lang.map((lang, i) => {
                        const isFirst = i === 0;

                        let content;
                        const baseClasses = " text-[11px] px-2 py-1";
                        let specificClasses;

                        switch (lang) {
                          case 0: 
                            specificClasses = `text-white bg-gray-500 ${isFirst ? 'rounded-tl' : ''} ${!isFirst ? 'rounded-tr' : ''}`;
                            content = 'Phụ đề';
                            break;
                          case 1: 
                            specificClasses = `bg-white text-black ${isFirst ? 'rounded-tl' : ''} ${!isFirst ? 'rounded-tr' : ''}`;
                            content = 'Thuyết Minh';
                            break;
                          case 2: 
                            specificClasses = `text-white bg-green-600 ${isFirst ? 'rounded-tl' : ''} ${!isFirst ? 'rounded-tr' : ''}`;
                            content = 'Lồng tiếng';
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

                  <div className="px-4 mt-4 text-center">
                    <h3 className="group-hover:text-primary text-sm font-semibold truncate text-white transition-colors">
                      {movie.name}
                    </h3>
                    <p className="text-xs mt-1.5 text-gray-400 truncate">{movie.origin_name}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div >
  );
};

export default ProposalGird;