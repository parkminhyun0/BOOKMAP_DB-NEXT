// pages/map.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const FACETS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];

const COLORS = {
  카테고리: { node: "#C084FC", link: "#A855F7", dash: [] },     // purple
  단계:     { node: "#FCD34D", link: "#F59E0B", dash: [] },     // amber
  저자:     { node: "#34D399", link: "#10B981", dash: [] },     // emerald
  역자:     { node: "#5EEAD4", link: "#14B8A6", dash: [6, 6] }, // teal dashed
  주제:     { node: "#FCA5A5", link: "#EF4444", dash: [] },     // red
  장르:     { node: "#93C5FD", link: "#3B82F6", dash: [] },     // blue
  구분:     { node: "#D1D5DB", link: "#9CA3AF", dash: [4, 6] }, // gray dashed
  default:  { node: "#CBD5E1", link: "#94A3B8", dash: [] },     // slate
};

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

export default function BookMap() {
  const [facet, setFacet] = useState("전체");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 560 });

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = wrapRef.current;
      if (el) setSize({ w: el.clientWidth, h: Math.max(420, el.clientWidth * 0.55) });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch("/api/books?source=both&prefer=remote")
      .then((r) => r.json())
      .then((raw) => {
        const normalized = (raw || []).map((b) => ({
          ...b,
          id: b?.id != null ? String(b.id) : null,
        }));
        setBooks(sortBooks(normalized));
      })
      .finally(() => setLoading(false));
  }, []);

  const graph = useMemo(() => buildGraph(books, facet), [books, facet]);

  const currentColors = COLORS[facet] || COLORS.default;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-blue-600">BOOK MAP GRAPHIC VIEW</h1>
        </header>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FACETS.map((t) => (
            <button
              key={t}
              onClick={() => setFacet(t)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                facet === t
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Legend />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          <aside className="hidden md:col-span-2 md:block">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4">
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                좌측 영역(추후 컨텐츠)
              </div>
            </div>
          </aside>

          <section className="md:col-span-5">
            <div ref={wrapRef} className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              {!loading && graph.nodes.length === 0 ? (
                <div className="flex h-[420px] items-center justify-center text-sm text-gray-500">
                  표시할 데이터가 없습니다.
                </div>
              ) : (
                <ForceGraph2D
                  width={size.w - 16}
                  height={size.h}
                  graphData={graph}
                  cooldownTicks={60}
                  nodeRelSize={6}
                  linkDirectionalParticles={0}
                  linkDirectionalArrowLength={0}
                  linkColor={(l) => l.color || currentColors.link}
                  linkWidth={(l) => l.width || 1.4}
                  linkLineDash={(l) => l.dash || []}
                  nodeCanvasObject={(node, ctx, scale) => drawNode(node, ctx, scale, facet)}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    const r = 6;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                    ctx.fill();
                  }}
                  onNodeClick={(n) => {
                    if (n.type === "book" && n.id) window.location.href = `/book/${n.id}`;
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function drawNode(node, ctx, scale, facet) {
  const radius = 4.5;
  const color = node.color || (COLORS[facet] || COLORS.default).node;

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();

  if (node.type === "book") {
    const label = node.title || "";
    const fontSize = Math.max(10, 12 / (scale ** 0.15));
    ctx.font = `${fontSize}px ui-sans-serif, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#111827";
    ctx.fillText(label, node.x + radius + 4, node.y + 1);
  }
}

function buildGraph(books, facet) {
  const nodes = books.map((b) => ({
    id: b.id,
    type: "book",
    title: b.title,
  }));

  const by = {
    카테고리: new Map(),
    단계: new Map(),
    저자: new Map(),
    역자: new Map(),
    주제: new Map(),
    장르: new Map(),
    구분: new Map(),
  };

  for (const b of books) {
    const id = b.id;
    splitList(b.category).forEach((v) => add(by.카테고리, v, id));
    add(by.단계, norm(b.level), id);
    add(by.저자, norm(b.author), id);
    add(by.역자, norm(b.translator ?? b["역자"]), id);
    splitList(b.subject).forEach((v) => add(by.주제, v, id));
    splitList(b.genre).forEach((v) => add(by.장르, v, id));
    add(by.구분, normalizeDivision(b.division), id);
  }

  const types = facet === "전체" ? Object.keys(by) : [facet];
  const links = [];
  const seen = new Set();

  for (const t of types) {
    const style = COLORS[t] || COLORS.default;
    for (const [val, ids] of by[t]) {
      const arr = Array.from(ids);
      if (arr.length < 2) continue;

      // 혼잡 방지를 위해 “사슬 연결 + 첫 노드와 추가 몇 개”만 연결
      for (let i = 0; i < arr.length - 1; i++) {
        pushUnique(links, seen, arr[i], arr[i + 1], t, style);
      }
      for (let k = 2; k < Math.min(5, arr.length); k++) {
        pushUnique(links, seen, arr[0], arr[k], t, style);
      }
    }
  }

  return { nodes, links };
}

function add(map, key, id) {
  const v = norm(key);
  if (!v) return;
  if (!map.has(v)) map.set(v, new Set());
  map.get(v).add(id);
}

function pushUnique(links, seen, source, target, facetType, style) {
  const a = String(source), b = String(target);
  const key = a < b ? `${a}__${b}__${facetType}` : `${b}__${a}__${facetType}`;
  if (seen.has(key)) return;
  seen.add(key);
  links.push({
    source,
    target,
    facetType,
    color: style.link,
    dash: style.dash,
    width: 1.6,
  });
}

function Legend() {
  const line = [
    { t: "카테고리", c: COLORS.카테고리.link, dash: [] },
    { t: "단계",     c: COLORS.단계.link,     dash: [] },
    { t: "저자",     c: COLORS.저자.link,     dash: [] },
    { t: "역자",     c: COLORS.역자.link,     dash: [6,6] },
    { t: "주제",     c: COLORS.주제.link,     dash: [] },
    { t: "장르",     c: COLORS.장르.link,     dash: [] },
    { t: "구분",     c: COLORS.구분.link,     dash: [4,6] },
  ];
  const dot = [
    { t: "카테고리", c: COLORS.카테고리.node },
    { t: "단계",     c: COLORS.단계.node },
    { t: "저자",     c: COLORS.저자.node },
    { t: "역자",     c: COLORS.역자.node },
    { t: "주제",     c: COLORS.주제.node },
    { t: "장르",     c: COLORS.장르.node },
    { t: "구분",     c: COLORS.구분.node },
  ];

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
      <div className="mb-1 flex items-center gap-3">
        <span className="font-semibold text-gray-900">노드(도트) 색상 안내:</span>
        <div className="flex flex-wrap gap-3">
          {dot.map((d) => (
            <span key={d.t} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.c }} />
              {d.t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-900">연결선 색/스타일 안내:</span>
        <div className="flex flex-wrap gap-4">
          {line.map((l) => (
            <span key={l.t} className="inline-flex items-center gap-1.5">
              <svg width="34" height="8">
                <line
                  x1="0" y1="4" x2="34" y2="4"
                  stroke={l.c}
                  strokeWidth="2"
                  strokeDasharray={(l.dash || []).join(",")}
                />
              </svg>
              {l.t}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        같은 기준 값을 공유하는 도서들이 선으로 연결됩니다. 노드를 클릭하면 도서 상세로 이동합니다.
      </p>
    </div>
  );
}
