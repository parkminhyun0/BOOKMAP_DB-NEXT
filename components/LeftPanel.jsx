// components/LeftPanel.jsx
// ─────────────────────────────────────────────────────────────
// 📌 공용 좌측 패널(공지 / NEW BOOK / 이벤트)
// - book.js, map.js 어디서든 동일 UI 재사용
// - 초보자도 쉽게 수정하도록 "EDIT ME" 위치만 고치면 됩니다.
// ─────────────────────────────────────────────────────────────

/* 사용 예시(그대로 두세요):
  <LeftPanel books={books} />
  ※ 기본값이 "한 권 슬라이드 + 자동 높이" 이므로 book.js/map.js 수정 불필요
*/

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   🛠️ EDIT ME: 자주 바꾸는 옵션
   - 슬라이드 속도/카드 폭/레이아웃 모드만 바꿔도 대부분 해결됩니다.
────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  slideAutoMs: 3500,   // ⏱️ 슬라이드 자동 전환 간격(ms). 느리게=값↑, 빠르게=값↓
  cardWidth: 180,      // 🖼️ NEW BOOK 1권 카드의 가로(px). 160~200 권장
  mode: "single",      // 📚 "single" = 한 권, "multi" = 여러 권( itemsPerPage 사용 )
  maxPages: 10,        // 🔢 최대 몇 페이지까지 보여줄지(최신순)
  stickyTop: 96,       // 📌 상단 고정 위치(px). 네비 높이에 맞춰 필요 시만 조절
  autoHeight: true,    // 📏 true: 패널 높이를 콘텐츠에 맞춰 자동 조절(권장)
  // multi 모드에서만 쓰는 값( single 모드일 땐 무시 ):
  itemsPerPage: 2      // "multi"일 때 한 페이지에 몇 권씩 보여줄지
};

/* 유틸: 최신 등록순 정렬 */
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

/* NEW BOOK에서 쓰는 미니 카드(1권 전용 사이즈) */
function MiniBookCard({ book, width }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow"
      style={{ width }}
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

/* 본체 */
export default function LeftPanel({
  books = [],
  // 아래 props는 안 건드려도 됩니다. (모두 기본값으로 동작)
  stickyTop = DEFAULTS.stickyTop,
  // 과거 코드 호환용: stickyHeight가 넘어와도 기본은 "autoHeight=true"라 무시됩니다.
  stickyHeight,
  slideAutoMs = DEFAULTS.slideAutoMs,
  itemsPerPage: itemsPerPageProp = DEFAULTS.itemsPerPage,
  maxPages = DEFAULTS.maxPages,
  mode = DEFAULTS.mode,
  autoHeight = DEFAULTS.autoHeight,
  cardWidth = DEFAULTS.cardWidth,
}) {
  /* 1) 슬라이드 모드/페이지 구성 */
  // "single" 모드일 땐 무조건 한 권(요청사항), "multi"일 때만 itemsPerPage 적용
  const perPage = mode === "single" ? 1 : Math.max(1, Number(itemsPerPageProp) || 1);

  // 최신 도서 n(=perPage * maxPages)권 추리기
  const latest = useMemo(
    () => sortBooks(books).slice(0, perPage * maxPages),
    [books, perPage, maxPages]
  );

  // perPage 기준으로 페이지 배열 만들기
  const pages = useMemo(() => {
    const arr = [];
    for (let i = 0; i < latest.length; i += perPage) {
      arr.push(latest.slice(i, i + perPage));
    }
    return arr;
  }, [latest, perPage]);

  const [page, setPage] = useState(0);
  const pageCount = pages.length || 1;

  // 2) 자동 슬라이드
  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), slideAutoMs);
    return () => clearInterval(t);
  }, [pageCount, slideAutoMs]);

  // 3) sticky 컨테이너 스타일(자동 높이 기본)
  const stickyStyle = {
    position: "sticky",
    top: stickyTop,
    ...(autoHeight ? {} : stickyHeight ? { height: stickyHeight } : {}),
  };

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4" style={stickyStyle}>
      {/* (1) 공지사항 — 고정 높이 제거 → 콘텐츠 길이에 따라 자동 확장 */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>

        {/* 🛠️ EDIT ME: 공지 내용은 이 안의 HTML만 바꾸면 됩니다.
            길면 자연스럽게 늘어납니다. 너무 길면 max-h-64 + overflow-auto 를 추가하세요. */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타를 시작했습니다.</li>
            <li>도서 자동 채움(ISBN) 개선 작업 진행 중입니다.</li>
            <li>문의: bookmapwep@gmail.com</li>
          </ul>
        </div>
      </section>

      {/* (2) NEW BOOK — 기본: 한 권, 중앙 정렬 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        <div className="relative overflow-hidden">
          {/* 트랙: 전체 페이지 폭을 %로 설정 */}
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${page * 100}%)`, width: `${pageCount * 100}%` }}
          >
            {pages.map((pg, idx) => (
              // single 모드: 중앙 정렬 / multi 모드: 좌측 정렬 + 간격
              <div
                key={idx}
                className={`flex w-full shrink-0 ${perPage === 1 ? "justify-center" : "justify-start gap-3"}`}
              >
                {pg.map((b) => (
                  <MiniBookCard key={b.id} book={b} width={cardWidth} />
                ))}

                {/* multi 모드에서 마지막 페이지가 모자라면 빈 슬롯으로 균형 유지 */}
                {perPage > 1 &&
                  Array.from({ length: Math.max(0, perPage - pg.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="h-[260px] w-[160px] shrink-0 rounded-xl border border-dashed border-gray-200 bg-gray-50"
                      style={{ width: cardWidth }}
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

          {/* ✍️ 속도 조절 팁:
              위 DEFAULTS.slideAutoMs 값을 바꾸거나,
              <LeftPanel slideAutoMs={4000} /> 처럼 prop으로 넘겨도 됩니다. */}
        </div>
      </section>

      {/* (3) 이벤트 — 고정 높이 제거 → 자동 확장 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">이벤트</h3>

        {/* 🛠️ EDIT ME: 이벤트 내용도 이 HTML만 편집하세요.
            길면 자연스레 늘어나며, 너무 길면 max-h-64 + overflow-auto 추가 */}
        <div className="rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700">
          <p className="font-medium">📣 도서등록 이벤트</p>
          <p className="text-gray-600">책 지도를 위해 도서를 등록해주세요.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
            <li>기간: 상시</li>
            <li>대상: BookMap 이용자</li>
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
