// pages/api/korlib.js
export default async function handler(req, res) {
  const {
    q = "",
    provider = "auto", // auto | kolis | seoji
    page = "1",
    size = "20",
  } = req.query;

  const RAW_KEY = process.env.KORLIB_API_KEY;
  if (!RAW_KEY) return res.status(500).json({ error: "KORLIB_API_KEY missing" });

  const KEY = encodeURIComponent(RAW_KEY); // 서비스키에 특수문자 대비
  const query = (q || "").toString().trim();
  if (!query) return res.status(200).json({ items: [] });

  const isIsbnLike = /^\d{9,13}[\dXx]?$/.test(query);
  const chosen = provider === "auto" ? (isIsbnLike ? "seoji" : "kolis") : provider;

  const enc = encodeURIComponent;

  // KOLIS: 공공데이터포털 발급키도 수용하려고 key / serviceKey 둘 다 시도
  const kolisBase = `https://www.nl.go.kr/NL/search/openApi/search.do?apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(query)}`;
  const kolisUrls = [
    `${kolisBase}&key=${KEY}`,
    `${kolisBase}&serviceKey=${KEY}`,
  ];

  // 서지(ISBN)
  const seojiUrl = `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=${page}&page_size=${size}&title=${enc(query)}`;

  async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return null; }
  }

  let data = null;
  let sourceTried = [];

  if (chosen === "kolis") {
    for (const u of kolisUrls) {
      sourceTried.push(u);
      data = await fetchJson(u);
      if (data) break;
    }
  } else if (chosen === "seoji") {
    sourceTried.push(seojiUrl);
    data = await fetchJson(seojiUrl);
  }

  if (!data) {
    // auto 모드에서 한 번 더 시도
    if (provider === "auto" && chosen === "seoji") {
      for (const u of kolisUrls) {
        sourceTried.push(u);
        data = await fetchJson(u);
        if (data) break;
      }
      if (!data) return res.status(200).json({ items: [], source: "fallback-kolis" });
    } else if (provider === "auto" && chosen === "kolis") {
      sourceTried.push(seojiUrl);
      data = await fetchJson(seojiUrl);
      if (!data) return res.status(200).json({ items: [], source: "fallback-seoji" });
    } else {
      return res.status(200).json({ items: [], source: chosen });
    }
  }

  const norm = (v) => (v ?? "").toString().trim();

  const fromSeoji = () => {
    const list =
      data?.docs || data?.items || data?.item || data?.RESULT || data?.result || data?.list || [];
    return list.map((it) => {
      const title = norm(it.TITLE || it.title || it.bookname || it.book_name);
      const author = norm(it.AUTHOR || it.author);
      const publisher = norm(it.PUBLISHER || it.publisher || it.pub);
      const isbn = norm(it.ISBN || it.isbn || it.EA_ISBN || it.ea_isbn || it.set_isbn);
      const pub_year = norm(it.PUB_YEAR || it.pub_year || it.publication_year);
      const image = norm(it.IMAGE_URL || it.image || it.cover) || "";
      const description = norm(it.DESCRIPTION || it.description || it.summary);
      return { title, author, publisher, ISBN: isbn, pub_year, image, description, raw: it };
    });
  };

  const fromKolis = () => {
    const records =
      data?.result?.records ||
      data?.result?.record ||
      data?.records ||
      data?.record ||
      data?.items ||
      [];
    return records.map((it) => {
      const flat = { ...it, ...(it?.record || {}) };
      const title = norm(flat.TITLE || flat.title || flat.titleInfo || flat.TITLE_INFO);
      const author = norm(flat.AUTHOR || flat.author || flat.authorInfo || flat.AUTHOR_INFO);
      const publisher = norm(flat.PUBLISHER || flat.publisher || flat.pubInfo || flat.PUBLISHER_INFO);
      const isbn = norm(flat.ISBN || flat.isbn || flat.EA_ISBN || flat.ea_isbn);
      const pub_year = norm(flat.PUB_YEAR || flat.pubYear || flat.publicationYear);
      const image = norm(flat.image || flat.IMAGE_URL || "");
      const description = norm(flat.DESCRIPTION || flat.description || flat.summary);
      return { title, author, publisher, ISBN: isbn, pub_year, image, description, raw: flat };
    });
  };

  const finalItems = (chosen === "seoji" ? fromSeoji() : fromKolis()).filter((x) => x.title);
  res.status(200).json({ items: finalItems, source: chosen, tried: sourceTried });
}
