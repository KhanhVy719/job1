import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuthContext } from "@/context/AuthContext";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";

type RecordHistoryOptions = {
  silent?: boolean;
};

const getMovieId = (movie?: IMovie | null) => {
  if (!movie?._id) return "";
  return String(movie._id);
};

export const useAccountMovieActions = (movie?: IMovie | null) => {
  const { user, refreshAuth } = useAuthContext();
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const movieId = getMovieId(movie);
  const isAuthenticated = Boolean(user);

  const isFavorite = useMemo(() => {
    if (!movieId || !user?.favorites?.length) return false;

    return user.favorites.some((favorite) => {
      if (!favorite) return false;
      if (typeof favorite === "string") return favorite === movieId;
      return String(favorite._id) === movieId;
    });
  }, [movieId, user?.favorites]);

  const toggleFavorite = useCallback(async () => {
    if (!movieId) {
      toast.error("Không tìm thấy phim để cập nhật yêu thích");
      return;
    }

    if (!user) {
      toast.error("Bạn cần đăng nhập để lưu yêu thích");
      return;
    }

    setFavoriteLoading(true);
    try {
      const res = await axiosInstance.post(API_ENDPOINTS.auth.favorite(movieId));
      await refreshAuth();
      toast.success(res.data?.message || "Đã cập nhật yêu thích");
    } catch (error: any) {
      toast.error(error?.message || "Không thể cập nhật yêu thích");
    } finally {
      setFavoriteLoading(false);
    }
  }, [movieId, refreshAuth, user]);

  const recordHistory = useCallback(
    async ({ silent = true }: RecordHistoryOptions = {}) => {
      if (!movieId || !user) return false;

      setHistoryLoading(true);
      try {
        await axiosInstance.post(API_ENDPOINTS.auth.history(movieId));
        await refreshAuth();
        if (!silent) toast.success("Đã lưu lịch sử xem");
        return true;
      } catch (error: any) {
        if (!silent) toast.error(error?.message || "Không thể lưu lịch sử xem");
        return false;
      } finally {
        setHistoryLoading(false);
      }
    },
    [movieId, refreshAuth, user]
  );

  return {
    favoriteLoading,
    historyLoading,
    isAuthenticated,
    isFavorite,
    recordHistory,
    toggleFavorite,
  };
};
