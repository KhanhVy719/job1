import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

interface AccountProps {
  user: IUser | null;
  vip: boolean;
  Logout: () => void;
}

const AccountDropdown: React.FC<AccountProps> = ({
  user,
  vip,
  Logout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  // Fallback avatar nếu user có nhưng avatar bị rỗng
  const userAvatar = user.avatar || "/images/default-avatar.png";

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <Image
          src={userAvatar}
          alt={user.fullname}
          width={40}
          height={40}
          className="border-2 border-white hover:opacity-[0.8] h-10 w-10 rounded-full object-cover"
        />
        <i className={clsx("fa-solid fa-caret-down text-white transition-transform duration-200", isOpen ? "rotate-180" : "")}></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[3rem] lg:w-[13rem] w-max bg-body rounded-lg shadow-xl overflow-hidden animate-fade-in-up origin-top-right">

          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {vip && <span className="border border-primary text-primary text-[10px] font-bold px-1 rounded">ROX</span>}
                <span className="text-white text-xs">{user.fullname}</span>
                <i className="fa-solid fa-infinity text-primary text-xs"></i>
              </div>
            </div>

            <p className="text-gray-300 text-xs mb-2">
              Tài khoản RoX tới: 2/2/222
            </p>
            {vip ? (
              <button className="w-full bg-primary text-[#1c2340]  text-xs font-medium py-2 rounded flex items-center justify-center space-x-1 transition-colors">
                <span>Gia hạn</span>
                <i className="fa-solid fa-angles-up"></i>
              </button>
            ) : (
              <button className="w-full bg-primary text-[#1c2340] font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-1 transition-colors">
                <span>Gia hạn</span>
                <i className="fa-solid fa-chevron-up text-[10px]"></i>
              </button>
            )}


          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-1.5 text-gray-300">
              <i className="fa-solid fa-wallet text-xs"></i>
              <span className=" text-xs">Số dư</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-primary font-bold text-xs">{user.coin}B</span>
              <div className="inline-block w-4 h-4 shrink-0 align-sub rounded-full bg-[url('/images/ro-coin.svg')] bg-cover"></div>
              <button className="bg-white hover:bg-gray-200 text-black font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span className="text-[10px]">Nạp</span>
              </button>
            </div>
          </div>

          <ul className="flex flex-col py-2">
            {[
              { icon: "fa-heart", label: "Yêu thích", href: "/yeu-thich" },
              { icon: "fa-plus", label: "Danh sách", href: "/danh-sach" },
              { icon: "fa-clock-rotate-left", label: "Xem tiếp", href: "/lich-su" },
              { icon: "fa-user", label: "Tài khoản", href: "/tai-khoan" },
            ].map((item, index) => (
              <li key={index}>
                <Link href={item.href} className="flex items-center px-4 py-3 text-white hover:bg-white/5 transition-colors space-x-4">
                  <i className={`fa-solid ${item.icon} text-white text-xs`}></i>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 p-2">
            <button
              onClick={Logout}
              className="w-full flex items-center px-4 py-2 text-white hover:bg-white/5 rounded-lg transition-colors space-x-4"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>

              <span className="text-xs font-medium">Thoát</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default AccountDropdown;