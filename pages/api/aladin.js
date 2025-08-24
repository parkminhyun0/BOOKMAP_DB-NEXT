// pages/api/aladin.js
//
// [역할]
// - 프런트에서 ISBN만 보내면 서버가 알라딘 OpenAPI(ItemLookUp)로 조회,
//   { title, author, publisher, ISBN, image, description } 형태로 반환.
//
// [보안]
// - 절대 키를 코드에 하드코딩하지 않습니다.
// - 무조건 process.env.ALADIN_TTB_KEY(환경변수)만 사용합니다.

export default async function handler(req, res) {
  // ✅ 동일 도메인에서만 호출한다고 가정할 경우 CORS 헤더 불필요
  //    (프론트는 /api/aladin 으로 같은 출처에서 호출)
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "허용되지 않은 메소드" });

  // 1) 쿼리에서 ISBN 받기
  const raw = String(req.query.isbn || "").trim();
  const clean = raw.replace(/[^0-9Xx]/g, "");
  if (!clean) return res.status(400).json({ error: "isbn 쿼리 파라미터가 필요합니다." });

  // 2) ISBN10 → ISBN13 변환(10자리인 경우)
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

  // 3) 🔐 환경변수에서 TTBKey 읽기 (하드코딩 금지)
  const TTB_KEY = process.env.ALADIN_TTB_KEY;
  if (!TTB_KEY) {
    // 키가 없으면 바로 에러 → 키를 코드에 넣지 않도록 강제
    return res.status(500).json({ error: "서버 환경변수 ALADIN_TTB_KEY가 설정되지 않았습니다." });
  }

  // 4) 알라딘 OpenAPI 요청 구성
  const u = new URL("http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx");
  u.searchParams.set("ttbkey", TTB_KEY);
  u.searchParams.set("itemIdType", itemIdType);
  u.searchParams.set("ItemId", itemId);
  u.searchParams.set("output", "js");
  u.searchParams.set("Version", "20131101");
  u.searchParams.set("Cover", "Big");

  // 5) 호출 + JSON 파싱
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

  // 6) 통일 스키마 매핑
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
