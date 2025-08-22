import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const NAV = [
  { label: "홈", href: "/home" },
  { label: "도서등록", href: "/form" },
  { label: "도서목록", href: "/book" },
  { label: "BOOK MAP", href: "/map" },
];

export default function NavBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 페이지 전환 시 모바일 메뉴 자동 닫힘
  useEffect(() => setOpen(false), [router.pathname]);

  const isActive = (href) => router.pathname === href;

  const pillClass = (href) =>
    "px-3 py-2 text-sm font-medium rounded-full transition " +
    (isActive(href) ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100");

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
        <ul className="hidden sm:flex items-center gap-2">
          {NAV.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={pillClass(it.href)}>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden rounded-md p-2 hover:bg-gray-100"
          aria-label="메뉴 열기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
        <ul className="sm:hidden mx-auto max-w-6xl px-4 pb-3 flex flex-col gap-1">
          {NAV.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={mobileItemClass(it.href)}>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
