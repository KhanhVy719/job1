import { User } from "@/types/User";
import type { AppProps } from "next/app";
import { useState, useEffect, useLayoutEffect, Suspense } from "react";
import type { ReactElement, ReactNode } from "react";
import { SocketProvider } from "@/context/SocketContext";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { DefaultSeo } from "next-seo";
import SEO from "@/next-seo.config";
import "./app.css";
import { useRouter } from "next/router";
import { socket } from '@/utils/socket'; // Import singleton
import LoadingOverlay from "@/components/loading/loader";
type NextPageWithLayout = { getLayout?: (page: ReactElement) => ReactNode };
type AppPropsWithLayout = AppProps & {
  Component: AppProps["Component"] & NextPageWithLayout;
  pageProps: { user?: User | null;[key: string]: unknown };
};

const Layout = dynamic(() => import("@/Layouts/default/Layout"), { ssr: false });
const Footer = dynamic(() => import("@/Layouts/default/Footer"), { ssr: false });



export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const getLayout = Component.getLayout ?? ((p) => p);
useEffect(() => {
    // 1. Kết nối ngay lập tức và giữ kết nối đó mãi mãi
    if (!socket.connected) {
      socket.connect();
    }
    
    // 2. Kích hoạt luôn việc đo đạc ở cấp Global
    // Nghĩa là dù đang ở trang Login hay Settings, Server vẫn gửi data về ngầm
    // Socket nhận data nhưng chưa làm gì cả (chờ HomePage dùng)
    function onConnect() {
       socket.emit("admin:start_monitoring"); 
       console.log('start')
    }

    socket.on("connect", onConnect);
    
    // Nếu socket đã connect sẵn (do HMR hoặc navigation), emit luôn
    if (socket.connected) {
       socket.emit("admin:start_monitoring"); 
    }

    return () => {
      socket.off("connect", onConnect);
    };
  }, []);
  return (
    <>
      <DefaultSeo {...SEO} />
      <Toaster position="top-center" />
      <SocketProvider>
        <Suspense fallback={<LoadingOverlay />}>
          <Layout />
          <div className='lg:pl-[18rem] pt-[4.3rem]'>
            {getLayout(<Component {...pageProps} />)}
          </div>
        </Suspense>
        </SocketProvider>
    </>
  );
}