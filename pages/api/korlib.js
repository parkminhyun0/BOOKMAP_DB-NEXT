// pages/api/korlib.js
export default async function handler(req, res) {
  const { q = "", provider = "kolis", page = "1", size = "20" } = req.query;
  const KEY = process.env.KORLIB_API_KEY || process.env.KORLIB_KEY;
  if (!KEY) return res.status(500).json({ error: "KORLIB_API_KEY missing" });
  if (!q.trim()) return res.status(200).json({ items: [] });

  const enc = encodeURIComponent;
  const urls = {
    kolis: `https://www.nl.go.kr/NL/search/openApi/search.do?key=${KEY}&apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(q)}`,
    seoji: `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=${page}&page_size=${size}&title=${enc(q)}`
  };

  let data;
  try {
    const r = await fetch(urls[provider] || urls.kolis, { next: { revalidate: 0 } });
    const txt = await r.text();
    try {
      data = JSON.parse(txt);
    } catch {
      return res.status(200).json({ items: [] });
    }
    if (!r.ok) return res.status(500).json({ error: `HTTP ${r.status}` });
  } catch {
    return res.status(500).json({ error: "network_error" });
  }

  const norm = (v) => (v ?? "").toString().trim();

  const fromSeoji = () => {
    const list =
      data?.docs || data?.items || data?.item || data?.RESULT || data?.result || data?.list || [];
    return list.map((it) => ({
      title: norm(it.TITLE || it.title || it.bookname || it.book_name),
      author: norm(it.AUTHOR || it.author),
      publisher: norm(it.PUBLISHER || it.publisher || it.pub),
      ISBN: norm(it.ISBN || it.isbn || it.EA_ISBN || it.ea_isbn || it.set_isbn),
      pub_year: norm(it.PUB_YEAR || it.pub_year || it.publication_year),
      image: norm(it.IMAGE_URL || it.image || it.cover),
      description: norm(it.DESCRIPTION || it.description || it.summary),
      raw: it
    }));
  };

  const fromKolis = () => {
    const records =
      data?.result?.records || data?.result?.record || data?.records || data?.record || data?.items || [];
    return records.map((it) => {
      const f = { ...it, ...(it?.record || {}) };
      return {
        title: norm(f.TITLE || f.title || f.titleInfo || f.TITLE_INFO),
        author: norm(f.AUTHOR || f.author || f.authorInfo || f.AUTHOR_INFO),
        publisher: norm(f.PUBLISHER || f.publisher || f.pubInfo || f.PUBLISHER_INFO),
        ISBN: norm(f.ISBN || f.isbn || f.EA_ISBN || f.ea_isbn),
        pub_year: norm(f.PUB_YEAR || f.pubYear || f.publicationYear),
        image: norm(f.image || f.IMAGE_URL),
        description: norm(f.DESCRIPTION || f.description || f.summary),
        raw: f
      };
    });
  };

  const items = (provider === "seoji" ? fromSeoji() : fromKolis()).filter((x) => x.title);
  res.status(200).json({ items });
}
