// pages/api/korlib.js
export default async function handler(req, res) {
  const { q = "", provider = "kolis", page = "1", size = "20" } = req.query;

  const KEY = process.env.KORLIB_API_KEY;
  if (!KEY) return res.status(500).json({ error: "KORLIB_API_KEY missing" });
  if (!q.trim()) return res.status(200).json({ items: [] });

  const enc = encodeURIComponent;

  // 숫자/대시 등 제거하고 10/13자리 ISBN 인지 판별
  const raw = q.toString().trim();
  const isbnDigits = raw.replace(/[^0-9Xx]/g, "");
  const isIsbn = /^(\d{10}|\d{13}|(\d{9}[0-9Xx]))$/.test(isbnDigits);

  // API 엔드포인트
  const urls = {
    kolis: `https://www.nl.go.kr/NL/search/openApi/search.do?key=${KEY}&apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(raw)}`,
    // 서지정보유통지원시스템(ISBN) — ISBN이면 isbn=, 아니면 title=
    seoji: `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${KEY}&result_style=json&page_no=${page}&page_size=${size}${
      isIsbn ? `&isbn=${enc(isbnDigits)}` : `&title=${enc(raw)}`
    }`,
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
  } catch (e) {
    return res.status(200).json({ items: [] });
  }

  const norm = (v) => (v ?? "").toString().trim();

  // 서지(ISBN) 표준화
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
      const isbn =
        norm(it.ISBN || it.isbn || it.EA_ISBN || it.ea_isbn || it.set_isbn);
      const pub_year = norm(it.PUB_YEAR || it.pub_year || it.publication_year);
      const image = norm(it.IMAGE_URL || it.image || it.cover) || "";
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

  // KOLIS-NET 표준화
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
      const publisher = norm(
        flat.PUBLISHER || flat.publisher || flat.pubInfo || flat.PUBLISHER_INFO
      );
      const isbn = norm(flat.ISBN || flat.isbn || flat.EA_ISBN || flat.ea_isbn);
      const pub_year = norm(flat.PUB_YEAR || flat.pubYear || flat.publicationYear);
      const image = norm(flat.image || flat.IMAGE_URL || "");
      const description = norm(flat.DESCRIPTION || flat.description || flat.summary);

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

  const items = (provider === "seoji" ? fromSeoji() : fromKolis()).filter((x) => x.title);
  res.status(200).json({ items });
}
