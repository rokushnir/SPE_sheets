/* Гра 14 «Слоняча мотузка» — гра-експеримент за притчею «Про мотузку, яка втримує слона». */
(function () {
  const TREE = { x: 200, y: 270 }, ROPE = 130, GARDEN = { x: 860, y: 270 }, OTHER = { x: 260, y: 470 };
  const LOGS = [{ x: 470, y: 200, r: 34 }, { x: 520, y: 340, r: 34 }, { x: 650, y: 260, r: 30 }, { x: 600, y: 450, r: 30 }, { x: 700, y: 130, r: 30 }];
  let S;

  const game = {
    id: "14", title: "Слоняча мотузка", parable: "Про мотузку, яка втримує слона",
    story: "Великий слон був прив’язаний до дерева тонесенькою мотузкою. «Чому він її не розірве?» — «Коли він був слоненям, у нього була та сама мотузка. Тоді він не міг її розірвати, а тепер навіть не намагається».",
    goal: "Ти — слоненя на мотузці. За перешкодами росте сад із яблуками. Спробуй до нього дійти.",
    controls: ["Стрілки або WASD — іти", "Пробіл або E — допомогти іншому слону"],
    help: "<kbd>←↑→↓</kbd> іти · <kbd>Пробіл</kbd> допомогти",
    actLabel: "Допомогти",
    endings: {
      "А": { title: "Спробував", text: "Ти рушив і… мотузка просто зісковзнула з ноги: її давно ніхто не прив’язував. Яблука в саду смачні, а ти тепер дорослий слон." },
      "Б": { title: "Навіть не намагався", text: "Ти так і простояв біля дерева. Погонич підійшов і тихо сказав: «Ти міг». Мотузка весь цей час просто лежала на землі." },
      "В": { title: "Рушив услід за іншим", text: "Ти зрушив з місця лише тоді, коли побачив, як Подорожній спокійно пройшов до саду. Чужий приклад зламав те, чого не змогли зламати роки." },
      "Г": { title: "Звільнив іншого", text: "Ти не лише дійшов до саду, а й зняв мотузку з іншого слона. Найбільша свобода — та, якою ділишся." },
    },
    moral: "Спершу людина визнає себе переможеною, і лише потім програє. Набута безпорадність тримає сильніше за будь-яку мотузку. Правил лише два: не здавайся і ніколи не здавайся.",
    questions: ["Яка «дитяча мотузка» досі на вашій нозі?", "Хто був вашим Подорожнім, який просто пішов до саду?", "З кого ви могли б зняти мотузку вже сьогодні?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: 260, y: 270, emoji: "🐘", size: 40, speed: 120 }), phase: "child", strain: 0, tries: 0, t: 0, idle: 0,
        free: false, traveler: null, travPassed: false, otherFree: false, done: false, msg: "", msgT: 0, ev: {},
      };
    },
    async start(api) {
      await api.say([["Погонич", "Сиди тут, маленький. Мотузка міцна, тобі її не здолати."]]);
    },

    update(dt, api) {
      if (S.done) return;
      const p = S.p;
      S.t += dt; S.msgT -= dt;
      p.blocked = (x, y) => LOGS.some((l) => Math.hypot(x - l.x, y - l.y) < l.r + 16);
      const before = { x: p.x, y: p.y };
      api.moveActor(p, dt, { x0: 30, x1: 930, y0: 70, y1: 510 }, S.phase === "adult" ? 1.15 : 1);
      const d = Math.hypot(p.x - TREE.x, p.y - TREE.y);
      if (!S.free && d > ROPE) {
        if (S.phase === "child") {
          p.x = TREE.x + (p.x - TREE.x) / d * ROPE; p.y = TREE.y + (p.y - TREE.y) / d * ROPE;
          S.strain += dt;
          if (S.strain > 1.1) { S.strain = 0; S.tries++; api.sfx("bad"); api.shake(4, 0.2); msg(["Мотузка не пускає!", "Ще раз! Ні, не виходить…", "Сил замало…"][Math.min(2, S.tries - 1)]); if (S.tries === 1) say(api, "Ти ще малий. Не вийде."); }
        } else breakFree(api);
      } else S.strain = Math.max(0, S.strain - dt);
      if (S.phase === "child" && (S.tries >= 3 || S.t > 22)) grow(api);
      if (S.phase === "adult" && !S.free) adultEvents(dt, api, Math.hypot(p.x - before.x, p.y - before.y) > 0.5);
      if (S.traveler) { const tr = S.traveler; tr.x += 85 * dt; tr.y += (GARDEN.y - tr.y) * dt * 0.6; if (tr.x > GARDEN.x - 20) { S.traveler = null; S.travPassed = true; } }
      if (api.input.act && Math.hypot(p.x - OTHER.x, p.y - OTHER.y) < 60 && !S.otherFree) { S.otherFree = true; api.sfx("good"); api.burst(OTHER.x, OTHER.y, "✨", 8, { size: 16 }); msg("Ти знімаєш мотузку з іншого слона"); }
      if (S.otherFree) { S.ox = (S.ox || OTHER.x) + 60 * dt; }
      if (S.free && Math.hypot(p.x - GARDEN.x, p.y - GARDEN.y) < 70) garden(api);
      api.hud([[S.phase === "child" ? "Дитинство" : "Дорослість", ""], S.phase === "child" ? ["Спроб", S.tries + " з 3"] : null, S.free ? ["Мотузка", "впала"] : null]);
    },

    draw(ctx, api) {
      ctx.fillStyle = "#9ec27a"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#93b86f"; for (let i = 0; i < 70; i++) ctx.fillRect((i * 151) % 960, (i * 67) % 540, 12, 12);
      // сад
      ctx.fillStyle = "#86b45a"; ctx.beginPath(); ctx.ellipse(GARDEN.x, GARDEN.y, 100, 170, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) api.D.emoji("🌳", GARDEN.x - 30 + (i % 2) * 60, GARDEN.y - 130 + i * 62, 54);
      for (let i = 0; i < 6; i++) api.D.emoji("🍎", GARDEN.x - 40 + (i % 3) * 40, GARDEN.y - 40 + Math.floor(i / 3) * 60, 22);
      api.D.text("Сад", GARDEN.x, GARDEN.y + 190, { size: 14, color: "#2f4a1a", display: true });
      for (const l of LOGS) api.D.emoji("🪵", l.x, l.y, l.r * 2);
      // дерево і мотузка
      api.D.emoji("🌴", TREE.x - 6, TREE.y - 30, 80);
      const p = S.p;
      ctx.strokeStyle = S.phase === "adult" ? "#b9a27c" : "#6b4a2a"; ctx.lineWidth = S.phase === "adult" ? 2 : 4;
      if (!S.free) { ctx.beginPath(); ctx.moveTo(TREE.x, TREE.y + 10); ctx.quadraticCurveTo((TREE.x + p.x) / 2, (TREE.y + p.y) / 2 + 24, p.x - 6, p.y + 14); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(TREE.x, TREE.y + 10); ctx.quadraticCurveTo(TREE.x + 40, TREE.y + 60, TREE.x + 90, TREE.y + 40); ctx.stroke(); }
      // радіус мотузки в дитинстві
      if (S.phase === "child") { ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(TREE.x, TREE.y, ROPE, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      // інший слон
      const ox = S.otherFree ? Math.min(GARDEN.x - 40, S.ox || OTHER.x) : OTHER.x;
      api.D.emoji("🌲", OTHER.x - 50, OTHER.y - 10, 50);
      if (!S.otherFree) { ctx.strokeStyle = "#b9a27c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(OTHER.x - 50, OTHER.y); ctx.lineTo(OTHER.x - 10, OTHER.y + 10); ctx.stroke(); }
      api.D.emoji("🐘", ox, OTHER.y, 48, { flip: S.otherFree });
      if (!S.otherFree && S.phase === "adult") api.D.text("Пробіл — допомогти", OTHER.x, OTHER.y + 36, { size: 12, color: "#2f4a1a" });
      api.D.emoji("🧔🏽", 120, 140, 42); api.D.text("Погонич", 120, 172, { size: 12, color: "#2f4a1a" });
      if (S.traveler) api.D.emoji("🚶", S.traveler.x, S.traveler.y, 40, { flip: true });
      api.drawActor(p);
      if (S.msgT > 0) api.D.bubble(S.msg, p.x, p.y - 26, { size: 13 });
      if (S.say) api.D.bubble(S.say, 120, 118, { size: 13, bg: "rgba(255,240,200,0.97)" });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.4; }
  function say(api, t) { S.say = t; clearTimeout(S.sayT); S.sayT = setTimeout(() => (S.say = ""), 3500); }

  async function grow(api) {
    S.phase = "growing"; api.locked = true; api.sfx("whoosh");
    await api.say([["", "Минають роки. Слоненя виростає у великого, дужого слона."], ["Погонич", "Перешкоди ті самі. Мотузка та сама."]]);
    S.phase = "adult"; S.p.size = 66; S.p.x = TREE.x + 60; S.p.y = TREE.y; S.t = 0; S.idle = 0; api.locked = false;
  }

  function adultEvents(dt, api, moved) {
    S.idle += dt;
    if (S.t > 9 && !S.ev.smell) { S.ev.smell = true; api.banner("Вітер доносить запах яблук із саду…"); }
    if (S.t > 16 && !S.ev.trav) { S.ev.trav = true; S.traveler = { x: 40, y: 120 }; api.banner("Подорожній іде повз дерево просто до саду"); }
    if (S.t > 22 && !S.ev.other) { S.ev.other = true; say(api, "Он і другий слон стоїть. Теж не пробує."); }
    if (S.t > 38) giveUp(api);
  }

  async function breakFree(api) {
    if (S.free) return;
    S.free = true; api.sfx("good"); api.burst(S.p.x, S.p.y + 20, "✨", 10, { size: 16 });
    S.ranAfter = S.travPassed || !!S.traveler;
    await api.say([["", "Ти рушаєш — і мотузка просто зісковзує з ноги. Її давно ніхто не прив’язував."]]);
  }

  async function garden(api) {
    S.done = true; api.locked = true; api.sfx("end");
    await api.say([["", "Сад! Яблука, тінь і прохолода."]]);
    api.locked = false;
    if (S.otherFree) return api.end("Г");
    api.end(S.ranAfter ? "В" : "А");
  }

  async function giveUp(api) {
    S.done = true; api.locked = true;
    await api.say([["Погонич", "Сонце сідає. Ти навіть не спробував…"], ["Погонич", "А мотузка ж просто лежала на землі. Ти міг."]]);
    api.locked = false; api.end("Б");
  }

  PG.start(game);
})();
