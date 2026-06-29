"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FiArrowUpRight, FiArrowDownRight, FiMinus } from "react-icons/fi";

export type TopListItem = {
  id: string | number;
  title: string;
  href: string;
  thumb: string;
  trend:   string;
};

type Props = {
  items: TopListItem[];
  limit?: number; 
  onViewMore?: () => void;
  viewMoreLabel?: string;
};

const TrendIcon: React.FC<{ trend?: TopListItem["trend"] }> = ({ trend }) => {
  if (trend === "up") return <FiArrowUpRight className="text-green-500" />;
  if (trend === "down") return <FiArrowDownRight className="text-red-500" />;
  return <FiMinus className="text-gray-500" />;
};

const TopList: React.FC<Props> = ({ items, limit, onViewMore, viewMoreLabel = "Xem thêm" }) => {
  const list = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <>
      <div className="space-y-3">
        {list.map((item, idx) => (
          <div key={item.id} className="flex items-center space-x-4 rounded">
            <div className="w-6 text-center text-gray-500 font-medium">{idx + 1}.</div>

            <div className="w-4">
              <TrendIcon trend={item.trend} />
            </div>

            <div className="w-6 h-9 rounded overflow-hidden">
              <Image
                width={56}
                height={80}
                src={item.thumb}
                alt={item.title}
                className="w-full h-full object-cover"
                  loading="lazy"

              />
            </div>

            <div className="flex-1 min-w-0">
              <Link href={item.href ?? "#"} className="text-sm hover:text-primary truncate text-white">
                {item.title}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 ml-1 text-start">
        <button
          onClick={onViewMore}
          className="text-xs text-gray-400 hover:text-primary"
        >
          {viewMoreLabel}
        </button>
      </div>
    </>
  );
};

export default TopList;
