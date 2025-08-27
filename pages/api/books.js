
const API_URL = "https://script.google.com/macros/s/배포된_AppsScript_URL/exec";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await fetch(API_URL);
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "허용되지 않은 메소드" });
  } catch (err) {
    console.error("API 프록시 오류:", err);
    return res.status(500).json({ error: err.message });
  }
}
