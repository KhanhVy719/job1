import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";
import Link from "next/link";

import icon from "@/types/icon";

const NewsList = dynamic(() => import("@/components/Movie/NewsList"), {
  ssr: false,
});
const film = [
  { id: 1, title: 'Tình Yêu Quá Cảnh', subtitle: 'EXchange', imageUrl: 'https://static.nutscdn.com/vimg/400-0/355ac606bf65a5795d7e6ab55022dc6d.jpg', badge: 'P.9', thumbnail: 'https://static.nutscdn.com/vimg/400-0/6b2c348d080c5cb9e147b75b15942117.jpg' },
  { id: 2, title: 'Seventeen: Nét Mực Thanh Xuân', subtitle: 'SEVENTEEN: OUR CHAPTER', imageUrl: 'https://static.nutscdn.com/vimg/400-0/0b0a08ec63444bee1974f4b6a90cca47.jpg', badge: 'P.1', thumbnail: 'https://static.nutscdn.com/vimg/400-0/aa092c8d4441b391d1a81530faa39a39.jpg' },
  { id: 3, title: 'Hãy Lấy Em Đi', subtitle: 'Would You Marry Me?', imageUrl: 'https://static.nutscdn.com/vimg/400-0/fc1f6d1747eaa46dbbddcd0326a6d0e7.jpg', badge: 'TM. 8', thumbnail: 'https://static.nutscdn.com/vimg/400-0/15e89252216e726ec0a61c3d187ec8e4.jpg' },
  { id: 4, title: 'Trăm Mảnh Ký Ức', subtitle: 'A Hundred Memories', imageUrl: 'https://static.nutscdn.com/vimg/500-0/37f183a49e4c21cef45047cc3d125569.webp', badge: 'P.5', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 5, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 6, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 7, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 8, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 9, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 10, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 11, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 12, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 13, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 14, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 15, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
  { id: 16, title: 'Phim Mới Khác', subtitle: 'Another Subtitle', imageUrl: 'https://static.nutscdn.com/vimg/400-0/7a350b09337b6fd7372d9be18859e229.jpg', badge: 'P.12', thumbnail: 'https://static.nutscdn.com/vimg/300-0/3ee4772621c3a38ef6efb6a239bd090b.jpg' },
];

const HomePage: React.FC = () => {

    return (
        <>

          <div className='flex items-center space-x-2 text-lg lg:text-xl xl:text-2xl mt-12'>
            <span className='font-semibold text-white '>Phim Sắp Tới Trên Rổ
            </span>

            <Link href="/"
              className="group  w-8 h-8 flex items-center justify-center border border-white/15 rounded-full cursor-pointer transition-width duration-[2000ms] relative text-white hover:text-primary hover:w-auto text-xl px-2 leading-none"
              role="button"
              aria-label="Next"
            >
              <span className='group-hover:block hidden text-xs '>Xem thêm</span>
              <icon.ArrowRight />
            </Link>

          </div>
          <div className='mt-6'>
            <NewsList movies={film} />
          </div>
        </>
    );
};
export default HomePage;