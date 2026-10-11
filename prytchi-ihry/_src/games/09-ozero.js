/* Гра 09 «Шлях до озера» — настільна гра з кубиком за притчею «Про лицаря і дракона». */
(function () {
  const COLS = 8, ROWS = 3, N = COLS * ROWS;
  const TYPES = { start: "🏁", heat: "☀️", spring: "⛲", tavern: "🍺", tourney: "⚔️", smith: "🔨", rest: "⛺", mirage: "🌫️", lake: "🏞️", plain: "" };
  const LAYOUT = ["start", "heat", "plain", "tavern", "spring", "heat", "tourney", "plain", "smith", "heat", "rest", "mirage", "tourney", "heat", "spring", "plain", "heat", "tavern", "tourney", "heat", "smith", "rest", "heat", "lake"];
  let S;

  function tilePos(i) {
    const row = Math.floor(i / COLS), col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
    return { x: 80 + col * 100, y: 150 + row * 135 };
  }

  const game = {
    id: "09", title: "Шлях до озера", parable: "Про лицаря і дракона",
    story: "Лицар у важких латах ішов під пекучим сонцем і побачив озеро. Біля озера сидів триголовий дракон. Три дні бився лицар і впав знесилений. Дракон спитав: «Лицарю, чого ти хотів?» — «Води попити». — «Ну то попив би».",
    goal: "Кидай кубик і йди до озера. Спека забирає сили, джерела їх повертають. Турніри дають славу, але виснажують. На твоїй картці великими літерами написано «ЛИЦАР», а на звороті дрібно — справжня мета.",
    controls: ["Пробіл або E — кинути кубик", "Q або Shift — перевернути картку лицаря", "У бою: Пробіл, коли стрілка в зеленій зоні"],
    help: "<kbd>Пробіл</kbd> кинути кубик · <kbd>Q</kbd> перевернути картку",
    actLabel: "Кубик", altLabel: "Картка", noMove: true,
    endings: {
      "А": { title: "Бився і впав", text: "Ти впав знесилений біля озера. Дракон нахилився: «Лицарю, чого ти хотів?» — «Води попити». — «Ну то попив би»." },
      "Б": { title: "Попросив води", text: "Дракон мовчки посунувся. Ти напився, зберіг сили, а дракон провів тебе стежкою далі. Ворог виявився союзником." },
      "В": { title: "Переміг дракона", text: "Три голови впали. І тоді озеро почало міліти: дракон охороняв джерело. Тобі дістався один ковток каламутної води." },
      "Г": { title: "Не дійшов до озера", text: "Слава на турнірах і новий меч забрали всі сили. Ти впав посеред дороги, так і не побачивши озера." },
    },
    moral: "Ставлячи собі цілі, ми часто забуваємо про них і починаємо битися з драконами, які нікого не займають. Коли пам’ятаєш свою справжню мету, дракони або зникають з дороги, або стають союзниками.",
    questions: ["З якими «драконами» ви воюєте, хоча вони вам не заважають?", "Що написано на звороті вашої картки «Лицар»?", "Кого ви вважаєте ворогом, хоча він міг би бути партнером?"],

    _s() { return S; },
    init(api) {
      S = { pos: 0, power: 10, glory: 0, sword: 0, dice: 0, rolling: 0, moving: 0, hop: 0, flipped: false, phase: "roll", heads: 3, fight: null, done: false, tok: tilePos(0), msg: "", msgT: 0 };
    },
    start(api) { api.banner("Твій хід: Пробіл — кинути кубик"); },

    update(dt, api) {
      if (S.done) return;
      S.msgT -= dt;
      if (api.input.alt) { S.flipped = !S.flipped; api.sfx("blip"); }
      if (S.phase === "roll" && api.input.act) { S.phase = "rolling"; S.rolling = 0.8; api.sfx("blip"); }
      if (S.phase === "rolling") {
        S.rolling -= dt; S.dice = 1 + Math.floor(Math.random() * 6);
        if (S.rolling <= 0) { S.phase = "move"; S.steps = S.dice; S.hop = 0; api.sfx("pick"); }
      }
      if (S.phase === "move") {
        S.hop += dt * 3.2;
        const from = tilePos(S.pos), to = tilePos(Math.min(N - 1, S.pos + 1)), k = Math.min(1, S.hop);
        S.tok = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 30 };
        if (S.hop >= 1) {
          S.pos = Math.min(N - 1, S.pos + 1); S.steps--; S.hop = 0; api.sfx("step");
          if (S.pos === N - 1) { S.steps = 0; }
          if (S.steps <= 0) { S.phase = "event"; landed(api); }
        }
      }
      if (S.phase === "fight") fightUpdate(dt, api);
      api.hud([["Сила", S.power], ["Слава", S.glory], S.sword ? ["Меч", "великий"] : null, ["Клітинка", (S.pos + 1) + " з " + N]]);
    },

    draw(ctx, api) {
      const sky = ctx.createLinearGradient(0, 0, 0, 540); sky.addColorStop(0, "#f3c983"); sky.addColorStop(1, "#d99b56");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
      // доріжка
      ctx.strokeStyle = "rgba(120,70,30,0.35)"; ctx.lineWidth = 18; ctx.lineJoin = "round"; ctx.beginPath();
      for (let i = 0; i < N; i++) { const p = tilePos(i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
      for (let i = 0; i < N; i++) {
        const p = tilePos(i), t = LAYOUT[i];
        api.D.rr(p.x - 40, p.y - 40, 80, 80, 14, i === S.pos ? "#fff3cf" : t === "lake" ? "#7cc4e6" : "#f7e3b5", "rgba(110,70,30,0.6)", 2);
        if (TYPES[t]) api.D.emoji(TYPES[t], p.x, p.y - 4, 32);
        api.D.text(String(i + 1), p.x - 26, p.y - 28, { size: 11, color: "rgba(90,55,20,0.7)" });
      }
      // дракон
      const L = tilePos(N - 1);
      api.D.emoji("🐉", L.x + 105, L.y - 6, 78);
      for (let h = 0; h < 3; h++) { const x = L.x + 65 + h * 40, y = L.y - 62; api.D.emoji(h < S.heads ? "🐲" : "💥", x, y, 24, { alpha: h < S.heads ? 1 : 0.5 }); }
      // фішка
      api.D.shadow(S.tok.x, S.tok.y + 26, 18);
      api.D.emoji("🏇", S.tok.x, S.tok.y - 8, 52);
      // кубик
      api.D.rr(820, 36, 80, 80, 16, "#fff", "#7a4a1f", 3);
      api.D.text(S.dice ? String(S.dice) : "?", 860, 78, { size: 42, color: "#7a4a1f", display: true });
      if (S.phase === "roll") api.D.text("Пробіл — кинути", 860, 132, { size: 13, color: "#5a3410" });
      // картка лицаря
      api.D.rr(30, 474, 220, 58, 12, S.flipped ? "#fffaf0" : "#8b1e2b", "#3b0f15", 2);
      if (S.flipped) { api.D.text("Мета:", 140, 490, { size: 13, color: "#5a3410" }); api.D.text("попити води", 140, 514, { size: 16, color: "#2a1a08", display: true }); }
      else { api.D.text("ЛИЦАР", 140, 497, { size: 28, color: "#ffd66b", display: true }); api.D.text("Q — перевернути", 140, 522, { size: 11, color: "#ffd9a8" }); }
      if (S.msgT > 0) api.D.bubble(S.msg, S.tok.x, S.tok.y - 40, { size: 13 });
      if (S.phase === "fight") fightDraw(ctx, api);
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.6; }
  function lose(api, n, why) { S.power = Math.max(0, S.power - n); api.sfx("bad"); msg(why); }

  async function landed(api) {
    const t = LAYOUT[S.pos];
    if (t === "lake") return lake(api);
    if (t === "heat") lose(api, 1 + S.sword, S.sword ? "Спека! Важкий меч тягне донизу (−" + (1 + S.sword) + ")" : "Спека! Лати розпеклися (−1 сила)");
    else if (t === "rest") { S.power = Math.min(12, S.power + 1); api.sfx("good"); msg("Привал у затінку (+1 сила)"); }
    else if (t === "mirage") { msg("Міраж! Ти звернув не туди (−2 клітинки)"); S.pos = Math.max(0, S.pos - 2); S.tok = tilePos(S.pos); }
    else if (t === "tavern") await api.say([["Шинкар", api.pick(["Дракон біля озера лютий! Уже трьох лицарів з’їв.", "Кажуть, у дракона три голови й ані краплі жалю.", "Справжній лицар без бою до води не підійде!"])]]);
    else if (t === "spring") {
      const c = await api.choose("Біля джерела напис: «Назви свою мету, і вода додасть сил».", ["Перемогти дракона", "Здобути славу", "Попити води"], "Джерело");
      if (c === 2) { S.power = Math.min(12, S.power + 3); api.sfx("good"); msg("Джерело ожило (+3 сили)"); } else msg("Вода в джерелі не ворухнулася");
    } else if (t === "tourney") {
      const c = await api.choose("Інший лицар кидає тобі рукавицю. Битимешся за славу?", ["Битися (+1 слава, −2 сили)", "Відмовитися і йти далі"], "Турнір");
      if (c === 0) { S.glory++; lose(api, 2, "Перемога! +1 слава, −2 сили"); }
    } else if (t === "smith") {
      const c = await api.choose("Більший меч для більшого дракона! Візьмеш за 2 сили?", ["Купити великий меч", "Мені й так добре"], "Зброяр");
      if (c === 0) { S.sword = 1; lose(api, 2, "Великий меч! Але важкий"); }
    }
    if (S.power <= 0) return collapse(api);
    S.phase = "roll";
  }

  async function collapse(api) {
    S.done = true; api.locked = true;
    await api.say([["", "Сили скінчилися. Ти сідаєш у пилюку посеред дороги. Озеро лишилося десь попереду."]]);
    api.locked = false; api.end("Г");
  }

  async function lake(api) {
    await api.say([["", "Озеро! Прохолодна вода блищить на сонці. Біля самого берега сидить триголовий дракон."]]);
    return lakeChoice(api, true);
  }

  async function lakeChoice(api, first) {
    const opts = ["Битися з драконом", "Попросити води"];
    const c = await api.choose(first ? "Дракон дивиться на тебе спокійно. Що робитимеш?" : "Голова впала. Дракон усе ще між тобою і водою.", first ? opts : ["Продовжити бій", "Попросити води"], "Лицар");
    if (c === 1) {
      S.done = true; api.locked = true; api.sfx("good");
      await api.say([["Дракон", first ? "Води? Пий, звісно. Я тут просто відпочиваю." : "Чого ж ти одразу не сказав? Пий."], ["", "Ти п’єш досхочу. Дракон показує стежку в обхід пустелі."]]);
      api.locked = false; return api.end("Б");
    }
    S.phase = "fight"; S.fight = { m: 0, dir: 1, zone: 0.35 + Math.random() * 0.3, w: S.sword ? 0.2 : 0.14, cd: 0 };
  }

  function fightUpdate(dt, api) {
    const f = S.fight;
    f.m += f.dir * dt * (1.1 + (3 - S.heads) * 0.25); if (f.m > 1) { f.m = 1; f.dir = -1; } if (f.m < 0) { f.m = 0; f.dir = 1; }
    f.cd -= dt;
    if (api.input.act && f.cd <= 0) {
      f.cd = 0.4;
      S.power = Math.max(0, S.power - 2);
      if (Math.abs(f.m - f.zone) < f.w / 2) { S.heads--; api.sfx("good"); api.shake(8, 0.3); msg("Голову відрубано! (−2 сили за день бою)"); afterBlow(api); }
      else { S.power = Math.max(0, S.power - 1); api.sfx("bad"); msg("Промах! Дракон б’є хвостом (−3 сили)"); if (S.power <= 0) afterBlow(api); else f.zone = 0.2 + Math.random() * 0.6; }
    }
  }

  async function afterBlow(api) {
    if (S.power <= 0) {
      S.done = true; S.phase = "end"; api.locked = true;
      await api.say([["", "Ти падаєш знесилений. Дракон підходить і нахиляє голову."], ["Дракон", "Лицарю, чого ти хотів?"], ["Лицар", "Води попити…"], ["Дракон", "Ну то попив би."]]);
      api.locked = false; return api.end("А");
    }
    if (S.heads <= 0) {
      S.done = true; S.phase = "end"; api.locked = true;
      await api.say([["", "Остання голова падає. І тоді озеро починає міліти: дракон охороняв джерело."]]);
      api.locked = false; return api.end("В");
    }
    S.phase = "wait"; await lakeChoice(api, false);
  }

  function fightDraw(ctx, api) {
    const f = S.fight, x = 300, y = 40, w = 360;
    api.D.rr(x - 14, y - 10, w + 28, 70, 12, "rgba(20,10,5,0.75)");
    api.D.rr(x, y + 18, w, 16, 8, "#5a3a2a");
    api.D.rr(x + (f.zone - f.w / 2) * w, y + 18, f.w * w, 16, 8, "#4caf50");
    api.D.emoji("🔻", x + f.m * w, y + 8, 20);
    api.D.text("Пробіл, коли стрілка в зеленому!", x + w / 2, y + 48, { size: 13, color: "#fff" });
  }

  PG.start(game);
})();
