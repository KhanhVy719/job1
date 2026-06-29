import React, { useEffect, useState } from 'react';
import Link from "next/link";
import Loader from "@/components/loading/list"

import RatedItems from "@/components/Rated/FilmList";


const RatedLIST = [
    {
        id: 1,
        author: "Sơn Lều",
        emotions: 1,
        avatar: "/images/logo_rox.svg",
        time: "2 ngày trước",
        content: "nice",
        replies: []
    },
    {
        id: 2,
        author: "Chí Tâm Hồ",
        emotions: 1,
        avatar: "/images/logo_rox.svg",
        time: "4 ngày trước",
        content: "1:40 cụ Dumbledore nhìn thấy được áo choàng tàng hình luôn hả mn",
        replies: [
            {
                id: 3,
                author: "Chí Tâm Hồ",
                emotions: 1,

                avatar: "/images/logo_rox.svg",
                time: "4 ngày trước",
                content: "1:41:50",
            },
            {
                id: 4,
                author: "Emma",
                emotions: 1,

                avatar: "/images/logo_rox.svg",
                time: "4 ngày trước",
                content: "dr a b",
            },
            {
                id: 5,
                author: "Kuroko",
                emotions: 1,

                avatar: "/images/logo_rox.svg",
                time: "3 ngày trước",
                content: "Phù thủy top 1 sever thì mấy cái áo choàng tàn hình sao làm khó cụ được =))"
            }
        ]
    },
    {
        id: 6,
        author: "Tieuthuyetthu7",
        emotions: 1,
        avatar: "/images/logo_rox.svg",
        time: "7 ngày trước",
        content:
            "phần này nói thật là cuốn nhất trong 7 phần, cảm giác tò mò, bí ẩn, kỳ dị thêm truyền thuyết các thứ =))) như trinh thám",
        replies: []
    }
];


const Topic: React.FC = () => {
    const [loading, setLoading] = useState(true);

    const [Rated, setRated] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            await new Promise((res) => setTimeout(res, 300));

            setRated(Rated);
            setLoading(false);
        };

        fetchData();
    }, []);

    return (
        <>

            {loading ? (
                <Loader />
            ) : (<>
                {
                    RatedLIST.map((Rated) => (
                        <RatedItems key={Rated.id} item={Rated} />
                    ))
                }
            </>
            )}
        </>
    );
};
export default Topic;