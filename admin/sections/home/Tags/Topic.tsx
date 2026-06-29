import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";
import Link from "next/link";


const topics = [
  {
    title: 'Marvel',
    gradient: 'from-blue-500 to-blue-700'
  },
  {
    title: '4K',
    gradient: 'from-slate-500 to-violet-400'
  },
  {
    title: 'Sitcom',
    gradient: 'from-green-500 to-green-700'
  },
  {
    title: 'Lồng Tiếng Cực Mạnh',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    title: 'Xuyên Không',
    gradient: 'from-orange-500 to-orange-700',
  },
  {
    title: 'Cổ Trang',
    gradient: 'from-red-500 to-red-700',
  },
];


const HomePage: React.FC = () => {


  return (
    <>
     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
      {topics.map((topic, index) => (
        <div
          key={index}
          className={`relative transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden rounded-xl p-6 text-white bg-gradient-to-br ${topic.gradient} 
            after:absolute after:inset-0 after:bg-[url(/images/wave.png)] after:bg-no-repeat after:opacity-30
            after:[mask-image:linear-gradient(-45deg,black,transparent_40%)] 
            after:[-webkit-mask-image:linear-gradient(-45deg,black,transparent_40%)] 
            after:bg-[length:200px_140px] after:bg-[position:right_-2rem_bottom_0] 
            flex flex-col justify-end h-24 sm:h-30 lg:h-36`} // <-- dùng h-36 chuẩn
        >
          <h3 className="text-base md:text-lg lg:text-xl font-bold relative z-10 w-[80%]">
            {topic.title}
          </h3>
          <Link
            href="#"
            className="md:flex hidden font-medium mt-3 items-center relative space-x-2 leading-none z-10"
          >
            <span>Xem chủ đề</span>
            <i className="fa-solid fa-angle-right"></i>
          </Link>
        </div>
      ))}
      <div className="relative transform transition-transform duration-300 ease-out hover:-translate-y-2 overflow-hidden rounded-xl p-6 text-white bg-gradient-to-br from-gray-500 to-gray-700
          after:absolute after:inset-0 after:bg-[url(/images/wave.png)] after:bg-no-repeat after:opacity-30
          after:[mask-image:linear-gradient(-45deg,black,transparent_40%)] 
          after:[-webkit-mask-image:linear-gradient(-45deg,black,transparent_40%)] 
          after:bg-[length:200px_140px] after:bg-[position:right_-2rem_bottom_0] 
          flex flex-col justify-end h-auto ">
        <h3 className="text-base md:text-lg lg:text-xl font-bold relative z-10">+ 4 Chủ đề</h3>
      </div>
      </div>

    </>
  );
};
export default HomePage;