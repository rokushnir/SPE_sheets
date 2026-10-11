/* Гра 16 «Земельна угода» — ділова гра: провести угоду купівлі ділянки від ринку до банку. */
(function () {
  const OBL = ["Черкаська", "Вінницька", "Полтавська", "Хмельницька", "Київська", "Кропивницька"];
  const NAMES = ["Петро", "Ганна", "Микола", "Віра", "Степан", "Олена", "Іван", "Надія", "Василь", "Тамара", "Григорій", "Люба", "Федір", "Ніна", "Богдан", "Зіна"];
  const FACES = ["👨‍🌾", "👩‍🌾", "👴", "👵", "🧔", "👩", "👨", "🧓"];
  const REPS = [
    { n: "Ярослав", e: "👨‍💼", speed: 3, calm: 1, exp: 2, note: "їздить швидко, але запальний" },
    { n: "Олександр", e: "🧔", speed: 2, calm: 3, exp: 3, note: "досвідчений і спокійний" },
    { n: "Ольга", e: "👩‍💼", speed: 2, calm: 3, exp: 2, note: "уміє заспокоїти будь-кого" },
    { n: "Марія", e: "👩", speed: 1, calm: 3, exp: 3, note: "повільна, зате знає всі документи" },
    { n: "Вікторія", e: "👱‍♀️", speed: 3, calm: 2, exp: 1, note: "енергійна новенька" },
  ];
  const STAGES = ["Ринок", "Перевірка", "Нотаріус", "Дорога", "Намір", "Очікування", "Угода", "Банк"];
  const LIMIT = 365;
  let S;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;

  const game = {
    id: "16", title: "Земельна угода", eyebrow: "ділова гра",
    story: "Ринок землі живе швидко. Продавців багато, і кожного можуть перекупити, поки ти думаєш. Хтось зникає, хтось кричить «Та ви шахраї!», у когось раптом виконавче провадження. А попереду ще перевірка документів, нотаріус, дорога, місяці очікування і банк.",
    goal: "Проведи угоду якнайшвидше: знайди продавця, домовся про ціну (80–140 тис.), перевір документи, знайди нотаріуса, вибери, хто поїде на угоду, дочекайся строку і забери гроші в банку. Лічильник днів не зупиняється. Якщо продавця втрачено, повертаєшся на ринок.",
    controls: ["Стрілки або WASD — ходити, у дорозі — кермувати", "Пробіл або E — говорити, торгуватися, заходити", "Цифри 1–4 або клік — обрати відповідь"],
    help: "<kbd>←↑→↓</kbd> рух · <kbd>Пробіл</kbd> говорити · <kbd>1–4</kbd> відповідь",
    actLabel: "Дія",
    endings: {
      "А": { title: "Блискавична угода", text: "Від ринку до банку менш ніж за сто днів. Ти не зволікав на ринку, не сперечався з продавцем і не панікував, коли вимикали світло." },
      "Б": { title: "Угода відбулася", text: "Гроші отримано, ділянку оформлено. Було всяке: і перекуплені продавці, і зайняті нотаріуси. Але ти дійшов до банку." },
      "В": { title: "Угода коштом нервів", text: "Угода відбулася, але забрала більше пів року. Кожен зрив повертав тебе на ринок, а дні тим часом ішли." },
      "Г": { title: "Ринок переміг", text: "Минув рік, а угоди так і немає. Продавців перекупили, нотаріуси пішли у відпустки, орендарі вставили палиці в колеса." },
    },
    moral: "На ринку виграє не той, хто ніколи не стикається з перешкодами, а той, хто швидко ухвалює рішення, тримає продавця поруч, готує документи заздалегідь і не втрачає спокою, коли все йде не за планом.",
    questions: ["На якому етапі ти втратив найбільше днів?", "Які перешкоди можна було передбачити і підготуватися до них?", "Кого з представників ти обрав би наступного разу і чому?"],

    _s() { return S; },
    init(api) {
      S = { scene: "market", stage: 0, days: 0, price: 0, seller: null, trust: 60, rep: null, lost: 0, msg: "", msgT: 0, scn: {} , done: false, lease: null };
      enterMarket(api, true);
    },
    async start(api) {
      await api.say([["", "Земельний ринок. Довкола продавці з шести областей, і кожен називає свою ціну. Конкуренти вже ходять між ними."], ["", "Підійди до продавця і натисни Пробіл, щоб почати торг. Поспішай: продавців перекуповують."]]);
    },

    update(dt, api) {
      if (S.done) return;
      S.msgT -= dt;
      const fn = UPD[S.scene]; if (fn) fn(dt, api);
      if (S.days >= LIMIT && !S.done) { S.done = true; api.locked = true; api.say([["", "Минув рік. Угоди немає."]]).then(() => { api.locked = false; api.end("Г"); }); }
      api.hud([["Етап", (S.stage + 1) + ". " + STAGES[S.stage]], ["Днів", Math.floor(S.days)], S.price ? ["Ціна", S.price + " тис."] : null, S.seller && S.stage >= 1 ? ["Довіра", Math.round(S.trust)] : null, S.lost ? ["Зривів", S.lost] : null]);
    },
    draw(ctx, api) { const fn = DRAW[S.scene]; if (fn) fn(ctx, api); if (S.msgT > 0 && S.msgPos) api.D.bubble(S.msg, S.msgPos.x, S.msgPos.y, { size: 13 }); },
  };

  function daysWord(n) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? "день" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "дні" : "днів"; }
  function msg(t, pos) { S.msg = t; S.msgT = 2.8; S.msgPos = pos || (S.scn.p ? { x: S.scn.p.x, y: S.scn.p.y - 28 } : { x: 480, y: 120 }); }
  function addDays(n) { S.days += n; }

  // ---------------------------------------------------------------- 1. Ринок
  const SLOTS = [];
  for (const y of [215, 345, 470]) for (const x of [170, 480, 790]) SLOTS.push({ x, y });
  function newSeller(slot) {
    const h = SLOTS[slot];
    const s = { name: pick(NAMES), face: pick(FACES), obl: pick(OBL), price: ri(80, 140), x: h.x, y: h.y, slot, st: "free", t: 0, alpha: 1,
      exec: chance(0.15), abroad: chance(0.12), mood: rnd(0.3, 1), tx: h.x, ty: h.y, wt: 0 };
    return s;
  }
  function enterMarket(api, first) {
    S.scene = "market"; S.stage = 0; S.seller = null; S.price = 0; S.trust = 60; S.lease = null;
    const p = api.actor({ x: 480, y: 300, emoji: "🧑‍💼", size: 38, speed: 210 });
    S.scn = { p, sellers: SLOTS.map((_, i) => newSeller(i)), comps: Array.from({ length: 3 }, (_, i) => ({ x: 60 + i * 400, y: 520, e: ["🕴️", "🤵", "🧑‍💼"][i], target: null, t: 0, speed: rnd(70, 95) })), evT: 2.5 };
    if (!first) api.banner("Знову на ринку. Шукай нового продавця.", 2600);
  }
  UPD_market = (dt, api) => {
    const M = S.scn, p = M.p;
    addDays(dt * 0.5);
    api.moveActor(p, dt, { x0: 30, x1: 930, y0: 110, y1: 515 });
    for (const s of M.sellers) {
      if (s.st === "leaving") { s.alpha -= dt * 1.2; s.y -= dt * 30; continue; }
      if (s.st === "ghost") { s.t -= dt; if (s.t <= 0) { if (chance(0.7)) { s.st = "free"; msg(s.name + " знову на зв'язку", { x: s.x, y: s.y - 30 }); } else leave(s, "Більше не відповідає"); } continue; }
      if (s.st === "free") { s.wt -= dt; if (s.wt <= 0) { s.wt = rnd(2, 5); s.tx = SLOTS[s.slot].x + rnd(-40, 40); s.ty = SLOTS[s.slot].y + rnd(-12, 12); } s.x += (s.tx - s.x) * dt * 1.2; s.y += (s.ty - s.y) * dt * 1.2; }
    }
    M.sellers = M.sellers.filter((s) => s.alpha > 0);
    for (let k = 0; k < SLOTS.length; k++) if (!M.sellers.some((s) => s.slot === k && s.st !== "leaving")) { const n = newSeller(k); n.x = n.x < 480 ? -20 : 980; M.sellers.push(n); }
    // конкуренти
    for (const c of M.comps) {
      if (!c.target || c.target.st === "leaving" || (c.target.st !== "free" && c.target.st !== "comp")) {
        if (c.target && c.target.st === "comp" && c.target.by === c) c.target.st = "free";
        const free = M.sellers.filter((s) => s.st === "free"); c.target = free.length ? pick(free) : null; c.t = 0;
      }
      if (!c.target) continue;
      const s = c.target, dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
      if (d > 34) { c.x += dx / d * c.speed * dt; c.y += dy / d * c.speed * dt; c.flip = dx > 0; }
      else {
        if (s.st === "free") { s.st = "comp"; s.by = c; c.t = 0; c.need = rnd(4, 7); }
        if (s.st === "comp" && s.by === c) {
          c.t += dt;
          if (c.t >= c.need) {
            if (chance(0.6)) { leave(s, "Перекупили!"); if (api.dist(p, s) < 220) api.banner(s.name + " (" + s.obl + ") продав ділянку конкуренту", 2400); }
            else { s.st = "free"; msg("Не зійшлися в ціні", { x: s.x, y: s.y - 30 }); }
            c.target = null;
          }
        }
      }
    }
    // випадкові події продавців
    M.evT -= dt;
    if (M.evT <= 0) {
      M.evT = rnd(2, 3.5);
      const free = M.sellers.filter((s) => s.st === "free"); if (free.length) {
        const s = pick(free), r = Math.random();
        if (r < 0.35) { s.st = "ghost"; s.t = rnd(4, 9); msg("📵 Не виходить на зв'язок", { x: s.x, y: s.y - 30 }); }
        else if (r < 0.55) leave(s, "Передумав продавати");
        else if (r < 0.72) leave(s, "Та ви шахраї!");
        else if (r < 0.88) { s.exec = true; s.execSeen = true; msg("⚖️ З'явилося виконавче провадження", { x: s.x, y: s.y - 30 }); }
        else { s.price = api.clamp(s.price + ri(-6, 8), 80, 140); msg("Тепер хоче " + s.price + " тис.", { x: s.x, y: s.y - 30 }); }
      }
    }
    if (api.input.act) {
      let best = null, bd = 60;
      for (const s of M.sellers) { const d = api.dist(p, s); if (d < bd && (s.st === "free" || s.st === "comp")) { bd = d; best = s; } }
      if (best) haggle(api, best);
      else { const g = M.sellers.find((s) => s.st === "ghost" && api.dist(p, s) < 60); if (g) msg("Не бере слухавку…"); }
    }
  };
  function leave(s, why) { s.st = "leaving"; s.why = why; s.alpha = 1; S.scn.leaveMsg = { t: why, x: s.x, y: s.y, T: 2.2 }; }

  async function haggle(api, s) {
    const M = S.scn, wasComp = s.st === "comp";
    s.st = "talk";
    let ask = s.price;
    const floor = Math.max(80, Math.round(s.price * rnd(0.84, 0.93)));
    for (let round = 0; round < 3; round++) {
      const o1 = Math.max(80, ask - 12), o2 = Math.max(80, ask - 6);
      const head = `${s.name}, ${s.obl} обл. ${round ? "Тепер" : "Просить"} ${ask} тис.` + (s.execSeen ? " (чути, що є виконавче…)" : "") + (wasComp && !round ? " Поруч уже торгується конкурент!" : "");
      const c = await api.choose(head, [`Запропонувати ${o1} тис.`, `Запропонувати ${o2} тис.`, `Погодитися на ${ask} тис.`, "Піти"], s.face + " Продавець");
      if (c === 3) { s.st = "free"; return; }
      const offer = [o1, o2, ask][c];
      // конкурент втручається
      const near = M.comps.find((k) => Math.hypot(k.x - s.x, k.y - s.y) < 170);
      if ((near || wasComp) && chance(0.45)) {
        const plus = ri(3, 8);
        const b = await api.choose(`Конкурент: «Даю ${offer + plus} тис., і гроші одразу!»`, [`Перебити: ${offer + plus + 2} тис.`, "Не перебивати"], "🕴️ Конкурент");
        if (b === 1) { leave(s, "Пішов до конкурента"); api.sfx("bad"); return; }
        return agreed(api, s, offer + plus + 2);
      }
      if (offer >= ask || (offer >= floor && chance(0.55 + s.mood * 0.3))) return agreed(api, s, offer);
      if (offer < floor - 6 && chance(0.35)) { leave(s, "Та ви шахраї!"); api.sfx("bad"); await api.say([[s.face + " Продавець", "Та ви шахраї! За такі гроші — і не соромно?"]]); return; }
      ask = Math.max(offer + 1, Math.round((ask + offer) / 2) + ri(0, 3));
      if (chance(0.15)) { s.st = "ghost"; s.t = rnd(5, 10); await api.say([["", s.name + " каже «я подумаю» і кладе слухавку."]]); return; }
    }
    s.st = "free"; await api.say([[s.face + " Продавець", "Ні, так не піде. Шукайте когось іншого."]]);
  }

  async function agreed(api, s, price) {
    api.sfx("good");
    S.seller = s; S.price = api.clamp(price, 80, 140);
    s.st = "yours";
    await api.say([[s.face + " " + s.name, `Добре, ${S.price} тис. По руках!`], ["", "Тепер перевіряємо документи на ділянку. Продавця треба втримати, поки все не оформлено."]]);
    enterCheck(api);
  }

  async function lose(api, why) {
    S.lost++; api.sfx("bad"); api.shake(6, 0.3);
    api.locked = true;
    await api.say([["", why + " Продавця втрачено. Назад на ринок."]]);
    api.locked = false;
    enterMarket(api, false);
  }

  // ---------------------------------------------------------------- 2. Перевірка документів
  const LEASE = [
    { t: "Оренда на 49 років. Довгий термін, орендар має переважне право.", risk: 3 },
    { t: "Оренди немає. Ділянка вільна.", risk: 0 },
    { t: "«Сіра» оренда: обробляють без договору.", risk: 2 },
    { t: "Оренда на 7 років, договір прозорий.", risk: 1 },
    { t: "Межі в натурі не винесені, але кадастровий номер є.", risk: 1 },
  ];
  function enterCheck(api) {
    S.scene = "check"; S.stage = 1;
    S.scn = { prog: 0, evAt: [rnd(0.2, 0.45), rnd(0.55, 0.85)].slice(0, ri(0, 2)), busy: false, paper: 0 };
    if (S.seller.exec && !S.scn.evAt.length) S.scn.evAt.push(0.5);
  }
  UPD_check = (dt, api) => {
    const C = S.scn; if (C.busy) return;
    C.prog = Math.min(1, C.prog + dt / 7); addDays(dt * 1.2); C.paper += dt;
    if (C.evAt.length && C.prog >= C.evAt[0]) { C.evAt.shift(); C.busy = true; checkEvent(api).then(() => (C.busy = false)); return; }
    if (C.prog >= 1) { C.busy = true; checkResult(api); }
  };
  async function checkEvent(api) {
    const s = S.seller;
    const pool = ["lessee", "abroad", "ghost", "comp"];
    if (s.exec) pool.push("exec", "exec");
    const e = pick(pool);
    if (e === "exec") {
      s.exec = false;
      const c = await api.choose("У реєстрі знайшлося виконавче провадження на продавця. Ділянка під арештом.", ["Чекати зняття обтяження (+30 днів)", "Відмовитися від угоди"], "Реєстр");
      if (c === 1) return lose(api, "Ти відмовився через арешт.");
      addDays(30); if (chance(0.5)) return lose(api, "Обтяження так і не зняли.");
      await api.say([["", "Борг погашено, арешт знято. Працюємо далі."]]);
    } else if (e === "lessee") {
      if (chance(0.35)) return lose(api, "Орендар дізнався про продаж і перекупив ділянку.");
      await api.say([["", "Орендар цікавився ділянкою, але продавець тримає слово."]]); S.trust += 5;
    } else if (e === "abroad") {
      const c = await api.choose("Виявилося, що продавець за кордоном і на угоду приїхати не може.", ["Оформити довіреність (+20 днів)", "Відмовитися"], "Продавець");
      if (c === 1) return lose(api, "Без продавця угоди не буде.");
      addDays(20);
    } else if (e === "ghost") {
      await api.say([["", "Продавець перестав брати слухавку…"]]);
      addDays(ri(3, 10));
      if (chance(0.35)) return lose(api, "Продавець так і не вийшов на зв'язок.");
      await api.say([[s.face + " " + s.name, "Вибачте, телефон сів. Я тут!"]]);
    } else {
      const c = await api.choose("Інший покупець пропонує продавцю на 10 тис. більше.", ["Доплатити 10 тис.", "Переконати, що ми надійніші", "Відпустити"], s.face + " Продавець");
      if (c === 2) return lose(api, "Продавець пішов до іншого покупця.");
      if (c === 0) { S.price = Math.min(140, S.price + 10); S.trust += 10; }
      else if (chance(0.5)) return lose(api, "Не переконав. Продавець пішов до того, хто платить більше.");
      else S.trust += 5;
    }
  }
  async function checkResult(api) {
    const L = pick(LEASE); S.lease = L;
    const c = await api.choose("Результат перевірки: " + L.t, ["Працювати далі", "Відмовитися і шукати іншу ділянку"], "Перевірка документів");
    if (c === 1) { S.lost++; enterMarket(api, false); return; }
    enterNotary(api);
  }

  // ---------------------------------------------------------------- 3. Нотаріус
  const NOT_NAMES = ["Петренко", "Коваль", "Шевчук", "Мельник"];
  function enterNotary(api) {
    S.scene = "notary"; S.stage = 2;
    const states = ["ok", pick(["busy", "noanswer", "vacation", "nointent", "nasty"]), pick(["busy", "noanswer", "vacation", "nointent"]), pick(["ok", "nasty", "busy"])].sort(() => Math.random() - 0.5);
    S.scn = { p: api.actor({ x: 80, y: 420, emoji: "🧑‍💼", size: 36, speed: 200 }), sel: { x: 50, y: 440 },
      offices: NOT_NAMES.map((n, i) => ({ n, x: 170 + i * 210, y: 220, st: states[i], tried: false, back: 0 })) };
    api.banner("Знайди нотаріуса, який візьметься за угоду", 2600);
  }
  UPD_notary = (dt, api) => {
    const N = S.scn, p = N.p;
    addDays(dt * 0.4);
    api.moveActor(p, dt, { x0: 30, x1: 930, y0: 280, y1: 510 });
    N.sel.x += (p.x - 40 - N.sel.x) * dt * 2; N.sel.y += (p.y + 16 - N.sel.y) * dt * 2;
    for (const o of N.offices) if (o.back > 0) { o.back -= dt; if (o.back <= 0) { o.st = "ok"; msg("Нотаріус " + o.n + " повернувся з відпустки", { x: o.x, y: o.y - 60 }); } }
    if (chance(dt * 0.03)) { api.sfx("bad"); S.trust -= 5; msg(S.seller.name + ": «Скільки ще ходити?»", { x: N.sel.x, y: N.sel.y - 30 }); }
    if (api.input.act) { const o = N.offices.find((o) => Math.abs(p.x - o.x) < 70 && p.y < 360); if (o) visit(api, o); }
  };
  async function visit(api, o) {
    addDays(2);
    const say = (t) => api.say([["Нотаріус " + o.n, t]]);
    if (o.st === "busy") { const c = await api.choose("Нотаріус " + o.n + " зайнятий. Найближче вікно — за тиждень.", ["Записатися (+7 днів)", "Шукати іншого"], "Приймальня"); if (c === 0) { addDays(7); o.st = "ok"; return visit(api, o); } return; }
    if (o.st === "noanswer") { await api.say([["", "Двері зачинені, телефон не відповідає."]]); if (chance(0.4)) { o.st = "ok"; msg("Наступного разу, може, відповість", { x: o.x, y: o.y - 60 }); } return; }
    if (o.st === "vacation") { await say("Я у відпустці. Повернуся за два тижні."); o.st = "away"; o.back = 12; return; }
    if (o.st === "away") { await api.say([["", "На дверях табличка: «У відпустці»."]]); return; }
    if (o.st === "nointent") { await say("Наміри й попередні договори я не посвідчую. Ідіть до іншого."); return; }
    if (o.st === "nasty") { await say("Ну… Добре, візьмуся. Але документи принесете ще раз, і в черзі посидите."); S.trust -= 10; S.nasty = true; }
    else await say("Візьмуся. Записую вас на найближчий день.");
    await chooseRep(api, "Хто повезе продавця до нотаріуса?");
    enterDrive(api, "deal");
  }

  // ---------------------------------------------------------------- 4. Вибір представника і дорога
  async function chooseRep(api, q) {
    const st = (n) => "★".repeat(n) + "☆".repeat(3 - n);
    const c = await api.choose(q, REPS.map((r) => `${r.n}: швидкість ${st(r.speed)}, спокій ${st(r.calm)}, досвід ${st(r.exp)} — ${r.note}`), "Команда");
    S.rep = REPS[c];
  }
  function enterDrive(api, next) {
    S.scene = "drive"; S.stage = next === "deal" ? 3 : 6;
    S.scn = { next, x: 480, dist: 0, need: next === "deal" ? 1 : 0.7, obs: [], spawn: 0, scroll: 0, hits: 0 };
    api.banner(S.rep.n + " за кермом. Об'їжджай ями й перешкоди!", 2400);
  }
  UPD_drive = (dt, api) => {
    const D = S.scn, sp = 0.055 + S.rep.speed * 0.012;
    D.x = api.clamp(D.x + api.input.x * 360 * dt, 320, 640);
    D.dist += dt * sp; D.scroll += dt * 360;
    D.spawn -= dt;
    if (D.spawn <= 0) { D.spawn = rnd(0.45, 0.9); D.obs.push({ x: pick([360, 430, 480, 530, 600]), y: -40, e: pick(["🕳️", "🚧", "🚜", "🐄", "🚛", "🕳️"]) }); }
    for (const o of D.obs) o.y += 330 * dt;
    for (const o of D.obs) if (!o.hit && Math.abs(o.y - 440) < 34 && Math.abs(o.x - D.x) < 40) { o.hit = true; D.hits++; D.dist = Math.max(0, D.dist - 0.06); S.trust -= 3; api.sfx("bad"); api.shake(8, 0.25); }
    D.obs = D.obs.filter((o) => o.y < 600);
    if (D.dist >= D.need) { addDays(1); if (D.next === "deal") enterDeal(api); else enterDeal2(api); }
  };

  // ---------------------------------------------------------------- 5. Намір у нотаріуса
  const DEAL_EVENTS = [
    { q: "Сварка: продавець не згоден із формулюванням у договорі.", a: [["Спокійно пояснити пункт", "calm", 8], ["Попросити нотаріуса розтлумачити (+1 день)", 1, 5], ["«Ви ж погодились!»", null, -15]] },
    { q: "Конфлікт: приїхав син продавця і кричить, що землю продавати не можна.", a: [["Вислухати й показати ціну та умови", "calm", 10], ["Запропонувати подумати до завтра (+1 день)", 1, 0], ["Сперечатися з сином", null, -20]] },
    { q: "Непорозуміння: продавець думав, що отримає всю суму готівкою сьогодні.", a: [["Пояснити порядок розрахунку на папері", "exp", 8], ["Пообіцяти «якось вирішимо»", null, -5], ["Відмовити різко", null, -15]] },
    { q: "Продавець хоче піти в банк і перевірити, чи гроші справжні.", a: [["Поїхати разом у банк (+1 день)", 1, 10], ["Показати банківську виписку", "exp", 4], ["«Нам немає коли»", null, -12]] },
    { q: "Відключення світла. Реєстр не працює.", a: [["Чекати генератор, пригостити кавою з термоса", "calm", 6], ["Перенести на завтра (+1 день)", 1, -3], ["Нервувати вголос", null, -10]] },
    { q: "Договір не готовий: у нотаріуса бракує витягу.", a: [["Швидко замовити витяг онлайн", "exp", 5], ["Чекати (+2 дні)", 2, -2], ["Звинуватити нотаріуса", null, -12]] },
    { q: "Дуже довго чекати в черзі. Продавець нервує.", a: [["Розповісти, що буде далі, по кроках", "calm", 6], ["Переписатися на інший день (+2 дні)", 2, -4], ["Сидіти мовчки", null, -6]] },
    { q: "«Чого ви не підготувались? Ви шахраї, ви неорганізовані!»", a: [["Вибачитися і показати всі документи", "exp", 10], ["Зробити перерву на 10 хвилин", "calm", 4], ["Образитися і сперечатися", null, -18]] },
  ];
  function enterDeal(api) {
    S.scene = "deal"; S.stage = 4;
    S.scn = { evs: DEAL_EVENTS.slice().sort(() => Math.random() - 0.5).slice(0, ri(1, S.nasty ? 4 : 3)), i: 0, busy: false, prog: 0 };
  }
  async function dealEvent(api, e) {
    const c = await api.choose(e.q, e.a.map((x) => x[0]), S.rep.e + " " + S.rep.n + " і продавець");
    const [, kind, val] = e.a[c];
    let d = val;
    if (kind === "calm" || kind === "exp") d = S.rep[kind] >= 2 ? val : -Math.abs(val) / 2;
    if (typeof kind === "number") addDays(kind);
    S.trust = api.clamp(S.trust + d, 0, 100);
    msg((d >= 0 ? "Довіра +" : "Довіра ") + Math.round(d), { x: 480, y: 150 });
    api.sfx(d >= 0 ? "pick" : "bad");
  }
  UPD_deal = (dt, api) => {
    const D = S.scn; if (D.busy) return;
    D.prog += dt; addDays(dt * 0.2);
    if (D.prog < 1.2) return;
    if (S.trust <= 0) { D.busy = true; lose(api, "Продавець встав з-за столу: «Не буду я з вами нічого підписувати!»"); return; }
    if (D.i < D.evs.length) { D.busy = true; dealEvent(api, D.evs[D.i++]).then(() => { D.busy = false; D.prog = 0; }); return; }
    D.busy = true;
    api.say([["", "Намір підписано, завдаток передано. Тепер треба дочекатися строку угоди."]]).then(() => enterWait(api));
  };

  // ---------------------------------------------------------------- 6. Очікування
  const WAIT_EVENTS = [
    { q: "Орендар хоче сам викупити ділянку: у нього переважне право.", a: [["Домовитися з орендарем про компенсацію (+5 тис. до ціни)", "pay"], ["Чекати, що він не встигне зібрати гроші", "risk"], ["Попросити продавця поговорити з орендарем", "calm"]] },
    { q: "Орендар не за місцем реєстрації. Лист-повідомлення нікому вручити.", a: [["Відправити повторно на іншу адресу (+14 днів)", 14], ["Знайти через сільраду (+7 днів)", 7]] },
    { q: "Орендар не забирає лист на пошті.", a: [["Чекати повернення листа (+30 днів)", 30], ["Вручити через нотаріуса (+10 днів)", 10]] },
    { q: "Лист не доставлено: пошта загубила відправлення.", a: [["Повторна відправка з описом вкладення (+14 днів)", 14], ["Телеграма (+5 днів)", 5]] },
  ];
  function enterWait(api) {
    S.scene = "wait"; S.stage = 5;
    const months = pick([1, 1.5, 2, 3]);
    S.scn = { total: Math.round(months * 30), passed: 0, evs: WAIT_EVENTS.slice().sort(() => Math.random() - 0.5).slice(0, ri(0, 2) + (S.lease && S.lease.risk >= 2 ? 1 : 0)), busy: false, months };
    S.scn.evAt = S.scn.evs.map((_, i) => (i + 1) / (S.scn.evs.length + 1));
    api.banner("Очікування строку угоди: " + (months === 1.5 ? "півтора місяця" : months + " " + (months === 1 ? "місяць" : "місяці")), 2800);
  }
  UPD_wait = (dt, api) => {
    const W = S.scn; if (W.busy) return;
    const step = dt * 9; W.passed += step; addDays(step);
    if (W.evs.length && W.passed / W.total >= W.evAt[0]) { W.evAt.shift(); W.busy = true; waitEvent(api, W.evs.shift()).then((ok) => { if (ok !== false) W.busy = false; }); return; }
    if (W.passed >= W.total) { W.busy = true; api.say([["", "Строк минув. Час їхати на основну угоду."]]).then(async () => { await chooseRep(api, "Хто поїде з тобою на угоду цього разу?"); enterDrive(api, "deal2"); }); }
  };
  async function waitEvent(api, e) {
    const c = await api.choose(e.q, e.a.map((x) => x[0]), "Поки триває очікування");
    const k = e.a[c][1];
    if (typeof k === "number") { addDays(k); return true; }
    if (k === "pay") { S.price = Math.min(140, S.price + 5); return true; }
    if (k === "risk") { if (chance(0.4)) { await lose(api, "Орендар таки зібрав гроші і скористався переважним правом."); return false; } return true; }
    if (k === "calm") { if (chance(0.25)) { await lose(api, "Розмова продавця з орендарем закінчилася тим, що він продав ділянку орендарю."); return false; } S.trust += 5; return true; }
    return true;
  }

  // ---------------------------------------------------------------- 7. Друга поїздка, основна угода
  const DEAL2_EVENTS = [
    { q: "На рахунку немає потрібної суми: переказ ще не надійшов.", a: [["Зачекати переказ (+3 дні)", 3, 0], ["Попросити продавця почекати годину", "calm", 4], ["Показати платіжку і тиснути", null, -12]] },
    { q: "Продавець отримав виконавче провадження. Реєстр показує арешт.", a: [["Погасити борг із суми угоди через нотаріуса", "exp", 6], ["Чекати зняття арешту (+20 днів)", 20, 0], ["Відмовитися", "quit", 0]] },
    { q: "Продавець передумав: «Сусід каже, що земля подорожчає».", a: [["Додати 5 тис. до ціни", "pay", 15], ["Пояснити, що ціна вже ринкова", "exp", 6], ["«Тоді шукайте іншого покупця»", null, -25]] },
    { q: "Орендар вставляє палиці в колеса: надіслав нотаріусу заперечення.", a: [["Залучити юриста (+7 днів)", 7, 0], ["Домовитися з орендарем про врожай цього року", "calm", 5], ["Ігнорувати", null, -10]] },
  ];
  function enterDeal2(api) {
    S.scene = "deal2"; S.stage = 6;
    S.scn = { evs: DEAL2_EVENTS.slice().sort(() => Math.random() - 0.5).slice(0, ri(0, 2)), i: 0, busy: false, prog: 0 };
  }
  UPD_deal2 = (dt, api) => {
    const D = S.scn; if (D.busy) return;
    D.prog += dt; addDays(dt * 0.2);
    if (D.prog < 1.2) return;
    if (S.trust <= 0) { D.busy = true; lose(api, "Продавець відмовився від угоди в останній момент."); return; }
    if (D.i < D.evs.length) {
      D.busy = true; const e = D.evs[D.i++];
      api.choose(e.q, e.a.map((x) => x[0]), S.rep.e + " " + S.rep.n + " і продавець").then((c) => {
        const [, kind, val] = e.a[c];
        if (kind === "quit") return lose(api, "Ти відмовився від угоди через арешт.");
        if (kind === "pay") S.price = Math.min(140, S.price + 5);
        let d = val; if (kind === "calm" || kind === "exp") d = S.rep[kind] >= 2 ? val : -Math.abs(val) / 2;
        if (typeof kind === "number") addDays(kind);
        S.trust = api.clamp(S.trust + d, 0, 100); api.sfx(d >= 0 ? "pick" : "bad");
        D.busy = false; D.prog = 0;
      });
      return;
    }
    D.busy = true;
    api.say([["Нотаріус", "Договір купівлі-продажу посвідчено. Вітаю! Лишилося отримати гроші в банку."]]).then(() => enterBank(api));
  };

  // ---------------------------------------------------------------- 8. Банк
  function enterBank(api) {
    S.scene = "bank"; S.stage = 7;
    S.scn = { p: api.actor({ x: 120, y: 470, emoji: "🧑‍💼", size: 36, speed: 190 }), queue: Array.from({ length: ri(3, 6) }, (_, i) => ({ x: 560 - i * 50, y: 300, e: pick(["🧓", "👩", "👨", "👵", "🧔"]) })), qt: 0,
      ev: pick(["none", "closed", "alarm", "finmon", "finmon", "alarm"]), evDone: false, alarm: 0, closed: false };
    api.banner("Банк. Підійди до віконця каси.", 2400);
  }
  UPD_bank = (dt, api) => {
    const B = S.scn, p = B.p;
    addDays(dt * 0.2);
    if (B.alarm > 0) { B.alarm -= dt; if (B.alarm <= 0) { api.banner("Відбій тривоги. Банк знову працює."); } return; }
    api.moveActor(p, dt, { x0: 30, x1: 930, y0: 200, y1: 515 });
    B.qt += dt; if (B.qt > 2.2 && B.queue.length) { B.qt = 0; B.queue.shift(); for (const q of B.queue) q.x += 50; }
    if (!B.evDone && p.x > 300) {
      B.evDone = true;
      if (B.ev === "closed") { api.say([["", "На дверях: «Банк зачинено. Технічна перерва»."]]).then(() => { addDays(1); api.banner("Наступного дня…"); p.x = 120; }); return; }
      if (B.ev === "alarm") { B.alarm = 6; api.sfx("whoosh"); api.banner("Повітряна тривога! Усі в укриття.", 3000); addDays(0.5); return; }
    }
    if (api.input.act && p.x > 720 && p.y < 360) window_(api);
  };
  async function window_(api) {
    const B = S.scn;
    if (B.queue.length) { msg("Спершу черга: ще " + B.queue.length + " осіб"); return; }
    if (B.ev === "finmon" && !B.fin) {
      const c = await api.choose("Фінмоніторинг: «Підтвердіть підставу надходження коштів».", ["Договір купівлі-продажу і витяг з реєстру", "Скріншот з месенджера", "Слово честі"], "Каса банку");
      if (c !== 0) { addDays(2); api.sfx("bad"); await api.say([["Каса банку", "Цього недостатньо. Принесіть документи і приходьте знову."]]); B.fin = true; return; }
      B.fin = true;
    }
    S.done = true; api.locked = true; api.sfx("end");
    const d = Math.floor(S.days);
    await api.say([["Каса банку", `Видаємо ${S.price} тис. Угоду завершено.`], ["", `Від ринку до банку: ${d} ${daysWord(d)}, зривів: ${S.lost}.`]]);
    api.locked = false;
    api.end(d <= 100 ? "А" : d <= 180 ? "Б" : "В");
  }

  // ---------------------------------------------------------------- малювання
  const DRAW = {
    market(ctx, api) {
      const M = S.scn;
      ctx.fillStyle = "#e9dcc0"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#e0d0b0"; for (let i = 0; i < 80; i++) ctx.fillRect((i * 131) % 960, (i * 77) % 540, 22, 6);
      ctx.fillStyle = "#3f6b3a"; ctx.fillRect(0, 0, 960, 96);
      api.D.text("ЗЕМЕЛЬНИЙ РИНОК", 480, 64, { size: 22, color: "#fff", display: true });
      OBL.forEach((o, i) => api.D.text(o, 80 + i * 160, 86, { size: 11, color: "#cfe3c4" }));
      for (const s of M.sellers) {
        const a = s.st === "leaving" ? Math.max(0, s.alpha) : s.st === "ghost" ? 0.45 : 1;
        api.D.shadow(s.x, s.y + 18, 14, 0.2 * a);
        api.D.emoji(s.face, s.x, s.y, 38, { alpha: a });
        api.D.rr(s.x - 46, s.y - 52, 92, 30, 8, s.st === "comp" ? "rgba(255,214,200,0.95)" : "rgba(255,255,255,0.92)");
        ctx.globalAlpha = a; api.D.text(s.obl, s.x, s.y - 44, { size: 10, color: "#5b4a2a" }); api.D.text(s.price + " тис.", s.x, s.y - 30, { size: 13, color: "#1f2a1a", weight: 700 }); ctx.globalAlpha = 1;
        if (s.st === "ghost") api.D.emoji("📵", s.x + 22, s.y - 6, 18);
        if (s.execSeen && s.st !== "leaving") api.D.emoji("⚖️", s.x - 24, s.y - 6, 18);
        if (s.st === "leaving" && s.why) api.D.text(s.why, s.x, s.y + 30, { size: 12, color: "#9b2c2c", alpha: a });
      }
      for (const c of M.comps) {
        api.D.shadow(c.x, c.y + 16, 12); api.D.emoji(c.e, c.x, c.y, 34, { flip: c.flip });
        if (c.target && c.target.st === "comp" && c.target.by === c) { ctx.strokeStyle = "#d9534f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.target.x, c.target.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (c.t / c.need)); ctx.stroke(); }
      }
      api.drawActor(M.p); api.D.text("ТИ", M.p.x, M.p.y - 30, { size: 11, color: "#1f2a1a" });
    },
    check(ctx, api) {
      const C = S.scn;
      ctx.fillStyle = "#dfe7ef"; ctx.fillRect(0, 0, 960, 540);
      api.D.rr(180, 300, 600, 160, 14, "#a0744a");
      api.D.emoji("🗂️", 300, 270, 60); api.D.emoji("📄", 420 + Math.sin(C.paper * 4) * 6, 270, 46); api.D.emoji("🔍", 540, 270, 46); api.D.emoji("💻", 660, 262, 56);
      api.D.emoji(S.seller.face, 240, 200, 56); api.D.emoji("🧑‍💼", 720, 200, 56);
      api.D.text("Перевірка документів на ділянку", 480, 90, { size: 22, color: "#1d2a3a", display: true });
      api.D.text(`${S.seller.name}, ${S.seller.obl} обл., ${S.price} тис.`, 480, 124, { size: 15, color: "#3b4a5c" });
      api.D.bar(280, 500, 400, 14, C.prog, "#3a7bd5", "rgba(0,0,0,0.15)");
      api.D.text("Реєстр, кадастр, оренда, обтяження…", 480, 482, { size: 13, color: "#3b4a5c" });
    },
    notary(ctx, api) {
      const N = S.scn;
      ctx.fillStyle = "#cfd8c4"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#9aa58c"; ctx.fillRect(0, 300, 960, 60);
      for (const o of N.offices) {
        api.D.rr(o.x - 80, 90, 160, 200, 10, "#e8e2d4", "#8a7f6a", 2);
        api.D.emoji("🏢", o.x, 160, 70);
        api.D.text("Нотаріус " + o.n, o.x, 236, { size: 13, color: "#3a3326", display: true });
        const tag = { ok: "", busy: "", noanswer: "", vacation: "", nointent: "", nasty: "", away: "🏖️ відпустка" }[o.st];
        if (tag) api.D.text(tag, o.x, 262, { size: 12, color: "#8a3b2b" });
        api.D.emoji("🚪", o.x, 290, 36);
      }
      api.D.shadow(N.sel.x, N.sel.y + 18, 13); api.D.emoji(S.seller.face, N.sel.x, N.sel.y, 34);
      api.drawActor(N.p);
      api.D.text("Підійди до дверей і натисни Пробіл", 480, 520, { size: 14, color: "#2d3a22" });
    },
    drive(ctx, api) {
      const D = S.scn;
      ctx.fillStyle = "#6f9a4a"; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#555b63"; ctx.fillRect(310, 0, 340, 540);
      ctx.fillStyle = "#e8e8e8"; for (let y = -60 + (D.scroll % 60); y < 540; y += 60) { ctx.fillRect(398, y, 6, 30); ctx.fillRect(478, y, 6, 30); ctx.fillRect(558, y, 6, 30); }
      for (let i = 0; i < 8; i++) { const y = ((i * 90 + D.scroll * 0.9) % 640) - 60; api.D.emoji(i % 2 ? "🌳" : "🌾", i % 2 ? 230 : 730, y, 44); }
      for (const o of D.obs) api.D.emoji(o.e, o.x, o.y, 40);
      api.D.emoji("🚗", D.x, 440, 60, { rot: Math.PI / 2 });
      api.D.text(S.rep.n + " за кермом · " + (D.next === "deal" ? "до нотаріуса" : "на основну угоду"), 480, 520, { size: 15, color: "#fff", stroke: "rgba(0,0,0,.5)" });
      api.D.bar(700, 60, 220, 14, D.dist / D.need, "#f2c14e");
      api.D.text("Шлях", 810, 92, { size: 12, color: "#fff" });
    },
    deal(ctx, api) { drawOffice(ctx, api, "Намір і завдаток"); },
    deal2(ctx, api) { drawOffice(ctx, api, "Основна угода купівлі-продажу"); },
    wait(ctx, api) {
      const W = S.scn;
      ctx.fillStyle = "#eef0f4"; ctx.fillRect(0, 0, 960, 540);
      api.D.text("Очікування строку угоди", 480, 80, { size: 24, color: "#1d2a3a", display: true });
      api.D.rr(330, 140, 300, 260, 18, "#fff", "#c3c9d4", 2);
      api.D.rr(330, 140, 300, 60, 18, "#d9534f");
      const day = Math.floor(W.passed);
      api.D.text("Днів очікування з " + W.total, 480, 172, { size: 22, color: "#fff", display: true });
      api.D.text(String(day), 480, 300, { size: 96, color: "#1d2a3a", display: true });
      api.D.emoji("✉️", 230, 300, 56); api.D.emoji("🏤", 730, 300, 56);
      api.D.bar(330, 430, 300, 12, W.passed / W.total, "#3a7bd5", "rgba(0,0,0,0.12)");
      api.D.text("Повідомлення орендарю, переважне право, строки…", 480, 470, { size: 14, color: "#4a5568" });
    },
    bank(ctx, api) {
      const B = S.scn;
      ctx.fillStyle = "#e6e9ef"; ctx.fillRect(0, 0, 960, 540);
      for (let x = 0; x < 960; x += 60) for (let y = 200; y < 540; y += 60) { ctx.fillStyle = (x / 60 + y / 60) % 2 ? "#dde2ea" : "#e6e9ef"; ctx.fillRect(x, y, 60, 60); }
      ctx.fillStyle = "#2b3a55"; ctx.fillRect(0, 0, 960, 190);
      api.D.text("БАНК", 480, 70, { size: 34, color: "#f2c14e", display: true });
      api.D.rr(740, 210, 200, 120, 12, "#c9d2e3", "#2b3a55", 2); api.D.emoji("🏦", 840, 250, 50); api.D.text("Каса", 840, 300, { size: 14, color: "#2b3a55", display: true });
      for (const q of B.queue) api.D.emoji(q.e, q.x + 120, q.y, 38);
      api.drawActor(B.p);
      if (B.alarm > 0) { ctx.fillStyle = "rgba(120,0,0,0.45)"; ctx.fillRect(0, 0, 960, 540); api.D.text("ПОВІТРЯНА ТРИВОГА · " + Math.ceil(B.alarm), 480, 280, { size: 30, color: "#fff", display: true }); }
      api.D.text("Підійди до каси і натисни Пробіл", 480, 520, { size: 14, color: "#2b3a55" });
    },
  };
  function drawOffice(ctx, api, title) {
    ctx.fillStyle = "#f1ece2"; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#d8cbb0"; ctx.fillRect(0, 380, 960, 160);
    api.D.text(title, 480, 70, { size: 22, color: "#3a2e1e", display: true });
    api.D.rr(260, 300, 440, 90, 12, "#8a5a32");
    api.D.emoji("🧑‍⚖️", 480, 240, 64); api.D.text("Нотаріус", 480, 285, { size: 12, color: "#3a2e1e" });
    api.D.emoji(S.seller.face, 300, 260, 60); api.D.text(S.seller.name, 300, 300, { size: 12, color: "#3a2e1e" });
    api.D.emoji(S.rep.e, 660, 260, 60); api.D.text(S.rep.n, 660, 300, { size: 12, color: "#3a2e1e" });
    api.D.emoji("📜", 420, 330, 34); api.D.emoji("🖊️", 540, 330, 30); api.D.emoji("💼", 600, 340, 34);
    api.D.text("Довіра продавця", 480, 430, { size: 14, color: "#3a2e1e" });
    api.D.bar(330, 446, 300, 14, S.trust / 100, S.trust > 30 ? "#4caf50" : "#e05a4f", "rgba(0,0,0,0.15)");
  }
  const UPD = { market: (a, b) => UPD_market(a, b), check: (a, b) => UPD_check(a, b), notary: (a, b) => UPD_notary(a, b), drive: (a, b) => UPD_drive(a, b), deal: (a, b) => UPD_deal(a, b), wait: (a, b) => UPD_wait(a, b), deal2: (a, b) => UPD_deal2(a, b), bank: (a, b) => UPD_bank(a, b) };
  var UPD_market, UPD_check, UPD_notary, UPD_drive, UPD_deal, UPD_wait, UPD_deal2, UPD_bank;

  PG.start(game);
})();
