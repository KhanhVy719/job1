"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from "next/dynamic";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { getViewerLanguageRequestHeaders } from "@/utils/viewer-language";
import { useRouter } from "next/router";
import { GetServerSideProps } from 'next';
import { NextSeo } from 'next-seo';
import { useSearchFilters } from "@/hooks/useSearch";

const MovieList = dynamic(() => import("@/components/Movie/MovieGird"), {
  ssr: true,
});

const PhimLe: React.FC<{
  initialMovies: IMovie[];
  initialPagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
  initialType: string;
}> = ({ initialMovies, initialPagination }) => {
  const router = useRouter();

  const [filter, setFilter] = useState(false);
  const [film, setFilm] = useState<IMovie[]>(initialMovies);
  const [pageInfo, setPageInfo] = useState(initialPagination);
  const { filters } = useSearchFilters();

  const listRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const currentYear = new Date().getFullYear();
  const pageNum = router.query.trang ? Number(router.query.trang) : 1;

  const seoTitle = `Phim Lẻ Hay ${currentYear} - Xem Phim Lẻ Mới Nhất ${pageNum > 1 ? `- Trang ${pageNum}` : ''}`;
  const seoDesc = `Danh sách phim bộ mới nhất ${currentYear}, tuyển tập phim bộ hay, phim tình cảm, hành động. Xem phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan Full HD, Vietsub, Thuyết minh nhanh nhất.`;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}/phim-le${pageNum > 1 ? `?trang=${pageNum}` : ''}`;

  useEffect(() => {
    setFilm(initialMovies);
    setPageInfo(initialPagination);
  }, [initialMovies, initialPagination]);

  const getTypeCode = useCallback(() => {
    if (router.pathname.includes("/phim-bo")) return "tv";
    if (router.pathname.includes("/phim-le")) return "movie";

    const paramType = router.query["loai"];
    return (Array.isArray(paramType) ? paramType[0] : paramType) || "ALL";
  }, [router.pathname, router.query]);

  const [tempFilters, setTempFilters] = useState({
    country: "ALL",
    type: "ALL",
    rank: "ALL",
    genres: "ALL",
    versions: "ALL",
    years: "ALL",
    sort: "createdAt",
  });


  const fetchMoviesNow = useCallback(
    async (queryParams: Record<string, string | number | string[] | undefined>): Promise<void> => {


      const apiParams: Record<string, string | number | string[] | undefined> = {
        limit: 24,
        page: 1,
        ...queryParams
      };

      if (apiParams["quoc-gia"]) { apiParams.countries = apiParams["quoc-gia"]; delete apiParams["quoc-gia"]; }
      if (apiParams["the-loai"]) { apiParams.genres = apiParams["the-loai"]; delete apiParams["the-loai"]; }
      if (apiParams.nam) { apiParams.years = apiParams.nam; delete apiParams.nam; }
      if (apiParams.loai) { apiParams.type = apiParams.loai; delete apiParams.loai; }
      if (apiParams["sap-xep"]) { apiParams.sort = apiParams["sap-xep"]; delete apiParams["sap-xep"]; }
      if (apiParams.trang) { apiParams.page = apiParams.trang; delete apiParams.trang; }

      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === "ALL") delete apiParams[key];
      });

      const response = await axiosInstance.get(API_ENDPOINTS.search, { params: apiParams });

      if (response.data.status) {
        setFilm(response.data.data.items);
        setPageInfo(response.data.data.pagination);
      }

    }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (router.isReady) {
        setTempFilters({
          country: (router.query["quoc-gia"] as string) || "ALL",
          type: getTypeCode(),
          rank: (router.query["xep-hang"] as string) || "ALL",
          genres: (router.query["the-loai"] as string) || "ALL",
          versions: (router.query["phien-ban"] as string) || "ALL",
          years: (router.query.nam as string) || "ALL",
          sort: (router.query["sap-xep"] as string) || "createdAt",
        });
      }
      return;
    }

    if (router.isReady) {
      const currentType = getTypeCode();
      setTempFilters({
        country: (router.query["quoc-gia"] as string) || "ALL",
        type: currentType,
        rank: (router.query["xep-hang"] as string) || "ALL",
        genres: (router.query["the-loai"] as string) || "ALL",
        versions: (router.query["phien-ban"] as string) || "ALL",
        years: (router.query.nam as string) || "ALL",
        sort: (router.query["sap-xep"] as string) || "createdAt",
      });

      const currentApiParams: Record<string, string | number | string[] | undefined> = {
        ...router.query
      };

      if (currentType !== "ALL") {
        currentApiParams["type"] = currentType;
      }
      delete currentApiParams["loai"];
      fetchMoviesNow(currentApiParams);
    }
  }, [router.isReady, router.query, getTypeCode, fetchMoviesNow]);

  const selectFilter = (key: keyof typeof tempFilters, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setFilter(false);

    const queryObj: Record<string, string | number | string[] | undefined> = {
      ...router.query,
      trang: "1"
    };

    const mapping = [
      { key: "quoc-gia", value: tempFilters.country },
      { key: "loai", value: tempFilters.type },
      { key: "xep-hang", value: tempFilters.rank },
      { key: "the-loai", value: tempFilters.genres },
      { key: "phien-ban", value: tempFilters.versions },
      { key: "nam", value: tempFilters.years },
      { key: "sap-xep", value: tempFilters.sort },
    ];

    mapping.forEach(item => {
      if (item.value === "ALL" || !item.value) delete queryObj[item.key];
      else queryObj[item.key] = item.value;
    });

    if (tempFilters.type === "movie" && router.pathname.includes("/phim-le") === false) {
      delete queryObj["loai"];
      router.push({ pathname: '/phim-le', query: queryObj });
      return;
    }
    else if (tempFilters.type === "tv" && router.pathname.includes("/phim-bo") === false) {
      delete queryObj["loai"];
      router.push({ pathname: '/phim-bo', query: queryObj });
      return;
    }
    else if (tempFilters.type === "ALL") {
      router.push({ pathname: '/tim-kiem', query: queryObj });
      return;
    }

    router.push({
      pathname: router.pathname,
      query: { ...router.query, ...queryObj }
    }, undefined, { shallow: true, scroll: false });
  };

  const updatePage = (newPage: number) => {
    const queryObj: Record<string, string | number | string[] | undefined> = { ...router.query, trang: newPage.toString() };
    const currentType = getTypeCode();
    if (currentType !== "ALL") queryObj["loai"] = currentType;

    router.push({
      pathname: router.pathname,
      query: queryObj
    }, undefined, { shallow: true, scroll: false });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPage = parseInt(e.target.value);
    if (!isNaN(newPage) && newPage > 0 && newPage <= pageInfo.totalPages) {
      updatePage(newPage);
    }
  };

  const { country: Country, type: Type, rank: Rank, genres: GenreCode, versions: Versions, years: Years, sort: Sort } = tempFilters;
  const currentPage = Number(router.query.trang) || 1;

  return (
    <>
      <NextSeo
        title={seoTitle}
        description={seoDesc}
        canonical={canonicalUrl}
        openGraph={{
          type: 'website',
          url: canonicalUrl,
          title: seoTitle,
          description: seoDesc,
        }}
        noindex={currentPage > 1}
        nofollow={currentPage > 1}
      />

      <div className='pb-28 pt-5 px-5 lg:px-6' ref={listRef}>
        <div className='text-2xl font-semibold text-white'>Phim Lẻ</div>
        <div className='mt-3'>
          <button onClick={() => setFilter(!filter)} className="inline-flex items-center gap-2 bg-[rgba(var(--bg-body))] py-0 pl-[0.5rem] pr-[0.75rem] h-[30px] text-white cursor-pointer font-medium rounded-[0.3rem]">
            <i className={`fa-solid fa-filter text-xs ${filter && "text-primary"}`}></i>
            <span className='text-[15px]'>Lẻ lọc</span>
          </button>

          {filter && (
            <div className="border-1 border rounded-xl border-[#ffffff10] -mt-[15px] mb-12">
              <div className='px-4 mt-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Quốc gia:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Countries.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("country", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Country === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.name}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Loại phim:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Type.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("type", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Type === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.title}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Xếp hạng:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Rank.map((item, index) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("rank", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Rank === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{index > 0 ? (<><span className='mr-1 font-bold'>{item.code}</span><span>({item.title})</span></>) : (<>{item.title}</>)}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Thể loại:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Genres.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("genres", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${GenreCode === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.name}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Phiên bản:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Versions.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("versions", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Versions === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.title}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Năm sản xuất:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Years.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("years", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Years === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.title}</button>
                    </li>
                  ))}
                  <li>
                    <div className="relative w-auto flex items-center">
                      <input placeholder="Nhập năm" className="text-white w-auto pl-8 text-[13px] flex items-center pr-4 py-1.5 outline-0 rounded-md max-w-[108px] border border-transparent focus:border-white bg-[#282a33] placeholder:text-[#7a7c81]" type="text" onChange={(e) => selectFilter("years", e.target.value)} value={Years === "ALL" || filters.Years.some(y => y.code === Years) ? "" : Years} />
                      <button className="absolute py-2 flex items-center px-3 left-0 border-1 outline-0 text-sm text-[#7a7c81] top-[2px]"><i className="fa-sharp fa-solid fa-magnifying-glass"></i></button>
                    </div>
                  </li>
                </ul>
              </div>

              <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                  <div className='py-1.5 text-sm font-medium text-white'>Sắp xếp:</div>
                </div>
                <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                  {filters.Sort.map((item) => (
                    <li key={item.code}>
                      <button onClick={() => selectFilter("sort", item.code)} className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${Sort === item.code ? 'border-gray-600 text-primary' : 'text-gray-300 border-transparent hover:text-primary'}`}>{item.title}</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='px-4 py-3  space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'></div>
                <div className="flex flex-wrap gap-x-3 items-center gap-y-3 w-full">
                  <div>
                    <button onClick={applyFilter} className='bg-primary text-black flex items-center justify-center space-x-2 px-5 py-2.5 border border-primary rounded-full text-sm font-semibold hover:opacity-90 transition-opacity'>
                      <span>Lọc tìm kiếm</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                  <div>
                    <button className=' text-white flex items-center justify-center space-x-2 px-5 py-2.5 border-gray-500 border rounded-full text-sm font-semibold' onClick={() => setFilter(false)}>
                      <span>Đóng</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='my-6 relative min-h-[500px]'>
          <MovieList movies={film} />

          {film.length > 0 && (
            <div className="w-full flex items-center justify-center my-20">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updatePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-black transition-colors'}`}>
                  <i className="fa-solid fa-arrow-left text-gray-400"></i>
                </button>

                <div className="h-[50px] px-8 rounded-full bg-[#2F3346] flex items-center justify-center space-x-1.5">
                  <div className="text-white text-sm">Trang</div>
                  <input
                    className="text-white w-auto text-[13px] text-center px-3 py-1.5 outline-0 rounded-md max-w-[50px] font-bold flex items-center justify-center border border-gray-600 focus:border-gray-500 bg-transparent placeholder:text-[#7a7c81]l"
                    max={pageInfo.totalPages}
                    type="number"
                    value={pageInfo.currentPage}
                    onChange={handlePageInputChange}
                  />
                  <div className="text-white text-sm">/{pageInfo.totalPages}</div>
                </div>

                <button
                  onClick={() => updatePage(currentPage + 1)}
                  disabled={currentPage >= pageInfo.totalPages}
                  className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${currentPage >= pageInfo.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-black transition-colors'}`}>
                  <i className="fa-solid fa-arrow-right text-white"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query ,req } = context;

  const type = "movie";

  const apiParams: Record<string, string | number | string[] | undefined> = {
    limit: 24,
    page: query.trang || 1,
    ...query,
    type: type
  };

  if (apiParams["quoc-gia"]) { apiParams.countries = apiParams["quoc-gia"]; delete apiParams["quoc-gia"]; }
  if (apiParams["the-loai"]) { apiParams.genres = apiParams["the-loai"]; delete apiParams["the-loai"]; }
  if (apiParams.nam) { apiParams.years = apiParams.nam; delete apiParams.nam; }
  if (apiParams.loai) {
    delete apiParams.loai;
    delete apiParams["type"];
    apiParams.type = type;
  }
  if (apiParams["sap-xep"]) { apiParams.sort = apiParams["sap-xep"]; delete apiParams["sap-xep"]; }
  if (apiParams.trang) { apiParams.page = apiParams.trang; delete apiParams.trang; }

  Object.keys(apiParams).forEach(key => {
    if (apiParams[key] === "ALL") delete apiParams[key];
  });

  try {
     const cookieHeader = req.headers.cookie || "";

    const headers = {
      Cookie: cookieHeader,
      "User-Agent": req.headers["user-agent"] || "NextJS-Server",
      ...getViewerLanguageRequestHeaders(cookieHeader),
    };
    const response = await axiosInstance.get(API_ENDPOINTS.search, {
      params: apiParams,
      headers:headers
    });

    if (response.data.status && response.data.data) {
      return {
        props: {
          initialMovies: response.data.data.items,
          initialPagination: response.data.data.pagination
        }
      };
    }
  } catch (error) {
    console.error("SSR Error:", error);
  }

  return {
    props: {
      initialMovies: [],
      initialPagination: {
        totalItems: 0,
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 24
      }
    }
  };
};

export default PhimLe;
