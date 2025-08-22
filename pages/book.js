// pages/book.js
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "@/components/Loader";

/* ─────────────────────────────────────────────────────────────
   🔧 손대기 쉬운 옵션
   ───────────────────────────────────────────────────────────── */
const STICKY_TOP = 96;        // 좌측 고정 패널이 화면 상단에서 떨어지는 거리(px)
const STICKY_HEIGHT = 640;    // 좌측 고정 패널 높이(px)
const TITLE_MAX_PX = 16;      // 카드 제목 최대 글자 크기(px)
const TITLE_MIN_PX = 12;      // 카드 제목 최소 글자 크기(px)
const TITLE_PADDING_H = 12;   // 측정시 좌우 여유 픽셀
const ENABLE_TEST_PLACEHOLDERS = false; // 테스트시 true 끝나면 false 로 변경!
const TEST_PLACEHOLDER_COUNT = 30;
/* ───────────────────────────────────────────────────────────── */

/* ✅ 안전한 key 생성 (id 우선, 없으면 제목/저자/출판사+인덱스) */
function keyFor(book, idx) {
  const hasId = book && book.id != null && String(book.id).trim() !== "";
  if (hasId) return String(book.id); // 숫자/문자 혼용 방지
  const t = (book?.title || "").slice(0, 50);
  const a = (book?.author || "").slice(0, 50);
  const p = (book?.publisher || "").slice(0, 50);
  return `${t}|${a}|${p}|${idx}`;
}

/* ✅ created_at/id 기준 최신순 정렬 (등록 즉시 위로 올라오게) */
function toStamp(created_at, id) {
  // created_at(YYYY-MM-DD HH:mm:ss 또는 ISO) → 숫자 타임스탬프
  const s = String(created_at || "").trim();
  const t = s ? Date.parse(s.replace(" ", "T")) : NaN;
  if (!Number.isNaN(t)) return t;
  // created_at이 없다면 id를 숫자로 파싱(밀리초 id 가정)해서 보조 정렬
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}
function sortBooks(arr) {
  return [...arr].sort((a, b) => toStamp(b.created_at, b.id) - toStamp(a.created_at, a.id));
}

/* ✅ 제목 1줄 자동 맞춤 (카드 너비 실측 → 폰트 크기 자동 조절) */
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
   🧱 도서 카드 (실데이터 + 테스트용 공백 카드)
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

        {/* 제목: 1줄 + 자동 맞춤 */}
        <FitOneLine text={book.title} className="mt-3 font-semibold text-gray-900" />

        {/* 보조 정보(1줄) */}
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
   🏷️ “정해진 탭” 필터 바
   - 전체 | 카테고리 | 단계 | 저자 | 역자 | 주제 | 장르 | 구분
   - ✅ 저자/역자: 어떤 구분자도 사용하지 않고, "필드 전체 문자열" 1개로 취급
   ───────────────────────────────────────────────────────────── */
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

// 목록형 필드(카테고리/주제/장르 등)만 분리 — 공백은 분리자로 쓰지 않음
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ","); // 다양한 구분자 → 쉼표
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ✅ 저자/역자: “절대 분리하지 않고” 전체 문자열 그대로 사용
function getWholeField(input) {
  const s = norm(input);
  return s ? [s] : [];
}

// 목록에서 탭 값 수집
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
    getWholeField(b.author).forEach((t) => setAuthor.add(t)); // 전체 문자열
    getWholeField(b.translator ?? b["역자"]).forEach((t) => setTranslator.add(t)); // 전체 문자열
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

// 선택된 탭/값에 따라 실제 필터링
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
        return norm(b.author).toLowerCase() === v; // 전체 문자열과 정확히 일치
      case "역자":
        return norm(b.translator ?? b["역자"]).toLowerCase() === v; // 전체 문자열과 정확히 일치
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

// 상단 필터바 UI
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
      {/* 탭(종류) */}
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

      {/* 값 칩(해당 탭 선택 시) */}
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
   📄 실제 페이지 (좌 2 + 우 5, 우측 5열 카드)
   ───────────────────────────────────────────────────────────── */
export default function BookListGrid() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError] = useState(null);

  // 현재 선택된 필터: { type: '전체' | '카테고리' | ... , value: string|null }
  const [facet, setFacet] = useState({ type: "전체", value: null });

  // 짧은 로딩 깜빡임 방지
  useEffect(() => {
    let t;
    if (loading) t = setTimeout(() => setShowSkeleton(true), 250);
    return () => clearTimeout(t);
  }, [loading]);

  // 데이터 로드 (원격+로컬 병합 API)
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
        // id 문자열 표준화 + 정렬(최신순)
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

  // 스크롤 테스트용 공백 카드 (원하면 ON)
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-extrabold text-blue-600">📚 도서목록</h1>
          <span className="text-sm text-gray-500">총 {totalCount}권</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측: 고정(sticky) 박스 */}
          <aside className="hidden md:col-span-2 md:block">
            <div
              className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
              style={{ position: "sticky", top: STICKY_TOP, height: STICKY_HEIGHT }}
            >
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                좌측 영역(추후 컨텐츠)
              </div>
            </div>
          </aside>

          {/* 우측: 필터바 + 5열 카드 그리드 */}
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
