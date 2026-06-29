import { useEffect, useState, useLayoutEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingOverlay from "@/components/loading/loader";
import { useAuthContext } from "@/context/AuthContext";
import type { ReactElement, ReactNode } from "react";
import { AppProps } from "next/app";

export type NextPageWithLayout = {
  getLayout?: (page: ReactElement) => ReactNode
};

export type AppPropsWithLayout = AppProps & {
  Component: AppProps["Component"] & NextPageWithLayout;
  pageProps: { user?: IUser | null; [key: string]: unknown };
};

const Layout = dynamic(() => import("@/layouts/default/Layout"), { ssr: false });
const Footer = dynamic(() => import("@/layouts/default/Footer"), { ssr: false });

const AppContent = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page) => page);
  const { vip } = useAuthContext();

  // QUAN TRỌNG: Khởi tạo là TRUE để khi F5 nó hiện ngay lập tức
  const [loading, setLoading] = useState<boolean>(true);

  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // 1. Xử lý Theme (Giữ nguyên)
  useIsomorphicLayoutEffect(() => {
    const primaryRGB = vip ? "81 240 133" : "255 216 117";
    const primaryLight = vip ? "210 255 223" : "255 231 166";
    const primaryBody = vip ? "13 19 46" : "25 27 36";
    const primaryBody2 = vip ? "48 58 105" : "39 44 67";

    document.documentElement.style.setProperty("--primary", primaryRGB);
    document.documentElement.style.setProperty("--primary-light", primaryLight);
    document.documentElement.style.setProperty("--bg-body", primaryBody);
    document.documentElement.style.setProperty("--bg-body2", primaryBody2);
  }, [vip]);

  useEffect(() => {

    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); 

    return () => clearTimeout(timer);
  }, []); 

  useEffect(() => {
    if (loading) {
      document.body.classList.add("overflow-y-hidden");
    } else {
      document.body.classList.remove("overflow-y-hidden");
    }
    return () => document.body.classList.remove("overflow-y-hidden");
  }, [loading]);

  return (
    <>
      {loading && <LoadingOverlay />}

      <Suspense fallback={<LoadingOverlay />}>
        <Layout>
          {getLayout(<Component {...pageProps} />)}
          <Footer />
        </Layout>
      </Suspense>
    </>
  );
};

export default AppContent;