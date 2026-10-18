/* Гра 08 «Перехрестя на Багдад» — подорож мапою з головоломкою-запитанням за притчею «Запитання». */
(function () {
  const X = { x: 420, y: 300 };
  const CITIES = [
    { n: "Дамаск", x: 140, y: 110, line: "Дамаск. Гарне місто, але не Багдад. Місцевий мудрець каже: «Хто не знає, куди пливе, тому жоден вітер не попутний»." },
    { n: "Мосул", x: 720, y: 85, line: "Мосул. Купці сміються: «Багдад? Це ж зовсім в інший бік!»" },
    { n: "Басра", x: 150, y: 470, line: "Басра. Тут продають фініки і чутки, але не дорогу." },
    { n: "Багдад", x: 885, y: 400, line: "" },
  ];
  const ROADS = [[X, CITIES[0]], [X, CITIES[1]], [X, CITIES[2]], [X, { x: 640, y: 330 }], [{ x: 640, y: 330 }, CITIES[3]]];
  const QUESTIONS = ["Що таке правда?", "Як мені стати щасливим?", "Чи існує Бог?", "Як заробляти більше, будучи духовною людиною?", "Чи буде цього року врожай моркви?", "В який бік іти, щоб найшвидше дістатися до Багдада?"];
  const WISDOMS = ["«Щастя — це шлях, а не пункт призначення»", "«Правда в тому, що правд багато»", "«Хто шукає, той знайде. Колись»", "«Усе мине, і це теж»"];
  const DAY = 150;
  let S;

  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  const game = {
    id: "08", title: "Перехрестя на Багдад", parable: "Запитання",
    story: "На роздоріжжі подорожні годину засипали Майстра питаннями про правду, Бога, гроші й моркву. Він мовчав. Відповів лише селянинові, який спитав, як дійти до Багдада: «Він єдиний знав, чого насправді хоче».",
    goal: "Тобі треба до Багдада до заходу сонця. Дорогові знаки стерті. Майстер на перехресті знає дорогу, але відповідає не кожному.",
    controls: ["Стрілки або WASD — іти (по дорозі швидше, пустелею повільно)", "Пробіл або E — говорити з Майстром, торговцем, подорожнім"],
    help: "<kbd>←↑→↓</kbd> іти · <kbd>Пробіл</kbd> говорити",
    actLabel: "Говорити",
    endings: {
      "А": { title: "Знав, чого хотів", text: "Ти спитав прямо і отримав пряму відповідь. До Багдада дійшов задовго до заходу сонця." },
      "Б": { title: "Сонце сіло", text: "Сонце сіло, а Багдада не видно. Питання були красиві, а відповіді мудрі, але жодна не була про дорогу." },
      "В": { title: "Дійшов, заблукавши", text: "Ти таки дійшов до Багдада, але вже в сутінках, оминувши кілька чужих міст. Дорога стала короткою лише тоді, коли ти зрозумів, куди йдеш." },
      "Г": { title: "Показав дорогу іншому", text: "Ти не лише сам дійшов до Багдада, а й допоміг розгубленому подорожньому зрозуміти, куди йде він. Тепер вас двоє тих, хто знає, чого хоче." },
    },
    moral: "Щоб отримати те, чого хочемо, треба знати, чого хочемо. Відповіді приходять лише на ті запитання, яких ми прагнемо, як спраглий води. Решта проходить повз вуха Всесвіту.",
    questions: ["Що б ви запитали, якби мали право лише на одне запитання?", "Які ваші цілі звучать як «щось хороше»?", "За які «вічні відповіді» ви платите замість того, щоб іти?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: 330, y: 330, emoji: "🧕", size: 36, speed: 150 }),
        time: DAY, asked: 0, knows: false, coins: 5, wisdom: 0, visited: new Set(), helped: false, npcGone: 0,
        npc: { x: 380, y: 380 }, crowd: true, done: false, msg: "", msgT: 0,
      };
    },
    async start(api) {
      await api.say([["", "Перехрестя. Біля Майстра юрмляться подорожні."], ["Подорожній", "Скажіть, що таке правда?"], ["Подорожня", "Як мені помиритися з чоловіком?"], ["Купець", "Як заробляти більше, будучи духовною людиною?"], ["", "Майстер мовчить. Подорожні невдоволено розходяться."]]);
      S.crowd = false;
    },

    update(dt, api) {
      const p = S.p;
      if (S.done) return;
      S.time -= dt; S.msgT -= dt;
      const onRoad = ROADS.some(([a, b]) => segDist(p, a, b) < 26);
      api.moveActor(p, dt, { x0: 20, x1: 940, y0: 40, y1: 520 }, onRoad ? 1 : 0.45);
      for (const c of CITIES) {
        if (Math.hypot(p.x - c.x, p.y - c.y) < 40 && !S.visited.has(c.n)) {
          S.visited.add(c.n);
          if (c.n === "Багдад") return arrive(api);
          api.sfx("bell"); api.say([["", c.line]]);
        }
      }
      if (S.npcGone) { S.npc.x += (CITIES[1].x - S.npc.x) * dt * 0.4; S.npc.y += (CITIES[1].y - S.npc.y) * dt * 0.4; }
      if (api.input.act) act(api);
      if (S.time <= 0) sunset(api);
      api.hud([["До заходу сонця", Math.max(0, Math.ceil(S.time)) + " с"], ["Монет", S.coins], S.wisdom ? ["Мудростей", S.wisdom] : null]);
    },

    draw(ctx, api) {
      const k = Math.max(0, S.time / DAY);
      ctx.fillStyle = `rgb(${200 + 30 * k},${150 + 50 * k},${90 + 40 * k})`; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.ellipse((i * 157) % 960, (i * 89) % 540, 60, 8, 0.2, 0, 7); ctx.fill(); }
      for (const [a, b] of ROADS) { ctx.strokeStyle = "#9b7a4c"; ctx.lineWidth = 34; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      if (S.knows) { ctx.setLineDash([14, 12]); ctx.lineDashOffset = -api.t * 40; ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X.x, X.y); ctx.lineTo(640, 330); ctx.lineTo(CITIES[3].x, CITIES[3].y); ctx.stroke(); ctx.setLineDash([]); }
      for (const c of CITIES) { api.D.emoji(c.n === "Багдад" ? "🕌" : "🏘️", c.x, c.y - 10, 56); api.D.text(S.visited.has(c.n) || c.n === "Багдад" && S.knows ? c.n : "???", c.x, c.y + 28, { size: 14, color: "#fff", stroke: "rgba(0,0,0,.55)" }); }
      // знак без написів
      api.D.emoji("🪧", X.x + 40, X.y - 40, 34);
      api.D.emoji("🌴", 560, 180, 46); api.D.emoji("🌵", 260, 230, 36); api.D.emoji("🐪", 740, 470, 44);
      // майстер, торговець, подорожній
      api.D.emoji("🧓", X.x, X.y - 6, 44); api.D.text("Майстер", X.x, X.y + 26, { size: 12, color: "#fff", stroke: "rgba(0,0,0,.55)" });
      api.D.emoji("⛺", 520, 230, 56); api.D.emoji("🧞", 520, 270, 30); api.D.text("Мудрість на продаж", 520, 296, { size: 12, color: "#fff", stroke: "rgba(0,0,0,.55)" });
      if (S.npcGone < 2) { api.D.emoji("🧑‍🌾", S.npc.x, S.npc.y, 38); if (!S.helped) api.D.text("?", S.npc.x + 18, S.npc.y - 22, { size: 18, color: "#fff", stroke: "rgba(0,0,0,.6)" }); }
      if (S.crowd) for (let i = 0; i < 5; i++) api.D.emoji(["🧔", "👩", "👨‍💼", "👵", "🧑"][i], X.x - 80 + i * 40, X.y + 60, 32);
      api.drawActor(S.p);
      if (S.msgT > 0) api.D.bubble(S.msg, S.p.x, S.p.y - 26, { size: 13 });
      // сонце
      const sx = 900 - (1 - k) * 640, sy = 34 + Math.pow((1 - k) * 2 - 1, 2) * 16;
      api.D.emoji(k > 0.25 ? "☀️" : "🌇", sx, sy, 36);
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.8; }

  async function act(api) {
    const p = S.p;
    if (Math.hypot(p.x - X.x, p.y - X.y) < 60) return master(api);
    if (Math.hypot(p.x - 520, p.y - 260) < 60) return merchant(api);
    if (S.npcGone < 2 && Math.hypot(p.x - S.npc.x, p.y - S.npc.y) < 50) return traveler(api);
  }

  async function master(api) {
    if (S.knows) { await api.say([["Майстер", "Я вже сказав: іди цією дорогою."]]); return; }
    const c = await api.choose("Майстер дивиться на тебе і чекає. Про що спитаєш?", QUESTIONS, "Майстер");
    S.asked++;
    if (c === QUESTIONS.length - 1) {
      S.knows = true; api.sfx("good");
      await api.say([["Майстер", "Ідіть цією дорогою."], ["Учень Майстра", "Чому ви відповіли лише йому? Він таємний святий?"], ["Майстер", "Ні. Просто він єдиний знав, чого насправді хоче."]]);
    } else {
      api.sfx("bad");
      await api.say([["", "Майстер мовчить і дивиться кудись удалину."], ["Учень Майстра", S.asked >= 2 ? "Учитель відповідає тим, хто знає, чого хоче. А куди йдеш ти?" : "Учитель сьогодні мовчазний."]]);
    }
  }

  async function merchant(api) {
    if (S.coins <= 0) { await api.say([["Торговець", "Без монет мудрість не продається!"]]); return; }
    const c = await api.choose("Вічні істини! Одна монета, і ти знатимеш те, чого не знає ніхто.", ["Купити мудрість (1 монета)", "Спитати дорогу до Багдада", "Піти"], "Торговець");
    if (c === 0) { S.coins--; S.wisdom++; api.sfx("pick"); S.time -= 6; await api.say([["Торговець", WISDOMS[(S.wisdom - 1) % WISDOMS.length]], ["", "Гарно сказано. Але про дорогу ні слова. Поки ти слухав, сонце опустилося нижче."]]); }
    else if (c === 1) await api.say([["Торговець", "Дорогу? Ні-ні, дорогами я не торгую. Лише вічними істинами!"]]);
  }

  async function traveler(api) {
    if (S.helped) { await api.say([["Подорожній", "Дякую! Іду в Мосул, до брата."]]); return; }
    await api.say([["Подорожній", "Я вже тиждень на цьому перехресті. Іду кудись, де краще… Тільки не знаю, куди."]]);
    const c = await api.choose("Що скажеш?", ["«А де живуть ті, кого ти любиш?»", "«Спитай Майстра»", "«Я теж не знаю»"], "Ти");
    if (c === 0) {
      S.helped = true; S.npcGone = 1; api.sfx("good");
      await api.say([["Подорожній", "…Брат! Брат у Мосулі кличе мене вже рік. Ось куди я йду!"]]);
      setTimeout(() => { S.npcGone = 2; }, 6000);
    } else if (c === 1) await api.say([["Подорожній", "Питав. Він мовчить."]]);
  }

  async function arrive(api) {
    S.done = true; api.locked = true; api.sfx("end");
    const early = S.time > DAY * 0.5;
    const wandered = ["Дамаск", "Мосул", "Басра"].some((n) => S.visited.has(n));
    await api.say([["", "Ворота Багдада. Ти дійшов."]]);
    api.locked = false;
    if (S.helped) return api.end("Г");
    if (early && !wandered) return api.end("А");
    api.end("В");
  }

  async function sunset(api) {
    S.done = true; api.locked = true;
    await api.say([["", "Сонце сідає. Багдада не видно."]]);
    api.locked = false; api.end("Б");
  }

  PG.start(game);
})();
