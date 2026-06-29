import { Html, Head, Main, NextScript } from "next/document";

// Single source of truth: đổi domain chỉ cần đổi NEXT_PUBLIC_SITE_URL (hoặc NEXT_PUBLIC_BASE_URL)
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "RoPhim Admin";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="referrer" content="no-referrer" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta
          data-react-helmet="true"
          property="og:url"
          content={`${SITE_URL}/`}
        />
        {GOOGLE_SITE_VERIFICATION ? (
          <meta
            name="google-site-verification"
            content={GOOGLE_SITE_VERIFICATION}
          />
        ) : null}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
