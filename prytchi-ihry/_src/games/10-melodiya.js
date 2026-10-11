/* Гра 10 «Вічна мелодія» — ритм-гра за «Притчею про скрипаля». */
(function () {
  const CIRCLE = { x: 330, y: 290 }, R = 165, SEATS = 8, ME = 4;
  const INSTR = ["🥁", "🎹", "🎺", "🎷", "🎻", "🎸", "🪕", "🪗"];
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
  const LANE = { x: 760, top: 70, hit: 450 }, FALL = 1.6, WIN = 0.16;
  let S;

  const game = {
    id: "10", title: "Вічна мелодія", parable: "Притча про скрипаля",
    story: "Звичайний скрипаль помер і пішов на дивовижну музику. У колі сиділи музиканти, і для нього був вільний стілець. Щоразу, коли надходила його черга, він грав найкраще, що знав. Нарешті спитав сусіда: «Скільки ще триватиме цей концерт?» — «Не хвилюйтесь, колего, ця мелодія вічна».",
    goal: "Спершу йди на звук у темряві. Потім сядь у коло. Коли надійде твоя черга, натискай Пробіл саме тоді, коли нота торкається лінії.",
    controls: ["Стрілки або WASD — іти на звук", "Пробіл або E — зіграти ноту, коли вона на лінії"],
    help: "<kbd>←↑→↓</kbd> іти · <kbd>Пробіл</kbd> нота",
    actLabel: "Нота",
    endings: {
      "А": { title: "Вийшов з кола", text: "Ти встав, щоб відпочити. Мелодія не зупинилася ні на мить: вона звучала й без тебе. Стілець і далі чекав." },
      "Б": { title: "Спитав, скільки ще", text: "«Не хвилюйтесь, колего, ця мелодія вічна». Ти всміхнувся й перестав чекати кінця, бо зрозумів, що його не буде." },
      "В": { title: "Грав разом", text: "Ти перестав виступати і почав слухати. Диригент тихо вийшов з кола, а мелодія трималася сама, і ти був її частиною." },
      "Г": { title: "Своя мелодія", text: "Ти заграв щось своє, і коло підхопило. Тепер у вічній мелодії є і твоя фраза." },
    },
    moral: "Мелодія буденного життя вічна: робота, справи, спілкування, миття посуду триватимуть до останнього подиху. Не варто чекати, коли «все скінчиться», щоб почати насолоджуватися.",
    questions: ["На що ви чекаєте, щоб «нарешті відпочити»?", "Де ви «виступаєте», замість того щоб грати разом?", "Яку свою партію ви вже внесли у спільну мелодію?"],

    _s() { return S; },
    init(api) {
      S = {
        phase: "walk", p: api.actor({ x: 840, y: 470, emoji: "🧑‍🦯", size: 40, speed: 120 }),
        clock: 0, bpm: 84, turn: 0, turnStart: 0, notes: [], harmony: 50, myTurns: 0, cont: 0, conductor: true,
        flash: 0, label: "", impro: null, motif: [], playMotif: null, choiceDue: 3, leaving: false,
      };
    },
    start(api) { api.banner("Темно. Десь звучить музика. Йди на звук."); },

    update(dt, api) {
      if (S.phase === "walk") return walk(dt, api);
      if (S.phase === "end") return;
      const beat = 60 / S.bpm;
      S.clock += dt; S.flash = Math.max(0, S.flash - dt * 3);
      const len = turnBeats() * beat;
      // зміна черги
      if (S.clock - S.turnStart >= len) nextTurn(api);
      const cur = S.turn % SEATS, k = Math.floor((S.clock - S.turnStart) / beat);
      if (cur !== ME && k !== S.lastBeat) { S.lastBeat = k; api.sfx("note", SCALE[(cur + k * 2) % SCALE.length]); S.flash = 1; }
      if (cur === ME && S.impro) {
        if (api.input.act) { S.motif.push(S.clock - S.turnStart); api.sfx("note", SCALE[(S.motif.length * 3) % SCALE.length] * 1.5); S.flash = 1; }
      } else if (api.input.act) hit(api);
      // ноти, які ніхто не зіграв
      for (const n of S.notes) if (!n.done && S.clock - n.t > WIN) { n.done = true; n.miss = true; S.harmony = Math.max(0, S.harmony - 4); S.label = "Мимо"; S.labelT = 0.6; }
      S.notes = S.notes.filter((n) => S.clock - n.t < 1 || n.t > S.clock);
      if (S.playMotif) { for (const m of S.playMotif) if (!m.p && S.clock >= m.t) { m.p = true; api.sfx("note", SCALE[m.i % SCALE.length]); S.flash = 1; } }
      S.labelT = (S.labelT || 0) - dt;
      api.hud([["Гармонія", Math.round(S.harmony)], ["Твоїх партій", S.myTurns], ["Темп", Math.round(S.bpm)]]);
    },

    draw(ctx, api) {
      if (S.phase === "walk") return walkDraw(ctx, api);
      ctx.fillStyle = "#16142b"; ctx.fillRect(0, 0, 960, 540);
      const g = ctx.createRadialGradient(CIRCLE.x, CIRCLE.y, 20, CIRCLE.x, CIRCLE.y, 330);
      g.addColorStop(0, `rgba(255,214,140,${0.25 + S.flash * 0.15})`); g.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
      const cur = S.turn % SEATS;
      for (let i = 0; i < SEATS; i++) {
        const a = (i / SEATS) * Math.PI * 2 - Math.PI / 2, x = CIRCLE.x + Math.cos(a) * R, y = CIRCLE.y + Math.sin(a) * R * 0.82;
        const active = i === cur;
        api.D.circle(x, y + 10, 34, active ? "rgba(255,214,120,0.35)" : "rgba(255,255,255,0.06)", active ? "#ffd678" : "rgba(255,255,255,0.15)", 2);
        if (i === ME && S.leaving) continue;
        api.D.emoji(["👩", "🧔", "👵", "🧑‍🦱", "🙂", "👨‍🦰", "👩‍🦳", "🧑"][i], x, y - 8, 34);
        api.D.emoji(INSTR[i], x + 18, y + 16, 26 + (active ? S.flash * 6 : 0));
        if (i === ME) api.D.text("ТИ", x, y - 36, { size: 12, color: "#ffd678" });
      }
      if (S.conductor) api.D.emoji("🧑‍🏫", CIRCLE.x, CIRCLE.y, 46);
      else api.D.emoji("🎼", CIRCLE.x, CIRCLE.y, 40, { alpha: 0.7 });
      if (S.leaving) api.D.emoji("🚶", 120 + Math.min(1, S.leaveK || 0) * -60, 470, 40);
      // доріжка нот
      api.D.rr(LANE.x - 50, LANE.top - 20, 100, LANE.hit - LANE.top + 70, 16, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.15)");
      ctx.fillStyle = "#ffd678"; ctx.fillRect(LANE.x - 46, LANE.hit - 2, 92, 4);
      for (const n of S.notes) {
        if (n.done && !n.miss) continue;
        if (n.t - S.clock > FALL) continue;
        const y = LANE.hit - (n.t - S.clock) / FALL * (LANE.hit - LANE.top);
        api.D.emoji("🎵", LANE.x, y, 34, { alpha: n.miss ? 0.3 : 1 });
      }
      const mine = cur === ME;
      api.D.text(mine ? (S.impro ? "Імпровізуй! Пробіл — будь-коли" : "Твоя партія!") : "Слухай коло…", LANE.x, LANE.hit + 40, { size: 15, color: mine ? "#ffd678" : "#b7b3d6" });
      if (S.labelT > 0) api.D.text(S.label, LANE.x, LANE.hit - 40, { size: 20, color: S.label === "Мимо" ? "#ff8a8a" : "#9cffb0", display: true });
      api.D.bar(LANE.x - 50, 30, 100, 10, S.harmony / 100, "#ffd678");
    },
  };

  function turnBeats() { return S.turn % SEATS === ME && S.myTurns >= 2 && !S.impro ? 6 : 4; }

  function walk(dt, api) {
    const p = S.p;
    api.moveActor(p, dt, { x0: 20, x1: 940, y0: 40, y1: 520 });
    S.clock += dt;
    const beat = 60 / S.bpm, k = Math.floor(S.clock / beat);
    if (k !== S.lastBeat) { S.lastBeat = k; const d = Math.hypot(p.x - CIRCLE.x, p.y - CIRCLE.y); if (!api.input.x && !api.input.y || k % 2 === 0) api.sfx("note", SCALE[k % 5] * (d > 400 ? 0.5 : 1)); }
    if (Math.hypot(p.x - CIRCLE.x, p.y - CIRCLE.y) < 140) arrive(api);
  }

  function walkDraw(ctx, api) {
    const p = S.p, d = Math.hypot(p.x - CIRCLE.x, p.y - CIRCLE.y);
    ctx.fillStyle = "#07060f"; ctx.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 6; i++) {
      const r = ((api.t * 70 + i * 90) % 540);
      ctx.strokeStyle = `rgba(255,214,140,${Math.max(0, 0.35 - r / 1600) * (1.2 - Math.min(1, d / 800))})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, r, 0, 7); ctx.stroke();
    }
    api.drawActor(p);
    api.D.text(d < 300 ? "Музика зовсім близько…" : d < 550 ? "Музика гучнішає" : "Ледь чутно музику", 480, 510, { size: 16, color: "#cfc7ff" });
  }

  async function arrive(api) {
    S.phase = "story"; api.locked = true;
    await api.say([["", "Ти бачиш коло музикантів. Вони грають по черзі, і разом виходить мелодія, яку хочеться слухати вічно."], ["", "Одне крісло вільне. Сусід киває: сідай."], ["", "Коли настане твоя черга, натискай Пробіл, щойно нота торкнеться лінії."]]);
    S.phase = "play"; S.clock = 0; S.turnStart = 0; S.turn = 0; S.lastBeat = -1; api.locked = false;
  }

  function nextTurn(api) {
    const wasMe = S.turn % SEATS === ME;
    S.turn++; S.turnStart = S.clock; S.lastBeat = -1;
    if (wasMe) {
      if (S.impro) return improDone(api);
      S.myTurns++; S.bpm = Math.min(120, S.bpm + 6);
      if (S.leaving) return;
      if (S.myTurns >= S.choiceDue) choice(api);
    }
    if ((S.turn + 1) % SEATS === ME && !S.impro && !S.leaving) spawnMyNotes(S.clock + 4 * (60 / S.bpm));
  }

  function spawnMyNotes(base) {
    const beat = 60 / S.bpm, beats = S.myTurns >= 2 ? 6 : 4;
    for (let k = 0; k < beats; k++) {
      S.notes.push({ t: base + k * beat, done: false });
      if (S.myTurns >= 1 && k % 2 === 1) S.notes.push({ t: base + (k + 0.5) * beat, done: false });
    }
  }

  function hit(api) {
    let best = null, bd = 1e9;
    for (const n of S.notes) { if (n.done) continue; const d = Math.abs(n.t - S.clock); if (d < bd) { bd = d; best = n; } }
    if (best && bd < WIN) { best.done = true; S.harmony = Math.min(100, S.harmony + 5); api.sfx("note", SCALE[4] * 1.5); S.label = bd < 0.06 ? "Чудово!" : "Добре"; S.labelT = 0.5; S.flash = 1; }
    else if (S.turn % SEATS === ME) { S.harmony = Math.max(0, S.harmony - 2); S.label = "Мимо"; S.labelT = 0.5; }
  }

  async function choice(api) {
    const c = await api.choose("Ти зіграв уже " + S.myTurns + " партії, і черга знову йде до тебе. Сусід показує картку: «Можеш запитати, скільки триватиме концерт».", ["Грати далі", "Спитати сусіда, скільки ще", "Встати і піти відпочити", "Заграти свою мелодію"], "Скрипаль");
    if (c === 0) {
      S.cont++; S.choiceDue = S.myTurns + 2;
      if (S.cont >= 2) { S.conductor = false; api.banner("Диригент тихо виходить з кола. Мелодія тримається сама."); setTimeout(() => finish(api, "В"), 4000); }
      else api.banner("Ти граєш далі. Може, слухати інших теж частина партії?");
    } else if (c === 1) {
      await api.say([["Скрипаль", "Колего, скажіть, скільки ще триватиме цей концерт?"], ["Сусід", "Не хвилюйтесь, колего. Ця мелодія вічна."]]);
      finish(api, "Б");
    } else if (c === 2) {
      S.leaving = true; S.notes.length = 0; api.banner("Ти встаєш. Коло грає далі без тебе.");
      setTimeout(() => finish(api, "А"), 4500);
    } else {
      S.impro = true; S.motif = [];
      api.banner("Наступна партія — твоя імпровізація. Натискай Пробіл, як підкаже серце.", 3000);
    }
  }

  function improDone(api) {
    const m = S.motif.length ? S.motif : [0, 0.4, 0.8, 1.6];
    const beat = 60 / S.bpm;
    S.playMotif = [];
    for (let rep = 0; rep < 3; rep++) m.forEach((t, i) => S.playMotif.push({ t: S.clock + 0.4 + rep * 4 * beat + t, i: i + rep * 2 }));
    api.banner("Коло підхоплює твою мелодію!");
    setTimeout(() => finish(api, "Г"), 5000);
  }

  function finish(api, letter) {
    if (S.phase === "end") return;
    S.phase = "end"; api.end(letter);
  }

  PG.start(game);
})();
