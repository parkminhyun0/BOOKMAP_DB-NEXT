import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Script from 'next/script';
import "@/styles/globals.css";
import Loader from "@/components/Loader";
import NavBar from "@/components/NavBar";

// Google Analytics Measurement ID (환경변수에서 가져오기, 없으면 기본값 사용)
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WT0Z4DHPX6';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [routing, setRouting] = useState(false);

  // 페이지 전환 로딩 오버레이 + Google Analytics 페이지뷰 추적
  useEffect(() => {
    const start = () => setRouting(true);
    const end = (url) => {
      setRouting(false);
      // Google Analytics 페이지뷰 전송
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_MEASUREMENT_ID, {
          page_path: url,
        });
      }
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", end);
    router.events.on("routeChangeError", () => setRouting(false));

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", end);
      router.events.off("routeChangeError", () => setRouting(false));
    };
  }, [router.events]);

  // 랜딩(/)에서는 네비게이션 숨김, 나머지 페이지는 고정 표시
  const showNav = router.pathname !== "/";

  return (
    <>
      {/* Google Analytics Scripts */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>

      {showNav && <NavBar />}
      {routing && (
        <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-sm flex items-center justify-center">
          <Loader text="페이지 이동 중..." />
        </div>
      )}
      {/* 내부 페이지는 기본 흰 배경 */}
      <div className={showNav ? "min-h-screen bg-white" : undefined}>
        <Component {...pageProps} />
      </div>
    </>
  );
}