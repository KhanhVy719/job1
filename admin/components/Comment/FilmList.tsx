"use client";

import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React, { useState } from "react";
;
import ReplyInput from '@/components/Reply/Textarea';

export interface Comment {
    id: number | string;
    author: string;
    avatar: string;
    time: string;
    content: string;
    replies?: Comment[];
    totalReplies?: number;
}


interface CommentProps {
    item: Comment;
}

const fetchMockReplies = async (parentId: string | number, page: number): Promise<Comment[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newReplies: Comment[] = Array.from({ length: 3 }).map((_, idx) => ({
                id: `${parentId}-p${page}-${idx}`,
                author: `Người dùng ${parentId}-p${page}-${idx}`,
                avatar: "https://i.pravatar.cc/150",
                time: "Vừa xong",
                content: `Đây là bình luận trang ${page} - nội dung thứ ${idx + 1} (giả lập API)`,
                replies: [],
            }));
            resolve(newReplies);
        }, 1000);
    });
};

const CommentItem: React.FC<CommentProps> = ({ item }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isReplying, setIsReplying] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [loadedReplies, setLoadedReplies] = useState<Comment[]>(item.replies || []);

    const [isLoadingReplies, setIsLoadingReplies] = useState(false);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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
        if (isLoadingReplies) return;
        setIsLoadingReplies(true);

        try {
            const newData = await fetchMockReplies(item.id, page);

            if (newData.length === 0) {
                setHasMore(false);
            } else {
                setLoadedReplies((prev) => [...prev, ...newData]);
                setPage((prev) => prev + 1);
            }
        } catch (error) {
            console.error("Lỗi tải comment:", error);
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

    const replyCountLabel = loadedReplies.length > 0
        ? `${loadedReplies.length} trả lời`
        : (item.replies && item.replies.length > 0 ? `${item.replies.length} trả lời` : "Xem trả lời");

    return (
        <div className="animate-fadeIn mt-4 w-full">
            <div className="flex items-start space-x-3">
                <Image
                    src={item.avatar || "https://ui-avatars.com/api/?name=" + item.author}
                    alt={item.author}
                    className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-full object-cover flex-shrink-0  transition-opacity duration-300 hover:opacity-80"
                    width={50}
                    height={50}
                />
                <div className='flex-1 min-w-0'>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <div className="text-white font-semibold">{item.author}</div>
                        <i className="fa-solid fa-infinity text-primary text-[10px]"></i>
                        <div className="text-gray-400 text-xs">{item.time}</div>
                        <div className='border border-gray-600 text-gray-500 rounded hover:text-white hover:border-white text-[10px] px-1 py-0.5 cursor-pointer transition-colors'>
                            P1 P2
                        </div>
                    </div>

                    <p className="text-gray-400 mt-1.5 text-sm break-words whitespace-pre-wrap">
                        {renderContent(item.content)}
                    </p>

                    <div className='flex items-center space-x-4 my-3 select-none'>
                        <button className='flex items-center space-x-1 hover:text-primary text-gray-400 transition-colors'>
                            <i className="fa-solid text-xs fa-circle-up"></i>
                            <span className='text-[13px]'>1</span>
                        </button>

                        <button className='flex items-center space-x-1 hover:text-red-400 text-gray-400 transition-colors'>
                            <i className="fa-solid text-xs fa-circle-down"></i>
                            <span className='text-[13px]'>1</span>
                        </button>

                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className='flex items-center space-x-1 hover:text-white text-gray-400 transition-colors'
                        >
                            <i className="fa-solid text-xs fa-reply"></i>
                            <span className='text-[13px]'>Trả lời</span>
                        </button>

                        <button className='flex items-center space-x-1 hover:text-white text-gray-400 transition-colors'>
                            <i className="fa-solid text-xs fa-ellipsis"></i>
                            <span className='text-[13px]'>Thêm</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className='pl-12 md:pl-14'>
                {isReplying && (
                    <div className="mb-5">
                        <ReplyInput
                            onClose={() => setIsReplying(false)}
                            onSubmit={(text, reveal) => {
                                console.log("Gửi:", text, "Spoiler:", reveal);
                                setIsReplying(false);
                            }}
                        />
                    </div>
                )}
                {(loadedReplies.length > 0 || (item.replies && item.replies.length > 0) || hasMore) && (
                    <div className='mb-2 relative'>
                        <button
                            onClick={handleToggleReplies}
                            className='flex items-center space-x-1 text-primary group focus:outline-none'
                        >
                            <i className={`fa-solid fa-angle-down text-xs mt-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
                            <span className='text-[12px] '>
                                {isOpen ? 'Thu gọn' : replyCountLabel}
                            </span>
                        </button>
                    </div>
                )}

                {isOpen && (
                    <div className="mt-2 space-y-4 pl-3">
                        {loadedReplies.map((reply) => (
                            <CommentItem key={reply.id} item={reply} />
                        ))}

                        {isLoadingReplies && (
                            <div className="flex items-center space-x-2  text-xs py-2">
                                <div className="inline-block w-[13px] h-[13px] border-[3px] border-current border-r-transparent rounded-full animate-spinner-border text-primary"></div>
                                <span className='text-gray-300'>Đang tải bình luận...</span>
                            </div>
                        )}

                        {!isLoadingReplies && hasMore && loadedReplies.length > 0 && (
                            <button
                                onClick={loadMoreReplies}
                                className="text-xs text-gray-400 hover:text-white mt-2 flex items-center space-x-1 group"
                            >
                                <i className="fa-solid fa-arrow-turn-up rotate-90 mr-1"></i>
                                <span className="group-hover:underline">Xem thêm bình luận cũ hơn</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentItem;