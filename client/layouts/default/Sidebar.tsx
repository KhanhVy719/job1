import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import ViewerLanguageSwitch from "@/components/ViewerLanguageSwitch";
import "swiper/css";
import "swiper/css/free-mode";

interface MenuItem {
  name: string;
  code: string;
}

interface SidebarProps {
  isOpen: boolean;
  user:IUser |null;
  openLogin: () => void;
  chunkedGenres: MenuItem[][];
  chunkedCountries: MenuItem[][];
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  openLogin,
  user,
  chunkedGenres,
  chunkedCountries,
}) => {
  const [openMenu, setOpenMenu] = useState<null | string>(null);
  const [genreSlideIndex, setGenreSlideIndex] = useState(0);
  const [genreTotalSlides, setGenreTotalSlides] = useState(0);
  const [countrySlideIndex, setCountrySlideIndex] = useState(0);
  const [countryTotalSlides, setCountryTotalSlides] = useState(0);

  const toggleMenu = (menu: string) => setOpenMenu((prev) => (prev === menu ? null : menu));

  return (
    <div className={clsx("fixed z-50 w-full top-[4.5rem] lg:hidden", isOpen ? "flex" : "hidden")}>
      <div className="max-w-xl w-full bg-[rgba(59,73,135,1)] shadow-xl lg:max-w-[23rem] mx-4 lg:mx-8 rounded-xl backdrop-blur-[20px] p-4 flex-col justify-center">
        <button onClick={openLogin} className="py-2.5 w-full flex items-center space-x-2 justify-center font-medium text-black text-sm bg-white rounded-full">
          <i className="fa-solid fa-user"></i><span className="text-medium">Thành viên</span>
        </button>
        <ViewerLanguageSwitch className="mt-4" />
        <ul className="grid grid-cols-2 my-6 gap-6 relative">
          <li><Link href="/phim-le/" className="text-white hover:text-primary font-semibold text-[13px]">Phim Lẻ</Link></li>
          <li><Link href="/phim-bo/" className="text-white hover:text-primary font-semibold text-[13px]">Phim Bộ</Link></li>
          
          {/* Mobile Genres */}
          <li>
            <button onClick={() => toggleMenu("genre")} className="text-white font-semibold flex items-center space-x-2 text-[13px] hover:text-primary">
              <span>Thể loại</span><i className={clsx("fa-solid fa-caret-down transition-transform duration-200", openMenu === "genre" ? "rotate-180 text-primary" : "")}></i>
            </button>
            {openMenu === "genre" && (
              <div className="z-[20] absolute translate-y-[10px] bg-[#20284bfa] rounded-lg shadow-[2px_1px_12px_0px_#00000030] p-2 w-[-webkit-fill-available]">
                <div className="flex items-center justify-between p-3 bg-[#fff1]">
                  <div className="flex items-center space-x-2 text-xs"><i className="fa-solid fa-clapperboard text-primary"></i><span className="font-semibold text-white">TRƯỢT ĐỂ XEM</span></div>
                  <span className="text-white font-semibold text-xs">{genreTotalSlides > 0 ? `${genreSlideIndex + 1}/${genreTotalSlides}` : "..."}</span>
                </div>
                <Swiper spaceBetween={8} slidesPerView="auto" onSwiper={(swiper) => setGenreTotalSlides(swiper.slides.length)} onSlideChange={(swiper) => setGenreSlideIndex(swiper.activeIndex)}>
                  {chunkedGenres.map((columnItems, idx) => (
                    <SwiperSlide key={idx} className="w-auto">
                      <ul className="grid grid-cols-2 gap-4 text-[13px] mt-3">
                        {columnItems.map((item, index) => (
                          <li key={index}>
                            <Link href={"/the-loai/" + item.code} className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 rounded-lg h-full items-center justify-start">{item.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </li>

          <li>
            <button onClick={() => toggleMenu("country")} className="text-white font-semibold flex items-center space-x-2 text-[13px] hover:text-primary">
              <span>Quốc gia</span><i className={clsx("fa-solid fa-caret-down transition-transform duration-200", openMenu === "country" ? "rotate-180 text-primary" : "")}></i>
            </button>
            {openMenu === "country" && (
              <div className="z-[20] absolute translate-y-[10px] bg-[#20284bfa] rounded-lg shadow-[2px_1px_12px_0px_#00000030] p-2 w-[-webkit-fill-available] right-0">
                <div className="flex items-center justify-between p-3 bg-[#fff1]">
                  <div className="flex items-center space-x-2 text-xs"><i className="fa-solid fa-clapperboard text-primary"></i><span className="font-semibold text-white">CUỘN ĐỂ XEM</span></div>
                  <span className="text-white font-semibold text-xs">{countryTotalSlides > 0 ? `${countrySlideIndex + 1}/${countryTotalSlides}` : "..."}</span>
                </div>
                <div className="my-3 h-[10rem]">
                  <Swiper slidesPerView={"auto"} spaceBetween={8} freeMode={true} modules={[FreeMode, Mousewheel]} mousewheel={true} direction={"vertical"} className="h-full" onSwiper={(swiper) => setCountryTotalSlides(swiper.slides.length)} onSlideChange={(swiper) => setCountrySlideIndex(swiper.activeIndex)}>
                    {chunkedCountries.map((columnItems, idx) => (
                      <SwiperSlide key={idx} className="w-auto h-auto">
                        <ul className="flex flex-col space-y-1 text-[13px]">
                          {columnItems.map((item, index) => (
                            <li key={index}>
                              <Link href={"/quoc-gia/" + item.code} className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 rounded-lg whitespace-nowrap">{item.name}</Link>
                            </li>
                          ))}
                        </ul>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            )}
          </li>

          <li><Link href="/xem-chung" className="text-white font-semibold hover:text-primary text-[13px]">Xem Chung</Link></li>
          
          <li>
            <button onClick={() => toggleMenu("is-more")} className="text-white font-semibold flex items-center space-x-2 text-[13px] hover:text-primary">
              <span>Xem thêm</span><i className={clsx("fa-solid fa-caret-down transition-transform duration-200", openMenu === "is-more" ? "rotate-180 text-primary" : "")}></i>
            </button>
            {openMenu === "is-more" && (
              <div className="z-[20] absolute translate-y-[10px] bg-[#20284bfa] rounded-lg shadow-[2px_1px_12px_0px_#00000030] p-2 w-[-webkit-fill-available] md:right-auto right-0">
                <ul className="flex flex-col space-y-1 text-[13px] w-full">
                  <li><Link href="/lich-chieu" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Lịch chiếu</Link></li>
                  <li><Link href="/chu-de" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Chủ đề</Link></li>
                  <li><Link href="/dien-vien" className="flex flex-row py-1.5 px-4 text-white hover:text-primary hover:bg-gray-400/10 w-full group space-x-3">Diễn viên</Link></li>
                </ul>
              </div>
            )}
          </li>
          <li>
            <Link href="/" className="flex items-center font-semibold space-x-2 text-white leading-none hover:text-primary">
              <span className="text-black text-[10px] px-1.5 py-1 rounded leading-none bg-primary before:text-black before:content-['NEW']"></span>
              <span className=" text-[13px]">Rổ Bóng</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
