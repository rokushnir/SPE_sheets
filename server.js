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
import { createLimits, clientIp } from "./limits.js";
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
const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const TRUST_PROXY_HOPS = num(process.env.RADA_TRUST_PROXY, 0);

const limits = createLimits({
  dailyBudgetUSD: num(process.env.RADA_DAILY_BUDGET_USD, 2),
  requestsPerIpPerDay: num(process.env.RADA_REQUESTS_PER_IP_PER_DAY, 30),
  requestsPerIpPer10Min: num(process.env.RADA_REQUESTS_PER_IP_PER_10MIN, 15),
  timeZone: process.env.RADA_TZ || "Europe/Kyiv",
  dataDir: process.env.RADA_DATA_DIR || path.join(here, "data"),
});

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

async function askClaude(prompt, schema, maxTokens) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EFFORT, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });
  // Після резервної відмови response.model — модель, яка відповіла; її ціну й рахуємо.
  limits.record(response.model || MODEL, response.usage);
  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("refusal"), { status: 422, userMessage: "Директори відмовились це обговорювати. Переформулюй відповідь." });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error("max_tokens"), { status: 502 });
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

// Відповідь, після якої браузер продовжує засідання в демо-режимі.
function sendFallback(res, status, error) {
  return sendJSON(res, status, { error, fallback: true });
}

const BUDGET_MSG = "Денний ліміт ШІ для гри вичерпано, тому рада до завтра працює в демо-режимі.";

async function handleBoard(req, res) {
  if (!client) return sendFallback(res, 503, "На сервері не налаштовано ключ Anthropic API, тому рада працює в демо-режимі.");
  if (limits.budgetExhausted()) return sendFallback(res, 503, BUDGET_MSG);
  const ip = clientIp(req, TRUST_PROXY_HOPS);
  const limited = limits.checkIp(ip);
  if (limited === "daily") {
    return sendFallback(res, 429, "Ти сьогодні вже провів(ла) кілька засідань із ШІ. До завтра рада працює в демо-режимі.");
  }
  if (limited === "burst") return sendJSON(res, 429, { error: "Рада втомилась від частих засідань. Зачекай кілька хвилин." });

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
      const data = normalizeVerdict(await askClaude(buildVerdictPrompt(state), VERDICT_SCHEMA, 8000));
      return sendJSON(res, 200, { data });
    }
    const data = normalizeTurn(await askClaude(buildTurnPrompt(state), TURN_SCHEMA, 6000));
    return sendJSON(res, 200, { data });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return sendJSON(res, 429, { error: "Забагато засідань одночасно. Спробуй за хвилину." });
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || e instanceof Anthropic.BadRequestError) {
      // Невірний ключ, вичерпаний ліміт витрат у Console тощо: повтор не допоможе.
      console.error(`Anthropic API ${e.status}:`, e.message);
      return sendFallback(res, 503, "ШІ для гри зараз недоступний, тому рада працює в демо-режимі.");
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
  if (pathname === "/api/health") {
    const ai = Boolean(client) && !limits.budgetExhausted();
    return sendJSON(res, 200, { ok: true, ai, note: client && !ai ? BUDGET_MSG : undefined });
  }
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
  if (client) {
    const st = limits.stats();
    console.log(`Денний бюджет: $${st.dailyBudgetUSD}, сьогодні витрачено $${st.spentUSD.toFixed(2)} (${st.requests} запитів).`);
    if (!TRUST_PROXY_HOPS) console.log("RADA_TRUST_PROXY не задано: X-Forwarded-For ігнорується, ліміти рахуються за адресою з'єднання.");
  }
});
