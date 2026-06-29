import {
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import Cookies from "js-cookie";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { AuthContextType, AuthContext } from "@/context/AuthContext"
import { useRouter } from "next/router";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const [user, setUser] = useState<IUser | null>(null);
  const [vip, setVip] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();

    const fetchData = async () => {

        const acct = await axiosInstance.get(API_ENDPOINTS.auth.me, {
          signal: ctrl.signal,
        });

        if (!active) return;

        setUser(acct.data.data);
        setVip(acct.data.data.vip ==0 ? false :true)

    };

    void fetchData();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [router, setUser, setVip,setLoading,]);

  const logout = () => {
    Cookies.remove("access_token");
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      vip,
      loading,
      isAuthenticated: !!user,
      setVip,
      setUser,
      setLoading,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
