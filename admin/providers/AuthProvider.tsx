"use client";

import { useContext, useEffect, ReactNode, useMemo } from "react";
import { useRouter } from "next/router";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { useUserStore } from "@/hooks/useUserStore";
import Cookies from "js-cookie";
import { AuthContext, AuthContextType } from "@/context/AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const {
    user,
    shop,
    settings,
    loading,
    setUser,
    setShop,
    setSettings,
    setLoading,
  } = useUserStore();

  // ✅ Đồng bộ token giữa localStorage và cookie (1 chiều an toàn)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !Cookies.get("access_token")) {
      Cookies.set("access_token", token, { path: "/", expires: 7 });
    } else if (!token && Cookies.get("access_token")) {
      localStorage.setItem("access_token", Cookies.get("access_token")!);
    }
  }, []);

  // ✅ Load dữ liệu user / shop / settings
  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);

        const [acct, shopRes, conf] = await Promise.allSettled([
          axiosInstance.get(API_ENDPOINTS.auth.account, {
            signal: ctrl.signal,
          }),
          axiosInstance.get(API_ENDPOINTS.partner.shop, {
            signal: ctrl.signal,
          }),
          axiosInstance.get(API_ENDPOINTS.setting.configuration, {
            signal: ctrl.signal,
          }),
        ]);

        if (!active) return;

        // Account
        setUser(acct.status === "fulfilled" ? acct.value.data ?? null : null);

        // Shop
        setShop(shopRes.status === "fulfilled" ? shopRes.value.data?.data ?? null : null);

        // Settings
        if (conf.status === "fulfilled") {
          const cfg = conf.value.data ?? {};
          setSettings(cfg);

          // Nếu đang ở /setup mà đã có config → chuyển về /
          if (router.pathname === "/setup" && Object.keys(cfg ?? {}).length > 0) {
            router.replace("/");
          }
        } else {
          setSettings({});
          // Nếu chưa config mà không ở /setup → ép về /setup
          if (router.pathname !== "/setup") {
            router.replace("/setup");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [router, setLoading, setSettings, setShop, setUser]);

  const logout = () => {
    Cookies.remove("access_token");
    localStorage.removeItem("access_token");
    setUser(null);
    setShop(null);
    router.replace("/");
  };

  // ✅ Giá trị context
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      Shop: shop,
      settings,
      loading,
      isAuthenticated: Boolean(user),
      logout, // thêm vào đây
    }),
    [user, shop, settings, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};
