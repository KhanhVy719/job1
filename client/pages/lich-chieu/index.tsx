import React from 'react';
import dynamic from "next/dynamic";
import { NextSeo } from 'next-seo'; // Import NextSeo

const CalendarList = dynamic(() => import("@/components/Calendar/CalendarList"), {
 ssr: false,
});

import ICON from "@/types/icon"
import styles from './styles.module.css';

const canonicalUrl = '/lich-chieu'; 
const seoTitle = 'Lịch chiếu phim mới nhất hôm nay | Tên rạp/Website'; 
const seoDesc = 'Xem lịch chiếu phim đầy đủ và mới nhất tại rạp. Cập nhật suất chiếu, thời gian và địa điểm.'; 


const LichChieu: React.FC = () => {

  return (
    <>
      <NextSeo
        title={seoTitle} 
        description={seoDesc} 
        canonical={canonicalUrl} 
        openGraph={{
         type: 'website',
         url: canonicalUrl,
         title: seoTitle,
         description: seoDesc,
        }}
       />

      <div className={styles.a}>
        <div className={styles.b}>
          <ICON.Calendar width={32} height={32}/>
          <span>Lịch chiếu</span>
        </div>

        <div className={styles.c}>
          <CalendarList />
        </div>
      </div>
    </>
  );
};

export default LichChieu;