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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {actor.map((Actor, index) => (
                        <div key={index}>
                            <Link href="/" className="flex flex-col h-full">
                                <div
                                    className="relative">
                                    <Image
                                        width={300}
                                        height={500}
                                        src={Actor.image}
                                        alt={Actor.name}
                                        style={{ objectFit: "cover" }}
                                        loading="lazy"

                                        className="rounded-xl w-full max-h-[300px] min-h-[250px] h-full hover:opacity-[0.8]"
                                    />
                                    <div className="absolute z-[5] flex items-center w-full bottom-3 flex-col space-y-2 justify-center text-center">
                                        <h3 className="text-sm font-semibold truncate text-white hover:text-primary">
                                            {Actor.name}
                                        </h3>
                                        <p className='text-[#F0ADB1]'>hello</p>
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

        </div >
    );
};

export default ActorList;
