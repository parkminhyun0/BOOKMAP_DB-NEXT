// pages/book.js
// -----------------------------------------------------------------------------
// ✅ 이 파일에서 자주 고칠 구역만 기억하세요
//  1) [🛠️ EDIT ME: 빠른 설정]  → 좌측 패널 높이, 슬라이드 간격/개수, 제목 글꼴 등
//  2) [🛠️ EDIT ME: 공지/이벤트 콘텐츠] → 좌측 패널의 텍스트/링크/마크업
//  3) [🛠️ EDIT ME: 슬라이드 카드(미니 북카드)] → NEW BOOK 카드 UI
//  4) [🛠️ EDIT ME: 필터 탭/칩] → 탭 순서와 표시값 제어
// -----------------------------------------------------------------------------

// pages/book.js
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";        // ✅ FIX
import LeftPanel from "../components/LeftPanel";  // (이미 있으면 생략)

/* ─────────────────────────────────────────────────────────────
   🛠️ EDIT ME: 빠른 설정
   - 실무에서 가장 많이 만지는 옵션을 모아 둔 곳입니다.
────────────────────────────────────────────────────────────── */

// 좌측 고정(sticky) 패널 위치/높이
const STICKY_TOP = 96;   // 네비 높이에 따라 조정
const STICKY_HEIGHT = 640;

// 제목 한 줄 자동맞춤(카드 타이틀) 폰트 범위
const TITLE_MAX_PX = 16;
const TITLE_MIN_PX = 12;
const TITLE_PADDING_H = 12;

// 테스트용 플레이스홀더(배포 시 false 권장, 테스트 시 true)
const ENABLE_TEST_PLACEHOLDERS = false;
const TEST_PLACEHOLDER_COUNT = 30;

// NEW BOOK 슬라이더
const SLIDE_AUTO_MS = 5000;   // 자동 슬라이드 간격(밀리초)
const SLIDE_ITEMS_PER_PAGE = 2; // 한 페이지에 보여줄 도서 수 (좌측 패널 폭 기준 2 권이 안정적)
const SLIDE_MAX_PAGES = 5;      // 최대 페이지 수(=가져올 최신 도서 페이지 수)

/* ─────────────────────────────────────────────────────────────
   공통 유틸
────────────────────────────────────────────────────────────── */
function keyFor(book, idx) {
  const hasId = book && book.id != null && String(book.id).trim() !== "";
  if (hasId) return String(book.id);
  const t = (book?.title || "").slice(0, 50);
  const a = (book?.author || "").slice(0, 50);
  const p = (book?.publisher || "").slice(0, 50);
  return `${t}|${a}|${p}|${idx}`;
}
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

const LEVEL_ORDER = ["입문", "초급", "중급", "고급", "전문"];
const DIVISION_ORDER = ["국내서", "국외서", "원서", "번역서"];

const norm = (v) => String(v ?? "").trim();
function normalizeDivision(v) {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("번역")) return "번역서";
  if (s.includes("원서")) return "원서";
  if (s.includes("국외") || s.includes("해외")) return "국외서";
  if (s.includes("국내")) return "국내서";
  return s;
}
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}
function getWholeField(input) {
  const s = norm(input);
  return s ? [s] : [];
}

/* ─────────────────────────────────────────────────────────────
   제목 1줄 자동맞춤
────────────────────────────────────────────────────────────── */
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
   미니 도서 카드(좌측 패널 NEW BOOK 슬라이드용)
   🛠️ EDIT ME: 카드 비주얼/텍스트 크기를 바꾸려면 className만 손대세요.
────────────────────────────────────────────────────────────── */
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
        <FitOneLine text={book.title} className="font-semibold text-[13px] text-gray-900" />
        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-600">{book.author}</p>
        <p className="text-[10px] text-gray-400">{book.publisher}</p>
      </div>
    </Link>
  );
}


/* ─────────────────────────────────────────────────────────────
   도서 카드 / 스켈레톤 (그리드)
────────────────────────────────────────────────────────────── */
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
   🛠️ EDIT ME: 필터 탭/칩 – 탭 순서나 표시값을 바꾸려면 여기만!
────────────────────────────────────────────────────────────── */
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
  const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"]; // 🛠️ EDIT ME

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
   📄 페이지
────────────────────────────────────────────────────────────── */
export default function BookListGrid() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [error, setError] = useState(null);
  const [facet, setFacet] = useState({ type: "전체", value: null });

  useEffect(() => {
    let skelTimer;
    if (loading) skelTimer = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(skelTimer);
  }, [loading]);

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
         {/* 좌측: 공용 컴포넌트 사용 (공지/NEW BOOK 슬라이드/이벤트) */}
	<aside className="hidden md:col-span-2 md:block">
  		<LeftPanel
 		   books={books}                 // 최신 도서 슬라이드에 사용
  		  stickyTop={STICKY_TOP}        // 고정 시작 위치(px)
 		   stickyHeight={STICKY_HEIGHT}  // 패널 전체 높이(px)
 		   slideAutoMs={5000}            // 자동 넘김 간격(ms)
  		  itemsPerPage={2}              // 한 페이지 도서 수
 		   maxPages={5}                  // 최대 페이지 수(=2*5권)
		  />
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
