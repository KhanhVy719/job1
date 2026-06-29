"use client";

import React from "react";
import Link from "next/link";
import { FiArrowUpRight, FiArrowDownRight, FiMinus } from "react-icons/fi";

const TAG_COLORS = [
  "bg-[#742d4b]",
  "bg-[#387fda]",
  "bg-[#7356b1]",
  "bg-[#91ab47]",
  "bg-[#a98762] ",
  "bg-[#218a8f]",
  "bg-[#9616d1]",
  "bg-[#c9512c]",
];

export type TrendingTagItem = {
  id: string | number;
  title: string;
  href: string;
  trend: string;
};

type Props = {
  items: TrendingTagItem[];
};


const TrendIcon: React.FC<{ trend?: TrendingTagItem["trend"] }> = ({ trend }) => {
  if (trend === "up") return <FiArrowUpRight className="text-green-500" />;
  if (trend === "down") return <FiArrowDownRight className="text-red-500" />;
  return <FiMinus className="text-gray-500" />;
};

const TrendingTags: React.FC<Props> = ({ items }) => {
  return (<>
    <div className="space-y-5">
      {items.map((item, idx) => {
        const colorClass = TAG_COLORS[idx % TAG_COLORS.length];

        return (
          <div key={item.id} className="flex items-center space-x-5">
            <div className="flex w-6 justify-center">
              <TrendIcon trend={item.trend} />
            </div>

            <div>
              <Link
                href={item.href}
                className={`inline-block rounded-full text-white px-4 py-1.5 text-xs transition-opacity hover:opacity-80 ${colorClass}`}
              >
                {item.title}
              </Link>
            </div>
          </div>
        );
      })}
    </div>

    <div className="mt-4 pt-0.5 ml-1 text-start">
      <button
        className="text-xs text-gray-400 hover:text-primary"
      >
       Xem thêm
      </button>
    </div>
    </>
  );
};

export default TrendingTags;