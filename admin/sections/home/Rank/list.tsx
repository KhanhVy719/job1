import React, { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const TopList = dynamic(() => import("@/sections/home/Movie/TopList"), {
    ssr: false,
});
const CommentList = dynamic(() => import("@/sections/home/Rank/comment/list"), {
    ssr: false,
});
const CommentRows = dynamic(() => import("@/sections/home/Rank/comment/rows"), {
    ssr: false,
});
const Trending = dynamic(() => import("@/sections/home/Tags/Trending"), {
    ssr: false,
});

const HomePage: React.FC = () => {

    return (
        <>

            <div className='rounded-xl mt-8 lg:mt-12 border border-white/15'>
                <CommentRows />
                <hr className='md:block hidden mt-10 border-white/15' />
                <div className='grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-7 gap-4'>
                    <TopList />
                    <Trending />
                    <CommentList />
                </div>
            </div>
        </>
    );
};
export default HomePage;