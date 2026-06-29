import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";


const TrendingTags = dynamic(() => import("@/components/home/TrendingTags"), {
    ssr: false,
});


const trendingTagsData = [
    {
        id: 1,
        title: "Chính Kịch",
        href: "/the-loai/chinh-kich",
        trend: "same",
    },
    {
        id: 2,
        title: "Tâm Lý",
        href: "/the-loai/tam-ly",
        trend: "up",
    },
    {
        id: 3,
        title: "Hài",
        href: "/the-loai/hai",
        trend: "up",
    },
    {
        id: 4,
        title: "Tình Cảm",
        href: "/the-loai/tinh-cam",
        trend: "down",
    },
    {
        id: 5,
        title: "Lãng Mạn",
        href: "/the-loai/lang-man",
        trend: "down",
    },
];



const HomePage: React.FC = () => {

    return (
        <>

            <div className="hidden lg:block xl:hidden col-span-2 border-l border-white/15 ">
                <div className='p-6'>
                    <div className='flex items-center space-x-2 text-[16px] '>
                        <i className='fa-solid fa-folder-plus text-primary'></i>
                        <span className='font-semibold text-white '>THỂ LOẠI HOT
                        </span>
                    </div>

                    <div className="mt-6">
                        <TrendingTags
                            items={trendingTagsData}
                        />
                    </div>

                </div>
            </div>
        </>
    );
};
export default HomePage;