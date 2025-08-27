// pages/api/korlib.js
//
// ✅ 무슨 파일인가요?
// - 프론트에서 국립중앙도서관 Open API를 직접 호출하면
//   1) API KEY가 노출되고  2) CORS 문제도 생길 수 있어요.
// - 그래서 이 "서버리스 API"가 대신 호출한 뒤,
//   프론트가 쓰기 쉬운 형태로 깔끔하게 변환해서 돌려줍니다.
//
// ✅ 사용 방법(프론트에서 호출)
//   GET /api/korlib?provider=auto&q=<ISBN>&page=1&size=1
//   - provider: "auto" | "seoji" | "kolis"
//     · auto  : 서지(ISBN) → 실패 시 KOLIS 보조 호출 (추천)
//     · seoji : 서지(ISBN)만 강제
//     · kolis : KOLIS만 강제
//   - q: ISBN(하이픈/공백 상관없이 숫자만 뽑아 씁니다)
//
// ✅ API 엔드포인트(국중)
//   - 서지(ISBN): https://www.nl.go.kr/seoji/SearchApi.do
//       필요한 쿼리: cert_key, result_style=json, page_no, page_size, isbn
//   - KOLIS-NET : https://www.nl.go.kr/NL/search/openApi/search.do
//       필요한 쿼리: key, apiType=json, detailSearch=true, isbnOp=isbn, isbnCode, pageNum, pageSize
//
// ✅ 중요한 키(환경변수)
//   - SEOJI_KEY: 서지(ISBN) cert_key
//   - KOLIS_KEY: KOLIS key
//   👉 보통 같은 계정이면 키가 동일합니다. (주신 키 1개를 둘 다에 사용)
//
// 🛟 초보자용 편의: 아래 DEFAULT_API_KEY에 “지금 주신 키”를 넣어두었습니다.
//    - 로컬/테스트에선 바로 동작합니다.
//    - 실제 배포에선 Vercel 환경변수(SEOJI_KEY/KOLIS_KEY)로 설정하는 것을 강력 추천!
//    - 보안상, 나중에 레포 공개 전에는 DEFAULT_API_KEY를 반드시 삭제하세요.

const DEFAULT_API_KEY = "f4a50d00-58d1-4a7c-8a48-5eb2c8fee1ee";

export default async function handler(req, res) {
  // CORS(필요시): 다른 도메인에서도 호출 가능
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "허용되지 않은 메소드" });
  }

  // 1) 쿼리 파라미터 읽기
  const {
    provider = "auto",      // "auto" | "seoji" | "kolis"
    q = "",                 // ISBN
    page = "1",             // 페이지(문자열이어도 OK)
    size = "10",            // 페이지 크기
  } = req.query;

  // 2) ISBN 정리: 숫자/대문자 X만 남기기 (하이픈/공백 제거)
  const cleanIsbn = String(q).replace(/[^0-9Xx]/g, "");
  if (!cleanIsbn) {
    return res.status(400).json({ error: "ISBN(q) 값을 입력하세요." });
  }

  // 3) API KEY 준비 (환경변수 → 없으면 DEFAULT)
  const SEOJI_KEY = process.env.SEOJI_KEY || DEFAULT_API_KEY; // 서지(ISBN) cert_key
  const KOLIS_KEY = process.env.KOLIS_KEY || DEFAULT_API_KEY; // KOLIS key

  // 4) 응답을 "통일된 모양"으로 만드는 헬퍼
  const unify = ({ title = "", author = "", publisher = "", ISBN = "", image = "", description = "" }) => ({
    title, author, publisher, ISBN, image, description
  });

  // 5) 서지(ISBN) 응답 → 통일 변환
  function mapSeoJiItems(data) {
    // 서지 응답 구조는 상황에 따라 다를 수 있어 여러 케이스를 포괄합니다.
    const list =
      data?.docs ||
      data?.items ||
      data?.result ||
      data?.RESULT ||
      data?.channel?.item ||
      [];

    return list.map((it) => {
      const title = it.TITLE || it.title || "";
      const author = it.AUTHOR || it.author || "";
      const publisher = it.PUBLISHER || it.publisher || "";
      // EA_ISBN: 단권 / SET_ISBN: 세트 / 상황에 따른 필드 정규화
      const isbn = (it.EA_ISBN || it.ISBN || it.SET_ISBN || it.isbn || "")
        .toString()
        .replace(/[^0-9Xx]/g, "");
      // 표지 URL(제공되지 않을 수 있음)
      const image = it.TITLE_URL || it.title_url || "";
      // 소개는 보통 "URL"만 오는 경우가 많아 우선 URL을 description에 담습니다.
      const description = it.BOOK_INTRODUCTION_URL || "";

      return unify({ title, author, publisher, ISBN: isbn, image, description });
    });
  }

  // 6) KOLIS 응답 → 통일 변환
  function mapKolisItems(data) {
    // KOLIS도 응답 구조가 몇 가지 형태가 있어 포괄 처리
    const list =
      data?.result ||
      data?.resultList ||
      data?.itemList ||
      data?.items ||
      data?.channel?.item ||
      [];

    return list.map((it) => {
      const title = it.title_info || it.title || "";
      const author = it.author_info || it.author || "";
      const publisher = it.pub_info || it.publisher || "";
      const isbn = (it.isbn || it.ISBN || "").toString().replace(/[^0-9Xx]/g, "");
      // 표지 이미지는 거의 없으므로 빈값일 수 있어요.
      const image = it.TITLE_URL || "";
      const description = "";
      return unify({ title, author, publisher, ISBN: isbn, image, description });
    });
  }

  // 7) 실제 외부 호출 함수들
  async function callSeoJi() {
    const u = new URL("https://www.nl.go.kr/seoji/SearchApi.do");
    u.searchParams.set("cert_key", SEOJI_KEY);       // ✅ 필수
    u.searchParams.set("result_style", "json");      // ✅ 필수(응답 JSON으로)
    u.searchParams.set("page_no", String(page));     // ✅ 필수
    u.searchParams.set("page_size", String(size));   // ✅ 필수
    u.searchParams.set("isbn", cleanIsbn);           // ✅ 검색값

    const r = await fetch(u.toString());
    const raw = await r.text();

    // 가끔 JSON이 아닌 문자열/HTML이 올 수 있어 안전하게 파싱 시도
    let j;
    try { j = JSON.parse(raw); }
    catch { throw new Error("서지(ISBN) API 응답이 JSON 형식이 아닙니다. (키/파라미터 확인)"); }

    return mapSeoJiItems(j);
  }

  async function callKolis() {
    const u = new URL("https://www.nl.go.kr/NL/search/openApi/search.do");
    u.searchParams.set("key", KOLIS_KEY);            // ✅ 필수
    u.searchParams.set("apiType", "json");           // ✅ JSON 강제
    u.searchParams.set("detailSearch", "true");      // ✅ 상세검색 on
    u.searchParams.set("isbnOp", "isbn");            // ✅ ISBN 조건
    u.searchParams.set("isbnCode", cleanIsbn);       // ✅ 검색값
    u.searchParams.set("pageNum", String(page));
    u.searchParams.set("pageSize", String(size));

    const r = await fetch(u.toString());
    const raw = await r.text();

    let j;
    try { j = JSON.parse(raw); }
    catch { throw new Error("KOLIS API 응답이 JSON 형식이 아닙니다. (키/파라미터 확인)"); }

    return mapKolisItems(j);
  }

  // 8) 메인 로직
  try {
    let items = [];

    if (provider === "seoji") {
      items = await callSeoJi();
    } else if (provider === "kolis") {
      items = await callKolis();
    } else {
      // provider === "auto"
      try {
        items = await callSeoJi(); // 1순위: 서지(ISBN)
      } catch (_) {
        items = [];
      }
      if (!Array.isArray(items) || items.length === 0) {
        items = await callKolis(); // 서지에서 못 찾으면 KOLIS 보조
      }
    }

    return res.status(200).json({ items });
  } catch (err) {
    console.error("[korlib] error:", err);
    // 에러 메시지는 그대로 내려주는 편이 디버깅이 쉬워요.
    return res.status(500).json({ error: err.message || String(err) });
  }
}
