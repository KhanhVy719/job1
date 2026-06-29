"use client";

import Image from 'next/image';
import React, { useState } from "react";
;
import ReplyInput from '@/components/Reply/Textarea';


export interface Rated {
    id: number | string;
    author: string;
    avatar: string;
    time: string;
    content: string;
    emotions: number;
    replies?: Rated[];
    totalReplies?: number;
}

interface RatedProps {
    item: Rated;
}

const emotions = [
    {
        id: 1,
        icon: "🤩", // Mắt sao (hoặc 😍)
        name: "Tuyệt vời"
    },
    {
        id: 2,
        icon: "😃", // Cười tươi
        name: "Phim hay"
    },
    {
        id: 3,
        icon: "😐", // Mặt trung lập
        name: "Khá ổn"
    },
    {
        id: 4,
        icon: "😴", // Buồn ngủ (thể hiện phim chán)
        name: "Phim chán"
    },
    {
        id: 5,
        icon: "😡", // Giận dữ (hoặc 👎 / 🤮)
        name: "Dở tệ"
    }
];

const fetchMockReplies = async (parentId: string | number, page: number): Promise<Rated[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newReplies: Rated[] = Array.from({ length: 3 }).map((_, idx) => ({
                id: `${parentId}-p${page}-${idx}`,
                author: `Người dùng ${parentId}-p${page}-${idx}`,
                avatar: "https://i.pravatar.cc/150",
                time: "Vừa xong",
                emotions: 1,
                content: `Đây là bình luận trang ${page} - nội dung thứ ${idx + 1} (giả lập API)`,
                replies: [],
            }));
            resolve(newReplies);
        }, 1000);
    });
};

const RatedItem: React.FC<RatedProps> = ({ item }) => {

    const [isReplying, setIsReplying] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [loadedReplies, setLoadedReplies] = useState<Rated[]>(item.replies || []);

    const [isLoadingReplies, setIsLoadingReplies] = useState(false);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);


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
            console.error("Lỗi tải Rated:", error);
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
            <div className="flex items-start space-x-3 relative">
                <Image
                    src={item.avatar || "https://ui-avatars.com/api/?name=" + item.author}
                    alt={item.author}
                    className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-full object-cover flex-shrink-0  transition-opacity duration-300 hover:opacity-80"
                    width={50}
                    height={50}
                />
                <div className='flex-1 min-w-0 '>
                    <div className="flex flex-wrap items-baseline gap-3">
                        <span className='md:px-2 md:bg-[#3556b6] bg-bg-body md:py-1 leading-normal rounded-full text-lg md:text-[13px] text-white md:relative md:top-auto md:left-auto absolute z-2 flex left-[24px] top-[-10px]'>
                            <span>{emotions.find(e => e.id === item.emotions)?.icon} </span>

                            <span className='ml-0.5 md:block hidden'>
                                {emotions.find(e => e.id === item.emotions)?.name}
                            </span>
                        </span>
                        <div className="text-white font-semibold">{item.author}</div>
                        <i className="fa-solid fa-infinity text-primary text-[10px]"></i>
                        <div className="text-gray-400 text-xs">{item.time}</div>
                    </div>

                    <p className="text-gray-400 mt-1.5 text-sm break-words whitespace-pre-wrap">
                        {item.content}
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
                            <RatedItem key={reply.id} item={reply} />
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

export default RatedItem;