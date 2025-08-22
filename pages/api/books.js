// pages/api/books.js
// GET: 원격(Apps Script) + 로컬(public/books.json) 병합
// POST: 원격(Apps Script)로 등록 전달
import fs from "fs/promises";
import path from "path";

const API_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/배포된_AppsScript_URL/exec"; // ← 본인 URL로 교체

// 응답 안전 파싱
async function safeJsonParse(res) {
  const text = await res.text();
  if (!text || !text.trim()) throw new Error("빈 응답입니다.");
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.trim().startsWith("<")) throw new Error("JSON 대신 HTML/오류 페이지가 반환됨");
    throw new Error("JSON 파싱 실패: " + e.message);
  }
}

async function readLocal() {
  try {
    const filePath = path.join(process.cwd(), "public", "books.json");
    const text = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function readRemote() {
  try {
    const r = await fetch(API_URL, { method: "GET" });
    if (!r.ok) throw new Error(`외부 API 오류: ${r.status}`);
    const json = await safeJsonParse(r);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function mergeByKey(a = [], b = []) {
  // id 우선, 없으면 title+author 조합 키
  const keyOf = (x) =>
    x?.id != null && String(x.id).trim() !== ""
      ? "id:" + String(x.id)
      : `ta:${(x?.title || "").trim()}|${(x?.author || "").trim()}`;

  const m = new Map();
  a.forEach((x) => m.set(keyOf(x), x));
  b.forEach((x) => {
    const k = keyOf(x);
    if (!m.has(k)) m.set(k, x); // a 우선
  });
  return Array.from(m.values()).map((x) => ({
    ...x,
    id: x?.id != null ? String(x.id) : null, // id 문자열 표준화
  }));
}

export default async function handler(req, res) {
  // CORS (동일 오리진이면 없어도 됨)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const source = String(req.query.source || "both");   // remote|local|both
      const prefer = String(req.query.prefer || "remote"); // remote|local

      const wantRemote = source === "both" || source === "remote";
      const wantLocal = source === "both" || source === "local";

      const [remoteData, localData] = await Promise.all([
        wantRemote ? readRemote() : Promise.resolve([]),
        wantLocal ? readLocal() : Promise.resolve([]),
      ]);

      const merged =
        prefer === "local"
          ? mergeByKey(localData, remoteData)
          : mergeByKey(remoteData, localData);

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(merged);
    }

    if (req.method === "POST") {
      // 클라이언트에서 온 JSON을 Apps Script로 그대로 전달
      const payload = req.body || {};
      // 기본값 보정: id, created_at
      const ensure = {
        id: payload.id ?? String(Date.now()),
        created_at:
          payload.created_at ??
          new Date().toISOString().slice(0, 19).replace("T", " "), // "YYYY-MM-DD HH:mm:ss"
      };
      const body = JSON.stringify({ ...payload, ...ensure });

      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Apps Script 오류: ${r.status} ${text}`);
      }
      const out = await safeJsonParse(r);
      return res.status(200).json(out);
    }

    return res.status(405).json({ error: "허용되지 않은 메소드" });
  } catch (err) {
    console.error("[/api/books] 실패:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
