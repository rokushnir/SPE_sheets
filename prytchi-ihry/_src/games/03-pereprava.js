/* Гра 03 «Переправа» — платформер із вантажем за притчею «Жінка і ченці». */
(function () {
  const GROUND = 430, WORLD = 3000, G = 1900;
  // водні ділянки і каміння-сходинки
  const WATER = [[320, 700], [1420, 1510], [2150, 2360]];
  const STEPS = [[380, 40], [470, 40], [560, 40], [645, 40], [1465, 30], [2200, 40], [2290, 40]];
  const ROCKS = [1180, 2500];
  const THOUGHTS = ["Він торкався жінки!", "Це ж заборонено!", "Хтось має йому сказати", "А ще мудрий…", "Я б так не зробив", "Як він міг?"];
  let S;

  const game = {
    id: "03", title: "Переправа", parable: "Жінка і ченці",
    story: "Старший чернець переніс жінку через бурхливу річку. Молодший мовчав аж до храму, а потім дорікнув: «Нам заборонено навіть торкатися жінки!» — «Я ніс її кілька хвилин, а ти досі несеш її в серці».",
    goal: "Ти — молодший чернець. Дорогою до храму в повітрі кружляють думки-докори. Кожна, яку ти «впіймаєш», кладе камінь у рюкзак: ти повільніше біжиш і нижче стрибаєш.",
    controls: ["← → або A D — іти", "Пробіл, ↑ або W — стрибати", "Оминай думки-докори, перестрибуй струмки по камінцях"],
    help: "<kbd>← →</kbd> іти · <kbd>Пробіл</kbd> стрибок",
    actLabel: "Стрибок", dlgTop: true,
    endings: {
      "А": { title: "Відпустив", text: "Ти увійшов до храму легким кроком. Те, що сталося біля річки, лишилося біля річки." },
      "Б": { title: "Докір", text: "«Я ніс її кілька хвилин, а ти досі несеш у серці», — відповів старший. І ти обійшов храм ще раз, з усім своїм камінням." },
      "В": { title: "Мовчки ніс до кінця", text: "Ти нічого не сказав, але рюкзак був такий важкий, що сходи храму здалися горою. Мовчати не означає відпустити." },
      "Г": { title: "Правило без серця", text: "Ви не допомогли. Біля храму вас наздогнала жінка: вона перебрела річку сама і промокла до нитки. Правило дотримано, а серце мовчало." },
    },
    moral: "Поки ми ще говоримо про щось, обговорюємо людину, згадуємо подію, ми досі несемо її в серці. Чи варто так довго нести те, що нам не потрібно?",
    questions: ["Який «камінь» ви несете найдовше?", "Кому ви досі не можете цього пробачити?", "Що зміниться, якщо висипати рюкзак уже сьогодні?"],

    _s() { return S; },
    init(api) {
      S = {
        p: { x: 120, y: GROUND, vy: 0, on: true, flip: true, phase: 0 },
        elder: { x: 60, y: GROUND, carry: false },
        woman: { x: 300, y: GROUND, show: true },
        stones: 0, cam: 0, check: 120, thoughts: [], tt: 2, ev: {}, refused: false, helped: false, falls: 0, bub: null, bubT: 0, done: false,
      };
    },
    async start(api) {
      await api.say([["", "Двоє ченців повертаються до храму. Попереду бурхлива річка."]]);
    },

    update(dt, api) {
      const p = S.p, k = 1 - Math.min(0.55, S.stones * 0.07);
      // рух
      const vx = api.input.x * 230 * k;
      p.x = api.clamp(p.x + vx * dt, 20, WORLD - 40);
      if (vx) { p.flip = vx > 0; p.phase += dt * 10; }
      if ((api.input.act || api.input.up) && p.on) { p.vy = -760 * (1 - Math.min(0.5, S.stones * 0.06)); p.on = false; api.sfx("blip"); }
      p.vy += G * dt; p.y += p.vy * dt;
      const floor = floorAt(p.x);
      if (floor != null && p.y >= floor && p.vy >= 0 && p.y - p.vy * dt <= floor + 8) { p.y = floor; p.vy = 0; p.on = true; }
      else p.on = false;
      if (p.y > GROUND + 60) splash(api);
      for (const r of ROCKS) if (Math.abs(p.x - r) < 22 && p.y > GROUND - 34) { p.x = r + (p.x < r ? -22 : 22); }
      if (p.on && floor === GROUND && !inWater(p.x)) S.check = p.x;

      // старший іде слідом
      const e = S.elder; const tx = p.x - 70;
      e.x += (tx - e.x) * Math.min(1, dt * 2.5);
      if (S.woman.show && S.elder.carry) { S.woman.x = e.x + 10; S.woman.y = GROUND - 40; }

      // подія річки
      if (p.x > 230 && !S.ev.river) river(api);
      if (S.elder.carry && e.x > 760) { S.elder.carry = false; S.woman.x = 820; S.woman.y = GROUND; S.ev.putDown = true; api.banner("Старший опускає жінку на березі. Вона дякує й іде своєю дорогою."); }
      if (S.ev.putDown && S.woman.show) { S.woman.x += 60 * dt; if (S.woman.x > p.x + 600) S.woman.show = false; }

      // думки-докори
      if (S.ev.river && S.helped && p.x > 760) {
        S.tt -= dt;
        if (S.tt <= 0) { S.tt = api.rand(1.4, 2.4); S.thoughts.push({ x: S.cam + 1000, y: api.rand(GROUND - 150, GROUND - 30), t: api.pick(THOUGHTS), v: api.rand(110, 170) }); }
      }
      for (let i = S.thoughts.length - 1; i >= 0; i--) {
        const th = S.thoughts[i]; th.x -= th.v * dt; th.y += Math.sin(api.t * 3 + i) * 0.6;
        if (Math.abs(th.x - p.x) < 38 && Math.abs(th.y - (p.y - 30)) < 34) { S.thoughts.splice(i, 1); addStone(api, 1, "«" + th.t + "» — ще один камінь у рюкзак"); continue; }
        if (th.x < S.cam - 120) S.thoughts.splice(i, 1);
      }
      // події дорогою
      if (p.x > 950 && !S.ev.v1) villager(api, 1);
      else if (p.x > 1700 && !S.ev.bench) bench(api);
      else if (p.x > 1960 && !S.ev.v2) villager(api, 2);
      else if (p.x > 2640 && !S.ev.gate) gate(api);

      S.cam = api.clamp(p.x - 320, 0, WORLD - 960);
      S.bubT -= dt;
      api.hud([["Каміння в рюкзаку", S.stones], ["Вага", (S.stones * 1).toFixed(0) + " кг"]]);
    },

    draw(ctx, api) {
      const cam = S.cam;
      const sky = ctx.createLinearGradient(0, 0, 0, 540); sky.addColorStop(0, "#9cc7e8"); sky.addColorStop(1, "#e8f1f2");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
      // гори з паралаксом
      ctx.fillStyle = "#a9bfcf";
      for (let i = -1; i < 8; i++) { const x = i * 300 - (cam * 0.3) % 300; ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x + 150, 170 + (i % 2) * 40); ctx.lineTo(x + 300, 330); ctx.fill(); }
      ctx.save(); ctx.translate(-cam, 0);
      // земля
      ctx.fillStyle = "#7a5b3a"; ctx.fillRect(0, GROUND, WORLD, 140);
      ctx.fillStyle = "#6aa14a"; ctx.fillRect(0, GROUND, WORLD, 10);
      for (const [a, b] of WATER) {
        ctx.fillStyle = "#3a7fc0"; ctx.fillRect(a, GROUND, b - a, 140);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let x = a; x < b; x += 26) ctx.fillRect(x + ((api.t * 60) % 26), GROUND + 12 + (x % 3) * 18, 12, 3);
      }
      for (const [x, w] of STEPS) { ctx.fillStyle = "#8d949e"; ctx.beginPath(); ctx.ellipse(x, GROUND + 4, w / 2, 9, 0, 0, 7); ctx.fill(); }
      for (const r of ROCKS) api.D.emoji("🪨", r, GROUND - 16, 40);
      // сходи і храм
      for (let i = 0; i < 5; i++) { ctx.fillStyle = "#b9a58a"; ctx.fillRect(2720 + i * 50, GROUND - (i + 1) * 22, 300 - i * 50, (i + 1) * 22); }
      api.D.emoji("⛩️", 2900, GROUND - 170, 150);
      api.D.emoji("🪑", 1700, GROUND - 22, 44);
      api.D.emoji("🧑‍🌾", 1010, GROUND - 26, 46); api.D.emoji("👵", 2020, GROUND - 26, 46);
      api.D.text("Струмок", 1465, GROUND + 70, { size: 14, color: "#fff" });
      // персонажі
      if (S.woman.show) api.D.emoji("👩", S.woman.x, S.woman.y - 26, 44);
      const e = S.elder; api.D.shadow(e.x, GROUND + 4, 16); api.D.emoji("👴", e.x, GROUND - 26 + Math.sin(api.t * 6) * 1.5, 46);
      const p = S.p, bob = p.on && api.input.x ? Math.abs(Math.sin(p.phase)) * 4 : 0;
      api.D.shadow(p.x, floorAt(p.x) != null ? floorAt(p.x) + 4 : GROUND + 4, 16, p.on ? 0.25 : 0.12);
      const pack = 26 + Math.min(16, S.stones * 2);
      api.D.emoji("🎒", p.x + (p.flip ? -16 : 16), p.y - 30 - bob, pack);
      api.D.emoji("🧑‍🦲", p.x, p.y - 28 - bob, 46, { flip: p.flip });
      for (const th of S.thoughts) api.D.bubble("💭 " + th.t, th.x, th.y + 18, { bg: "rgba(255,214,214,0.96)", size: 14 });
      if (S.bubT > 0 && S.bub) api.D.bubble(S.bub, p.x, p.y - 60);
      ctx.restore();
    },
  };

  function inWater(x) { return WATER.some(([a, b]) => x > a && x < b); }
  function floorAt(x) {
    if (!inWater(x)) return GROUND;
    for (const [sx, w] of STEPS) if (Math.abs(x - sx) < w / 2 + 6) return GROUND;
    return null;
  }
  function splash(api) {
    S.falls++; api.sfx("bad"); api.burst(S.p.x, GROUND, "💧", 10, { size: 16 });
    S.p.x = S.check; S.p.y = GROUND; S.p.vy = 0;
    if (S.stones >= 4) api.banner("Рюкзак тягне донизу. Може, час його полегшити?");
  }
  function addStone(api, n, why) { S.stones += n; api.sfx("bad"); api.shake(3, 0.15); api.banner(why, 2200); }
  function bubble(t) { S.bub = t; S.bubT = 2.8; }

  async function river(api) {
    S.ev.river = true; api.locked = true;
    await api.say([["Жінка", "Будь ласка, допоможіть мені перейти. Течія надто сильна, я боюся."], ["Старший чернець", "Що скажеш, брате?"]]);
    const c = await api.choose("Ваш статут забороняє навіть торкатися жінки.", ["Допоможи їй, брате", "Ні, нам заборонено"], "Ти");
    if (c === 0) {
      S.helped = true; S.elder.carry = true;
      await api.say([["", "Старший бере жінку на руки і переносить через річку. Перестрибни за ним по камінцях."]]);
    } else {
      S.refused = true; S.woman.show = true; S.woman.x = 300;
      await api.say([["Старший чернець", "Як скажеш. Правила є правила."], ["", "Жінка лишається на березі. Перестрибни річку по камінцях."]]);
    }
    api.locked = false;
  }

  async function villager(api, n) {
    S.ev["v" + n] = true;
    const who = n === 1 ? "Селянин" : "Бабуся";
    if (S.refused) { await api.say([[who, "Добрий день, ченці! Гарна погода сьогодні."]]); return; }
    const c = await api.choose(n === 1 ? "Звідки йдете, святі отці? Що цікавого бачили дорогою?" : "Чула, ваш старший жінку на руках носив? Правда?", n === 1
      ? ["Розповісти, як старший ніс жінку", "«Бачили річку і гори»", "Промовчати і всміхнутися"]
      : ["«Правда! І я йому ще скажу!»", "«Він допоміг людині. Це все»", "Промовчати"], who);
    if (c === 0) addStone(api, 2, "Розповідь про чужий вчинок додала два камені");
    else if (n === 2 && c === 1) { if (S.stones > 0) { S.stones = Math.max(0, S.stones - 1); api.sfx("good"); api.banner("Ти сказав це вголос, і стало легше: мінус камінь"); } }
  }

  async function bench(api) {
    S.ev.bench = true;
    const c = await api.choose("Лавка для подорожніх. Перепочити?", ["Сісти і відпустити все, що несеш", "Сісти й подумати ще раз, як він міг", "Іти далі"], "Привал");
    if (c === 0) { if (S.stones) { api.burst(S.p.x, S.p.y - 40, "🪨", Math.min(12, S.stones + 2), { size: 18 }); api.sfx("good"); } S.stones = 0; S.released = true; api.banner("Рюкзак порожній. Ноги самі несуть далі."); }
    else if (c === 1) addStone(api, 2, "Обдумування додало ще два камені");
  }

  async function gate(api) {
    S.ev.gate = true; api.locked = true;
    if (S.refused) {
      await api.say([["", "Біля воріт храму вас наздоганяє жінка. Вона перебрела річку сама і промокла до нитки."], ["Жінка", "Нічого. Дійшла. А ви ж були поруч…"]]);
      api.locked = false; return api.end("Г");
    }
    const c = await api.choose("Ось і храм. Старший помічає, що ти всю дорогу дивишся на нього скоса.", ["«Як ти міг? Нам заборонено торкатися жінки!»", "Промовчати", "«Дякую, брате. Ти зробив правильно»"], "Ти");
    if (c === 0) {
      await api.say([["Старший чернець", "Брате, я ніс її лише кілька хвилин через річку. А ти досі несеш її у своєму серці."]]);
      api.locked = false; return api.end("Б");
    }
    if (c === 1 && S.stones >= 4) {
      await api.say([["Старший чернець", "Ти мовчиш, але рюкзак у тебе важчий за мій. Що ти несеш?"]]);
      api.locked = false; return api.end("В");
    }
    if (S.stones) { api.burst(S.p.x, S.p.y - 40, "🪨", 8, { size: 18 }); S.stones = 0; }
    await api.say([["Старший чернець", "Тоді ходімо. Нас чекає вечірня молитва."]]);
    api.locked = false; api.end("А");
  }

  PG.start(game);
})();
