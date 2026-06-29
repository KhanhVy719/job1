import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const TopList = dynamic(() => import("@/components/home/TopList"), {
    ssr: false,
});

const TopLists = [
    {
        id: 1,
        title: "X Thân Mến!",
        href: "/phim/x-than-men.nCBteE4n",
        thumb: "https://static.nutscdn.com/vimg/300-0/15e89252216e726ec0a61c3d187ec8e4.jpg",
        trend: "none",
    },
    {
        id: 2,
        title: "Nhất Quyền Nhân",
        href: "/phim/nhat-quyen-nhan.veMksLe2",
        thumb: "https://static.nutscdn.com/vimg/300-0/20fb9daf76d0b3f518c6a04841a175e4.jpg",
        trend: "up",
    },
    {
        id: 3,
        title: "Ám Hà Truyện",
        href: "/phim/am-ha-truyen.sC2ZXcjc",
        thumb: "https://static.nutscdn.com/vimg/300-0/6c9779087671f044479dec8f8e06ce28.jpg",
        trend: "up",
    },
    {
        id: 4,
        title: "Frankenstein",
        href: "/phim/frankenstein.JXl0tP1U",
        thumb: "https://static.nutscdn.com/vimg/300-0/cb0983a5b2e75571bdd66c5890403792.webp",
        trend: "up",
    },
    {
        id: 5,
        title: "IT: Chào Mừng Tới Derry",
        href: "/phim/it-chao-mung-toi-derry.JyKQNYGQ",
        thumb: "https://static.nutscdn.com/vimg/300-0/c04eb2651bacb46cc0642c503ee7be2e.jpg",
        trend: "down",
    },

    {
        id: 6,
        title: "Frankenstein",
        href: "/phim/frankenstein.JXl0tP1U",
        thumb: "https://static.nutscdn.com/vimg/300-0/cb0983a5b2e75571bdd66c5890403792.webp",
        trend: "up",
    },
    {
        id: 7,
        title: "IT: Chào Mừng Tới Derry",
        href: "/phim/it-chao-mung-toi-derry.JyKQNYGQ",
        thumb: "https://static.nutscdn.com/vimg/300-0/c04eb2651bacb46cc0642c503ee7be2e.jpg",
        trend: "down",
    },
];


const HomePage: React.FC = () => {

    return (
        <>

            <div className="col-span-2 ">
                <div className='p-6'>
                    <div className='flex items-center space-x-2 text-[16px] '>
                        <i className='fa-solid fa-clapperboard text-primary'></i>
                        <span className='font-semibold text-white '>SÔI NỔI NHẤT
                        </span>
                    </div>
                    <div className="mt-6">
                        <TopList
                            items={TopLists}
                            limit={5}
                        />
                    </div>

                </div>
            </div>
            <div className="col-span-2 border-t lg:border-t-0 md:border-l border-white/15 ">
                <div className='p-6'>
                    <div className='flex items-center space-x-2 text-[16px] '>
                        <i className='fa-solid fa-heart-circle-check text-primary'></i>
                        <span className='font-semibold text-white '>YÊU THÍCH NHẤT
                        </span>
                    </div>
                    <div className="mt-6">
                        <TopList
                            items={TopLists}
                            limit={5}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};
export default HomePage;