// components/LeftPanel.jsx
// ─────────────────────────────────────────────────────────────
// 공용 좌측 패널(공지/NEW BOOK 슬라이드/이벤트)
// - book.js, map.js 어디서든 같은 UI를 재사용합니다.
// - ✨ “NEW BOOK 카드 간격/폭/속도”는 아래 EDIT ME 구역만 바꾸면 됩니다.
// ─────────────────────────────────────────────────────────────

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   [🛠️ EDIT ME: NEW BOOK 슬라이드 UI 기본값]
   - 카드 폭/간격과 자동 슬라이드 속도, 애니메이션 시간을 여기서 바꿉니다.
   - 더 미세 조정은 props로도 덮어쓸 수 있어요(아래 컴포넌트 인자 설명 참고).
────────────────────────────────────────────────────────────── */
const DEFAULT_UI = {
  CARD_WIDTH_PX: 140,      // ← 카드 1장의 가로(px). (예: 140, 136, 128 …) 값↑ = 더 넓게
  CARD_GAP_PX: 16,         // ← 카드 간 간격(px). 16px = tailwind 'gap-4' 느낌
  ITEMS_PER_PAGE: 2,       // ← 한 페이지에 보여줄 카드 수(기본 2장)
  SLIDE_AUTO_MS: 7000,     // ← 자동 전환 간격(ms). 숫자↑ = 더 느리게(천천히)
  SLIDE_ANIM_MS: 500,      // ← 슬라이드 넘길 때 애니메이션 시간(ms). 숫자↑ = 부드럽지만 느리게
};

/* ─────────────────────────────────────────────────────────────
   유틸: 최신 등록순 정렬
────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   미니 도서 카드(슬라이드용)
   - 카드 폭은 style.width로 고정하여, 간격과 함께 균형있게 배치됩니다.
────────────────────────────────────────────────────────────── */
function MiniBookCard({ book, widthPx }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow"
      title={book.title}
      style={{ width: widthPx }}
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

/* ─────────────────────────────────────────────────────────────
   좌측 패널 본체
   props
   - books: 도서 배열
   - stickyTop: 상단 고정 위치(px)
   - stickyHeight: 패널 높이(px)
   - itemsPerPage: 한 페이지 카드 수 (기본 DEFAULT_UI.ITEMS_PER_PAGE)
   - slideAutoMs: 자동 전환 간격(ms) (기본 DEFAULT_UI.SLIDE_AUTO_MS)
   - slideAnimMs: 슬라이드 애니메이션 시간(ms) (기본 DEFAULT_UI.SLIDE_ANIM_MS)
   - cardWidthPx: 카드 폭(px) (기본 DEFAULT_UI.CARD_WIDTH_PX)
   - cardGapPx: 카드 간격(px) (기본 DEFAULT_UI.CARD_GAP_PX)
────────────────────────────────────────────────────────────── */
export default function LeftPanel({
  books = [],
  stickyTop = 96,
  stickyHeight = 640,               // ← book/map에서 주는 값에 따라 높이가 결정됩니다.
  itemsPerPage = DEFAULT_UI.ITEMS_PER_PAGE,
  slideAutoMs = DEFAULT_UI.SLIDE_AUTO_MS,   // ← “슬라이드 속도”를 느리게: 값↑ (예: 3800)
  slideAnimMs = DEFAULT_UI.SLIDE_ANIM_MS,   // ← 넘길 때 애니메이션 길이
  cardWidthPx = DEFAULT_UI.CARD_WIDTH_PX,   // ← 카드 폭 더 넓게: 140→148 처럼 조정
  cardGapPx = DEFAULT_UI.CARD_GAP_PX,       // ← 카드 간격 더 넓게: 16→20처럼 조정
}) {
  /* 최신 도서 → 슬라이드 대상 만들기 */
  const maxPages = 6; // 최대 페이지 수(필요시 prop으로 바꿔도 OK)
  const latest = useMemo(
    () => sortBooks(books).slice(0, itemsPerPage * maxPages),
    [books, itemsPerPage]
  );

  /* 페이지 분할(한 페이지 당 itemsPerPage권) */
  const pages = useMemo(() => {
    const arr = [];
    for (let i = 0; i < latest.length; i += itemsPerPage) {
      arr.push(latest.slice(i, i + itemsPerPage));
    }
    return arr;
  }, [latest, itemsPerPage]);

  const [page, setPage] = useState(0);
  const pageCount = pages.length || 1;

  /* 자동 슬라이드(페이지가 2개 이상일 때만) */
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), slideAutoMs);
    return () => clearInterval(t);
  }, [pageCount, slideAutoMs]);

  /* 슬라이드 트랙 너비 계산
     - 각 "페이지"가 패널 너비 100%를 차지하도록 설정.
     - transform으로 페이지 단위로 이동합니다. */
  const trackStyle = {
    width: `${pageCount * 100}%`,
    transform: `translateX(-${page * (100 / pageCount)}%)`,
    transition: `transform ${slideAnimMs}ms ease`,
  };

  /* 페이지(슬롯) 안에서 카드 간격 주기
     - gap을 px 단위로 주기 위해 inline style 사용 */
  const pageInnerStyle = {
    columnGap: `${cardGapPx}px`,
  };

  return (
    <div
      className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
      style={{ position: "sticky", top: stickyTop, height: stickyHeight }}
    >
      {/* (1) 공지사항 */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>

        {/* 🛠️ EDIT ME: 공지사항 내용은 이 HTML만 바꾸면 됩니다. */}
        <div className="h-36 overflow-auto rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타를 시작했습니다.</li>
            <li>도서 자동 채움 개선 작업중...</li>
 	    <li>BOOK MAP 개선 작업중...</li>
            <li>문의: bookmapwep@gmail.com</li>
          </ul>
        </div>
      </section>

      {/* (2) NEW BOOK 슬라이드 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        <div className="relative overflow-hidden">
          {/* 트랙: 페이지 단위 이동 */}
          <div className="flex" style={trackStyle}>
            {pages.map((pg, idx) => (
              // 한 "페이지"는 가로 100%를 차지
              <div key={idx} className="flex w-full shrink-0 justify-start" style={pageInnerStyle}>
                {pg.map((b) => (
                  <MiniBookCard key={b.id} book={b} widthPx={cardWidthPx} />
                ))}
                {/* 마지막 페이지에서 카드 수가 부족하면 빈 슬롯으로 "폭 유지" */}
                {Array.from({ length: Math.max(0, itemsPerPage - pg.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="shrink-0 rounded-xl border border-dashed border-gray-200 bg-gray-50"
                    style={{ width: cardWidthPx, height: Math.round((cardWidthPx * 4) / 3) + 56 }} // 이미지 비율 + 텍스트 대략
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 페이지 도트 */}
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

        {/* 🛠️ EDIT ME: 이벤트 내용은 이 HTML만 바꾸면 됩니다. */}
        <div className="h-36 overflow-auto rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700">
          <p className="font-medium">도서등록 이벤트</p>
          <p className="text-gray-600">책 지도를 위해 도서를 등록해주세요.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
          </ul>
        </div>
      </section>
    </div>
  );
}
