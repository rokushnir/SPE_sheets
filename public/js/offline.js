// Демо-рушій без ШІ: збирає засідання з реплік offline-data.js.
// Вмикається, коли немає ні Claude у переглядачі, ні сервера з ключем API.
//
// Що робить рушій:
//  - оцінює кожну відповідь гравця (0 — відписка … 3 — сильна) і підбирає тон реакції;
//  - витягує з відповідей цифри (ціна, собівартість, стартові гроші, штуки на день, кількість покупців)
//    і рахує на них маржу, окупність, прибуток за місяць;
//  - пам'ятає (у браузері), які репліки вже звучали, і бере ті, що давно не використовувались,
//    тож у кількох іграх поспіль репліки не повторюються.

import { BLOCKS, BLOCK_IDS, DIRECTOR_IDS, BUDGETS, MAX_ROUNDS } from "./characters.js";
import * as D from "./offline-data.js";

const BLOCK = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

const NAMES = {
  cfo: { voc: "Марто", acc: "Марту", ins: "Мартою", gen: "Марти", f: true },
  cco: { voc: "Тарасе", acc: "Тараса", ins: "Тарасом", gen: "Тараса", f: false },
  lawyer: { voc: "Ірино", acc: "Ірину", ins: "Іриною", gen: "Ірини", f: true },
  coo: { voc: "Богдане", acc: "Богдана", ins: "Богданом", gen: "Богдана", f: false },
};

// Теми питань у знахідному відмінку: «я питала про {asked}».
const ASKED = {
  product: "продукт",
  customer: "покупця",
  market: "ринок і конкурентів",
  channels: "канали продажу",
  production: "виробництво",
  cost: "собівартість",
  price: "ціну",
  money: "стартові гроші",
  legal: "оформлення бізнесу",
  risks: "ризики",
};

// Те саме в родовому відмінку: «повернімося до {askedGen}».
const ASKED_GEN = {
  product: "продукту",
  customer: "покупця",
  market: "ринку і конкурентів",
  channels: "каналів продажу",
  production: "виробництва",
  cost: "собівартості",
  price: "ціни",
  money: "стартових грошей",
  legal: "оформлення бізнесу",
  risks: "ризиків",
};

// ---------- пам'ять проти повторів ----------

const MEM_KEY = "rada-directoriv:offline-memory";
let mem = null;

function memory() {
  if (mem) return mem;
  mem = { tick: 0, used: {} };
  try {
    const raw = globalThis.localStorage?.getItem(MEM_KEY);
    const saved = raw && JSON.parse(raw);
    if (saved && typeof saved.tick === "number" && saved.used) mem = saved;
  } catch {}
  return mem;
}

function saveMemory() {
  const m = memory();
  const keys = Object.keys(m.used);
  if (keys.length > 4000) {
    keys.sort((a, b) => m.used[a] - m.used[b]);
    for (const k of keys.slice(0, keys.length - 3000)) delete m.used[k];
  }
  try {
    globalThis.localStorage?.setItem(MEM_KEY, JSON.stringify(m));
  } catch {}
}

// Для перевірок: почати з чистої пам'яті.
export function resetOfflineMemory() {
  mem = { tick: 0, used: {} };
}

function hash(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return (h >>> 0).toString(36);
}

// Підставляє {ключі}. Якщо чогось бракує — повертає null, і репліка пропускається.
function fill(tpl, ctx) {
  let ok = true;
  const out = tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = ctx[k];
    if (v === undefined || v === null || v === false || v === "") {
      ok = false;
      return "";
    }
    return String(v);
  });
  return ok ? out : null;
}

// Обирає варіант, який найдовше не звучав. render повертає готове значення або null.
function choose(key, items, render, prefer = () => false) {
  const m = memory();
  const cands = [];
  for (const it of items || []) {
    const value = render(it);
    if (value == null) continue;
    const id = key + ":" + hash(JSON.stringify(it));
    cands.push({ value, id, last: m.used[id] ?? -1, pref: prefer(it) });
  }
  if (!cands.length) return null;
  const oldest = Math.min(...cands.map((c) => c.last));
  let pool = cands.filter((c) => c.last === oldest);
  if (pool.some((c) => c.pref)) pool = pool.filter((c) => c.pref);
  const c = pool[Math.floor(Math.random() * pool.length)];
  m.used[c.id] = ++m.tick;
  return c.value;
}

const pickText = (key, items, ctx, prefer) => choose(key, items, (t) => fill(t, ctx), prefer);

function pickScript(key, scripts, ctx) {
  return choose(key, scripts, (script) => {
    const out = [];
    for (const [who, mood, to, text] of script) {
      const t = fill(text, ctx);
      if (t == null) return null;
      out.push({ who, mood, to, text: t });
    }
    return out;
  });
}

// ---------- що є в ідеї та відповідях ----------

const DETECT = {
  product: /(продукт|товар|послуг|смак|якіст|унікальн|відрізня|рецепт|дизайн|розмір|асортимент|начинк|колір|матеріал)/i,
  customer: /(клієнт|покупц|покупат|школяр|студент|мам|батьк|офіс|сусід|підліт|доросл|віку|років|аудитор|однокласник|вчител|друз)/i,
  market: /(конкурент|ринок|ринку|у місті|в місті|район|попит|опитав|опитую|скільки людей|тисяч людей|населенн|учнів|мешканц)/i,
  channels: /(інстаграм|instagram|тікток|tiktok|телеграм|telegram|ютуб|youtube|сайт|доставк|маркетплейс|olx|prom|rozetka|ярмар|магазин|точк|реклам|блогер|сарафан|оголошен|сторіс|пост|перерв)/i,
  production: /(обладн|піч|печ[уе]|духовк|виготов|технолог|сировин|постачальн|інгредієнт|принтер|кухн|цех|за день|на день|за ранок|вручну|парті|друкую|шию|в'яжу)/i,
  cost: /(собівартіст|витрат|закуп|обходит|на одну|на 1 шт|за кілограм|оренд)/i,
  price: /(ціна|ціну|продава[тюм]\p{L}*\s+(по|за)\s*\d|по \d+\s*(₴|грн)|\d+\s*(₴|грн|гривень)\s*(за|\/)\s*(штук|шт|одну))/iu,
  money: /(заощадж|накопич|батьки дадуть|позик|кредит|інвест|грант|власні гроші|стартов|на старт|бюджет|кишенькові|передоплат)/i,
  legal: /(фоп|(?<!\p{L})тов(?!\p{L})|ліценз|санітар|договір|податк|законн|дозвіл|сертифікат|реєстрац|єдиний податок|медкниж|медична книжка)/iu,
  risks: /(ризик|якщо не|план б|запасн|не вийде|зіпсу|повернен|страхов|що як|на випадок|підмін)/i,
};

const VAGUE = /(не знаю|хз|якось|потім|подумаю|побачимо|норм(?!\p{L})|(?<!\p{L})ок(?!\p{L})|все буде|багато|трохи|всім|усім|будь-хто|кожен купить|десь так)/giu;

const CATEGORIES = [
  ["food", /(булоч|піц|кав[аиу'’]|кав'ярн|торт|печив|випіч|їж|снек|смузі|лимонад|десерт|сендвіч|бургер|морозив|чай|шоколад|кекс|пончик|млинц|салат|пиріж|макарун|капкейк|обід)/i],
  ["tech", /(3d|3д|принтер|друкува|дрон|електрон|ардуїно|arduino|гаджет|чохл|паяльн|робот)/i],
  ["craft", /(шит|шию|одяг|футболк|худі|прикрас|свічк|мило|в'яза|вяза|сумк|кераміч|біжутер|розпис|перешив|брелок|стікер|наліпк|листівк|бісер|вишив)/i],
  ["service", /(вигул|репетит|прибиран|ремонт|фото|відео|монтаж|догляд|няня|кур'єр|стриж|манікюр|прокат|майстер-клас|мийк|навчан|урок)/i],
  ["green", /(еко|переробк|сортуван|розсад|рослин|мікрозелен|город|(?<!\p{L})мед(?!\p{L})|бджол|квіт)/iu],
  ["resale", /(перепрод|оптом|китай|aliexpress|дропшип|секонд|вінтаж|кросівк)/i],
  ["digital", /((?<!\p{L})гр[аиу](?!\p{L})|ігр|застосун|додат|сайт|бот|програм|app|онлайн|ютуб|youtube|канал|блог|нейромереж|курс)/iu],
];

function categoryOf(idea) {
  for (const [id, re] of CATEGORIES) if (re.test(idea || "")) return id;
  return "general";
}

const CHANNELS = [
  [/інстаграм|instagram|інсту|insta/i, "Instagram"],
  [/тікток|tiktok|тік-ток/i, "TikTok"],
  [/телеграм|telegram/i, "Telegram"],
  [/ютуб|youtube/i, "YouTube"],
  [/\bolx\b|олх/i, "OLX"],
  [/\bprom\b|пром\.юа/i, "Prom"],
  [/ярмар/i, "Ярмарок"],
  [/сарафан|через друз|знайом/i, "Сарафанне радіо"],
  [/власний сайт|свій сайт|\bсайт/i, "Власний сайт"],
  [/на перерв|у школі|в школі/i, "Продаж у школі"],
];

const toNum = (s) => Number(String(s).replace(/[\s  ]/g, "").replace(",", "."));

// Витягує цифри з усіх відповідей гравця. Пізніші уточнення перекривають ранні.
function readFacts(texts) {
  const f = { channels: [] };
  const money = /(\d[\d\s  ]{0,7}(?:[.,]\d+)?)\s*(тис\.?|тисяч\p{L}*|к(?=\s|$))?\s*(₴|грн\.?|гривень|гривні|гривня|uah)/giu;
  for (const text of texts) {
    for (const clause of String(text).split(/[.;!?\n,]+/)) {
      const c = clause.toLowerCase();
      for (const m of clause.matchAll(money)) {
        let v = toNum(m[1]);
        if (m[2]) v *= 1000;
        if (!Number.isFinite(v) || v <= 0) continue;
        if (/старт|заощадж|бюджет|вклад|потрібно на|треба на|накопич|позич|дадуть|інвест|кредит|грант/.test(c)) f.start = v;
        else if (/собівартіст|обходит|витрат|закуп|інгредієнт|матеріал|сировин|пластик|упаковк|борошн|на одну|на 1 /.test(c)) f.cost = v;
        else if (/оренд/.test(c)) f.rent = v;
        else if (/прода|ціна|ціну|ціною|по \d|за штуку|за шт|коштуват|коштує|коштують|плати|заплат|за одну|за порці/.test(c)) f.price = v;
      }
      const day = c.match(/(\d{1,4})\s*(?:штук\p{L}*|шт\.?|порці\p{L}*|булоч\p{L}*|чохл\p{L}*|виріб\p{L}*|виробів|замовлен\p{L}*|чаш\p{L}*|піц\p{L}*|торт\p{L}*|свіч\p{L}*|прогулян\p{L}*|клієнт\p{L}*|собак|урок\p{L}*|занять|кав\p{L}*)?[^\d]{0,20}?(на день|за день|в день|щодня|за ранок|на добу|за вечір)/u);
      if (day) f.perDay = toNum(day[1]);
      const week = !day && c.match(/(\d{1,4})\s*(?:штук\p{L}*|шт\.?|порці\p{L}*|виробів|замовлен\p{L}*|клієнт\p{L}*|прогулян\p{L}*|урок\p{L}*)?[^\d]{0,20}?(на тиждень|за тиждень|щотижня)/u);
      if (week) f.perDay = Math.max(1, Math.round(toNum(week[1]) / 5));
      const aud = c.match(/(\d[\d\s  ]{0,6}\d|\d+)\s*(учн\p{L}*|людей|людин\p{L}*|школяр\p{L}*|студент\p{L}*|мешкан\p{L}*|підписник\p{L}*|клієнт\p{L}*|покупц\p{L}*|осіб|сусід\p{L}*|працівник\p{L}*|дітей|власник\p{L}*|квартир)/u);
      if (aud && !/на день|за день|щодня|тиждень/.test(c)) {
        const v = toNum(aud[1]);
        if (v >= 20) f.audience = v;
      }
      const pct = c.match(/(\d{1,3})\s*%/);
      if (pct) f.percent = toNum(pct[1]);
    }
    for (const [re, label] of CHANNELS) if (re.test(text) && !f.channels.includes(label)) f.channels.push(label);
    if (/фоп|підприєм/i.test(text)) f.fop = true;
    if (/батьк|мам[аиоу](?!\p{L})|(?<!\p{L})тат[оуа](?!\p{L})/iu.test(text)) f.parents = true;
  }
  return f;
}

function plural(n, forms) {
  const a = Math.abs(Math.round(n)) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}

function money(n) {
  const v = Math.abs(n) < 100 && n % 1 ? n.toFixed(1).replace(".", ",") : Math.round(n).toLocaleString("uk-UA");
  return `${v} ₴`;
}

const count = (n) => Math.round(n).toLocaleString("uk-UA");

// Розрахунки на цифрах гравця для підстановок у репліки.
function numbersCtx(f) {
  const ctx = {};
  if (f.price) ctx.price = money(f.price);
  if (f.cost) ctx.cost = money(f.cost);
  if (f.start) ctx.start = money(f.start);
  if (f.perDay) ctx.perDay = `${count(f.perDay)} ${plural(f.perDay, ["штука", "штуки", "штук"])}`;
  if (f.audience) {
    ctx.audience = `${count(f.audience)} ${plural(f.audience, ["людина", "людини", "людей"])}`;
    const five = Math.max(1, Math.round(f.audience / 20));
    ctx.audience5 = `${count(five)} ${plural(five, ["покупець", "покупці", "покупців"])}`;
  }
  if (f.channels.length) ctx.channel = f.channels[f.channels.length - 1];
  if (f.price && f.cost) {
    const margin = f.price - f.cost;
    if (margin > 0) {
      const pct = Math.round((margin / f.price) * 100);
      ctx.margin = money(margin);
      ctx.marginPct = pct;
      ctx.marginNote =
        pct < 20
          ? "Це тонко: одна невдала партія — і прибутку немає."
          : pct < 55
            ? "Для старту — цілком робоча маржа."
            : "Маржа щедра. Аж підозріло: перевір, чи врахована упаковка, брак і доставка.";
      if (f.start) {
        const units = Math.ceil(f.start / margin);
        ctx.units = `${count(units)} ${plural(units, ["штуку", "штуки", "штук"])}`;
        if (f.perDay) {
          const days = Math.max(1, Math.ceil(units / f.perDay));
          ctx.days =
            days <= 30 ? `${days} ${plural(days, ["день", "дні", "днів"])}` : `${Math.round(days / 30)} ${plural(Math.round(days / 30), ["місяць", "місяці", "місяців"])}`;
        }
      }
      if (f.perDay) ctx.month = money(margin * f.perDay * 20);
    } else {
      ctx.loss = money(f.cost - f.price);
      ctx.isLoss = true;
    }
  }
  if (f.perDay && f.audience && f.perDay < f.audience) ctx.ratio = Math.max(2, Math.round(f.audience / f.perDay));
  if (f.fop) ctx.fop = true;
  if (f.parents) ctx.parents = true;
  return ctx;
}

function shortIdea(idea) {
  const s = String(idea || "твою ідею").trim().replace(/[.!?]+$/, "");
  return cutWords(s.split(/[.!?\n]/)[0], 60);
}

function cutWords(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n / 2 ? cut.slice(0, sp) : cut).replace(/[\s,;:–-]+$/, "") + "…";
}

function baseCtx(state) {
  const p = state.player || {};
  return {
    name: p.name && p.name !== "Засновник" ? p.name : "Засновнику",
    idea: "«" + shortIdea(state.idea) + "»",
    city: (p.city || "").trim(),
    budget: BUDGETS.find((b) => b.id === p.budget)?.label,
    minor: p.age === "u14" || p.age === "teen",
  };
}

// Як звертаються до попереднього мовця і як говорить поточний (рід).
function voiceCtx(ctx, speaker, prev) {
  const p = NAMES[prev];
  const me = NAMES[speaker];
  return {
    ...ctx,
    prevVoc: p?.voc,
    prevAcc: p?.acc,
    prevIns: p?.ins,
    prevGen: p?.gen,
    prevTook: p && (p.f ? "забрала" : "забрав"),
    prevStrict: p && (p.f ? "суворою" : "суворим"),
    meAgree: me.f ? "Згодна" : "Згоден",
    meConvinced: me.f ? "переконана" : "переконаний",
    meAdvised: me.f ? "порадила" : "порадив",
  };
}

// ---------- оцінка відповіді ----------

function detectBlocks(text) {
  return BLOCK_IDS.filter((id) => DETECT[id].test(text));
}

function grade(answer, askedBlocks) {
  const text = String(answer || "").trim();
  const len = text.length;
  const facts = readFacts([text]);
  const factCount = ["price", "cost", "start", "perDay", "audience", "percent"].filter((k) => facts[k]).length;
  const blocks = detectBlocks(text);
  const hitAsked = !askedBlocks.length || askedBlocks.some((b) => blocks.includes(b));
  const vague = (text.match(VAGUE) || []).length;
  let s = 0;
  if (len >= 40) s++;
  if (len >= 110) s++;
  if (/\d/.test(text)) s++;
  if (factCount >= 2) s++;
  if (blocks.length >= 2) s++;
  if (hitAsked && askedBlocks.length) s++;
  s -= Math.min(2, vague);
  const tier = len < 20 || s <= 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : 3;
  return { tier, blocks, hitAsked, facts, factCount };
}

// Питання, на які гравець щойно відповідав.
function lastAsked(transcript) {
  let i = transcript.length - 1;
  while (i >= 0 && transcript[i].who !== "player") i--;
  const qs = [];
  for (let j = i - 1; j >= 0 && transcript[j].who !== "player"; j--) {
    if (transcript[j].q) qs.unshift(transcript[j]);
  }
  return qs.map((q) => ({ who: q.who, block: BLOCK_IDS.includes(q.block) ? q.block : detectBlocks(q.text)[0] })).filter((q) => q.block);
}

const MOOD = { 3: ["happy", "excited"], 2: ["thinking", "neutral"], 1: ["skeptical", "thinking"], 0: ["worried", "skeptical"] };
const moodFor = (tier) => MOOD[tier][Math.floor(Math.random() * 2)];

// Фраза з цифрами від конкретного директора, якщо гравець дав щось нове.
function factLine(who, now, ctx) {
  const F = D.FACTS[who];
  const pools = [];
  if (who === "cfo") {
    const moneyNow = now.price || now.cost || now.start || now.perDay;
    if (!moneyNow) return null;
    if (ctx.isLoss) pools.push("loss");
    if (now.start && ctx.units) pools.push("breakeven");
    if (now.perDay && ctx.days) pools.push("payback");
    if ((now.price || now.cost) && ctx.margin) pools.push("margin");
    if (now.perDay && ctx.month) pools.push("month");
    if (now.price && !ctx.cost) pools.push("price");
    if (now.cost && !ctx.price) pools.push("cost");
    if (now.start && !ctx.units) pools.push("start");
  } else if (who === "cco") {
    if ((now.perDay || now.audience) && ctx.ratio) pools.push("ratio");
    if (now.audience) pools.push("audience");
    if (now.channels.length) pools.push("channel");
  } else if (who === "coo") {
    if (now.perDay) pools.push(now.perDay > 60 ? "perDayHigh" : "perDay");
  } else if (who === "lawyer") {
    if (now.fop) pools.push("fop");
    if (now.parents) pools.push("parents");
  }
  for (const pool of pools) {
    const line = pickText(`fact.${who}.${pool}`, F[pool], ctx);
    if (line) return line;
  }
  return null;
}

// ---------- питання і підказки ----------

function nextTopics(covered, avoid) {
  const open = BLOCK_IDS.filter((b) => !covered.has(b));
  if (!open.length) return [];
  // Трохи випадковості в порядку, щоб засідання не йшли за одним шаблоном.
  const head = open.slice(0, 3).sort(() => Math.random() - 0.5);
  const order = [...head, ...open.slice(3)];
  const fresh = order.filter((b) => !avoid.includes(b));
  return fresh.length ? fresh : order;
}

function makeQuestions(topics, ctx, isFinal) {
  if (isFinal || !topics.length) {
    const q = choose("final.q", D.FINAL_QUESTIONS, ([who, text]) => ({ who, text }));
    return q ? [q] : [];
  }
  const out = [];
  for (const block of topics) {
    if (out.length === 2) break;
    const q = choose(`q.${block}`, D.QUESTIONS[block], ([who, text]) =>
      out.some((x) => x.who === who) ? null : { who, text, block },
    );
    if (!q) continue;
    const lead = pickText(`lead.${q.who}`, D.LEADINS[q.who], ctx);
    out.push({ ...q, text: lead ? `${lead} ${q.text}` : q.text });
  }
  return out;
}

function makeHint(questions) {
  const block = questions[0]?.block || "final";
  return pickText(`hint.${block}`, D.HINTS[block] || D.HINTS.final, {}) || "";
}

// ---------- довіра ----------

function trustDeltas({ tier, blocks, hitAsked, facts }, asked, addressee) {
  const base = { 3: 8, 2: 4, 1: -2, 0: -7 }[tier];
  const out = {};
  for (const id of DIRECTOR_IDS) {
    let d = base;
    if (blocks.some((b) => BLOCK[b].owner === id)) d += 3;
    if (!hitAsked && asked.some((q) => q.who === id)) d -= 3;
    if (id === "cfo" && (facts.price || facts.cost || facts.start)) d += 2;
    if (id === addressee) d = Math.round(d * 1.3);
    d += Math.floor(Math.random() * 3) - 1;
    out[id] = Math.max(-15, Math.min(15, d));
  }
  return out;
}

// ---------- раунд наради ----------

function others(id) {
  return DIRECTOR_IDS.filter((x) => x !== id);
}

const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pitchTurn(state, ctx, category) {
  const messages = [];
  const order = [...DIRECTOR_IDS].sort(() => Math.random() - 0.5);
  if (ctx.minor) {
    // Юристка обов'язково нагадує про вік, якщо засновнику ще немає 18.
    order.splice(order.indexOf("lawyer"), 1);
    order.splice(1, 0, "lawyer");
  }
  for (const who of order.slice(0, 3)) {
    const P = D.PITCH[who];
    const pool = [
      ...P.general,
      ...(P[category] || []).map((t) => ({ t, pref: true })),
      ...(who === "lawyer" && ctx.minor ? P.minor.map((t) => ({ t, pref: true, minor: true })) : []),
    ];
    const text = choose(
      `pitch.${who}`,
      pool,
      (it) => fill(typeof it === "string" ? it : it.t, ctx),
      (it) => typeof it === "object" && (it.minor || it.pref),
    );
    messages.push({ who, mood: who === "cco" ? "excited" : who === "cfo" ? "skeptical" : "thinking", to: "player", text });
  }
  const debate = pickScript("pitch.debate", D.PITCH_DEBATES, ctx);
  if (debate) messages.push(...debate);
  return messages;
}

export function offlineTurn(state) {
  const transcript = state.transcript || [];
  const ctxBase = baseCtx(state);
  const category = categoryOf(state.idea);
  const playerTexts = transcript.filter((m) => m.who === "player").map((m) => m.text);
  const factsAll = readFacts(playerTexts);
  const ctx = { ...ctxBase, ...numbersCtx(factsAll) };
  const action = state.action || "answer";
  const covered = new Set(state.covered || []);
  const isFinal = (Number(state.round) || 0) + 1 >= MAX_ROUNDS;

  let messages = [];
  let quality = 1;
  let trust = Object.fromEntries(DIRECTOR_IDS.map((id) => [id, 0]));
  let askedNow = [];

  if (action === "pitch") {
    const pitch = playerTexts[0] || state.idea || "";
    for (const b of detectBlocks(pitch)) covered.add(b);
    if (pitch.length > 40) covered.add("product");
    quality = pitch.length > 140 ? 3 : pitch.length > 60 ? 2 : 1;
    const d = { 3: 4, 2: 1, 1: -2 }[quality];
    trust = Object.fromEntries(DIRECTOR_IDS.map((id) => [id, d + Math.floor(Math.random() * 3) - 1]));
    messages = pitchTurn(state, ctx, category);
  } else if (action === "dontknow") {
    askedNow = lastAsked(transcript);
    const block = askedNow[0]?.block || BLOCK_IDS.find((b) => !covered.has(b)) || "product";
    const owner = BLOCK[block].owner;
    const praise = choose("dk.praise", D.DONTKNOW.praise, ([who, text]) => (who === owner ? null : { who, text }));
    const method = pickText(`dk.method.${block}`, D.DONTKNOW.methods[block], ctx);
    const option = pickText(`dk.option.${block}`, D.DONTKNOW.options[block], ctx);
    const helper = randomOf(others(owner).filter((w) => w !== praise?.who));
    if (praise) messages.push({ who: praise.who, mood: "happy", to: "player", text: praise.text });
    if (method) messages.push({ who: owner, mood: "thinking", to: "player", text: method });
    if (option) messages.push({ who: helper, mood: "neutral", to: "player", text: option });
    quality = 1;
    trust = Object.fromEntries(DIRECTOR_IDS.map((id) => [id, id === owner ? 2 : 1]));
  } else {
    const answer = playerTexts[playerTexts.length - 1] || "";
    askedNow = lastAsked(transcript);
    const g = grade(answer, askedNow.map((q) => q.block));
    quality = g.tier;
    for (const b of g.blocks) covered.add(b);
    trust = trustDeltas(g, askedNow, state.addressee);

    // 1. Перша реакція: той, кому відповідали, або той, хто питав.
    const first =
      state.addressee ||
      askedNow.find((q) => g.blocks.includes(q.block))?.who ||
      askedNow[0]?.who ||
      (g.blocks[0] && BLOCK[g.blocks[0]].owner) ||
      randomOf(DIRECTOR_IDS);
    const fctx = voiceCtx(ctx, first, null);
    // Відповідь не на те питання: той, хто питав, це помічає (крім відверто порожніх відповідей).
    const missedQ = !g.hitAsked && g.tier >= 1 && askedNow.find((q) => q.who === first);
    const parts = missedQ
      ? [pickText(`missed.${first}`, D.MISSED[first], { ...fctx, asked: ASKED[missedQ.block], askedGen: ASKED_GEN[missedQ.block] })]
      : [pickText(`open.${g.tier}.${first}`, D.OPENERS[g.tier][first], fctx)];
    const fl = factLine(first, g.facts, ctx);
    if (fl) parts.push(fl);
    messages.push({ who: first, mood: missedQ ? "skeptical" : moodFor(g.tier), to: "player", text: parts.filter(Boolean).join(" ") });

    // 2. Цифри коментує той, хто їх найкраще розуміє.
    const factSpeakers = ["cfo", "cco", "coo", "lawyer"].filter((w) => w !== first);
    for (const w of factSpeakers) {
      if (messages.length >= 3) break;
      const line = factLine(w, g.facts, ctx);
      if (!line) continue;
      const lead = pickText(`factlead.${w}`, D.FACT_LEADS[w], ctx);
      messages.push({ who: w, mood: g.tier >= 2 ? "thinking" : "skeptical", to: "player", text: lead ? `${lead} ${line}` : line });
    }

    // 3. Друга думка, якщо поки говорив лише один.
    if (messages.length === 1 || (Math.random() < 0.5 && messages.length < 3)) {
      const free = others(first).filter((w) => !messages.some((m) => m.who === w));
      const second = randomOf(free.length ? free : others(first));
      if (second) {
        const t = pickText(`second.${g.tier}`, D.SECOND[g.tier], voiceCtx(ctx, second, first));
        if (t) messages.push({ who: second, mood: moodFor(g.tier), to: first, text: t });
      }
    }

    // 4. Віхи бізнес-карти.
    const before = (state.covered || []).length;
    for (const mark of [8, 5]) {
      if (before < mark && covered.size >= mark) {
        const last = messages[messages.length - 1]?.who;
        const m = choose(`mile.${mark}`, D.MILESTONES[mark], ([who, mood, text]) => (who === last ? null : { who, mood, to: "all", text }));
        if (m) messages.push(m);
        break;
      }
    }
  }

  // Подія раунду або суперечка про наступну тему.
  const topics = nextTopics(covered, []);
  if (state.event && D.EVENT_SCRIPTS[state.event.title]) {
    const s = pickScript(`event.${state.event.title}`, D.EVENT_SCRIPTS[state.event.title], ctx);
    if (s) messages.push(...s);
  } else if (action !== "pitch" && topics.length) {
    const topic = topics[0];
    const pool = [...D.DEBATES[topic].map((s) => ({ s, pref: true })), ...D.DEBATES.general.map((s) => ({ s }))];
    const s = choose(
      `debate.${topic}`,
      pool,
      ({ s }) => {
        const out = [];
        for (const [who, mood, to, text] of s) {
          const t = fill(text, ctx);
          if (t == null) return null;
          out.push({ who, mood, to, text: t });
        }
        return out;
      },
      (it) => it.pref,
    );
    if (s) messages.push(...s);
  }

  // Іноді хтось жартує.
  if (action === "answer" && messages.length < 7 && Math.random() < 0.35) {
    const last = messages[messages.length - 1]?.who;
    const q = choose("quip", D.QUIPS, ([who, mood, text]) => (who === last ? null : { who, mood, to: "all", text }));
    if (q) messages.push(q);
  }

  if (isFinal && messages.length < 8) {
    const last = messages[messages.length - 1]?.who;
    const f = choose("final.remark", D.FINAL_REMARKS, ([who, mood, text]) => (who === last ? null : { who, mood, to: "player", text }));
    if (f) messages.push(f);
  }

  const questions = makeQuestions(
    nextTopics(covered, askedNow.map((q) => q.block).filter((b) => covered.has(b))),
    ctx,
    isFinal || covered.size === BLOCK_IDS.length,
  );
  const hint = makeHint(questions);
  saveMemory();

  return {
    messages: messages.filter((m) => m && m.text).slice(0, 8),
    questions,
    trust,
    covered: [...covered],
    quality: Math.max(0, Math.min(3, quality)),
    hint,
  };
}

// ---------- голосування ----------

export function offlineVerdict(state) {
  const transcript = state.transcript || [];
  const ctxBase = baseCtx(state);
  const category = categoryOf(state.idea);
  const playerTexts = transcript.filter((m) => m.who === "player").map((m) => m.text);
  const facts = readFacts(playerTexts);
  const ctx = { ...ctxBase, ...numbersCtx(facts) };
  const covered = new Set(state.covered || []);
  const t = state.trust || {};

  // Середня якість відповідей (без пітчу).
  const grades = [];
  for (let i = 0; i < transcript.length; i++) {
    const m = transcript[i];
    if (m.who !== "player" || m.pitch || /^Чесно: я поки не знаю/.test(m.text)) continue;
    grades.push(grade(m.text, lastAsked(transcript.slice(0, i + 1)).map((q) => q.block)).tier);
  }
  const avgTier = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 1;
  const avgTrust = DIRECTOR_IDS.reduce((s, id) => s + (t[id] ?? 50), 0) / DIRECTOR_IDS.length;

  const score = Math.max(5, Math.min(98, Math.round(covered.size * 5 + avgTier * 10 + (avgTrust - 50) * 0.6 + 10 - (ctx.isLoss ? 15 : 0))));

  // Голос кожного директора: його власна довіра плюс загальна оцінка проєкту.
  const votes = DIRECTOR_IDS.map((id) => {
    const v = (t[id] ?? 50) * 0.5 + score * 0.5 + (avgTier - 1.5) * 6;
    const vote = v >= 70 ? "invest" : v >= 45 ? "rework" : "pass";
    let comment = pickText(`v.${id}.${vote}`, D.VERDICT.comments[id][vote], ctx);
    if (id === "cfo" && ctx.isLoss) comment += ` І головне: зараз собівартість ${ctx.cost} вища за ціну ${ctx.price}.`;
    else if (id === "cfo" && ctx.margin && vote !== "pass") comment += ` Маржа ${ctx.margin} зі штуки — хороша основа.`;
    if (id === "coo" && ctx.perDay && vote !== "pass") comment += ` План ${ctx.perDay} на день — тримаю тебе за слово.`;
    return { who: id, vote, comment };
  });

  const tierKey = score >= 85 ? "top" : score >= 70 ? "good" : score >= 50 ? "mid" : score >= 30 ? "low" : "weak";
  const summary =
    pickText(`sum.${tierKey}`, D.VERDICT.summary[tierKey], ctx) +
    ` Відкрито ${covered.size} з ${BLOCK_IDS.length} блоків бізнес-карти.`;

  const titlePool = [...(D.VERDICT.titles[category] || []), ...D.VERDICT.titles.general];
  const title = pickText(`title.${category}`, titlePool, ctx) || shortIdea(state.idea);

  const strengths = [];
  for (const b of BLOCK_IDS.filter((x) => covered.has(x))) {
    const s = pickText(`str.${b}`, D.VERDICT.strengths[b], ctx);
    if (s) strengths.push(s);
  }
  strengths.sort((a, b) => /\d/.test(b) - /\d/.test(a));
  const risks = [];
  if (ctx.isLoss) risks.push(`Ціна нижча за собівартість: мінус ${ctx.loss} з кожної штуки`);
  else if (ctx.marginPct && ctx.marginPct < 20) risks.push(`Тонка маржа: лише ${ctx.marginPct}% від ціни`);
  for (const b of BLOCK_IDS.filter((x) => !covered.has(x))) {
    const r = pickText(`risk.${b}`, D.VERDICT.risks[b], ctx);
    if (r) risks.push(r);
  }
  while (risks.length < 2) {
    const r = pickText("risk.general", D.VERDICT.risks.general, ctx);
    if (!r || risks.includes(r)) break;
    risks.push(r);
  }
  const homework = [];
  if (ctx.isLoss) homework.push(fill(D.VERDICT.homework.loss[0], ctx));
  for (const b of BLOCK_IDS.filter((x) => !covered.has(x))) {
    if (homework.length >= 4) break;
    const h = pickText(`hw.${b}`, D.VERDICT.homework[b], ctx);
    if (h) homework.push(h);
  }
  while (homework.length < 4) {
    const h = pickText("hw.general", D.VERDICT.homework.general, ctx);
    if (!h || homework.includes(h)) break;
    homework.push(h);
  }

  const card = BLOCKS.map((b) => ({ block: b.id, text: cardText(b, covered, ctx, playerTexts) }));
  saveMemory();

  return {
    title,
    votes,
    score,
    summary,
    strengths: strengths.slice(0, 4).length ? strengths.slice(0, 4) : ["Сміливість принести ідею на раду"],
    risks: risks.slice(0, 4),
    homework: homework.filter(Boolean).slice(0, 5),
    card,
  };
}

function cardText(b, covered, ctx, playerTexts) {
  const facts = {
    market: ctx.audience && `Близько ${ctx.audience} потенційних покупців.`,
    channels: ctx.channel && `Канал продажу: ${ctx.channel}.`,
    production: ctx.perDay && `План: ${ctx.perDay} на день.`,
    cost: ctx.cost && `Собівартість: ${ctx.cost} за штуку.`,
    price: ctx.price && (ctx.margin ? `Ціна ${ctx.price}, маржа ${ctx.margin} (${ctx.marginPct}%).` : `Ціна: ${ctx.price}.`),
    money: ctx.start && (ctx.units ? `На старт ${ctx.start}, окупність після ${ctx.units}.` : `На старт: ${ctx.start}.`),
    legal: ctx.fop && "Оформлення через ФОП.",
  };
  if (facts[b.id]) return facts[b.id];
  if (covered.has(b.id)) {
    for (const text of playerTexts) {
      const sentence = String(text).split(/(?<=[.!?])\s+/).find((s) => DETECT[b.id].test(s));
      if (sentence) return `«${cutWords(sentence.trim(), 140)}»`;
    }
    return "Обговорено на нараді, деталі в стенограмі.";
  }
  return `Ще не вирішено: ${b.hint}.`;
}
