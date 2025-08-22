// pages/api/korlib.js
export default async function handler(req, res) {
  const { q = "", provider = "kolis", page = "1", size = "20" } = req.query;

  const KEY =
    process.env.KORLIB_KEY ||
    process.env.KORLIB_API_KEY ||
    process.env.NEXT_PUBLIC_KORLIB_KEY;

  if (!KEY) return res.status(500).json({ error: "KORLIB_KEY missing" });
  if (!q.trim()) return res.status(200).json({ items: [] });

  const enc = encodeURIComponent;
  const urls = {
    kolis: `https://www.nl.go.kr/NL/search/openApi/search.do?key=${KEY}&apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(
      q
    )}`,
    seoji: `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=${page}&page_size=${size}&title=${enc(
      q
    )}`,
  };

  let data = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(urls[provider] || urls.kolis, {
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timer);
    const txt = await r.text();
    try {
      data = JSON.parse(txt);
    } catch {
      return res.status(200).json({ items: [] });
    }
  } catch {
    return res.status(200).json({ items: [] });
  }

  const norm = (v) => (v ?? "").toString().trim();

  const fromSeoji = () => {
    const list =
      data?.docs ||
      data?.items ||
      data?.item ||
      data?.RESULT ||
      data?.result ||
      data?.list ||
      [];
    return list.map((it) => {
      const title = norm(it.TITLE || it.title || it.bookname || it.book_name);
      const author = norm(it.AUTHOR || it.author);
      const publisher = norm(it.PUBLISHER || it.publisher || it.pub);
      const isbn = norm(
        it.ISBN || it.isbn || it.EA_ISBN || it.ea_isbn || it.set_isbn
      );
      const pub_year = norm(
        it.PUB_YEAR || it.pub_year || it.publication_year || it.pub_year_info
      );
      const image = norm(it.IMAGE_URL || it.image || it.cover || "");
      const description = norm(it.DESCRIPTION || it.description || it.summary);
      return {
        title,
        author,
        publisher,
        ISBN: isbn,
        pub_year,
        image,
        description,
        raw: it,
      };
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
      const title =
        norm(flat.TITLE || flat.title || flat.titleInfo || flat.TITLE_INFO);
      const author =
        norm(flat.AUTHOR || flat.author || flat.authorInfo || flat.AUTHOR_INFO);
      const publisher = norm(
        flat.PUBLISHER || flat.publisher || flat.pubInfo || flat.PUBLISHER_INFO
      );
      const isbn = norm(flat.ISBN || flat.isbn || flat.EA_ISBN || flat.ea_isbn);
      const pub_year = norm(
        flat.PUB_YEAR || flat.pubYear || flat.publicationYear
      );
      const image = norm(flat.image || flat.IMAGE_URL || "");
      const description = norm(
        flat.DESCRIPTION || flat.description || flat.summary
      );
      return {
        title,
        author,
        publisher,
        ISBN: isbn,
        pub_year,
        image,
        description,
        raw: flat,
      };
    });
  };

  const items = (provider === "seoji" ? fromSeoji() : fromKolis())
    .filter((x) => x.title);

  res.status(200).json({ items });
}
