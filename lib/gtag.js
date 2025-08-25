// /lib/gtag.js
// GA 측정 ID (환경변수에서 읽음). 클라이언트에서도 접근해야 하므로 NEXT_PUBLIC_* 사용
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

// 페이지뷰 전송: 라우트가 바뀔 때마다 호출
export function pageview(url) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_ID, {
    page_path: url,
  });
}

// 커스텀 이벤트 전송: 버튼 클릭/노드 클릭 등 행동 추적
// - action: 이벤트 이름(예: "book_detail_click")
// - params: 추가 파라미터(카테고리/라벨/값 등 자유롭게)
export function event(action, params = {}) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
}
