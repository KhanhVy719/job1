import { useState, useEffect, useCallback, useMemo,ReactNode } from "react";
import Auth from "@/sections/auth";
import { useSearchFilters } from "@/hooks/useSearch";
import dynamic from "next/dynamic";
const Navbar = dynamic(() => import("@/Layouts/default/Navbar"), { ssr: false });
const Sidebar = dynamic(() => import("@/Layouts/default/Sidebar"), { ssr: false });

import { useAuthContext } from "@/context/AuthContext";

interface MenuItem {
  name: string;
  code: string;
}

const chunkArray = (arr: MenuItem[], size: number): MenuItem[][] => {
  if (!arr || size <= 0) return [];
  const chunkedArr: MenuItem[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunkedArr.push(arr.slice(i, i + size));
  }
  return chunkedArr;
};

const Layout: React.FC<{ children: ReactNode }> = ({ children }) => { 
  const { filters } = useSearchFilters();
  const { vip, user ,logout} = useAuthContext();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isAuth, setIsAuth] = useState(false);
  const [isAuthTabs, setIsAuthTabs] = useState(1);

  const chunkedGenresDesktop = useMemo(() => {
    const data = filters.Genres || [];
    return data.length ? chunkArray(data, Math.ceil(data.length / 3) || 1) : [];
  }, [filters.Genres]);



  const chunkedGenresMobile = useMemo(() => chunkArray(filters.Genres || [], 10), [filters.Genres]);
  const chunkedCountriesMobile = useMemo(() => chunkArray(filters.Countries || [], 5), [filters.Countries]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isAuth && !(event.target as HTMLElement).closest(".modal")) {
        setIsAuth(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAuth]);

  useEffect(() => {
    document.body.classList.toggle("overflow-y-hidden", isAuth);
    return () => document.body.classList.remove("overflow-y-hidden");
  }, [isAuth]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openLogin = useCallback(() => {
    setIsAuthTabs(1);
    setIsAuth(true);
  }, []);

  const openRegister = useCallback(() => {
    setIsAuthTabs(2);
    setIsAuth(true);
  }, []);

  const closeAuth = useCallback(() => setIsAuth(false), []);

  useEffect(() => {
    const handleClickOpenLogin = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".open-login")) openLogin();
      if (target.closest(".open-register")) openRegister();
    };
    document.addEventListener("click", handleClickOpenLogin);
    return () => document.removeEventListener("click", handleClickOpenLogin);
  }, [openLogin, openRegister]);

  return (
    <>
      <Navbar
        isScrolled={isScrolled}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        openLogin={openLogin}
        vip={vip}
        user={user}
        chunkedGenres={chunkedGenresDesktop}
        Countries={filters.Countries}
        Logout={logout}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        openLogin={openLogin}
        user={user}
        chunkedGenres={chunkedGenresMobile}
        chunkedCountries={chunkedCountriesMobile}
      />
      <main>
         {children} 
      </main>
      <Auth isAuth={isAuth} isActive={isAuthTabs} closeAuth={closeAuth} />
    </>
  );
};

export default Layout;