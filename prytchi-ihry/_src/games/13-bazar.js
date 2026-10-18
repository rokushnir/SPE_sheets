/* Гра 13 «Базар» — торговий симулятор за притчею «Ініціатива». */
(function () {
  const MASTER = { x: 120, y: 260 }, BARN = { x: 110, y: 450 }, CART = { x: 470, y: 420 }, SERV = { x: 600, y: 120 };
  const STALLS = [
    { k: "flour", n: "Борошно", e: "🌾", x: 760, y: 170, base: 20 },
    { k: "oil", n: "Олія", e: "🫒", x: 880, y: 300, base: 34 },
    { k: "salt", n: "Сіль", e: "🧂", x: 760, y: 430, base: 8 },
    { k: "cloth", n: "Тканина", e: "🧵", x: 880, y: 470, base: 50 },
  ];
  const TASKS = [
    { t: "Піди на ринок і дізнайся, скільки сьогодні коштує борошно.", at: "flour", q: "price" },
    { t: "А скільки треба взяти, щоб віддали дешевше?", at: "flour", q: "bulk" },
    { t: "Поцікався, чи зможуть вони нам своїм возом відвезти.", at: "cart", q: "cart" },
    { t: "Дізнайся, почім нині олія.", at: "oil", q: "price" },
    { t: "Збігай, спитай про сіль.", at: "salt", q: "price" },
    { t: "А тканина почім?", at: "cloth", q: "price" },
  ];
  const DAY = 160;
  let S;

  const game = {
    id: "13", title: "Базар", parable: "Ініціатива",
    story: "Слуга ображався: «Чому мені один золотий, а дворецькому десять?» Господар посилав його на ринок дізнатися ціну борошна, потім знижку, потім доставку. А дворецький прийшов сам: «Я бачив добру ціну, домовився про дві тисячі фунтів і приїхав на підводі торговця. Розвантажувати?»",
    goal: "Ти — слуга. Господар дає дрібні доручення, і за кожне платить один золотий. Але на ринку, біля воза і в коморі можна дізнатися більше, ніж питали…",
    controls: ["Стрілки або WASD — бігати", "Пробіл або E — говорити з господарем, торговцями, візником, слугами; оглянути комору"],
    help: "<kbd>←↑→↓</kbd> бігати · <kbd>Пробіл</kbd> говорити",
    actLabel: "Говорити",
    endings: {
      "А": { title: "Виконавець", text: "Ти сумлінно бігав туди й назад цілий день. Ноги гудуть, а в кишені кілька золотих. Плату отримують за виконане, але не більше." },
      "Б": { title: "Дворецький", text: "Ти приніс господарю готове рішення: ціна, кількість, віз і місце в коморі. «Відтепер ти мій дворецький», — сказав він. І платню — десять золотих." },
      "В": { title: "Ініціатива без узгодження", text: "Ти купив п’ять тисяч фунтів, не спитавши, скільки вміщує комора. Половина борошна змокла під дощем. Ініціатива без відповідальності обходиться дорого." },
      "Г": { title: "Кооператив", text: "Ти зібрав слуг з інших маєтків, і разом ви взяли борошно найдешевше на ринку. Господар покликав тебе не дворецьким, а партнером." },
    },
    moral: "Гроші платять не за виконану роботу, а за виявлену ініціативу. І навіть на роботі платять за ту роботу над собою, яку ви виконуєте вдома.",
    questions: ["Де ви чекаєте доручень, хоча могли б діяти самі?", "Що для вас «готове рішення» замість відповіді на питання?", "Де ваша ініціатива потребує узгодження, щоб не стати проблемою?"],

    _s() { return S; },
    init(api) {
      S = {
        p: api.actor({ x: 180, y: 300, emoji: "🧑", size: 38, speed: 200 }), gold: 0, time: DAY, taskI: 0, task: null, taskDone: false,
        know: { price: false, bulk: false, cart: false, storage: false, serv: false }, prices: {}, saleT: 0, flash: 0, done: false, msg: "", msgT: 0, deal: false,
      };
      for (const s of STALLS) S.prices[s.k] = s.base;
    },
    async start(api) {
      await api.say([["Господар", "А, ось ти. Маю доручення."]]);
      giveTask(api);
    },

    update(dt, api) {
      if (S.done) return;
      const p = S.p;
      S.time -= dt; S.msgT -= dt; S.flash -= dt; S.saleT -= dt;
      api.moveActor(p, dt, { x0: 20, x1: 940, y0: 60, y1: 515 });
      if (Math.floor(S.time) % 18 === 0 && S.time > 1 && !S.priceTick) { S.priceTick = true; for (const s of STALLS) S.prices[s.k] = Math.max(1, Math.round(s.base * api.rand(0.85, 1.2))); S.flash = 1; }
      if (Math.floor(S.time) % 18 !== 0) S.priceTick = false;
      if (S.time < DAY - 40 && !S.saleShown) { S.saleShown = true; S.saleT = 25; api.banner("Торговець борошном: «Оптом по 15 срібних, поки віз на ринку!»", 3000); }
      if (api.input.act) act(api);
      if (S.time <= 0) dayEnd(api);
      api.hud([["До вечора", Math.max(0, Math.ceil(S.time)) + " с"], ["Золотих", S.gold], S.task ? ["Доручення", S.taskDone ? "повернись до господаря" : "виконується"] : null]);
    },

    draw(ctx, api) {
      ctx.fillStyle = "#d8c49a"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#cdb88c"; for (let i = 0; i < 70; i++) ctx.fillRect((i * 137) % 960, (i * 71) % 540, 18, 5);
      // маєток
      api.D.rr(20, 120, 220, 400, 18, "#b5d29a", "#7e9b62", 3);
      api.D.text("Маєток", 130, 140, { size: 15, color: "#3f5a2a", display: true });
      api.D.emoji("🏛️", 130, 195, 60); api.D.emoji("🧔", MASTER.x, MASTER.y, 46); api.D.text("Господар", MASTER.x, MASTER.y + 32, { size: 12, color: "#2e3a22" });
      api.D.emoji("🏚️", BARN.x, BARN.y, 54); api.D.text("Комора", BARN.x, BARN.y + 36, { size: 12, color: "#2e3a22" });
      // ринок
      api.D.rr(680, 80, 270, 450, 18, "rgba(255,255,255,0.25)", "#a57d4a", 2);
      api.D.text("Ринок", 815, 100, { size: 15, color: "#6b4a26", display: true });
      for (const s of STALLS) {
        api.D.emoji("🛖", s.x, s.y - 6, 54); api.D.emoji(s.e, s.x + 30, s.y + 12, 26);
        const price = s.k === "flour" && S.saleT > 0 ? 15 : S.prices[s.k];
        api.D.rr(s.x - 40, s.y + 30, 80, 22, 8, S.flash > 0 ? "#fff6c8" : "#fffaf0", "#a57d4a");
        api.D.text(s.n + " " + price, s.x, s.y + 41, { size: 12, color: "#4a3214" });
      }
      if (S.saleT > 0) api.D.bubble("Оптом по 15!", 760, 150, { size: 13, bg: "rgba(255,236,150,0.97)" });
      api.D.emoji("🐴", CART.x - 26, CART.y, 46); api.D.emoji("🛒", CART.x + 22, CART.y + 4, 40); api.D.emoji("👨‍🦱", CART.x + 4, CART.y - 34, 30); api.D.text("Візник", CART.x, CART.y + 34, { size: 12, color: "#4a3214" });
      for (let i = 0; i < 3; i++) api.D.emoji(["🧑‍🦰", "👩‍🦱", "🧑‍🦳"][i], SERV.x - 30 + i * 30, SERV.y, 32);
      api.D.text("Слуги з інших маєтків", SERV.x, SERV.y + 28, { size: 12, color: "#4a3214" });
      api.drawActor(S.p);
      if (S.task) { api.D.rr(250, 490, 420, 36, 10, "rgba(30,20,10,0.75)"); api.D.text("Доручення: " + (S.taskDone ? "повернись до господаря" : TASKS[S.taskI % TASKS.length].t), 460, 508, { size: 12, color: "#fff" }); }
      if (S.msgT > 0) api.D.bubble(S.msg, S.p.x, S.p.y - 24, { size: 13 });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.8; }
  function near(o, r) { return Math.hypot(S.p.x - o.x, S.p.y - o.y) < (r || 60); }
  function giveTask(api) { S.task = TASKS[S.taskI % TASKS.length]; S.taskDone = false; api.sfx("blip"); api.banner("Доручення: " + S.task.t, 3200); }

  async function act(api) {
    if (near(MASTER)) return master(api);
    if (near(BARN)) { S.know.storage = true; api.sfx("pick"); await api.say([["Комора", "Ти міряєш комору кроками. Вміститься рівно дві тисячі фунтів, не більше."]]); return; }
    if (near(CART)) {
      S.know.cart = true;
      if (S.task && S.task.at === "cart") S.taskDone = true;
      await api.say([["Візник", "Відвезти? Звісно. Скажи лише, що, скільки і куди. За доставку беру недорого."]]); return;
    }
    if (near(SERV, 70)) {
      if (!S.know.bulk) { await api.say([["Слуги", "Ми теж по борошно. Але поодинці дорого виходить…"]]); return; }
      S.know.serv = true; await api.say([["Ти", "Якщо візьмемо разом шість тисяч фунтів, торговець віддасть дешевше. Кожен забере свою частку."], ["Слуги", "А це думка! Ми з тобою."]]); return;
    }
    for (const s of STALLS) if (near(s, 55)) return stall(api, s);
  }

  async function stall(api, s) {
    const price = s.k === "flour" && S.saleT > 0 ? 15 : S.prices[s.k];
    if (s.k !== "flour") {
      if (S.task && S.task.at === s.k) S.taskDone = true;
      await api.say([["Торговець", s.n + " сьогодні по " + price + " срібних за фунт."]]); return;
    }
    const opts = ["Дізнатися ціну", "Спитати, скільки треба взяти, щоб було дешевше"];
    if (S.know.bulk) opts.push("Домовитися: 2000 фунтів по 15 з доставкою возом", "Купити одразу 5000 фунтів, поки дешево!");
    if (S.know.serv) opts.push("Купити разом з іншими слугами");
    const c = await api.choose("Борошно! Свіже борошно!", opts, "Торговець борошном");
    const o = opts[c];
    if (o === "Дізнатися ціну") { S.know.price = true; if (S.task && S.task.at === "flour" && S.task.q === "price") S.taskDone = true; await api.say([["Торговець", "Сьогодні по " + price + " срібних."]]); }
    else if (o.startsWith("Спитати")) { S.know.bulk = true; if (S.task && S.task.q === "bulk") S.taskDone = true; await api.say([["Торговець", "Візьмете тисячу фунтів, віддам по 15. Дві тисячі — теж по 15, а якщо разом із кимось шість тисяч — по 12."]]); }
    else if (o.startsWith("Домовитися")) {
      if (!S.know.cart) { await api.say([["Торговець", "А хто повезе? Домовся з візником, тоді й ударимо по руках."]]); return; }
      S.deal = true; api.sfx("good"); await api.say([["Торговець", "По руках! Віз чекатиме. Біжи до господаря по згоду."]]); msg("Угода є. Тепер до господаря!");
    } else if (o.startsWith("Купити одразу")) {
      S.done = true; api.locked = true; api.sfx("bad");
      await api.say([["", "Візник привозить п’ять тисяч фунтів. Комора повна вже на двох тисячах, решта мішків лишається під небом. До вечора йде дощ."]]);
      api.locked = false; api.end("В");
    } else {
      S.done = true; api.locked = true; api.sfx("good");
      await api.say([["", "Слуги з трьох маєтків разом купують шість тисяч фунтів по 12. Кожен везе додому свою частку."], ["Господар", "Ти зекономив гроші всім трьом маєткам. Таких людей я беру в партнери."]]);
      api.locked = false; api.end("Г");
    }
  }

  async function master(api) {
    if (S.deal) {
      const opts = ["Запропонувати готову угоду"];
      const c = await api.choose("Слухаю.", opts.concat(["Нічого, просто зайшов"]), "Господар");
      if (c !== 0) return;
      if (!S.know.storage) { await api.say([["Господар", "Дві тисячі фунтів? А вони вмістяться в комору? Перевір, тоді приходь."]]); return; }
      S.done = true; api.locked = true; api.sfx("end");
      await api.say([["Ти", "Пане, борошно сьогодні по 15. Я домовився про дві тисячі фунтів, рівно стільки вміщує комора. Віз чекає. Розвантажувати?"], ["Господар", "Ось так і працює дворецький."]]);
      api.locked = false; return api.end("Б");
    }
    if (S.task && S.taskDone) {
      S.gold++; api.sfx("pick"); S.taskI++;
      await api.say([["Господар", "Добре. Ось тобі золотий."]]);
      return giveTask(api);
    }
    await api.say([["Господар", S.task ? S.task.t : "Чекай доручення."]]);
  }

  async function dayEnd(api) {
    S.done = true; api.locked = true;
    await api.say([["", "Вечоріє. Господар рахує: " + S.gold + " " + (S.gold === 1 ? "золотий" : "золотих") + " за день біганини."], ["Господар", "Дворецький сьогодні сам привіз борошно. Йому — десять."]]);
    api.locked = false; api.end("А");
  }

  PG.start(game);
})();
