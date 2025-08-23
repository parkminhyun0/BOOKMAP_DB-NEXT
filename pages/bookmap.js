// pages/bookmap.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// ForceGraph2D는 브라우저 전용이라 동적 import (SSR off)
const ForceGraph2D = dynamic(
  () => import("react-force-graph").then(m => m.ForceGraph2D),
  { ssr: false }
);

/* ─────────────────────────────────────────────────────────────
   옵션
   ───────────────────────────────────────────────────────────── */
const TABS = ["전체", "카테고리", "단계", "저자", "역자", "주제", "장르", "구분"];
const LEVEL_ORDER = ["입문", "초급", "중급", "고급", "전문"];
const DIVISION_ORDER = ["국내서", "국외서", "원서", "번역서"];

const FACET_COLORS = {
  전체: "#94a3b8",      // slate-400
  카테고리: "#2563eb",  // blue-600
  단계: "#f59e0b",      // amber-500
  저자: "#7c3aed",      // violet-600
  역자: "#16a34a",      // green-600
  주제: "#0891b2",      // cyan-600
  장르: "#db2777",      // pink-600
  구분: "#92400e",      // amber-800
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

// 쉼표/슬래시 등만 분리자로 사용(공백은 분리하지 않음)
function splitList(input) {
  if (!input) return [];
  let s = String(input);
  s = s.replace(/[\/|·•]/g, ",").replace(/[，、・／]/g, ",");
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

// 저자/역자 등은 “전체 문자열” 1개로만 취급
const wholeField = (v) => (norm(v) ? [norm(v)] : []);

// 문자열 → HSL 고정색 (group별 node 점색 구분용)
function colorForString(s) {
  // 간단한 해시 → 0..360
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  const sat = 60; // %
  const light = 55; // %
  return `hsl(${h} ${sat}% ${light}%)`;
}

/* ─────────────────────────────────────────────────────────────
   그래프 데이터 생성
   - 노드: 책(모든 도서)
   - 엣지: 선택한 탭 기준으로 같은 값을 공유하는 도서들을 “허브-스타”로 연결
           (그룹 첫 책을 허브로 해서 나머지를 허브에 연결 → O(n))
   ───────────────────────────────────────────────────────────── */
function buildGraph(books, facetType) {
  const nodes = books.map((b) => ({ id: String(b.id), book: b }));

  // 전체: 엣지 없음(산포만)
  if (!facetType || facetType === "전체") {
    return { nodes, links: [] };
  }

  // 각 책에서 “이 탭 기준”의 그룹 키 배열 구하기
  const keysOf = (b) => {
    switch (facetType) {
      case "카테고리": return splitList(b.category);
      case "단계": return b.level ? [norm(b.level)] : [];
      case "저자": return wholeField(b.author);
      case "역자": return wholeField(b.translator ?? b["역자"]);
      case "주제": return splitList(b.subject);
      case "장르": return splitList(b.genre);
      case "구분": {
        const dv = normalizeDivision(b.division);
        return dv ? [dv] : [];
      }
      default: return [];
    }
  };

  // 그룹핑: key -> [bookId...]
  const group = new Map();
  for (const b of books) {
    const keys = keysOf(b);
    for (const k of keys) {
      if (!group.has(k)) group.set(k, []);
      group.get(k).push(String(b.id));
    }
  }

  // 링크 생성(허브-스타)
  const links = [];
  for (const [key, ids] of group) {
    if (ids.length < 2) continue;
    const hub = ids[0];
    for (let i = 1; i < ids.length; i++) {
      links.push({
        source: hub,
        target: ids[i],
        _groupKey: key,
      });
    }
  }

  return { nodes, links };
}

/* ─────────────────────────────────────────────────────────────
   BookMap 페이지
   ───────────────────────────────────────────────────────────── */
export default function BookMap() {
  const [facet, setFacet] = useState("전체");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const wrapRef = useRef(null);
  const graphRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 520 });

  // 데이터 로드
  useEffect(() => {
    setErr("");
    setLoading(true);
    fetch("/api/books?source=both&prefer=remote")
      .then(async (r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        // id 문자열 표준화
        const normalized = (raw || []).map((b) => ({ ...b, id: b?.id != null ? String(b.id) : null }));
        setBooks(normalized.filter((b) => b.id));
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // 컨테이너 크기 추적
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(300, rect.width), h: Math.max(300, rect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => buildGraph(books, facet), [books, facet]);

  // 그래프 스타일
  const edgeColor = FACET_COLORS[facet] || FACET_COLORS["전체"];
  const linkColor = useCallback(() => edgeColor, [edgeColor]);
  const nodeColor = useCallback((n) => {
    const b = n.book || {};
    // 그룹키가 있으면 그룹키로 색 결정(첫 번째 기준)
    let key = "";
    switch (facet) {
      case "카테고리": key = splitList(b.category)[0] || ""; break;
      case "단계": key = b.level || ""; break;
      case "저자": key = norm(b.author); break;
      case "역자": key = norm(b.translator ?? b["역자"]); break;
      case "주제": key = splitList(b.subject)[0] || ""; break;
      case "장르": key = splitList(b.genre)[0] || ""; break;
      case "구분": key = normalizeDivision(b.division); break;
      default: key = "";
    }
    return key ? colorForString(key) : "#94a3b8";
  }, [facet]);

  // 노드 클릭 → 상세 페이지로
  const onNodeClick = useCallback((n) => {
    if (!n?.book?.id) return;
    window.open(`/book/${n.book.id}`, "_blank");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-extrabold text-gray-900">BOOK MAP GRAPHIC VIEW</h1>

        {/* 탭 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFacet(t)}
              className={`rounded-full border px-3 py-1.5 text-sm transition
                ${facet === t
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"}`}
              title={t}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 색상 안내 */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-gray-500">색상 안내:</span>
            {TABS.map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-6 rounded"
                  style={{ background: FACET_COLORS[t] || FACET_COLORS["전체"] }}
                />
                <span className="text-gray-600">{t}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            선택한 탭의 종류에 따라 <b>연결선(라인)</b> 색이 바뀝니다. 노드(점)는 같은 값(예: 같은 저자/같은 카테고리)의
            도서끼리 비슷한 색으로 표시되어 군집을 한 눈에 구분할 수 있습니다. 노드를 클릭하면 도서 상세가 새 창으로 열립니다.
          </p>
        </div>

        {/* 좌 2 : 우 5 그리드 (좌측은 향후 위젯 자리) */}
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

          <section className="md:col-span-5">
            {/* 그래프 캔버스 */}
            <div
              ref={wrapRef}
              className="h-[640px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {loading ? (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  그래프 데이터를 불러오는 중...
                </div>
              ) : err ? (
                <div className="flex h-full w-full items-center justify-center text-red-600">
                  데이터를 불러오는 중 오류가 발생했습니다: {err}
                </div>
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  width={size.w}
                  height={size.h}
                  graphData={{ nodes, links }}
                  nodeId="id"
                  linkDirectionalParticles={0}
                  linkColor={linkColor}
                  linkWidth={1.25}
                  linkCurvature={0.15}
                  nodeRelSize={6}
                  nodeColor={nodeColor}
                  nodeCanvasObjectMode={() => "after"} // 텍스트 라벨
                  nodeCanvasObject={(node, ctx, scale) => {
                    const label = node.book?.title || "";
                    const fontSize = 12 / Math.sqrt(scale);
                    ctx.font = `${fontSize}px sans-serif`;
                    ctx.fillStyle = "rgba(55,65,81,0.9)"; // gray-700
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(label, node.x, node.y + 8);
                  }}
                  onNodeClick={onNodeClick}
                  cooldownTicks={120}
                  onEngineStop={() => {
                    // 첫 로딩 시 화면에 꽉 차게 맞추기
                    const fg = graphRef.current;
                    if (!fg) return;
                    fg.zoomToFit(400, 60);
                  }}
                />
              )}
            </div>

            {/* 하단 부가 안내 */}
            <div className="mt-3 text-xs text-gray-500">
              팁: 트랙패드/휠로 <b>줌</b> 인/아웃, 드래그로 <b>이동</b>, 노드 드래그로 <b>레이아웃 조정</b>이 가능합니다.
            </div>
          </section>
        </div>

        {/* 상단으로 가기 / 도서목록 이동 */}
        <div className="mt-8 flex justify-end gap-3 text-sm">
          <Link href="/book" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-100">
            도서목록
          </Link>
          <Link href="/form" className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
            도서등록
          </Link>
        </div>
      </div>
    </div>
  );
}
