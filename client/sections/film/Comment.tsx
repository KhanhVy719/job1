import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { toast } from "react-hot-toast";

import Loader from "@/components/loading/list";
import CommentItems from "@/components/Comment/FilmList";
import icon from "@/types/icon";
import { useAuthContext } from "@/context/AuthContext";
import { createComment, FilmComment, getComments } from "@/utils/comment-api";

type Props = {
  movieId?: string;
  episodeId?: string;
  onCountChange?: (count: number) => void;
};

const MAX_COMMENT = 1000;

const Topic: React.FC<Props> = ({ movieId, episodeId, onCountChange }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<FilmComment[]>([]);
  const [text, setText] = useState("");
  const [isReveal, setIsReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem("access_token")));
  }, []);

  const fetchData = useCallback(async () => {
    if (!movieId) {
      setComments([]);
      setLoading(false);
      onCountChange?.(0);
      return;
    }

    setLoading(true);
    try {
      const response = await getComments({
        movieId,
        episodeId,
        page: 1,
        limit: 20,
        sort: "latest",
      });
      setComments(response.data);
      onCountChange?.(response.meta.totalComments);
    } catch (error: any) {
      toast.error(error?.message || "Lỗi tải bình luận");
    } finally {
      setLoading(false);
    }
  }, [episodeId, movieId, onCountChange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!movieId || submitting || !text.trim() || text.length > MAX_COMMENT) return;
    if (!hasToken && !user) {
      toast.error("Bạn cần đăng nhập để bình luận");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createComment({
        movie_id: movieId,
        episode_id: episodeId,
        content: text,
        is_spoiler: isReveal,
      });
      setComments((prev) => [created, ...prev]);
      onCountChange?.(comments.length + 1);
      setText("");
      setIsReveal(false);
      toast.success("Đã gửi bình luận");
      void fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Không gửi được bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = user?.fullname || (hasToken ? "Tài khoản của bạn" : "Khách");
  const avatar =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=random&color=fff&size=128`;

  return (
    <>
      <div className="flex items-center space-x-3 mt-6">
        <Image
          src={avatar}
          alt={displayName}
          width={46}
          height={48}
          className="object-cover rounded-full border-white border-2 w-[46px] h-[46px]"
        />
        <div className="flex flex-col">
          <div className="text-gray-400 text-xs">Bình luận với tên</div>
          <div className="text-white font-medium text-sm mt-1">{displayName}</div>
        </div>
      </div>

      <div className="mt-4 px-3 py-3 rounded-xl bg-[#ffffff10]">
        <div className="relative">
          <textarea
            className={`border-transparent border p-2 rounded-lg bg-bg-body w-full outline-none resize-none overflow-hidden ${
              text.length > MAX_COMMENT ? "border-red-500" : ""
            }`}
            rows={4}
            maxLength={MAX_COMMENT + 100}
            placeholder={hasToken || user ? "Viết bình luận" : "Đăng nhập để viết bình luận"}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <div
            className={`absolute top-[6px] right-[10px] rounded-lg px-1 py-1 text-[11px] ${
              text.length > MAX_COMMENT ? "text-red-400" : "text-gray-400"
            }`}
          >
            {text.length}/{MAX_COMMENT}
          </div>
          {text.length > MAX_COMMENT && (
            <p className="text-xs text-red-400 mt-1">
              Bạn đã vượt quá giới hạn ký tự!
            </p>
          )}
        </div>
        <div className="my-1.5 flex justify-between items-center">
          <button
            onClick={() => setIsReveal((prev) => !prev)}
            className="flex items-center space-x-2 cursor-pointer"
            type="button"
          >
            <div
              className={clsx(
                "relative flex-shrink-0 rounded-2xl w-[30px] border h-[18px] transition-colors duration-300",
                isReveal ? "bg-primary/10 border-primary" : " border-gray-600"
              )}
            >
              <span
                className={clsx(
                  "absolute h-[8px] w-[8px] rounded-[20px] transition-all duration-300 ease-in-out",
                  "top-[4px]",
                  isReveal ? "bg-primary left-[18px]" : "bg-gray-600 left-[4px]"
                )}
              ></span>
            </div>
            <span className="text-white text-[13px]">Tiết lộ?</span>
          </button>

          {!hasToken && !user ? (
            <button className="open-login text-primary text-sm font-medium" type="button">
              Đăng nhập để gửi
            </button>
          ) : (
            <button
              className="flex items-center space-x-2 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || text.trim().length === 0 || text.length > MAX_COMMENT}
              onClick={handleSubmit}
              type="button"
            >
              <span className="font-medium text-sm">
                {submitting ? "Đang gửi" : "Gửi"}
              </span>
              <icon.Send width={20} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <Loader />
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItems key={comment.id} item={comment} onChanged={fetchData} />
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-gray-400">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận.
          </div>
        )}
      </div>
    </>
  );
};

export default Topic;
