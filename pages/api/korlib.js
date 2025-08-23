// pages/api/korlib.js
export default async function handler(req, res) {
  const { q = "", provider = "auto", page = "1", size = "10" } = req.query;
  const enc = encodeURIComponent;

  const KOLIS_KEY = process.env.KORLIB_API_KEY || "";
  // SEOJI는 별도 키가 필요한 경우가 많아 분리합니다(없으면 KOLIS_KEY로 시도만 해봄).
  const SEOJI_KEY = process.env.KORLIB_SEOJI_KEY || process.env.KORLIB_API_KEY || "";

  const norm = (v) => (v ?? "").toString().trim();

  const fetchJsonSafely = async (url) => {
    const r = await fetch(url, { next: { revalidate: 0 } });
    const txt = await r.text();                 // 응답이 HTML일 수도 있어 try-catch로 JSON 파싱
    try { return JSON.parse(txt); } catch { return null; }
  };

  const fromSeoji = async () => {
    if (!SEOJI_KEY) return { items: [], error: "SEOJI_KEY missing" };

    let url = `https://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=${SEOJI_KEY}` +
              `&result_style=json&page_no=${page}&page_size=${size}`;

    // 숫자(또는 X 포함) 9~13자면 ISBN으로, 아니면 제목으로
    if (/^\d{9,13}X?$/i.test(q)) url += `&isbn=${enc(q)}`;
    else url += `&title=${enc(q)}`;

    const data = await fetchJsonSafely(url);
    if (!data) return { items: [] };

    const list = data?.docs || data?.items || data?.item || data?.RESULT || data?.result || data?.list || [];
    const items = list.map((it) => ({
      title: norm(it.TITLE || it.title || it.bookname),
      author: norm(it.AUTHOR || it.author),
      publisher: norm(it.PUBLISHER || it.publisher || it.pub),
      ISBN: norm(it.ISBN || it.EA_ISBN || it.isbn),
      pub_year: norm(it.PUB_YEAR || it.pub_year || it.publication_year),
      image: norm(it.IMAGE_URL || it.image || it.cover || ""),
      description: norm(it.DESCRIPTION || it.description || it.summary),
      raw: it,
    })).filter(x => x.title);

    return { items };
  };

  const fromKolis = async () => {
    if (!KOLIS_KEY) return { items: [], error: "KOLIS_KEY missing" };

    const url = `https://www.nl.go.kr/NL/search/openApi/search.do?key=${KOLIS_KEY}` +
                `&apiType=json&pageSize=${size}&pageNum=${page}&kwd=${enc(q)}`;

    const data = await fetchJsonSafely(url);
    if (!data) return { items: [] };

    const records = data?.result?.records || data?.result?.record ||
                    data?.records || data?.record || data?.items || [];

    const items = records.map((it) => {
      const flat = { ...(it || {}), ...(it?.record || {}) };
      return {
        title: norm(flat.TITLE || flat.title || flat.titleInfo || flat.TITLE_INFO),
        author: norm(flat.AUTHOR || flat.author || flat.authorInfo || flat.AUTHOR_INFO),
        publisher: norm(flat.PUBLISHER || flat.publisher || flat.pubInfo || flat.PUBLISHER_INFO),
        ISBN: norm(flat.ISBN || flat.isbn || flat.EA_ISBN || flat.ea_isbn),
        pub_year: norm(flat.PUB_YEAR || flat.pubYear || flat.publicationYear),
        image: norm(flat.image || flat.IMAGE_URL || ""),
        description: norm(flat.DESCRIPTION || flat.description || flat.summary),
        raw: flat,
      };
    }).filter(x => x.title);

    return { items };
  };

  try {
    let items = [];

    if (provider === "seoji") {
      ({ items } = await fromSeoji());
    } else if (provider === "kolis") {
      ({ items } = await fromKolis());
    } else {
      // auto: ISBN처럼 보이면 SEOJI 우선 → 실패시 KOLIS, 그 외는 KOLIS 우선
      if (/^\d{9,13}X?$/i.test(q)) {
        const r1 = await fromSeoji();
        items = r1.items?.length ? r1.items : (await fromKolis()).items;
      } else {
        const r1 = await fromKolis();
        items = r1.items?.length ? r1.items : (await fromSeoji()).items;
      }
    }

    return res.status(200).json({ items });
  } catch (e) {
    console.error("[korlib] error:", e);
    return res.status(200).json({ items: [], error: e.message });
  }
}
