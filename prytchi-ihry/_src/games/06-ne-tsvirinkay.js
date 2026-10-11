/* Гра 06 «Не цвірінькай!» — стелс за «Історією одного горобчика». */
(function () {
  const NEST = { x: 900, y: 300 }, FLOCK = { x: 470, y: 420 }, START = { x: 50, y: 300 };
  let S;

  const game = {
    id: "06", title: "Не цвірінькай!", parable: "Історія одного горобчика",
    story: "Горобчик замерз і впав на землю. Корова зробила на нього «свою справу», і він відігрівся. Вийшло сонечко, горобчик радісно зацвірінькав, і його одразу з’їла лисиця.",
    goal: "Дістанься до теплого гнізда. Коли Лисиця обертається, завмри. Холод забирає сили. Корова зігріває, але по-своєму. Найважче — не зацвірінькати, коли визирне сонечко.",
    controls: ["Стрілки або WASD — повзти", "Лисиця дивиться (👀) — не рухайся", "Пробіл або E — почиститися від плямки", "Q або Shift — зацвірінькати"],
    help: "<kbd>←↑→↓</kbd> рух · <kbd>Пробіл</kbd> почиститися · <kbd>Q</kbd> цвірінькнути",
    actLabel: "Почиститися", altLabel: "Цвірінь!",
    endings: {
      "А": { title: "Дійшов тихо", text: "Ти дістався гнізда мовчки. Плямка, якої ти соромився, гріла тебе всю дорогу. Іноді виручають звідти, звідки не чекаєш." },
      "Б": { title: "Замерз", text: "Холод виявився сильнішим. Може, варто було потерпіти плямку і не поспішати чиститися? Не плач, як загубиш." },
      "В": { title: "Зацвірінькав", text: "Ти зрадів сонечку на весь голос, і Лисиця почула. Не тішся, як знайдеш: не все, що виглядає порятунком, ним є." },
      "Г": { title: "Зграя врятувала", text: "Лисиця кинулася на тебе, але горобці стали стіною. Ти дійшов до гнізда, бо був не сам." },
    },
    moral: "Не завжди ворог той, хто втягнув вас у халепу, і не завжди друг той, хто з неї витягнув. Життя вчить, питання лише в тому, які уроки ми засвоюємо.",
    questions: ["Яка «плямка» колись вас урятувала?", "Коли ви зацвірінькали зарано?", "Хто у вашому житті був «Коровою», якої ви соромилися?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: START.x, y: START.y, emoji: "🐦", size: 30, speed: 105 }),
        warm: 100, spot: false, fox: { x: 780, y: 140, st: "away", t: 3, chase: false }, cow: { x: 380, y: 250, tx: 380, ty: 250, t: 0 },
        sun: 0, sunT: 8, saved: false, caught: 0, msg: "", msgT: 0, done: false, cleaned: false, everSpot: false,
      };
    },
    start(api) { api.banner("Поле. Гніздо праворуч. Лисиця зараз спиною до тебе."); },

    update(dt, api) {
      const p = S.p, f = S.fox;
      if (S.done) return;
      // холод
      const drain = S.spot ? 1.3 : 3.6;
      S.warm = Math.max(0, S.warm - drain * dt);
      const sp = S.warm < 25 ? 0.55 : S.spot ? 1.3 : 1;
      const ox = p.x, oy = p.y;
      api.moveActor(p, dt, { x0: 20, x1: 940, y0: 80, y1: 510 }, sp);
      const moved = Math.hypot(p.x - ox, p.y - oy) > 0.4;
      // лисиця
      if (!f.chase) {
        f.t -= dt;
        if (f.t <= 0) {
          if (f.st === "away") { f.st = "turn"; f.t = 0.75; api.sfx("blip"); }
          else if (f.st === "turn") { f.st = "watch"; f.t = api.rand(1.8, 3); }
          else { f.st = "away"; f.t = api.rand(2.5, 4.5); }
        }
        if (f.st === "watch" && moved && p.x > 120) caught(api);
      } else {
        const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
        f.x += dx / d * 420 * dt; f.y += dy / d * 420 * dt;
        if (d < 30) pounce(api);
      }
      // корова
      const c = S.cow; c.t -= dt;
      if (c.t <= 0) { c.t = api.rand(3, 5); c.tx = api.rand(200, 700); c.ty = api.rand(150, 470); }
      const cdx = c.tx - c.x, cdy = c.ty - c.y, cd = Math.hypot(cdx, cdy);
      if (cd > 2) { c.x += cdx / cd * 30 * dt; c.y += cdy / cd * 30 * dt; c.flip = cdx > 0; }
      if (Math.hypot(p.x - c.x, p.y - c.y) < 40 && !S.spot) {
        S.spot = true; S.everSpot = true; S.warm = 100; api.sfx("whoosh"); api.burst(p.x, p.y, "🟤", 6, { size: 12 });
        api.banner("Корова «зігріла» тебе по-своєму. Тепло! Але… плямка.");
        msg("Горобці в кущах сміються з тебе");
      }
      // почиститися
      if (api.input.act && S.spot) { S.spot = false; S.cleaned = true; api.sfx("pick"); msg("Чистий! Але знову холодно…"); }
      // сонечко
      S.sunT -= dt;
      if (S.sunT <= 0 && S.sun <= 0) { S.sun = 4.5; S.sunT = api.rand(11, 15); api.banner("Сонечко визирнуло! Так хочеться зацвірінькати…", 2600); }
      S.sun = Math.max(0, S.sun - dt);
      if (api.input.alt) chirp(api);
      if (S.warm <= 0) freeze(api);
      if (Math.hypot(p.x - NEST.x, p.y - NEST.y) < 40) reach(api);
      S.msgT -= dt;
      api.hud([["Тепло", Math.round(S.warm)], S.spot ? ["Плямка", "гріє"] : null, ["Повернень на старт", S.caught]]);
    },

    draw(ctx, api) {
      const sunny = S.sun > 0;
      ctx.fillStyle = sunny ? "#a7c97a" : "#9fb59a"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = sunny ? "#9cc06b" : "#90a78a"; for (let i = 0; i < 60; i++) ctx.fillRect((i * 113) % 960, 70 + (i * 61) % 460, 14, 4);
      ctx.fillStyle = "#c7d6e4"; ctx.fillRect(0, 0, 960, 70);
      api.D.emoji(sunny ? "☀️" : "🌥️", 900, 36, 46);
      for (let i = 0; i < 12; i++) api.D.emoji("🍂", (i * 83 + 30) % 960, 90 + (i * 47) % 430, 16, { alpha: 0.6 });
      api.D.emoji("🌳", NEST.x + 10, NEST.y - 50, 90); api.D.emoji("🪺", NEST.x, NEST.y, 40);
      api.D.text("Гніздо", NEST.x, NEST.y + 30, { size: 13, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      api.D.emoji("🌿", FLOCK.x, FLOCK.y, 70);
      for (let i = 0; i < 3; i++) api.D.emoji("🐦", FLOCK.x - 22 + i * 22, FLOCK.y - 18 + (i % 2) * 6 + Math.sin(api.t * 4 + i) * 2, 22, { flip: i % 2 === 0 });
      api.D.emoji("🐄", S.cow.x, S.cow.y, 62, { flip: S.cow.flip });
      // лисиця
      const f = S.fox, watching = f.st !== "away" || f.chase;
      api.D.emoji("🦊", f.x, f.y, 54, { flip: !watching });
      if (f.st === "turn") api.D.text("…", f.x, f.y - 40, { size: 22, color: "#fff" });
      if (f.st === "watch" || f.chase) api.D.emoji("👀", f.x, f.y - 42, 26);
      // гравець
      const p = S.p;
      api.drawActor(p);
      if (S.spot) api.D.emoji("🟤", p.x + 6, p.y + 2, 12);
      if (S.warm < 30) api.D.emoji("❄️", p.x - 14, p.y - 18, 14);
      if (S.msgT > 0) api.D.bubble(S.msg, p.x, p.y - 20, { size: 13 });
      if (f.st === "watch") api.D.text("ЗАВМРИ!", 480, 520, { size: 22, color: "#ffe066", stroke: "rgba(0,0,0,.7)", display: true });
      if (sunny) api.D.text("Q — зацвірінькати від радості (+30 тепла)", 480, 100, { size: 15, color: "#3b2a00", stroke: "rgba(255,255,255,.7)", strokeW: 3 });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.6; }

  function caught(api) {
    S.caught++; api.sfx("bad"); api.shake(5, 0.25);
    api.banner("Лисиця помітила рух! Назад, на старт.");
    S.p.x = START.x; S.p.y = START.y;
  }

  function chirp(api) {
    const p = S.p, f = S.fox;
    api.sfx("note", 1400); setTimeout(() => api.sfx("note", 1700), 90);
    msg("Цвірінь-цвірінь!");
    if (S.sun > 0) S.warm = Math.min(100, S.warm + 30);
    if (f.st !== "away" || Math.hypot(p.x - f.x, p.y - f.y) < 330) { f.chase = true; api.banner("Лисиця почула!"); }
  }

  async function pounce(api) {
    const p = S.p, f = S.fox;
    if (!S.saved && Math.hypot(p.x - FLOCK.x, p.y - FLOCK.y) < 110) {
      S.saved = true; f.chase = false; f.x = 780; f.y = 140; f.st = "away"; f.t = 3;
      api.sfx("good"); api.burst(p.x, p.y, "🐦", 8, { size: 20 });
      await api.say([["", "Горобці з куща злітають і стають стіною між тобою і Лисицею. Лисиця відступає."]]);
      return;
    }
    S.done = true; api.locked = true; api.sfx("bad"); api.shake(10, 0.4);
    await api.say([["", "Лисиця стрибає. Радісне «цвірінь» було останнім."]]);
    api.locked = false; api.end("В");
  }

  async function freeze(api) {
    S.done = true; api.locked = true; api.sfx("bad");
    await api.say([["", S.cleaned ? "Ти почистився, і холод швидко забрав тепло. Крила не слухаються." : "Холод забрав останнє тепло. Крила не слухаються."]]);
    api.locked = false; api.end("Б");
  }

  async function reach(api) {
    S.done = true; api.locked = true; api.sfx("good");
    await api.say([["", S.saved ? "Ти в гнізді. Без зграї ти б сюди не дійшов." : "Ти в теплому гнізді. Тихо, як і належить горобцю, який усе зрозумів."]]);
    api.locked = false; api.end(S.saved ? "Г" : "А");
  }

  PG.start(game);
})();
