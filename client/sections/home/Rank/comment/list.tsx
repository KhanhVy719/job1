import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const Feed = dynamic(() => import("@/components/Comment/FeedList"), {
    ssr: false,
});

const HomePage: React.FC = () => {

    return (
        <>

            <div className="hidden xl:block col-span-3 border-l border-white/15 ">
                <div className='p-6'>
                    <div className='flex items-center space-x-2 text-[16px] '>
                        <i className='fa-solid fa-folder-plus text-primary'></i>
                        <span className='font-semibold text-white '>BÌNH LUẬN MỚI
                        </span>
                    </div>
                    <div className='mt-3'>
                        <Feed />
                    </div>

                </div>
            </div>

        </>
    );
};
export default HomePage;