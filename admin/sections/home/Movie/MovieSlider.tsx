import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";
import Link from "next/link";

const MovieSlider = dynamic(() => import("@/components/Movie/MovieSlider"), {
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

            <div className='bg-[linear-gradient(0deg,rgba(40,43,58,0)_20%,rgba(40,43,58,1))] rounded-xl lg:py-6 py-5  px-5 lg:px-6 mt-12 flex flex-col lg:space-y-12 space-y-4'  >
                <div className='grid grid-cols-1 xl:grid-cols-7 gap-4'>
                    <div className="col-span-1 ">
                        <div className='xl:flex xl:h-full xl:items-center xl:justify-center'>
                            <div className='flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start xl:w-[9rem]'>

                                <div className='text-lg md:text-xl lg:text-2xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(103,65,150)_130%)] bg-clip-text ![text-shadow:none] text-transparent tracking-[1px]'>Phim Hàn Quốc mới</div>


                                <Link href="#" className="text-xs md:text-sm text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-primary ">
                                    <span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1  xl:col-span-6 ">
                        <MovieSlider movies={film} />
                    </div>
                </div>

                <div className='grid grid-cols-1 xl:grid-cols-7 gap-4'>
                    <div className="col-span-1 ">
                        <div className='xl:flex xl:h-full xl:items-center xl:justify-center'>
                            <div className='flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start xl:w-[9rem]'>

                                <div className='text-lg md:text-xl lg:text-2xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(247,161,11)_130%)] bg-clip-text ![text-shadow:none] text-transparent tracking-[1px]'>Phim Trung Quốc mới</div>


                                <Link href="#" className="text-xs md:text-sm text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-[#FFD875] ">
                                    <span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1  xl:col-span-6 ">
                        <MovieSlider movies={film} />
                    </div>
                </div>


                <div className='grid grid-cols-1 xl:grid-cols-7 gap-4'>
                    <div className="col-span-1 ">
                        <div className='xl:flex xl:h-full xl:items-center xl:justify-center'>
                            <div className='flex flex-row xl:flex-col items-center xl:items-start justify-between xl:justify-start xl:w-[9rem]'>

                                <div className='text-lg md:text-xl lg:text-2xl font-bold bg-[linear-gradient(235deg,_rgb(255,255,255)_30%,_rgb(255,0,153)_130%)] bg-clip-text ![text-shadow:none] text-transparent tracking-[1px]'>Phim US-UK mới</div>


                                <Link href="#" className="text-xs md:text-sm text-white xl:mt-6 flex items-center relative space-x-2 leading-none hover:text-[#FFD875] ">
                                    <span>Xem toàn bộ</span> <i className="fa-solid fa-angle-right"></i>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1  xl:col-span-6 ">
                        <MovieSlider movies={film} />
                    </div>
                </div>

            </div>

        </>
    );
};
export default HomePage;