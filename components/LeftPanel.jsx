// components/LeftPanel.jsx
// ─────────────────────────────────────────────────────────────
// 공용 좌측 패널(공지 / NEW BOOK 슬라이드 / 이벤트)
// - book.js, map.js 등 어디서든 동일하게 사용됩니다.
// - 이 파일 하나만 수정하면 모든 페이지에 자동 반영됩니다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* [🛠️ EDIT ME] 빠른 설정
   - miniScale      : NEW BOOK 카드 축소/확대 비율 (1 = 100%, 0.8 = 80%)
   - gapX           : 카드 간 가로 간격(px)
   - noticeHeight   : 공지 영역 높이(px)
   - eventHeight    : 이벤트 영역 높이(px)
   - dotsHeight     : 슬라이드 하단 도트 영역 높이(px) */
const UI = {
  miniScale: 0.8,       // ← 요청하신 "-20%" 적용 (기본 0.8)
  gapX: 8,              // 카드 간격 (Tailwind gap-2와 동일, 8px)
  noticeHeight: 124,    // 공지 영역 높이(너무 길면 숫자 줄이세요)
  eventHeight: 124,     // 이벤트 영역 높이
  dotsHeight: 14,       // 슬라이드 하단 도트 영역 높이
};

// 내부 계산값 (수정 X)
const BASE_CARD_W = 128;                     // 기존 카드 기준 폭
const MINI_W = Math.round(BASE_CARD_W * UI.miniScale); // 축소된 카드 폭(px)

/** ⬇️ 도서를 '최신 등록순'으로 정렬하기 위한 유틸 */
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

/** ⬇️ 슬라이드에서 쓰는 미니 카드 (이미지/제목/저자) */
function MiniBookCard({ book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow"
      title={book.title}
      style={{ width: MINI_W }} // ★ 폭을 80%로 축소
    >
      <div className="aspect-[3/4] w-full bg-gray-100">
        {book.image ? (
          <img src={book.image} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
      <div className="p-2">
        {/* 카드 폭이 줄어들었으니 글자도 살짝 작게 */}
        <div className="line-clamp-2 text-[11.5px] font-semibold text-gray-900">{book.title}</div>
        <div className="mt-1 line-clamp-1 text-[10px] text-gray-500">{book.author}</div>
      </div>
    </Link>
  );
}

/** ⬇️ 좌측 패널 본체 */
export default function LeftPanel({
  books = [],
  stickyTop = 96,      // 상단 네비 높이에 맞게 부모에서 전달
  slideAutoMs = 2000,  // 자동 슬라이드 간격(ms)
  itemsPerPage = 2,    // 한 페이지에 표시할 도서 수
  maxPages = 5,        // 최대 페이지 수(=최대 itemsPerPage*maxPages 권)
}) {
  // 1) NEW BOOK 슬라이드를 위해 최신 도서 추리기
  const latest = useMemo(
    () => sortBooks(books).slice(0, itemsPerPage * maxPages),
    [books, itemsPerPage, maxPages]
  );

  // 2) 페이지 나누기(한 페이지 당 itemsPerPage권)
  const pages = useMemo(() => {
    const arr = [];
    for (let i = 0; i < latest.length; i += itemsPerPage) {
      arr.push(latest.slice(i, i + itemsPerPage));
    }
    return arr;
  }, [latest, itemsPerPage]);

  const [page, setPage] = useState(0);
  const pageCount = pages.length || 1;

  // 3) 자동 슬라이드
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), slideAutoMs);
    return () => clearInterval(t);
  }, [pageCount, slideAutoMs]);

  // 패널 자체는 내용 높이에 따라 자동으로 늘어나도록 하고(sticky 컨테이너),
  // 내부 섹션 높이를 줄여서 "공지/NEW BOOK/이벤트"가 한 화면에 들어오도록 조절합니다.
  return (
    <div
      className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
      style={{ position: "sticky", top: stickyTop }}
    >
      {/* (1) 공지사항 */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>

        {/* [🛠️ EDIT ME] 공지 내용은 이 HTML만 바꾸면 됩니다. 높이는 noticeHeight로 제어 */}
        <div
          className="overflow-auto rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700"
          style={{ height: UI.noticeHeight }}
        >
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타를 시작했습니다.</li>
            <li>도서 자동 채움(ISBN) 개선 작업 진행 중입니다.</li>
            <li>BOOK MAP 그래픽 뷰어 개선 작업 진행 중입니다.</li>
            <li>문의: admin@bookmap.example</li>
          </ul>
        </div>
      </section>

      {/* (2) NEW BOOK 슬라이드 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        <div className="relative overflow-hidden">
          {/* 슬라이드 트랙 */}
          <div
            className="flex transition-transform duration-500"
            style={{
              transform: `translateX(-${page * 100}%)`,
              width: `${pageCount * 100}%`,
              gap: UI.gapX, // 카드 간격(픽셀)
            }}
          >
            {pages.map((pg, idx) => (
              <div key={idx} className="flex w-full shrink-0 justify-start">
                {/* 각 페이지의 카드들 */}
                {pg.map((b) => (
                  <MiniBookCard key={b.id} book={b} />
                ))}
                {/* 슬롯 고정: 마지막 페이지에 책 수가 모자라면 빈 슬롯으로 채움 */}
                {Array.from({ length: Math.max(0, itemsPerPage - pg.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="shrink-0 rounded-xl border border-dashed border-gray-200 bg-gray-50"
                    style={{ width: MINI_W }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 페이지 도트 */}
          <div
            className="mt-2 flex items-center justify-center gap-2"
            style={{ height: UI.dotsHeight }}
          >
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

        {/* [🛠️ EDIT ME] 이벤트 내용은 이 HTML만 바꾸면 됩니다. 높이는 eventHeight로 제어 */}
        <div
          className="overflow-auto rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700"
          style={{ height: UI.eventHeight }}
        >
          <p className="font-medium">📣 여름 독서 이벤트</p>
          <p className="text-gray-600">도서를 등록/후기 작성 시 소정의 상품을 드립니다.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
            <li>기간: 8/1 ~ 8/31</li>
            <li>대상: BookMap 회원</li>
            <li>
              참여:{" "}
              <Link href="/event" className="underline">
                이벤트 페이지
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
