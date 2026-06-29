'use client';

import Image from 'next/image';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, FreeMode, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/autoplay';

type Comment = {
    id: number;
    username: string;
    avatarUrl: string;
    commentText: string;
    contentTitle: string;
};

const LOCAL_AVATAR = '/images/logo_rox.svg';

const mockComments: Comment[] = [
    { id: 1, username: 'Susan1228', avatarUrl: LOCAL_AVATAR, commentText: '2 bé diễn viên lúc nữ chính còn bé với hồi trung học xinh ghê ý', contentTitle: 'Hãy Lấy Em Đi' },
    { id: 2, username: 'Hoàng X', avatarUrl: LOCAL_AVATAR, commentText: 'phim kinh dị thật à mọi người, thấy tag kinh dị mà xem video ngắn trên...', contentTitle: 'X Thân Mến!' },
    { id: 3, username: 'Anh Ngọc', avatarUrl: LOCAL_AVATAR, commentText: 'Nhạc cuối phim hay ghê', contentTitle: 'Sóng Trăng Hoàn Mệnh' },
    { id: 4, username: 'tong09', avatarUrl: LOCAL_AVATAR, commentText: 'poster và phim chẳng liên quan, - quá dở luôn, quá tệ luôn,', contentTitle: 'Zombiverse' },
    { id: 5, username: 'User 5', avatarUrl: LOCAL_AVATAR, commentText: 'Một bình luận khác để test', contentTitle: 'Phim Gì Đó' },
    { id: 6, username: 'User 6', avatarUrl: LOCAL_AVATAR, commentText: 'Cuộn dọc thật tuyệt!', contentTitle: 'Review App' },
    { id: 7, username: 'User 7', avatarUrl: LOCAL_AVATAR, commentText: 'Một bình luận khác để test', contentTitle: 'Phim Gì Đó' },
    { id: 8, username: 'User 8', avatarUrl: LOCAL_AVATAR, commentText: 'Cuộn dọc thật tuyệt!', contentTitle: 'Review App' },
    { id: 9, username: 'User 9', avatarUrl: LOCAL_AVATAR, commentText: 'Một bình luận khác để test', contentTitle: 'Phim Gì Đó' },
    { id: 10, username: 'User 10', avatarUrl: LOCAL_AVATAR, commentText: 'Cuộn dọc thật tuyệt!', contentTitle: 'Review App' },
    { id: 11, username: 'User 11', avatarUrl: LOCAL_AVATAR, commentText: 'Một bình luận khác để test', contentTitle: 'Phim Gì Đó' },
    { id: 12, username: 'User 12', avatarUrl: LOCAL_AVATAR, commentText: 'Cuộn dọc thật tuyệt!', contentTitle: 'Review App' },
    { id: 13, username: 'User 13', avatarUrl: LOCAL_AVATAR, commentText: 'Một bình luận khác để test', contentTitle: 'Phim Gì Đó' },
    { id: 14, username: 'User 14', avatarUrl: LOCAL_AVATAR, commentText: 'Cuộn dọc thật tuyệt!', contentTitle: 'Review App' },
];

export default function CommentFeed() {
    return (
        <Swiper
            direction={'vertical'}
            freeMode={true}
            spaceBetween={1}
            mousewheel={true}
            modules={[FreeMode, Mousewheel, Autoplay]}
            slidesPerView={4}
            className="h-[275px] w-full"
            autoplay={{
                delay: 1000,
                disableOnInteraction: false,
            }}
            speed={400}
            loop={true}
        >
            {mockComments.map((comment) => (
                <SwiperSlide key={comment.id} style={{ height: '100%' }}>
                    <div className="flex items-start py-2.5 bg-[#0005] px-4 rounded-xl">
                        <Image
                            src={comment.avatarUrl}
                            alt={`${comment.username} avatar`}
                            width={30}
                            height={30}
                            className="rounded-full w-9 h-9 object-cover flex-shrink-0"
                            loading="lazy"
                        />

                        <div className="ml-3 flex-1 space-y-2.5 overflow-hidden">
                            <div className="flex items-center space-x-1.5 text-xs">
                                <span className="font-semibold text-white flex-shrink-0">
                                    {comment.username}
                                </span>

                                <i className="fas fa-mars text-[#FFD875]"></i>
                                <p className="text-gray-300 truncate">
                                    {comment.commentText}
                                </p>
                            </div>

                            <div className="flex items-center text-[11px] leading-none">
                                <i className="fa-solid fa-play text-[#FFD875] "></i>
                                <span className="ml-1.5 truncate text-gray-500">{comment.contentTitle}</span>
                            </div>
                        </div>
                    </div>

                </SwiperSlide>
            ))}
        </Swiper>
    );
}