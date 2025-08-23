// pages/bookmap.js
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

// 클라이언트 전용 로딩
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

function hasWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function GraphTooltip({ hover, container }) {
  if (!hover || !container) return null;
  const { node, x, y } = hover;
  const img = node.image || "/favicon.ico";
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left: x + 14, top: y + 14 }}
    >
      <div className="w-64 rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-3">
        <div className="flex gap-3">
          <img
            src={img}
            alt=""
            className="h-16 w-12 rounded object-cover bg-gray-100"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">
              {node.title || "(제목 없음)"}
            </div>
            <div className="mt-0.5 text-xs text-gray-700 line-clamp-1">
              {node.author}
            </div>
            <div className="text-[11px] text-gray-500 line-clamp-1">
              {node.publisher}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookMap() {
  const router = useRouter();

  // 컨테이너/그래프 ref
  const wrapRef = useRef(null);
  const fg2dRef = useRef();
  const fg3dRef = useRef();

  // 크기
  const [size, setSize] = useState({ w: 0, h: 600 });
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 포인터 위치(툴팁 위치용)
  const [ptr, setPtr] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const client = "touches" in e ? e.touches[0] : e;
    setPtr({ x: client.clientX - r.left, y: client.clientY - r.top });
  };

  // 데이터: 실제 도서목록 → 노드/링크 변환으로 교체
  const graphData = useMemo(() => {
    // 예시 더미
    const nodes = [
      { id: "1", title: "단 한 번의 삶", author: "김영하", publisher: "복복서가", group: "저자", image: "/favicon.ico" },
      { id: "2", title: "미드나잇 라이브러리", author: "매트 헤이그", publisher: "인플루엔셜", group: "장르", image: "/favicon.ico" },
      { id: "3", title: "클린 코드", author: "로버트 C. 마틴", publisher: "인사이트", group: "카테고리", image: "/favicon.ico" },
    ];
    const links = [
      { source: "1", target: "2", type: "저자", color: "#2563eb" },
      { source: "2", target: "3", type: "장르", color: "#9333ea" },
    ];
    return { nodes, links };
  }, []);

  // 2D/3D 모드
  const [mode, setMode] = useState("2d");
  const is3dAvail = hasWebGL();
  useEffect(() => setMode(is3dAvail ? "3d" : "2d"), [is3dAvail]);

  // DPR 제한(모바일 과부하 방지)
  const dpr = typeof window !== "undefined" ? Math.min(1.5, window.devicePixelRatio || 1) : 1;

  // 인터랙션: 클릭 이동, 호버 툴팁
  const [hover, setHover] = useState(null);
  const onNodeClick = (n) => n?.id && router.push(`/book/${n.id}`);
  const onNodeHover = (n) => setHover(n ? { node: n, x: ptr.x, y: ptr.y } : null);

  // 링크 색 / 노드 색
  const linkColor = (l) => l.color || "rgba(0,0,0,0.15)";
  const nodeRelSize = 5; // 노드 기본 반경 배율

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 상단 안내 & 모드 토글 */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            색상 안내: <span className="inline-block h-2 w-2 rounded-full align-middle bg-blue-600 mr-1" />저자{" "}
            <span className="inline-block h-2 w-2 rounded-full align-middle bg-emerald-600 mx-2" />주제{" "}
            <span className="inline-block h-2 w-2 rounded-full align-middle bg-purple-600 mr-1" />장르 등
            (선택한 탭 종류에 따라 **연결선(라인)** 색과 **노드 점** 컬러가 달라집니다)
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            <button
              onClick={() => setMode("2d")}
              className={`px-3 py-1.5 text-sm ${mode === "2d" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
            >
              2D
            </button>
            <button
              onClick={() => is3dAvail && setMode("3d")}
              className={`px-3 py-1.5 text-sm ${mode === "3d" ? "bg-gray-900 text-white" : "bg-white text-gray-700"} ${
                !is3dAvail ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title={is3dAvail ? "" : "이 기기에서는 WebGL 제약으로 3D가 비활성화됩니다."}
            >
              3D
            </button>
          </div>
        </div>

        {/* 그래프 캔버스 */}
        <div
          ref={wrapRef}
          onMouseMove={onMove}
          onTouchMove={onMove}
          className="relative mt-4 h-[70vh] w-full rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          {mode === "3d" ? (
            <ForceGraph3D
              ref={fg3dRef}
              graphData={graphData}
              width={size.w}
              height={size.h}
              backgroundColor="#ffffff"
              dpr={dpr}
              nodeAutoColorBy="group"
              linkColor={linkColor}
              nodeRelSize={nodeRelSize}
              onNodeClick={onNodeClick}
              onNodeHover={onNodeHover}
              cooldownTicks={120}
              onEngineStop={() => fg3dRef.current && fg3dRef.current.zoomToFit(400)}
              enableNodeDrag={false}
              showNavInfo={false}
              nodeLabel={(n) => n.title || ""}
            />
          ) : (
            <ForceGraph2D
              ref={fg2dRef}
              graphData={graphData}
              width={size.w}
              height={size.h}
              dpr={dpr}
              nodeAutoColorBy="group"
              linkColor={linkColor}
              nodeRelSize={nodeRelSize}
              onNodeClick={(n) => {
                // 모바일: 탭 시 먼저 툴팁 띄우고, 두 번째 탭에 상세로 이동
                if (!hover || hover?.node?.id !== n.id) {
                  setHover({ node: n, x: ptr.x, y: ptr.y });
                  return;
                }
                onNodeClick(n);
              }}
              onNodeHover={onNodeHover}
              cooldownTicks={60}
              onEngineStop={() => fg2dRef.current && fg2dRef.current.zoomToFit(400)}
              enableNodeDrag={false}
              nodeLabel={(n) => n.title || ""}
            />
          )}

          {/* 커스텀 툴팁 */}
          <GraphTooltip hover={hover} container={wrapRef.current} />
        </div>
      </div>
    </div>
  );
}
