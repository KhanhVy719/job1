import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { FilmComment, getTopComments } from "@/utils/comment-api";

const CommentSwiper = dynamic(() => import("@/components/Comment/CommentList"), {
  ssr: false,
});

const fallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random&color=fff&size=128`;

const HomePage: React.FC = () => {
  const [comments, setComments] = useState<FilmComment[]>([]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const data = await getTopComments(8);
        if (active) setComments(data);
      } catch {
        if (active) setComments([]);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  const commentsData = useMemo(
    () =>
      comments.map((comment) => ({
        id: comment.id,
        userAvatarUrl: comment.user.avatar || fallbackAvatar(comment.user.fullname),
        imageUrl:
          comment.movie.thumb_url ||
          comment.movie.poster_url ||
          "/images/placeholder-poster.svg",
        userName: comment.user.fullname,
        isVerified: comment.user.verify,
        content: comment.content,
        likes: comment.upvote_count,
        commentsCount: comment.reply_count,
        linkUrl: comment.movie.slug ? `/phim/${comment.movie.slug}` : "#",
      })),
    [comments]
  );

  return (
    <>
      <div className="md:block hidden px-6 pt-6">
        <div className="flex items-center space-x-2 text-[16px] ">
          <i className="fa-solid fa-medal text-primary"></i>
          <span className="font-semibold text-white ">TOP BÌNH LUẬN</span>
        </div>
        <div className="mt-6">
          <CommentSwiper comments={commentsData} />
        </div>
      </div>
    </>
  );
};

export default HomePage;
