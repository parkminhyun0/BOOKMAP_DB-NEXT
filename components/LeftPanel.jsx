// components/LeftPanel.jsx
// ─────────────────────────────────────────────────────────────
// 📌 공용 좌측 패널(공지 / NEW BOOK / 이벤트)
// - book.js, map.js 어디서든 재사용되는 하나의 컴포넌트입니다.
// - 초보자도 쉽게 고칠 수 있도록 "EDIT ME" 주석만 찾아 수정하면 됩니다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   🛠️ EDIT ME: 자주 바꾸는 옵션
   - periodDays: NEW BOOK에 포함될 "최근 N일" 범위
   - cardWidth : NEW BOOK 1권 카드 가로 폭(px)
   - showArrows: 좌우 이동 화살표 표시 여부
   - loop      : 끝에서 다시 처음으로 순환할지(무한 캐러셀)
   - stickyTop : 상단 고정 위치(px). 네비 높이에 맞춰 필요할 때만 조정
   - autoHeight: true면 패널/공지/이벤트가 내용 길이에 맞춰 자동으로 늘어남
────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  periodDays: 7,     // 최신 N일(요청사항: 최근 7일)
  cardWidth: 200,    // NEW BOOK 1권 카드 폭(px). 200~240 권장
  showArrows: true,  // ◀/▶ 버튼 표시
  loop: true,        // 마지막→처음, 처음→마지막으로 순환
  stickyTop: 96,     // 좌측 패널의 상단 고정 위치(px)
  autoHeight: true,  // 패널 높이를 자동으로(권장)
};

/* 시간 유틸: created_at이 없으면 id(숫자)에 의존해 대략 정렬 */
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
function withinDays(created_at, days) {
  const t = toStamp(created_at, 0);
  if (!t) return false;
  const now = Date.now();
  const diff = now - t; // ms
  return diff <= days * 24 * 60 * 60 * 1000;
}

/* NEW BOOK 1권 카드(이미지 + 아래쪽 오버레이 정보) */
function NewBookCard({ book, width }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="relative block overflow-hidden rounded-xl border border-gray-200 bg-white shadow"
      style={{ width }}
      title={book.title}
    >
      {/* 도서 이미지 */}
      <div className="aspect-[3/4] w-full bg-gray-100">
        {book.image ? (
          <img
            src={book.image}
            alt={book.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>

      {/* 오버레이 정보(이미지 위에 겹쳐 보이게) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        {/* 살짝 어두운 그라데이션 → 텍스트 가독성 ↑ */}
        <div className="h-24 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="line-clamp-2 text-sm font-semibold text-white drop-shadow">
            {book.title}
          </div>
          {book.author && (
            <div className="mt-1 line-clamp-1 text-xs text-white/90 drop-shadow">
              {book.author}
            </div>
          )}
          {book.publisher && (
            <div className="line-clamp-1 text-[11px] text-white/70 drop-shadow">
              {book.publisher}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* 본체 */
export default function LeftPanel({
  books = [],
  // 기존(book.js/map.js)에서 넘겨오던 props 호환(안 넘겨도 기본값으로 동작)
  stickyTop = DEFAULTS.stickyTop,
  // 과거 코드 호환용: stickyHeight가 넘어와도 기본은 autoHeight=true라서 무시됩니다.
  stickyHeight,
  // 아래는 필요 시 페이지에서 prop으로 덮어쓸 수 있습니다.
  periodDays = DEFAULTS.periodDays,
  cardWidth = DEFAULTS.cardWidth,
  showArrows = DEFAULTS.showArrows,
  loop = DEFAULTS.loop,
  autoHeight = DEFAULTS.autoHeight,
}) {
  /* 1) 최근 N일 도서만 추린 뒤 최신순 정렬 */
  const newBooks = useMemo(() => {
    const onlyRecent = (books || []).filter((b) => withinDays(b.created_at, periodDays));
    // 요청사항: “수량 제한 없음, 7일 등록 도서 전부 노출”
    // 단, 7일 내 도서가 하나도 없으면 UX상 공백이므로 최신 1~5권을 임시로 보여줄 수도 있습니다.
    // ➜ 기본은 "없으면 빈 상태"로 두고, 필요하면 아래 fallback을 사용하세요.
    // const fallback = sortBooks(books).slice(0, 5);
    const list = sortBooks(onlyRecent);
    return list;
  }, [books, periodDays]);

  /* 2) 수동 캐러셀 인덱스 */
  const [idx, setIdx] = useState(0);
  const count = newBooks.length;

  useEffect(() => {
    // 새 목록이 오면 인덱스 초기화
    setIdx(0);
  }, [count]);

  const goPrev = () => {
    if (count <= 1) return;
    setIdx((n) => {
      if (n > 0) return n - 1;
      return loop ? count - 1 : 0;
    });
  };
  const goNext = () => {
    if (count <= 1) return;
    setIdx((n) => {
      if (n < count - 1) return n + 1;
      return loop ? 0 : count - 1;
    });
  };

  // 키보드 ←/→ 지원(접근성)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, loop]);

  /* 3) sticky 컨테이너 스타일: 기본은 “자동 높이” */
  const stickyStyle = {
    position: "sticky",
    top: stickyTop,
    ...(autoHeight ? {} : stickyHeight ? { height: stickyHeight } : {}),
  };

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4" style={stickyStyle}>
      {/* (1) 공지사항 — 내용 길이에 따라 자동 확장 */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">공지사항</h3>

        {/* 🛠️ EDIT ME: 공지 내용은 이 안의 HTML만 바꾸면 됩니다.
            길이가 길면 자연스럽게 늘어납니다. 너무 길면 max-h-64 + overflow-auto 추가 */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          <ul className="list-disc pl-4">
            <li>BookMap 오픈 베타서비스 시작</li>
            <li>도서 자동 채움 개선 작업 중.</li>
            <li>문의: bookmapwep@gmail.com</li>
          </ul>
        </div>
      </section>

      {/* (2) NEW BOOK — 최근 N일 도서 1권씩 수동 캐러셀 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">NEW BOOK</h3>

        {count === 0 ? (
          <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
            최근 {periodDays}일 동안 등록된 도서가 없습니다.
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* ◀ 버튼 */}
            {showArrows && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-0 z-10 -ml-2 rounded-full border border-gray-300 bg-white p-1.5 shadow hover:bg-gray-50"
                aria-label="이전 도서"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* 가운데 1권 */}
            <NewBookCard book={newBooks[idx]} width={cardWidth} />

            {/* ▶ 버튼 */}
            {showArrows && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-0 z-10 -mr-2 rounded-full border border-gray-300 bg-white p-1.5 shadow hover:bg-gray-50"
                aria-label="다음 도서"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 페이지 인디케이터(선택): 필요 없으면 블록 통째로 삭제하세요 */}
        {count > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {newBooks.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full transition ${i === idx ? "bg-gray-900" : "bg-gray-300"}`}
              />
            ))}
          </div>
        )}

        {/* ✍️ 옵션 변경 팁
            - 새로운 기간으로 바꾸려면: <LeftPanel periodDays={14} />
            - 카드 폭 바꾸려면:       <LeftPanel cardWidth={200} />
            - 화살표 숨기려면:        <LeftPanel showArrows={false} />
            - 무한 순환 끄려면:       <LeftPanel loop={false} /> */}
      </section>

      {/* (3) 이벤트 — 내용 길이에 따라 자동 확장 */}
      <section className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">이벤트</h3>

        {/* 🛠️ EDIT ME: 이벤트 내용도 이 HTML만 편집하세요.
            길면 자연스레 늘어나며, 너무 길면 max-h-64 + overflow-auto 추가 */}
        <div className="rounded-lg bg-indigo-50 p-3 text-sm leading-6 text-gray-700">
          <p className="text-gray-600">책 지도를 위한 도서 등록에 참여해주세요.</p>
          <ul className="mt-2 list-disc pl-4 text-gray-600">
            <li>기간: 상시</li>
            <li>대상: BookMap 회원</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
