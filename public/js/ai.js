// Хто говорить за директорів:
//  1) Claude прямо в переглядачі claude.ai (можливість артефакту "sample");
//  2) наш сервер (server.js) з ключем Anthropic API;
//  3) демо-рушій без ШІ (offline.js).

import { buildTurnPrompt, buildVerdictPrompt, normalizeTurn, normalizeVerdict } from "./prompts.js";
import { offlineTurn, offlineVerdict } from "./offline.js";

export const PROVIDERS = {
  claude: { id: "claude", label: "ШІ: Claude", note: "Директорів озвучує Claude у твоєму акаунті." },
  server: { id: "server", label: "ШІ: сервер", note: "Директорів озвучує Claude через сервер гри." },
  offline: { id: "offline", label: "Демо-режим", note: "Без ШІ: директори говорять заготовленими репліками." },
};

let current = PROVIDERS.offline;
let sample = null;
const listeners = new Set();

export const getProvider = () => current;
export function onProviderChange(fn) {
  listeners.add(fn);
  fn(current);
}
function setProvider(p) {
  current = p;
  for (const fn of listeners) fn(p);
}

// Помилки, після яких Claude у цьому перегляді вже не запрацює.
const PERMANENT = new Set([
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
  "session_expired",
]);

export class BoardError extends Error {
  constructor(message, { fallback = false } = {}) {
    super(message);
    this.fallback = fallback;
  }
}

export async function detectProvider() {
  // Усередині переглядача claude.ai говорить Claude; сервера там немає.
  if (window.claude?.use) {
    const fn = await window.claude.use("sample").catch(() => null);
    if (fn) {
      sample = fn;
      setProvider(PROVIDERS.claude);
    }
    return;
  }
  const serverOk = await fetch("api/health", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => Boolean(j?.ai))
    .catch(() => false);
  if (serverOk) setProvider(PROVIDERS.server);
}

async function viaClaude(prompt, signal) {
  try {
    return await sample.json(prompt, { cache: false, signal, effort: "low" });
  } catch (e) {
    const code = e?.code || "upstream_error";
    if (code === "cancelled") throw e;
    if (PERMANENT.has(code)) {
      sample = null;
      setProvider(PROVIDERS.offline);
      throw new BoardError("Claude недоступний у цьому перегляді, тому рада перейшла в демо-режим.", { fallback: true });
    }
    if (code === "rate_limited") throw new BoardError("Рада втомилась від частих засідань. Зачекай хвилинку і спробуй ще раз.");
    if (code === "refused") throw new BoardError("Директори відмовились це обговорювати. Переформулюй відповідь.");
    throw new BoardError("Зв'язок із радою перервався. Спробуй ще раз.");
  }
}

async function viaServer(kind, state, signal) {
  let res;
  try {
    res = await fetch("api/board", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, state }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new BoardError("Сервер гри не відповідає. Перевір, що він запущений, і спробуй ще раз.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new BoardError(body.error || "Сервер гри повернув помилку. Спробуй ще раз.");
  return body.data;
}

export async function boardTurn(state, signal) {
  if (current.id === "claude" && sample) return normalizeTurn(await viaClaude(buildTurnPrompt(state), signal));
  if (current.id === "server") return normalizeTurn(await viaServer("turn", state, signal));
  await new Promise((r) => setTimeout(r, 500));
  return normalizeTurn(offlineTurn(state));
}

export async function boardVerdict(state, signal) {
  if (current.id === "claude" && sample) return normalizeVerdict(await viaClaude(buildVerdictPrompt(state), signal));
  if (current.id === "server") return normalizeVerdict(await viaServer("verdict", state, signal));
  await new Promise((r) => setTimeout(r, 500));
  return normalizeVerdict(offlineVerdict(state));
}

export { offlineTurn, offlineVerdict };
