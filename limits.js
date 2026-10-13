// Обмеження витрат для server.js:
//  - денний бюджет у доларах (рахується з usage кожної відповіді, переживає перезапуск);
//  - ліміт запитів з однієї адреси: за день і за 10 хвилин;
//  - визначення IP гравця без довіри до підробленого X-Forwarded-For.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// Ціни в доларах за 1 млн токенів: [вхід, вихід].
// Невідома модель (наприклад, резервна після відмови) рахується за обережною ціною.
const PRICES = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};
const UNKNOWN_PRICE = [5, 25];

export function costUSD(model, usage = {}) {
  const [inP, outP] = PRICES[model] || UNKNOWN_PRICE;
  const input =
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) * 1.25 +
    (usage.cache_read_input_tokens || 0) * 0.1;
  return (input * inP + (usage.output_tokens || 0) * outP) / 1_000_000;
}

function today(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function createLimits({
  dailyBudgetUSD = 2,
  requestsPerIpPerDay = 30,
  requestsPerIpPer10Min = 15,
  timeZone = "Europe/Kyiv",
  dataDir,
} = {}) {
  const file = dataDir ? path.join(dataDir, "usage.json") : null;
  let usage = { date: today(timeZone), spentUSD: 0, requests: 0 };
  if (file) {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (saved?.date === usage.date) usage = { ...usage, ...saved };
    } catch {}
  }
  let perIpDay = new Map();
  const perIpBurst = new Map();
  let warned = false;

  function rollover() {
    const d = today(timeZone);
    if (usage.date !== d) {
      usage = { date: d, spentUSD: 0, requests: 0 };
      perIpDay = new Map();
      warned = false;
    }
  }

  function persist() {
    if (!file) return;
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(usage, null, 2));
    } catch (e) {
      console.error("Не вдалося зберегти облік витрат:", e.message);
    }
  }

  return {
    budgetLeft() {
      rollover();
      return Math.max(0, dailyBudgetUSD - usage.spentUSD);
    },
    budgetExhausted() {
      return this.budgetLeft() <= 0;
    },

    // Повертає null, якщо можна, або причину відмови: "burst" чи "daily".
    checkIp(ip) {
      rollover();
      const now = Date.now();
      const burst = (perIpBurst.get(ip) || []).filter((t) => now - t < 10 * 60_000);
      if (burst.length >= requestsPerIpPer10Min) return "burst";
      if ((perIpDay.get(ip) || 0) >= requestsPerIpPerDay) return "daily";
      burst.push(now);
      perIpBurst.set(ip, burst);
      perIpDay.set(ip, (perIpDay.get(ip) || 0) + 1);
      if (perIpBurst.size > 5000) {
        for (const [k, v] of perIpBurst) if (!v.some((t) => now - t < 10 * 60_000)) perIpBurst.delete(k);
      }
      return null;
    },

    record(model, apiUsage) {
      rollover();
      const cost = costUSD(model, apiUsage);
      usage.spentUSD = Math.round((usage.spentUSD + cost) * 1e6) / 1e6;
      usage.requests += 1;
      persist();
      if (!warned && usage.spentUSD >= dailyBudgetUSD * 0.8) {
        warned = true;
        console.warn(`Увага: витрачено $${usage.spentUSD.toFixed(2)} з денного бюджету $${dailyBudgetUSD}.`);
      }
      return cost;
    },

    stats() {
      rollover();
      return { ...usage, dailyBudgetUSD };
    },
  };
}

// IP гравця. X-Forwarded-For може підставити будь-хто, тому йому віримо лише тоді,
// коли сервер стоїть за відомою кількістю проксі (trustProxyHops). Беремо адресу,
// яку дописав найближчий до нас довірений проксі, а не першу зліва.
export function clientIp(req, trustProxyHops = 0) {
  let ip = req.socket.remoteAddress || "?";
  if (trustProxyHops > 0) {
    const list = String(req.headers["x-forwarded-for"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const fromProxy = list[list.length - trustProxyHops];
    if (fromProxy) ip = fromProxy;
  }
  return ip.replace(/^::ffff:/, "");
}
