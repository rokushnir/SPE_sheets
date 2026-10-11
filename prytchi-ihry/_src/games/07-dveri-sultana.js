/* Гра 07 «Двері султана» — квест-кімната за притчею «Важкі двері». */
(function () {
  const DOOR = { x: 905, y: 290 }, SULTAN = { x: 480, y: 95 }, LIMIT = 150;
  const CHESTS = [
    { x: 150, y: 170, q: "Що стає тим більшим, чим більше з нього забирають?", a: ["Яма", "Борг", "Тінь"], ok: 0 },
    { x: 170, y: 430, q: "Чим довше його сушиш, тим мокріший він стає. Що це?", a: ["Сонце", "Рушник", "Пісок"], ok: 1 },
    { x: 560, y: 450, q: "Що можна зламати, навіть не торкаючись?", a: ["Скло", "Обіцянку", "Гілку"], ok: 1 },
    { x: 700, y: 170, q: "Що завжди попереду, але ніхто його не бачив?", a: ["Горизонт", "Тінь", "Майбутнє"], ok: 2 },
  ];
  const WISDOM = ["Мудрість дня: ці двері кували сто майстрів", "Мудрість дня: кажуть, ключ важить як віл", "Мудрість дня: найкращі візири думають довго", "Мудрість дня: без армії тут не обійтися"];
  let S;

  const game = {
    id: "07", title: "Двері султана", parable: "Важкі двері",
    story: "Султан підвів візирів до велетенських дубових дверей: «Першим візиром стане той, хто знатиме, яким ключем їх відкрити». Одні рахували, скільки робити ключ, інші кликали армію. А один візир просто штовхнув двері, і вони відчинилися.",
    goal: "Ти — візир. Шукай ключ у скринях із загадками, слухай Султана і стеж за часом. Двері праворуч.",
    controls: ["Стрілки або WASD — ходити", "Пробіл або E — відкрити скриню, оглянути двері, говорити"],
    help: "<kbd>←↑→↓</kbd> ходити · <kbd>Пробіл</kbd> дія",
    actLabel: "Дія",
    endings: {
      "А": { title: "Штовхнув", text: "Ти не чекав ключа і просто штовхнув двері. Вони відчинилися. Султан: «Ось мій перший візир. Ключ — це дія»." },
      "Б": { title: "Розумний, але повільний", text: "Ти розгадав усі загадки й отримав Золотий ключ, який до дверей не підійшов. Потім штовхнув. «Розумний, — сказав Султан, — але повільний»." },
      "В": { title: "Час вийшов", text: "Пісок у годиннику скінчився. Султан мовчки встав і штовхнув двері сам." },
      "Г": { title: "Першим став інший", text: "Ти сказав іншому візирові: «Спробуй». Він спробував, і він тепер Перший Візир. Добра ідея нічого не варта, якщо її втілює хтось інший." },
    },
    moral: "Багато хто лише приміряється і тому мало досягає. Розум — наш найкращий порадник, але він і відволікає від дії. Проблема розумних людей у тому, що вони надто багато думають.",
    questions: ["Які ваші «двері» насправді відчинені?", "Скільки «ключів» ви виготовляєте замість того, щоб штовхнути?", "Хто у вашій команді першим пропонує просто спробувати?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: 120, y: 300, emoji: "👳", size: 42, speed: 190 }),
        solved: [false, false, false, false], penalty: 0, time: LIMIT, gold: false, goldTaken: false, doorLooked: 0, open: 0,
        npc: { x: 300, y: 300, e: "👨‍🦳", tx: 300, ty: 300, t: 0, said: false, go: false },
        wisdomT: 18, ram: null, msg: "", msgT: 0, done: false, ev: {},
      };
    },
    async start(api) {
      await api.say([["Султан", "Першим візиром стане той, хто відчинить ці двері. Ключ десь у цій залі. Час пішов!"]]);
    },

    update(dt, api) {
      const p = S.p;
      if (S.done) return;
      S.time -= dt; S.msgT -= dt; S.penalty = Math.max(0, S.penalty - dt);
      if (S.penalty <= 0) api.moveActor(p, dt, { x0: 40, x1: 860, y0: 150, y1: 500 });
      // інший візир блукає
      const n = S.npc; n.t -= dt;
      if (!n.go) { if (n.t <= 0) { n.t = api.rand(2, 4); n.tx = api.rand(250, 700); n.ty = api.rand(200, 460); } }
      else { n.tx = DOOR.x - 50; n.ty = DOOR.y; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d > 2) { n.x += dx / d * (n.go ? 140 : 60) * dt; n.y += dy / d * (n.go ? 140 : 60) * dt; n.flip = dx > 0; }
      if (n.go && d < 6 && !S.ev.npcOpen) { S.ev.npcOpen = true; npcOpens(api); }
      // події
      S.wisdomT -= dt;
      if (S.wisdomT <= 0) { S.wisdomT = 22; api.banner(api.pick(WISDOM), 2800); }
      if (S.time < LIMIT - 35 && !S.ev.idea) { S.ev.idea = true; idea(api); }
      if (S.time < LIMIT - 70 && !S.ev.army) { S.ev.army = true; army(api); }
      if (S.ram && S.ram.held) { S.ram.x = p.x + 30; S.ram.y = p.y; }
      if (api.input.act) act(api);
      if (S.open > 0) S.open = Math.min(1, S.open + dt * 1.5);
      if (S.time <= 0) timeUp(api);
      api.hud([["Час", Math.max(0, Math.ceil(S.time)) + " с"], ["Загадок", S.solved.filter(Boolean).length + " з 4"], S.gold ? ["Золотий ключ", S.goldTaken ? "у тебе" : "у Султана"] : null]);
    },

    draw(ctx, api) {
      ctx.fillStyle = "#3b2a4a"; ctx.fillRect(0, 0, 960, 540);
      // підлога-мозаїка
      for (let i = 0; i < 20; i++) for (let j = 0; j < 9; j++) { ctx.fillStyle = (i + j) % 2 ? "#c8a46a" : "#b9925a"; ctx.fillRect(i * 48, 130 + j * 48, 48, 48); }
      ctx.fillStyle = "#5a3f6a"; ctx.fillRect(0, 0, 960, 130);
      for (let i = 0; i < 6; i++) api.D.emoji("🏮", 80 + i * 160, 40, 30);
      // трон
      api.D.rr(SULTAN.x - 60, SULTAN.y - 30, 120, 70, 12, "#a8323a", "#f2c14e", 3);
      api.D.emoji("🤴", SULTAN.x, SULTAN.y, 52);
      if (S.gold && !S.goldTaken) api.D.emoji("🔑", SULTAN.x + 70, SULTAN.y + 20, 30);
      // пісочний годинник
      api.D.emoji("⏳", 300, 80, 34); api.D.bar(325, 74, 120, 12, S.time / LIMIT, "#f2c14e");
      // двері
      const op = S.open;
      ctx.fillStyle = "#1b120c"; ctx.fillRect(DOOR.x - 40, DOOR.y - 150, 80, 300);
      ctx.save(); ctx.translate(DOOR.x - 40, 0); ctx.scale(1 - op * 0.85, 1);
      ctx.fillStyle = "#6b4423"; ctx.fillRect(0, DOOR.y - 150, 80, 300);
      ctx.strokeStyle = "#3e2614"; ctx.lineWidth = 4; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 20, DOOR.y - 150); ctx.lineTo(i * 20, DOOR.y + 150); ctx.stroke(); }
      ctx.restore();
      if (op > 0.3) { const lg = ctx.createLinearGradient(DOOR.x - 40, 0, 960, 0); lg.addColorStop(0, "rgba(255,240,180,0.85)"); lg.addColorStop(1, "rgba(255,240,180,0)"); ctx.fillStyle = lg; ctx.fillRect(DOOR.x - 40, DOOR.y - 150, 120, 300); }
      if (!op) { api.D.emoji("⛓️", DOOR.x, DOOR.y - 10, 44); api.D.emoji("🔒", DOOR.x, DOOR.y + 28, 30); }
      // скрині
      CHESTS.forEach((c, i) => { api.D.emoji("🧰", c.x, c.y, 40, { alpha: S.solved[i] ? 0.45 : 1 }); if (S.solved[i]) api.D.emoji("✅", c.x + 18, c.y - 16, 20); api.D.text(String(i + 1), c.x, c.y + 30, { size: 13, color: "#fff", stroke: "rgba(0,0,0,.6)" }); });
      if (S.ram) api.D.emoji("🪵", S.ram.x, S.ram.y, 50, { rot: 0.1 });
      api.D.shadow(S.npc.x, S.npc.y + 18, 14); api.D.emoji(S.npc.e, S.npc.x, S.npc.y, 40, { flip: S.npc.flip });
      api.drawActor(S.p);
      const hint = nearHint(api);
      if (hint) api.D.text(hint, S.p.x, S.p.y - 40, { size: 14, color: "#fff", stroke: "rgba(0,0,0,.65)" });
      if (S.msgT > 0) api.D.bubble(S.msg, S.p.x, S.p.y - 50, { size: 13 });
      if (S.penalty > 0) api.D.text("Штраф за помилку: " + Math.ceil(S.penalty) + " с", 480, 520, { size: 16, color: "#ffd1c8", stroke: "rgba(0,0,0,.6)" });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.6; }
  function nearHint(api) {
    const p = S.p;
    if (Math.hypot(p.x - DOOR.x, p.y - DOOR.y) < 110) return "Пробіл — оглянути двері";
    for (let i = 0; i < 4; i++) if (!S.solved[i] && Math.hypot(p.x - CHESTS[i].x, p.y - CHESTS[i].y) < 55) return "Пробіл — відкрити скриню";
    if (S.gold && !S.goldTaken && Math.hypot(p.x - SULTAN.x, p.y - SULTAN.y) < 110) return "Пробіл — взяти ключ";
    if (S.ram && !S.ram.held && Math.hypot(p.x - S.ram.x, p.y - S.ram.y) < 55) return "Пробіл — взяти таран";
    return "";
  }

  async function act(api) {
    const p = S.p;
    if (S.penalty > 0) return;
    if (Math.hypot(p.x - DOOR.x, p.y - DOOR.y) < 110) return door(api);
    for (let i = 0; i < 4; i++) if (!S.solved[i] && Math.hypot(p.x - CHESTS[i].x, p.y - CHESTS[i].y) < 55) return chest(api, i);
    if (S.gold && !S.goldTaken && Math.hypot(p.x - SULTAN.x, p.y - SULTAN.y) < 110) { S.goldTaken = true; api.sfx("good"); api.banner("Золотий ключ у тебе. Тепер до дверей!"); return; }
    if (S.ram && !S.ram.held && Math.hypot(p.x - S.ram.x, p.y - S.ram.y) < 55) { S.ram.held = true; api.sfx("pick"); msg("Важкий! Неси до дверей"); }
  }

  async function chest(api, i) {
    const c = CHESTS[i];
    const pick = await api.choose(c.q, c.a, "Скриня " + (i + 1));
    if (pick === c.ok) {
      S.solved[i] = true; api.sfx("good"); api.burst(c.x, c.y, "✨", 8, { size: 14 });
      const n = S.solved.filter(Boolean).length;
      if (n < 4) msg(`Шматок ключа! ${n} з 4`);
      else { S.gold = true; await api.say([["Султан", "Ти зібрав усі частини! Підійди, візьми Золотий ключ."]]); }
    } else { S.penalty = 6; api.sfx("bad"); msg("Не та відповідь. Скриня зачинилася на 6 секунд."); }
  }

  async function door(api) {
    S.doorLooked++;
    if (S.ram && S.ram.held) {
      api.shake(10, 0.4); api.sfx("bad"); S.ram.held = false; S.ram.x = DOOR.x - 90;
      await api.say([["", "БУМ! Двері навіть не здригнулися. Таран відскакує."], ["Султан", "Армія теж не допомогла б. Хм…"]]);
      return;
    }
    const opts = [];
    if (S.goldTaken) opts.push("Вставити Золотий ключ");
    opts.push("Шукати ключ далі", "Спробувати просто штовхнути");
    const first = S.doorLooked === 1;
    const c = await api.choose(first ? "Масивні дубові двері. Ланцюг, замок. Такі, здається, не відчинить ніхто." : "Ті самі велетенські двері.", opts, first ? "Султан: «Ти справді думаєш, що це так просто?»" : "");
    const choice = opts[c];
    if (choice === "Вставити Золотий ключ") {
      api.sfx("bad");
      await api.say([["", "Ключ не лізе в замок. Він узагалі не від цих дверей."], ["Султан", "Красивий ключ, правда? Я сам його замовив."]]);
      return;
    }
    if (choice === "Шукати ключ далі") return;
    openDoor(api, S.solved.every(Boolean) ? "Б" : "А");
  }

  async function openDoor(api, letter, who) {
    S.done = true; api.locked = true; S.open = 0.01; api.sfx("whoosh");
    await api.wait(0.9);
    await api.say(who ? [["", who]] : [["", "Двері легко піддаються. Вони ніколи не були замкнені: ланцюг висів для краси."], ["Султан", letter === "А" ? "Ось мій перший візир!" : "Нарешті. Розумний, але повільний."]]);
    api.locked = false; api.end(letter);
  }

  async function idea(api) {
    const c = await api.choose("Слухай… А може, двері просто штовхнути?", ["«Спробуй сам»", "«Не кажи дурниць, тут потрібен ключ»", "«Ходімо разом!»"], "Інший візир");
    if (c === 0) { S.npc.go = true; msg("Він іде до дверей…"); }
    else if (c === 2) { await api.say([["", "Ви разом підходите до дверей. Тисни Пробіл біля дверей."]]); S.p.x = DOOR.x - 120; S.p.y = DOOR.y; }
    else msg("Він знизує плечима і бурмоче: «Ну, як знаєш»");
  }

  function npcOpens(api) {
    openDoor(api, "Г", "Інший візир штовхає двері, і вони відчиняються. Султан урочисто вручає йому перстень Першого Візира.");
  }

  async function army(api) {
    S.ram = { x: 380, y: 300, held: false };
    await api.say([["Султан", "Може, варто штурмувати? Ось вам таран. Принесіть його до дверей."]]);
  }

  async function timeUp(api) {
    if (S.done) return;
    S.done = true; api.locked = true;
    await api.say([["Султан", "Час вийшов."], ["", "Султан встає з трону, підходить до дверей і легенько штовхає їх долонею."]]);
    S.open = 0.01; api.sfx("whoosh"); await api.wait(1);
    api.locked = false; api.end("В");
  }

  PG.start(game);
})();
