// components/NavBar.jsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const NAV_MAIN = [
  { label: "홈", href: "/home" },
  { label: "도서등록", href: "/form" },
  { label: "도서목록", href: "/book" },
  { label: "BOOK MAP", href: "/map" },
];

/** 고정(항상 노출) 메뉴: 공지사항/이벤트 */
const NAV_FIXED = [
  { label: "공지사항", href: "/notice" },
  { label: "이벤트", href: "/event" },
];

export default function NavBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 페이지 전환 시 모바일 메뉴 자동 닫힘
  useEffect(() => setOpen(false), [router.pathname]);

  // 라우터 이벤트로도 안전하게 닫기
  useEffect(() => {
    const handle = () => setOpen(false);
    router.events?.on("routeChangeComplete", handle);
    return () => router.events?.off("routeChangeComplete", handle);
  }, [router.events]);

  // 활성 메뉴 판별(하위 경로 포함)
  const isActive = (href) => {
    const path = (router.asPath || "").split("?")[0];
    return path === href || path.startsWith(href + "/");
  };

  const pillClass = (href) =>
    "px-3 py-2 text-sm font-medium rounded-full transition " +
    (isActive(href) ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100");

  const pillClassFixed = (href) =>
    "px-3 py-2 text-sm font-medium rounded-full transition border " +
    (isActive(href)
      ? "border-gray-900 bg-gray-900 text-white"
      : "border-gray-300 text-gray-700 hover:bg-gray-100");

  const mobileItemClass = (href) =>
    "block rounded-lg px-3 py-2 font-medium " +
    (isActive(href) ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-gray-900">
          BookMap
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          <ul className="flex items-center gap-2">
            {NAV_MAIN.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={pillClass(it.href)}
                  aria-current={isActive(it.href) ? "page" : undefined}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* 구분선 */}
          <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />

          {/* 항상 고정 메뉴 */}
          <ul className="flex items-center gap-2">
            {NAV_FIXED.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={pillClassFixed(it.href)}
                  aria-current={isActive(it.href) ? "page" : undefined}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden rounded-md p-2 hover:bg-gray-100"
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <ul id="mobile-nav" className="sm:hidden mx-auto max-w-6xl px-4 pb-3 flex flex-col gap-1">
          {[...NAV_MAIN, { divider: true }, ...NAV_FIXED].map((it, i) =>
            it.divider ? (
              <li key={`div-${i}`} className="my-1 h-px bg-gray-200" aria-hidden />
            ) : (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={mobileItemClass(it.href)}
                  aria-current={isActive(it.href) ? "page" : undefined}
                >
                  {it.label}
                </Link>
              </li>
            )
          )}
        </ul>
      )}
    </header>
  );
}
