/* Гра 02 «Подвір’я» — симулятор виживання на прив’язі за притчею «Орел, який став куркою». */
(function () {
  const POST = { x: 470, y: 300 }, ROPE = 160;
  const SEASONS = [
    { name: "Літо", len: 24, bg: "#6c9a3f", dirt: "#a88a55" },
    { name: "Осінь", len: 24, bg: "#a07a33", dirt: "#9a7a48" },
    { name: "Зима", len: 24, bg: "#dfe7ef", dirt: "#c9d2dc" },
    { name: "Весна", len: 20, bg: "#7fb24d", dirt: "#ab8f5c" },
  ];
  let S;

  const game = {
    id: "02", title: "Подвір’я", parable: "Орел, який став куркою",
    story: "Селянин знайшов пораненого орла, прив’язав за лапку і годував разом із курми. Спершу орел рвав мотузку, потім звик. За зиму мотузка перегнила, але він уже й не намагався злетіти.",
    goal: "Ти — орел на мотузці. Зерно дає ситість, але робить крила слабшими. Пір’я на краю подвір’я повертає силу. Минуть чотири сезони, а наприкінці Вітер покличе в небо.",
    controls: ["Стрілки або WASD — ходити (мотузка не пускає далеко)", "Пробіл або E — рвонути мотузку", "Q або Shift — кудкудакнути разом із курми"],
    help: "<kbd>←↑→↓</kbd> ходити · <kbd>Пробіл</kbd> рвонути мотузку · <kbd>Q</kbd> кудкудакнути",
    actLabel: "Рвонути", altLabel: "Ко-ко!",
    endings: {
      "А": { title: "Злетів", text: "Мотузка розсипалася від першого помаху: вона перегнила ще взимку. Ти залишив усе зерно і полетів до Скелі." },
      "Б": { title: "Лишився на подвір’ї", text: "Ти обрав зерно. Коли селянин прийшов годувати, він побачив, що мотузка давно перегнила. Тебе ніхто не тримав." },
      "В": { title: "Перевірив мотузку сам", text: "Не чекаючи Вітру, ти рвонув мотузку навесні, і вона луснула. Свобода прийшла до того, хто перевірив, а не чекав дозволу." },
      "Г": { title: "Крила забули небо", text: "Мотузка луснула, але крила, ослаблі від зерна, донесли тебе лише до паркану. Щоб злетіти, мало вирішити: крила треба тренувати." },
    },
    moral: "Свобода — це не те, що нам дають, а те, чого в нас ніхто не може забрати. Ми самі міняємо крила рішучості на золоту клітку стабільності.",
    questions: ["Яке «зерно від хазяїна» тримає вас на подвір’ї?", "Коли ваша мотузка насправді перегнила?", "Де ви кудкудакаєте разом з усіма, щоб отримати подвійну порцію?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: POST.x + 60, y: POST.y + 30, emoji: "🦅", size: 46, speed: 170 }),
        season: 0, st: 0, grain: 0, wing: 70, grains: [], feathers: [], snow: [],
        hens: Array.from({ length: 6 }, (_, i) => api.actor({ x: 300 + i * 70, y: 380 + (i % 2) * 40, emoji: "🐔", size: 34, speed: 40, tx: 0, ty: 0, tt: 0 })),
        wind: { a: 0, on: false, say: "" }, farmer: null, chorus: 0, tugCD: 0, done: false, ropeRotten: false, ev: {}, bub: null, bubT: 0,
      };
      for (let i = 0; i < 14; i++) spawnGrain(api);
      for (let i = 0; i < 4; i++) spawnFeather(api);
      for (let i = 0; i < 60; i++) S.snow.push({ x: Math.random() * 960, y: Math.random() * 540, s: 0.5 + Math.random() });
    },
    start(api) { api.banner("Літо. Подвір’я, кури і зерно."); },

    update(dt, api) {
      const p = S.p, sea = SEASONS[S.season];
      S.st += dt; S.tugCD -= dt; S.bubT -= dt;
      // рух на мотузці
      const ox = p.x, oy = p.y;
      api.moveActor(p, dt, { x0: 30, x1: 930, y0: 60, y1: 510 }, S.wing < 35 ? 0.75 : 1);
      const d = Math.hypot(p.x - POST.x, p.y - POST.y);
      if (d > ROPE) { p.x = POST.x + (p.x - POST.x) / d * ROPE; p.y = POST.y + (p.y - POST.y) / d * ROPE; }
      // зерно
      for (let i = S.grains.length - 1; i >= 0; i--) {
        const g = S.grains[i];
        if (Math.hypot(p.x - g.x, p.y - g.y) < 24) {
          const mult = S.chorus > 0 && S.cluck > 0 ? 2 : 1;
          S.grain += mult; S.wing = Math.max(0, S.wing - 2); S.grains.splice(i, 1); api.sfx("pick");
          if (mult === 2) api.burst(g.x, g.y, "🌾", 4, { size: 14 });
        }
      }
      // пір’я
      for (let i = S.feathers.length - 1; i >= 0; i--) {
        const f = S.feathers[i];
        if (Math.hypot(p.x - f.x, p.y - f.y) < 26) { S.wing = Math.min(100, S.wing + 10); S.feathers.splice(i, 1); api.sfx("good"); api.burst(f.x, f.y, "✨", 6, { size: 14 }); }
      }
      // кури
      for (const h of S.hens) {
        h.tt -= dt;
        let target = null, best = 1e9;
        for (const g of S.grains) { const dd = Math.hypot(h.x - g.x, h.y - g.y); if (dd < best) { best = dd; target = g; } }
        if (h.tt <= 0) { h.tt = 1 + Math.random() * 2; h.tx = target && Math.random() < 0.6 ? target.x : POST.x + api.rand(-200, 200); h.ty = target && Math.random() < 0.6 ? target.y : POST.y + api.rand(-130, 160); }
        const dx = h.tx - h.x, dy = h.ty - h.y, dd = Math.hypot(dx, dy);
        h.moving = dd > 4; if (h.moving) { h.x += dx / dd * h.speed * dt; h.y += dy / dd * h.speed * dt; h.flip = dx > 0; h.phase += dt * 8; }
        if (target && best < 16) { S.grains.splice(S.grains.indexOf(target), 1); }
      }
      // кудкудакання
      S.cluck = Math.max(0, (S.cluck || 0) - dt);
      if (api.input.alt) {
        api.sfx("blip"); S.cluck = 4;
        if (S.chorus > 0) { bubble("Ко-ко-ко! (подвійне зерно 4 с)"); S.wing = Math.max(0, S.wing - 3); }
        else bubble("Ко-ко? Кури дивно на тебе дивляться.");
      }
      S.chorus = Math.max(0, S.chorus - dt);
      // рвонути мотузку
      if (api.input.act && S.tugCD <= 0) tug(api);
      // сезонні події
      seasonEvents(dt, api);
      if (S.season === 2) S.wing = Math.max(0, S.wing - dt * 0.8);
      // зміна сезону
      if (S.st >= sea.len && !S.done) {
        S.st = 0;
        if (S.season < 3) {
          S.season++; api.sfx("bell");
          const txt = ["", "Осінь. Вітер щодня пролітає над подвір’ям.", "Зима. Пір’я вкрило снігом, зате зерна вдосталь.", "Весна. Сніг тане. Здається, все як раніше."][S.season];
          api.banner(txt, 3000);
          if (S.season === 2) { S.feathers.length = 0; for (let i = 0; i < 18; i++) spawnGrain(api); }
          if (S.season === 3) { S.ropeRotten = true; for (let i = 0; i < 3; i++) spawnFeather(api); }
        } else finalCall(api);
      }
      api.hud([[SEASONS[S.season].name, Math.max(0, Math.ceil(sea.len - S.st)) + " с"], ["Зерно", S.grain], ["Сила крил", Math.round(S.wing)]]);
    },

    draw(ctx, api) {
      const sea = SEASONS[S.season];
      ctx.fillStyle = sea.bg; ctx.fillRect(0, 0, 960, 540);
      // небо по краях
      const sky = ctx.createRadialGradient(POST.x, POST.y, 250, POST.x, POST.y, 560);
      sky.addColorStop(0, "rgba(160,200,255,0)"); sky.addColorStop(1, "rgba(160,200,255,0.55)");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
      // подвір’я
      ctx.fillStyle = sea.dirt; ctx.beginPath(); ctx.ellipse(POST.x, POST.y + 20, 300, 190, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(90,60,30,0.55)"; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(POST.x, POST.y + 20, 300, 190, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      // межа мотузки
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(POST.x, POST.y, ROPE, 0, 7); ctx.stroke();
      api.D.emoji("🏚️", 110, 110, 70); api.D.emoji("⛰️", 880, 80, 80); api.D.text("Скеля", 880, 135, { size: 14, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      for (const g of S.grains) api.D.emoji("🌾", g.x, g.y, 20);
      for (const f of S.feathers) api.D.emoji("🪶", f.x, f.y + Math.sin(api.t * 3 + f.x) * 3, 26);
      for (const h of S.hens) api.drawActor(h);
      // мотузка
      ctx.strokeStyle = S.ropeRotten ? "#9a8f7c" : "#6b4a2a"; ctx.lineWidth = S.ropeRotten ? 2 : 3;
      ctx.beginPath(); ctx.moveTo(POST.x, POST.y); ctx.quadraticCurveTo((POST.x + S.p.x) / 2, (POST.y + S.p.y) / 2 + 20, S.p.x, S.p.y + 14); ctx.stroke();
      api.D.emoji("🪵", POST.x, POST.y, 34);
      if (S.fly) { S.p.y -= 3.2; S.p.x += S.flyDX || 0; S.p.size = Math.max(20, S.p.size - 0.15); }
      api.drawActor(S.p);
      if (S.farmer) { api.D.emoji("👨‍🌾", S.farmer.x, S.farmer.y, 44); }
      if (S.wind.on) {
        const a = S.wind.a, wx = POST.x + Math.cos(a) * 420, wy = POST.y + Math.sin(a) * 240;
        api.D.emoji("🌬️", wx, wy, 44);
        if (S.wind.say) api.D.bubble(S.wind.say, wx, wy - 18, { bg: "rgba(220,240,255,0.95)" });
      }
      if (S.bubT > 0 && S.bub) api.D.bubble(S.bub, S.p.x, S.p.y - 26);
      if (S.season === 2) { ctx.fillStyle = "rgba(255,255,255,0.85)"; for (const f of S.snow) { f.y += f.s * 1.2; f.x += Math.sin(api.t + f.y * 0.02) * 0.4; if (f.y > 540) f.y = -5; ctx.beginPath(); ctx.arc(f.x, f.y, 2 * f.s, 0, 7); ctx.fill(); } }
      if (S.chorus > 0) api.D.text("Кури співають хором: Q — кудкудакнути разом", 480, 520, { size: 15, color: "#fff", stroke: "rgba(0,0,0,.6)" });
    },
  };

  function bubble(t) { S.bub = t; S.bubT = 2.6; }
  function spawnGrain(api) { const a = Math.random() * 7, r = Math.random() * 150; S.grains.push({ x: POST.x + Math.cos(a) * r * 1.5, y: POST.y + 20 + Math.sin(a) * r * 0.9 }); }
  function spawnFeather(api) { const a = Math.random() * 7, r = api.rand(128, 150); S.feathers.push({ x: POST.x + Math.cos(a) * r, y: POST.y + Math.sin(a) * r }); }

  function tug(api) {
    S.tugCD = 1.2; api.shake(5, 0.25);
    if (S.ropeRotten) { breakFree(api); return; }
    if (S.wing >= 50) { S.wing -= 8; api.sfx("bad"); bubble("Мотузка тримає. Ще міцна."); }
    else { api.sfx("bad"); bubble("Сил замало навіть щоб смикнути."); }
  }

  async function breakFree(api) {
    if (S.done) return; S.done = true; api.locked = true;
    api.sfx("whoosh"); api.burst(S.p.x, S.p.y + 10, "🟫", 8, { size: 10 });
    await api.say([["", "Мотузка розсипається в руках вітру. Вона перегнила ще взимку."]]);
    if (S.wing >= 40) { S.fly = true; S.flyDX = 2.6; await api.wait(1.6); api.locked = false; api.end("В"); }
    else { S.p.x = 760; S.p.y = 140; await api.say([["", "Ти змахуєш крилами… і долітаєш лише до паркану."]]); api.locked = false; api.end("Г"); }
  }

  function seasonEvents(dt, api) {
    const t = S.st;
    if (S.season === 0) {
      if (t > 7 && !S.ev.farmer) { S.ev.farmer = true; S.farmer = { x: 110, y: 160 }; api.banner("Селянин приносить зерно тим, хто ближче до центру"); for (let i = 0; i < 10; i++) spawnGrain(api); }
      if (S.farmer) { S.farmer.x += (POST.x - 60 - S.farmer.x) * dt; S.farmer.y += (POST.y - 40 - S.farmer.y) * dt; if (t > 13) S.farmer = null; }
      if (t > 16 && !S.ev.f2) { S.ev.f2 = true; spawnFeather(api); spawnFeather(api); }
    }
    if (S.season === 1) {
      S.wind.on = true; S.wind.a += dt * 0.9;
      S.wind.say = t % 6 < 2.5 ? "Летимо!" : "";
      if (t > 4 && !S.ev.w1) { S.ev.w1 = true; api.banner("Вітер кличе в небо. Спробуй рвонути мотузку (Пробіл)"); }
      if (t > 10 && !S.ev.f3) { S.ev.f3 = true; spawnFeather(api); spawnFeather(api); }
    }
    if (S.season === 2) {
      S.wind.on = false;
      if (Math.floor(t) % 8 === 2 && S.chorus <= 0) { S.chorus = 4; api.sfx("blip"); }
      if (t > 1 && !S.ev.c1) { S.ev.c1 = true; api.banner("Кури співають. Хто кудкудакає разом, отримує подвійне зерно", 3200); }
    }
    if (S.season === 3) {
      S.wind.on = true; S.wind.a += dt * 0.5; S.wind.say = t > 6 && t < 11 ? "Смикни ногою…" : "";
    }
  }

  async function finalCall(api) {
    if (S.done) return; S.done = true; api.locked = true;
    S.wind.on = true; S.wind.say = "Хто тут орел?";
    await api.say([["Вітер", "Я пролітаю востаннє. Хто тут орел?"]]);
    const c = await api.choose("Злетіти до Скелі означає залишити все зерно (" + S.grain + ").", ["Злетіти до Скелі", "Лишитися на подвір’ї"], "Вітер");
    if (c === 1) {
      await api.say([["", "Ти лишаєшся. Пізніше селянин нахиляється до мотузки і хитає головою: вона давно перегнила."]]);
      api.locked = false; return api.end("Б");
    }
    S.ropeRotten = true; api.sfx("whoosh");
    if (S.wing >= 40) { S.fly = true; S.flyDX = (880 - S.p.x) / 140; await api.wait(1.8); api.locked = false; api.end("А"); }
    else { S.p.x = 760; S.p.y = 140; await api.say([["", "Мотузка луснула від першого руху. Але крила донесли тебе лише до паркану."]]); api.locked = false; api.end("Г"); }
  }

  PG.start(game);
})();
