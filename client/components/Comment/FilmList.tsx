"use client";

import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import ReplyInput from "@/components/Reply/Textarea";
import {
  createComment,
  FilmComment,
  getComments,
  voteComment,
} from "@/utils/comment-api";

interface CommentProps {
  item: FilmComment;
  onChanged?: () => void;
}

const formatTimeAgo = (value?: string) => {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Vừa xong";
  if (diff < hour) return `${Math.floor(diff / minute)} phút trước`;
  if (diff < day) return `${Math.floor(diff / hour)} giờ trước`;
  if (diff < day * 7) return `${Math.floor(diff / day)} ngày trước`;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const getAvatar = (comment: FilmComment) =>
  comment.user.avatar ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    comment.user.fullname || "User"
  )}&background=random&color=fff&size=128`;

const CommentItem: React.FC<CommentProps> = ({ item, onChanged }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [comment, setComment] = useState(item);
  const [isReplying, setIsReplying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loadedReplies, setLoadedReplies] = useState<FilmComment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(item.reply_count > 0);

  useEffect(() => {
    setComment(item);
    setHasMore(item.reply_count > 0);
  }, [item]);

  const handleTimeClick = (timeStr: string) => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set("time", timeStr);
    const newUrl = `${pathname}?${currentParams.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  const renderContent = (text: string) => {
    const timeRegex = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
    const parts = text.split(timeRegex);
    const matches = text.match(timeRegex) || [];
    const result: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      result.push(<span key={`text-${i}`}>{part}</span>);
      if (matches[i]) {
        const time = matches[i];
        result.push(
          <span
            key={`time-${i}`}
            onClick={() => handleTimeClick(time)}
            className="text-yellow-400 cursor-pointer"
            title={`Chuyển đến ${time}`}
          >
            {time}
          </span>
        );
      }
    });
    return result;
  };

  const loadMoreReplies = async () => {
    if (isLoadingReplies || !hasMore) return;
    setIsLoadingReplies(true);

    try {
      const response = await getComments({
        parentId: comment._id,
        page,
        limit: 5,
        sort: "latest",
      });

      setLoadedReplies((prev) => [...prev, ...response.data]);
      setPage((prev) => prev + 1);
      setHasMore(response.meta.hasMore);
    } catch (error: any) {
      toast.error(error?.message || "Lỗi tải trả lời");
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleToggleReplies = async () => {
    if (!isOpen) {
      setIsOpen(true);
      if (loadedReplies.length === 0) {
        await loadMoreReplies();
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleReply = async (text: string, isReveal: boolean) => {
    try {
      const created = await createComment({
        parent_id: comment._id,
        content: text,
        is_spoiler: isReveal,
      });

      setComment((prev) => ({
        ...prev,
        reply_count: prev.reply_count + 1,
        score: prev.score + 1,
      }));
      setLoadedReplies((prev) => [created, ...prev]);
      setIsOpen(true);
      onChanged?.();
      toast.success("Đã gửi trả lời");
    } catch (error: any) {
      toast.error(error?.message || "Không gửi được trả lời");
      throw error;
    }
  };

  const handleVote = async (value: -1 | 1) => {
    try {
      const nextValue = comment.viewer_vote === value ? 0 : value;
      const updated = await voteComment(comment._id, nextValue);
      setComment(updated);
    } catch (error: any) {
      toast.error(error?.message || "Bạn cần đăng nhập để đánh giá bình luận");
    }
  };

  const replyCountLabel =
    comment.reply_count > 0 ? `${comment.reply_count} trả lời` : "Xem trả lời";

  return (
    <div className="animate-fadeIn mt-4 w-full">
      <div className="flex items-start space-x-3">
        <Image
          src={getAvatar(comment)}
          alt={comment.user.fullname}
          className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-full object-cover flex-shrink-0 transition-opacity duration-300 hover:opacity-80"
          width={50}
          height={50}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <div className="text-white font-semibold">{comment.user.fullname}</div>
            {comment.user.verify && (
              <i className="fa-solid fa-infinity text-primary text-[10px]"></i>
            )}
            <div className="text-gray-400 text-xs">
              {formatTimeAgo(comment.createdAt)}
            </div>
            {comment.episode && (
              <div className="border border-gray-600 text-gray-500 rounded hover:text-white hover:border-white text-[10px] px-1 py-0.5 transition-colors">
                {comment.episode.name}
              </div>
            )}
          </div>

          <p className="text-gray-400 mt-1.5 text-sm break-words whitespace-pre-wrap">
            {comment.is_spoiler && (
              <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                Spoiler
              </span>
            )}
            {renderContent(comment.content)}
          </p>

          <div className="flex items-center space-x-4 my-3 select-none">
            <button
              onClick={() => handleVote(1)}
              className={`flex items-center space-x-1 hover:text-primary transition-colors ${
                comment.viewer_vote === 1 ? "text-primary" : "text-gray-400"
              }`}
              type="button"
            >
              <i className="fa-solid text-xs fa-circle-up"></i>
              <span className="text-[13px]">{comment.upvote_count}</span>
            </button>

            <button
              onClick={() => handleVote(-1)}
              className={`flex items-center space-x-1 hover:text-red-400 transition-colors ${
                comment.viewer_vote === -1 ? "text-red-400" : "text-gray-400"
              }`}
              type="button"
            >
              <i className="fa-solid text-xs fa-circle-down"></i>
              <span className="text-[13px]">{comment.downvote_count}</span>
            </button>

            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center space-x-1 hover:text-white text-gray-400 transition-colors"
              type="button"
            >
              <i className="fa-solid text-xs fa-reply"></i>
              <span className="text-[13px]">Trả lời</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pl-12 md:pl-14">
        {isReplying && (
          <div className="mb-5">
            <ReplyInput onClose={() => setIsReplying(false)} onSubmit={handleReply} />
          </div>
        )}

        {comment.reply_count > 0 && (
          <div className="mb-2 relative">
            <button
              onClick={handleToggleReplies}
              className="flex items-center space-x-1 text-primary group focus:outline-none"
              type="button"
            >
              <i
                className={`fa-solid fa-angle-down text-xs mt-0.5 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              ></i>
              <span className="text-[12px]">
                {isOpen ? "Thu gọn" : replyCountLabel}
              </span>
            </button>
          </div>
        )}

        {isOpen && (
          <div className="mt-2 space-y-4 pl-3">
            {loadedReplies.map((reply) => (
              <CommentItem key={reply.id} item={reply} onChanged={onChanged} />
            ))}

            {isLoadingReplies && (
              <div className="flex items-center space-x-2 text-xs py-2">
                <div className="inline-block w-[13px] h-[13px] border-[3px] border-current border-r-transparent rounded-full animate-spinner-border text-primary"></div>
                <span className="text-gray-300">Đang tải bình luận...</span>
              </div>
            )}

            {!isLoadingReplies && hasMore && loadedReplies.length > 0 && (
              <button
                onClick={loadMoreReplies}
                className="text-xs text-gray-400 hover:text-white mt-2 flex items-center space-x-1 group"
                type="button"
              >
                <i className="fa-solid fa-arrow-turn-up rotate-90 mr-1"></i>
                <span className="group-hover:underline">
                  Xem thêm bình luận cũ hơn
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
