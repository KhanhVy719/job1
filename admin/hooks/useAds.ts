import { useEffect, useRef, useState } from "react";
import axios from "axios";

// Kiểu dữ liệu quảng cáo
export interface IAds {
  _id: string;
  bannerUrl?: string;
  clickGoal?: number;
  clicks?: number;
  effectiveMultiplier?: number;
  product?: any;
  shop?: any;
  type?: number; // 0: banner, 1: đề xuất sản phẩm
  title?: string;
  slug: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalCost?: number;
}

export function useAdsRealtime() {
  const [banner, setBanner] = useState<IAds[]>([]);
  const [recommend, setRecommend] = useState<IAds[]>([]);
  const [others, setOthers] = useState<IAds[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const controller = new AbortController();
    const cancel = () => controller.abort();

    (async () => {
      try {
        const [bannerRes, recommendRes] = await Promise.all([
          axios.get("/api/ads/display?limit=4&type=0", { signal: controller.signal }),
          axios.get("/api/ads/display?limit=6&type=1", { signal: controller.signal }),
        ]);

        if (!mounted.current) return;

        setBanner(bannerRes.data?.ads || []);
        setRecommend(recommendRes.data?.ads || []);
      } catch (err) {
        console.warn("Failed to fetch ads:", err);
      }
    })();

    return () => {
      mounted.current = false;
      cancel();
    };
  }, []);

  // Lọc quảng cáo đang còn hiệu lực
  const now = Date.now();
  const filterActive = (ads: IAds[]) =>
    ads.filter((a) => {
      if (!a.startDate && !a.endDate) return true;
      const start = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
      const end = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      return now >= start && now <= end;
    });

  return {
    banner: filterActive(banner),
    recommend: filterActive(recommend),
    others: filterActive(others),
  };
}
