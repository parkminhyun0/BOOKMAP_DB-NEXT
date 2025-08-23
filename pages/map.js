// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ─────────────────────────────────────────────────────────────
   레이아웃(도서목록과 동일)
   ───────────────────────────────────────────────────────────── */
const STICKY_TOP = 96;
const STICKY_HEIGHT = 640;

/* ─────────────────────────────────────────────────────────────
   색상/스타일 매핑 (범례와 동일)
   - 노드(도트) 컬러: 타입별 대표색
   - 엣지(관계선): 타입별 색 + 선스타일
   ───────────────────────────────────────────────────────────── */
const NODE_COLOR = {
  카테고리: "#a855f7", // 보라
  단계: "#f59e0b",     // 앰버
  저자: "#10b981",     // 초록
  역자: "#06b6d4",     // 청록
  주제: "#ef4444",     // 빨강
  장르: "#3b82f6",     // 파랑
  구분: "#9ca3af",     // 회색
  기본: "#6b7280",     // 기본(회색)
};

const EDGE_STYLE = {
  카테고리: { color: "#a855f7", dash: [] },        // 보라 실선
  단계: { color: "#f59e0b", dash: [] },             // 앰버 실선
  저자: { color: "#10b981", dash: [] },             // 초록 실선
  역자: { color: "#06b6d4", dash: [4, 4] },         // 청록 점선
  주제: { color: "#ef4444", dash: [] },             // 빨강 실선
  장르: { color: "#3b82f6", dash: [] },             // 파랑 실선
  구분: { color: "#9ca3af", dash: [3, 5] },         // 회색 점선
};

/* ─────────────────────────────────────────────────────────────
   유틸
   ───────────────────────────────────────────────────────────── */
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
function whole(input) {
  const s = norm(input);
  return s ? [s] : [];
}

/* ─────────────────────────────────────────────────────────────
   필터바 (도서목록과 동일한 UX: 탭 + 하위칩)
   ───────────────────────────────────────────────────────────── */
function FilterBar({ facets, facet, onChange }) {
  const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

  const valuesByTab = {
    전체: [],
    카테고리: facets.category,
    단계: facets.level,
    저자: facets.author,
    역자: facets.translator,
    주제: facets.subject,
    장르: facets.genre,
    구분: facets.division,
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
          {values.map((val) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BOOK MAP 페이지
   ───────────────────────────────────────────────────────────── */
export default function BookMap() {
  const router = useRouter();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facet, setFacet] = useState({ type: "전체", value: null });

  // 툴팁
  const [hover, setHover] = useState(null); // {book, x, y}
  const mousePosRef = useRef({ x: 0, y: 0 });
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    fetch("/api/books?source=both&prefer=remote")
      .then((r) => r.json())
      .then((arr) => {
        const normalized = (arr || []).map((b) => ({
          ...b,
          id: b?.id != null ? String(b.id) : null,
          divisionNorm: normalizeDivision(b.division),
        }));
        setBooks(normalized);
      })
      .finally(() => setLoading(false));
  }, []);

  // 좌측 칩 목록 생성을 위한 facets
  const facets = useMemo(() => {
    const setCategory = new Set();
    const setAuthor = new Set();
    const setTranslator = new Set();
    const setSubject = new Set();
    const setGenre = new Set();
    const setDivision = new Set();
    const setLevel = new Set();

    for (const b of books) {
      splitList(b.category).forEach((t) => setCategory.add(t));
      whole(b.author).forEach((t) => setAuthor.add(t));
      whole(b.translator ?? b["역자"]).forEach((t) => setTranslator.add(t));
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
      division: asSorted(setDivision),
      level: ["입문", "초급", "중급", "고급", "전문"].filter((l) => setLevel.has(l))
        .concat([...setLevel].filter((l) => !["입문", "초급", "중급", "고급", "전문"].includes(l))),
    };
  }, [books]);

  // 그래프 데이터 생성
  const graph = useMemo(() => {
    const nodes = books.map((b) => {
      const active = facet.type !== "전체"
        ? matchesFacet(b, facet.type, facet.value)
        : true;
      const color =
        facet.type === "전체"
          ? NODE_COLOR["기본"]
          : active
          ? NODE_COLOR[facet.type] || NODE_COLOR["기본"]
          : "#e5e7eb";
      return {
        id: b.id ?? b.title,
        _book: b,
        name: b.title,
        color,
      };
    });

    const links = buildLinks(books, facet);
    return { nodes, links };
  }, [books, facet]);

  // 캔버스 내 마우스 좌표 추적 → 툴팁 위치
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>
          <p className="mt-6 text-gray-600">그래프를 준비하는 중…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>

        <FilterBar facets={facets} facet={facet} onChange={setFacet} />

        {/* 범례 */}
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <strong className="text-gray-800">노드(도트) 색상 안내:</strong>
            {["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"].map((t) => (
              <span key={`dot-${t}`} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: NODE_COLOR[t] }}
                />
                {t}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <strong className="text-gray-800">연결선 색/스타일 안내:</strong>
            {Object.entries(EDGE_STYLE).map(([t, s]) => (
              <span key={`edge-${t}`} className="inline-flex items-center gap-1">
                <svg width="40" height="10">
                  <line
                    x1="0"
                    y1="5"
                    x2="40"
                    y2="5"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeDasharray={(s.dash || []).join(",")}
                  />
                </svg>
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            같은 기준 값을 공유하는 도서들이 선으로 연결됩니다. 노드를 클릭하면 도서 상세로 이동합니다.
          </p>
        </div>

        {/* 2 + 5 레이아웃 (도서목록과 동일) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
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

          <section className="md:col-span-5">
            <div
              ref={canvasWrapRef}
              className="rounded-2xl border border-gray-200 bg-white"
              style={{ height: 560 }}
            >
              <ForceGraph2D
                graphData={graph}
                width={undefined}
                height={undefined}
                backgroundColor="rgba(255,255,255,1)"
                nodeRelSize={6}
                linkWidth={1.5}
                linkColor={(l) => (EDGE_STYLE[l.type]?.color || "#9ca3af")}
                linkLineDash={(l) => EDGE_STYLE[l.type]?.dash || []}
                nodeCanvasObject={(n, ctx, scale) => {
                  const r = 3.5;
                  ctx.beginPath();
                  ctx.arc(n.x, n.y, r, 0, 2 * Math.PI, false);
                  ctx.fillStyle = n.color || NODE_COLOR["기본"];
                  ctx.fill();
                  // 라벨
                  ctx.font = `${12 / Math.sqrt(scale)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`;
                  ctx.fillStyle = "#111827";
                  const text = n.name || n.id;
                  ctx.fillText(text, n.x + 6, n.y + 4);
                }}
                onNodeHover={(node) => {
                  if (!canvasWrapRef.current) return;
                  if (node && node._book) {
                    const p = mousePosRef.current;
                    setHover({ book: node._book, x: p.x + 14, y: p.y + 14 });
                  } else {
                    setHover(null);
                  }
                }}
                onNodeClick={(node) => {
                  if (node?._book?.id) router.push(`/book/${node._book.id}`);
                }}
                cooldownTicks={100}
              />
              {/* 툴팁 */}
              {hover?.book && (
                <div
                  className="pointer-events-none absolute z-10 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                  style={{ left: hover.x, top: hover.y }}
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-12 overflow-hidden rounded bg-gray-100">
                      {hover.book.image ? (
                        <img
                          src={hover.book.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-gray-900">{hover.book.title}</div>
                      <div className="truncate text-xs text-gray-600">{hover.book.author}</div>
                      <div className="truncate text-[11px] text-gray-500">{hover.book.publisher}</div>
                      {hover.book.ISBN && (
                        <div className="truncate text-[11px] text-gray-400">ISBN {hover.book.ISBN}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   그래프 링크 생성
   - facet.type 이 "전체" 인 경우: 모든 타입을 얕게 연결
   - 특정 타입 선택 시: 해당 타입의 동일 값들만 연결
   - facet.value 가 지정되면 해당 값 관련만 강조 연결
   ───────────────────────────────────────────────────────────── */
function matchesFacet(book, type, value) {
  const v = value == null ? null : String(value);
  const has = (arr) => (v == null ? arr.length > 0 : arr.includes(v));

  switch (type) {
    case "카테고리":
      return has(splitList(book.category));
    case "단계":
      return has(whole(book.level));
    case "저자":
      return has(whole(book.author));
    case "역자":
      return has(whole(book.translator ?? book["역자"]));
    case "주제":
      return has(splitList(book.subject));
    case "장르":
      return has(splitList(book.genre));
    case "구분":
      return has(whole(normalizeDivision(book.division)));
    default:
      return true;
  }
}

function valuesOf(book, type) {
  switch (type) {
    case "카테고리":
      return splitList(book.category);
    case "단계":
      return whole(book.level);
    case "저자":
      return whole(book.author);
    case "역자":
      return whole(book.translator ?? book["역자"]);
    case "주제":
      return splitList(book.subject);
    case "장르":
      return splitList(book.genre);
    case "구분":
      return whole(normalizeDivision(book.division));
    default:
      return [];
  }
}

function buildLinks(books, facet) {
  // 그룹핑하여 얕게 연결(군내 이웃만 연결) → O(n)
  const connectGrouped = (type, onlyValue = null, maxLinks = 800) => {
    const buckets = new Map();
    books.forEach((b, idx) => {
      const vals = valuesOf(b, type);
      vals.forEach((v) => {
        if (onlyValue && v !== onlyValue) return;
        if (!buckets.has(v)) buckets.set(v, []);
        buckets.get(v).push(idx);
      });
    });

    const style = EDGE_STYLE[type] || EDGE_STYLE["구분"];
    const links = [];
    for (const [v, arr] of buckets) {
      for (let i = 1; i < arr.length; i++) {
        links.push({
          source: books[arr[i - 1]].id ?? books[arr[i - 1]].title,
          target: books[arr[i]].id ?? books[arr[i]].title,
          type,
          __value: v,
          __style: style,
        });
        if (links.length > maxLinks) return links;
      }
    }
    return links;
  };

  if (facet.type === "전체") {
    // 모든 타입을 조금씩
    const types = ["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];
    return types.flatMap((t) => connectGrouped(t, null, 160));
  } else {
    // 특정 타입만, 값이 있으면 그 값만
    const value = facet.value ?? null;
    return connectGrouped(facet.type, value, 1200);
  }
}
