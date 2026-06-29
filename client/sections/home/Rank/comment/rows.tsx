import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const CommentSwiper = dynamic(() => import("@/components/Comment/CommentList"), {
    ssr: false,
});

const LOCAL_AVATAR = '/images/logo_rox.svg';

const commentsData = [
    {
        id: 1,
        userAvatarUrl: LOCAL_AVATAR,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/fde90cfaece1224f7c5cf420f3bba7b8.jpg",
        userName: "Trung96",
        isVerified: true,
        content: "Phải dùng lại ở nửa tập để cmt. TRỜI ƠI BỌN TRẺ ĐÔNG ĐÌNH QUÁ! TÂ...",
        likes: 3,
        commentsCount: 0,
        linkUrl: "/users/trung96",
    },
    {
        id: 2,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/6d543564013eaa20da3c4e8c288f13b7.jpg",

        userAvatarUrl: LOCAL_AVATAR,
        userName: "Hagopromo",
        isVerified: true,
        content: "Phim cả thế giới đánh giá tệ chưa từng có. 5.1/10xếp xỉ rác phẩm...",
        likes: 0,
        commentsCount: 3,
        linkUrl: "/users/hagopromo",
    },
    {
        id: 3,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/c04eb2651bacb46cc0642c503ee7be2e.jpg",

        userAvatarUrl: LOCAL_AVATAR,
        userName: "Kerro407",
        isVerified: true,
        content: "lũ luoonn , tra thù cuộc đời thoai mái,nhưng lợi dụng lòng tốt của...",
        likes: 8,
        commentsCount: 2,
        linkUrl: "/users/kerro407",
    },
    {
        id: 4,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/c04eb2651bacb46cc0642c503ee7be2e.jpg",

        userAvatarUrl: LOCAL_AVATAR,
        userName: "Mikhail Kalashnikov",
        isVerified: false,
        content: "phim điều *** ...đấu văn tay trên giấy bóng chảy thì không đối chiếu. một...",
        likes: 0,
        commentsCount: 7,
        linkUrl: "/users/mikhailkalashnikov",
    },
    {
        id: 5,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/c04eb2651bacb46cc0642c503ee7be2e.jpg",

        userAvatarUrl: LOCAL_AVATAR, // Thay bằng đường dẫn ảnh thực tế
        userName: "Bin đẹp trai",
        isVerified: true,
        content: "Thấy lẳng gắm bát tràng là i làm biếng xem. bọn đi ngược tạo hoạ...",
        likes: 1,
        commentsCount: 2,
        linkUrl: "/users/bindeptrai",
    },
    {
        id: 6,
        userAvatarUrl: LOCAL_AVATAR,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/fde90cfaece1224f7c5cf420f3bba7b8.jpg",
        userName: "Trung96",
        isVerified: true,
        content: "Phải dùng lại ở nửa tập để cmt. TRỜI ƠI BỌN TRẺ ĐÔNG ĐÌNH QUÁ! TÂ...",
        likes: 3,
        commentsCount: 0,
        linkUrl: "/users/trung96",
    },
    {
        id: 7,
        userAvatarUrl: LOCAL_AVATAR,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/fde90cfaece1224f7c5cf420f3bba7b8.jpg",
        userName: "Trung96",
        isVerified: true,
        content: "Phải dùng lại ở nửa tập để cmt. TRỜI ƠI BỌN TRẺ ĐÔNG ĐÌNH QUÁ! TÂ...",
        likes: 3,
        commentsCount: 0,
        linkUrl: "/users/trung96",
    },
    {
        id: 8,
        userAvatarUrl: LOCAL_AVATAR,
        imageUrl: "https://static.nutscdn.com/vimg/300-0/fde90cfaece1224f7c5cf420f3bba7b8.jpg",
        userName: "Trung96",
        isVerified: true,
        content: "Phải dùng lại ở nửa tập để cmt. TRỜI ƠI BỌN TRẺ ĐÔNG ĐÌNH QUÁ! TÂ...",
        likes: 3,
        commentsCount: 0,
        linkUrl: "/users/trung96",
    },
];
const HomePage: React.FC = () => {

    return (
        <>
            <div className='md:block hidden px-6 pt-6'>
                <div className='flex items-center space-x-2 text-[16px] '>
                    <i className='fa-solid fa-medal text-primary'></i>
                    <span className='font-semibold text-white '>TOP BÌNH LUẬN
                    </span>
                </div>
                <div className='mt-6'>
                    <CommentSwiper comments={commentsData} />
                </div>
            </div>
        </>
    );
};
export default HomePage;