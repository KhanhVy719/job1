import React from "react";
import Link from "next/link";
import Image from "next/image";

const Footer: React.FC = () => {

  return (
    <>
      <footer className="bg-[#080b1d] px-5 lg:px-6 py-8">
        <div className="flex flex-col items-center lg:items-start justify-center">
          <div className="flex items-center px-3 py-2.5 bg-[#78140f] text-white rounded-full space-x-2">
            <Image
              src="/images/vn_flag.svg"
              alt="..."
              width={20}
              height={20}
              style={{ width: 20, height: 20 }}
            />
            <span>Hoàng Sa & Trường Sa là của Việt Nam!</span>
          </div>
          <div className="py-4 flex lg:flex-row flex-col items-center lg:space-x-12">
            <Image
              src="/images/logo_rox.svg"
              alt="..."
              width={200}
              height={100}
              style={{ width: 200, height: 100 }}
            />
            <ul className="lg:border-l mt-3 lg:mt-0 lg:border-gray-700 lg:pl-12 flex space-x-3 items-center">
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
              <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>  <li>
                <Link href="/" className="h-9 w-9 rounded-full bg-[#fff1] flex items-center justify-center">
                  <Image
                    src="/images/social/telegram-icon.svg"
                    alt="..."
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                </Link>
              </li>
            </ul>
          </div>
          <div className="py-4 flex items-center lg:items-start flex-col justify-center ">
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mb-3 lg:justify-start justify-center">
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Hỏi-Đáp</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Chính sách bảo mật</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Điều khoản sử dụng</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Giới thiệu</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Liên hệ</Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 items-center lg:justify-start justify-center">
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Dongphim</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Ghienphim</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Motphim</Link>
              <Link href="#" className="text-sm text-white hover:text-primary transition-colors">Subnhanh</Link>
            </div>

            <p className="text-sm lg:text-start text-center text-gray-400 leading-relaxed mb-2 max-w-3xl">
              RoPhim – Phim hay cả rổ - Trang xem phim online chất lượng cao miễn phí Vietsup, thuyết minh, lồng tiếng full HD. Kho phim mới khổng lồ, phim chiếu rạp, phim bộ, phim lẻ từ nhiều quốc gia như Việt Nam, Hàn Quốc, Trung Quốc, Thái Lan, Nhật Bản, Âu Mỹ... đa dạng thể loại. Khám phá nền tảng phim trực tuyến hay nhất 2024 chất lượng 4K!
            </p>

            <p className="text-sm text-gray-400 mt-4">© 2024 RoPhim</p>
          </div>
        </div>

      </footer>

    </>
  );
};

export default Footer;
