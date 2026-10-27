// Перевірка різноманітності демо-режиму: 15 ігор поспіль, як у реального гравця.
// Рахує, скільки реплік повторюється між сусідніми іграми.
//   node scripts/variety.js           — підсумок
//   node scripts/variety.js --show 1  — показати повну стенограму гри №1
import assert from "node:assert/strict";
import { offlineTurn, offlineVerdict, resetOfflineMemory } from "../public/js/offline.js";
import { normalizeTurn, normalizeVerdict } from "../public/js/prompts.js";
import { DIRECTOR_IDS, MAX_ROUNDS } from "../public/js/characters.js";

const IDEAS = [
  "Пекти булочки з корицею і продавати біля школи зранку",
  "Друкувати кастомні чохли для телефонів на 3D-принтері",
  "Вигулювати собак у своєму районі після уроків",
  "Перешивати старий одяг у модні речі і продавати онлайн",
  "Кав'ярня на колесах біля університету",
  "Мобільна гра-вікторина з історії України",
  "Вирощувати мікрозелень на підвіконні і продавати в кафе",
  "Робити свічки з соєвого воску з ароматами",
  "Репетиторство з англійської для молодших школярів",
  "Перепродавати вінтажні кросівки",
  "Лимонади власного рецепту на літніх фестивалях",
  "Фотосесії для випускників у парку",
  "Телеграм-бот, який нагадує про домашні завдання",
  "Мило ручної роботи з травами",
  "Ремонт велосипедів у гаражі",
];

const ANSWERS = [
  "Купуватимуть однокласники і вчителі, в школі 600 учнів. Продаватиму на перерві та в інстаграмі.",
  "Собівартість однієї штуки 12 грн: сировина і упаковка. Продаватиму по 30 грн, у конкурентів 35 грн.",
  "Вдома, 40 штук за ранок, обладнання вже є. Гроші на старт 3000 грн з моїх заощаджень.",
  "Оформлю ФОП разом із батьками, дізнаюсь про санітарні вимоги. Ризик — конкурент, план Б — доставка.",
  "Ну якось буде, всім сподобається",
  "не знаю",
  "Думаю продавати друзям, вони точно куплять.",
  "Мій покупець — мама з дитиною 5-10 років, яка поспішає зранку. Вона купує, коли немає часу на сніданок.",
  "Реклама в тікток і телеграм, перший пост — відео процесу. Доставка самовивозом біля школи.",
  "Конкурентів два, у них дорожче і менший вибір. У районі живе близько 5000 людей.",
  "Якщо замовлень стане більше, попрошу брата допомогти. Запас сировини на тиждень.",
  "Витрати на місяць близько 2000 грн, з них оренда 500 грн. Ціна 80 грн за штуку.",
  "Потім подумаю",
  "Буду робити 15 штук на день, на старт треба 5 тис грн, батьки дадуть у борг.",
];

function play(gameNo, rnd) {
  const idea = IDEAS[gameNo % IDEAS.length];
  const state = {
    player: { name: ["Софія", "Максим", "Дарина", "Ілля", "Олеся"][gameNo % 5], city: gameNo % 2 ? "Львів" : "", age: "teen", budget: "small" },
    idea,
    difficulty: "kind",
    round: 0,
    transcript: [{ who: "player", to: "all", text: idea, pitch: true }],
    covered: [],
    trust: Object.fromEntries(DIRECTOR_IDS.map((id) => [id, 50])),
  };
  const lines = [];
  const apply = (res) => {
    for (const m of res.messages) {
      state.transcript.push(m);
      lines.push(m);
    }
    for (const q of res.questions) {
      const m = { who: q.who, text: q.text, mood: "thinking", to: "player", q: true, block: q.block };
      state.transcript.push(m);
      lines.push(m);
    }
    for (const id of DIRECTOR_IDS) state.trust[id] = Math.max(0, Math.min(100, state.trust[id] + res.trust[id]));
    state.covered = [...new Set([...state.covered, ...res.covered])];
    state.round += 1;
  };
  apply(normalizeTurn(offlineTurn({ ...state, action: "pitch" })));
  const events = ["Сировина подорожчала", "Блогер пропонує співпрацю", "Поруч відкрився конкурент", "Велике замовлення", "Поганий відгук", "Зламалось обладнання", "Запрошення на ярмарок"];
  while (state.round < MAX_ROUNDS) {
    let event = null;
    if (state.round === 2 || state.round === 4) {
      const e = events[(gameNo * 2 + state.round) % events.length];
      event = { title: e, text: "…" };
      state.transcript.push({ who: "event", title: e, text: "…" });
    }
    const dontknow = rnd() < 0.12;
    if (dontknow) {
      state.transcript.push({ who: "player", to: "all", text: "Чесно: я поки не знаю відповіді на ці питання. Допоможіть розібратися." });
      apply(normalizeTurn(offlineTurn({ ...state, action: "dontknow", event })));
    } else {
      const text = ANSWERS[Math.floor(rnd() * ANSWERS.length)];
      state.transcript.push({ who: "player", to: "all", text });
      lines.push({ who: "player", text });
      apply(normalizeTurn(offlineTurn({ ...state, action: "answer", event })));
    }
  }
  const verdict = normalizeVerdict(offlineVerdict(state));
  return { state, lines, verdict };
}

function seeded(seed) {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

resetOfflineMemory();
const N = 15;
const games = [];
for (let g = 0; g < N; g++) games.push(play(g, seeded(g + 7)));

const show = process.argv.indexOf("--show");
if (show > 0) {
  const g = games[Number(process.argv[show + 1]) - 1];
  for (const m of g.lines) console.log(`${m.who === "player" ? "\n>>> ГРАВЕЦЬ" : m.who.toUpperCase()}${m.q ? " [питання]" : ""}: ${m.text}`);
  console.log("\nВЕРДИКТ:", JSON.stringify(g.verdict, null, 2));
  process.exit(0);
}

const textsOf = (g) => new Set(g.lines.filter((m) => m.who !== "player").map((m) => m.text));
let near = 0;
let far = 0;
let total = 0;
for (let i = 0; i < N; i++) {
  const mine = textsOf(games[i]);
  total += mine.size;
  for (let j = 0; j < i; j++) {
    const other = textsOf(games[j]);
    const dup = [...mine].filter((t) => other.has(t)).length;
    if (i - j <= 2) near += dup;
    far += dup;
  }
}
const scores = games.map((g) => g.verdict.score);
console.log(`Ігор: ${N}, реплік директорів: ${total}`);
console.log(`Повтори між сусідніми іграми (до 2 ігор назад): ${near}`);
console.log(`Повтори в межах усіх 15 ігор: ${far}`);
console.log(`Оцінки: ${scores.join(", ")}`);
assert.ok(near <= 6, `забагато повторів у сусідніх іграх: ${near}`);
assert.ok(far <= 120, `забагато повторів за 15 ігор: ${far}`);
console.log("variety ok");
if (process.argv.includes("--dups")) {
  for (let i = 0; i < N; i++) {
    const mine = textsOf(games[i]);
    for (let j = Math.max(0, i - 2); j < i; j++) {
      for (const t of mine) if (textsOf(games[j]).has(t)) console.log(`гра ${j + 1} → ${i + 1}: ${t}`);
    }
  }
}
