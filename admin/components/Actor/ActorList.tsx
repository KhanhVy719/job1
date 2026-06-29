"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/router';
import Loader from "@/components/loading/list";

interface Actor {
    name: string;
    image: string;
}


const ActorList: React.FC<{ actor: Actor[] }> = ({ actor }) => {
    const [currentActor, setCurrentActor] = useState<Actor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await new Promise((res) => setTimeout(res, 300));

            setCurrentActor(currentActor);
            setLoading(false);
        };

        fetchData();
    }, []);


    return (
        <div className="relative w-full ">
            {loading ? (<>
                <Loader />
            </>) : (<>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {actor.map((Actor, index) => (
                        <div key={index}>
                            <Link href="/" className="flex flex-col h-full">
                                <div
                                    className="relative"


                                >
                                    <Image
                                        width={300}
                                        height={500}
                                        src={Actor.image}
                                        alt={Actor.name}
                                        style={{ objectFit: "cover" }}
                                        loading="lazy"

                                        className="rounded-xl w-full max-h-[300px] min-h-[250px] h-full hover:opacity-[0.8]"
                                    />
                                    <div className="absolute z-[5] flex items-center w-full bottom-3 justify-center text-center">
                                        <h3 className="text-sm font-semibold truncate text-white hover:text-primary">
                                            {Actor.name}
                                        </h3>
                                    </div>
                                    <div
                                        className="h-[30%] w-[100%] left-0 rounded-[1px] z-[1] absolute bottom-[0]  bg-[linear-gradient(0deg,rgba(var(--bg-body)/0.95)_0%,rgba(var(--bg-body)/0.85)_20%,rgba(var(--bg-body)/0.7)_40%,rgba(var(--bg-body)/0.5)_60%,rgba(var(--bg-body)/0.3)_80%,rgba(var(--bg-body)/0)_100%)]"
                                    />

                                </div>


                            </Link>
                        </div>
                    ))}
                </div>
            </>)}

            <div className="w-full flex items-center justify-center my-20">
                <div className="flex items-center space-x-3">
                    <button className="h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center">
                        <i className="fa-solid fa-arrow-left text-gray-400"></i>
                    </button>
                    <div className="h-[50px] px-8 rounded-full bg-[#2F3346] flex items-center justify-center space-x-1.5">
                        <div className="text-white text-sm">Trang</div>
                        <input className="text-white   w-auto   text-[13px] text-center px-3 py-1.5 outline-0 rounded-md max-w-[50px] font-bold flex items-center justify-center border border-gray-600 focus:border-gray-500 bg-transparent placeholder:text-[#7a7c81]l" max="461" type="number" value="1" />
                        <div className="text-white text-sm">/461</div>

                    </div>
                    <button className="h-[50px] w-[50px] rounded-full bg-[#2F3346] flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-white"></i>
                    </button>
                </div>
            </div>

        </div >
    );
};

export default ActorList;
