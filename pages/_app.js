import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import Loader from "@/components/Loader";
import NavBar from "@/components/NavBar";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [routing, setRouting] = useState(false);

  // 페이지 전환 로딩 오버레이
  useEffect(() => {
    const start = () => setRouting(true);
    const end = () => setRouting(false);
    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", end);
    router.events.on("routeChangeError", end);
    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", end);
      router.events.off("routeChangeError", end);
    };
  }, [router.events]);

  // 랜딩(/)에서는 네비게이션 숨김, 나머지 페이지는 고정 표시
  const showNav = router.pathname !== "/";

  return (
    <>
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
