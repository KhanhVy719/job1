import Link from "next/link";

import Image from "next/image";

const Layout: React.FC = () => {
  return (
    <>
      <div className=" sticky top-0 z-10 w-full h-16 bg-white  border-gray-200	border-b flex justify-center">
        <div className="px-3 sm:px-6 md:px-10 lg:px-15 xl:px-40 h-full flex w-full justify-between items-center">
          <div className="flex items-center space-x-1">
            <Image
              src="/logo.png" // Replace with the actual path to your image
              alt="Description of the image"
              width={35}
              height={35}
            />
            <div className="ms-14 font-semibold text-xl text-black">
              {process.env.NEXT_PUBLIC_APP_NAME || "RoPhim"}
            </div>
            <div className="px-2 mb-2 py-0.5 text-[11px] font-semibold border-2 text-blue-700 border-blue-300 rounded-full">
              THIẾT KẾ
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="#" className="text-gray-700 hidden lg:block font-semibold text-sm">
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
