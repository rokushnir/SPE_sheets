/* Гра 12 «Тісна хата» — пазл-сокобан за притчею «Коза». */
(function () {
  const COLS = 10, ROWS = 6, T = 64, OX = 160, OY = 92;
  const DOOR = { x: 9, y: 3 };
  // розкладки справ: ящики (що штовхати) і цілі
  const LAYOUTS = {
    a: { crates: [{ x: 3, y: 2, e: "🪵" }, { x: 6, y: 3, e: "🧺" }], targets: [{ x: 7, y: 2, e: "🔥", n: "дрова до печі" }, { x: 6, y: 4, e: "🪣", n: "білизну до балії" }] },
    b: { crates: [{ x: 3, y: 2, e: "🪵" }, { x: 4, y: 3, e: "🧺" }, { x: 6, y: 3, e: "🥕" }], targets: [{ x: 7, y: 2, e: "🔥", n: "дрова до печі" }, { x: 2, y: 3, e: "🪣", n: "білизну до балії" }, { x: 6, y: 4, e: "🍲", n: "моркву до казана" }] },
  };
  let S;

  const game = {
    id: "12", title: "Тісна хата", parable: "Коза",
    story: "Чоловік скаржився рабину: хата маленька, четверо дітей, ще й теща з тестем і котом переїхали. «Заведи козу». Через два тижні: «Стало ще гірше!» — «Продай козу». Через тиждень: «Це не життя, а рай! Скільки в нас місця!»",
    goal: "Ти — господар тісної хати. Штовхай речі на свої місця: дрова до печі, білизну до балії. Діти бігають, кіт плутається під ногами. Коли впораєшся, вийди у двері праворуч до рабина.",
    controls: ["Стрілки або WASD — крок (речі можна штовхати)", "Q або Shift — розкласти речі заново, якщо застряг", "Придивися до лівої стіни"],
    help: "<kbd>←↑→↓</kbd> крок і штовхати · <kbd>Q</kbd> почати справи заново",
    actLabel: "—", altLabel: "Заново",
    endings: {
      "А": { title: "Продали козу", text: "Без кози ті самі справи раптом стали легкими: «Як у нас просторо!» Хата не виросла ні на сантиметр. Виросло вміння бачити те, що є." },
      "Б": { title: "Вигнали тещу", text: "Місця стало більше, але обід ніхто не приготував: варила саме теща. Втрата без виграшу." },
      "В": { title: "Залишили козу", text: "Ви навчилися жити з козою, і вона віддячила молоком. Ресурс знайшовся там, де здавалося, що його немає." },
      "Г": { title: "Межі в голові", text: "Ліва «стіна» виявилася смужкою скотчу. Ти штовхнув її, і хата стала більшою. Найтісніші межі — ті, яких ніхто не перевіряв." },
    },
    moral: "У нас завжди є додатковий час, місце чи інший ресурс. Якщо ми його не помічаємо, варто на час узяти більше, а потім звузити коло, і стане видно, скільки всього можна встигнути з тим, що вже є.",
    questions: ["Яку «козу» варто завести, щоб побачити, скільки у вас простору?", "Хто у вашій «хаті» насправді готує обід?", "Які межі у вашому житті намальовані скотчем?"],

    _s() { return S; },
    init(api) {
      S = { p: { x: 1, y: 3, e: "👨", flip: true }, family: [], crates: [], targets: [], goat: null, stage: "a1", moves: 0, cd: 0, tape: 0, wide: false, doorOpen: false, done: false, msg: "", msgT: 0, bump: 0 };
      setFamily(true, true); load("a");
    },
    async start(api) {
      await api.say([["", "Маленька хата, жінка, четверо дітей. А сьогодні ще й переїхали теща з тестем і котом."], ["Жінка", "Любий, рознеси речі по місцях, бо й ступити ніде!"]]);
    },

    update(dt, api) {
      if (S.done) return;
      S.cd -= dt; S.msgT -= dt; S.bump = Math.max(0, S.bump - dt);
      if (api.input.alt) { load(S.layout); api.sfx("blip"); msg("Речі повернулися на початок"); }
      const I = api.input;
      const px = I.right ? 1 : I.left ? -1 : 0, py = !px ? (I.down ? 1 : I.up ? -1 : 0) : 0;
      if (px || py) { S.cd = 0.25; step(api, px, py); }
      else {
        const ax = Math.abs(I.x) > 0.5 ? Math.sign(I.x) : 0, ay = !ax && Math.abs(I.y) > 0.5 ? Math.sign(I.y) : 0;
        if ((ax || ay) && S.cd <= 0) { S.cd = 0.17; step(api, ax, ay); }
      }
      // діти, кіт і коза метушаться
      for (const f of S.family) if (f.rand) { f.t -= dt; if (f.t <= 0) { f.t = api.rand(1.2, 2.4); wander(f); } }
      if (S.goat) { S.goat.t -= dt; if (S.goat.t <= 0) { S.goat.t = 0.7; wander(S.goat); if (Math.random() < 0.15) api.sfx("blip"); } }
      const done = S.crates.filter((c) => c.on).length;
      api.hud([["Справ", done + " з " + S.targets.length], ["Кроків", S.moves], ["У хаті", S.family.length + 1 + (S.goat ? 1 : 0)]]);
    },

    draw(ctx, api) {
      ctx.fillStyle = "#3a2f28"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#6b8f4a"; ctx.fillRect(0, 0, 960, 540);
      // підлога
      const c0 = S.wide ? -1 : 0;
      for (let x = c0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        const wall = isWallCell(x, y);
        ctx.fillStyle = wall ? "#8a6a4a" : (x + y) % 2 ? "#e4cfa8" : "#dcc49a";
        if (x === DOOR.x && y === DOOR.y) ctx.fillStyle = S.doorOpen ? "#f5e6b8" : "#7a5230";
        ctx.fillRect(OX + x * T, OY + y * T, T, T);
      }
      // скотч на лівій стіні
      if (!S.wide) { ctx.setLineDash([10, 8]); ctx.strokeStyle = "#f2e8c9"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(OX + T - 4, OY + T); ctx.lineTo(OX + T - 4, OY + (ROWS - 1) * T); ctx.stroke(); ctx.setLineDash([]); if (S.bump > 0) ctx.globalAlpha = 1; }
      api.D.emoji("🚪", OX + DOOR.x * T + T / 2, OY + DOOR.y * T + T / 2, 44);
      api.D.emoji("🧔", OX + COLS * T + 60, OY + 3 * T + T / 2, 46); api.D.text("Рабин", OX + COLS * T + 60, OY + 3 * T + 70, { size: 13, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      for (const t of S.targets) { api.D.rr(OX + t.x * T + 4, OY + t.y * T + 4, T - 8, T - 8, 10, "rgba(255,255,255,0.35)", "#b5894b", 2); api.D.emoji(t.e, OX + t.x * T + T / 2, OY + t.y * T + T / 2, 34, { alpha: 0.75 }); }
      for (const c of S.crates) { api.D.rr(OX + c.x * T + 8, OY + c.y * T + 8, T - 16, T - 16, 10, c.on ? "#a8d58a" : "#c99a5c", "#6b4a26", 2); api.D.emoji(c.e, OX + c.x * T + T / 2, OY + c.y * T + T / 2, 30); }
      for (const f of S.family) api.D.emoji(f.e, OX + f.x * T + T / 2, OY + f.y * T + T / 2 + Math.sin(api.t * 4 + f.x) * (f.rand ? 2 : 0.5), 40);
      if (S.goat) api.D.emoji("🐐", OX + S.goat.x * T + T / 2, OY + S.goat.y * T + T / 2, 44);
      api.D.emoji(S.p.e, OX + S.p.x * T + T / 2, OY + S.p.y * T + T / 2, 44, { flip: S.p.flip });
      if (S.msgT > 0) api.D.bubble(S.msg, OX + S.p.x * T + T / 2, OY + S.p.y * T, { size: 13 });
      const list = S.targets.map((t, i) => (S.crates[i] && S.crates[i].on ? "✓ " : "· ") + t.n).join("   ");
      api.D.text(list, 480, 506, { size: 15, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      if (S.doorOpen) api.D.text("Справи зроблено. Іди у двері до рабина →", 480, 70, { size: 16, color: "#fff", stroke: "rgba(0,0,0,.6)" });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.4; }
  function isWallCell(x, y) {
    if (y === 0 || y === ROWS - 1) return true;
    if (x === COLS - 1) return !(y === DOOR.y);
    if (x === 0) return !S.wide;
    if (x === -1) return true;
    return false;
  }
  function occupant(x, y) {
    if (S.p.x === x && S.p.y === y) return "me";
    if (S.goat && S.goat.x === x && S.goat.y === y) return "goat";
    for (const f of S.family) if (f.x === x && f.y === y) return f;
    for (const c of S.crates) if (c.x === x && c.y === y) return c;
    return null;
  }
  function free(x, y) { return !isWallCell(x, y) && !(x === DOOR.x && y === DOOR.y) && !occupant(x, y); }

  function setFamily(inlaws, cat) {
    S.family = [
      { x: 5, y: 1, e: "👩" }, { x: 3, y: 1, e: "👧", rand: true, t: 1 }, { x: 4, y: 4, e: "👦", rand: true, t: 1.5 }, { x: 1, y: 4, e: "👶" }, { x: 7, y: 4, e: "🧒", rand: true, t: 2 },
    ];
    if (inlaws) S.family.push({ x: 8, y: 1, e: "👴" }, { x: 8, y: 4, e: "👵", cook: true });
    if (cat) S.family.push({ x: 1, y: 1, e: "🐈", rand: true, t: 0.8 });
  }
  function load(k) {
    S.layout = k;
    const L = LAYOUTS[k];
    S.crates = L.crates.map((c) => ({ ...c, on: false }));
    S.targets = L.targets.map((t) => ({ ...t }));
    S.p.x = 1; S.p.y = 3; S.doorOpen = false;
    // прибираємо родичів з клітинок справ
    for (const f of S.family) if (S.crates.some((c) => c.x === f.x && c.y === f.y) || S.targets.some((t) => t.x === f.x && t.y === f.y) || (f.x === 1 && f.y === 3) || (f.y === 2 && f.x >= 2 && f.x <= 7)) { const c = randomFree(); if (c) { f.x = c.x; f.y = c.y; } }
  }
  function randomFree() { for (let i = 0; i < 80; i++) { const x = 1 + Math.floor(Math.random() * (COLS - 2)), y = 1 + Math.floor(Math.random() * (ROWS - 2)); if (free(x, y) && !S.targets.some((t) => t.x === x && t.y === y)) return { x, y }; } return null; }
  function wander(f) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) { const nx = f.x + dx, ny = f.y + dy; if (free(nx, ny) && !S.targets.some((t) => t.x === nx && t.y === ny && f !== S.goat)) { f.x = nx; f.y = ny; return; } }
  }

  function step(api, dx, dy) {
    const p = S.p, nx = p.x + dx, ny = p.y + dy;
    if (dx) p.flip = dx > 0;
    // скотч
    if (!S.wide && nx === 0 && ny > 0 && ny < ROWS - 1) {
      S.tape++; S.bump = 0.3; api.shake(3, 0.12); api.sfx("blip");
      if (S.tape === 2) msg("Ця стіна якась… паперова?");
      if (S.tape >= 5) return breakTape(api);
      return;
    }
    if (nx === DOOR.x && ny === DOOR.y) { if (S.doorOpen) return rabbi(api); msg("Спершу справи!"); return; }
    if (isWallCell(nx, ny)) return;
    const o = occupant(nx, ny);
    if (o === "goat") { msg("Ме-е-е! Коза не зрушить"); api.sfx("bad"); return; }
    if (o && o.e && !("on" in o)) { msg(o.e === "🐈" ? "Няв! Кіт під ногами" : "Вибач, тут тісно…"); return; }
    if (o && "on" in o) {
      const cx = o.x + dx, cy = o.y + dy;
      if (!free(cx, cy)) { api.sfx("bad"); return; }
      o.x = cx; o.y = cy;
      const tg = S.targets[S.crates.indexOf(o)];
      o.on = tg.x === cx && tg.y === cy;
      if (o.on) { api.sfx("good"); api.burst(OX + cx * T + T / 2, OY + cy * T + T / 2, "✨", 6, { size: 14 }); }
    }
    p.x = nx; p.y = ny; S.moves++; api.sfx("step");
    if (S.crates.every((c) => c.on) && !S.doorOpen) { S.doorOpen = true; api.sfx("bell"); }
  }

  async function rabbi(api) {
    const st = S.stage;
    if (st === "a1") {
      await api.say([["Чоловік", "Ребе, це не життя! Жінка, діти, теща з тестем, кіт… Ніде розвернутися!"], ["Рабин", "Я знаю, що тобі порадити. Заведи козу."]]);
      const c = await api.choose("Коза в такій тісноті?", ["Добре, заведу козу", "Краще вижену тещу з котом"], "Чоловік");
      if (c === 0) { S.stage = "goat"; S.goat = { x: 5, y: 1, t: 0.7 }; load("b"); api.banner("Тепер у хаті ще й коза. І справ побільшало."); }
      else { S.stage = "evict"; S.family = S.family.filter((f) => !f.cook && f.e !== "🐈" && f.e !== "👴"); load("b"); api.banner("Тещу з тестем і котом відправили назад. Хата спорожніла."); }
      return;
    }
    if (st === "evict") {
      S.done = true; api.locked = true;
      await api.say([["Жінка", "Справи зроблено, а обід? Мама ж завжди варила…"], ["", "Казан стоїть холодний. Місця більше, а радості менше."]]);
      api.locked = false; return api.end("Б");
    }
    if (st === "goat") {
      await api.say([["Чоловік", "Це жахіття! Ще й коза! Тепер стало ще гірше!"], ["Рабин", "Гаразд. А тепер продай козу і приходь через тиждень."]]);
      const c = await api.choose("Продати козу?", ["Продати козу", "Залишити: ми вже звикли"], "Чоловік");
      S.stage = c === 0 ? "sold" : "kept";
      if (c === 0) S.goat = null;
      for (const f of S.family) if (f.rand) f.t = 3; // діти трохи спокійніші
      load("b"); api.banner(c === 0 ? "Козу продано. Ті самі справи, та сама хата…" : "Коза лишається. Ті самі справи.");
      return;
    }
    S.done = true; api.locked = true;
    if (st === "sold") { await api.say([["Чоловік", "Ребе, це не життя, а рай! Як тільки я продав козу, побачив, скільки в нас місця!"]]); api.locked = false; return api.end("А"); }
    await api.say([["Чоловік", "Ребе, ми звикли до кози. А вона ще й молоко дає!"], ["Рабин", "Отже, ти знайшов ресурс там, де його не бачив."]]);
    api.locked = false; api.end("В");
  }

  async function breakTape(api) {
    S.wide = true; S.done = true; api.locked = true; api.sfx("whoosh"); api.shake(8, 0.4);
    await api.say([["", "Тр-р-р! «Стіна» рветься: це була смужка скотчу. Хата раптом на цілий ряд ширша."], ["Жінка", "А хто взагалі казав, що там стіна?"]]);
    api.locked = false; api.end("Г");
  }

  PG.start(game);
})();
