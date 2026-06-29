import React from 'react';
import Link from "next/link";
import { GetServerSideProps } from 'next';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import styles from './styles.module.css';
import clsx from "clsx";
import { GRADIENTS } from '@/utils/Items';

interface Topic {
    _id: string;
    title: string;
    href: string;
    gradient: string;
}


const DanhSachChuDe: React.FC<{
    topics: Topic[];
}> = ({ topics }) => {

    return (
        <div className={styles.a}>
            <div className={styles.b}>Các chủ đề</div>

            <div className={styles.c}>
                {topics.length === 0 ? (
                    <div className="text-white text-center py-10">Không có chủ đề nào.</div>
                ) : (
                    <div className={styles.list}>
                        {topics.map((topic) => (
                            <Link
                                href={topic.href}
                                key={topic._id}
                                className={clsx(styles.d, topic.gradient)}
                            >
                                <h3 className={styles.e}>
                                    {topic.title}
                                </h3>
                                <div className={styles.f}>
                                    <span>Xem chủ đề</span> <i className="fa-solid fa-angle-right"></i>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        const res = await axiosInstance.get(API_ENDPOINTS.menu.categories);
        const result = res.data;

        let mappedData: Topic[] = [];

        if (result.status && Array.isArray(result.data)) {
            mappedData = result.data.map((item: ICategory, index: number) => ({
                _id: item._id,
                title: item.name,
                href: `/c/${item.slug}`, 
                gradient: GRADIENTS[index % GRADIENTS.length]
            }));
        }

        return {
            props: {
                topics: mappedData,
            }
        };
    } catch  {        
        return {
            props: {
                topics: [],
            }
        };
    }
};

export default DanhSachChuDe;