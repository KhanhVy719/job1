"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from "next/dynamic";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { getViewerLanguageRequestHeaders } from "@/utils/viewer-language";
import { useRouter } from "next/router";
import { GetServerSideProps } from 'next';
import { NextSeo } from 'next-seo';
import { useSearchFilters } from "@/hooks/useSearch";

// Dynamic import for MovieList component
const MovieList = dynamic(() => import("@/components/Movie/MovieGird"), {
  ssr: true,
});


interface FilterItem {
  code: string;
  name?: string;
  title?: string;
  slug?: string;
}

interface Filters {
  Countries: FilterItem[];
  Type: FilterItem[];
  Rank: FilterItem[];
  Genres: FilterItem[];
  Versions: FilterItem[];
  Sort: FilterItem[];
  Years: FilterItem[];
}

interface Pagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

interface QuocGiaProps {
  initialMovies: IMovie[];
  initialPagination: Pagination;
  initialCountryCode: string;
}

const QuocGia: React.FC<QuocGiaProps> = ({ initialMovies, initialPagination }) => {
  const router = useRouter();
  const slug = router.query.slug;
  // Assuming useSearchFilters returns an object with a 'filters' property of type Filters
  const { filters } = useSearchFilters() as { filters: Filters }; 
  
  const [filter, setFilter] = useState(false);
  const [film, setFilm] = useState<IMovie[]>(initialMovies);
  const [pageInfo, setPageInfo] = useState<Pagination>(initialPagination);
  
  const listRef = useRef<HTMLDivElement>(null);

  // Synchronize state with initial props when they change
  useEffect(() => {
    setFilm(initialMovies);
    setPageInfo(initialPagination);
  }, [initialMovies, initialPagination]);

  // Function to determine the country code from slug or query params
  const getCountryCode = useCallback(() => {
    const slugCode = Array.isArray(slug) ? slug[0] : slug;
    
    if (slugCode) {
      const found = filters.Countries.find(item => item.code === slugCode || item.slug === slugCode); // check both code and slug
      if (found) return found.code;
    }

    const paramCountry = router.query["quoc-gia"];
    const paramCountryCode = Array.isArray(paramCountry) ? paramCountry[0] : paramCountry;
    
    return paramCountryCode || "ALL";
  }, [slug, router.query, filters.Countries]);

  const [tempFilters, setTempFilters] = useState({
    country: "ALL",
    type: "ALL",
    rank: "ALL",
    genres: "ALL",
    versions: "ALL",
    years: "ALL",
    sort: "createdAt",
  });

  // Effect to update tempFilters from router query when router is ready
  useEffect(() => {
    if (!router.isReady) return;

    // The dependency array should include router.isReady and getCountryCode.
    // However, the original code's logic is sound if getCountryCode is stable,
    // and `router.query` changes are what drive the update.
    // The warning in the prompt is about **router.isReady** missing, which is fixed by adding it.
    // getCountryCode is already in the dependency array.

    setTempFilters({
      country: getCountryCode(),
      type: (router.query.loai as string) || "ALL",
      rank: (router.query["xep-hang"] as string) || "ALL",
      genres: (router.query["the-loai"] as string) || "ALL",
      versions: (router.query["phien-ban"] as string) || "ALL",
      years: (router.query.nam as string) || "ALL",
      sort: (router.query["sap-xep"] as string) || "createdAt",
    });
  }, [router.isReady, router.query, getCountryCode]); // FIX: Added router.isReady

  // Function to fetch movies based on query parameters
  const fetchMoviesNow = useCallback(async (queryParams: Record<string, string | number | string[] | undefined>): Promise<void> => {
    try {
      const apiParams: Record<string, string | number | string[] | undefined> = {
        limit: 24,
        page: 1,
        ...queryParams
      };

      // Mapping for URL query keys to API keys
      const keyMap: Record<string, string> = {
        "quoc-gia": "countries",
        "the-loai": "genres",
        "nam": "years",
        "loai": "type",
        "sap-xep": "sort",
        "trang": "page",
        "xep-hang": "rank", // Added missing rank mapping for fetching
        "phien-ban": "versions", // Added missing versions mapping for fetching
      };

      // Transform query keys to API keys
      Object.keys(keyMap).forEach(key => {
        if (apiParams[key]) {
          apiParams[keyMap[key]] = apiParams[key];
          delete apiParams[key];
        }
      });

      // Remove "ALL" and slug from API params
      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === "ALL") delete apiParams[key];
      });

      delete apiParams.slug; // Remove slug from API params

      const response = await axiosInstance.get(API_ENDPOINTS.search, { params: apiParams });
      
      if (response.data.status) {
        setFilm(response.data.data.items);
        setPageInfo(response.data.data.pagination);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  // Effect to handle URL parameter changes related to country code
  useEffect(() => {
    if (!router.isReady) return;

    // The original code here seems to be missing its main logic body 
    // after determining `currentApiParams` and `currentCode`.
    // Since `router.query` is already tracked in the `useEffect` above for `tempFilters`,
    // and `applyFilter` handles the *change* logic, this specific `useEffect` can likely be removed or kept empty.
    // If it was intended to trigger `fetchMoviesNow` on all router query changes, that logic should be here.
    // Based on the structure, the `applyFilter` and `updatePage` functions are responsible for fetching.
    // Keeping it empty as in the original code, but noting it's redundant/incomplete.

  }, [router.isReady, router.query, getCountryCode]); // FIX: Added router.isReady

  const selectFilter = (key: keyof typeof tempFilters, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setFilter(false);

    // Get current query object and reset page to 1
    const queryObj: Record<string, string> = { ...router.query as Record<string, string>, trang: "1" };
    
    const mappings = {
      "quoc-gia": tempFilters.country,
      "loai": tempFilters.type,
      "xep-hang": tempFilters.rank,
      "the-loai": tempFilters.genres,
      "phien-ban": tempFilters.versions,
      "nam": tempFilters.years,
      "sap-xep": tempFilters.sort,
    };

    // Update queryObj with temporary filters
    Object.entries(mappings).forEach(([key, value]) => {
      if (value === "ALL" || !value) delete queryObj[key];
      else queryObj[key] = value;
    });

    const currentCode = getCountryCode();
    
    // Special handling for country change that requires path change
    if (tempFilters.country !== "ALL" && tempFilters.country !== currentCode) {
      // Find the country slug corresponding to the selected code
      const selectedCountry = filters.Countries.find(g => g.code === tempFilters.country);

      if (selectedCountry) {
        delete queryObj["quoc-gia"];
        delete queryObj.slug;
        
        // Push to new country's slug path
        router.push({
          pathname: `/quoc-gia/${selectedCountry.code}`,
          query: queryObj
        });
        return; // Exit to prevent the shallow push below
      }
    }
    
    // Shallow push for other filter changes
    router.push({
      pathname: router.pathname,
      query: queryObj
    }, undefined, { shallow: true, scroll: false }).then(() => {
        // Fetch new data after URL update
        fetchMoviesNow(queryObj); 
    });
  };

  const updatePage = (newPage: number) => {
    const queryObj = { ...router.query, trang: newPage.toString() };
    router.push({
      pathname: router.pathname,
      query: queryObj
    }, undefined, { shallow: true, scroll: false }).then(() => {
        fetchMoviesNow(queryObj);
        listRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPage = parseInt(e.target.value);
    if (!isNaN(newPage) && newPage > 0 && newPage <= pageInfo.totalPages) {
      updatePage(newPage);
    }
  };

  const getCurrentCountryName = useMemo(() => {
    // Determine the country code to display (either temp filter or current URL code)
    const currentCode = filter ? tempFilters.country : getCountryCode();
    const found = filters.Countries.find(g => g.code === currentCode);
    return found ? found.name : "Tất cả quốc gia";
  }, [filter, tempFilters.country, getCountryCode, filters.Countries]);

  const { country: Country, type: Type, rank: Rank, genres: GenreCode, versions: Versions, years: Years, sort: Sort } = tempFilters;
  const currentPage = Number(router.query.trang) || 1;
  const currentYear = new Date().getFullYear();
  const pageNum = Number(router.query.trang) || 1;

  // SEO
  const seoTitle = `Phim ${getCurrentCountryName} Hay Nhất ${currentYear}${pageNum > 1 ? ` - Trang ${pageNum}` : ''}`;
  const seoDesc = `Danh sách phim bộ mới nhất ${currentYear}, tuyển tập phim bộ hay, phim tình cảm, hành động. Xem phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan Full HD, Vietsub, Thuyết minh nhanh nhất.`;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}/${router.asPath.split('?')[0]}${pageNum > 1 ? `?trang=${pageNum}` : ''}`; // Use router.asPath for better canonical URL

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
        // Only set noindex/nofollow for subsequent pages
        noindex={currentPage > 1}
        nofollow={currentPage > 1}
      />
      
      <div className='pb-28 pt-5 px-5 lg:px-6' ref={listRef}>
        <div className='text-2xl font-semibold text-white'>{getCurrentCountryName}</div>
        <div className='mt-3'>
          <button onClick={() => setFilter(!filter)} className="inline-flex items-center gap-2 bg-[rgba(var(--bg-body))] py-0 pl-[0.5rem] pr-[0.75rem] h-[30px] text-white cursor-pointer font-medium rounded-[0.3rem]">
            <i className={`fa-solid fa-filter text-xs ${filter && "text-primary"}`}></i>
            <span className='text-[15px]'>Bộ lọc</span>
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

              <div className='px-4 py-3 space-x-8 flex items-start justify-start h-full'>
                <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'></div>
                <div className="flex flex-wrap gap-x-3 items-center gap-y-3 w-full">
                  <div>
                    <button onClick={applyFilter} className='bg-primary text-black flex items-center justify-center space-x-2 px-5 py-2.5 border border-primary rounded-full text-sm font-semibold hover:opacity-90 transition-opacity'>
                      <span>Lọc tìm kiếm</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                  <div>
                    <button className='text-white flex items-center justify-center space-x-2 px-5 py-2.5 border-gray-500 border rounded-full text-sm font-semibold' onClick={() => setFilter(false)}>
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
                  className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${currentPage >= pageInfo.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-white transition-colors'}`}>
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

export const getServerSideProps: GetServerSideProps<QuocGiaProps> = async (context) => {
  const { query, params: routeParams ,req } = context;

  const countrySlug = routeParams?.slug as string;
  const currentPage = Number(query.trang) || 1;
  const cookieHeader = req.headers.cookie || "";
  const headers = {
    Cookie: cookieHeader,
    "User-Agent": req.headers["user-agent"] || "NextJS-Server",
    ...getViewerLanguageRequestHeaders(cookieHeader),
  };

  let countryCode: string = "ALL";

  try {
    const countryRes = await axiosInstance.get(API_ENDPOINTS.menu.countries, { headers });
    if (countryRes.data?.status && Array.isArray(countryRes.data.data)) {
        const countriesList = countryRes.data.data;
        if (countrySlug) {
            // Find country by slug or code from the route
            const found = countriesList.find((item: Record<string, string | number | string[] | undefined>) => item.slug === countrySlug || item.code === countrySlug);
            if (found) countryCode = found.code;
        }
    }
  } catch (e) {
    console.error("Error fetching countries list in SSP", e);
  }

  // Fallback to query param if not found via slug
  if (countryCode === "ALL" && query["quoc-gia"]) {
    countryCode = query["quoc-gia"] as string;
  }

  const apiParams: Record<string, string | number | string[]> = {
    limit: 24,
    page: currentPage,
    ...query
  };

  if (countryCode !== "ALL") {
    apiParams.countries = countryCode;
  }
  
  // Mapping URL query keys to API params
  if (apiParams["the-loai"]) { apiParams.genres = apiParams["the-loai"]; delete apiParams["the-loai"]; }
  if (apiParams.nam) { apiParams.years = apiParams.nam; delete apiParams.nam; }
  if (apiParams.loai) { apiParams.type = apiParams.loai; delete apiParams.loai; }
  if (apiParams["sap-xep"]) { apiParams.sort = apiParams["sap-xep"]; delete apiParams["sap-xep"]; }
  if (apiParams["xep-hang"]) { apiParams.rank = apiParams["xep-hang"]; delete apiParams["xep-hang"]; }
  if (apiParams["phien-ban"]) { apiParams.versions = apiParams["phien-ban"]; delete apiParams["phien-ban"]; }

  // Clean up unused/redundant keys before API call
  delete apiParams.trang;
  delete apiParams.slug;
  delete apiParams["quoc-gia"];

  Object.keys(apiParams).forEach(key => {
    if (apiParams[key] === "ALL") delete apiParams[key];
  });

  const fallbackProps = {
    initialMovies: [],
    initialPagination: {
      totalItems: 0,
      currentPage: currentPage,
      totalPages: 1,
      itemsPerPage: 24
    },
    initialCountryCode: countryCode
  };

  try {
    const response = await axiosInstance.get(API_ENDPOINTS.search, {
      params: apiParams,
      headers:headers
    });
    
    if (response.data.status && response.data.data) {
      return {
        props: {
          initialMovies: response.data.data.items,
          initialPagination: response.data.data.pagination,
          initialCountryCode: countryCode
        }
      };
    }

    return { props: fallbackProps };
  } catch (error) {
    console.error(error);
    return { props: fallbackProps };
  }
};

export default QuocGia;
