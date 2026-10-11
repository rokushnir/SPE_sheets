/* Гра 05 «Вакансія Лисиці» — аркада «музичні стільці» за притчею «Лісова демократія». */
(function () {
  const C = { x: 480, y: 300 }, CHAIR_R = 140, RING_R = 225;
  const JOBS = [
    { n: "Лисиця", e: "🦊" }, { n: "Заєць", e: "🐰" }, { n: "Вовк", e: "🐺" }, { n: "Сова", e: "🦉" },
    { n: "Білка", e: "🐿️" }, { n: "Ведмідь", e: "🐻" }, { n: "Їжак", e: "🦔" }, { n: "Борсук", e: "🦡" },
  ];
  const DESKS = [{ x: 200, y: 150, n: "Прийомна" }, { x: 740, y: 170, n: "Відділ кадрів" }, { x: 460, y: 420, n: "Канцелярія Лева" }];
  let S;

  const game = {
    id: "05", title: "Вакансія Лисиці", parable: "Лісова демократія",
    story: "Лисиця пішла у відпустку, а коли повернулася, її посаду вже зайняли. Вільною була лише посада Зайця. «Якщо я тепер Заєць, то ким працюєш ти?» — «Я тепер працюю Лисицею». Так буває, коли посаду Лева займає Віслюк.",
    goal: "Ти — Лисиця. Поки грає музика, звірі ходять по колу. Музика стихає, і кожен біжить до вільного стільця. Хто де сів, ту посаду й отримав. Хто не встиг, іде в канцелярію по три печатки.",
    controls: ["Стрілки або WASD — бігти", "Поки грає музика, тримайся зовнішнього кола", "Музика стихла — торкнися вільного стільця, щоб сісти", "У канцелярії: підійди до столу і натисни Пробіл, щоб подати заяву"],
    help: "<kbd>←↑→↓</kbd> бігти · <kbd>Пробіл</kbd> подати заяву в канцелярії",
    actLabel: "Заява",
    endings: {
      "А": { title: "Кожен на своєму місці", text: "Ти домовився з тим, хто займав твою посаду, і повернувся до своєї справи. Ліс знову працює злагоджено." },
      "Б": { title: "Ліс у хаосі", text: "Ти лишився на чужій посаді, як і всі. Заєць ловить, Лисиця гризе моркву, Сова працює вдень. Ніхто не робить свого, і ніщо не працює." },
      "В": { title: "Вибори", text: "Звірі проголосували ногами, і корона повернулася до Лева. Новий Лев роздав посади за покликанням, а не за швидкістю бігу до стільців." },
      "Г": { title: "Віслюк віддав корону", text: "Ти лишився на своєму місці й показав приклад. Віслюк зняв корону сам: «Це не моя роль». У лісі таке трапляється найрідше." },
    },
    moral: "Кожен колектив — проєкція дому. Система ламається, коли шестерня стоїть на місці муфти. Будь-яку проблему можна вирішити, якщо взяти свою власну роль замість чужої маски.",
    questions: ["Чию роль ви граєте вдома? А на роботі?", "Хто у вашому «лісі» зараз працює Лисицею?", "Що потрібно, щоб повернутися на своє місце?"],

    _s() { return S; },
    init(api) {
      const animals = JOBS.map((j, i) => ({ e: j.e, own: i, job: i, ang: (i / 8) * Math.PI * 2 + 0.2, x: 0, y: 0, react: 0, target: -1, seated: -1, npc: i !== 0, flip: false, phase: 0, moving: false, size: 40, speed: 195 }));
      for (const a of animals) { a.x = C.x + Math.cos(a.ang) * RING_R; a.y = C.y + Math.sin(a.ang) * RING_R * 0.8; }
      S = {
        a: animals, me: animals[0], chairs: JOBS.map((j, i) => ({ job: i, ang: (i / 8) * Math.PI * 2, closed: false, by: null })),
        phase: "idle", t: 0, round: 0, musicLen: 6, scene: "forest", office: null, king: "🦁", notes: [], decree: "",
      };
      for (const ch of S.chairs) { ch.x = C.x + Math.cos(ch.ang) * CHAIR_R; ch.y = C.y + Math.sin(ch.ang) * CHAIR_R * 0.8; }
    },
    async start(api) {
      await api.say([["Лев", "Лисице, вигляд у тебе втомлений. Може, у відпустку?"]]);
      const c = await api.choose("Відпустка означає три печатки в канцелярії і чуже місце після повернення.", ["Так, піду у відпустку", "Ні, працюватиму"], "Лисиця");
      if (c === 0) { S.vacation = true; enterOffice(api, "vacation"); }
      else nextRound(api);
    },

    update(dt, api) {
      S.t += dt;
      if (S.scene === "office") return officeUpdate(dt, api);
      const me = S.me;
      // гравець
      if (S.phase === "music" || S.phase === "stop") {
        if (me.seated < 0) api.moveActor(me, dt, { x0: 30, x1: 930, y0: 50, y1: 520 });
        if (S.phase === "music") {
          const d = Math.hypot(me.x - C.x, (me.y - C.y) / 0.8);
          if (d < RING_R - 40) { const k = (RING_R - 40) / d; me.x = C.x + (me.x - C.x) * k; me.y = C.y + (me.y - C.y) * k; }
        }
      }
      // npc
      for (const a of S.a) {
        if (!a.npc || a.away) continue;
        if (S.phase === "music") { a.ang += dt * (0.55 + (a.own % 3) * 0.05); a.tx = C.x + Math.cos(a.ang) * RING_R; a.ty = C.y + Math.sin(a.ang) * RING_R * 0.8; }
        else if (S.phase === "stop" && a.seated < 0) {
          a.react -= dt;
          if (a.react <= 0) {
            if (a.target < 0 || S.chairs[a.target].by || S.chairs[a.target].closed) a.target = nearestFree(a);
            if (a.target >= 0) { a.tx = S.chairs[a.target].x; a.ty = S.chairs[a.target].y; }
          }
        }
        if (a.tx != null) {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), sp = S.phase === "stop" ? 150 : 110;
          a.moving = d > 3; if (a.moving) { const s = Math.min(d, sp * dt); a.x += dx / d * s; a.y += dy / d * s; a.flip = dx > 0; a.phase += dt * 9; }
        }
      }
      if (S.phase === "music") {
        if (Math.random() < dt * 3) S.notes.push({ x: api.rand(380, 580), y: 300, t: 0 });
        if (S.t > S.musicLen) stopMusic(api);
      }
      for (const n of S.notes) { n.t += dt; n.y -= 40 * dt; }
      S.notes = S.notes.filter((n) => n.t < 1.6);
      if (S.phase === "stop") {
        // хто торкнувся вільного стільця, той сів
        for (const a of S.a) {
          if (a.away || a.seated >= 0) continue;
          for (const ch of S.chairs) if (!ch.closed && !ch.by && Math.hypot(a.x - ch.x, a.y - ch.y) < 24) { ch.by = a; a.seated = ch.job; a.x = ch.x; a.y = ch.y; a.moving = false; if (!a.npc) api.sfx("good"); break; }
        }
        const free = S.chairs.filter((c) => !c.closed && !c.by).length;
        if (free === 0 || S.t > 6) settle(api);
      }
      api.hud([["Раунд", Math.max(1, S.round) + " з 3"], ["Твоя посада", JOBS[me.job].n], ["Король", S.king === "🦁" ? "Лев" : "Віслюк"]]);
    },

    draw(ctx, api) {
      if (S.scene === "office") return officeDraw(ctx, api);
      ctx.fillStyle = "#4f7d3a"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#5c8c44"; for (let i = 0; i < 50; i++) ctx.fillRect((i * 131) % 960, (i * 71) % 540, 10, 10);
      for (let i = 0; i < 9; i++) api.D.emoji("🌲", 40 + i * 110, 30 + (i % 2) * 10, 48);
      ctx.fillStyle = "#8c7a52"; ctx.beginPath(); ctx.ellipse(C.x, C.y, RING_R + 30, (RING_R + 30) * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#6a8f45"; ctx.beginPath(); ctx.ellipse(C.x, C.y, RING_R - 40, (RING_R - 40) * 0.8, 0, 0, 7); ctx.fill();
      // трон
      api.D.emoji("🪑", C.x, C.y + 10, 50); api.D.emoji(S.king, C.x, C.y - 18, 48); api.D.emoji("👑", C.x, C.y - 50, 26);
      for (const ch of S.chairs) {
        api.D.rr(ch.x - 26, ch.y - 22, 52, 44, 8, ch.closed ? "rgba(60,60,60,0.6)" : "#c9a26b", "#7a5a32");
        api.D.emoji(JOBS[ch.job].e, ch.x, ch.y - 4, 20, { alpha: ch.closed ? 0.35 : 0.9 });
        api.D.text(JOBS[ch.job].n, ch.x, ch.y + 30, { size: 11, color: "#fff", stroke: "rgba(0,0,0,.55)", strokeW: 3 });
        if (ch.closed) api.D.text("закрито", ch.x, ch.y - 30, { size: 11, color: "#ffd1c8" });
      }
      for (const n of S.notes) api.D.emoji("🎵", n.x, n.y, 22, { alpha: 1 - n.t / 1.6 });
      for (const a of S.a) {
        if (a.away) continue;
        api.D.shadow(a.x, a.y + 16, 14);
        const bob = a.moving ? Math.abs(Math.sin(a.phase)) * 4 : 0;
        api.D.emoji(a.e, a.x, a.y - 8 - bob, a === S.me ? 46 : 38, { flip: a.flip });
        if (a.job !== a.own) api.D.text("працює: " + JOBS[a.job].n, a.x, a.y + 26, { size: 11, color: "#ffe9a8", stroke: "rgba(0,0,0,.6)", strokeW: 3 });
        if (a === S.me) api.D.text("ТИ", a.x, a.y - 44, { size: 12, color: "#fff", stroke: "rgba(0,0,0,.6)" });
      }
      if (S.phase === "music") api.D.text("Музика грає… тримайся зовнішнього кола", 480, 520, { size: 16, color: "#fff", stroke: "rgba(0,0,0,.6)" });
      if (S.phase === "stop") api.D.text("СТОП! До вільного стільця!", 480, 520, { size: 20, color: "#ffe066", stroke: "rgba(0,0,0,.7)", display: true });
      if (S.decree) api.D.bubble(S.decree, C.x, C.y - 66, { size: 14, bg: "rgba(255,240,200,0.97)" });
    },
  };

  function nearestFree(a) {
    let best = -1, bd = 1e9;
    for (const ch of S.chairs) { if (ch.closed || ch.by) continue; const d = Math.hypot(a.x - ch.x, a.y - ch.y); if (d < bd) { bd = d; best = ch.job; } }
    return best;
  }

  function nextRound(api) {
    S.round++; S.phase = "music"; S.t = 0; api.sfx("bell");
    S.musicLen = S.king === "🦁" ? api.rand(5, 8) : api.pick([2.2, 9, 3]);
    for (const ch of S.chairs) { ch.by = null; ch.closed = false; }
    for (const a of S.a) { a.seated = -1; a.target = -1; a.away = false; if (a.npc) { a.ang = Math.atan2((a.y - C.y) / 0.8, a.x - C.x); } }
    if (S.me.x == null || Math.hypot(S.me.x - C.x, S.me.y - C.y) < RING_R - 40) { S.me.x = C.x; S.me.y = C.y + RING_R * 0.8; }
    api.banner("Раунд " + S.round + ". Музика!");
  }

  function stopMusic(api) {
    S.phase = "stop"; S.t = 0; api.sfx("bad");
    const open = S.chairs.filter((c) => !c.closed);
    const close = api.pick(open); close.closed = true; S.closedJob = close.job;
    for (const a of S.a) { a.react = api.rand(0.25, 0.75); a.target = -1; }
    if (S.vacation && S.round === 1 && !S.vacDone) { /* Лисиця у відпустці: без неї */ }
  }

  async function settle(api) {
    if (S.phase !== "stop") return;
    S.phase = "result";
    const losers = S.a.filter((a) => !a.away && a.seated < 0);
    for (const a of S.a) if (a.seated >= 0) a.job = a.seated;
    const vacancy = S.closedJob;
    for (const l of losers) if (l.npc) { l.job = vacancy; }
    if (losers.includes(S.me)) {
      await api.say([["Лев", "Не встигла? Тоді у відпустку. Збери три печатки, а потім отримаєш, що лишиться."]]);
      return enterOffice(api, "lost");
    }
    api.banner("Твоя посада тепер: " + JOBS[S.me.job].n);
    await api.wait(1.4);
    betweenRounds(api);
  }

  async function betweenRounds(api) {
    if (S.round === 1) {
      const me = S.me;
      await api.say([["Лев", "Ревізія! Чия це посада?"], ["Лев", me.job === me.own ? "Лисиця на місці Лисиці. Добре." : `Лисиця працює ${JOBS[me.job].n === "Заєць" ? "Зайцем" : "як " + JOBS[me.job].n}. Ну, що ж, працюй.`]]);
      nextRound(api);
    } else if (S.round === 2) {
      S.king = "🫏";
      await api.say([["", "Указ! Лев іде на полювання, і корону тимчасово отримує Віслюк."], ["Віслюк", "Відтепер музика гратиме, скільки я скажу. І-а!"]]);
      S.decree = "Ведмідь віднині літає. І-а!";
      setTimeout(() => (S.decree = ""), 5000);
      nextRound(api);
    } else finale(api);
  }

  function enterOffice(api, why) {
    S.scene = "office"; S.why = why;
    S.office = {
      p: api.actor({ x: 80, y: 470, emoji: "🦊", size: 42, speed: 190 }), step: 0, wait: 0,
      snails: [{ x: 100, y: 290, v: 70, e: "🐌" }, { x: 700, y: 330, v: -60, e: "🐌" }, { x: 400, y: 250, v: 90, e: "🐢" }],
      msg: "", msgT: 0,
    };
    api.banner("Канцелярія. Збери печатки у трьох кабінетах по черзі.", 2800);
  }

  function officeUpdate(dt, api) {
    const o = S.office, p = o.p;
    api.moveActor(p, dt, { x0: 30, x1: 930, y0: 70, y1: 510 });
    o.msgT -= dt;
    for (const s of o.snails) {
      s.x += s.v * dt; if (s.x < 60 || s.x > 900) s.v *= -1;
      if (Math.hypot(p.x - s.x, p.y - s.y) < 34) { p.x -= Math.sign(s.x - p.x) * 40; api.sfx("bad"); o.msg = "Зачекайте, у нас обідня перерва!"; o.msgT = 2; }
    }
    if (o.step < 3) {
      const d = DESKS[o.step];
      if (Math.hypot(p.x - d.x, p.y - d.y) < 60) {
        if (api.input.act || o.wait > 0) { o.wait += dt; if (o.wait > 1.6) { o.step++; o.wait = 0; api.sfx("good"); api.burst(d.x, d.y - 20, "📄", 6, { size: 16 }); if (o.step === 3) api.banner("Усі печатки є. Вихід — праворуч унизу"); } }
      } else o.wait = 0;
      for (let i = 0; i < 3; i++) if (i !== o.step && Math.hypot(p.x - DESKS[i].x, p.y - DESKS[i].y) < 60 && o.msgT <= 0) { o.msg = i < o.step ? "Тут ви вже були. Далі!" : "Спершу печатка з попереднього кабінету"; o.msgT = 2; }
    } else if (Math.hypot(p.x - 890, p.y - 470) < 50) leaveOffice(api);
    api.hud([["Канцелярія", ""], ["Печатки", o.step + " з 3"]]);
  }

  async function leaveOffice(api) {
    if (S.scene !== "office") return;
    S.scene = "forest";
    const me = S.me;
    if (S.why === "vacation") {
      // поки Лисиці не було, Заєць зайняв її місце
      const hare = S.a[1]; hare.job = 0; me.job = 1;
      await api.say([["Лев", "З поверненням! Але посада Лисиці вже зайнята. Вільна лише посада Зайця."], ["Заєць", "Я тепер працюю Лисицею. А ти будеш Зайцем."]]);
      S.vacDone = true;
      nextRound(api);
    } else {
      me.job = S.closedJob;
      await api.say([["Лев", "Вільна лише посада: " + JOBS[me.job].n + ". Бери, що дають."]]);
      betweenRounds(api);
    }
  }

  function officeDraw(ctx, api) {
    const o = S.office;
    ctx.fillStyle = "#cfc6b4"; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#bdb39f"; for (let x = 0; x < 960; x += 60) for (let y = 60; y < 540; y += 60) if ((x + y) % 120 === 0) ctx.fillRect(x, y, 60, 60);
    ctx.fillStyle = "#8f8471"; ctx.fillRect(0, 0, 960, 56);
    api.D.text("КАНЦЕЛЯРІЯ ЛЕВА · Прийом заяв щодня з 13:00 до 13:05", 480, 30, { size: 16, color: "#fff", display: true });
    DESKS.forEach((d, i) => {
      api.D.rr(d.x - 60, d.y - 20, 120, 46, 8, i < o.step ? "#9cc58a" : i === o.step ? "#f0d58c" : "#a99b80", "#6b5f4a");
      api.D.emoji("🗂️", d.x - 30, d.y, 26); api.D.emoji(i < o.step ? "✅" : "🦉", d.x + 30, d.y - 2, 26);
      api.D.text((i + 1) + ". " + d.n, d.x, d.y + 42, { size: 13, color: "#3b3326" });
      if (i === o.step && o.wait > 0) api.D.bar(d.x - 50, d.y - 38, 100, 8, o.wait / 1.6, "#3a7bd5");
    });
    api.D.emoji("🚪", 890, 470, 56); api.D.text("Вихід", 890, 510, { size: 13, color: "#3b3326" });
    for (const s of o.snails) api.D.emoji(s.e, s.x, s.y, 36, { flip: s.v > 0 });
    api.drawActor(o.p);
    if (o.msgT > 0) api.D.bubble(o.msg, o.p.x, o.p.y - 26, { size: 13 });
    const d = DESKS[Math.min(2, o.step)];
    if (o.step < 3 && Math.hypot(o.p.x - d.x, o.p.y - d.y) < 60 && o.wait === 0) api.D.text("Пробіл — подати заяву", d.x, d.y - 46, { size: 13, color: "#1b2030" });
  }

  async function finale(api) {
    api.locked = true;
    const me = S.me, own = me.job === me.own;
    await api.say([["Віслюк", "Ліс працює погано. Заєць ловить, Сова спить уночі. Хто винен? І-а!"]]);
    let c;
    if (own) {
      c = await api.choose("Ти на своєму місці. Що робитимеш?", ["Показати приклад і попросити Віслюка віддати корону", "Вимагати чесних виборів Лева", "Хай усе буде, як є"], "Лисиця");
      api.locked = false;
      return api.end(["Г", "В", "Б"][c]);
    }
    c = await api.choose(`Ти працюєш як ${JOBS[me.job].n}. Що робитимеш?`, ["Домовитися і повернутися на свою посаду", "Вимагати чесних виборів Лева", "Лишитися на чужій посаді"], "Лисиця");
    if (c === 0) { for (const a of S.a) a.job = a.own; S.king = "🦁"; }
    if (c === 1) S.king = "🦁";
    api.locked = false;
    api.end(["А", "В", "Б"][c]);
  }

  PG.start(game);
})();
