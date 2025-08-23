// components/LeftPanel.jsx
// 하나의 파일만 고치면 book.js / map.js 모두에 반영되도록 공용 LeftPanel 컴포넌트로 분리
// ─────────────────────────────────────────────────────────────
// 🛠️ 여기를 고치면 두 페이지 모두가 함께 바뀝니다 (텍스트/슬라이드/스타일 등)

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** 내부 정렬 유틸: created_at(또는 id) 기준 최신순 */
function sortBooks(arr) {
  const toStamp = (created_at, id) => {
    const s = String(created_at || "").trim();
    const t = s ? Date.parse(s.replace(" ", "T")) : NaN;
    if (!Number.isNaN(t)) return t;
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  };
  return [...arr].sort((a, b) => toStamp(b.created_at, b.id) - toStamp(a.created_at, a.id));
}

/**
 * LeftPanel 공용 컴포넌트
 * @param {Array}  books           최신도서 슬라이드에 사용할 전체 도서 배열(없어도 동작)
 * @param {number} stickyTop       상단 고정 위치(px)
 * @param {number} stickyHeight    패널 높이(px)
 * @param {number} slideAutoMs     슬라이드 자동 넘김 간격(ms)
 * @param {number} itemsPerPage    한 슬라이드에 표시할 도서 수
 * @param {number} maxPages        최대 슬라이드 페이지 수
 */
export default function LeftPanel({
  books = [],
  stickyTop = 96,
  stickyHeight = 640,
  slideAutoMs = 2000,
  itemsPerPage = 2,
  maxPages = 5,
}) {
  // 최신 도서 추출
  const latest = useMemo(
    () => sortBooks(books).slice(0, itemsPerPage * maxPages),
    [books, itemsPerPage, maxPages]
  );

  // 페이지 분할
  const pages = useMemo(() => {
    const arr = [];
    for (let i = 0; i < latest.length; i += itemsPerPage) {
      arr.push(latest.slice(i, i + itemsPerPage));
    }
    return arr;
  }, [latest, itemsPerPage]);

  const [page, setPage] = useState(0);
  const pageCount = pages.length;

  // 자동 슬라이드
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), slideAutoMs);
    return () => clearInterval(t);
  }, [pageCount, slideAutoMs]);

  return (
    <div
      className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
      style={{ position: "sticky", top: stickyTop, height: stickyHeight }}
    >
      {/* 1) 공지사항 (🛠️ 자유 편집) */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>
        <div className="h-36 overflow-auto rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타를 시작했습니다.</li>
            <li>ISBN 자동 채움 기능 개선 작업 중입니다.</li>
            <li>
              문의: <a className="underline" href="mailto:admin@bookmap.example">admin@bookmap.example</a>
            </li>
          </ul>
        </div>
      </section>

      {/* 2) NEW BOOK 슬라이드 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        <div className="relative overflow-hidden">
          {/* 트랙 */}
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${page * 100}%)`, width: `${(pageCount || 1) * 100}%` }}
          >
            {pages.map((pg, idx) => (
              <div key={idx} className="flex w-full shrink-0 justify-start gap-3">
                {pg.map((b) => (
                  <MiniBookCard key={b.id} book={b} />
                ))}
                {/* 빈칸(고정 폭 유지) */}
                {Array.from({ length: Math.max(0, itemsPerPage - pg.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-[128px] shrink-0 rounded-xl border border-dashed border-gray-200 bg-gray-50" />
                ))}
              </div>
            ))}
          </div>

          {/* 페이지 도트 */}
          <div className="mt-2 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount || 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 w-6 rounded-full transition ${
                  page === i ? "bg-gray-800" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3) 이벤트 (🛠️ 자유 편집) */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">이벤트</h3>
        <div className="h-36 overflow-auto rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700">
          <p className="font-medium">📣 여름 독서 이벤트</p>
          <p className="text-gray-600">도서를 등록/후기 작성 시 소정의 상품을 드립니다.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
            <li>기간: 8/1 ~ 8/31</li>
            <li>대상: BookMap 회원</li>
            <li>
              참여: <Link href="/event" className="underline">이벤트 페이지</Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

/* 미니 북 카드 (슬라이드용) */
function MiniBookCard({ book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="flex w-[128px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
      title={book.title}
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {book.image ? (
          <img src={book.image} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
      <div className="p-2">
        <div className="line-clamp-2 text-[12.5px] font-semibold text-gray-900">{book.title}</div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-600">{book.author}</p>
        <p className="text-[10px] text-gray-400">{book.publisher}</p>
      </div>
    </Link>
  );
}
