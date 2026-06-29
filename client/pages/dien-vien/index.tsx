import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from "next/dynamic";
import { useRouter } from "next/router"; // Sử dụng next/router
import { GetServerSideProps } from 'next';
import axiosInstance, { API_ENDPOINTS } from "@/utils/axios";
import styles from './styles.module.css';

const ActorList = dynamic(() => import("@/components/Actor/ActorList"), {
  ssr: true,
});


const DienVien: React.FC<{
  initialData: IActor[];
  initialPagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  } | null;
}> = ({ initialData, initialPagination }) => {
  const router = useRouter();

  const [data, setData] = useState<IActor[]>(initialData);
  const [pagination, setPagination] = useState<{
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  } | null>(initialPagination);

  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(initialData);
    setPagination(initialPagination);
  }, [initialData, initialPagination]);

  const fetchActorsNow = useCallback(async (page: number) => {

    if (topRef.current) {

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

      const res = await axiosInstance.get(API_ENDPOINTS.actor.list, {
        params: {
          page: page,
          limit: 24,
        },
      });
      const result = res.data;

      if (result.status && result.data) {
        setData(result.data.items || []);
        setPagination(result.data.pagination);
      }

  }, []);

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage > 0 && newPage <= pagination.totalPages) {
      fetchActorsNow(newPage);

      router.push({
        pathname: router.pathname,
        query: { ...router.query, page: newPage }
      }, undefined, { shallow: true, scroll: false });
    }
  };

  return (
    <div className={styles.a} ref={topRef}>
      <div className={styles.b}>Diễn viên</div>
      <div className={styles.c} style={{ position: 'relative', minHeight: '500px' }}>
    
          <ActorList
            actor={data}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
     
      </div>
    </div>
  );
};


export const getServerSideProps: GetServerSideProps<{
    initialData: IActor[];
    initialPagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
} | null;
}> = async (context) => {
    const { query } = context;

    const page = Array.isArray(query.page) ? query.page[0] : query.page || '1';
    const pageNumber = Number(page);

    const fallbackPagination= {
        total: 0,
        currentPage: pageNumber,
        totalPages: 1,
        itemsPerPage: 24
    };

    try {
        const res = await axiosInstance.get(API_ENDPOINTS.actor.list, {
            params: {
                page: page, 
                limit: 24,
            },
        });
        const result = res.data;

        if (result.status && result.data) {
            return {
                props: {
                    initialData: result.data.items || [],
                    initialPagination: result.data.pagination || null,
                }
            };
        }
        console.log(result)
        return {
            props: {
                initialData: [],
                initialPagination: fallbackPagination,
            }
        };

    } catch {
        return {
            props: {
                initialData: [],
                initialPagination: fallbackPagination,
            }
        };
    }
};

export default DienVien;