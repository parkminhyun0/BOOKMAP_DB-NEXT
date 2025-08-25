// pages/api/aladin-search.js
// 알라딘 ItemSearch 서버 프록시(POST).
// - 절대 키 하드코딩 금지: process.env.ALADIN_TTB_KEY만 사용
// - XML 출력 → 간단 파서로 필요한 필드만 추출
// - 기본 응답: { books: [...] , totalResults: N }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, queryType = "Title", maxResults = 5, start = 1 } = req.body || {};

  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return res.status(400).json({ error: "검색어가 필요합니다(2자 이상)" });
  }

  const TTB = process.env.ALADIN_TTB_KEY;
  if (!TTB) {
    return res.status(500).json({ error: "서버 환경변수 ALADIN_TTB_KEY가 설정되지 않았습니다." });
  }

  try {
    // ItemSearch: XML 출력 사용 (Claude 제안과 호환). Version은 20070901로 유지.
    const params = new URLSearchParams({
      ttbkey: TTB,
      Query: query.trim(),
      QueryType: queryType,       // Title | Author | Publisher | Keyword | ...
      MaxResults: String(maxResults),
      start: String(start),
      SearchTarget: "Book",
      output: "xml",
      Version: "20070901",
      Cover: "Big",
    });
    const apiUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?${params.toString()}`;

    const r = await fetch(apiUrl);
    const xml = await r.text();

    // 에러 응답 탐지
    if (xml.includes("<error")) {
      const errorCode = (xml.match(/<errorCode>(\d+)<\/errorCode>/i) || [])[1] || "";
      const errorMessage = (xml.match(/<errorMessage>([^<]+)<\/errorMessage>/i) || [])[1] || "Unknown error";
      return res.status(400).json({ error: `알라딘 API 에러 ${errorCode}: ${errorMessage}`, details: xml });
    }

    const books = parseAladinXML(xml);
    if (!books.length) {
      return res.status(404).json({ error: "도서 정보를 찾을 수 없습니다" });
    }
    return res.status(200).json({ books, totalResults: books.length });
  } catch (e) {
    console.error("[aladin-search] error:", e);
    return res.status(500).json({ error: "서지정보 조회 중 오류가 발생했습니다", details: e.message });
  }
}

// 간단 XML 파서 (CDATA/일반 텍스트 대응)
function parseAladinXML(xmlText) {
  const items = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  const take = (xml, tag) => {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
    if (cdata) return cdata[1].trim();
    const normal = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i").exec(xml);
    return normal ? normal[1].trim() : "";
  };

  return items.map((it) => {
    const title = take(it, "title");
    const author = take(it, "author");
    const publisher = take(it, "publisher");
    const pubDate = take(it, "pubDate");
    const description = take(it, "description");
    const isbn = take(it, "isbn");
    const isbn13 = take(it, "isbn13");
    const cover = take(it, "cover");
    const categoryName = take(it, "categoryName");
    const priceStandard = take(it, "priceStandard");
    const priceSales = take(it, "priceSales");
    const link = take(it, "link");

    return {
      title,
      author,
      publisher,
      publishDate: pubDate,
      description,
      isbn: isbn13 || isbn || "",
      image: cover || "",
      category: categoryName || "",
      priceStandard: priceStandard ? parseInt(priceStandard, 10) : null,
      priceSales: priceSales ? parseInt(priceSales, 10) : null,
      link: link || "",
    };
  }).filter(b => b.title);
}
