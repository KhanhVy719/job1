import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="referrer" content="no-referrer" />
        <meta name="apple-mobile-web-app-title" content="Divine Shop" />
        <meta
          data-react-helmet="true"
          property="og:url"
          content="https://shop-divine.vercel.app/"
        />
        <meta
          name="google-site-verification"
          content="AMR6JiPsuKth6XxD-TAJtwnpgyjM2wO71B9D7N0gEYo"
        />
      </Head>
      <body className="  overflow-x-hidden bg-bg-body">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
