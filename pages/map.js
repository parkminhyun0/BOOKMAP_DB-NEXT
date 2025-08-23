// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

// 2D Force Graph – SSR 비활성
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
      그래프 초기화…
    </div>
  ),
});

/* ─────────────────────────────────────────────────────────────
   옵션 (도서목록 좌측 패널과 동일 크기/역할을 가정)
   ───────────────────────────────────────────────────────────── */
const STICKY_TOP = 96;
const STICKY_HEIGHT = 640;

// 관계 타입 목록과 색/스타일 매핑
const TYPES = ["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

const TYPE_COLOR = {
  카테고리: "#a855f7", // violet-500
  단계: "#f59e0b",     // amber-500
  저자: "#10b981",     // emerald-500
  역자: "#06b6d4",     // sky-500
  주제: "#ef4444",     // red-500
  장르: "#3b82f6",     // blue-500
  구분: "#9ca3af",     // gray-400
};

const TYPE_DASH = {
  카테고리: [],
  단계: [],
  저자: [],
  역자: [6, 6],      // 점선
  주제: [],
  장르: [],
  구분: [4, 8],      // 점선
};

const TYPE_WIDTH = {
  카테고리: 1.5,
  단계: 1.5,
  저자: 2.2,
  역자: 2.0,
  주제: 2.0,
  장르: 2.0,
  구분: 1.5,
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

// 쉼표/구분자 분리(공백은 분리자 X)
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// 저자/역자는 절대 분리하지 않고 “전체 문자열”
const whole = (x) => (norm(x) ? [norm(x)] : []);

function extractFacets(books) {
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
  const sort = (arr) => [...arr].sort((a, b) => a.localeCompare(b, "ko"));

  return {
    카테고리: sort(setCategory),
    단계: sort(setLevel),
    저자: sort(setAuthor),
    역자: sort(setTranslator),
    주제: sort(setSubject),
    장르: sort(setGenre),
    구분: sort(setDivision),
  };
}

/* ─────────────────────────────────────────────────────────────
   사이즈 측정 훅
   ───────────────────────────────────────────────────────────── */
function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ width: Math.round(cr.width), height: Math.round(cr.height) });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/* ─────────────────────────────────────────────────────────────
   페이지 컴포넌트
   ───────────────────────────────────────────────────────────── */
export default function BookMapPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // 데이터 로드
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 필터 탭 + 칩(도서목록과 동일 UX)
  const [tab, setTab] = useState("전체"); // "전체" 또는 TYPES 항목
  const [chip, setChip] = useState(null); // 선택된 하위 값(없으면 null)

  // 그래프/툴팁
  const graphRef = useRef(null);
  const wrapRef = useRef(null);
  const { width, height } = useSize(wrapRef);
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    setErr("");
    setLoading(true);
    fetch("/api/books?source=both&prefer=remote")
      .then(async (r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        const normalized = (raw || []).map((b) => ({
          ...b,
          id: b?.id != null ? String(b.id) : null,
        }));
        setBooks(normalized);
      })
      .catch((e) => setErr(e.message || "데이터 로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  const facets = useMemo(() => extractFacets(books), [books]);

  // 현재 탭의 칩 목록
  const chipList = useMemo(() => (TYPES.includes(tab) ? facets[tab] || [] : []), [tab, facets]);

  // 탭/칩 기준으로 노드 필터링
  const filteredBooks = useMemo(() => {
    if (tab === "전체" || !TYPES.includes(tab)) return books;
    if (!chip) return books; // 탭만 선택 시 전체 노드 노출
    const v = norm(chip).toLowerCase();

    return books.filter((b) => {
      switch (tab) {
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
  }, [books, tab, chip]);

  // 그래프 노드
  const nodes = useMemo(
    () =>
      filteredBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        image: b.image,
        raw: b,
      })),
    [filteredBooks]
  );

  // 그래프 링크(모든 관계 타입을 생성, 현재 필터와 무관하게 보여줌)
  const links = useMemo(() => {
    const id2book = new Map(books.map((b) => [String(b.id), b]));
    const arr = [];

    const n = filteredBooks.length;
    for (let i = 0; i < n; i++) {
      const A = filteredBooks[i];
      for (let j = i + 1; j < n; j++) {
        const B = filteredBooks[j];
        const rels = [];

        // 카테고리
        if (intersects(splitList(A.category), splitList(B.category))) rels.push("카테고리");
        // 단계
        if (norm(A.level) && norm(A.level) === norm(B.level)) rels.push("단계");
        // 저자(전체 문자열 일치)
        if (norm(A.author) && norm(A.author) === norm(B.author)) rels.push("저자");
        // 역자(전체 문자열 일치)
        const aT = norm(A.translator ?? A["역자"]);
        const bT = norm(B.translator ?? B["역자"]);
        if (aT && aT === bT) rels.push("역자");
        // 주제
        if (intersects(splitList(A.subject), splitList(B.subject))) rels.push("주제");
        // 장르
        if (intersects(splitList(A.genre), splitList(B.genre))) rels.push("장르");
        // 구분
        const aD = normalizeDivision(A.division);
        const bD = normalizeDivision(B.division);
        if (aD && aD === bD) rels.push("구분");

        // 링크 생성(관계마다 1개씩)
        for (const t of rels) {
          arr.push({ source: String(A.id), target: String(B.id), type: t });
        }
      }
    }
    return arr;

    function intersects(a, b) {
      if (!a.length || !b.length) return false;
      const set = new Set(a.map((x) => x.toLowerCase()));
      return b.some((x) => set.has(x.toLowerCase()));
    }
  }, [filteredBooks, books]);

  // 노드 색: 현재 탭 기준(전체면 회색)
  const nodeColor = useMemo(() => {
    const c = TYPES.includes(tab) ? TYPE_COLOR[tab] : "#6b7280"; // gray-500
    return c;
  }, [tab]);

  // 노드 렌더링(도트 + 텍스트)
  const drawNode = (node, ctx, scale) => {
    const r = 4.5;
    ctx.beginPath();
    ctx.fillStyle = nodeColor;
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fill();

    // 제목
    const label = node.title || "";
    ctx.font = `${Math.max(10, 12 / (scale ** 0.15))}px ui-sans-serif, -apple-system, BlinkMacSystemFont`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#374151"; // gray-700
    ctx.fillText(label, node.x + 8, node.y + 6);
  };

  // 링크는 캔버스로 직접 그려서 점선/두께 반영
  const drawLink = (link, ctx) => {
    const color = TYPE_COLOR[link.type] || "#9ca3af";
    const width = TYPE_WIDTH[link.type] || 1.5;
    const dash = TYPE_DASH[link.type] || [];

    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash.length) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  };

  // 호버 핸들러(툴팁 좌표 변환)
  const handleHover = (node) => {
    if (!isClient || !node || !graphRef.current) {
      setHover({ node: null, x: 0, y: 0 });
      return;
    }
    const p = graphRef.current.graph2ScreenCoords(node.x, node.y);
    setHover({ node, x: p.x, y: p.y });
  };

  const handleClick = (node) => {
    if (!node?.id) return;
    router.push(`/book/${node.id}`);
  };

  const total = nodes.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>

        {/* 탭 */}
        <div className="mb-2 flex flex-wrap gap-2">
          {["전체", ...TYPES].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setChip(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                tab === t
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 칩(도서목록과 동일 UX) */}
        {TYPES.includes(tab) && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => setChip(null)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                chip == null
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              전체
            </button>
            {chipList.map((v) => (
              <button
                key={v}
                onClick={() => setChip(v === chip ? null : v)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  chip === v
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                title={v}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* 범례 */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="font-semibold text-gray-700">노드(도트) 색상 안내:</div>
            <LegendDots />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="font-semibold text-gray-700">연결선 색/스타일 안내:</div>
            <LegendLines />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            같은 기준 값을 공유하는 도서들이 선으로 연결됩니다. 노드를 클릭하면 도서 상세로 이동합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측: 도서목록과 동일 크기의 고정 영역 */}
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

          {/* 우측: 그래프 */}
          <section className="md:col-span-5">
            <div
              ref={wrapRef}
              className="relative rounded-2xl border border-gray-200 bg-white"
              style={{ minHeight: 520, height: 640, overflow: "hidden" }}
            >
              {err && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-red-600">
                  데이터 로드 오류: {err}
                </div>
              )}

              {isClient && !loading && (
                <ForceGraph2D
                  ref={graphRef}
                  width={width}
                  height={height}
                  graphData={{ nodes, links }}
                  nodeLabel="title"
                  nodeCanvasObject={drawNode}
                  // 기본 링크는 숨기고 캔버스로 직접 그림(점선/두께 반영)
                  linkColor={() => "rgba(0,0,0,0)"}
                  linkCanvasObject={drawLink}
                  linkCanvasObjectMode={() => "after"}
                  onNodeHover={handleHover}
                  onNodeClick={handleClick}
                  cooldownTicks={120}
                />
              )}

              {/* 툴팁 */}
              {hover.node && (
                <div
                  className="pointer-events-none absolute z-20 min-w-[160px] max-w-[240px] rounded-lg bg-gray-900/90 px-3 py-2 text-xs text-white shadow-lg"
                  style={{
                    left: Math.max(8, Math.min((hover.x || 0) + 10, (width || 300) - 170)),
                    top: Math.max(8, Math.min((hover.y || 0) - 10, (height || 200) - 80)),
                  }}
                >
                  <div className="font-semibold">{hover.node.title}</div>
                  {hover.node.author && <div className="mt-0.5 opacity-90">{hover.node.author}</div>}
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500">노드 수: {total}개</p>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   범례 컴포넌트
   ───────────────────────────────────────────────────────────── */
function LegendDots() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TYPES.map((t) => (
        <span key={t} className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: TYPE_COLOR[t] }}
          />
          <span className="text-gray-700">{t}</span>
        </span>
      ))}
    </div>
  );
}

function LegendLines() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {TYPES.map((t) => (
        <span key={t} className="inline-flex items-center gap-2">
          <svg width="48" height="10" viewBox="0 0 48 10">
            <path
              d="M2 5 L46 5"
              stroke={TYPE_COLOR[t]}
              strokeWidth={TYPE_WIDTH[t]}
              fill="none"
              strokeDasharray={(TYPE_DASH[t] || []).join(",")}
            />
          </svg>
          <span className="text-gray-700">{t}</span>
        </span>
      ))}
    </div>
  );
}
