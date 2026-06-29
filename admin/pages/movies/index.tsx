import React, { useEffect, useState } from 'react';
import 'simplebar-react/dist/simplebar.min.css';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

interface ICategory {
    _id: string;
    name: string;
    slug: string;
}

interface ICountry {
    _id: string;
    name: string;
    slug: string;    
    code: string;
}

interface IMovie {
    _id: string;
    tmdb?: { id: string };
    name: string;
    origin_name: string;
    category: ICategory[];
    country: ICountry[];
    chieurap: boolean;
    content_rating: string;
    sub_docquyen: boolean;
    view: number;
    year: number;
    episode_current: string;
    episode_total: string;
    type: string;
}

const ListMovie: React.FC = () => {
    const [movies, setMovies] = useState<IMovie[]>([]);
    const [loading, setLoading] = useState(false);

    const [categoriesList, setCategoriesList] = useState<ICategory[]>([]);
    const [countriesList, setCountriesList] = useState<ICountry[]>([]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        q: "",
        genres: "ALL",
        type: "ALL",
        countries: "ALL",
        dateFrom: "",
        dateTo: "",
        page: 1,
        limit: 10
    });

    const [pagination, setPagination] = useState({
        totalDocs: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    });

    const fetchFilterData = async () => {
        try {
            const [categoriesRes, countriesRes] = await Promise.all([
                axiosInstance.get(API_ENDPOINTS.category.get),
                axiosInstance.get(API_ENDPOINTS.country.get)
            ]); 

            if (categoriesRes.data.status) {
                setCategoriesList(categoriesRes.data.data);
            }

            if (countriesRes.data.status) {
                setCountriesList(countriesRes.data.data);
            }

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu bộ lọc:", error);
        }
    };

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: filters.page,
                limit: filters.limit,
                sort: 'newest'
            };

            if (filters.q) params.q = filters.q;
            if (filters.genres !== "ALL") params.genres = filters.genres;
            if (filters.type !== "ALL") params.type = filters.type;
            if (filters.countries !== "ALL") params.countries = filters.countries;

            const response = await axiosInstance.get(API_ENDPOINTS.movie.list, { params });

            if (response.data.status) {
                setMovies(response.data.data.docs);
                setPagination({
                    totalDocs: response.data.data.totalDocs,
                    totalPages: response.data.data.totalPages,
                    hasNextPage: response.data.data.hasNextPage,
                    hasPrevPage: response.data.data.hasPrevPage
                });
                setSelectedIds([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilterData();
    }, []);

    useEffect(() => {
        fetchMovies();
    }, [filters.page, filters.limit]); 

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        let key = id;
        if (id === 'orderCode') key = 'q';
        if (id === 'categorySelect') key = 'genres';
        if (id === 'typeSelect') key = 'type';
        if (id === 'countrySelect') key = 'countries';

        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }));
    };
    const handleFilterSubmit = () => {
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchMovies();
    };
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) setFilters(prev => ({ ...prev, page: newPage }));
    };
    const getStatusStyle = (current: string, total: string) => {
        const curr = current?.toString().toLowerCase();
        const tot = total?.toString().toLowerCase();
        if (curr === 'full' || (curr && tot && curr === tot)) return { text: "Full", className: "bg-green-100 text-green-700 border border-green-200" };
        return { text: `${current}/${total}`, className: "bg-yellow-100 text-yellow-800 border border-yellow-200" };
    };
    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(movies.map(m => m._id));
        else setSelectedIds([]);
    };
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleDelete = async () => {
        if (confirm(`Bạn có chắc muốn xóa ${selectedIds.length} phim đã chọn?`)) {
            try {
                for (const id of selectedIds) {
                    // await axiosInstance.delete(`${API_ENDPOINTS.movie.delete}/${id}`); 
                }
                alert("Đã xóa thành công (Demo logic)");
                fetchMovies();
            } catch (error) {
                console.error(error);
                alert("Có lỗi xảy ra khi xóa");
            }
        }
    };

    return (
        <>
            <div className='px-3 lg:px-5 xl:px-8 py-5 '>
                <div className='text-xl font-semibold'>Danh sách phim</div>
                <div className='text-base mt-1 text-gray-400'>Danh sách phim bộ và phim lẻ trên hệ thống</div>

                <div className=" grid-cols-2 md:grid-cols-3 grid lg:flex items-center mt-5 gap-3 w-full max-w-full ">
                    <div className="relative w-full col-span-2 md:col-span-1">
                        <input
                            id="orderCode"
                            type="text"
                            placeholder="Tìm kiếm"
                            className="peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black placeholder-transparent ring-1 ring-transparent focus:outline-none focus:ring-black focus:border-black hover:ring-black hover:border-black"
                            value={filters.q}
                            onChange={handleInputChange}
                        />
                        <label
                            htmlFor="orderCode"
                            className="absolute left-2 top-1.5 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-black"
                        >
                            Tìm kiếm
                        </label>
                    </div>

                    <div className="relative w-full md:col-span-1">
                        <select
                            id="categorySelect"
                            className=" peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black ring-1 ring-transparent focus:outline-none focus:ring-blue-500 focus:border-blue-500 hover:ring-blue-500 hover:border-blue-500"
                            onChange={handleInputChange}
                            value={filters.genres}
                        >
                            <option value="ALL">Tất cả</option>
                            {categoriesList.map((cat) => (
                                <option key={cat._id} value={cat.slug}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <label className="absolute left-2 top-1.5 text-xs text-gray-400 peer-focus:text-blue-500">
                            Thể loại:
                        </label>
                    </div>

                    <div className="relative w-full md:col-span-1">
                        <select
                            id="typeSelect"
                            className=" peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black ring-1 ring-transparent focus:outline-none focus:ring-blue-500 focus:border-blue-500 hover:ring-blue-500 hover:border-blue-500"
                            onChange={handleInputChange}
                            value={filters.type}
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="movie">Phim lẻ</option>
                            <option value="tv">Phim bộ</option>
                        </select>
                        <label className="absolute left-2 top-1.5 text-xs text-gray-400 peer-focus:text-blue-500">
                            Loại phim:
                        </label>
                    </div>

                    <div className="relative w-full md:col-span-1">
                        <select
                            id="countrySelect"
                            className=" peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black ring-1 ring-transparent focus:outline-none focus:ring-blue-500 focus:border-blue-500 hover:ring-blue-500 hover:border-blue-500"
                            onChange={handleInputChange}
                            value={filters.countries}
                        >
                            <option value="ALL">Tất cả</option>
                            {countriesList.map((country) => (
                                <option key={country._id} value={country.code}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                        <label className="absolute left-2 top-1.5 text-xs text-gray-400 peer-focus:text-blue-500">
                            Quốc gia
                        </label>
                    </div>

                    <div className="relative w-full md:col-span-1">
                        <input
                            id="dateFrom"
                            type="date"
                            className="peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black placeholder-transparent ring-1 ring-transparent focus:outline-none focus:ring-black focus:border-black hover:ring-black hover:border-black"
                            onChange={handleInputChange}
                            value={filters.dateFrom}
                        />
                        <label className="absolute left-2 top-1.5 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-black">
                            Từ ngày
                        </label>
                    </div>

                    <div className="relative w-full md:col-span-1 col-span-2">
                        <input
                            id="dateTo"
                            type="date"
                            className="peer w-full h-12 px-2 pt-4 pb-1 text-sm border border-gray-300 rounded-md text-black placeholder-transparent ring-1 ring-transparent focus:outline-none focus:ring-black focus:border-black hover:ring-black hover:border-black"
                            onChange={handleInputChange}
                            value={filters.dateTo}
                        />
                        <label className="absolute left-2 top-1.5 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-black">
                            Đến ngày
                        </label>
                    </div>

                    <div className="lg:w-auto w-full flex items-center space-x-2 md:col-span-1 col-span-2">
                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="h-12 w-auto flex items-center justify-center  bg-red-50 text-red-500  rounded-md px-4 text-sm font-medium  transition-colors whitespace-nowrap"
                            >
                                <i className="fa-solid fa-trash mr-2"></i>
                                Xóa ({selectedIds.length})
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleFilterSubmit}
                            className="h-12 w-full md:w-auto lg:w-full flex items-center justify-center bg-black text-white rounded-md px-4 text-sm font-medium space-x-2 hover:bg-gray-800 transition-colors"
                        >
                            <i className="fa-solid fa-filter"></i>
                            <span>Lọc</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="rounded-md mt-5 w-full text-nowrap table-auto border-0 text-left bg-white text-sm">
                        <thead className="font-bold border-b bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 border font-semibold text-center w-10">
                                    <input
                                        type="checkbox"
                                        className='appearance-none w-4 h-4 border border-black rounded bg-white checked:bg-black checked:border-black checked:bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E")] checked:bg-center checked:bg-no-repeat checked:bg-[length:75%] cursor-pointer transition-all'

                                        checked={movies.length > 0 && selectedIds.length === movies.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-3 py-2 border font-semibold">ID TmDB</th>
                                <th className="px-3 py-2 border font-semibold">Tên Phim</th>
                                <th className="px-3 py-2 border font-semibold">Danh mục</th>
                                <th className="px-3 py-2 border font-semibold text-center">Chiếu rạp</th>
                                <th className="px-3 py-2 border font-semibold text-center">Độ tuổi</th>
                                <th className="px-3 py-2 border font-semibold text-center">Sub độc quyền</th>
                                <th className="px-3 py-2 border font-semibold text-center">Lượt xem</th>
                                <th className="px-3 py-2 border font-semibold text-center">Năm</th>
                                <th className="px-3 py-2 border font-semibold text-center">Tình trạng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-5">Đang tải dữ liệu...</td>
                                </tr>
                            ) : movies.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-5">Không tìm thấy phim nào.</td>
                                </tr>
                            ) : (
                                movies.map((movie) => {
                                    const status = getStatusStyle(movie.episode_current, movie.episode_total);
                                    return (
                                        <tr key={movie._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2 border text-center">
                                                <input
                                                    type="checkbox"
                                                    className='appearance-none w-4 h-4 border border-black rounded bg-white checked:bg-black checked:border-black checked:bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E")] checked:bg-center checked:bg-no-repeat checked:bg-[length:75%] cursor-pointer transition-all'

                                                    checked={selectedIds.includes(movie._id)}
                                                    onChange={() => toggleSelect(movie._id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">{movie.tmdb?.id || "N/A"}</td>
                                            <td className="px-3 py-2 border">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{movie.name}</span>
                                                    <span className="text-xs text-gray-500">{movie.origin_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 border whitespace-nowrap transition-all duration-300">
                                                {movie.category?.map((c, index) => (
                                                    <span key={index}>
                                                        <span className="hover:font-medium cursor-pointer ">{c.name}</span>
                                                        {index < movie.category.length - 1 && ", "}
                                                    </span>
                                                ))}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {movie.chieurap ? (
                                                    <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">Có</span>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                <span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">{movie.content_rating}</span>
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {movie.sub_docquyen ? <span className="text-blue-600 font-bold">✓</span> : "-"}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {movie.view.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {movie.year}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.totalPages > 1 && (
                    <div className='flex items-center justify-between mt-4'>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Hiển thị:</span>
                            <select
                                value={filters.limit}
                                onChange={handleLimitChange}
                                className="border border-gray-300 rounded-md text-sm h-8 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={30}>30</option>
                                <option value={40}>40</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-gray-500">phim</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                disabled={!pagination.hasPrevPage}
                                onClick={() => handlePageChange(filters.page - 1)}
                                className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-300  text-gray-500 hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500 transition-all"
                            >
                                <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>

                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum = filters.page;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (filters.page <= 3) {
                                        pageNum = i + 1;
                                    } else if (filters.page >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = filters.page - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all ${filters.page === pageNum
                                                ? 'bg-black text-white border border-black'
                                                : ' text-gray-700 border border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                disabled={!pagination.hasNextPage}
                                onClick={() => handlePageChange(filters.page + 1)}
                                className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-300  text-gray-500 hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500 transition-all"
                            >
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
export default ListMovie;