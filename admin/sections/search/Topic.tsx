import React, { useEffect, useState } from 'react';
import Link from "next/link";
import Loader from "@/components/loading/list"

const topicsStatic = [
    { title: 'Marvel', gradient: 'from-blue-500 to-blue-700', href: '/c/marvel' },
    { title: '4K', gradient: 'from-slate-500 to-violet-400', href: '/c/4k' },
    { title: 'Sitcom', gradient: 'from-green-500 to-green-700', href: '/c/sitcom' },
    { title: 'Lồng Tiếng Cực Mạnh', gradient: 'from-purple-500 to-purple-700', href: '/c/long-tieng' },
    { title: 'Xuyên Không', gradient: 'from-orange-500 to-orange-700', href: '/c/xuyen-khong' },
    { title: 'Cổ Trang', gradient: 'from-red-500 to-red-700', href: '/c/co-trang' },
    { title: '9x', gradient: 'from-gray-500 to-gray-700', href: '/c/9x' },
    { title: 'Tham Vọng', gradient: 'from-yellow-500 to-yellow-700', href: '/c/tham-vong' },
    { title: 'Chữa Lành', gradient: 'from-teal-500 to-teal-700', href: '/c/chua-lanh' },
    { title: 'Phù Thủy', gradient: 'from-indigo-500 to-indigo-700', href: '/c/phu-thuy' },
    { title: 'Tham Vọng', gradient: 'from-yellow-500 to-yellow-700', href: '/c/tham-vong' },
    { title: 'Chữa Lành', gradient: 'from-teal-500 to-teal-700', href: '/c/chua-lanh' },
];


const Topic: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [topicsData, setTopicsData] = useState<typeof topicsStatic | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            await new Promise((res) => setTimeout(res, 300));

            setTopicsData(topicsStatic);
            setLoading(false);
        };

        fetchData();
    }, []);
    return (
        <>

            {loading ? (
                <Loader />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {topicsData?.map((topic, index) => (
                        <Link href={topic.href}
                            key={index}
                            className={`relative transform transition-transform duration-300 ease-out hover:-translate-y-2 
                            overflow-hidden rounded-xl p-6 text-white bg-gradient-to-br ${topic.gradient} 
                            after:absolute after:inset-0 after:bg-[url(/images/wave.png)] after:bg-no-repeat after:opacity-30 
                            after:[mask-image:linear-gradient(-45deg,black,transparent_40%)] 
                            after:[-webkit-mask-image:linear-gradient(-45deg,black,transparent_40%)] 
                            after:bg-[length:200px_140px] after:bg-[position:right_-2rem_bottom_0] 
                            flex flex-col justify-end h-36`}
                        >
                            <h3 className={`text-lg lg:text-xl font-bold relative z-10 w-[80%]`}>
                                {topic.title}
                            </h3>
                            <div
                                className={`font-medium mt-3 flex items-center relative space-x-2 leading-none z-10`}
                            >
                                <span>Xem chủ đề</span> <i className="fa-solid fa-angle-right"></i>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
};
export default Topic;