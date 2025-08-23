// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

/* ----------------------------------------------------------------
   2D ForceGraph (SSR 비활성) + 로딩 플레이스홀더
---------------------------------------------------------------- */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
      그래프 초기화…
    </div>
  ),
});

/* ----------------------------------------------------------------
   상수/스타일 매핑
---------------------------------------------------------------- */
const STICKY_TOP = 96;
const STICKY_HEIGHT = 640;

const TYPES = ["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

const TYPE_COLOR = {
  카테고리: "#a855f7",
  단계: "#f59e0b",
  저자: "#10b981",
  역자: "#06b6d4",
  주제: "#ef4444",
  장르: "#3b82f6",
  구분: "#9ca3af",
};

const TYPE_DASH = {
  카테고리: [],
  단계: [],
  저자: [],
  역자: [6, 6],
  주제: [],
  장르: [],
  구분: [4, 8],
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

/* ----------------------------------------------------------------
   유틸
---------------------------------------------------------------- */
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
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const whole = (x) => (norm(x) ? [norm(x)] : []);

/* facet 목록 수집 (칩 표시용) */
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
  const sort = (set) => [...set].sort((a, b) => a.localeCompare(b, "ko"));

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

/* 컨테이너 실측 */
function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const cr = e.contentRect;
      setSize({ width: Math.round(cr.width), height: Math.round(cr.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/* ----------------------------------------------------------------
   본문
---------------------------------------------------------------- */
export default function BookMapPage() {
  const router = useRouter();

  // 데이터
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 필터 탭/칩
  const [tab, setTab] = useState("전체"); // "전체" 또는 TYPES
  const [chip, setChip] = useState(null); // 하위 값

  // 그래프
  const wrapRef = useRef(null);
  const { width, height } = useSize(wrapRef);
  const graphRef = useRef(null);

  // 호버/툴팁
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });

  // 마운트 이후에만 그래프 렌더(SSR 회피)
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  /* 데이터 로드 */
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

  /* facet 목록(칩) */
  const facets = useMemo(() => extractFacets(books), [books]);
  const chipList = useMemo(() => (TYPES.includes(tab) ? facets[tab] || [] : []), [tab, facets]);

  /* 노드 필터(탭/칩) */
  const filteredBooks = useMemo(() => {
    if (tab === "전체" || !TYPES.includes(tab)) return books;
    if (!chip) return books; // 탭만 고른 경우: 노드는 전체 노출(대신 링크만 타입별 필터)
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

  /* 노드 생성 */
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

  /* 링크 생성
     - 기본: filteredBooks 간 모든 관계 계산
     - 탭이 TYPES 중 하나인 경우:
       - chip이 비어있으면: "해당 타입" 링크만 표시
       - chip이 있으면: "해당 타입 + 해당 값"에 해당하는 링크만 표시
  */
  const links = useMemo(() => {
    const arr = [];
    const n = filteredBooks.length;

    // 현재 탭/칩 컨텍스트
    const onlyType = TYPES.includes(tab) ? tab : null;
    const onlyValue = onlyType && chip ? norm(chip) : null;

    const push = (A, B, type, sameValue) => {
      // 타입 필터
      if (onlyType && type !== onlyType) return;
      // 값 필터(칩)
      if (onlyValue && !sameValue) return;
      arr.push({ source: String(A.id), target: String(B.id), type });
    };

    for (let i = 0; i < n; i++) {
      const A = filteredBooks[i];
      for (let j = i + 1; j < n; j++) {
        const B = filteredBooks[j];

        // 카테고리
        const Ac = splitList(A.category);
        const Bc = splitList(B.category);
        const cat = intersectsValue(Ac, Bc);
        if (cat) push(A, B, "카테고리", cat);

        // 단계
        if (norm(A.level) && norm(A.level) === norm(B.level)) push(A, B, "단계", norm(A.level));

        // 저자
        if (norm(A.author) && norm(A.author) === norm(B.author)) push(A, B, "저자", norm(A.author));

        // 역자
        const aT = norm(A.translator ?? A["역자"]);
        const bT = norm(B.translator ?? B["역자"]);
        if (aT && aT === bT) push(A, B, "역자", aT);

        // 주제
        const As = splitList(A.subject);
        const Bs = splitList(B.subject);
        const sub = intersectsValue(As, Bs);
        if (sub) push(A, B, "주제", sub);

        // 장르
        const Ag = splitList(A.genre);
        const Bg = splitList(B.genre);
        const gen = intersectsValue(Ag, Bg);
        if (gen) push(A, B, "장르", gen);

        // 구분
        const aD = normalizeDivision(A.division);
        const bD = normalizeDivision(B.division);
        if (aD && aD === bD) push(A, B, "구분", aD);
      }
    }
    return arr;

    function intersectsValue(a, b) {
      if (!a.length || !b.length) return null;
      const set = new Set(a.map((x) => x.toLowerCase()));
      for (const x of b) {
        if (set.has(x.toLowerCase())) return x; // 공통값 하나 반환
      }
      return null;
    }
  }, [filteredBooks, tab, chip]);

  /* 카운트 */
  const nodeCount = nodes.length;
  const linkCount = links.length;

  /* 노드 색상: 탭에 따라 도트 색 바뀜(전체일 땐 회색) */
  const nodeColor = useMemo(
    () => (TYPES.includes(tab) ? TYPE_COLOR[tab] : "#6b7280"),
    [tab]
  );

  /* 캔버스 렌더러: 노드 */
  const drawNode = (node, ctx, scale) => {
    const r = 4.8;
    ctx.beginPath();
    ctx.fillStyle = nodeColor;
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fill();

    // 레이블
    const label = node.title || "";
    ctx.font = `${Math.max(10, 12 / Math.pow(scale, 0.15))}px ui-sans-serif,-apple-system,BlinkMacSystemFont`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#374151";
    ctx.fillText(label, node.x + 8, node.y + 6);
  };

  /* 포인터 히트영역(드래그/호버 안정성 ↑) */
  const nodePointerAreaPaint = (node, color, ctx) => {
    const r = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fill();
  };

  /* 링크(점선/두께 반영) */
  const drawLink = (link, ctx) => {
    const color = TYPE_COLOR[link.type] || "#9ca3af";
    const width = TYPE_WIDTH[link.type] || 1.5;
    const dash = TYPE_DASH[link.type] || [];

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash.length) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    ctx.restore();
  };

  /* 호버 → 컨테이너 상대 좌표로 툴팁 표시 */
  const handleHover = (node) => {
    if (!isClient || !node || !graphRef.current) {
      setHover({ node: null, x: 0, y: 0 });
      return;
    }
    const p = graphRef.current.graph2ScreenCoords(node.x, node.y);
    setHover({ node, x: p.x, y: p.y });
  };

  const handleClick = (node) => {
    if (node?.id) router.push(`/book/${node.id}`);
  };

  /* 데이터 바뀔 때마다 보기 좋게 zoom-to-fit */
  useEffect(() => {
    if (!graphRef.current || !width || !height) return;
    const t = setTimeout(() => {
      try {
        graphRef.current.zoomToFit(400, 40);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [width, height, nodeCount, linkCount, tab, chip]);

  /* 강제 리마운트 키 (시뮬/브러시 재초기화) */
  const graphKey = `${tab}|${chip ?? "ALL"}|${nodeCount}|${linkCount}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>
          <div className="text-xs text-gray-500">
            노드 {nodeCount}개 · 연결 {linkCount}개
          </div>
        </div>

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
          {/* 좌측 고정 패널(도서목록과 동일 크기) */}
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

          {/* 우측 그래프 */}
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
                  key={graphKey}
                  ref={graphRef}
                  width={width || undefined}
                  height={height || undefined}
                  graphData={{ nodes, links }}
                  // 인터랙션 확실히 켜기
                  enableZoomPanInteraction={true}
                  enableNodeDrag={true}
                  // 포인터/툴팁
                  onNodeHover={handleHover}
                  onNodeClick={handleClick}
                  nodeCanvasObject={drawNode}
                  nodePointerAreaPaint={nodePointerAreaPaint}
                  // 링크는 캔버스로 직접 그림(두께/점선 등)
                  linkColor={() => "rgba(0,0,0,0)"}
                  linkCanvasObject={drawLink}
                  linkCanvasObjectMode={() => "after"}
                  // d3 물리 시뮬레이션 설정 (부드럽게)
                  cooldownTime={1500}
                  d3VelocityDecay={0.3}
                  d3AlphaMin={0.001}
                  backgroundColor="rgba(255,255,255,0)"
                />
              )}

              {/* 미리보기 툴팁 */}
              {hover.node && (
                <div
                  className="pointer-events-none absolute z-20 w-56 rounded-lg bg-gray-900/90 p-2 text-white shadow-lg"
                  style={{
                    left: Math.max(8, Math.min((hover.x || 0) + 12, (width || 320) - 240)),
                    top: Math.max(8, Math.min((hover.y || 0) - 8, (height || 200) - 140)),
                  }}
                >
                  <div className="flex gap-2">
                    <div className="h-16 w-12 overflow-hidden rounded bg-gray-700 shrink-0">
                      {hover.node.image ? (
                        // Next/Image 대신 <img> (CORS/외부 도메인 이슈 회피)
                        <img
                          src={hover.node.image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{hover.node.title}</div>
                      {hover.node.author && (
                        <div className="mt-0.5 truncate text-xs opacity-90">{hover.node.author}</div>
                      )}
                      {hover.node.publisher && (
                        <div className="truncate text-[11px] opacity-70">{hover.node.publisher}</div>
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

/* ----------------------------------------------------------------
   범례
---------------------------------------------------------------- */
function LegendDots() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TYPES.map((t) => (
        <span key={t} className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />
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
