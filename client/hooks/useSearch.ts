// path: src/hooks/useSearchFilters.ts
import { useState, useEffect } from 'react';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { Search } from "@/utils/Items"; // Import file ở Bước 1

export const useSearchFilters = () => {
    const [filters, setFilters] = useState({
        Genres: [{ code: "ALL", name: "Tất cả" }],
        Countries: [{ code: "ALL", name: "Tất cả" }],
        ...Search
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Gọi song song 2 API để tiết kiệm thời gian
                const [resGenres, resCountries] = await Promise.all([
                    axiosInstance.get(API_ENDPOINTS.menu.categories),
                    axiosInstance.get(API_ENDPOINTS.menu.countries)
                ]);

                // Xử lý dữ liệu Genres (Category)
                const apiGenres = resGenres.data.data.map((item: any) => ({
                    code: item.slug, // Dùng slug để filter trên URL
                    name: item.name
                }));

                // Xử lý dữ liệu Countries
                const apiCountries = resCountries.data.data.map((item: any) => ({
                    code: item.slug, // Nên dùng slug (viet-nam) hoặc code (VN) tùy logic BE của bạn
                    name: item.name
                }));

                setFilters(prev => ({
                    ...prev,
                    Genres: [{ code: "ALL", name: "Tất cả" }, ...apiGenres],
                    Countries: [{ code: "ALL", name: "Tất cả" }, ...apiCountries]
                }));

            } catch (error) {
                console.error("Lỗi lấy bộ lọc:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFilters();
    }, []);

    return { filters, loading };
};