import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { getActiveCommentMovies } from "@/utils/comment-api";
import type { TopListItem } from "@/components/home/TopList";

const TopList = dynamic(() => import("@/components/home/TopList"), {
  ssr: false,
});

const HomePage: React.FC = () => {
  const [activeItems, setActiveItems] = useState<TopListItem[]>([]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const data = await getActiveCommentMovies(5);
        if (active) setActiveItems(data);
      } catch {
        if (active) setActiveItems([]);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="col-span-2 ">
        <div className="p-6">
          <div className="flex items-center space-x-2 text-[16px] ">
            <i className="fa-solid fa-clapperboard text-primary"></i>
            <span className="font-semibold text-white ">SÔI NỔI NHẤT</span>
          </div>
          <div className="mt-6">
            <TopList items={activeItems} limit={5} />
          </div>
        </div>
      </div>
      <div className="col-span-2 border-t lg:border-t-0 md:border-l border-white/15 ">
        <div className="p-6">
          <div className="flex items-center space-x-2 text-[16px] ">
            <i className="fa-solid fa-heart-circle-check text-primary"></i>
            <span className="font-semibold text-white ">YÊU THÍCH NHẤT</span>
          </div>
          <div className="mt-6">
            <TopList items={[]} limit={5} viewMoreLabel="" />
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
