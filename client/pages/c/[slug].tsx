"use client";

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from "next/dynamic";
import clsx from "clsx";
import styles from './styles.module.css';
import { useRouter } from "next/router";
import { GetServerSideProps } from 'next';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { GRADIENTS } from '@/utils/Items';
import { useSearchFilters } from "@/hooks/useSearch";

const MovieList = dynamic(() => import("@/components/Movie/MovieGird"), {
  ssr: true,
});

type Params = {
  limit: number;
  page: number;
  genres?: string;
};


const Chude: React.FC<{
  initialMovies: IMovie[];
  initialPagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
  currentSlug: string;
}> = ({ initialMovies, initialPagination, currentSlug }) => {
  const router = useRouter();
  const { filters } = useSearchFilters();

  const [bgMain, setBgMain] = useState("#ed6e9f");
  const [film, setFilm] = useState<IMovie[]>(initialMovies);
  const [pageInfo, setPageInfo] = useState(initialPagination);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const randomColor = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    setBgMain(randomColor);
  }, [currentSlug]);

  useEffect(() => {
    setFilm(initialMovies);
    setPageInfo(initialPagination);
  }, [initialMovies, initialPagination]);

  const fetchMoviesNow = useCallback(async (newPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      const genreCode = currentSlug || (router.query.slug as string);

      if (genreCode && genreCode !== "ALL") {
        params.append("genres", genreCode);
      }

      params.append("page", newPage.toString());
      params.append("limit", "24");

      const response = await axiosInstance.get(API_ENDPOINTS.search, {
        params: params,
      });

      if (response.data.status) {
        setFilm(response.data.data.items);
        setPageInfo(response.data.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [currentSlug, router.query.slug]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageInfo.totalPages) {
      fetchMoviesNow(newPage);

      router.push({
        pathname: router.pathname,
        query: { ...router.query, trang: newPage }
      }, undefined, { shallow: true, scroll: true });
    }
  };


  const getCurrentTitle = () => {
    const found = filters.Genres.find(g => g.code === currentSlug);
    return found ? found.name : "Danh sách phim";
  };

  return (
    <>
      <div
        className={clsx(styles.Header, styles.background)}
        style={{
          backgroundColor: bgMain,
          transition: "background-color 0.5s ease"
        }}
      ></div>

      <div className={clsx(styles.main)}>
        <div className={clsx(styles.title)}>{getCurrentTitle()}</div>

        <div className={clsx(styles.loader)}>
          {loading ? (
            <div className={clsx(styles.loading)}>Đang tải phim...</div>
          ) : (
            <MovieList movies={film} />
          )}

          {film.length > 0 && (
            <div className={clsx(styles.PAGINATION)}>
              <div className={clsx(styles.PAGINATION_HEADER)}>
                <button
                  onClick={() => handlePageChange(pageInfo.currentPage - 1)}
                  disabled={pageInfo.currentPage <= 1}
                  className={clsx(
                    styles.i,
                    pageInfo.currentPage <= 1 ? styles.j : styles.k
                  )}
                >
                  <i className={clsx("fa-solid fa-arrow-left", styles.PAGINATIO_ICON)}></i>
                </button>

                <div className={clsx(styles.PAGINATIO_LAYOUTS)}>
                  <div className={clsx(styles.PAGINATIO_PAGE)}>Trang</div>
                  <input
                    className={clsx(styles.o, "placeholder:text-[#7a7c81]l")}
                    max={pageInfo.totalPages}
                    type="number"
                    value={pageInfo.currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0 && val <= pageInfo.totalPages) {
                        handlePageChange(val);
                      }
                    }}
                  />
                  <div className={clsx(styles.PAGINATIO_PAGE)}>/ {pageInfo.totalPages}</div>
                </div>

                <button
                  onClick={() => handlePageChange(pageInfo.currentPage + 1)}
                  disabled={pageInfo.currentPage >= pageInfo.totalPages}
                  className={clsx(
                    styles.i,
                    pageInfo.currentPage >= pageInfo.totalPages ? styles.p : styles.q
                  )}
                >
                  <i className={clsx("fa-solid fa-arrow-right", styles.PAGINATIO_ICON)}></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<{
  initialMovies: IMovie[];
  initialPagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
  currentSlug: string;
}> = async (context) => {

  const { params, query, req } = context;

  const slug = (params?.slug as string) || "ALL";
  const page = Number(query.trang) || 1;

  try {
    const apiParams: Params = {
      limit: 24,
      page,
    };

    if (slug !== "ALL") {
      apiParams.genres = slug;
    } 
    
    const response = await axiosInstance.get(API_ENDPOINTS.search, {
      params: apiParams,
      headers: {
        Cookie: req.headers.cookie || "",
        "User-Agent": req.headers["user-agent"] || "NextJS-Server",
      },
    });

console.log(API_ENDPOINTS.search,apiParams)
    if (response.data.status && response.data.data) {
      return {
        props: {
          initialMovies: response.data.data.items,
          initialPagination: response.data.data.pagination,
          currentSlug: slug
        }
      };
    }
    return {
      props: {
        initialMovies: [],
        initialPagination: {
          totalItems: 0,
          currentPage: page,
          totalPages: 1,
          itemsPerPage: 24
        },
        currentSlug: slug
      }
    }

  } catch {
    return {
      props: {
        initialMovies: [],
        initialPagination: {
          totalItems: 0,
          currentPage: page,
          totalPages: 1,
          itemsPerPage: 24
        },
        currentSlug: slug
      }
    };
  }
};

export default Chude;
