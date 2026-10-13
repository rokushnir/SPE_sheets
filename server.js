// Сервер гри «Рада директорів».
// Роздає сайт із папки public/ і відповідає на POST /api/board, викликаючи Claude.
// Промпти будуються тут, на сервері, зі стану гри — довільний текст від браузера в модель не йде.
//
// Запуск:  ANTHROPIC_API_KEY=... npm start   (без ключа гра працює в демо-режимі)

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildTurnPrompt,
  buildVerdictPrompt,
  normalizeTurn,
  normalizeVerdict,
  sanitizeState,
  TURN_SCHEMA,
  VERDICT_SCHEMA,
} from "./public/js/prompts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.RADA_MODEL || "claude-opus-5-5";
const EFFORT = process.env.RADA_EFFORT || "low";
const MAX_BODY = 200_000;

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Простий ліміт: не більше 30 запитів до ради за 10 хвилин з однієї адреси.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 30;
}

function sendJSON(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("too_large"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function askClaude(prompt, schema) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EFFORT, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("refusal"), { status: 422, userMessage: "Директори відмовились це обговорювати. Переформулюй відповідь." });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error("max_tokens"), { status: 502 });
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

async function handleBoard(req, res) {
  if (!client) return sendJSON(res, 503, { error: "На сервері не налаштовано ключ Anthropic API." });
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "?";
  if (rateLimited(ip)) return sendJSON(res, 429, { error: "Рада втомилась від частих засідань. Зачекай кілька хвилин." });

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return sendJSON(res, e.status || 400, { error: "Не вдалося прочитати запит." });
  }
  const state = sanitizeState(body.state);
  if (!state.idea) return sendJSON(res, 400, { error: "Немає ідеї для обговорення." });

  try {
    if (body.kind === "verdict") {
      const data = normalizeVerdict(await askClaude(buildVerdictPrompt(state), VERDICT_SCHEMA));
      return sendJSON(res, 200, { data });
    }
    const data = normalizeTurn(await askClaude(buildTurnPrompt(state), TURN_SCHEMA));
    return sendJSON(res, 200, { data });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return sendJSON(res, 429, { error: "Забагато засідань одночасно. Спробуй за хвилину." });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic: невірний ключ API");
      return sendJSON(res, 503, { error: "Сервер не може зв'язатися з радою: перевір ключ API." });
    }
    if (e instanceof Anthropic.APIError) {
      console.error(`Anthropic API ${e.status}:`, e.message);
      return sendJSON(res, 502, { error: "Зв'язок із радою перервався. Спробуй ще раз." });
    }
    if (e.userMessage) return sendJSON(res, e.status || 422, { error: e.userMessage });
    console.error("board error:", e);
    return sendJSON(res, 502, { error: "Рада заплуталась у власних думках. Спробуй ще раз." });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Не знайдено");
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/health") return sendJSON(res, 200, { ok: true, ai: Boolean(client) });
  if (pathname === "/api/board") {
    if (req.method !== "POST") return sendJSON(res, 405, { error: "Тільки POST" });
    return handleBoard(req, res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") return sendJSON(res, 405, { error: "Метод не підтримується" });
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Рада директорів: http://localhost:${PORT}`);
  console.log(client ? `ШІ увімкнено (${MODEL}, effort: ${EFFORT})` : "Ключ ANTHROPIC_API_KEY не задано: гра працює в демо-режимі.");
});
