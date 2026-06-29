"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const Layout: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div
        className={`sticky top-0 z-40 w-full h-16 border-b border-gray-200 flex justify-center transition-colors duration-300 ${
          scrolled ? "bg-white/20 backdrop-blur-md" : "bg-white"
        }`}
      >
        <div className="px-3 sm:px-6 md:px-10 lg:px-15 xl:px-40 h-full flex w-full justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/doi-tac/" className="flex items-center space-x-1 lg:border-r lg:border-gray-200 lg:pr-8">
              <Image
                src="/logo.png"
                alt="Description of the image"
                width={35}
                height={35}
                  style={{ height: "auto" }}
              />
              <div className="ms-14 font-semibold text-2xl text-black">
                Divine
              </div>
            </Link>
            <ul className="hidden lg:flex items-center pl-8 space-x-6 ">
              <li>
                <Link
                  href="#"
                  className="text-black hover:text-gray-600 text-[16px] font-semibold"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-black hover:text-gray-600 text-[16px] font-semibold"
                >
                  Esports
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-black hover:text-gray-600 text-[16px] font-semibold"
                >
                  Merchandise
                </Link>
              </li>
            </ul>
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-700 hidden lg:block font-semibold text-sm"
            >
              Về trang đầu
            </Link>
            <button className="bg-blue-500 text-white font-semibold text-sm rounded-full px-5 py-2.5">
              Liên hệ hỗ trợ
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
