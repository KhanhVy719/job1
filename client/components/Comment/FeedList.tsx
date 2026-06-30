"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, FreeMode, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";

import { FilmComment, getLatestComments } from "@/utils/comment-api";

const fallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random&color=fff&size=128`;

export default function CommentFeed() {
  const [comments, setComments] = useState<FilmComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const data = await getLatestComments(14);
        if (active) setComments(data);
      } catch {
        if (active) setComments([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[275px] w-full rounded-xl bg-[#0005] animate-pulse" />
    );
  }

  if (comments.length === 0) {
    return (
      <div className="h-[275px] w-full rounded-xl border border-white/10 bg-[#0005] px-4 py-6 text-sm text-gray-400">
        Chưa có bình luận mới.
      </div>
    );
  }

  return (
    <Swiper
      direction="vertical"
      freeMode={true}
      spaceBetween={1}
      mousewheel={true}
      modules={[FreeMode, Mousewheel, Autoplay]}
      slidesPerView={4}
      className="h-[275px] w-full"
      autoplay={
        comments.length > 1
          ? {
              delay: 1600,
              disableOnInteraction: false,
            }
          : false
      }
      speed={400}
      loop={comments.length > 4}
    >
      {comments.map((comment) => (
        <SwiperSlide key={comment.id} style={{ height: "100%" }}>
          <Link
            href={comment.movie.slug ? `/phim/${comment.movie.slug}` : "#"}
            className="flex items-start py-2.5 bg-[#0005] px-4 rounded-xl"
          >
            <Image
              src={comment.user.avatar || fallbackAvatar(comment.user.fullname)}
              alt={`${comment.user.fullname} avatar`}
              width={30}
              height={30}
              className="rounded-full w-9 h-9 object-cover flex-shrink-0"
              loading="lazy"
            />

            <div className="ml-3 flex-1 space-y-2.5 overflow-hidden">
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="font-semibold text-white flex-shrink-0">
                  {comment.user.fullname}
                </span>

                {comment.user.verify && <i className="fas fa-mars text-[#FFD875]"></i>}
                <p className="text-gray-300 truncate">{comment.content}</p>
              </div>

              <div className="flex items-center text-[11px] leading-none">
                <i className="fa-solid fa-play text-[#FFD875]"></i>
                <span className="ml-1.5 truncate text-gray-500">
                  {comment.movie.name}
                </span>
              </div>
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
