// 더시원컴퍼니 챗봇 — Vercel 서버리스 함수 (GAS 대체, 훨씬 빠름)
// 브라우저 → 이 함수 → Gemini → 브라우저
// Gemini 키는 Vercel 환경변수(GEMINI_API_KEY)에 숨김. 브라우저 노출 안 됨.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "POST only" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "서버에 GEMINI_API_KEY 환경변수가 없습니다. Vercel Settings에서 등록하세요.",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    const { systemPrompt, contents } = body || {};

    const model = "gemini-3.1-flash-lite";
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent";

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt || "" }] },
      contents: contents || [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: "low" }, // 사고 최소화 → 빠르고 안 잘림
      },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    const cand = data && data.candidates && data.candidates[0];
    const txt =
      cand &&
      cand.content &&
      cand.content.parts &&
      cand.content.parts[0] &&
      cand.content.parts[0].text;

    if (!txt) {
      return res.status(200).json({
        ok: false,
        error: "no text",
        finishReason: (cand && cand.finishReason) || null,
        raw: data,
      });
    }

    return res.status(200).json({ ok: true, reply: txt.trim() });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
