/* Гра 04 «Два світи» — головоломка «знайди відмінності» за притчею «Рай і пекло». */
(function () {
  const OFF = 490; // зсув Світу Б
  const OBJ = [
    { e: "🌳", x: 80, y: 150, s: 64, n: "дерево" }, { e: "🏡", x: 330, y: 120, s: 70, n: "хату" }, { e: "🌷", x: 150, y: 430, s: 36, n: "тюльпани" },
    { e: "🍎", x: 400, y: 400, s: 34, n: "яблука" }, { e: "🐦", x: 60, y: 300, s: 30, n: "пташку" }, { e: "🌻", x: 260, y: 470, s: 40, n: "соняшник" },
  ];
  const NPC = [[170, 220], [300, 300], [110, 370], [380, 250]];
  const RUMORS = ["У них там трава зеленіша", "Їм дали більше яблук", "Там і сонце світить довше", "Чому їм усе, а нам нічого?", "Он як вони там сміються…"];
  const HAPPY = ["Гарний день!", "Яблука цього року солодкі", "Добре, що ти зайшов", "Тут так спокійно"];
  let S;

  const game = {
    id: "04", title: "Два світи", parable: "Рай і пекло",
    story: "Ангел показав чоловікові пекло і рай. Там і там те саме небо, трава і пташки. Лише в пеклі люди злі, а в раю добрі. «Чому?» — «Різниці немає. Просто ті, що в пеклі, думають, що в раю краще».",
    goal: "Ти — душа між двома світами. Ангел просить знайти, чим вони відрізняються, і вирішити, де залишитися. Підходь до речей і людей та натискай «Дія».",
    controls: ["Стрілки або WASD — ходити (через хвіртку в паркані можна переходити між світами)", "Пробіл або E — роздивитися річ або поговорити", "Підійди до Ангела біля хвіртки, коли будеш готовий обирати"],
    help: "<kbd>←↑→↓</kbd> ходити · <kbd>Пробіл</kbd> роздивитися або поговорити",
    actLabel: "Дія",
    endings: {
      "А": { title: "Обрав світ із добрими поглядами", text: "Ти залишився там, де люди радіють тому, що мають. Земля, небо і яблука тут такі самі, як по той бік паркану." },
      "Б": { title: "Приніс рай із собою", text: "Ти лишився серед тих, хто дивився через паркан, і показав їм, що в них усе те саме. Ангел перевісив табличку: тепер і тут РАЙ." },
      "В": { title: "Різниці немає", text: "Ти знайшов єдину відмінність: обличчя. І зрозумів, що обирати треба не місце, а погляд. Тепер ти в раю, хоч би де стояв." },
      "Г": { title: "Пекло порівнянь", text: "Порівняння перемогло. Або всі кинулися туди, де «краще», і там стало тісно й похмуро, або ти сам почав рахувати чужі яблука. Пекло починається там, де дивляться через паркан." },
    },
    moral: "Пекло — це очікування «кращого»: віра, що в інших більше можливостей і кращі люди. Доки це лише слова, пекло не перетвориться на рай.",
    questions: ["Ви сьогодні прокинулися в раю чи в очікуванні кращого?", "На чий «сад» ви дивитеся через паркан?", "Що змінилося б, якби ви перестали порівнювати?"],

    _s() { return S; },
    init(api) {
      const mk = (w) => NPC.map(([x, y], i) => ({ x: x + (w ? OFF : 0), y, hx: x + (w ? OFF : 0), hy: y, w, happy: !w, i, bub: "", bubT: Math.random() * 3, peek: 0, talked: false }));
      S = {
        p: api.actor({ x: 420, y: 470, emoji: "🧍", size: 40, speed: 170 }),
        people: mk(0).concat(mk(1)), found: false, inspected: new Set(), convinced: 0, gossip: 0, angelT: 0, msg: "", msgT: 0, done: false, envy: 0,
      };
    },
    async start(api) {
      await api.say([["Ангел", "Перед тобою два світи. Знайди, чим вони відрізняються."], ["Ангел", "Коли вирішиш, де залишитися, підійди до мене біля хвіртки."]]);
    },

    update(dt, api) {
      const p = S.p;
      p.blocked = (x, y) => x > 462 && x < 498 && !(y > 250 && y < 330);
      api.moveActor(p, dt, { x0: 20, x1: 940, y0: 40, y1: 510 });
      S.msgT -= dt;
      // мешканці
      for (const n of S.people) {
        n.bubT -= dt;
        if (n.bubT <= 0) { n.bubT = api.rand(3, 6); n.bub = n.happy ? api.pick(HAPPY) : api.pick(RUMORS); n.show = 2.6; }
        n.show = Math.max(0, (n.show || 0) - dt);
        if (n.w && !n.happy) { // заглядають через паркан
          n.peek += dt;
          const tx = n.peek % 10 < 4 ? 505 : n.hx, ty = n.peek % 10 < 4 ? n.hy * 0.5 + 140 : n.hy;
          n.x += (tx - n.x) * dt * 1.2; n.y += (ty - n.y) * dt * 1.2;
        } else { n.x += (n.hx + Math.sin(api.t + n.i) * 12 - n.x) * dt; n.y += (n.hy - n.y) * dt; }
      }
      // заздрість гравця: стоїш у Світі Б біля паркану і дивишся в А
      if (p.x > 490 && p.x < 560) S.envy = Math.min(100, S.envy + dt * 10); else S.envy = Math.max(0, S.envy - dt * 6);
      if (S.envy >= 100 && !S.envyMsg) { S.envyMsg = true; api.banner("Ти вже хвилину дивишся через паркан. Тут хтось шепоче: «У них краще…»"); }

      if (api.input.act) act(api);
      api.hud([["Відмінність знайдено", S.found ? "так" : "ні"], ["Переконано", S.convinced + " з 4"]]);
    },

    draw(ctx, api) {
      // два однакові сади
      for (const w of [0, 1]) {
        const ox = w ? OFF : 0;
        ctx.fillStyle = "#7bb661"; ctx.fillRect(ox, 0, 470, 540);
        ctx.fillStyle = "#6aa452"; for (let i = 0; i < 40; i++) ctx.fillRect(ox + (i * 97) % 460, (i * 53) % 530, 6, 6);
        ctx.fillStyle = "#5fa8d3"; ctx.beginPath(); ctx.ellipse(ox + 240, 330, 70, 34, 0, 0, 7); ctx.fill();
        for (const o of OBJ) api.D.emoji(o.e, ox + o.x, o.y, o.s);
        const sign = w ? (S.convinced >= 3 ? "РАЙ" : "ПЕКЛО?") : "РАЙ?";
        api.D.rr(ox + 170, 52, 130, 32, 8, "rgba(255,255,255,0.85)");
        api.D.text("Світ " + (w ? "Б" : "А"), ox + 235, 68, { size: 15, color: "#2a2f3a", display: true });
        if (S.done) api.D.text(sign, ox + 235, 104, { size: 18, color: "#fff", stroke: "rgba(0,0,0,.5)", display: true });
      }
      // паркан із хвірткою
      ctx.fillStyle = "#8a6a43";
      for (let y = 0; y < 540; y += 18) if (!(y > 240 && y < 330)) ctx.fillRect(470, y, 20, 14);
      api.D.emoji("👼", 480, 355 + Math.sin(api.t * 2) * 4, 44);
      api.D.text("Ангел", 480, 387, { size: 12, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      for (const n of S.people) {
        api.D.shadow(n.x, n.y + 18, 13);
        api.D.emoji(n.happy ? "😊" : "😠", n.x, n.y, 36);
        if (n.show > 0 && n.bub && api.dist(n, S.p) < 260) api.D.bubble(n.bub, n.x, n.y - 16, { size: 13, bg: n.happy ? "rgba(255,255,255,0.95)" : "rgba(255,210,200,0.95)" });
      }
      api.drawActor(S.p);
      if (S.msgT > 0) api.D.bubble(S.msg, S.p.x, S.p.y - 26, { size: 14, bg: "rgba(255,240,190,0.97)" });
      if (S.envy > 10) { api.D.text("Заздрість", 840, 30, { size: 13, color: "#fff" }); api.D.bar(790, 44, 100, 10, S.envy / 100, "#e05a4f"); }
    },
  };

  function msg(t) { S.msg = t; S.msgT = 3; }

  async function act(api) {
    const p = S.p;
    // люди мають пріоритет, потім ангел
    let near = null, nd = 1e9;
    for (const n of S.people) { const d = api.dist(n, p); if (d < nd) { nd = d; near = n; } }
    if (near && nd < 48) return talk(api, near);
    if (Math.hypot(p.x - 480, p.y - 355) < 75) return finale(api);
    // речі
    for (const w of [0, 1]) for (const o of OBJ) {
      if (Math.hypot(p.x - (o.x + (w ? OFF : 0)), p.y - o.y) < 50) {
        S.inspected.add(o.n); api.sfx("blip");
        msg(`Ти порівнюєш ${o.n} в обох світах. Однакові до листочка.`);
        if (S.inspected.size === 4 && !S.found) api.banner("Небо, трава і речі однакові. Може, придивитися до людей?");
        return;
      }
    }
  }

  async function talk(api, n) {
    if (!S.found) {
      S.found = true; api.sfx("good");
      await api.say([["", "Ти порівнюєш мешканців обох світів. Ось вона, єдина відмінність: обличчя."], ["Ангел", "Більше нічим ці світи не відрізняються."]]);
    }
    if (!n.w || n.happy) { await api.say([["Мешканець", n.w ? "Дякую тобі. І справді, у нас усе те саме." : api.pick(HAPPY)]]); return; }
    if (n.talked) { await api.say([["Мешканець", "Ну, може, ти і правий…"]]); return; }
    const c = await api.choose("«" + api.pick(RUMORS) + "». Скажи, у них там краще?", ["«У вас те саме. Подивись на своє дерево»", "«Так, у них там значно краще»", "Промовчати"], "Мешканець Світу Б");
    n.talked = true;
    if (c === 0) { n.happy = true; S.convinced++; api.sfx("good"); api.burst(n.x, n.y, "✨", 6, { size: 14 }); if (S.convinced === 3) api.banner("Світ Б посміхається. Ти бачиш, як змінюється настрій навколо"); }
    else if (c === 1) { S.gossip++; api.sfx("bad"); msg("Він зітхає ще важче і йде до паркану."); }
  }

  async function finale(api) {
    if (S.done) return;
    const opts = ["Залишитися у Світі А", "Залишитися у Світі Б"];
    if (S.found) opts.push("Мені однаково: я обираю погляд, а не місце");
    const c = await api.choose("Де ти хочеш залишитися назавжди?", opts, "Ангел");
    S.done = true; api.locked = true;
    if (c === 2) { for (const n of S.people) n.happy = true; await api.say([["Ангел", "Ти зрозумів головне. Різниці справді немає."]]); api.locked = false; return api.end("В"); }
    if (c === 0) {
      if (S.gossip >= 2) {
        for (const n of S.people) if (n.w) { n.hx -= OFF - 40; n.happy = false; }
        for (const n of S.people) if (!n.w) n.happy = false;
        await api.say([["", "Чутки, які ти підтвердив, зробили своє: мешканці Світу Б перелазять через паркан. У Світі А тісно, і всі починають заздрісно дивитися на просторий Світ Б."]]);
        api.locked = false; return api.end("Г");
      }
      await api.say([["Ангел", "Ти обрав людей, які радіють тому, що мають."]]); api.locked = false; return api.end("А");
    }
    if (S.convinced >= 3) { for (const n of S.people) n.happy = true; await api.say([["Ангел", "Подивись: над цим світом тепер теж РАЙ."]]); api.locked = false; return api.end("Б"); }
    await api.say([["", "Ти лишаєшся у Світі Б. За кілька днів ловиш себе на тому, що теж стоїш біля паркану і рахуєш чужі яблука."]]);
    api.locked = false; api.end("Г");
  }

  PG.start(game);
})();
