// pages/map.js
// -----------------------------------------------------------------------------
// ✅ 이 파일에서 자주 고칠 곳만 기억하세요 (검색: [🛠️ EDIT ME])
//  1) [빠른 설정]         → 색, 점선, 굵기, sticky 위치, 그래프 높이/물리감
//  2) [필터 탭/칩 표시값] → 탭 순서/표시 타입
//  3) [툴팁 UI]           → 도서 미리보기 카드 레이아웃
//  4) [줌/물리 시뮬레이션] → 그래프 움직임/자동 맞춤 느낌(Force 튜닝)
//  5) [고급] 새 속성 타입 → 맨 아래 “새 타입 추가 가이드”
// -----------------------------------------------------------------------------

/* eslint-disable @next/next/no-img-element */ // <img> 경고 숨기기(원하면 제거)

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import LeftPanel from "@/components/LeftPanel"; // 좌측 패널(공지/NEW BOOK/이벤트)

// -----------------------------------------------------------------------------
// react-force-graph-2d 를 CSR(브라우저에서만) 로드
// - Next.js SSR 단계(window 없음)에서 에러 방지: ssr:false
// -----------------------------------------------------------------------------
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
      그래프 초기화…
    </div>
  ),
});

// -----------------------------------------------------------------------------
// [🛠️ EDIT ME] 빠른 설정
// -----------------------------------------------------------------------------
const CONFIG = {
  // 좌측 패널 sticky 기준(상단 네비 높이에 맞춰 조절)
  STICKY_TOP: 96,

  // 그래프 인터랙션/시뮬레이션(움직임 느낌)
  FORCE: {
    // 자동 맞춤(zoomToFit) 애니메이션 시간/여백
    autoFitMs: 600,
    autoFitPadding: 40,

    // d3 물리 (전체 거동)
    cooldownTime: 1500,    // 값↑ 오래 움직임, 값↓ 빨리 멈춤
    d3VelocityDecay: 0.35, // 값↑ 감속 큼(차분), 값↓ 관성 큼
    d3AlphaMin: 0.001,

    // 링크/반발 세부 튜닝 (useEffect에서 주입)
    linkDistance: 52,      // 값↑ 노드 간격 넓어짐
    chargeStrength: -240,  // 음수(반발) 절댓값↑ 더 밀어냄
  },

  // 노드 타입별 색상 — “book”은 도서 노드 전용 키(고정)
  NODE_COLOR: {
    book: "#2563eb",
    저자: "#16a34a",
    역자: "#0ea5e9",
    카테고리: "#f59e0b",
    주제: "#a855f7",
    장르: "#1d4ed8",
    단계: "#f97316",
    구분: "#ef4444",
  },

  // 링크(연결선) 스타일 — 타입별 색/두께/점선
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
      역자: [6, 6],  // 역자 = 점선
      주제: [],
      장르: [],
      구분: [4, 8],  // 구분 = 듬성 점선
    },
  },

  // [🛠️ EDIT ME] 필터 탭 노출 순서
  FILTER: { TYPES: ["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"] },
};

// -----------------------------------------------------------------------------
// 유틸 함수/훅(문자 정리 / 배열 스플릿 / 컨테이너 실측 등)
// -----------------------------------------------------------------------------
const norm = (v) => String(v ?? "").trim();
const isNum = (v) => Number.isFinite(v);

function splitList(input) {
  if (!input) return [];
  let s = String(input);
  // 다양한 구분자를 쉼표로 통일
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function normalizeDivision(v) {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("번역")) return "번역서";
  if (s.includes("원서")) return "원서";
  if (s.includes("국외") || s.includes("해외")) return "국외서";
  if (s.includes("국내")) return "국내서";
  return s;
}

// 반응형: 컨테이너 실제 렌더 크기 측정
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

// 링크의 양 끝을 "문자열 id"로 반환(객체/문자열 모두 대응)
function getLinkEnds(link) {
  const s = typeof link.source === "object" && link.source ? link.source.id : link.source;
  const t = typeof link.target === "object" && link.target ? link.target.id : link.target;
  return [String(s), String(t)];
}

// -----------------------------------------------------------------------------
// 그래프 데이터 모델: 이분 그래프(Book ↔ 속성 노드)
// -----------------------------------------------------------------------------
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

// facet 칩 데이터(필터 칩 용)
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
  return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, sort(v)]));
}

// -----------------------------------------------------------------------------
// 페이지 컴포넌트
// -----------------------------------------------------------------------------
export default function BookMapPage() {
  const router = useRouter();

  // 데이터 상태
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 필터 상태(탭/칩)
  const [tab, setTab] = useState("전체"); // "전체" 또는 CONFIG.FILTER.TYPES 중 하나
  const [chip, setChip] = useState(null); // 해당 탭의 구체 값

  // 그래프 컨테이너/참조
  const wrapRef = useRef(null);
  const { width, height } = useSize(wrapRef);
  const graphRef = useRef(null);

  // 툴팁(도서 노드 hover)
  const [hover, setHover] = useState(null); // {node, x, y}

  // CSR 전용 렌더 플래그
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
          id: b?.id != null ? String(b.id) : null, // id를 문자열로 통일
        }));
        setBooks(normalized);
      })
      .catch((e) => setErr(e.message || "데이터 로드 실패"))
      .finally(() => setLoading(false));
  }, []);

  // 전체 그래프/칩
  const baseGraph = useMemo(() => buildGraph(books), [books]);
  const facetChips = useMemo(() => extractFacetList(books), [books]);

  // ---------------------------------------------------------------------------
  // 필터 적용 그래프
  // ---------------------------------------------------------------------------
  const { nodes, links } = useMemo(() => {
    // 전체 보기: 링크를 먼저 "문자열 id"로 정규화
    if (tab === "전체") {
      const normalized = baseGraph.links.map((l) => {
        const [s, t] = getLinkEnds(l);
        return { ...l, source: s, target: t };
      });
      return { nodes: baseGraph.nodes, links: normalized };
    }

    // 탭만 선택된 경우: 해당 타입 링크만 유지
    if (!chip) {
      const keepLinks = baseGraph.links.filter((l) => l.type === tab);
      const used = new Set();
      keepLinks.forEach((l) => {
        const [s, t] = getLinkEnds(l);
        used.add(s);
        used.add(t);
      });
      const keepNodes = baseGraph.nodes.filter((n) => used.has(n.id));
      const normalized = keepLinks.map((l) => {
        const [s, t] = getLinkEnds(l);
        return { ...l, source: s, target: t };
      });
      return { nodes: keepNodes, links: normalized };
    }

    // 칩까지 선택된 경우: attrId와 연결된 링크/노드만
    const attrId = `${tab}:${chip}`;
    const keepLinks = baseGraph.links.filter((l) => {
      if (l.type !== tab) return false;
      const [s, t] = getLinkEnds(l);
      return s === attrId || t === attrId;
    });
    const used = new Set([attrId]);
    keepLinks.forEach((l) => {
      const [s, t] = getLinkEnds(l);
      used.add(s);
      used.add(t);
    });
    const keepNodes = baseGraph.nodes.filter((n) => used.has(n.id));
    const normalized = keepLinks.map((l) => {
      const [s, t] = getLinkEnds(l);
      return { ...l, source: s, target: t };
    });
    return { nodes: keepNodes, links: normalized };
  }, [baseGraph, tab, chip]);

  const nodeCount = nodes.length;
  const linkCount = links.length;

  // ---------------------------------------------------------------------------
  // 캔버스 렌더러: 노드(도트 + 라벨)
  //  - 색 바꾸기 → CONFIG.NODE_COLOR
  //  - 반지름 → r
  //  - 좌표가 준비되지 않았다면(초기화 시점) 그리기 생략 → 런타임 에러 방지
  // ---------------------------------------------------------------------------
  const drawNode = (node, ctx, scale) => {
    if (!isNum(node.x) || !isNum(node.y)) return; // 좌표 방어

    const isBook = node.type === "book";
    const r = isBook ? 7 : 6;

    // 도트
    ctx.beginPath();
    ctx.fillStyle = CONFIG.NODE_COLOR[node.type] || "#6b7280";
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fill();

    // 라벨
    const label = node.label || "";
    ctx.font = `${Math.max(10, 12 / Math.pow(scale, 0.15))}px ui-sans-serif,-apple-system,BlinkMacSystemFont`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#374151";
    ctx.fillText(label, node.x + r + 6, node.y);
  };

  // 드래그/호버 감지 범위(조금 넓게)
  const nodePointerAreaPaint = (node, color, ctx) => {
    if (!isNum(node.x) || !isNum(node.y)) return;
    const r = node.type === "book" ? 11 : 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fill();
  };

  // ---------------------------------------------------------------------------
  // 캔버스 렌더러: 링크(선)
  //  - 색/굵기/점선 바꾸기 → CONFIG.LINK_STYLE
  //  - 끝점 좌표가 안전할 때만 그림
  // ---------------------------------------------------------------------------
  const drawLink = (l, ctx) => {
    if (!l.source || !l.target || l.source.x == null || l.target.x == null) return;

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

  // ---------------------------------------------------------------------------
  // 호버/클릭 핸들러
  // ---------------------------------------------------------------------------
  const handleHover = (node) => {
    if (!isClient || !node || !graphRef.current || !isNum(node.x) || !isNum(node.y)) {
      setHover(null);
      return;
    }
    const g = graphRef.current;
    if (typeof g.graph2ScreenCoords !== "function") {
      setHover(null);
      return;
    }
    const p = g.graph2ScreenCoords(node.x, node.y);
    setHover({ node, x: p.x, y: p.y });
  };

  const handleClick = (node) => {
    // 도서 노드만 상세페이지로 이동
    if (node?.type === "book" && node.bookId) router.push(`/book/${node.bookId}`);
  };

  // ---------------------------------------------------------------------------
  // [🛠️ EDIT ME] 줌/자동 맞춤
  //  - 데이터/필터 바뀔 때 보기 좋게 화면에 맞춤
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!graphRef.current || !width || !height) return;
    const t = setTimeout(() => {
      try {
        graphRef.current.zoomToFit(CONFIG.FORCE.autoFitMs, CONFIG.FORCE.autoFitPadding);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [width, height, nodeCount, linkCount, tab, chip]);

  // ---------------------------------------------------------------------------
  // [🛠️ EDIT ME] 물리 파라미터 주입(d3Force)
  //  - 링크 길이/강도, 반발력 등을 안전하게 주입
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!graphRef.current) return;
    const g = graphRef.current;
    try {
      const lf = g.d3Force && g.d3Force("link");
      if (lf && typeof lf.distance === "function") {
        lf.distance(CONFIG.FORCE.linkDistance).strength(0.9);
      }
      const ch = g.d3Force && g.d3Force("charge");
      if (ch && typeof ch.strength === "function") {
        ch.strength(CONFIG.FORCE.chargeStrength);
      }
    } catch {
      // d3Force 준비 전 호출될 경우 대비
    }
  }, [nodeCount, linkCount]);

  // 강제 리마운트 키(그래프 내부 상태 초기화용)
  const graphKey = `${tab}|${chip ?? "ALL"}|${nodeCount}|${linkCount}`;

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------
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

        {/* 범례(노드 색 가이드) */}
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
          {/* 좌측 패널(공지/NEW BOOK/이벤트) → 내부에서 높이 자동 조절 */}
          <aside className="hidden md:col-span-2 md:block">
            <LeftPanel books={books} stickyTop={CONFIG.STICKY_TOP} />
          </aside>

          {/* 그래프 영역 */}
          <section className="md:col-span-5">
            <div
              ref={wrapRef}
              className="relative rounded-2xl border border-gray-200 bg-white"
              // [🛠️ EDIT ME] 고정 높이 대신 뷰포트 기반 자동 높이
              style={{ minHeight: 520, height: "clamp(520px, calc(100vh - 220px), 900px)", overflow: "hidden" }}
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
                  nodeLabel={() => ""}                  // 브라우저 기본 title 툴팁 끄기
                  nodeCanvasObject={drawNode}            // 도트+라벨 커스텀 렌더
                  nodePointerAreaPaint={nodePointerAreaPaint}
                  linkColor={() => "rgba(0,0,0,0)"}       // 기본 링크 숨김
                  linkCanvasObject={drawLink}             // 링크 커스텀 렌더
                  linkCanvasObjectMode={() => "after"}
                  // 움직임 느낌
                  cooldownTime={CONFIG.FORCE.cooldownTime}
                  d3VelocityDecay={CONFIG.FORCE.d3VelocityDecay}
                  d3AlphaMin={CONFIG.FORCE.d3AlphaMin}
                  backgroundColor="#ffffff"              // 배경 흰색(검은 바 방지)
                  onNodeHover={handleHover}
                  onNodeClick={handleClick}
                  // 엔진 안정화 뒤 한 번 더 화면 맞춤 → 초기 타이밍 이슈 방지
                  onEngineStop={() => {
                    try {
                      graphRef.current?.zoomToFit?.(CONFIG.FORCE.autoFitMs, CONFIG.FORCE.autoFitPadding);
                    } catch {}
                  }}
                />
              )}

              {/* [🛠️ EDIT ME] 툴팁 UI (도서 노드에만 표시) */}
              {hover?.node && hover.node.type === "book" && (
                <div
                  className="pointer-events-none absolute z-20 w-56 rounded-xl bg-gray-900/90 p-2 text-white shadow-xl"
                  style={{
                    // 화면 밖으로 못 나가게 위치 클램프
                    left: Math.max(8, Math.min((hover.x || 0) + 12, (width || 320) - 240)),
                    top: Math.max(8, Math.min((hover.y || 0) - 8, (height || 200) - 140)),
                  }}
                >
                  <div className="flex gap-2">
                    <div className="h-20 w-14 overflow-hidden rounded bg-gray-700 shrink-0">
                      {hover.node.image ? (
                        <img src={hover.node.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full bg-gray-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{hover.node.label}</div>
                      {hover.node.author && <div className="mt-0.5 truncate text-xs opacity-90">{hover.node.author}</div>}
                      {hover.node.publisher && <div className="truncate text-[11px] opacity-70">{hover.node.publisher}</div>}
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

/* -----------------------------------------------------------------------------
   [🧩 고급] 새 타입 추가 가이드 (예: “시리즈”)
   1) CONFIG.NODE_COLOR     에 '시리즈' 색 추가
   2) CONFIG.LINK_STYLE.*   에 '시리즈' 키 추가(color/width/dash)
   3) CONFIG.FILTER.TYPES   배열에 '시리즈' 추가(탭 노출)
   4) buildGraph() 안에서 도서의 series 값을 읽어 다음 로직 추가:
        for (const s of splitList(b.series)) {
          const id = `시리즈:${s}`;
          addNode(id, s, "시리즈");
          links.push({ source: bookId, target: id, type: "시리즈" });
        }
   5) extractFacetList() 에서도 sets.시리즈.add(...) 추가
   끝! 나머지는 자동으로 연동됩니다.
----------------------------------------------------------------------------- */
