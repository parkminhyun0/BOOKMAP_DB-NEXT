// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useRouter } from "next/router";

/* ── UI 상수 (도서목록과 맞춤) ───────────────────────────────────────── */
const STICKY_TOP = 96;
const STICKY_HEIGHT = 640;

/* 관계 타입별 색/스타일 */
const EDGE_STYLES = {
  카테고리: { color: "#7c3aed", lineDash: null },  // 보라 실선
  단계:     { color: "#fb923c", lineDash: null },  // 오렌지 실선
  저자:     { color: "#10b981", lineDash: null },  // 초록 실선
  역자:     { color: "#94a3b8", lineDash: [4, 4] },// 회색 점선
  주제:     { color: "#ef4444", lineDash: null },  // 빨강 실선
  장르:     { color: "#3b82f6", lineDash: null },  // 파랑 실선
  구분:     { color: "#9ca3af", lineDash: [2, 6] } // 연회색 점선
};

/* 노드 컬러: 탭/기준에 따라 점 색을 바꿔 표시 */
const DOT_COLORS_BY_TAB = {
  카테고리: "#7c3aed",
  단계: "#fb923c",
  저자: "#10b981",
  역자: "#94a3b8",
  주제: "#ef4444",
  장르: "#3b82f6",
  구분: "#9ca3af",
  전체: "#6b7280",
};

const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

/* 문자열 유틸 */
const norm = (v) => String(v ?? "").trim();

/* 목록형 필드만 쉼표/슬래시 등 구분자로 나눔 */
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/* “그대로 1개 문자열”로 취급할 필드(저자/역자 등) */
const wholeField = (input) => {
  const s = norm(input);
  return s ? [s] : [];
};

/* 도서 → 그래프 노드 */
function toNode(book, idx) {
  return {
    id: String(book.id ?? idx),
    label: norm(book.title) || "(제목 없음)",
    image: norm(book.image),
    raw: book,
  };
}

/* facet 값 수집 (칩 목록 생성용) */
function extractFacets(books) {
  const sets = {
    카테고리: new Set(),
    단계: new Set(),
    저자: new Set(),
    역자: new Set(),
    주제: new Set(),
    장르: new Set(),
    구분: new Set(),
  };
  for (const b of books) {
    splitList(b.category).forEach((t) => sets.카테고리.add(t));
    wholeField(b.level).forEach((t) => sets.단계.add(t));
    wholeField(b.author).forEach((t) => sets.저자.add(t));
    wholeField(b.translator ?? b["역자"]).forEach((t) => sets.역자.add(t));
    splitList(b.subject).forEach((t) => sets.주제.add(t));
    splitList(b.genre).forEach((t) => sets.장르.add(t));
    wholeField(b.division).forEach((t) => sets.구분.add(t));
  }
  const toSorted = (s) => [...s].sort((a, b) => a.localeCompare(b, "ko"));
  return Object.fromEntries(
    Object.entries(sets).map(([k, set]) => [k, toSorted(set)])
  );
}

/* 두 도서가 특정 기준으로 연결되는지 판별 */
function sharesValueByTab(tab, a, b) {
  switch (tab) {
    case "카테고리": {
      const A = new Set(splitList(a.category));
      return splitList(b.category).some((x) => A.has(x));
    }
    case "단계": return norm(a.level) && norm(a.level) === norm(b.level);
    case "저자": return norm(a.author) && norm(a.author) === norm(b.author);
    case "역자": {
      const va = norm(a.translator ?? a["역자"]);
      const vb = norm(b.translator ?? b["역자"]);
      return va && va === vb;
    }
    case "주제": {
      const A = new Set(splitList(a.subject));
      return splitList(b.subject).some((x) => A.has(x));
    }
    case "장르": {
      const A = new Set(splitList(a.genre));
      return splitList(b.genre).some((x) => A.has(x));
    }
    case "구분": {
      const va = norm(a.division);
      const vb = norm(b.division);
      return va && va === vb;
    }
    default:
      return false;
  }
}

/* 특정 탭에서 선택된 값(칩)과 일치하는지 */
function matchesSelectedValues(tab, selectedValues, book) {
  if (!selectedValues?.length) return true; // 아무것도 선택 안했으면 전체 허용
  const lowerSet = new Set(selectedValues.map((v) => v.toLowerCase()));

  const pick = (vals) => vals.some((v) => lowerSet.has(norm(v).toLowerCase()));

  switch (tab) {
    case "카테고리":
      return pick(splitList(book.category));
    case "단계":
      return pick(wholeField(book.level));
    case "저자":
      return pick(wholeField(book.author));
    case "역자":
      return pick(wholeField(book.translator ?? book["역자"]));
    case "주제":
      return pick(splitList(book.subject));
    case "장르":
      return pick(splitList(book.genre));
    case "구분":
      return pick(wholeField(book.division));
    default:
      return true;
  }
}

export default function BookMap() {
  const router = useRouter();
  const graphRef = useRef(null);
  const wrapRef = useRef(null); // 그래프 래퍼(툴팁 좌표 기준 컨테이너)
  const [books, setBooks] = useState([]);
  const [tab, setTab] = useState("전체");
  const [selectedValues, setSelectedValues] = useState([]); // 칩 토글 상태
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    setLoading(true);
    fetch("/api/books?source=both&prefer=remote")
      .then((r) => r.json())
      .then((arr) => {
        setBooks((arr || []).map((b, i) => ({ ...b, id: String(b.id ?? i) })));
      })
      .finally(() => setLoading(false));
  }, []);

  const facets = useMemo(() => extractFacets(books), [books]);

  // 노드 / 링크 구성
  const { nodes, links } = useMemo(() => {
    const nodes = books.map(toNode);

    // 현재 탭이 "전체"이면: 모든 기준으로 링크를 생성
    const linkList = [];
    const activeTabs = tab === "전체" ? TABS.filter((t) => t !== "전체") : [tab];

    for (let i = 0; i < books.length; i++) {
      for (let j = i + 1; j < books.length; j++) {
        const A = books[i];
        const B = books[j];

        // 선택 칩을 적용한 필터(탭이 전체일 때는 선택 칩 무시)
        const passesA = tab === "전체" ? true : matchesSelectedValues(tab, selectedValues, A);
        const passesB = tab === "전체" ? true : matchesSelectedValues(tab, selectedValues, B);
        if (!passesA || !passesB) continue;

        activeTabs.forEach((t) => {
          if (sharesValueByTab(t, A, B)) {
            const style = EDGE_STYLES[t] || { color: "#aaa", lineDash: null };
            linkList.push({
              source: String(A.id),
              target: String(B.id),
              type: t,
              color: style.color,
              lineDash: style.lineDash,
            });
          }
        });
      }
    }
    return { nodes, links: linkList };
  }, [books, tab, selectedValues]);

  // 칩 후보 목록
  const chipValues = useMemo(() => (tab === "전체" ? [] : facets[tab] || []), [facets, tab]);

  // 툴팁 좌표 및 내용 갱신
  const handleHover = (node) => {
    if (!node || !graphRef.current || !wrapRef.current) {
      setHover({ node: null, x: 0, y: 0 });
      return;
    }
    const { x, y } = graphRef.current.graph2ScreenCoords(node.x, node.y);
    setHover({ node, x, y });
  };

  // 캔버스 드로잉(선 스타일)
  const linkCanvasObjectMode = () => "after";
  const linkCanvasObject = (link, ctx) => {
    if (!link) return;
    ctx.save();
    ctx.strokeStyle = link.color || "#aaa";
    if (link.lineDash) ctx.setLineDash(link.lineDash);
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    ctx.restore();
  };

  // 노드 색상
  const nodeColor = (n) => (tab === "전체"
    ? DOT_COLORS_BY_TAB["전체"]
    : DOT_COLORS_BY_TAB[tab] || "#6b7280");

  // 노드 클릭 → 상세 페이지로
  const onNodeClick = (n) => {
    const id = n?.id ?? n?.raw?.id;
    if (id) router.push(`/book/${id}`);
  };

  // 칩 토글
  const toggleChip = (val) => {
    setSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  // 탭 변경 시 선택 칩 초기화
  useEffect(() => {
    setSelectedValues([]);
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>

        {/* 탭 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
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

        {/* 하위 값 칩(도서목록과 동일 UX) */}
        {tab !== "전체" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedValues([])}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selectedValues.length === 0
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              전체
            </button>
            {chipValues.map((val) => (
              <button
                key={val}
                onClick={() => toggleChip(val)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  selectedValues.includes(val)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        )}

        {/* 범례 */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-semibold">노드(도트) 색상 안내:</span>
            {["카테고리", "단계", "저자", "역자", "주제", "장르", "구분"].map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: DOT_COLORS_BY_TAB[k] }}
                />
                {k}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-semibold">연결선 색/스타일 안내:</span>
            {Object.entries(EDGE_STYLES).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-2">
                <svg width="36" height="8">
                  <line
                    x1="0"
                    y1="4"
                    x2="36"
                    y2="4"
                    stroke={v.color}
                    strokeWidth="2"
                    strokeDasharray={v.lineDash ? v.lineDash.join(",") : "0"}
                  />
                </svg>
                {k}
              </span>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            같은 기준 값을 공유하는 도서들이 선으로 연결됩니다. 노드를 클릭하면 도서 상세로 이동합니다.
          </div>
        </div>

        {/* 레이아웃: 좌 2 + 우 5 (도서목록과 동일 크기/역할) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측 고정 박스 */}
          <aside className="hidden md:col-span-2 md:block">
            <div
              className="rounded-2xl border border-dashed border-gray-300 bg-white p-4"
              style={{ position: "sticky", top: STICKY_TOP, height: STICKY_HEIGHT }}
            >
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                좌측 영역(추후 컨텐츠)
              </div>
            </div>
          </aside>

          {/* 그래프 영역 */}
          <section className="md:col-span-5">
            <div
              ref={wrapRef}
              className="relative rounded-2xl border border-gray-200 bg-white"
              style={{ height: STICKY_HEIGHT, overflow: "hidden" }}
            >
              {!loading && (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={{ nodes, links }}
                  nodeLabel="label"
                  nodeAutoColorBy={null}
                  nodeColor={nodeColor}
                  nodeRelSize={6}
                  linkDirectionalParticles={0}
                  onNodeHover={handleHover}
                  onNodeClick={onNodeClick}
                  linkCanvasObjectMode={linkCanvasObjectMode}
                  linkCanvasObject={linkCanvasObject}
                  width={undefined}
                  height={undefined}
                />
              )}

              {/* 커스텀 툴팁: 그래프 래퍼 내부에 absolute로 고정 */}
              {hover.node && (
                <div
                  className="pointer-events-none absolute z-20 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                  style={{
                    left: Math.max(8, Math.min(hover.x + 12, (wrapRef.current?.clientWidth || 0) - 240)),
                    top: Math.max(8, Math.min(hover.y + 12, (wrapRef.current?.clientHeight || 0) - 120)),
                  }}
                >
                  <div className="mb-2 flex gap-3">
                    <div className="h-14 w-10 overflow-hidden rounded bg-gray-100">
                      {hover.node.image ? (
                        <img
                          src={hover.node.image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="line-clamp-2 text-sm font-semibold text-gray-900">
                        {hover.node.label}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {norm(hover.node.raw?.author)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    클릭하면 도서 상세로 이동
                  </div>
                </div>
              )}

              {/* 로딩 오버레이(짧게 표시) */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg bg-white/70 px-4 py-2 text-sm text-gray-600 shadow">
                    그래프 불러오는 중…
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
