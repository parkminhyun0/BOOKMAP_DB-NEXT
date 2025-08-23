// pages/book.js
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "@/components/Loader";

/* ─────────────────────────────────────────────────────────────
   🔧 손대기 쉬운 옵션
   ───────────────────────────────────────────────────────────── */

/** 좌측 고정 패널의 상단 간격(px) — 네비게이션 높이에 맞춰 조정 */
const STICKY_TOP = 96;
/** 좌측 고정 패널의 높이(px) */
const STICKY_HEIGHT = 640;
/** 카드 제목(자동맞춤) 최대/최소 폰트(px) */
const TITLE_MAX_PX = 16;
const TITLE_MIN_PX = 12;
/** 제목 가로 여유(px) */
const TITLE_PADDING_H = 12;
/** [테스트 전용] 플레이스홀더 카드 표시 여부 */
const ENABLE_TEST_PLACEHOLDERS = true;
/** [테스트 전용] 플레이스홀더 카드 개수 */
const TEST_PLACEHOLDER_COUNT = 50;

/* ─────────────────────────────────────────────────────────────
   공통 유틸
   ───────────────────────────────────────────────────────────── */

function keyFor(book, idx) {
  const hasId = book && book.id != null && String(book.id).trim() !== "";
  if (hasId) return String(book.id);
  const t = (book?.title || "").slice(0, 50);
  const a = (book?.author || "").slice(0, 50);
  const p = (book?.publisher || "").slice(0, 50);
  return `${t}|${a}|${p}|${idx}`;
}

/* 최신순 정렬(created_at 우선, 없으면 id 숫자 보조) */
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

/* 문자열 정규화 */
const norm = (v) => String(v ?? "").trim();

/* 구분 필드(국내/국외/원서/번역서) 통일 */
function normalizeDivision(v) {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("번역")) return "번역서";
  if (s.includes("원서")) return "원서";
  if (s.includes("국외") || s.includes("해외")) return "국외서";
  if (s.includes("국내")) return "국내서";
  return s;
}

/* 쉼표/특수기호를 , 로 통일해서 분할 (공백 단독 분리 X) */
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ─────────────────────────────────────────────────────────────
   제목 1줄 자동맞춤
   ───────────────────────────────────────────────────────────── */
function FitOneLine({ text, className = "" }) {
  const wrapperRef = useRef(null);
  const spanRef = useRef(null);
  const [size, setSize] = useState(TITLE_MAX_PX);

  const fit = () => {
    const wrap = wrapperRef.current;
    const span = spanRef.current;
    if (!wrap || !span) return;
    let lo = TITLE_MIN_PX;
    let hi = TITLE_MAX_PX;
    let best = lo;
    span.style.whiteSpace = "nowrap";
    span.style.display = "inline-block";
    const available = Math.max(0, wrap.clientWidth - TITLE_PADDING_H);
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      span.style.fontSize = mid + "px";
      if (span.scrollWidth <= available) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setSize(best);
  };

  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden">
      <span
        ref={spanRef}
        style={{ fontSize: size }}
        className={`block whitespace-nowrap overflow-hidden text-ellipsis ${className}`}
        title={text}
      >
        {text}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   카드 & 스켈레톤
   ───────────────────────────────────────────────────────────── */
function BookCard({ book }) {
  if (book.__placeholder) {
    return (
      <li className="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white shadow-sm">
        <div className="p-3">
          <div className="aspect-[3/4] w-full rounded-lg bg-gray-100" />
          <div className="mt-3 h-4 w-4/5 rounded bg-gray-100" />
          <div className="mt-2 h-3 w-2/5 rounded bg-gray-100" />
        </div>
      </li>
    );
  }

  return (
    <li className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/book/${book.id}`} className="block p-3">
        <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
          {book.image ? (
            <img
              src={book.image}
              alt={book.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-gray-200" />
          )}
        </div>

        <FitOneLine text={book.title} className="mt-3 font-semibold text-gray-900" />
        <p className="mt-1 text-xs text-gray-600 line-clamp-1">{book.author}</p>
        <p className="text-[11px] text-gray-400 line-clamp-1">{book.publisher}</p>
      </Link>
    </li>
  );
}

function BookCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-3 animate-pulse">
        <div className="aspect-[3/4] w-full rounded-lg bg-gray-200" />
        <div className="mt-3 h-4 w-4/5 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-3/5 rounded bg-gray-200" />
        <div className="mt-1 h-3 w-2/5 rounded bg-gray-200" />
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────
   필터 바
   ───────────────────────────────────────────────────────────── */
const LEVEL_ORDER = ["입문", "초급", "중급", "고급", "전문"];
const DIVISION_ORDER = ["국내서", "국외서", "원서", "번역서"];

function getWholeField(input) {
  const s = norm(input);
  return s ? [s] : [];
}

function extractFacetValues(books) {
  const setCategory = new Set();
  const setAuthor = new Set();
  const setTranslator = new Set();
  const setSubject = new Set();
  const setGenre = new Set();
  const setDivision = new Set();
  const setLevel = new Set();

  for (const b of books) {
    splitList(b.category).forEach((t) => setCategory.add(t));
    getWholeField(b.author).forEach((t) => setAuthor.add(t));
    getWholeField(b.translator ?? b["역자"]).forEach((t) => setTranslator.add(t));
    splitList(b.subject).forEach((t) => setSubject.add(t));
    splitList(b.genre).forEach((t) => setGenre.add(t));
    const div = normalizeDivision(b.division);
    if (div) setDivision.add(div);
    const lvl = norm(b.level);
    if (lvl) setLevel.add(lvl);
  }

  const asSorted = (set) => [...set].sort((a, b) => a.localeCompare(b, "ko"));

  return {
    category: asSorted(setCategory),
    author: asSorted(setAuthor),
    translator: asSorted(setTranslator),
    subject: asSorted(setSubject),
    genre: asSorted(setGenre),
    division: DIVISION_ORDER.filter((d) => setDivision.has(d)).concat(
      [...setDivision].filter((d) => !DIVISION_ORDER.includes(d))
    ),
    level: LEVEL_ORDER.filter((l) => setLevel.has(l)).concat(
      [...setLevel].filter((l) => !LEVEL_ORDER.includes(l))
    ),
  };
}

function filterBooksByFacet(books, facet) {
  const { type, value } = facet || {};
  if (!type || type === "전체" || !value) return books;
  const v = norm(value).toLowerCase();

  return books.filter((b) => {
    switch (type) {
      case "카테고리":
        return splitList(b.category).map((t) => t.toLowerCase()).includes(v);
      case "단계":
        return norm(b.level).toLowerCase() === v;
      case "저자":
        return norm(b.author).toLowerCase() === v;
      case "역자":
        return norm(b.translator ?? b["역자"]).toLowerCase() === v;
      case "주제":
        return splitList(b.subject).map((t) => t.toLowerCase()).includes(v);
      case "장르":
        return splitList(b.genre).map((t) => t.toLowerCase()).includes(v);
      case "구분":
        return normalizeDivision(b.division).toLowerCase() === v;
      default:
        return true;
    }
  });
}

function FilterBar({ facets, facet, onChange }) {
  const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

  const valuesByTab = {
    전체: [],
    카테고리: facets.category,
    단계: facets.level.length ? facets.level : LEVEL_ORDER,
    저자: facets.author,
    역자: facets.translator,
    주제: facets.subject,
    장르: facets.genre,
    구분: facets.division.length ? facets.division : DIVISION_ORDER,
  };
  const values = valuesByTab[facet.type] ?? [];

  return (
    <div className="mb-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onChange({ type: t, value: null })}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              facet.type === t
                ? "bg-gray-900 text-white border-gray-900"
                : "text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {facet.type !== "전체" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onChange({ type: facet.type, value: null })}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              facet.value == null
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            전체
          </button>

          {values.length > 0 ? (
            values.map((val) => (
              <button
                key={`${facet.type}-${val}`}
                onClick={() => onChange({ type: facet.type, value: val })}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  facet.value === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                title={val}
              >
                {val}
              </button>
            ))
          ) : (
            <span className="px-3 py-1.5 rounded-full text-sm text-gray-400 border border-dashed">
              데이터 없음
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   좌측 패널: 공지 / 최신도서 슬라이드 / 이벤트 (가로 3열)
   ───────────────────────────────────────────────────────────── */

function SlideRecentBooks({ items }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // 2초 간격 자동 슬라이드
  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => {
      if (!paused) setIdx((i) => (i + 1) % items.length);
    }, 2000);
    return () => clearInterval(t);
  }, [items, paused]);

  const cur = items?.[idx];

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <h3 className="text-xs font-semibold text-gray-700">최근 등록 도서</h3>
        <div className="text-[11px] text-gray-400">
          {items?.length ? `${idx + 1} / ${items.length}` : "0 / 0"}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        {cur ? (
          <Link
            href={`/book/${cur.id}`}
            className="group block rounded-lg border border-gray-200 p-3 hover:shadow"
          >
            <div className="aspect-[3/4] w-full overflow-hidden rounded bg-gray-100">
              {cur.image ? (
                <img
                  src={cur.image}
                  alt={cur.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="h-full w-full bg-gray-200" />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-900">{cur.title}</p>
            <p className="text-xs text-gray-500">{cur.author}</p>
          </Link>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-xs text-gray-400">
            표시할 도서가 없습니다.
          </div>
        )}
      </div>

      {items?.length > 1 && (
        <div className="flex items-center justify-center gap-1 pb-3">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`slide-${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 w-1.5 rounded-full ${
                i === idx ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeftPanel({ books }) {
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch("/api/notices?limit=6");
        if (alive && r.ok) setNotices((await r.json()) || []);
      } catch (_) {}
      setNotices((prev) =>
        prev.length
          ? prev
          : [
              { id: "n1", title: "BookMap 오픈 베타 공지", date: "2025-08-01" },
              { id: "n2", title: "ISBN 자동 채움 안내", date: "2025-08-10" },
              { id: "n3", title: "BOOK MAP 그래픽 뷰 업데이트", date: "2025-08-20" },
            ]
      );
    })();

    (async () => {
      try {
        const r = await fetch("/api/events?limit=6");
        if (alive && r.ok) setEvents((await r.json()) || []);
      } catch (_) {}
      setEvents((prev) =>
        prev.length
          ? prev
          : [
              { id: "e1", title: "가을 독서 이벤트 (포인트 지급)", date: "2025-09-01" },
              { id: "e2", title: "신간 추천 참여 이벤트", date: "2025-09-10" },
            ]
      );
    })();

    return () => {
      alive = false;
    };
  }, []);

  // 최신 등록 도서 슬라이드(이미지 있는 도서 위주)
  const recentBooks = useMemo(() => {
    const withImg = (books || []).filter((b) => b?.image);
    return sortBooks(withImg).slice(0, 12);
  }, [books]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 3열 그리드: 공지 / 슬라이드 / 이벤트 */}
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        {/* 공지사항 */}
        <section className="min-w-0 min-h-0 flex flex-col rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">공지사항</h3>
            <Link href="/notice" className="text-[11px] text-blue-600 hover:underline">
              더보기
            </Link>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {notices.length === 0 ? (
              <li className="text-xs text-gray-400">등록된 공지가 없습니다.</li>
            ) : (
              notices.map((n) => (
                <li key={n.id} className="group">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-gray-800 group-hover:underline">{n.title}</p>
                      {n.date && <p className="text-[11px] text-gray-400">{n.date}</p>}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* 최신 도서 슬라이드 */}
        <section className="relative min-w-0 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <SlideRecentBooks items={recentBooks} />
        </section>

        {/* 이벤트 */}
        <section className="min-w-0 min-h-0 flex flex-col rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">이벤트</h3>
            <Link href="/event" className="text-[11px] text-blue-600 hover:underline">
              더보기
            </Link>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {events.length === 0 ? (
              <li className="text-xs text-gray-400">진행 중인 이벤트가 없습니다.</li>
            ) : (
              events.map((e) => (
                <li key={e.id} className="group">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-gray-800 group-hover:underline">{e.title}</p>
                      {e.date && <p className="text-[11px] text-gray-400">{e.date}</p>}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   페이지
   ───────────────────────────────────────────────────────────── */
export default function BookListGrid() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [overlay, setOverlay] = useState(true); // 진입 즉시 오버레이 ON
  const [error, setError] = useState(null);
  const [facet, setFacet] = useState({ type: "전체", value: null });

  useEffect(() => {
    let skelTimer;
    if (loading) skelTimer = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(skelTimer);
  }, [loading]);

  // 오버레이: 로딩 끝난 후 200ms 유지 → 부드럽게 사라짐
  useEffect(() => {
    if (loading) {
      setOverlay(true);
    } else {
      const t = setTimeout(() => setOverlay(false), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // 데이터 로드
  useEffect(() => {
    setError(null);
    fetch("/api/books?source=both&prefer=remote")
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(`API ${res.status}: ${msg}`);
        }
        return res.json();
      })
      .then((raw) => {
        const normalized = (raw || []).map((b) => ({
          ...b,
          id: b?.id != null ? String(b.id) : null,
        }));
        setBooks(sortBooks(normalized));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const facets = useMemo(() => extractFacetValues(books), [books]);
  const filtered = useMemo(() => filterBooksByFacet(books, facet), [books, facet]);

  const displayed = useMemo(() => {
    if (!ENABLE_TEST_PLACEHOLDERS) return filtered;
    const placeholders = Array.from({ length: TEST_PLACEHOLDER_COUNT }, (_, i) => ({
      id: `placeholder-${i + 1}`,
      title: "",
      author: "",
      publisher: "",
      image: null,
      __placeholder: true,
    }));
    return [...filtered, ...placeholders];
  }, [filtered]);

  const totalCount = filtered.length;

  return (
    <div className="min-h-screen bg-gray-50" aria-busy={loading}>
      {/* 로딩 오버레이 */}
      {overlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm transition-opacity duration-200">
          <div className="rounded-xl bg-white/90 px-5 py-4 shadow-md">
            <Loader text="도서 목록을 불러오는 중입니다..." />
            <p className="mt-2 text-xs text-gray-500">잠시만 기다려 주세요.</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-extrabold text-blue-600">📚 도서목록</h1>
          <span className="text-sm text-gray-500">총 {totalCount}권</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측: 고정(sticky) 박스 - 3열 컨텐츠 */}
          <aside className="hidden md:col-span-2 md:block">
            <div
              className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
              style={{ position: "sticky", top: STICKY_TOP, height: STICKY_HEIGHT }}
            >
              <LeftPanel books={books} />
            </div>
          </aside>

          {/* 우측: 필터 + 그리드 */}
          <section className="md:col-span-5">
            <FilterBar facets={facets} facet={facet} onChange={setFacet} />

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                데이터를 불러오는 중 오류가 발생했습니다: {error}
              </p>
            )}

            {loading && showSkeleton ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <BookCardSkeleton key={i} />
                ))}
              </ul>
            ) : totalCount === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                조건에 맞는 도서가 없습니다. 상단 필터를 변경해 보세요.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {displayed.map((book, idx) => (
                  <BookCard key={keyFor(book, idx)} book={book} />
                ))}
              </ul>
            )}

            {loading && !showSkeleton && (
              <div className="mt-10 flex justify-center">
                <Loader text="도서를 불러오는 중..." />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
