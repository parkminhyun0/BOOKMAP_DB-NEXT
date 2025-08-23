// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// SSR 차단된 2D 전용 그래프(모바일/데스크톱 동일)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// 색상 팔레트(라인=연결선, 점=노드)
const COLOR_LINE = {
  전체: "#9CA3AF",
  카테고리: "#8B5CF6",
  단계: "#F59E0B",
  저자: "#10B981",
  역자: "#06B6D4",
  주제: "#3B82F6",
  장르: "#EC4899",
  구분: "#A16207",
};
const COLOR_DOT = {
  전체: "#6B7280",
  카테고리: "#C4B5FD",
  단계: "#FCD34D",
  저자: "#6EE7B7",
  역자: "#67E8F9",
  주제: "#93C5FD",
  장르: "#F9A8D4",
  구분: "#FACC15",
};

const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

const norm = (v) => String(v ?? "").trim();
const splitList = (input) =>
  String(input ?? "")
    .replace(/[\/|·•]/g, ",")
    .replace(/[，、・／]/g, ",")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

function normalizeDivision(v) {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("번역")) return "번역서";
  if (s.includes("원서")) return "원서";
  if (s.includes("국외") || s.includes("해외")) return "국외서";
  if (s.includes("국내")) return "국내서";
  return s;
}

// 도서 → 그래프 노드
function toNodes(books) {
  return books.map((b) => ({
    id: String(b.id ?? Math.random()),
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    image: b.image || "",
    division: normalizeDivision(b.division),
    level: norm(b.level),
    categoryList: splitList(b.category),
    subjectList: splitList(b.subject),
    genreList: splitList(b.genre),
  }));
}

// 현재 탭 기준으로 “같은 값”을 공유하는 노드끼리 링크 생성
function buildLinks(nodes, facetType) {
  if (facetType === "전체") return [];

  // 각 키(공유값) → 해당 노드 id 목록
  const buckets = new Map();
  const push = (key, id) => {
    if (!key) return;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(id);
  };

  for (const n of nodes) {
    switch (facetType) {
      case "카테고리":
        n.categoryList.forEach((k) => push(`cat:${k}`, n.id));
        break;
      case "단계":
        push(`lvl:${n.level}`, n.id);
        break;
      case "저자":
        push(`auth:${norm(n.author)}`, n.id);
        break;
      case "역자":
        push(`tr:${norm(n.translator)}`, n.id); // translator 필드 안 쓰면 무시됨
        break;
      case "주제":
        n.subjectList.forEach((k) => push(`sub:${k}`, n.id));
        break;
      case "장르":
        n.genreList.forEach((k) => push(`gen:${k}`, n.id));
        break;
      case "구분":
        push(`div:${n.division}`, n.id);
        break;
    }
  }

  // 같은 버킷 안에서 fully connect 하면 너무 조밀해지므로
  // 간단히 “가까운 쌍”만 연결(체인)
  const links = [];
  for (const ids of buckets.values()) {
    const arr = Array.from(new Set(ids));
    for (let i = 1; i < arr.length; i++) {
      links.push({ source: arr[i - 1], target: arr[i] });
    }
  }
  return links;
}

// 화면 크기 훅
function useSize(ref) {
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function BookMap() {
  const [facet, setFacet] = useState("전체");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState(null); // {node, x, y}

  // 데이터 로드
  useEffect(() => {
    setErr("");
    setLoading(true);
    fetch("/api/books?source=both&prefer=remote")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((raw) => {
        const arr = (raw || []).map((b) => ({ ...b, id: String(b.id ?? Date.now()) }));
        setBooks(arr);
      })
      .catch((e) => setErr(String(e || "fail")))
      .finally(() => setLoading(false));
  }, []);

  const nodes = useMemo(() => toNodes(books), [books]);
  const links = useMemo(() => buildLinks(nodes, facet), [nodes, facet]);
  const data = useMemo(() => ({ nodes, links }), [nodes, links]);

  const containerRef = useRef(null);
  const fgRef = useRef();
  const { w, h } = useSize(containerRef);

  // 마우스 좌표 추적(툴팁 위치)
  const mouseRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("touchmove", (e) => {
      if (!e.touches?.[0]) return;
      const t = e.touches[0];
      onMove(t);
    });
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("touchmove", onMove);
    };
  }, []);

  // 노드 그리기(색상/라벨)
  const nodeColor = COLOR_DOT[facet] || COLOR_DOT["전체"];
  const linkColor = COLOR_LINE[facet] || COLOR_LINE["전체"];

  const nodeCanvasObject = (node, ctx, globalScale) => {
    const label = node.title || "";
    const fontSize = 12 / globalScale;
    const r = 5 / Math.sqrt(globalScale);

    // 점
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = nodeColor;
    ctx.fill();

    // 라벨
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(17,24,39,0.9)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, node.x + r + 2, node.y);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>

        {/* 탭(연결 기준 선택) */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFacet(t)}
              className={`rounded-full px-3 py-1.5 text-sm border transition ${
                facet === t
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 색상 안내 */}
        <div className="mb-4 text-sm text-gray-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-6 rounded" style={{ background: COLOR_LINE[facet] }} />
              연결선(기준: <b>{facet}</b>)
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full border border-gray-400"
                style={{ background: nodeColor }}
              />
              노드(도서)
            </span>
            <span className="text-gray-400">같은 기준 값을 공유하는 도서들이 선으로 연결됩니다. 노드를 클릭하면 상세로 이동합니다.</span>
          </div>
        </div>

        {/* 그래프/좌측 영역 2단 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          <aside className="hidden md:col-span-2 md:block">
            <div
              className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4"
              style={{ position: "sticky", top: 96, height: 640 }}
            >
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                좌측 영역(추후 컨텐츠)
              </div>
            </div>
          </aside>

          <section className="relative md:col-span-5">
            <div ref={containerRef} className="relative h-[70vh] w-full rounded-2xl border border-gray-200 bg-white">
              {!loading && (
                <ForceGraph2D
                  ref={fgRef}
                  width={w}
                  height={h}
                  graphData={data}
                  nodeCanvasObject={nodeCanvasObject}
                  linkColor={() => linkColor}
                  linkDirectionalParticles={0}
                  cooldownTicks={60}
                  onNodeHover={(n) => setHover(n ? { node: n, ...mouseRef.current } : null)}
                  onNodeClick={(n) => {
                    if (!n?.id) return;
                    window.location.href = `/book/${encodeURIComponent(n.id)}`;
                  }}
                />
              )}

              {/* 로딩/에러 */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  그래프 준비 중…
                </div>
              )}
              {err && !loading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">
                  데이터 로드 오류: {err}
                </div>
              )}

              {/* 호버 카드(마우스/터치) */}
              {hover?.node && (
                <div
                  className="pointer-events-none absolute z-10 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                  style={{ left: Math.min(Math.max(8, hover.x + 12), w - 280), top: Math.min(Math.max(8, hover.y + 12), h - 140) }}
                >
                  <div className="flex gap-3">
                    <div className="h-20 w-16 overflow-hidden rounded bg-gray-100">
                      {hover.node.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hover.node.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="line-clamp-2 text-sm font-semibold text-gray-900">{hover.node.title}</div>
                      <div className="mt-0.5 text-xs text-gray-600 line-clamp-1">{hover.node.author}</div>
                      <div className="text-[11px] text-gray-400 line-clamp-1">{hover.node.publisher}</div>
                      <Link
                        href={`/book/${encodeURIComponent(hover.node.id)}`}
                        className="pointer-events-auto mt-2 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        상세 보기
                      </Link>
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
