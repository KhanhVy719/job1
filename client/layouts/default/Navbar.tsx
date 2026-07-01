import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import Account from '@/components/Dropdown/Account'; 
import ViewerLanguageSwitch from "@/components/ViewerLanguageSwitch";

interface MenuItem {
    name: string;
    code: string;
}

interface NavbarProps {
    isScrolled: boolean;
    isSidebarOpen: boolean;
    user: IUser | null;
    vip: boolean;
    setIsSidebarOpen: (value: boolean) => void;
    openLogin: () => void;
    Logout: () => void;
    chunkedGenres: MenuItem[][];
    Countries: MenuItem[];
}

const Navbar: React.FC<NavbarProps> = ({
    isScrolled,
    isSidebarOpen,
    user,
    vip,
    setIsSidebarOpen,
    openLogin,
    Logout,
    chunkedGenres,
    Countries,
}) => {
    const router = useRouter();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isAnimated, setIsAnimated] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<IMovie[]>([]);
    const [isSuggestLoading, setIsSuggestLoading] = useState(false);

    useEffect(() => {
        if (isMobileSearchOpen) {
            setIsAnimated(false);
            const timer = setTimeout(() => setIsAnimated(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isMobileSearchOpen]);

    const handleCloseMobileSearch = () => {
        setIsAnimated(false);
        setTimeout(() => setIsMobileSearchOpen(false), 300);
    };

    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsSuggestLoading(true);
                const res = await axiosInstance.get(API_ENDPOINTS.search, {
                    params: { q: query, limit: 6 },
                    signal: controller.signal,
                });
                setSuggestions(res.data?.data?.items || []);
            } catch (error: any) {
                if (error?.name !== "CanceledError") setSuggestions([]);
            } finally {
                setIsSuggestLoading(false);
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery]);

    const formatViews = (value?: number) => new Intl.NumberFormat("vi-VN").format(value || 0);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const query = searchQuery.trim() || new FormData(e.currentTarget).get("q")?.toString().trim();
        if (query) {
            setSuggestions([]);
            router.push({ pathname: "/tim-kiem", query: { q: query } });
            if (isMobileSearchOpen) handleCloseMobileSearch();
        }
    };

    return (
        <div
            className={clsx(
                "flex top-0 z-50 w-full transition-all duration-100 flex-col items-center",
                router.pathname === "/" || router.pathname === "/phim/[slug]"
                    ? "sticky lg:fixed"
                    : "sticky",
                isScrolled ? "bg-[#080B1Dd4]" : "bg-transparent"
            )}
        >
            <div
                className={clsx(
                    "px-5 lg:px-6 w-full flex justify-between items-center transition-all duration-100",
                    isScrolled ? "h-[4.3rem]" : "h-[5rem] md:h-[5.6rem]"
                )}
            >
                <div className={clsx("flex items-center space-x-5 xl:flex", isMobileSearchOpen ? "hidden" : "flex")}>

                    <div className={clsx("xl:hidden items-center", isMobileSearchOpen ? "hidden" : "flex")}>
                        <button className="relative w-5 h-5" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <span className={clsx("block w-full h-[2px] bg-white absolute left-0 transition-all duration-300 ease-in-out", isSidebarOpen ? "!bg-[#FF6C5D] top-[9px] rotate-45" : "top-0")}></span>
                            <span className={clsx("block w-[70%] h-[2px] bg-white absolute left-0 top-[9px] transition-all duration-300 ease-in-out", isSidebarOpen ? "opacity-0" : "opacity-100")}></span>
                            <span className={clsx("block w-full h-[2px] bg-white absolute left-0 transition-all duration-300 ease-in-out", isSidebarOpen ? "!bg-[#FF6C5D] top-[9px] -rotate-45" : "top-[18px]")}></span>
                        </button>
                    </div>

                    <div className="xl:!ml-0 flex items-center relative">
                        <Link href="/" className="relative flex items-center">
                            <Image src={vip ? `/images/logo_rox.svg` : `/images/logo.svg`} alt="Logo" width={55} height={46} className="lg:h-[40px] h-[35px] w-auto" />
                            <Image src="/christmas-hat.png" alt="Mũ Noel" width={55} height={46} className="absolute lg:h-[40px] h-[35px] w-auto -top-[18px] left-1 shadow-2xl shadow-black/50 z-20" />
                        </Link>
                    </div>

                    {/* Desktop Search */}
                    <div className="lg:relative mx-1 lg:mx-0 hidden xl:flex lg:max-w-[21rem] lg:min-w-[21rem] lg:w-full w-auto flex-col items-center group">
                        <form onSubmit={handleSearch} className="relative w-full flex items-center">
                            <input type="text" placeholder="Tìm kiếm phim, diễn viên" name="q" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" className="text-white lg:max-w-full max-w-[22rem] w-full pl-10 placeholder:text-white h-[2.6rem] flex items-center pr-3 py-3 outline-0 rounded-md border border-transparent focus:border-white bg-[rgba(255,255,255,.08)]" />
                            <button type="submit" className="absolute h-[2.6rem] flex items-center px-3 left-0 text-white border-1 outline-0">
                                <i className="fa-sharp fa-solid fa-magnifying-glass"></i>
                            </button>
                        </form>
                        {/* Search Suggestions */}
                        <div className="group-focus-within:block hidden text-white absolute top-[4rem] lg:top-[3rem] left-0 w-full bg-[#20284bfa] py-2 rounded shadow-md overflow-hidden">
                            <div className="text-gray-400 px-4 py-1 text-sm">Gợi ý tìm kiếm</div>
                            {isSuggestLoading && <div className="px-4 py-3 text-sm text-gray-300">Đang tìm...</div>}
                            {!isSuggestLoading && searchQuery.trim().length >= 2 && suggestions.length === 0 && <div className="px-4 py-3 text-sm text-gray-300">Không có kết quả phù hợp</div>}
                            {!isSuggestLoading && suggestions.length > 0 && <ul>
                                {suggestions.map((movie) => (
                                    <li key={movie._id || movie.slug}>
                                        <Link href={`/phim/${movie.slug}`} onClick={() => setSuggestions([])} className="flex gap-3 px-4 py-3 text-gray-300 hover:bg-gray-400/10 hover:text-white">
                                            <Image src={movie.poster_url || movie.thumb_url} alt={movie.name} width={54} height={74} className="h-[74px] w-[54px] shrink-0 rounded-md object-cover bg-white/5" />
                                            <span className="min-w-0 flex-1 pt-0.5">
                                                <span className="line-clamp-1 text-sm font-semibold text-white">{movie.name}</span>
                                                {movie.origin_name && <span className="mt-1 block line-clamp-1 text-xs text-gray-400">{movie.origin_name}</span>}
                                                <span className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
                                                        <path d="M2.25 12s3.5-6.25 9.75-6.25S21.75 12 21.75 12 18.25 18.25 12 18.25 2.25 12 2.25 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M12 14.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span>{formatViews(movie.view)} Lượt xem</span>
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>}
                        </div>
                    </div>
                </div>

                {/* Desktop Menu Links */}
                <div className="hidden xl:flex items-center space-x-10">
                    <ul className="flex items-center space-x-6">
                        <li><Link href="/phim-le/" className="text-white hover:text-primary text-[13px]">Phim Lẻ</Link></li>
                        <li><Link href="/phim-bo/" className="text-white hover:text-primary text-[13px]">Phim Bộ</Link></li>

                        {/* Desktop Genres Dropdown */}
                        <li className="relative group">
                            <button className="text-white group-hover:text-primary hover:text-primary flex items-center space-x-2 text-[13px]">
                                <span>Thể loại</span><i className="fa-solid fa-caret-down"></i>
                            </button>
                            <div className="hidden z-[20] group-hover:block absolute top-[35px] h-auto text-base bg-[#20284bfa] rounded-lg md:transform md:translate-x-[(-50%, -50%)] before:content-[''] before:absolute before:top-[-33px] before:p-5 before:w-[80px] w-max shadow-[2px_1px_12px_0px_#00000030] min-w-[170px] p-2">
                                <div className="flex flex-row items-start space-x-4">
                                    {chunkedGenres.map((columnItems, columnIndex) => (
                                        <ul className="flex flex-col space-y-1 text-[13px]" key={`col-${columnIndex}`}>
                                            {columnItems.map((items, index) => (
                                                <li key={index}>
                                                    <Link href={"/the-loai/" + items.code} className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 rounded-lg group space-x-3">
                                                        <span className="line-clamp-2 text-left">{items.name}</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    ))}
                                </div>
                            </div>
                        </li>

                        {/* Desktop Country Dropdown */}
                        <li className="relative group">
                            <button className="text-white hover:text-primary group-hover:text-primary flex items-center space-x-2 text-[13px]">
                                <span>Quốc gia</span><i className="fa-solid fa-caret-down"></i>
                            </button>
                            <div className="hidden z-[20] group-hover:block absolute top-[35px] h-auto text-base bg-[#20284bfa] rounded-lg md:transform md:translate-x-[(-50%, -50%)] before:content-[''] before:absolute before:top-[-33px] before:p-5 before:w-[80px] w-max shadow-[2px_1px_12px_0px_#00000030] min-w-[170px] p-2">
                                <Swiper
                                    direction={"vertical"}
                                    slidesPerView={"auto"}
                                    freeMode={true}
                                    mousewheel={true}
                                    modules={[FreeMode, Mousewheel]}
                                    className="h-[80vh] w-full"
                                >
                                    <SwiperSlide className="!h-auto">
                                        <div className="flex flex-row items-start gap-5 px-1.5">
                                            <ul className="flex flex-col space-y-2 max-w-[10rem]">
                                                {Countries.map((item, index) => (
                                                    <li key={index}>
                                                        <Link href={"/quoc-gia/" + item.code} className="block py-1.5 px-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors text-[13px] font-medium">
                                                            {item.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </SwiperSlide>
                                </Swiper>
                            </div>
                        </li>

                        <li><Link href="/xem-chung" className="text-white hover:text-primary text-[13px]">Xem Chung</Link></li>

                        {/* More Menu */}
                        <li className="relative group">
                            <button className="text-white hover:text-primary group-hover:text-primary flex items-center space-x-2 text-[13px]">
                                <span>Xem thêm</span><i className="fa-solid fa-caret-down"></i>
                            </button>
                            <div className="hidden z-[20] group-hover:block absolute top-[35px] h-auto text-base bg-[#20284bfa] rounded-lg md:transform md:translate-x-[(-50%, -50%)] before:content-[''] before:absolute before:top-[-33px] before:p-5 before:w-[80px] w-max py-2 shadow-[2px_1px_12px_0px_#00000030] min-w-[170px]">
                                <div className="flex flex-row items-center space-x-4">
                                    <ul className="flex flex-col space-y-1 text-[13px] w-full">
                                        <li><Link href="/lich-chieu" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Lịch chiếu</Link></li>
                                        <li><Link href="/chu-de" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Chủ đề</Link></li>
                                        <li><Link href="/dien-vien" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Diễn viên</Link></li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li>
                            <Link href="/" className="flex items-center space-x-2 text-white leading-none hover:text-primary">
                                <span className="text-black text-[10px] px-1.5 py-1 rounded leading-none bg-primary before:text-black before:content-['NEW']"></span>
                                <span className=" text-[13px]">Rổ Bóng</span>
                            </Link>
                        </li>
                    </ul>

                    <div className="flex items-center space-x-6">
                        <ViewerLanguageSwitch compact />
                        {user ? (
                            <>
                                <Account user={user} Logout={Logout} vip={vip} />
                            </>
                        ) : (
                            <>
                                <div className="flex items-center">
                                    <button onClick={openLogin} className="text-black px-5 py-2.5 text-sm rounded-full bg-white space-x-1 flex items-center">
                                        <i className="fa-solid fa-user"></i><span className="text-medium">Thành viên</span>
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                </div>

                <form onSubmit={handleSearch} className={clsx("absolute top-0 left-0 w-full h-full pl-3 pr-14 xl:hidden items-center bg-bg-body", isMobileSearchOpen ? "flex" : "hidden")}>
                    <input type="text" name="q" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" placeholder="Tìm kiếm phim, diễn viên" className="w-full h-[2.8rem] leading-8 py-[.4rem] px-12 bg-[rgba(255,255,255,.08)] text-white text-base !outline-none !shadow-none rounded-[.4rem] !border !border-transparent" />
                </form>

                <div className={clsx("xl:hidden", isMobileSearchOpen ? "absolute right-5" : "hidden")}>
                    <button className="text-white" onClick={handleCloseMobileSearch}>
                        <div className="w-5 h-5 leading-5 text-center relative">
                            <span className={clsx("absolute left-0 transition-all duration-300 ease-in-out w-full h-[2px]", isAnimated ? "!bg-[#FF6C5D] top-[9px] rotate-45 opacity-100" : "top-0 opacity-0 bg-white")}></span>
                            <span className={clsx("absolute left-0 transition-all duration-300 ease-in-out w-full h-[2px]", isAnimated ? "!bg-[#FF6C5D] top-[9px] -rotate-45 opacity-100" : "top-[15px] opacity-0 bg-white")}></span>
                        </div>
                    </button>
                </div>
                <div className={clsx("xl:hidden", isMobileSearchOpen ? "absolute left-7" : "flex")}>
                    <button onClick={() => setIsMobileSearchOpen(true)} className="text-white text-lg"><i className="fa-solid fa-magnifying-glass"></i></button>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
