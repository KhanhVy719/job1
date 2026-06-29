import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const BannerSlider = dynamic(() => import("@/components/home/Banner"), {
  ssr: false,
});

const movies = [
  {
    title: 'Phỏng Vấn Sát Nhân',
    alias: 'Murderer Report',
    bgImage: 'https://static.nutscdn.com/vimg/1920-0/3c16e73b8dfcdc05592ca01a370fb957.jpg',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/ac7763367d0fba9e6bd9de5f45396180.png',
    thumbImage: 'https://static.nutscdn.com/vimg/150-0/3c16e73b8dfcdc05592ca01a370fb957.jpg',
    imdb: '6.9',
    rating: 'T18',
    year: '2025',
    duration: '1h 48m',
    genres: ['Chính Kịch', 'Chiếu Rạp', 'Gay Cấn', 'Hình Sự', 'Bí Ẩn', 'Tâm Lý'],
    description: 'Baek Sun-ju (CHO Yeo-jeong) – một nữ phóng viên đang tuyệt vọng tìm kiếm một tin độc quyền, nhận được lời đề nghị phỏng vấn rùng rợn từ bác sĩ tâm thần Lee Young-hoon...',
  },
  {
    title: 'Frankenstein',
    alias: 'Frankenstein',
    bgImage: 'https://static.nutscdn.com/vimg/1920-0/3756ce14ee763cefd08bd1de1b4b88e8.webp',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/f0e04b4b77731ebf9bc4c726759a9215.png',
    thumbImage: 'https://static.nutscdn.com/vimg/150-0/8f6eb356f662c9b647449aa557ed1ef5.webp',
    imdb: '7.7',
    quality: '4K',
    rating: 'T18',
    year: '2025',
    duration: '2h 30m',
    genres: ['Kinh Dị', 'Cổ Điển', 'Khoa Học', 'Kỳ Ảo', 'Viễn Tưởng', 'Chuyển Thể'],
    description: 'Đạo diễn đoạt giải Oscar Guillermo del Toro tái hiện câu chuyện kinh điển của Mary Shelley về một nhà khoa học lỗi lạc và tạo vật mà tham vọng quái dị của anh tạo ra.',
  },
  {
    title: 'Vận May',
    alias: 'Good Fortune',
    bgImage: 'https://static.nutscdn.com/vimg/1920-0/d4b0a9dd47a0bf99a8ec3604ffd43f8e.webp',
    titleImage: 'https://static.nutscdn.com/vimg/0-260/3305fd9b4b59fdcad2bdc03e8ecdc8f0.png',
    thumbImage: 'https://static.nutscdn.com/vimg/150-0/d4b0a9dd47a0bf99a8ec3604ffd43f8e.webp',
    imdb: '6.8',
    rating: 'T16',
    year: '2025',
    duration: '1h 38m',
    genres: ['Hành Động', 'Chiếu Rạp', 'Hài', 'Kỳ Ảo', 'Viễn Tưởng'],
    description: 'Gabriel, một thiên thần thừa lòng tốt nhưng thiếu kỹ năng, tự dưng đi can thiệp vào cuộc sống của một anh nhân viên thời vụ lương ba cọc ba đồng và một đại gia chuyên đầu tư mạo hiểm, rồi làm rối tung rối mù hết cả lên.',
  },
];

const HomePage: React.FC = () => {

  return (
    <>
        <BannerSlider movies={movies} />
    </>
  );
};
export default HomePage;