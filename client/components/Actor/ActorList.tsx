"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Loader from "@/components/loading/list";

const FALLBACK_IMAGE = "/images/logo_rox.svg";

interface ActorListProps {
    actor: IActor[];
    pagination: {
        total: number;
        currentPage: number;
        totalPages: number;
        itemsPerPage: number;
    } | null;
    onPageChange: (page: number) => void;
}

const ActorList: React.FC<ActorListProps> = ({ actor, pagination, onPageChange }) => {
    const [inputPage, setInputPage] = useState<string>("1");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await new Promise((res) => setTimeout(res, 300));
            
            
            setLoading(false);
        };

        fetchData();
    }, []); 
    useEffect(() => {
        if (pagination) {
            setInputPage(pagination.currentPage.toString());
        }
    }, [pagination]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const pageNumber = parseInt(inputPage);
            if (!isNaN(pageNumber)) {
                onPageChange(pageNumber);
            }
        }
    };

    const handlePrev = () => {
        if (pagination && pagination.currentPage > 1) {
            onPageChange(pagination.currentPage - 1);
        }
    };

    const handleNext = () => {
        if (pagination && pagination.currentPage < pagination.totalPages) {
            onPageChange(pagination.currentPage + 1);
        }
    };

    return (
        <div className="relative w-full">
            {loading ? (
                <Loader />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {actor.map((item, index) => {
                        // Xử lý logic ảnh: Nếu có avatar thì dùng, không thì dùng ảnh mặc định
                        const imageUrl = item.avatar && item.avatar.trim() !== ""
                            ? item.avatar
                            : FALLBACK_IMAGE;

                        return (
                            <div key={item._id || index}>
                                {/* Link chuyển hướng, bạn có thể sửa href tùy theo cấu trúc route */}
                                <Link href={`/dien-vien/${item.slug}`} className="flex flex-col h-full">
                                    <div className="relative">
                                        <Image
                                            width={300}
                                            height={500}
                                            src={imageUrl}
                                            alt={item.name}
                                            style={{ objectFit: "cover" }}
                                            loading="lazy"
                                            // Nếu dùng ảnh fallback từ domain khác, nhớ config trong next.config.js
                                            className="rounded-xl w-full max-h-[300px] min-h-[250px] h-full hover:opacity-[0.8] bg-[#2F3346]"
                                        />
                                        <div className="absolute z-[5] flex items-center w-full bottom-3 justify-center text-center">
                                            <h3 className="text-sm font-semibold truncate text-white hover:text-primary px-2">
                                                {item.name}
                                            </h3>
                                        </div>
                                        <div className="h-[30%] w-[100%] left-0 rounded-[1px] z-[1] absolute bottom-[0] bg-[linear-gradient(0deg,rgba(var(--bg-body)/0.95)_0%,rgba(var(--bg-body)/0.85)_20%,rgba(var(--bg-body)/0.7)_40%,rgba(var(--bg-body)/0.5)_60%,rgba(var(--bg-body)/0.3)_80%,rgba(var(--bg-body)/0)_100%)]" />
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}

            {pagination && (
                <div className="w-full flex items-center justify-center my-20">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handlePrev}
                            disabled={pagination.currentPage <= 1}
                            className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center transition-opacity ${pagination.currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80'}`}
                        >
                            <i className="fa-solid fa-arrow-left text-gray-400"></i>
                        </button>

                        <div className="h-[50px] px-8 rounded-full bg-[#2F3346] flex items-center justify-center space-x-1.5">
                            <div className="text-white text-sm">Trang</div>
                            <input
                                className="text-white w-auto text-[13px] text-center px-3 py-1.5 outline-0 rounded-md max-w-[50px] font-bold flex items-center justify-center border border-gray-600 focus:border-gray-500 bg-transparent placeholder:text-[#7a7c81]"
                                type="number"
                                value={inputPage}
                                onChange={(e) => setInputPage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={() => {
                                    if (!inputPage) setInputPage(pagination.currentPage.toString())
                                }}
                            />
                            <div className="text-white text-sm">/{pagination.totalPages}</div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className={`h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center transition-opacity ${pagination.currentPage >= pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80'}`}
                        >
                            <i className="fa-solid fa-arrow-right text-white"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActorList;