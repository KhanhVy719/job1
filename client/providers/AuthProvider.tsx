import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import Cookies from "js-cookie";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { AuthContextType, AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";

interface RequestError {
  code?: string;
  httpStatus?: number;
  message?: string;
}

const getRequestError = (error: unknown): RequestError => {
  if (error && typeof error === "object") {
    return error as RequestError;
  }

  return {
    message: typeof error === "string" ? error : "Unknown request error",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const [user, setUser] = useState<IUser | null>(null);
  const [vip, setVip] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    Cookies.remove("access_token");
    localStorage.removeItem("access_token");
    setUser(null);
    setVip(false);
  }, []);

  const refreshAuth = useCallback(
    async (signal?: AbortSignal) => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setUser(null);
        setVip(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const acct = await axiosInstance.get(API_ENDPOINTS.auth.me, {
          signal,
        });

        const account = acct.data?.data || null;
        setUser(account);
        setVip(Boolean(account?.vip));
      } catch (error) {
        const requestError = getRequestError(error);
        const isCanceled =
          requestError.code === "ERR_CANCELED" ||
          requestError.message === "canceled";

        if (isCanceled) return;

        setUser(null);
        setVip(false);

        if (requestError.httpStatus === 401) {
          Cookies.remove("access_token");
          localStorage.removeItem("access_token");
        } else {
          console.warn(
            "Auth check failed:",
            requestError.message || requestError
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();

    const fetchData = async () => {
      if (active) await refreshAuth(ctrl.signal);
    };

    void fetchData();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [refreshAuth, router.asPath]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      vip,
      loading,
      isAuthenticated: !!user,
      setVip,
      setUser,
      setLoading,
      refreshAuth,
      logout,
    }),
    [loading, logout, refreshAuth, user, vip]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
