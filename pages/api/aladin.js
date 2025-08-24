// pages/api/aladin.js
//
// [역할]
// - 폼에서 전달한 ISBN으로 알라딘 OpenAPI(ItemLookUp)를 조회하고
//   { title, author, publisher, ISBN, image, description } 형태로 반환.
//
// [보안 원칙]
// - API 키는 절대 코드에 하드코딩하지 않고, 환경변수(process.env.ALADIN_TTB_KEY)만 사용
// - CORS 와일드카드(*) 금지: 허용 도메인 화이트리스트만 열기

// ✅ 1) CORS 화이트리스트: 실제 서비스 도메인(https://example.com), 로컬, Vercel 프리뷰 등
const ALLOWED_ORIGINS = [
  "http://localhost:3000",             // 로컬 개발
  "https://yourdomain.com",            // 프로덕션 도메인(예: https://bookmap.xyz)
  // 필요시 추가…
];

// ✅ 선택: Vercel 프리뷰 허용(프로젝트명-랜덤.vercel.app 같은 동적 도메인)
//   - 너무 넓다고 느껴지면 아래 true를 false로 두거나, 특정 프로젝트명 포함 여부 체크로 좁혀도 됩니다.
const ALLOW_VERCEL_PREVIEW = true;

// ✅ 공통 CORS 적용 함수
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return; // 서버-서버 호출 등 Origin이 없을 수 있음

  let ok = ALLOWED_ORIGINS.includes(origin);

  // *.vercel.app 프리뷰 허용(옵션)
  if (!ok && ALLOW_VERCEL_PREVIEW) {
    try {
      const host = new URL(origin).hostname; // 예: myapp-abc123.vercel.app
      if (host.endsWith(".vercel.app")) ok = true;
    } catch (_) {
      /* no-op */
    }
  }

  if (ok) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin"); // 캐시 안전
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

export default async function handler(req, res) {
  // 2) CORS 적용 + 사전 요청(OPTIONS) 빠르게 응답
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "허용되지 않은 메소드" });

  // 3) 쿼리에서 ISBN 받기 + 정규화
  const raw = String(req.query.isbn || "").trim();
  const clean = raw.replace(/[^0-9Xx]/g, "");
  if (!clean) return res.status(400).json({ error: "isbn 쿼리 파라미터가 필요합니다." });

  // 4) ISBN10 → ISBN13 변환(10자리면 권장 13자리로 변환)
  const toIsbn13 = (isbn10) => {
    const core9 = isbn10.replace(/[^0-9Xx]/g, "").slice(0, 9);
    const tmp12 = "978" + core9;
    let sum = 0;
    for (let i = 0; i < tmp12.length; i++) {
      const n = parseInt(tmp12[i], 10);
      sum += (i % 2 === 0) ? n : n * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return tmp12 + String(check);
  };

  let itemIdType = "ISBN13";
  let itemId = clean;
  if (clean.length === 10) itemId = toIsbn13(clean);
  else if (clean.length !== 13) return res.status(400).json({ error: "유효한 ISBN(10 또는 13자리)이 아닙니다." });

  // 5) 🔐 환경변수에서 TTBKey 읽기 (하드코딩 금지)
  const TTB_KEY = process.env.ALADIN_TTB_KEY;
  if (!TTB_KEY) {
    return res.status(500).json({ error: "서버 환경변수 ALADIN_TTB_KEY가 설정되지 않았습니다." });
  }

  // 6) 알라딘 OpenAPI 요청 구성
  const u = new URL("http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx");
  u.searchParams.set("ttbkey", TTB_KEY);
  u.searchParams.set("itemIdType", itemIdType);
  u.searchParams.set("ItemId", itemId);
  u.searchParams.set("output", "js");       // JSON
  u.searchParams.set("Version", "20131101");
  u.searchParams.set("Cover", "Big");

  // 7) 호출 + JSON 파싱(방어적으로)
  let data;
  try {
    const r = await fetch(u.toString());
    const text = await r.text();
    try {
      data = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}$/);
      if (m) data = JSON.parse(m[0]);
      else throw new Error("알라딘 응답이 JSON 형식이 아닙니다.");
    }
  } catch (e) {
    console.error("[aladin] fetch error:", e);
    return res.status(502).json({ error: "알라딘 API 호출 중 오류가 발생했습니다." });
  }

  // 8) 통일 스키마 매핑
  try {
    const items = Array.isArray(data?.item) ? data.item : [];
    const mapped = items.map((it) => ({
      title: it.title || "",
      author: it.author || "",
      publisher: it.publisher || "",
      ISBN: it.isbn13 || it.isbn || "",
      image: it.cover || "",
      description: it.description || ""
    }));
    return res.status(200).json({ items: mapped });
  } catch (e) {
    console.error("[aladin] map error:", e);
    return res.status(500).json({ error: "알라딘 응답 매핑 중 오류가 발생했습니다." });
  }
}
