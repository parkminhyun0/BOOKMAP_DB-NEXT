// pages/api/korlib.js
export default async function handler(req, res) {
  const { q = "", provider = "kolis", page = "1", size = "20" } = req.query;

  const KEY = process.env.KORLIB_API_KEY || process.env.KORLIB_KEY;
  if (!KEY) return res.status(200).json({ items: [], error: "KORLIB_API_KEY missing" });
  if (!q.trim()) return res.status(200).json({ items: [] });

  const enc = encodeURIComponent;

  // endpoints
  const urls = {
    // 국립중앙도서관 KOLIS-NET (키워드 검색)
    kolis: `https://www.nl.go.kr/NL/search/openApi/search.do?key=${KEY}&apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(q)}`,
    // 서지정보유통(문화공공데이터) - 제목검색
    seoji: `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=${page}&page_size=${size}&title=${enc(q)}`,
    // 서지정보유통(문화공공데이터) - ISBN 단건/우선검색
    isbn:  `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=1&page_size=1&isbn=${enc(q)}`
  };

  let raw;
  try {
    const r = await fetch(urls[provider] || urls.kolis, { next: { revalidate: 0 } });
    const text = await r.text();
    try { raw = JSON.parse(text); } catch { return res.status(200).json({ items: [] }); }
  } catch {
    return res.status(200).json({ items: [] });
  }

  const norm = (v) => (v ?? "").toString().trim();

  const mapSeojiList = (list=[]) =>
    list.map((it) => {
      const title = norm(it.TITLE || it.title || it.bookname || it.book_name);
      const author = norm(it.AUTHOR || it.author);
      const publisher = norm(it.PUBLISHER || it.publisher || it.pub);
      const isbn =
        norm(it.ISBN || it.isbn || it.EA_ISBN || it.ea_isbn || it.set_isbn);
      const pub_year = norm(it.PUB_YEAR || it.pub_year || it.publication_year);
      const image = norm(it.IMAGE_URL || it.image || it.cover || "");
      const description = norm(it.DESCRIPTION || it.description || it.summary);
      return { title, author, publisher, ISBN: isbn, pub_year, image, description, raw: it };
    }).filter(x => x.title);

  const mapKolisRecords = (records=[]) =>
    records.map((it) => {
      const flat = { ...it, ...(it?.record || {}) };
      const title = norm(flat.TITLE || flat.title || flat.titleInfo || flat.TITLE_INFO);
      const author = norm(flat.AUTHOR || flat.author || flat.authorInfo || flat.AUTHOR_INFO);
      const publisher = norm(flat.PUBLISHER || flat.publisher || flat.pubInfo || flat.PUBLISHER_INFO);
      const isbn = norm(flat.ISBN || flat.isbn || flat.EA_ISBN || flat.ea_isbn);
      const pub_year = norm(flat.PUB_YEAR || flat.pubYear || flat.publicationYear);
      const image = norm(flat.image || flat.IMAGE_URL || "");
      const description = norm(flat.DESCRIPTION || flat.description || flat.summary);
      return { title, author, publisher, ISBN: isbn, pub_year, image, description, raw: flat };
    }).filter(x => x.title);

  let items = [];
  if (provider === "kolis") {
    const records =
      raw?.result?.records || raw?.result?.record || raw?.records || raw?.record || raw?.items || [];
    items = mapKolisRecords(records);
  } else { // seoji | isbn
    const list =
      raw?.docs || raw?.items || raw?.item || raw?.RESULT || raw?.result || raw?.list || [];
    items = mapSeojiList(list);
  }

  res.status(200).json({ items });
}
