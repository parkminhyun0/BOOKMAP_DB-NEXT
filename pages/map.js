// pages/map.js
// -----------------------------------------------------------------------------
// ✅ 이 파일에서 자주 고칠 곳만 기억하세요
//  1) [🛠️ EDIT ME: 빠른 설정]           → 색, 점선, 굵기, 좌측 패널 높이 등
//  2) [🛠️ EDIT ME: 필터 탭/칩 표시값]   → 탭 순서/표시 타입 조정
//  3) [🛠️ EDIT ME: 툴팁 UI]            → 도서 미리보기(이미지/텍스트) 레이아웃
//  4) [🛠️ EDIT ME: 줌/물리 시뮬레이션] → 그래프 움직임/자동 맞춤 느낌
//  5) [🧩 고급] 새 속성 타입 추가 방법   → 아래 “새 타입 추가 가이드” 주석 참고
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router"; // ✅ FIX: prerender 시 useRouter 미정의 에러 해결

/* ─────────────────────────────────────────────────────────────
   react-force-graph-2d 를 CSR(브라우저에서만) 로드
   - Next.js의 SSR 단계에서 window 참조로 인한 에러를 방지합니다.
   - 로딩 동안 가운데 “그래프 초기화…” 텍스트가 보입니다.
────────────────────────────────────────────────────────────── */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
      그래프 초기화…
    </div>
  ),
});

/* ─────────────────────────────────────────────────────────────
   🛠️ EDIT ME: 빠른 설정 (여기만 건드려도 대부분 해결됩니다)
   - 색상, 선 스타일, 좌측 패널 높이, 자동 줌 등
────────────────────────────────────────────────────────────── */
const CONFIG = {
  // 좌측 고정(sticky) 패널 레이아웃
  STICKY_TOP: 96,     // 네비 높이에 맞춰 조정
  STICKY_HEIGHT: 640, // 좌측 박스 세로 높이(px)

  // 그래프 인터랙션/시뮬레이션(움직임 느낌)
  FORCE: {
    // 자동 맞춤(zoomToFit) 애니메이션 시간(ms)과 여백(px)
    autoFitMs: 600,
    autoFitPadding: 40,

    // d3 물리 파라미터(더 끈적/더 활발)
    cooldownTime: 1500,      // 물리 엔진이 식는 시간(ms)
    d3VelocityDecay: 0.3,    // 값↑ = 관성 빨리 사라짐
    d3AlphaMin: 0.001,       // 값↓ = 더 오래 움직임
  },

  /* ----------------------------------------------------------
     노드 타입과 색상
     - “book”은 도서 노드 고정 키, 나머지는 속성 타입(저자/역자/…)
     - 색을 바꾸려면 HEX만 변경하세요.
     - 타입 키는 아래 FILTER.TYPES 및 buildGraph()와 일치해야 합니다.
  ---------------------------------------------------------- */
  NODE_COLOR: {
    book: "#2563eb",     // 도서(파랑)
    저자: "#16a34a",     // 초록
    역자: "#0ea5e9",     // 하늘
    카테고리: "#f59e0b", // 주황
    주제: "#a855f7",     // 보라
    장르: "#1d4ed8",     // 진파랑
    단계: "#f97316",     // 오렌지
    구분: "#ef4444",     // 빨강
  },

  /* ----------------------------------------------------------
     연결선(링크) 스타일
     - 색상/두께/점선 패턴을 타입별로 설정합니다.
     - 점선: []=실선, [6,6]=긴 점선, [4,8]=듬성 점선 등.
  ---------------------------------------------------------- */
  LINK_STYLE: {
    color: {
      카테고리: "#a855f7",
      단계: "#f59e0b",
      저자: "#10b981",
      역자: "#06b6d4",
      주제: "#ef4444",
      장르: "#3b82f6",
      구분: "#ef4444",
    },
    width: {
      카테고리: 1.5,
      단계: 1.5,
      저자: 2.2,
      역자: 2.0,
      주제: 2.0,
      장르: 2.0,
      구분: 1.8,
    },
    dash: {
      카테고리: [],
      단계: [],
      저자: [],
      역자: [6, 6], // 역자=점선
      주제: [],
      장르: [],
      구분: [4, 8], // 구분=점선
    },
  },

  /* ----------------------------------------------------------
     🛠️ EDIT ME: 필터 탭/칩 표시 순서
     - 탭 순서/표시 타입을 바꾸려면 여기 배열을 수정하세요.
  ---------------------------------------------------------- */
  FILTER: {
    TYPES: ["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"],
  },
};

/* ─────────────────────────────────────────────────────────────
   유틸
────────────────────────────────────────────────────────────── */
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

// 그래프 컨테이너 실측(반응형 사이즈)
function useSize(ref) {
  const [sz, setSz] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSz({ width: Math.round(r.width), height: Math.round(r.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return sz;
}

/* ─────────────────────────────────────────────────────────────
   그래프 모델: 이분 그래프(Book ↔ Attribute)
   - 도서(파랑)와 속성 노드(저자/역자/카테고리/주제/장르/단계/구분)
   - 참고 레퍼런스 이미지와 동일한 구조
────────────────────────────────────────────────────────────── */
function buildGraph(books) {
  const nodes = [];
  const links = [];
  const byId = new Map();

  const addNode = (id, label, type, extra = {}) => {
    if (byId.has(id)) return byId.get(id);
    const node = { id, label, type, ...extra };
    byId.set(id, node);
    nodes.push(node);
    return node;
  };

  for (const b of books) {
    const bookId = `book:${b.id}`;
    addNode(bookId, b.title, "book", {
      bookId: b.id,
      image: b.image,
      author: b.author,
      publisher: b.publisher,
    });

    if (norm(b.author)) {
      const id = `저자:${norm(b.author)}`;
      addNode(id, norm(b.author), "저자");
      links.push({ source: bookId, target: id, type: "저자" });
    }

    const tr = norm(b.translator ?? b["역자"]);
    if (tr) {
      const id = `역자:${tr}`;
      addNode(id, tr, "역자");
      links.push({ source: bookId, target: id, type: "역자" });
    }

    for (const c of splitList(b.category)) {
      const id = `카테고리:${c}`;
      addNode(id, c, "카테고리");
      links.push({ source: bookId, target: id, type: "카테고리" });
    }

    for (const s of splitList(b.subject)) {
      const id = `주제:${s}`;
      addNode(id, s, "주제");
      links.push({ source: bookId, target: id, type: "주제" });
    }

    for (const g of splitList(b.genre)) {
      const id = `장르:${g}`;
      addNode(id, g, "장르");
      links.push({ source: bookId, target: id, type: "장르" });
    }

    if (norm(b.level)) {
      const id = `단계:${norm(b.level)}`;
      addNode(id, norm(b.level), "단계");
      links.push({ source: bookId, target: id, type: "단계" });
    }

    const div = normalizeDivision(b.division);
    if (div) {
      const id = `구분:${div}`;
      addNode(id, div, "구분");
      links.push({ source: bookId, target: id, type: "구분" });
    }
  }

  return { nodes, links };
}

/* facet 칩 목록(필터 칩용) */
function extractFacetList(books) {
  const sets = Object.fromEntries(CONFIG.FILTER.TYPES.map((t) => [t, new Set()]));
  for (const b of books) {
    splitList(b.category).forEach((v) => sets.카테고리?.add(v));
    splitList(b.subject).forEach((v) => sets.주제?.add(v));
    splitList(b.genre).forEach((v) => sets.장르?.add(v));
    if (norm(b.level)) sets.단계?.add(norm(b.level));
    const tr = norm(b.translator ?? b["역자"]);
    if (tr) sets.역자?.add(tr);
    if (norm(b.author)) sets.저자?.add(norm(b.author));
    const div = normalizeDivision(b.division);
    if (div) sets.구분?.add(div);
  }
  const sort = (s) => [...s].sort((a, b) => a.localeCompare(b, "ko"));
  return Object.fromEntries(
    Object.entries(sets).map(([k, v]) => [k, sort(v)])
  );
}

/* ─────────────────────────────────────────────────────────────
   컴포넌트
────────────────────────────────────────────────────────────── */
export default function BookMapPage() {
  const router = useRouter();

  // 데이터 로드
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 필터 상태(탭/칩)
  const [tab, setTab] = useState("전체"); // "전체" | 타입 중 하나
  const [chip, setChip] = useState(null); // 하위 값

  // 그래프 컨테이너/참조
  const wrapRef = useRef(null);
  const { width, height } = useSize(wrapRef);
  const graphRef = useRef(null);

  // 툴팁(노드 옆 카드)
  const [hover, setHover] = useState(null); // {node, x, y}

  // CSR 전용 렌더
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // 데이터 가져오기
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

  // 전체 그래프/칩
  const baseGraph = useMemo(() => buildGraph(books), [books]);
  const facetChips = useMemo(() => extractFacetList(books), [books]);

  // 필터 적용 그래프
  const { nodes, links } = useMemo(() => {
    if (tab === "전체") return baseGraph;

    if (!chip) {
      // 탭만 선택 → 해당 타입 간선만 표시(그 간선이 연결된 노드만 남김)
      const keepLinks = baseGraph.links.filter((l) => l.type === tab);
      const used = new Set();
      keepLinks.forEach((l) => {
        used.add(l.source);
        used.add(l.target);
      });
      const keepNodes = baseGraph.nodes.filter((n) => used.has(n.id));
      return { nodes: keepNodes, links: keepLinks };
    }

    // 칩까지 선택 → 특정 값 노드와 연결된 도서 + 타입 간선만 표시
    const attrId = `${tab}:${chip}`;
    const keepLinks = baseGraph.links.filter(
      (l) => l.type === tab && (l.source === attrId || l.target === attrId)
    );
    const used = new Set([attrId]);
    keepLinks.forEach((l) => {
      used.add(l.source);
      used.add(l.target);
    });
    const keepNodes = baseGraph.nodes.filter((n) => used.has(n.id));
    return { nodes: keepNodes, links: keepLinks };
  }, [baseGraph, tab, chip]);

  const nodeCount = nodes.length;
  const linkCount = links.length;

  /* ─────────────────────────────────────────────────────────
     캔버스 렌더러: 노드(도트 + 라벨)
     - 색 바꾸기: CONFIG.NODE_COLOR
     - 도서 반지름/속성 반지름: r 값만 수정
  ─────────────────────────────────────────────────────────── */
  const drawNode = (node, ctx, scale) => {
    const isBook = node.type === "book";
    const r = isBook ? 7 : 6;

    // 도트
    ctx.beginPath();
    ctx.fillStyle = CONFIG.NODE_COLOR[node.type] || "#6b7280";
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fill();

    // 라벨(제목/속성 텍스트)
    const label = node.label || "";
    ctx.font = `${Math.max(10, 12 / Math.pow(scale, 0.15))}px ui-sans-serif,-apple-system,BlinkMacSystemFont`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#374151";
    ctx.fillText(label, node.x + r + 6, node.y);
  };

  // 포인터 히트영역(드래그/호버 감지 확대)
  const nodePointerAreaPaint = (node, color, ctx) => {
    const r = node.type === "book" ? 11 : 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fill();
  };

  /* ─────────────────────────────────────────────────────────
     캔버스 렌더러: 링크(선)
     - 색/굵기/점선: CONFIG.LINK_STYLE 에서 수정
  ─────────────────────────────────────────────────────────── */
  const drawLink = (l, ctx) => {
    const c = CONFIG.LINK_STYLE.color[l.type] || "#9ca3af";
    const w = CONFIG.LINK_STYLE.width[l.type] || 1.5;
    const d = CONFIG.LINK_STYLE.dash[l.type] || [];

    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    if (d.length) ctx.setLineDash(d);
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
    ctx.restore();
  };

  /* ─────────────────────────────────────────────────────────
     호버/클릭 핸들러
  ─────────────────────────────────────────────────────────── */
  const handleHover = (node) => {
    if (!isClient || !node || !graphRef.current) return setHover(null);
    const p = graphRef.current.graph2ScreenCoords(node.x, node.y);
    setHover({ node, x: p.x, y: p.y });
  };

  const handleClick = (node) => {
    // 도서 노드만 상세로 이동
    if (node?.type === "book" && node.bookId) {
      // 도서 상세 라우팅
      router.push(`/book/${node.bookId}`);
    }
  };

  /* ─────────────────────────────────────────────────────────
     🛠️ EDIT ME: 줌/물리 시뮬레이션 자동 맞춤
     - 데이터/필터 변경 시 보기 좋게 zoomToFit
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!graphRef.current || !width || !height) return;
    const t = setTimeout(() => {
      try {
        graphRef.current.zoomToFit(CONFIG.FORCE.autoFitMs, CONFIG.FORCE.autoFitPadding);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [width, height, nodeCount, linkCount, tab, chip]);

  // 강제 리마운트 키(그래프 상태 초기화)
  const graphKey = `${tab}|${chip ?? "ALL"}|${nodeCount}|${linkCount}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* 상단 타이틀 + 카운터 */}
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>
          <div className="text-xs text-gray-500">노드 {nodeCount}개 · 연결 {linkCount}개</div>
        </div>

        {/* 탭 */}
        <div className="mb-2 flex flex-wrap gap-2">
          {["전체", ...CONFIG.FILTER.TYPES].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setChip(null); }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                tab === t ? "bg-gray-900 text-white border-gray-900"
                          : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 칩(하위 값) */}
        {CONFIG.FILTER.TYPES.includes(tab) && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => setChip(null)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                chip == null ? "bg-blue-600 text-white border-blue-600"
                             : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              전체
            </button>
            {(facetChips[tab] || []).map((v) => (
              <button
                key={v}
                onClick={() => setChip(v === chip ? null : v)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  chip === v ? "bg-blue-600 text-white border-blue-600"
                             : "text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                title={v}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* 간단 범례(원형 점 = 노드 색 가이드) */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-5">
            {[
              ["도서", "book"], ["저자", "저자"], ["역자", "역자"], ["카테고리", "카테고리"],
              ["주제", "주제"], ["장르", "장르"], ["단계", "단계"], ["구분", "구분"],
            ].map(([label, key]) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CONFIG.NODE_COLOR[key] }} />
                <span className="text-gray-700">{label}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            도서(파란 점)와 속성 노드가 선으로 연결됩니다. 노드를 드래그/줌할 수 있으며,
            도서를 클릭하면 상세 페이지로 이동합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측: 공용 컴포넌트 재사용(공지/NEW BOOK 슬라이드/이벤트) */}
		<aside className="hidden md:col-span-2 md:block">
  			<LeftPanel
   			 books={books}
  			  stickyTop={STICKY_TOP}
  			  stickyHeight={STICKY_HEIGHT}
  			  slideAutoMs={2000}
  			  itemsPerPage={2}
  			  maxPages={5}
  			/>
		</aside>


          {/* 그래프 영역 */}
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
                  enableZoomPanInteraction
                  enableNodeDrag
                  nodeLabel={() => ""}                  // 기본 title 툴팁 끄기
                  nodeCanvasObject={drawNode}            // 도트+라벨 커스텀 렌더
                  nodePointerAreaPaint={nodePointerAreaPaint}
                  linkColor={() => "rgba(0,0,0,0)"}       // 기본 링크 숨김
                  linkCanvasObject={drawLink}             // 링크 커스텀 렌더
                  linkCanvasObjectMode={() => "after"}
                  // 🛠️ EDIT ME: 아래 FORCE 값으로 움직임 느낌 조절
                  cooldownTime={CONFIG.FORCE.cooldownTime}
                  d3VelocityDecay={CONFIG.FORCE.d3VelocityDecay}
                  d3AlphaMin={CONFIG.FORCE.d3AlphaMin}
                  backgroundColor="rgba(255,255,255,0)"
                  onNodeHover={handleHover}
                  onNodeClick={handleClick}
                />
              )}

              {/* 🛠️ EDIT ME: 툴팁 UI (도서 노드에만 표시) */}
              {hover?.node && hover.node.type === "book" && (
                <div
                  className="pointer-events-none absolute z-20 w-56 rounded-xl bg-gray-900/90 p-2 text-white shadow-xl"
                  style={{
                    // 화면 밖으로 못 나가게 좌표 클램프
                    left: Math.max(8, Math.min((hover.x || 0) + 12, (width || 320) - 240)),
                    top: Math.max(8, Math.min((hover.y || 0) - 8, (height || 200) - 140)),
                  }}
                >
                  <div className="flex gap-2">
                    <div className="h-20 w-14 overflow-hidden rounded bg-gray-700 shrink-0">
                      {hover.node.image ? (
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
                      <div className="truncate font-semibold">{hover.node.label}</div>
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

/* ─────────────────────────────────────────────────────────────
   [🧩 고급] 새 타입 추가 가이드
   예: “시리즈” 타입을 추가하려면…
   1) CONFIG.NODE_COLOR 에 '시리즈' 색 추가
   2) CONFIG.LINK_STYLE.color/width/dash 에 '시리즈' 키 추가
   3) CONFIG.FILTER.TYPES 배열에 '시리즈' 추가(필터 탭에 보이게)
   4) buildGraph()에서 도서의 series 값을 읽어
      for (const s of splitList(b.series)) {
        const id = `시리즈:${s}`;
        addNode(id, s, "시리즈");
        links.push({ source: bookId, target: id, type: "시리즈" });
      }
   5) extractFacetList()에서도 sets.시리즈.add(...) 추가
   끝! 나머지는 그대로 동작합니다.
────────────────────────────────────────────────────────────── */
