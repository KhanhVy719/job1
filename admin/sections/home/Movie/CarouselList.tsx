import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";
import Link from "next/link";
import icon from "@/types/icon";

const CarouselList = dynamic(() => import("@/components/Movie/CarouselList"), {
  ssr: false,
});

const movies2 = [
  {
    title: 'Phỏng Vấn Sát Nhân',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/d4ffa43af21cd025e4e513e4a33d2bac.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/af1b6d2bd3f1ac656fbac7e22685aff0.webp',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
    {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/279db8d7454375f7ebd64843951882fe.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/1d848925eec4b444f817d4d0d98066fd.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
     {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/b61cf1671e6c0343d3af4263c8acf085.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/72b60fa8f72c5e1cb51844c30357bf2d.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
   {
    title: 'Phỏng Vấn Sát Nhân',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/d4ffa43af21cd025e4e513e4a33d2bac.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/af1b6d2bd3f1ac656fbac7e22685aff0.webp',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
    {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/279db8d7454375f7ebd64843951882fe.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/1d848925eec4b444f817d4d0d98066fd.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
     {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/b61cf1671e6c0343d3af4263c8acf085.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/72b60fa8f72c5e1cb51844c30357bf2d.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
   {
    title: 'Phỏng Vấn Sát Nhân',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/d4ffa43af21cd025e4e513e4a33d2bac.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/af1b6d2bd3f1ac656fbac7e22685aff0.webp',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
    {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/279db8d7454375f7ebd64843951882fe.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/1d848925eec4b444f817d4d0d98066fd.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
     {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/b61cf1671e6c0343d3af4263c8acf085.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/72b60fa8f72c5e1cb51844c30357bf2d.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
     {
    title: 'Phỏng Vấn Sát Nhân',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/d4ffa43af21cd025e4e513e4a33d2bac.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/af1b6d2bd3f1ac656fbac7e22685aff0.webp',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
    {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/279db8d7454375f7ebd64843951882fe.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/1d848925eec4b444f817d4d0d98066fd.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
     {
    title: 'OnePiece',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/100-0/b61cf1671e6c0343d3af4263c8acf085.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/1920-0/72b60fa8f72c5e1cb51844c30357bf2d.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
];

const HomePage: React.FC = () => {

    return (
        <>

          <div className='flex items-center space-x-2 text-lg lg:text-xl xl:text-2xl mt-12'>
            <span className='font-semibold text-white '>Kho Tàng Anime Mới Nhất
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
            <CarouselList movies={movies2} />
          </div>


        </>
    );
};
export default HomePage;