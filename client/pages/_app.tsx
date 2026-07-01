// _app.tsx
import { Toaster } from "react-hot-toast";
import { DefaultSeo } from "next-seo";
import SEO from "@/next-seo.config";
import "@/assets/plugin/font-awesome-6.5.1/css/all.css";
import "./app.css";
import { AuthProvider } from "@/providers/AuthProvider";
import AppContent, { AppPropsWithLayout } from "@/components/content";

import ReactGA from "react-ga4";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import ViewerLanguageTranslator from "@/components/ViewerLanguageTranslator";

// Đổi GA chỉ cần set env NEXT_PUBLIC_GA_ID (rỗng = tắt tracking)
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export default function MyApp(props: AppPropsWithLayout) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!GA_TRACKING_ID) return;

    ReactGA.initialize(GA_TRACKING_ID);

    const handleRouteChange = (url: string) => {
      ReactGA.send({ hitType: "pageview", page: url });
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    // gửi pageview ban đầu
    ReactGA.send({ hitType: "pageview", page: router.asPath });

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, router.asPath]);

  return (
    <>
      <DefaultSeo {...SEO} />
      <Toaster position="top-center" />
      <ViewerLanguageTranslator />
      <AuthProvider>
          <AppContent {...props} />
      </AuthProvider>


      <Script id="iubenda-config" strategy="afterInteractive">
        {`
          var _iub = _iub || [];
          _iub.csConfiguration = {"siteId":4342816,"cookiePolicyId":41902603,"lang":"en","storage":{"useSiteId":true}};
        `}
      </Script>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4477395297407518"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script
        src="https://cs.iubenda.com/autoblocking/4342816.js"
        strategy="afterInteractive" // đổi từ beforeInteractive
      />

      <Script
        src="//cdn.iubenda.com/cs/gpp/stub.js"
        strategy="afterInteractive" // đổi từ beforeInteractive
      />

      <Script
        src="//cdn.iubenda.com/cs/iubenda_cs.js"
        strategy="afterInteractive"
      />

      <Script src="/events/snow.js" strategy="afterInteractive" />
    </>
  );
}
