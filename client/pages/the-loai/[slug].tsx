"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from "next/dynamic";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { useRouter } from "next/router";
import { GetServerSideProps } from 'next';
import { NextSeo } from 'next-seo';
import { useSearchFilters } from "@/hooks/useSearch";

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

type GenresProps = {
  initialMovies: IMovie[];
  initialPagination: Pagination;
  initialGenreCode: string;
}


const Genres: React.FC<GenresProps> = ({ initialMovies, initialPagination }) => {
  const router = useRouter();
  const slug = router.query.slug;
  // Ép kiểu để đảm bảo `filters` có kiểu Filters đã định nghĩa
  const { filters } = useSearchFilters() as { filters: Filters };

  const [filter, setFilter] = useState(false);
  const [film, setFilm] = useState<IMovie[]>(initialMovies);
  const [pageInfo, setPageInfo] = useState(initialPagination);

  const listRef = useRef<HTMLDivElement>(null);

  const isFirstRender = useRef(true);

  // Synchronize state with initial props when they change
  useEffect(() => {
    setFilm(initialMovies);
    setPageInfo(initialPagination);
  }, [initialMovies, initialPagination]);

  // FIX: Thêm 'filters.Genres' và 'slug' vào dependency array
  const getGenresCode = useCallback(() => {
    const slugCode = Array.isArray(slug) ? slug[0] : slug;

    if (slugCode) {
      // Tìm theo code hoặc slug
      const found = filters.Genres.find(item => item.code === slugCode || item.slug === slugCode);
      if (found) return found.code;
    }

    const paramGenre = router.query["the-loai"];
    const paramGenreCode = Array.isArray(paramGenre) ? paramGenre[0] : paramGenre;
    if (paramGenreCode) return paramGenreCode;

    return "ALL";
  }, [router.query, filters.Genres, slug]); // FIX: Added filters.Genres and slug

  const [tempFilters, setTempFilters] = useState({
    country: "ALL",
    type: "ALL",
    rank: "ALL",
    genres: "ALL",
    versions: "ALL",
    years: "ALL",
    sort: "createdAt",
  });


  // FIX: fetchMoviesNow không có dependency nào từ scope ngoài ngoài các hàm/biến global (như axiosInstance, API_ENDPOINTS).
  // Tuy nhiên, nó dùng setFilm và setPageInfo, nên chúng ta không cần thêm vào vì React đảm bảo tính ổn định.
  // Giữ nguyên dependency array rỗng hoặc loại bỏ nếu không cần. Ở đây tôi để trống vì nó không dùng biến nào ngoài.
  const fetchMoviesNow = useCallback(
    async (queryParams: Record<string, string | number | string[] | undefined>): Promise<void> => {
      try { // Bổ sung try-catch để an toàn hơn
        const apiParams: Record<string, string | number | string[] | undefined> = {
          limit: 24,
          page: 1,
          ...queryParams
        };

        // Mapping URL query keys to API params
        if (apiParams["quoc-gia"]) { apiParams.countries = apiParams["quoc-gia"]; delete apiParams["quoc-gia"]; }
        if (apiParams["the-loai"]) { apiParams.genres = apiParams["the-loai"]; delete apiParams["the-loai"]; }
        if (apiParams.nam) { apiParams.years = apiParams.nam; delete apiParams.nam; }
        if (apiParams.loai) { apiParams.type = apiParams.loai; delete apiParams.loai; }
        if (apiParams["sap-xep"]) { apiParams.sort = apiParams["sap-xep"]; delete apiParams["sap-xep"]; }
        if (apiParams.trang) { apiParams.page = apiParams.trang; delete apiParams.trang; }
        if (apiParams["xep-hang"]) { apiParams.rank = apiParams["xep-hang"]; delete apiParams["xep-hang"]; }
        if (apiParams["phien-ban"]) { apiParams.versions = apiParams["phien-ban"]; delete apiParams["phien-ban"]; }

        // Cleanup 'ALL' values and slug
        Object.keys(apiParams).forEach(key => {
          if (apiParams[key] === "ALL") delete apiParams[key];
        });
        delete apiParams.slug;


        const response = await axiosInstance.get(API_ENDPOINTS.search, { params: apiParams });

        if (response.data.status) {
          setFilm(response.data.data.items);
          setPageInfo(response.data.data.pagination);
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      }
    }, []); // FIX: Empty dependency array (setFilm/setPageInfo are stable)


  // FIX: Sửa lại useEffect này, thêm fetchMoviesNow và router.isReady vào dependency array.
  useEffect(() => {
    // Luôn cần router.isReady để truy cập router.query an toàn
    if (!router.isReady) return;

    // Logic để thiết lập tempFilters từ query params
    setTempFilters({
      country: (router.query["quoc-gia"] as string) || "ALL",
      type: (router.query.loai as string) || "ALL",
      rank: (router.query["xep-hang"] as string) || "ALL",
      genres: getGenresCode(),
      versions: (router.query["phien-ban"] as string) || "ALL",
      years: (router.query.nam as string) || "ALL",
      sort: (router.query["sap-xep"] as string) || "createdAt",
    });

    // Sau lần render đầu tiên, chúng ta fetch data dựa trên query thay đổi
    if (!isFirstRender.current) {
      const currentApiParams: Record<string, string | number | string[] | undefined> = {
        ...router.query
      };
      const currentCode = getGenresCode();
      if (currentCode !== "ALL") {
        currentApiParams["the-loai"] = currentCode;
      }
      delete currentApiParams.slug;

      // Khi router.query thay đổi (do người dùng thay đổi trang hoặc lọc),
      // chúng ta gọi fetchMoviesNow với query mới.
      fetchMoviesNow(currentApiParams);
    } else {
      isFirstRender.current = false;
    }

  }, [router.isReady, router.query, getGenresCode, fetchMoviesNow]); // FIX: Added missing dependencies

  const selectFilter = (key: keyof typeof tempFilters, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilter = () => {
    setFilter(false);

    const queryObj: Record<string, string | number | string[] | undefined> = {
      ...router.query,
      trang: "1" // Reset page to 1 when applying filters
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

    const currentCode = getGenresCode();

    // Special handling if a different genre is selected, need to change the path slug
    if (tempFilters.genres !== "ALL" && tempFilters.genres !== currentCode) {
      const selectedGenre = filters.Genres.find(g => g.code === tempFilters.genres);
      if (selectedGenre) {
        // Remove old 'the-loai' query since it will be in the slug path
        delete queryObj["the-loai"];
        delete queryObj.slug; // Remove slug from query params

        router.push({
          pathname: `/the-loai/${selectedGenre.code}`,
          query: queryObj
        });
        return; // Exit function after full navigation
      }
    }

    // Shallow navigation for other filters on the current path
    router.push({
      pathname: router.pathname,
      query: queryObj
    }, undefined, { shallow: true, scroll: false });

    // fetchMoviesNow will be triggered by the useEffect observing router.query change
  };

  const updatePage = (newPage: number) => {
    const queryObj: Record<string, string | number | string[] | undefined> = {
      ...router.query,
      trang: newPage.toString()
    };

    router.push({
      pathname: router.pathname,
      query: queryObj
    }, undefined, { shallow: true, scroll: false }).then(() => {
      // Cuộn lên đầu danh sách sau khi chuyển trang
      listRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    // fetchMoviesNow will be triggered by the useEffect observing router.query change
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPage = parseInt(e.target.value);
    if (!isNaN(newPage) && newPage > 0 && newPage <= pageInfo.totalPages) {
      updatePage(newPage);
    }
  };

  const getCurrentGenreName = () => {
    const currentCode = filter ? tempFilters.genres : getGenresCode();
    // Bổ sung check để đảm bảo filters.Genres không rỗng
    const found = filters.Genres?.find(g => g.code === currentCode);
    return found ? found.name : "Tất cả thể loại";
  };

  const currentYear = new Date().getFullYear();
  const pageNum = router.query.trang ? Number(router.query.trang) : 1;

  // Cập nhật canonicalUrl để chính xác hơn, dùng router.asPath
  const pathWithoutQuery = router.asPath.split('?')[0];
  const seoTitle = `Phim ${getCurrentGenreName()} Hay Nhất ${currentYear}${pageNum > 1 ? ` - Trang ${pageNum}` : ''}`;
  const seoDesc = `Danh sách phim bộ mới nhất ${currentYear}, tuyển tập phim bộ hay, phim tình cảm, hành động. Xem phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan Full HD, Vietsub, Thuyết minh nhanh nhất.`;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}${pathWithoutQuery}${pageNum > 1 ? `?trang=${pageNum}` : ''}`;

  const { country: Country, type: Type, rank: Rank, genres: GenreCode, versions: Versions, years: Years, sort: Sort } = tempFilters;
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
        // Thêm noindex/nofollow cho các trang phân trang để tránh trùng lặp nội dung
        noindex={pageNum > 1}
        nofollow={pageNum > 1}
      />
      <div className='pb-28 pt-5 px-5 lg:px-6' ref={listRef}>
        <div className='text-2xl font-semibold text-white'>{getCurrentGenreName()}</div>
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

              <div className='px-4 py-3  space-x-8 flex items-start justify-start h-full'>
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
                  onClick={() => updatePage(pageInfo.currentPage - 1)}
                  disabled={pageInfo.currentPage <= 1}
                  className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${pageInfo.currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-black transition-colors'}`}>
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
                  onClick={() => updatePage(pageInfo.currentPage + 1)}
                  disabled={pageInfo.currentPage >= pageInfo.totalPages}
                  className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${pageInfo.currentPage >= pageInfo.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-black transition-colors'}`}>
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

export const getServerSideProps: GetServerSideProps<{
  initialMovies: IMovie[];
  initialPagination: Pagination;
  currentSlug: string;
}> = async (context) => {

  const { params, query, req } = context;

  const slug = (params?.slug as string) || "ALL";
  const page = Number(query.trang) || 1;

  try {
    const apiParams: Record<string, string | number> = {
      limit: 24,
      page,
      // Thêm các tham số query khác từ URL vào apiParams để SSP trả về đúng bộ lọc
      ...(query.loai && { type: query.loai as string }),
      ...(query["xep-hang"] && { rank: query["xep-hang"] as string }),
      ...(query["phien-ban"] && { versions: query["phien-ban"] as string }),
      ...(query.nam && { years: query.nam as string }),
      ...(query["sap-xep"] && { sort: query["sap-xep"] as string }),
      ...(query["quoc-gia"] && { countries: query["quoc-gia"] as string }),
    };

    if (slug !== "ALL") {
      apiParams.genres = slug;
    }

    // Loại bỏ các key không cần thiết
    delete apiParams.trang;
    delete apiParams.slug;

    // Loại bỏ các giá trị 'ALL'
    Object.keys(apiParams).forEach(key => {
      if (apiParams[key] === "ALL") delete apiParams[key];
    });
    const cookieHeader = req.headers.cookie || "";

    const headers = {
      Cookie: cookieHeader,
      "User-Agent": req.headers["user-agent"] || "NextJS-Server",
    };

    const response = await axiosInstance.get(API_ENDPOINTS.search, {
      params: apiParams,
      headers: headers, 
    });


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

  } catch (error) {
    console.error("SSP Error:", error);
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

export default Genres;