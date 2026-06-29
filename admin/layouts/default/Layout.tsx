import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import 'swiper/css';
import 'swiper/css/free-mode';
import { usePathname } from 'next/navigation';

const Layout: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<null | string>(null);
  const [isSidebar, setIsSidebar] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const MENU_ITEMS = [
    {
      group: 'Main',
      items: [
        { name: 'Bảng điều khiển', href: '/', icon: 'fa-regular fa-house-blank' },
        { name: 'Cấu hình Ads', href: '/ads-config', icon: 'fa-regular fa-rectangle-ad' },
      ],
    },
    {
      group: 'Phim',
      items: [
        { name: 'Danh sách phim', href: '/movies', icon: 'fa-regular fa-circle-play' },
        { name: 'Phim đã upload', href: '/movies/uploaded', icon: 'fa-regular fa-cloud-arrow-up' },
        { name: 'Tải phim', href: '/movies/upload', icon: 'fa-regular fa-upload' },
      ],
    },
       {
      group: 'Video Short',
      items: [
        { name: 'Danh sách video', href: '/short', icon: 'fa-regular fa-circle-play' },
        { name: 'Tải Short', href: '/short/upload', icon: 'fa-regular fa-upload' },
      ],
    },
    {
      group: 'Quản lý',
      items: [
        { name: 'Người dùng', href: '/users', icon: 'fa-regular fa-user' },
        { name: 'Gói nâng cấp', href: '/plans', icon: 'fa-regular fa-up' },
        { name: 'Phân loại', href: '/categories', icon: 'fa-regular fa-folder-gear' },
        { name: 'SiteMap', href: '/sitemap', icon: 'fa-regular fa-globe' },
      ],
    },
    {
      group: 'Thanh toán',
      items: [
        { name: 'Cấu hình', href: '/payment-config', icon: 'fa-regular fa-building-columns' },
        { name: 'Lịch sử nạp', href: '/transactions', icon: 'fa-regular fa-clock' },
      ],
    },
    {
      group: 'Tiện ích',
      items: [
        { name: 'Film Crawler', href: '/crawler', icon: 'fa-regular fa-shovel' },
      ],
    },
  ];

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (isSidebar && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
      setIsSidebar(false);
    }
  }, [isSidebar]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);


  const pathname = usePathname();
  return (
    <>
      {isSidebar && (
        <div
          className="fixed inset-0 z-10 bg-black/50 lg:hidden"
          onClick={() => setIsSidebar(false)} // Nhấn vào overlay để đóng
        />
      )}
      <div ref={sidebarRef} className={`fixed z-20 top-0  lg:left-0 h-full w-[18rem] bg-[#f4f4f4] transition-all duration-300 ${!isSidebar ? "left-[-22rem]" : "left-0"}`}>
        <div className='flex items-start px-5 py-6 border-b border-gray-200 space-x-3'>
          <div>
            <Image
              src="/favicon.ico"
              alt="Hãy Lấy Em Đi"

              className="object-cover bg-black rounded-full w-[38px] h-[38px]"
              width={150}
              height={150}
            />
          </div>
          <div className='flex flex-col space-y-1'>
            <div className='font-medium text-sm'>
              ROPHIM SERVER MANGER
            </div>
            <p className='text-gray-400 text-xs'>
              Trình quản lý hệ thống
            </p>
          </div>
        </div>
        <SimpleBar style={{ maxHeight: '100%' }} className="h-full pb-[10rem]">
          {MENU_ITEMS.map((section, index) => (
            <div key={index} className="px-5 py-3 space-y-4">
              <div className="text-sm px-2 font-medium text-gray-500">
                {section.group}
              </div>

              <ul className="flex flex-col space-y-2">
                {section.items.map((item) => {

                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center space-x-2 py-2.5 w-full px-2 rounded-lg transition-colors duration-200 ${isActive
                          ? 'bg-gray-500/10'
                          : 'hover:bg-gray-100'
                          }`}
                      >
                        <i
                          className={`${item.icon} ${isActive ? 'text-gray-800' : 'text-gray-500'
                            }`}
                        ></i>
                        <span
                          className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'
                            }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </SimpleBar>
      </div>
      <div className='fixed z-10 lg:pl-[18rem] h-[4.3rem] w-full border-gray-200 bg-white border-b '>
        <div className='w-full px-5 h-full flex items-center justify-between '>
          <button className="lg:hidden block " onClick={() => setIsSidebar(!isSidebar)}>
            <i className="fa-solid fa-bars text-3xl"></i>
          </button>
          <div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Layout;