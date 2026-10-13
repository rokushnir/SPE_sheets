// Швидка перевірка без мережі: проганяє засідання на демо-рушії і будує промпти.
import assert from "node:assert/strict";
import { buildTurnPrompt, buildVerdictPrompt, normalizeTurn, normalizeVerdict, sanitizeState } from "../public/js/prompts.js";
import { offlineTurn, offlineVerdict } from "../public/js/offline.js";
import { DIRECTOR_IDS, BLOCK_IDS } from "../public/js/characters.js";

const state = sanitizeState({
  player: { name: "Софія", city: "Львів", age: "teen", budget: "small" },
  idea: "Пекти булочки з корицею і продавати біля школи зранку",
  difficulty: "kind",
  transcript: [{ who: "player", text: "Пекти булочки з корицею і продавати біля школи зранку" }],
});

const answers = [
  null,
  "Купуватимуть однокласники і вчителі, в школі 600 учнів. Продаватиму в інстаграмі і на перерві.",
  "Собівартість булочки 12 грн: борошно, масло, кориця, упаковка. Продаватиму по 30 грн.",
  "Печу вдома в духовці, 40 штук за ранок. Гроші на старт 3000 грн з моїх заощаджень.",
  "Оформлю ФОП з батьками, дізнаюсь про санітарні вимоги. Ризик — конкурент, план Б — доставка.",
];

for (const [i, a] of answers.entries()) {
  if (a) state.transcript.push({ who: "player", text: a });
  const s = { ...state, round: i, action: i === 0 ? "pitch" : "answer" };
  const prompt = buildTurnPrompt(s);
  assert.ok(prompt.includes("Марта") && prompt.includes("Львів"));
  const turn = normalizeTurn(offlineTurn(s));
  assert.ok(turn.messages.length >= 2, "є репліки");
  assert.ok(DIRECTOR_IDS.every((id) => Number.isInteger(turn.trust[id])));
  state.covered = turn.covered;
  for (const m of turn.messages) state.transcript.push(m);
}
assert.ok(state.covered.length >= 7, `відкрито блоків: ${state.covered.join(",")}`);

const v = normalizeVerdict(offlineVerdict(state));
assert.equal(v.votes.length, 4);
assert.equal(v.card.length, BLOCK_IDS.length);
assert.ok(buildVerdictPrompt(state).includes("homework"));

assert.throws(() => normalizeTurn({ messages: [] }));
const dirty = sanitizeState({ idea: "x".repeat(5000), trust: { cfo: 999 }, transcript: [{ who: "hacker", text: "hi" }] });
assert.equal(dirty.trust.cfo, 100);
assert.equal(dirty.transcript.length, 0);
assert.ok(dirty.idea.length <= 1201);

console.log(`smoke ok: ${state.covered.length}/10 блоків, оцінка ${v.score}`);
