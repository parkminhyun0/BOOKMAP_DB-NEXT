// pages/api/aladin.js
//
// 기능 요약
// - ISBN10/13 입력 → 알라딘 ItemLookUp(상세) 호출
// - 빈응답/일부 에러(특히 errorCode=8 등) → 최대 2회 재시도
// - 그래도 없으면 ItemSearch(키워드=ISBN, Book 타겟)로 "폴백"
// - 응답을 { title, author, publisher, ISBN, image, description } 통일 스키마로 반환
//
// 보안
// - 절대 키 하드코딩 금지: process.env.ALADIN_TTB_KEY만 사용
// - 필요 시 CORS 화이트리스트(ALLOWED_ORIGINS) 유지

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://bookmap-next-qaodpbxpb-bookmaps-projects.vercel.app",
  // "https://yourdomain.com",  // 커스텀 도메인 쓰면 추가
];
const ALLOW_VERCEL_PREVIEW = true;

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  let ok = ALLOWED_ORIGINS.includes(origin);
  if (!ok && ALLOW_VERCEL_PREVIEW) {
    try {
      const host = new URL(origin).hostname;
      if (host.endsWith(".vercel.app")) ok = true;
    } catch (_) {}
  }
  if (ok) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

// JSON 파싱을 "느슨하게" 시도 (알라딘은 가끔 세미콜론/홑따옴표 등 비표준 JSON을 돌려줍니다)
function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch {}
  // {...}; 형태면 마지막 세미콜론 제거 후 재시도
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    const cleaned = m[0]
      // 흔한 에러 포맷: {'errorCode':8,'errorMessage':'...'} → "..." 로 정규화
      .replace(/'([^']*)'/g, (_, s) => JSON.stringify(s));
    try { return JSON.parse(cleaned); } catch {}
  }
  return null;
}

// ISBN10 → ISBN13 변환
function toIsbn13(isbn10) {
  const core9 = isbn10.replace(/[^0-9Xx]/g, "").slice(0, 9);
  const tmp12 = "978" + core9;
  let sum = 0;
  for (let i = 0; i < tmp12.length; i++) {
    const n = parseInt(tmp12[i], 10);
    sum += (i % 2 === 0) ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return tmp12 + String(check);
}

async function callJson(url) {
  const r = await fetch(url);
  const text = await r.text();
  const j = parseJsonLoose(text);
  if (!j) throw new Error("알라딘 응답이 JSON 형식이 아닙니다.");
  return j;
}

function mapItems(items) {
  return items.map((it) => ({
    title: it.title || "",
    author: it.author || "",
    publisher: it.publisher || "",
    ISBN: it.isbn13 || it.isbn || "",
    image: it.cover || "",
    description: it.description || ""
  }));
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "허용되지 않은 메소드" });

  // 1) 입력 ISBN 정리
  const raw = String(req.query.isbn || "").trim();
  const clean = raw.replace(/[^0-9Xx]/g, "");
  if (!clean) return res.status(400).json({ error: "isbn 쿼리 파라미터가 필요합니다." });

  let itemIdType = "ISBN13";
  let itemId = clean;
  if (clean.length === 10) itemId = toIsbn13(clean);
  else if (clean.length !== 13) return res.status(400).json({ error: "유효한 ISBN(10 또는 13자리)이 아닙니다." });

  // 2) 키
  const TTB_KEY = process.env.ALADIN_TTB_KEY;
  if (!TTB_KEY) return res.status(500).json({ error: "서버 환경변수 ALADIN_TTB_KEY가 설정되지 않았습니다." });

  // 3) URL 빌더
  const buildLookUp = () => {
    const u = new URL("http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx");
    u.searchParams.set("ttbkey", TTB_KEY);
    u.searchParams.set("itemIdType", itemIdType);
    u.searchParams.set("ItemId", itemId);
    u.searchParams.set("output", "js");
    u.searchParams.set("Version", "20131101");
    u.searchParams.set("Cover", "Big");
    // u.searchParams.set("SearchTarget", "Book"); // 필요시 활성화
    return u.toString();
  };

  const buildSearch = () => {
    const u = new URL("http://www.aladin.co.kr/ttb/api/ItemSearch.aspx");
    u.searchParams.set("ttbkey", TTB_KEY);
    u.searchParams.set("Query", itemId);          // ISBN13을 키워드로
    u.searchParams.set("QueryType", "Keyword");   // Title/Author/Publisher/Keyword 중 Keyword 사용
    u.searchParams.set("SearchTarget", "Book");   // 도서만
    u.searchParams.set("output", "js");
    u.searchParams.set("Version", "20131101");
    u.searchParams.set("Cover", "Big");
    return u.toString();
  };

  // 4) 호출 로직: LookUp → 재시도(2회) → Search 폴백
  try {
    const tryFetch = async (url, attempts = 1) => {
      let last;
      for (let i = 0; i < attempts; i++) {
        const data = await callJson(url);
        // 에러 포맷 케이스 처리 (예: {'errorCode':8,'errorMessage':'키에 해당하는 상품이 존재하지 않습니다.'})
        const errCode = data.errorCode ?? data.errorcode ?? data.ErrorCode;
        const errMsg  = data.errorMessage ?? data.errmsg ?? data.ErrorMessage;
        if (errCode) last = { errCode, errMsg };
        const items = Array.isArray(data?.item) ? data.item : [];
        if (items.length > 0) return { items, error: null };
        // 빈 응답/에러 시 잠깐 대기 후 재시도
        await new Promise(r => setTimeout(r, 250));
        last = last || { errCode: 0, errMsg: "empty items" };
      }
      return { items: [], error: last };
    };

    // 4-1) ItemLookUp 우선
    const look = await tryFetch(buildLookUp(), 3);
    if (look.items.length > 0) {
      return res.status(200).json({ items: mapItems(look.items) });
    }

    // 4-2) ItemSearch 폴백
    const srch = await tryFetch(buildSearch(), 2);
    if (srch.items.length > 0) {
      return res.status(200).json({ items: mapItems(srch.items), note: "fallback:search" });
    }

    // 4-3) 그래도 없으면, 마지막 에러 힌트 전달
    return res.status(200).json({
      items: [],
      error: srch.error || look.error || { errCode: -1, errMsg: "no items" }
    });
  } catch (e) {
    console.error("[aladin] error:", e);
    return res.status(502).json({ error: "알라딘 API 호출/매핑 중 오류가 발생했습니다." });
  }
}
