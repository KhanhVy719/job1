"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { GetStaticProps } from 'next';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import Loader from "@/components/loading/list";
import { NextSeo } from 'next-seo';
import { useSearchFilters } from "@/hooks/useSearch";

const MovieList = dynamic(() => import("@/components/Movie/MovieGird"), {
    ssr: false,
    loading: () => <Loader />
});

interface QueryParams {
    [key: string]: string | string[] | number | undefined;
}

const TimKiem: React.FC<{
    initialData?: IMovie[];
    initialPagination?: {
        totalItems: number;
        currentPage: number;
        totalPages: number;
        itemsPerPage: number;
    };
}
> = ({ initialData = [], initialPagination }) => {
    const router = useRouter();
    const { filters } = useSearchFilters();

    const [filter, setFilter] = useState(false);
    const [movieList, setMovieList] = useState<IMovie[]>(initialData);
    const [pageInfo, setPageInfo] = useState(initialPagination || {
        totalItems: 0,
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 24
    });
    const [isLoading, setIsLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    const listRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const hasFetchedRef = useRef(false);

    const currentFilters = useMemo(() => ({
        country: (router.query["quoc-gia"] as string) || "ALL",
        type: (router.query.loai as string) || "ALL",
        rank: (router.query["xep-hang"] as string) || "ALL",
        genres: (router.query["the-loai"] as string) || "ALL",
        versions: (router.query["phien-ban"] as string) || "ALL",
        years: (router.query.nam as string) || "ALL",
        sort: (router.query["sap-xep"] as string) || "createdAt",
    }), [router.query]);

    const [tempFilters, setTempFilters] = useState(currentFilters);

    useEffect(() => {
        if (router.isReady) {
            setTempFilters(currentFilters);
            setKeyword((router.query.q as string) || "");
        }
    }, [router.isReady, currentFilters, router.query.q]);

    const fetchMovies = useCallback(async () => {
        if (!router.isReady) return;

        if (hasFetchedRef.current && initialData.length > 0) {
            hasFetchedRef.current = false;
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsLoading(true);

        if (listRef.current) {
            listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        try {
            const params: QueryParams = {
                q: router.query.q || "",
                limit: 24,
                page: router.query.trang || 1,
            };

            if (router.query["quoc-gia"]) params.countries = router.query["quoc-gia"];
            if (router.query["the-loai"]) params.genres = router.query["the-loai"];
            if (router.query.nam) params.years = router.query.nam;
            if (router.query.loai) params.type = router.query.loai;
            if (router.query["sap-xep"]) params.sort = router.query["sap-xep"];
            if (router.query["xep-hang"]) params.rank = router.query["xep-hang"];
            if (router.query["phien-ban"]) params.versions = router.query["phien-ban"];

            Object.keys(params).forEach(key => {
                if (params[key] === "ALL" || params[key] === "") delete params[key];
            });

            const response = await axiosInstance.get(API_ENDPOINTS.search, {
                params,
                signal: abortControllerRef.current.signal,
                timeout: 10000,
            });

            if (response.data.status && response.data.data) {
                setMovieList(response.data.data.items);
                setPageInfo(response.data.data.pagination);
            } else {
                setMovieList([]);
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'CanceledError') {
                console.error("Lỗi tải phim:", error);
                setMovieList([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router.isReady, router.query, initialData.length]);

    useEffect(() => {
        if (router.isReady && Object.keys(router.query).length > 0) {
            fetchMovies();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, router.asPath]);

    const selectFilter = useCallback((key: keyof typeof tempFilters, value: string) => {
        setTempFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const applyFilter = useCallback(() => {
        setFilter(false);

        const queryObj: QueryParams = {
            q: router.query.q,
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
            if (item.value === "ALL" || !item.value) {
                delete queryObj[item.key];
            } else {
                queryObj[item.key] = item.value;
            }
        });

        router.push(
            { pathname: router.pathname, query: queryObj },
            undefined,
            { shallow: false }
        );
    }, [tempFilters, router]);

    const updatePage = useCallback((newPage: number) => {
        const queryObj = { ...router.query, trang: newPage.toString() };
        router.push(
            { pathname: router.pathname, query: queryObj },
            undefined,
            { shallow: false }
        );
    }, [router]);

    const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newPage = parseInt(e.target.value);
        if (!isNaN(newPage) && newPage > 0 && newPage <= pageInfo.totalPages) {
            updatePage(newPage);
        }
    }, [pageInfo.totalPages, updatePage]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const FilterSection = useCallback(({
        label,
        items,
        filterKey,
        currentValue
    }: {
        label: string;
        items: Array<{ code?: string; title?: string; name?: string }>;
        filterKey: keyof typeof tempFilters;
        currentValue: string
    }) => (
        <div className='px-4 py-3 border-b border-[#ffffff10] space-x-8 flex items-start justify-start h-full'>
            <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'>
                <div className='py-1.5 text-sm font-medium text-white'>{label}:</div>
            </div>
            <ul className="flex flex-wrap gap-x-1.5 items-center gap-y-3 w-full">
                {items.map((item) => {
                    const code = (item.code || item.title || "ALL");
                    const name = (item.name || item.title || "");
                    return (
                        <li key={code}>
                            <button
                                onClick={() => selectFilter(filterKey, code)}
                                className={`text-sm transition-colors duration-200 border px-3 py-1.5 rounded-lg ${currentValue === code
                                    ? 'border-gray-600 text-primary'
                                    : 'text-gray-300 border-transparent hover:text-primary'
                                    }`}
                            >
                                {name}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    ), [selectFilter]);
    const currentYear = new Date().getFullYear();
    const pageNum = router.query.trang ? Number(router.query.trang) : 1;

    const seoTitle = `${keyword || "..."} tập mới nhất ${currentYear}${pageNum > 1 ? ` - Trang ${pageNum}` : ''}`; const seoDesc = `Danh sách phim bộ mới nhất ${currentYear}, tuyển tập phim bộ hay, phim tình cảm, hành động. Xem phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan Full HD, Vietsub, Thuyết minh nhanh nhất.`;
    const canonicalUrl = `${process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://phim.com'}/phim-bo${pageNum > 1 ? `?trang=${pageNum}` : ''}`;

    return (<>
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
            noindex={pageInfo.currentPage > 1}
            nofollow={pageInfo.currentPage > 1}
        />
        <div className='pb-28 pt-5 px-5 lg:px-6' ref={listRef}>
            <div className='text-2xl font-semibold text-white'>
                Tìm kiếm: {keyword || "..."}
            </div>

            <div className='mt-3'>
                <button
                    onClick={() => setFilter(!filter)}
                    className="inline-flex items-center gap-2 bg-[rgba(var(--bg-body))] py-0 pl-[0.5rem] pr-[0.75rem] h-[30px] text-white cursor-pointer font-medium rounded-[0.3rem]"
                >
                    <i className={`fa-solid fa-filter text-xs ${filter && "text-primary"}`}></i>
                    <span className='text-[15px]'>Bộ lọc</span>
                </button>

                {filter && (
                    <div className="border-1 border rounded-xl border-[#ffffff10] -mt-[15px] mb-12">
                        <FilterSection label="Quốc gia" items={filters.Countries} filterKey="country" currentValue={tempFilters.country} />
                        <FilterSection label="Loại phim" items={filters.Type} filterKey="type" currentValue={tempFilters.type} />
                        <FilterSection label="Xếp hạng" items={filters.Rank} filterKey="rank" currentValue={tempFilters.rank} />
                        <FilterSection label="Thể loại" items={filters.Genres} filterKey="genres" currentValue={tempFilters.genres} />
                        <FilterSection label="Phiên bản" items={filters.Versions} filterKey="versions" currentValue={tempFilters.versions} />
                        <FilterSection label="Năm sản xuất" items={filters.Years} filterKey="years" currentValue={tempFilters.years} />
                        <FilterSection label="Sắp xếp" items={filters.Sort} filterKey="sort" currentValue={tempFilters.sort} />

                        <div className='px-4 py-3 space-x-8 flex items-start justify-start h-full'>
                            <div className='h-full lg:w-[120px] w-[80px] flex items-center justify-end'></div>
                            <div className="flex flex-wrap gap-x-3 items-center gap-y-3 w-full">
                                <button
                                    onClick={applyFilter}
                                    className='bg-primary text-black flex items-center justify-center space-x-2 px-5 py-2.5 border border-primary rounded-full text-sm font-semibold hover:opacity-90 transition-opacity'
                                >
                                    <span>Lọc tìm kiếm</span>
                                    <i className="fa-solid fa-arrow-right"></i>
                                </button>
                                <button
                                    className='text-white flex items-center justify-center space-x-2 px-5 py-2.5 border-gray-500 border rounded-full text-sm font-semibold'
                                    onClick={() => setFilter(false)}
                                >
                                    <span>Đóng</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className='my-6 min-h-[300px]'>
                {isLoading ? (
                    <Loader />
                ) : movieList.length === 0 ? (
                    <div className="text-white text-center py-20">Không tìm thấy phim nào.</div>
                ) : (
                    <MovieList movies={movieList} />
                )}

                {movieList.length > 0 && !isLoading && (
                    <div className="w-full flex items-center justify-center my-20">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => updatePage(pageInfo.currentPage - 1)}
                                disabled={pageInfo.currentPage <= 1}
                                className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${pageInfo.currentPage <= 1
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-primary hover:text-black transition-colors'
                                    }`}
                            >
                                <i className="fa-solid fa-arrow-left text-gray-400"></i>
                            </button>

                            <div className="h-[50px] px-8 rounded-full bg-[#2F3346] flex items-center justify-center space-x-1.5">
                                <div className="text-white text-sm">Trang</div>
                                <input
                                    className="text-white w-auto text-[13px] text-center px-3 py-1.5 outline-0 rounded-md max-w-[50px] font-bold flex items-center justify-center border border-gray-600 focus:border-gray-500 bg-transparent"
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
                                className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center ${pageInfo.currentPage >= pageInfo.totalPages
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-primary hover:text-black transition-colors'
                                    }`}
                            >
                                <i className="fa-solid fa-arrow-right text-white"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div></>
    );
};

export const getStaticProps: GetStaticProps = async () => {
    return {
        props: {
            initialData: [],
            initialPagination: null,
        },
        revalidate: 60
    };
};

export default TimKiem;