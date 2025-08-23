// components/LeftPanel.jsx
// ─────────────────────────────────────────────────────────────
// 공용 좌측 패널(공지 / NEW BOOK 슬라이드 / 이벤트)
// ※ 높이를 '고정'하지 않고 콘텐츠 길이만큼 자동으로 늘어나도록 변경
//   → sticky에는 top만 주고 height는 제거했습니다(잘림 방지).
//   → book.js, map.js 어디서든 동일 UI 재사용.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** 최신 등록순 정렬 유틸 */
function toStamp(created_at, id) {
  const s = String(created_at || "").trim();
  const t = s ? Date.parse(s.replace(" ", "T")) : NaN;
  if (!Number.isNaN(t)) return t;
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}
function sortBooks(arr) {
  return [...arr].sort((a, b) => toStamp(b.created_at, b.id) - toStamp(a.created_at, a.id));
}

/** 미니 카드(슬라이드용) */
function MiniBookCard({ book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="w-[128px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow"
      title={book.title}
    >
      <div className="aspect-[3/4] w-full bg-gray-100">
        {book.image ? (
          <img src={book.image} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
      <div className="p-2">
        <div className="line-clamp-2 text-xs font-semibold text-gray-900">{book.title}</div>
        <div className="mt-1 line-clamp-1 text-[11px] text-gray-500">{book.author}</div>
      </div>
    </Link>
  );
}

/** 좌측 패널 본체 */
export default function LeftPanel({
  books = [],
  stickyTop = 96,
  slideAutoMs = 5000,
  itemsPerPage = 2,
  maxPages = 5,
}) {
  // 최신 도서 N권(= itemsPerPage * maxPages)
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
  const pageCount = pages.length || 1;

  // 자동 슬라이드
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), slideAutoMs);
    return () => clearInterval(t);
  }, [pageCount, slideAutoMs]);

  return (
    <div
      className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
      // ✅ 높이 고정 제거: 잘림 방지 / sticky 고정만 유지
      style={{ position: "sticky", top: stickyTop }}
    >
      {/* (1) 공지사항 */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>
        {/* 🛠️ EDIT ME: 공지 내용은 이 블록만 바꾸면 됩니다 */}
        <div className="h-36 overflow-auto rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타를 시작했습니다.</li>
            <li>도서 자동 채움(ISBN) 개선 작업 진행 중입니다.</li>
	    <li>BOOK MAP 그래픽 뷰어 개선 작업 진행 중입니다.</li>
            <li>문의: bookmapwep@gmail.com</li>
          </ul>
        </div>
      </section>

      {/* (2) NEW BOOK 슬라이드 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        <div className="relative overflow-hidden">
          {/* 트랙 */}
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${page * 100}%)`, width: `${pageCount * 100}%` }}
          >
            {pages.map((pg, idx) => (
              <div key={idx} className="flex w-full shrink-0 justify-start gap-3">
                {pg.map((b) => (
                  <MiniBookCard key={b.id} book={b} />
                ))}
                {/* 마지막 페이지 자리수 채우기 */}
                {Array.from({ length: Math.max(0, itemsPerPage - pg.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-[128px] shrink-0 rounded-xl border border-dashed border-gray-200 bg-gray-50"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 도트 네비게이션 */}
          <div className="mt-2 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 w-6 rounded-full transition ${
                  page === i ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* (3) 이벤트 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">이벤트</h3>
        {/* 🛠️ EDIT ME: 이벤트 내용은 이 블록만 바꾸면 됩니다 */}
        <div className="h-36 overflow-auto rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700">
          <p className="font-medium">📣 여름 독서 이벤트</p>
          <p className="text-gray-600">도서를 등록/후기 작성 시 차후 상응한 선물을 드리겠습니다.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
            <li>기간: 베타버전 끝나는 날까지</li>
            <li>대상: BookMap 도서등록자</li>
            <li>
              참여: <Link href="/event" className="underline">이벤트 페이지</Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
