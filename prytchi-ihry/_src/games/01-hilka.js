/* Гра 01 «Гілка над проваллям» — пригода в темряві за притчею «Атеїст». */
(function () {
  const PATH = [[60, 480], [260, 470], [300, 360], [140, 300], [160, 180], [380, 140], [470, 260], [640, 300], [700, 170], [860, 110]];
  const BRANCH = [[470, 260], [560, 420], [770, 470]]; // стежка Сумнівів
  const HALF = 34;
  const STONES = [[280, 410], [150, 240], [560, 285]];
  let S;

  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
  }
  function lineDist(p, pts) { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, segDist(p, pts[i], pts[i + 1])); return m; }
  function strokePath(ctx, pts, w, color) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.stroke();
  }

  const game = {
    id: "01", title: "Гілка над проваллям", parable: "Атеїст",
    story: "Атеїст зірвався у провалля і вчепився за гілку. «Боже, врятуй, і я повірю!» — «Добре, відпусти гілку». — «Та чи я божевільний?»",
    goal: "Ніч, гірська стежка, видно лише крок уперед. Іди на світло Голосу. Сумніви шепочуть інше. Наприкінці доведеться вирішити, чи відпустити гілку.",
    controls: ["Стрілки або WASD — іти", "Пробіл або E — покликати Голос: на мить стає світліше (3 рази)", "Зійдеш зі стежки — зірвешся і повернешся трохи назад"],
    help: "<kbd>←↑→↓</kbd> іти · <kbd>Пробіл</kbd> покликати Голос",
    actLabel: "Покликати",
    endings: {
      "А": { title: "Відпустив", text: "Ти розтиснув пальці і м’яко став на землю. Провалля було глибиною двадцять сантиметрів. Світанок застав тебе в долині." },
      "Б": { title: "Тримався до кінця", text: "Ти тримався, доки не заніміли руки, і зісковзнув сам. Під ногами була земля, двадцять сантиметрів. Поруч жінка з копицею буркнула: «Так я і знала»." },
      "В": { title: "Торгувався", text: "Ти вимагав гарантій, доки не зійшло сонце. Тоді побачив, що висиш над землею. Голос мовчав: торгуватися з вірою неможливо." },
      "Г": { title: "Пішов за Сумнівами", text: "«Коротша» стежка завела в туман. Сумніви замовкли так само раптово, як і з’явилися: вести вони нікуди не збиралися." },
    },
    moral: "Ми спочатку віримо, що щось отримаємо, і лише потім отримуємо, ніколи навпаки. Віра — точний інструмент, який потребує тренування.",
    questions: ["За яку «гілку» ви досі тримаєтеся?", "Чий голос у вашому житті звучить як Сумнів?", "Де ви «знали заздалегідь», що не вийде?"],

    _s() { return S; },
    init(api) {
      S = {
        mode: "walk",
        p: api.actor({ x: 60, y: 480, emoji: "🚶", size: 34, speed: 115 }),
        checkpoint: { x: 60, y: 480 }, slips: 0, calls: 3, glow: 0,
        voiceDot: 0, voiceT: 0, events: {}, whisper: null, whisperT: 0, voice: null, voiceTxt: 0,
        hang: null, reveal: 0, stumble: 0,
      };
    },

    start(api) {
      api.say([["Голос", "Ти на гірській стежці, і зараз ніч. Іди на моє світло. Не сходь зі стежки."]]);
    },

    update(dt, api) {
      if (S.mode === "walk") walk(dt, api);
      else if (S.mode === "hold") holdUpdate(dt, api);
      S.glow = Math.max(0, S.glow - dt);
      S.whisperT -= dt; S.voiceTxt -= dt; S.stumble = Math.max(0, S.stumble - dt);
      api.hud([["Покликів", S.calls], ["Зривів", S.slips]]);
    },

    draw(ctx, api) {
      if (S.mode === "walk" || S.mode === "fog") drawWalk(ctx, api);
      else drawHang(ctx, api);
    },
  };

  function trigger(key, fn) { if (!S.events[key]) { S.events[key] = true; fn(); } }

  function walk(dt, api) {
    const p = S.p;
    api.moveActor(p, dt, { x0: 20, x1: 940, y0: 30, y1: 520 }, S.stumble > 0 ? 0.4 : 1);
    if (api.input.act && S.calls > 0) { S.calls--; S.glow = 2.2; api.sfx("bell"); say(api, "Я тут. Іди вгору, до світла."); }

    const onMain = lineDist(p, PATH) < HALF, onBranch = lineDist(p, BRANCH) < HALF;
    if (!onMain && !onBranch) {
      S.slips++; api.sfx("bad"); api.shake(8, 0.35);
      api.banner("Камінці посипалися з-під ніг. Ти ледь втримався і повернувся назад.");
      p.x = S.checkpoint.x; p.y = S.checkpoint.y;
    }
    // контрольні точки на основній стежці
    for (let i = 0; i < PATH.length; i++) {
      if (Math.hypot(p.x - PATH[i][0], p.y - PATH[i][1]) < 40 && onMain) S.checkpoint = { x: PATH[i][0], y: PATH[i][1] };
    }
    // каміння
    for (const s of STONES) {
      const d = Math.hypot(p.x - s[0], p.y - s[1]);
      if (d < 95) trigger("warn" + s[0], () => say(api, "Обережно, попереду камінь."));
      if (d < 20 && S.stumble <= 0) { S.stumble = 1.2; api.sfx("bad"); api.shake(4, 0.2); p.x -= (s[0] - p.x) * 1.2; p.y -= (s[1] - p.y) * 1.2; api.banner("Спіткнувся об камінь"); }
    }
    // події на шляху
    if (Math.hypot(p.x - 300, p.y - 360) < 50) trigger("dbt1", () => whisper(api, "Нікого там немає. Це твоя уява."));
    if (Math.hypot(p.x - 160, p.y - 180) < 50) trigger("silence", () => { api.banner("Голос замовк. Тиша."); S.silence = 6; });
    if (Math.hypot(p.x - 400, p.y - 170) < 60) trigger("dbt2", () => whisper(api, "Праворуч і вниз — коротше! Тобі ж туди."));
    if (Math.hypot(p.x - 470, p.y - 260) < 40) trigger("fork", () => say(api, "Вгору, до мене. Не вниз."));
    if (S.silence) { S.silence -= dt; if (S.silence <= 0) { S.silence = 0; say(api, "Я нікуди не зникав. Іди далі."); } }
    if (onBranch && !onMain && Math.hypot(p.x - 640, p.y - 455) < 60) trigger("dbt3", () => whisper(api, "Ще трохи, ще трошки…"));
    if (Math.hypot(p.x - 770, p.y - 470) < 40) { S.mode = "fog"; api.locked = true; api.sfx("whoosh"); api.say([["", "Туман густішає. Стежка зникає. Шепіт стихає, і ти розумієш, що далі дороги немає."]]).then(() => { api.locked = false; api.end("Г"); }); }
    // фінал основної стежки
    if (Math.hypot(p.x - 860, p.y - 110) < 34 && S.mode === "walk") fall(api);

    // світло Голосу біжить уперед
    S.voiceT += dt;
    if (S.voiceT > 5) { S.voiceT = 0; }
  }

  function say(api, t) { S.voice = t; S.voiceTxt = 3.2; }
  function whisper(api, t) { S.whisper = t; S.whisperT = 3.5; api.sfx("whoosh"); }

  async function fall(api) {
    S.mode = "hang"; api.locked = true; api.sfx("bad"); api.shake(12, 0.5);
    S.hang = { y: 0, grip: 1, woman: -80, line: "" };
    await api.wait(0.9);
    await api.say([["", "Камінь сповзає з-під ноги. Ти падаєш і в останню мить хапаєшся за гілку над проваллям."], ["Ти", "Боже, врятуй! Якщо врятуєш, повірю в Тебе!"], ["Голос", "Е ні, знаю я таких, як ти."], ["Ти", "Повірю, чесне слово!"], ["Голос", "Гаразд. Я врятую тебе. Відпусти гілку."]]);
    await decide(api, false);
  }

  async function decide(api, bargained) {
    const opts = bargained ? ["Відпустити гілку", "Ще поторгуватися"] : ["Відпустити гілку", "Триматися", "Спершу дай гарантії"];
    const c = await api.choose("Голос чекає.", opts, "Голос");
    if (c === 0) return letGo(api, "А");
    if (bargained && c === 1) {
      await api.say([["Ти", "А якщо там каміння? Дай знак! Дай мотузку!"], ["", "Голос мовчить. Небо на сході світлішає…"]]);
      S.reveal = 0.001; await api.wait(2.2); api.locked = false; return api.end("В");
    }
    if (c === 2) {
      await api.say([["Голос", "Спершу віра, потім результат. Можеш опустити одну ногу."]]);
      return decide(api, true);
    }
    // тримається
    await api.say([["", "Тримайся! Утримуй пробіл або кнопку, щоб не впасти. Відпусти, коли вирішиш."]]);
    S.mode = "hold"; api.locked = false; S.holdT = 0;
  }

  function holdUpdate(dt, api) {
    const h = S.hang; S.holdT += dt;
    h.grip -= dt * (api.input.actHeld ? 0.075 : 0.5);
    if (S.holdT > 2.5) h.woman = Math.min(300, h.woman + dt * 120);
    if (S.holdT > 5 && !S.events.hay1) { S.events.hay1 = true; api.say([["Жінка з копицею", "Копице, перейди у стодолу!"], ["Жінка з копицею", "…Так я і знала."]]); }
    if (api.input.actHeld) { S.heldOnce = true; S.relT = 0; } else if (S.heldOnce) S.relT = (S.relT || 0) + dt;
    if (S.relT > 0.35 && h.grip > 0.15 && !S.events.release) { S.events.release = true; S.mode = "hang"; letGo(api, "А"); return; }
    if (h.grip <= 0) { S.mode = "hang"; letGo(api, "Б"); }
  }

  async function letGo(api, letter) {
    api.locked = true; api.sfx("whoosh");
    S.hang.drop = 0.001;
    await api.wait(0.9);
    S.reveal = 0.001; api.sfx("good");
    await api.wait(1.2);
    await api.say(letter === "А"
      ? [["", "Ти падаєш… на двадцять сантиметрів. Під ногами м’яка трава. Небо світлішає, і стає видно долину."]]
      : [["", "Пальці розтискаються самі. Ти падаєш… на двадцять сантиметрів. Під ногами була земля весь цей час."]]);
    api.locked = false; api.end(letter);
  }

  function drawWalk(ctx, api) {
    const p = S.p;
    ctx.fillStyle = "#1a2236"; ctx.fillRect(0, 0, 960, 540);
    // провалля: тріщини
    ctx.fillStyle = "#0e1424";
    for (let i = 0; i < 18; i++) { const x = (i * 157) % 960, y = (i * 263) % 540; ctx.beginPath(); ctx.ellipse(x, y, 60, 22, i, 0, 7); ctx.fill(); }
    strokePath(ctx, BRANCH, HALF * 2, "#3a3f4f");
    strokePath(ctx, PATH, HALF * 2, "#4b5468");
    strokePath(ctx, PATH, HALF * 2 - 16, "#5a6479");
    // туман на кінці стежки Сумнівів
    const fg = ctx.createRadialGradient(770, 470, 10, 770, 470, 120); fg.addColorStop(0, "rgba(200,205,220,0.6)"); fg.addColorStop(1, "rgba(200,205,220,0)");
    ctx.fillStyle = fg; ctx.fillRect(600, 330, 340, 210);
    for (const s of STONES) api.D.emoji("🪨", s[0], s[1], 26);
    api.D.emoji("🌳", 905, 92, 56);
    // світло Голосу попереду
    const k = (api.t % 5) / 5; const target = nextPoint(p);
    const vx = p.x + (target[0] - p.x) * (0.3 + k * 0.7), vy = p.y + (target[1] - p.y) * (0.3 + k * 0.7);
    // темрява
    const r = S.glow > 0 ? 280 : S.silence ? 80 : 130;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.45, p.x, p.y, r);
    g.addColorStop(0, "rgba(4,6,14,0)"); g.addColorStop(1, "rgba(4,6,14,0.93)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    // світло Голосу і червоні вогники Сумнівів видно крізь темряву
    if (!S.silence) {
      const vg = ctx.createRadialGradient(vx, vy, 2, vx, vy, 26); vg.addColorStop(0, "rgba(255,220,120,0.95)"); vg.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = vg; ctx.fillRect(vx - 30, vy - 30, 60, 60);
    }
    if (S.events.dbt2) {
      for (let i = 0; i < 4; i++) {
        const t = ((api.t * 0.4 + i / 4) % 1);
        const x = 470 + (770 - 470) * t, y = 260 + (470 - 260) * Math.sin(t * Math.PI / 2);
        const rg = ctx.createRadialGradient(x, y, 1, x, y, 16); rg.addColorStop(0, "rgba(255,90,90,0.8)"); rg.addColorStop(1, "rgba(255,90,90,0)");
        ctx.fillStyle = rg; ctx.fillRect(x - 18, y - 18, 36, 36);
      }
    }
    api.drawActor(p);
    if (S.voiceTxt > 0 && S.voice) api.D.bubble("Голос: " + S.voice, p.x, p.y - 30, { bg: "rgba(255,226,140,0.95)" });
    else if (S.whisperT > 0 && S.whisper) api.D.bubble("Сумнів: " + S.whisper, p.x, p.y - 30, { bg: "rgba(255,170,170,0.95)" });
  }

  function nextPoint(p) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < PATH.length; i++) { const d = Math.hypot(p.x - PATH[i][0], p.y - PATH[i][1]); if (d < bd) { bd = d; best = i; } }
    return PATH[Math.min(PATH.length - 1, best + 1)];
  }

  function drawHang(ctx, api) {
    const h = S.hang || { grip: 1 };
    const rv = S.reveal ? Math.min(1, (S.reveal += api.dt || 0.016) / 1.5) : 0;
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, rv ? `rgb(${40 + rv * 150},${50 + rv * 120},${90 + rv * 110})` : "#0b1020"); sky.addColorStop(1, "#05070d");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
    // скеля
    ctx.fillStyle = "#2a3245"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(380, 0); ctx.lineTo(360, 160); ctx.lineTo(330, 540); ctx.lineTo(0, 540); ctx.fill();
    // гілка
    ctx.strokeStyle = "#6b4b2a"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(350, 170); ctx.lineTo(520, 150); ctx.stroke();
    api.D.emoji("🍃", 520, 140, 28);
    const drop = h.drop ? Math.min(1, (h.drop += (api.dt || 0.016) * 3)) : 0;
    const by = 230 + drop * 50;
    // земля, яку видно лише на світанку
    ctx.save(); ctx.globalAlpha = rv; ctx.fillStyle = "#3e6b3a"; ctx.fillRect(330, 300, 630, 240);
    ctx.fillStyle = "#4f8a49"; ctx.fillRect(330, 300, 630, 14); ctx.restore();
    if (!rv) { const dg = ctx.createLinearGradient(0, 280, 0, 540); dg.addColorStop(0, "rgba(0,0,0,0)"); dg.addColorStop(1, "rgba(0,0,0,0.9)"); ctx.fillStyle = dg; ctx.fillRect(330, 280, 630, 260); }
    api.D.emoji("🧗", 480, by, 70, { flip: true });
    if (rv) api.D.text("20 см", 600, 285, { size: 16, color: "#fff", stroke: "rgba(0,0,0,.6)" });
    if (h.woman > -80) { api.D.emoji("👩‍🌾", 960 - h.woman, 270, 46); api.D.emoji("🌾", 960 - h.woman + 50, 280, 40); }
    if (S.mode === "hold") {
      api.D.text("Сила рук", 700, 60, { size: 16, color: "#fff" });
      api.D.bar(620, 76, 160, 14, h.grip, h.grip > 0.3 ? "#f2c14e" : "#e05a4f");
      api.D.text(api.input.actHeld ? "Тримаєшся…" : "Утримуй пробіл!", 700, 110, { size: 15, color: "#cfd6e6" });
    }
  }

  PG.start(game);
})();
