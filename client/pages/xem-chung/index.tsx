import React from 'react';
import clsx from "clsx";
import Image from "next/image";

const XemChung: React.FC = () => {

    return (
        <>
            <div
                className="absolute top-0 left-0 right-0 w-full h-[400px] lg:h-[500px] before:absolute before:content-[''] before:bg-[url('/images/dotted.png')] before:bg-repeat before:opacity-50 before:z-20"
                style={{ WebkitMaskImage: "linear-gradient(0deg, transparent 0, black 80%)" }}
            >
                <div
                    className={clsx(
                        "absolute w-full h-[350px] bg-[#fff8] blur-[100px] top-[-150px] rounded-full animate-[light-blur_3s_infinite]",
                        "md:top-[-200px]",
                        "max-sm:hidden"
                    )}
                ></div>
                <Image width={200} height={200} alt='...' src="/images/live-cover2.webp" className={clsx(
                    "absolute inset-0 w-full h-full opacity-100 z-[1] object-cover",
                    "[-webkit-mask-image:linear-gradient(0deg,transparent_0,black)]"
                )} />
            </div>

            <div className='pb-28 pt-5  px-5 lg:px-6 relative'>
                <div className='flex justify-center items-center h-[140px] lg:h-[200px]'>
                    <div className='flex items-center space-x-4'>
                        <button className='bg-white border border-white text-lg text-black rounded-full flex items-center space-x-2 py-2.5 px-6 '>
                            <i className="fa-solid fa-podcast"></i>
                            <span className='font-medium'>Quản lý</span>
                        </button>

                        <button className='border-white backdrop-blur-[10px] bg-transparent text-lg text-white border rounded-full flex items-center space-x-2 py-2.5 px-6 '>
                            <i className="fa-solid fa-circle-plus"></i>
                            <span className='font-medium'>Tạo mới</span>
                        </button>
                    </div>
                </div>
                <div className='m-auto text-white py-16 '>
                    <div className='text-2xl font-semibold text-white '>Công chiếu</div>
                </div>
            </div>


        </>
    );
};
export default XemChung;