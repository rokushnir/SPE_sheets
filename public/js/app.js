import {
  DIRECTORS,
  DIRECTOR_BY_ID,
  DIRECTOR_IDS,
  BLOCKS,
  BUDGETS,
  DIFFICULTIES,
  MAX_ROUNDS,
  MIN_ROUNDS_FOR_VOTE,
} from "./characters.js";
import { avatarSVG, playerSVG } from "./avatar.js";
import { boardTurn, boardVerdict, detectProvider, onProviderChange, getProvider, BoardError } from "./ai.js";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "rada-directoriv:v1";
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const DATIVE = { cfo: "Марті", cco: "Тарасу", lawyer: "Ірині", coo: "Богдану", player: "тобі", all: "всім" };

const EXAMPLE_IDEAS = [
  "Пекти булочки з корицею і продавати біля школи зранку",
  "Друкувати кастомні чохли для телефонів на 3D-принтері",
  "Вигулювати собак у своєму районі після уроків",
  "Перешивати старий одяг у модні речі і продавати онлайн",
  "Кав'ярня на колесах біля університету",
  "Мобільна гра-вікторина з історії України",
];

const EVENTS = [
  { title: "Сировина подорожчала", text: "Ціни на основні матеріали та інгредієнти за тиждень зросли на 20%." },
  { title: "Блогер пропонує співпрацю", text: "Місцевий блогер із 30 тисячами підписників хоче розповісти про тебе, але просить безкоштовний продукт і гонорар." },
  { title: "Поруч відкрився конкурент", text: "Через дорогу з'явився схожий бізнес, і там ціни на 15% нижчі." },
  { title: "Велике замовлення", text: "Тобі пропонують замовлення на 100 штук до п'ятниці. Це втричі більше, ніж ти зазвичай робиш." },
  { title: "Поганий відгук", text: "Покупець виклав у соцмережі злий відгук: товар зіпсувався, і пост набрав 300 вподобайок." },
  { title: "Зламалось обладнання", text: "Головний інструмент чи обладнання вийшли з ладу на піку сезону. Ремонт займе тиждень." },
  { title: "Запрошення на ярмарок", text: "Шкільний ярмарок пропонує безкоштовне місце, але треба підготувати товар на цілий день продажу." },
];
const EVENT_ROUNDS = [2, 4];

const LEVELS = [
  { xp: 0, name: "Мрійник" },
  { xp: 60, name: "Стажер" },
  { xp: 140, name: "Засновник" },
  { xp: 240, name: "Підприємець" },
  { xp: 360, name: "CEO" },
  { xp: 500, name: "Магнат" },
];

const ACHIEVEMENTS = [
  { id: "pitch", name: "Перший пітч", desc: "Представ ідею раді", mark: "П" },
  { id: "numbers", name: "Рахівник", desc: "Дай три відповіді з цифрами", mark: "₴" },
  { id: "honest", name: "Чесна відповідь", desc: "Скажи «не знаю» замість вигадок", mark: "?" },
  { id: "client", name: "Знаю свого клієнта", desc: "Відкрий «Клієнт» і «Ринок»", mark: "К" },
  { id: "factory", name: "Цех запущено", desc: "Відкрий «Виробництво» і «Собівартість»", mark: "Ц" },
  { id: "legal", name: "Чистий бізнес", desc: "Відкрий блок «Закон»", mark: "§" },
  { id: "convinced", name: "Переконав скептика", desc: "Довіра будь-кого з ради 80+", mark: "!" },
  { id: "fullmap", name: "Повна карта", desc: "Відкрий усі 10 блоків", mark: "10" },
  { id: "shark", name: "Пережив акул", desc: "Дійди до голосування в режимі «Акули»", mark: "А" },
  { id: "unanimous", name: "Одноголосно", desc: "Усі четверо кажуть «вкладаюсь»", mark: "4" },
];

const VOTE_LABEL = { invest: "Вкладаюсь", rework: "Доопрацювати", pass: "Пас" };

// ---------- стан ----------

function freshState() {
  return {
    v: 1,
    screen: "lobby",
    player: { name: "", city: "", age: "teen", budget: "zero" },
    idea: "",
    difficulty: "kind",
    round: 0,
    transcript: [],
    covered: [],
    trust: Object.fromEntries(DIRECTOR_IDS.map((id) => [id, 50])),
    questions: [],
    hint: "",
    hintShown: false,
    xp: 0,
    achievements: [],
    stats: { numbers: 0 },
    usedEvents: [],
    verdict: null,
    addressee: null,
    pending: null,
  };
}

let state = freshState();
let busy = false;
let controller = null;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.v === 1 ? s : null;
  } catch {
    return null;
  }
}
function clearSaved() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
}

const aiState = (extra = {}) => ({
  player: state.player,
  idea: state.idea,
  difficulty: state.difficulty,
  round: state.round,
  covered: state.covered,
  trust: state.trust,
  transcript: state.transcript,
  ...extra,
});

// ---------- допоміжне ----------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

function levelFor(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return { ...cur, next, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

function toast(text, kind = "") {
  const t = el("div", { class: `toast ${kind}` }, text);
  $("toasts").append(t);
  setTimeout(() => t.classList.add("toast--out"), 2600);
  setTimeout(() => t.remove(), 3200);
}

function addXP(n, why) {
  if (!n) return;
  const before = levelFor(state.xp).name;
  state.xp = Math.max(0, state.xp + n);
  const after = levelFor(state.xp).name;
  toast(`${n > 0 ? "+" : ""}${n} XP · ${why}`, n > 0 ? "toast--xp" : "toast--minus");
  if (after !== before && n > 0) toast(`Новий рівень: ${after}`, "toast--level");
  renderLevel();
}

function unlock(id) {
  if (state.achievements.includes(id)) return;
  state.achievements.push(id);
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  toast(`Досягнення: ${a.name}`, "toast--ach");
  state.xp += 20;
  renderLevel();
  renderAchievements();
}

function checkAchievements() {
  const c = new Set(state.covered);
  if (state.transcript.some((m) => m.who === "player")) unlock("pitch");
  if (state.stats.numbers >= 3) unlock("numbers");
  if (c.has("customer") && c.has("market")) unlock("client");
  if (c.has("production") && c.has("cost")) unlock("factory");
  if (c.has("legal")) unlock("legal");
  if (DIRECTOR_IDS.some((id) => state.trust[id] >= 80)) unlock("convinced");
  if (c.size === BLOCKS.length) unlock("fullmap");
}

// ---------- відображення: шапка ----------

function renderLevel() {
  const lv = levelFor(state.xp);
  $("levelBox").hidden = state.screen === "lobby";
  $("levelName").textContent = lv.name;
  $("xpValue").textContent = `${state.xp} XP`;
  $("levelFill").style.width = `${Math.round(lv.progress * 100)}%`;
  $("levelBox").title = lv.next ? `До рівня «${lv.next.name}»: ${lv.next.xp - state.xp} XP` : "Максимальний рівень";
}

onProviderChange((p) => {
  const b = $("providerBadge");
  b.textContent = p.label;
  b.dataset.kind = p.id;
  $("providerNote").textContent =
    p.id === "offline"
      ? `${p.note} Щоб директори відповідали по-справжньому, запусти гру через сервер із ключем Anthropic API (дивись README) або відкрий її як артефакт у claude.ai.`
      : p.note;
});
$("providerBadge").addEventListener("click", () => {
  const n = $("providerNote");
  n.hidden = !n.hidden;
});

// ---------- лобі ----------

function renderLobby() {
  const prev = $("boardPreview");
  prev.replaceChildren(
    ...DIRECTORS.map((d, i) =>
      el(
        "article",
        { class: `persona persona--${d.id}`, style: `--i:${i}` },
        el("div", { class: "persona__ava", html: avatarSVG(d.id, ["skeptical", "excited", "thinking", "worried"][i], { title: d.name }) }),
        el(
          "div",
          { class: "persona__text" },
          el("p", { class: "persona__role" }, el("span", { class: "tag" }, d.tag), " ", d.role),
          el("h3", {}, d.name),
          el("p", { class: "persona__bio" }, d.bio),
          el("p", { class: "persona__motto" }, `«${d.motto}»`),
        ),
      ),
    ),
  );

  $("ideaChips").replaceChildren(
    ...EXAMPLE_IDEAS.map((idea) =>
      el(
        "button",
        {
          type: "button",
          class: "chip",
          onclick: () => {
            $("idea").value = idea;
            $("ideaError").hidden = true;
            $("idea").focus();
          },
        },
        idea,
      ),
    ),
  );

  $("budgetGroup").replaceChildren(
    ...BUDGETS.map((b, i) =>
      el(
        "label",
        { class: "seg" },
        el("input", { type: "radio", name: "budget", value: b.id, id: `budget-${b.id}`, checked: i === 0 }),
        el("span", {}, b.label),
      ),
    ),
  );

  $("modeGroup").replaceChildren(
    ...DIFFICULTIES.map((d, i) =>
      el(
        "label",
        { class: `mode mode--${d.id}` },
        el("input", { type: "radio", name: "mode", value: d.id, id: `mode-${d.id}`, checked: i === 0 }),
        el("span", { class: "mode__name" }, d.label),
        el("span", { class: "mode__note" }, d.note),
      ),
    ),
  );

  const saved = load();
  $("resumeBtn").hidden = !(saved && saved.screen !== "lobby");
}

$("idea").addEventListener("input", () => ($("ideaError").hidden = true));

$("resumeBtn").addEventListener("click", () => {
  const saved = load();
  if (!saved) return;
  state = { ...freshState(), ...saved };
  if (state.screen === "verdict" && state.verdict) showVerdict();
  else showMeeting(true);
});

$("setupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const idea = $("idea").value.trim();
  if (idea.length < 8) {
    $("ideaError").hidden = false;
    $("idea").focus();
    return;
  }
  state = freshState();
  state.idea = idea;
  state.player = {
    name: $("playerName").value.trim() || "Засновник",
    city: $("city").value.trim(),
    age: $("age").value,
    budget: document.querySelector('input[name="budget"]:checked')?.value || "zero",
  };
  state.difficulty = document.querySelector('input[name="mode"]:checked')?.value || "kind";
  state.screen = "meeting";
  state.transcript.push({ who: "player", to: "all", text: idea, pitch: true });
  showMeeting(false);
  addXP(10, "ідею представлено");
  checkAchievements();
  requestTurn({ action: "pitch" });
});

$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  if (busy) controller?.abort();
  goLobby();
});

function goLobby() {
  save();
  state.screen = "lobby";
  showScreen("lobby");
  renderLobby();
  renderLevel();
}

function showScreen(id) {
  for (const s of ["lobby", "meeting", "verdict"]) $(s).hidden = s !== id;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

// ---------- нарада ----------

function renderSeats(speaking = null, deltas = {}) {
  $("seats").replaceChildren(
    ...DIRECTORS.map((d) => {
      const t = state.trust[d.id];
      const last = [...state.transcript].reverse().find((m) => m.who === d.id);
      const delta = deltas[d.id];
      return el(
        "button",
        {
          type: "button",
          class: `seat seat--${d.id}${speaking === d.id ? " is-speaking" : ""}${state.addressee === d.id ? " is-target" : ""}`,
          "aria-pressed": state.addressee === d.id ? "true" : "false",
          "aria-label": `${d.name}, ${d.role}. Довіра ${t} зі 100. Натисни, щоб відповісти саме їй або йому.`,
          onclick: () => setAddressee(state.addressee === d.id ? null : d.id),
        },
        el("span", { class: "seat__ava", html: avatarSVG(d.id, last?.mood || "neutral", { title: d.name }) }),
        el(
          "span",
          { class: "seat__info" },
          el("span", { class: "seat__name" }, d.short, " ", el("span", { class: "tag" }, d.tag)),
          el(
            "span",
            { class: "trust", title: "Довіра" },
            el("span", { class: "trust__bar" }, el("span", { class: "trust__fill", style: `width:${t}%` })),
            el("span", { class: "trust__num mono" }, String(t)),
            delta ? el("span", { class: `trust__delta mono ${delta > 0 ? "up" : "down"}` }, `${delta > 0 ? "+" : ""}${delta}`) : null,
          ),
        ),
      );
    }),
  );
}

function setAddressee(id) {
  state.addressee = id;
  $("toChip").textContent = id ? DATIVE[id] : "усім";
  $("toChip").dataset.who = id || "";
  $("toClear").hidden = !id;
  renderSeats();
  if (id) $("answer").focus();
}
$("toClear").addEventListener("click", () => setAddressee(null));

function renderRounds() {
  $("roundPips").replaceChildren(
    ...Array.from({ length: MAX_ROUNDS }, (_, i) =>
      el(
        "li",
        {
          class: i < state.round ? "done" : i === state.round ? "now" : "",
          title: EVENT_ROUNDS.includes(i) ? `Раунд ${i + 1}: картка події` : `Раунд ${i + 1}`,
        },
        el("span", { class: "visually-hidden" }, `Раунд ${i + 1}`),
        EVENT_ROUNDS.includes(i) ? el("span", { class: "pip-ev", "aria-hidden": "true" }, "!") : null,
      ),
    ),
  );
}

function renderMap(fresh = []) {
  const c = new Set(state.covered);
  $("mapCount").textContent = `${c.size}/${BLOCKS.length}`;
  $("map").replaceChildren(
    ...BLOCKS.map((b) =>
      el(
        "li",
        {
          class: `tile tile--${b.owner}${c.has(b.id) ? " is-open" : ""}${fresh.includes(b.id) ? " is-fresh" : ""}`,
          title: b.hint,
        },
        el("span", { class: "tile__label" }, b.label),
        el("span", { class: "tile__hint" }, c.has(b.id) ? "відкрито" : b.hint),
      ),
    ),
  );
}

function renderAchievements() {
  const own = new Set(state.achievements);
  $("achCount").textContent = `${own.size}/${ACHIEVEMENTS.length}`;
  $("achList").replaceChildren(
    ...ACHIEVEMENTS.map((a) =>
      el(
        "li",
        { class: `badge${own.has(a.id) ? " is-on" : ""}`, title: a.desc },
        el("span", { class: "badge__mark mono", "aria-hidden": "true" }, a.mark),
        el("span", { class: "badge__text" }, el("b", {}, a.name), el("small", {}, a.desc)),
      ),
    ),
  );
}

function bubble(m) {
  if (m.who === "event") {
    return el(
      "article",
      { class: "event" },
      el("p", { class: "event__kicker" }, "Картка події"),
      el("h4", {}, m.title),
      el("p", {}, m.text),
    );
  }
  if (m.who === "player") {
    return el(
      "article",
      { class: `msg msg--player${m.pitch ? " msg--pitch" : ""}` },
      el(
        "div",
        { class: "msg__body" },
        el(
          "header",
          {},
          el("b", {}, state.player.name || "Ти"),
          m.pitch ? el("span", { class: "tag" }, "ПІТЧ") : null,
          m.to && m.to !== "all" ? el("span", { class: "to" }, `→ ${DATIVE[m.to]}`) : null,
        ),
        el("p", {}, m.text),
      ),
      el("div", { class: "msg__ava", html: playerSVG(state.player.name) }),
    );
  }
  const d = DIRECTOR_BY_ID[m.who];
  return el(
    "article",
    { class: `msg msg--dir msg--${d.id}${m.q ? " msg--q" : ""}` },
    el("div", { class: "msg__ava", html: avatarSVG(d.id, m.q ? "thinking" : m.mood, { title: d.name }) }),
    el(
      "div",
      { class: "msg__body" },
      el(
        "header",
        {},
        el("b", {}, d.short),
        el("span", { class: "tag" }, d.tag),
        m.q ? el("span", { class: "qlabel" }, "питання до тебе") : m.to && m.to !== "all" ? el("span", { class: "to" }, `→ ${DATIVE[m.to]}`) : null,
      ),
      el("p", {}, m.text),
    ),
  );
}

function renderFeed() {
  $("feed").replaceChildren(...state.transcript.map(bubble));
  scrollFeed();
}

function scrollFeed() {
  const f = $("feed");
  f.scrollTo({ top: f.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
}

function renderAsks() {
  const box = $("asks");
  box.hidden = !state.questions.length || state.round >= MAX_ROUNDS;
  box.replaceChildren(
    el("p", { class: "asks__title" }, "Зараз чекають відповіді:"),
    ...state.questions.map((q) =>
      el(
        "button",
        {
          type: "button",
          class: `ask ask--${q.who}`,
          title: "Відповісти саме цьому директору",
          onclick: () => setAddressee(q.who),
        },
        el("b", {}, DIRECTOR_BY_ID[q.who].short + ": "),
        q.text,
      ),
    ),
  );
}

function renderComposer() {
  const over = state.round >= MAX_ROUNDS;
  $("answer").disabled = busy || over;
  $("sendBtn").disabled = busy || over;
  $("dontKnowBtn").disabled = busy || over || !state.questions.length;
  $("hintBtn").disabled = busy || over || !state.hint || state.hintShown;
  const canVote = state.round >= MIN_ROUNDS_FOR_VOTE;
  $("voteBtn").disabled = busy || !canVote;
  $("voteBtn").className = over ? "btn btn--primary btn--big" : "btn btn--ghost";
  $("voteBtn").title = canVote ? "" : `Голосування відкриється після ${MIN_ROUNDS_FOR_VOTE}-го раунду`;
  $("answer").placeholder = over
    ? "Час нарадитися завершився. Рада готова голосувати."
    : "Твоя відповідь. Чим конкретніше і з цифрами, тим більше довіри.";
  $("hintBox").hidden = !state.hintShown || !state.hint;
  $("hintBox").textContent = state.hint ? `Підказка: ${state.hint}` : "";
}

function showMeeting(resumed) {
  showScreen("meeting");
  $("ideaLine").textContent = state.idea;
  setAddressee(state.addressee || null);
  renderSeats();
  renderRounds();
  renderMap();
  renderAchievements();
  renderFeed();
  renderAsks();
  renderLevel();
  renderComposer();
  $("errorBox").hidden = true;
  if (resumed && state.pending) requestTurn(state.pending);
  save();
}

function typingRow(who) {
  const d = DIRECTOR_BY_ID[who];
  return el(
    "div",
    { class: `typing msg--${who}` },
    el("div", { class: "msg__ava", html: avatarSVG(who, "thinking", { title: d.name }) }),
    el("span", { class: "typing__dots", "aria-label": `${d.short} говорить` }, el("i"), el("i"), el("i")),
  );
}

function thinkingRow() {
  return el(
    "div",
    { class: "thinking", role: "status" },
    el("span", { class: "thinking__faces", html: DIRECTOR_IDS.map((id) => avatarSVG(id, "thinking")).join("") }),
    el("span", {}, "Рада радиться"),
    el("span", { class: "typing__dots" }, el("i"), el("i"), el("i")),
  );
}

async function requestTurn(req) {
  if (busy) return;
  busy = true;
  state.pending = req;
  $("errorBox").hidden = true;
  renderComposer();

  // Картка події на певних раундах
  if (req.action !== "pitch" && EVENT_ROUNDS.includes(state.round) && !req.event) {
    const left = EVENTS.filter((e) => !state.usedEvents.includes(e.title));
    const ev = left[Math.floor(Math.random() * left.length)] || EVENTS[0];
    state.usedEvents.push(ev.title);
    req.event = ev;
    const m = { who: "event", title: ev.title, text: ev.text };
    state.transcript.push(m);
    $("feed").append(bubble(m));
    scrollFeed();
    await sleep(700);
  }

  const wait = thinkingRow();
  $("feed").append(wait);
  scrollFeed();
  controller = new AbortController();

  let result;
  try {
    result = await boardTurn(aiState({ action: req.action, addressee: req.addressee, event: req.event }), controller.signal);
  } catch (e) {
    wait.remove();
    busy = false;
    if (e?.code === "cancelled" || e?.name === "AbortError") {
      renderComposer();
      return;
    }
    if (e instanceof BoardError && e.fallback) {
      toast(e.message, "toast--minus");
      requestTurn(req);
      return;
    }
    $("errorText").textContent = e instanceof BoardError ? e.message : "Рада заплуталась у власних думках. Спробуй ще раз.";
    $("errorBox").hidden = false;
    renderComposer();
    save();
    return;
  }
  wait.remove();

  // Репліки з'являються по черзі, як на справжній нараді
  for (const m of result.messages) {
    const t = typingRow(m.who);
    $("feed").append(t);
    renderSeats(m.who);
    scrollFeed();
    await sleep(Math.min(1600, 450 + m.text.length * 9));
    t.remove();
    state.transcript.push(m);
    $("feed").append(bubble(m));
    renderSeats(m.who);
    scrollFeed();
    await sleep(250);
  }
  for (const q of result.questions) {
    const m = { who: q.who, text: q.text, mood: "thinking", to: "player", q: true };
    state.transcript.push(m);
    $("feed").append(bubble(m));
    scrollFeed();
    await sleep(200);
  }

  // Довіра, бізнес-карта, досвід
  const deltas = {};
  for (const id of DIRECTOR_IDS) {
    const d = result.trust[id] || 0;
    state.trust[id] = Math.max(0, Math.min(100, state.trust[id] + d));
    if (d) deltas[id] = d;
  }
  const before = new Set(state.covered);
  state.covered = [...new Set([...state.covered, ...result.covered])];
  const fresh = state.covered.filter((b) => !before.has(b));

  state.questions = result.questions;
  state.hint = result.hint;
  state.hintShown = false;
  state.round += 1;
  state.pending = null;
  busy = false;

  renderSeats(null, deltas);
  renderMap(fresh);
  renderRounds();
  renderAsks();

  if (req.action === "answer") addXP(10 + result.quality * 5, ["відповідь прийнято", "непогано", "сильна відповідь", "чудова відповідь"][result.quality]);
  if (req.action === "dontknow") addXP(5, "чесність цінується");
  if (fresh.length) {
    const names = fresh.map((b) => BLOCKS.find((x) => x.id === b).label).join(", ");
    addXP(15 * fresh.length, `відкрито: ${names}`);
  }
  checkAchievements();

  if (state.round >= MAX_ROUNDS) {
    toast("Раунди закінчились. Час голосувати!", "toast--level");
  }
  renderComposer();
  save();
  if (!reduceMotion && state.round < MAX_ROUNDS) $("answer").focus({ preventScroll: true });
}

function sendAnswer() {
  const text = $("answer").value.trim();
  if (!text || busy) {
    if (!text) $("answer").focus();
    return;
  }
  const m = { who: "player", to: state.addressee || "all", text };
  state.transcript.push(m);
  $("feed").append(bubble(m));
  scrollFeed();
  if (/\d/.test(text)) state.stats.numbers += 1;
  $("answer").value = "";
  const addressee = state.addressee;
  setAddressee(null);
  requestTurn({ action: "answer", addressee });
}

$("sendBtn").addEventListener("click", sendAnswer);
$("answer").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendAnswer();
  }
});

$("dontKnowBtn").addEventListener("click", () => {
  if (busy) return;
  const m = { who: "player", to: "all", text: "Чесно: я поки не знаю відповіді на ці питання. Допоможіть розібратися." };
  state.transcript.push(m);
  $("feed").append(bubble(m));
  scrollFeed();
  unlock("honest");
  requestTurn({ action: "dontknow" });
});

$("hintBtn").addEventListener("click", () => {
  if (!state.hint || state.hintShown) return;
  state.hintShown = true;
  addXP(-5, "підказка");
  renderComposer();
  save();
});

$("retryBtn").addEventListener("click", () => {
  if (state.pending) requestTurn(state.pending);
});

$("voteBtn").addEventListener("click", () => {
  if (!busy && state.round >= MIN_ROUNDS_FOR_VOTE) startVote();
});

// ---------- голосування ----------

async function startVote() {
  busy = true;
  renderComposer();
  $("errorBox").hidden = true;
  const wait = thinkingRow();
  wait.lastElementChild.previousElementSibling.textContent = "Рада голосує";
  $("feed").append(wait);
  scrollFeed();
  controller = new AbortController();
  try {
    state.verdict = await boardVerdict(aiState(), controller.signal);
  } catch (e) {
    wait.remove();
    busy = false;
    if (e?.code === "cancelled" || e?.name === "AbortError") return renderComposer();
    if (e instanceof BoardError && e.fallback) {
      toast(e.message, "toast--minus");
      return startVote();
    }
    $("errorText").textContent = e instanceof BoardError ? e.message : "Голосування зірвалося. Спробуй ще раз.";
    $("errorBox").hidden = false;
    $("retryBtn").onclick = () => {
      $("retryBtn").onclick = null;
      startVote();
    };
    return renderComposer();
  }
  wait.remove();
  busy = false;

  const inv = state.verdict.votes.filter((v) => v.vote === "invest").length;
  state.xp += inv * 25 + Math.round(state.verdict.score / 2);
  if (state.difficulty === "sharks") unlock("shark");
  if (inv === DIRECTOR_IDS.length) unlock("unanimous");
  state.screen = "verdict";
  save();
  showVerdict(true);
}

function rankFor(score) {
  if (score >= 85) return "Готово до запуску";
  if (score >= 70) return "Майже інвестиційна";
  if (score >= 50) return "Перспективна чернетка";
  if (score >= 30) return "Сира ідея";
  return "Треба переосмислити";
}

function showVerdict(animate = false) {
  const v = state.verdict;
  showScreen("verdict");
  renderLevel();
  $("vTitle").textContent = v.title;
  $("vSummary").textContent = v.summary;
  $("vRank").textContent = rankFor(v.score);

  const num = $("vScore");
  if (animate && !reduceMotion) {
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1200);
      num.textContent = String(Math.round(v.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else num.textContent = String(v.score);

  $("vVotes").replaceChildren(
    ...v.votes.map((vote, i) => {
      const d = DIRECTOR_BY_ID[vote.who];
      const mood = vote.vote === "invest" ? "happy" : vote.vote === "pass" ? "skeptical" : "thinking";
      return el(
        "article",
        { class: `vote vote--${vote.who}`, style: `--i:${i}` },
        el("div", { class: "vote__ava", html: avatarSVG(vote.who, mood, { title: d.name }) }),
        el("p", { class: "vote__who" }, el("b", {}, d.name), el("span", {}, d.role)),
        el("p", { class: "vote__comment" }, vote.comment),
        el("span", { class: `stamp stamp--${vote.vote}` }, VOTE_LABEL[vote.vote]),
      );
    }),
  );

  const li = (s) => el("li", {}, s);
  $("vStrengths").replaceChildren(...v.strengths.map(li));
  $("vRisks").replaceChildren(...v.risks.map(li));
  $("vHomework").replaceChildren(
    ...v.homework.map((h, i) =>
      el("li", {}, el("label", {}, el("input", { type: "checkbox", id: `hw-${i}` }), el("span", {}, h))),
    ),
  );
  $("vCard").replaceChildren(
    ...v.card.map((c) => {
      const b = BLOCKS.find((x) => x.id === c.block);
      return el("div", { class: `card-item tile--${b.owner}` }, el("dt", {}, b.label), el("dd", {}, c.text));
    }),
  );
  const own = ACHIEVEMENTS.filter((a) => state.achievements.includes(a.id));
  $("vAch").replaceChildren(
    ...(own.length
      ? own.map((a) =>
          el(
            "li",
            { class: "badge is-on" },
            el("span", { class: "badge__mark mono", "aria-hidden": "true" }, a.mark),
            el("span", { class: "badge__text" }, el("b", {}, a.name), el("small", {}, a.desc)),
          ),
        )
      : [el("li", { class: "muted" }, "Цього разу без досягнень. Наступне засідання буде кращим!")]),
  );
  $("copyNote").textContent = "";
  $("copyFallback").hidden = true;
}

function protocolText() {
  const v = state.verdict;
  const lines = [
    `ПРОТОКОЛ ЗАСІДАННЯ РАДИ ДИРЕКТОРІВ`,
    `Проєкт: ${v.title}`,
    `Засновник: ${state.player.name}${state.player.city ? ", " + state.player.city : ""}`,
    `Ідея: ${state.idea}`,
    ``,
    `Оцінка: ${v.score}/100 (${rankFor(v.score)})`,
    v.summary,
    ``,
    `ГОЛОСУВАННЯ`,
    ...v.votes.map((x) => `- ${DIRECTOR_BY_ID[x.who].name}: ${VOTE_LABEL[x.vote]}. ${x.comment}`),
    ``,
    `БІЗНЕС-КАРТА`,
    ...v.card.map((c) => `- ${BLOCKS.find((b) => b.id === c.block).label}: ${c.text}`),
    ``,
    `СИЛЬНІ СТОРОНИ`,
    ...v.strengths.map((s) => `+ ${s}`),
    ``,
    `РИЗИКИ`,
    ...v.risks.map((s) => `! ${s}`),
    ``,
    `ДОМАШНЄ ЗАВДАННЯ`,
    ...v.homework.map((s, i) => `${i + 1}. ${s}`),
  ];
  return lines.join("\n");
}

$("copyBtn").addEventListener("click", async () => {
  const text = protocolText();
  try {
    await navigator.clipboard.writeText(text);
    $("copyNote").textContent = "Протокол скопійовано.";
  } catch {
    const ta = $("copyFallback");
    ta.value = text;
    ta.hidden = false;
    ta.focus();
    ta.select();
    $("copyNote").textContent = "Не вдалося скопіювати автоматично. Текст виділено нижче, скопіюй його вручну.";
  }
});

$("newBtn").addEventListener("click", () => {
  clearSaved();
  state = freshState();
  $("idea").value = "";
  goLobby();
});

// ---------- старт ----------

renderLobby();
renderLevel();
detectProvider();

const saved = load();
if (saved && saved.screen === "meeting" && saved.idea) {
  $("idea").value = saved.idea;
  $("playerName").value = saved.player?.name || "";
  $("city").value = saved.player?.city || "";
}
