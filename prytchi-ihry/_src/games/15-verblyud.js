/* Гра 15 «Верблюд на мурі» — будівельна головоломка за притчею «Спокуса очевидним». */
(function () {
  const GROUND = 440, WALL_X = 690, WALL_TOP = 200, NEED = 6, TIME = 110;
  const SPOTS = { ladder: 125, planks: 205, rope: 285, rubble: 365 };
  let S;

  const game = {
    id: "15", title: "Верблюд на мурі", parable: "Спокуса очевидним",
    story: "Двоє юнаків хотіли стати учнями Майстра. «Затягніть цього верблюда на міський мур». Перший відмовився: «Це безглуздо». Другий довго тягнув верблюда драбиною і, звісно, не зміг. «Я готовий тебе вчити. Ти не піддався спокусі очевидного».",
    goal: "Майстер дає вступне завдання: затягнути верблюда на міський мур. Біля муру лежать драбина, мотузка, кілька дощок і купа цегли. Відмовитися можна будь-коли.",
    controls: ["← → або A D — ходити; ↑ біля драбини — вилізти на мур, ↓ — злізти", "Пробіл або E — взяти, покласти, використати", "Q або Shift — відмовитися від завдання"],
    help: "<kbd>← →</kbd> ходити · <kbd>↑ ↓</kbd> драбина · <kbd>Пробіл</kbd> взяти / використати · <kbd>Q</kbd> відмовитися",
    actLabel: "Дія", altLabel: "Відмова", dlgTop: true,
    endings: {
      "А": { title: "Відмовився", text: "«Це безглуздо», — сказав ти. «Ти вже все знаєш, — відповів Майстер. — Мені нема чого тебе вчити»." },
      "Б": { title: "Старанно пробував", text: "Верблюд так і лишився внизу. Але Майстер усміхнувся: «Ти не піддався спокусі очевидного. Я готовий тебе вчити»." },
      "В": { title: "Нестандартне рішення", text: "Ти поклав табличку «МУР» на землю й поставив на неї верблюда. Майстер довго сміявся, а потім сказав: «Будеш моїм помічником»." },
      "Г": { title: "Справді затягнув", text: "Цеглина за цеглиною ти збудував пандус, і верблюд вийшов на мур. «Чудово! — сказав Майстер. — А тепер справжнього», і вивів верблюда вдвічі більшого." },
    },
    moral: "Ми так багато знаємо і так добре все пояснюємо, що перестаємо дивуватися життю. Досвід часто відгороджує нас від справжніх здібностей, а спокуса очевидного приховує те, що під ним.",
    questions: ["Що ви відкинули як «неможливе», навіть не спробувавши?", "Де ваш досвід заважає вам дивуватися?", "Що б ви зробили, якби не знали, що це неможливо?"],

    _s() { return S; },
    init(api) {
      S = {
        p: { x: 90, y: GROUND, flip: true, phase: 0, top: false }, carry: null, ladder: false, rope: false, ramp: 0, planks: 3, bricks: 0, digT: 0,
        camel: { x: 445, y: GROUND, lift: 0, up: 0 }, sign: { x: 610, y: GROUND - 20, held: false }, attempts: 0, time: TIME, done: false, msg: "", msgT: 0,
      };
    },
    async start(api) {
      await api.say([["Майстер", "Хочеш бути моїм учнем? Тоді затягни цього верблюда на міський мур."], ["Майстер", "Час пішов. І пам’ятай: відмовитися можна будь-коли."]]);
    },

    update(dt, api) {
      if (S.done) return;
      const p = S.p, I = api.input;
      S.time -= dt; S.msgT -= dt;
      if (!p.top) {
        const vx = I.x * 210;
        p.x = api.clamp(p.x + vx * dt, 30, WALL_X - 30 - S.ramp * 6); if (vx) { p.flip = vx > 0; p.phase += dt * 10; }
        if ((I.up || I.y < -0.6) && S.ladder && Math.abs(p.x - (WALL_X - 30)) < 50) { p.top = true; p.x = WALL_X + 60; p.y = WALL_TOP; api.sfx("blip"); }
      } else {
        const vx = I.x * 160; p.x = api.clamp(p.x + vx * dt, WALL_X + 20, 930); if (vx) p.flip = vx > 0;
        if (I.down || I.y > 0.6) { p.top = false; p.x = WALL_X - 40; p.y = GROUND; api.sfx("blip"); }
      }
      if (S.carry === "sign") { S.sign.x = p.x + 20; S.sign.y = p.y - 50; }
      if (S.digT > 0) { S.digT -= dt; if (S.digT <= 0) { S.carry = "brick"; api.sfx("pick"); msg("Цеглина!"); } }
      if (S.camel.lift > 0) { S.camel.lift = Math.max(0, S.camel.lift - dt * 60); }
      if (api.input.act) act(api);
      if (api.input.alt) refuse(api);
      if (S.time <= 0) timeUp(api);
      api.hud([["Час", Math.max(0, Math.ceil(S.time)) + " с"], ["Спроб", S.attempts], ["Пандус", S.ramp + " з " + NEED], S.carry ? ["У руках", { ladder: "драбина", rope: "мотузка", plank: "дошка", brick: "цеглина", sign: "табличка" }[S.carry]] : null]);
    },

    draw(ctx, api) {
      const sky = ctx.createLinearGradient(0, 0, 0, 540); sky.addColorStop(0, "#f6d7a0"); sky.addColorStop(1, "#f9ebcc");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
      api.D.emoji("☀️", 520, 70, 50);
      ctx.fillStyle = "#c9a46a"; ctx.fillRect(0, GROUND, 960, 100);
      // мур
      ctx.fillStyle = "#b07a45"; ctx.fillRect(WALL_X, WALL_TOP, 270, GROUND - WALL_TOP);
      ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 2;
      for (let y = WALL_TOP; y < GROUND; y += 24) for (let x = WALL_X + ((y / 24) % 2) * 20; x < 960; x += 40) ctx.strokeRect(x, y, 40, 24);
      for (let x = WALL_X; x < 960; x += 40) { ctx.fillStyle = "#b07a45"; ctx.fillRect(x, WALL_TOP - 22, 22, 22); }
      api.D.emoji("🏰", 880, WALL_TOP - 60, 60);
      // пандус
      if (S.ramp > 0) {
        const h = (GROUND - WALL_TOP) * S.ramp / NEED, w = S.ramp * 36;
        ctx.fillStyle = "#9b6b3a"; ctx.beginPath(); ctx.moveTo(WALL_X, GROUND); ctx.lineTo(WALL_X, GROUND - h); ctx.lineTo(WALL_X - w, GROUND); ctx.fill();
        ctx.strokeStyle = "#6b4321"; ctx.stroke();
      }
      if (S.ladder) {
        ctx.strokeStyle = "#7a5530"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(WALL_X - 34, GROUND); ctx.lineTo(WALL_X - 20, WALL_TOP - 14); ctx.moveTo(WALL_X - 10, GROUND); ctx.lineTo(WALL_X + 4, WALL_TOP - 14); ctx.stroke();
        ctx.lineWidth = 4; for (let y = GROUND - 22; y > WALL_TOP; y -= 26) { const k = (GROUND - y) / (GROUND - WALL_TOP + 14) * 14; ctx.beginPath(); ctx.moveTo(WALL_X - 34 + k, y); ctx.lineTo(WALL_X - 10 + k, y); ctx.stroke(); }
      }
      // речі на землі
      if (!S.ladder && S.carry !== "ladder") api.D.emoji("🪜", SPOTS.ladder, GROUND - 30, 60, { rot: -0.4 });
      if (!S.rope && S.carry !== "rope") api.D.emoji("🪢", SPOTS.rope, GROUND - 16, 40);
      for (let i = 0; i < S.planks - (S.carry === "plank" ? 1 : 0); i++) api.D.emoji("🪵", SPOTS.planks + i * 6, GROUND - 14 - i * 10, 36, { rot: 1.4 });
      api.D.emoji("🧱", SPOTS.rubble, GROUND - 14, 44); api.D.emoji("🧱", SPOTS.rubble + 26, GROUND - 22, 38);
      if (S.digT > 0) api.D.bar(SPOTS.rubble - 30, GROUND - 60, 60, 8, 1 - S.digT / 1.2, "#e07b39");
      // табличка
      api.D.rr(S.sign.x - 30, S.sign.y - 14, 60, 28, 6, "#f3e2b5", "#6b4321");
      api.D.text("МУР", S.sign.x, S.sign.y, { size: 13, color: "#4a2a10", display: true });
      // верблюд
      const c = S.camel;
      api.D.shadow(c.x, GROUND + 4, 30);
      api.D.emoji("🐫", c.x, c.y - 36 - c.lift, 80, { flip: false });
      if (S.rope) { ctx.strokeStyle = "#7a5a32"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x + 10, c.y - 60 - c.lift); ctx.lineTo(S.p.top ? S.p.x : WALL_X + 30, S.p.top ? S.p.y - 20 : WALL_TOP); ctx.stroke(); }
      // майстер
      api.D.emoji("🧙", 50, GROUND - 32, 54); api.D.text("Майстер", 50, GROUND + 22, { size: 12, color: "#5a3a1a" });
      // гравець
      const p = S.p, bob = api.input.x ? Math.abs(Math.sin(p.phase)) * 4 : 0;
      api.D.shadow(p.x, p.y + 4, 14);
      api.D.emoji("🧑", p.x, p.y - 28 - bob, 46, { flip: p.flip });
      if (S.carry && S.carry !== "sign") api.D.emoji({ ladder: "🪜", rope: "🪢", plank: "🪵", brick: "🧱" }[S.carry], p.x + (p.flip ? 22 : -22), p.y - 40 - bob, 28);
      const hint = hintText();
      if (hint) api.D.text(hint, p.x, p.y - 74, { size: 13, color: "#3a2410", stroke: "rgba(255,255,255,.7)", strokeW: 3 });
      if (S.msgT > 0) api.D.bubble(S.msg, p.x, p.y - 82, { size: 13 });
    },
  };

  function msg(t) { S.msg = t; S.msgT = 2.6; }
  function near(x, r) { return !S.p.top && Math.abs(S.p.x - x) < (r || 45); }
  function hintText() {
    const p = S.p;
    if (p.top) return S.rope ? "Пробіл — тягти мотузку" : "↓ — злізти";
    if (!S.carry) {
      if (near(SPOTS.ladder) && !S.ladder) return "Пробіл — взяти драбину";
      if (near(SPOTS.rope) && !S.rope) return "Пробіл — взяти мотузку";
      if (near(SPOTS.planks) && S.planks > 0) return "Пробіл — взяти дошку";
      if (near(SPOTS.rubble)) return "Пробіл — розібрати цеглу";
      if (near(S.sign.x, 50)) return "Пробіл — взяти табличку";
      if (near(S.camel.x, 60)) return "Пробіл — вести верблюда";
    }
    if (S.carry && near(WALL_X - 40, 70)) return S.carry === "ladder" ? "Пробіл — приставити драбину" : S.carry === "plank" || S.carry === "brick" ? "Пробіл — покласти в пандус" : "";
    if (S.carry === "rope" && near(S.camel.x, 60)) return "Пробіл — прив’язати верблюда";
    if (S.carry === "sign" && near(S.camel.x, 70)) return "Пробіл — покласти табличку";
    return "";
  }

  async function act(api) {
    const p = S.p;
    if (p.top) { if (S.rope) return pull(api); return; }
    if (S.digT > 0) return;
    if (!S.carry) {
      if (near(SPOTS.ladder) && !S.ladder) { S.carry = "ladder"; api.sfx("pick"); return; }
      if (near(SPOTS.rope) && !S.rope) { S.carry = "rope"; api.sfx("pick"); return; }
      if (near(SPOTS.planks) && S.planks > 0) { S.carry = "plank"; api.sfx("pick"); return; }
      if (near(SPOTS.rubble)) { S.digT = 1.2; api.sfx("blip"); return; }
      if (near(S.sign.x, 50)) { S.carry = "sign"; api.sfx("pick"); msg("Табличка «МУР». Хм…"); return; }
      if (near(S.camel.x, 60)) return lead(api);
      return;
    }
    if (S.carry === "sign" && near(S.camel.x, 70)) return signTrick(api);
    if (S.carry === "rope" && near(S.camel.x, 60)) { S.rope = true; S.carry = null; api.sfx("pick"); msg("Мотузку прив’язано. Тепер — нагору, тягти!"); if (!S.ladder) msg("Прив’язано. Тільки як вилізти на мур?"); return; }
    if (near(WALL_X - 40, 70)) {
      if (S.carry === "ladder") { S.ladder = true; S.carry = null; api.sfx("pick"); msg("Драбина біля муру. ↑ — вилізти"); return; }
      if (S.carry === "plank" || S.carry === "brick") {
        if (S.carry === "plank") S.planks--;
        S.carry = null; S.ramp++; api.sfx("good"); api.shake(2, 0.1);
        if (S.ramp === 3 && !S.ev3) { S.ev3 = true; S.attempts++; await api.say([["Майстер", "Дошки скінчилися? Ти ж розумієш, що це неможливо?"]]); }
        if (S.ramp >= NEED) return rampDone(api);
        return;
      }
    }
    // покласти річ на землю
    if (S.carry === "sign") { S.carry = null; S.sign.x = p.x; S.sign.y = GROUND - 20; return; }
    if (S.carry === "plank") { S.carry = null; return; }
    msg("Тут цьому не місце");
  }

  async function lead(api) {
    S.attempts++; api.sfx("bad");
    if (S.ladder) { S.camel.x = WALL_X - 70; await api.say([["", "Ти ведеш верблюда до драбини. Він ставить одне копито на щабель, дивиться на тебе з глибоким сумнівом і відступає."]]); S.camel.x = 445; }
    else await api.say([["", "Верблюд іде за тобою до муру, обнюхує каміння і лягає. Далі не піде."]]);
  }

  async function pull(api) {
    S.attempts++; S.camel.lift = 40; api.sfx("bad"); api.shake(5, 0.3);
    await api.say([["", "Ти тягнеш з усіх сил. Верблюд відривається від землі на долоню… і всідається назад. Він у п’ять разів важчий за тебе."]]);
  }

  async function signTrick(api) {
    S.done = true; api.locked = true; S.carry = null;
    S.sign.x = S.camel.x; S.sign.y = GROUND + 6; S.camel.y = GROUND - 14; api.sfx("good");
    await api.say([["", "Ти кладеш табличку «МУР» на землю і заводиш на неї верблюда."], ["Ти", "Готово, Майстре. Верблюд на мурі."], ["Майстер", "Ха-ха! Ось хто не піддається спокусі очевидного."]]);
    api.locked = false; api.end("В");
  }

  async function rampDone(api) {
    S.done = true; api.locked = true; api.sfx("end");
    const w = S.ramp * 36, x0 = WALL_X - w;
    while (S.camel.x < x0) { S.camel.x += 4; await api.wait(0.02); }
    while (S.camel.x < WALL_X) { S.camel.x += 3; S.camel.y = GROUND - (S.camel.x - x0) / w * (GROUND - WALL_TOP); await api.wait(0.02); }
    S.camel.y = WALL_TOP; while (S.camel.x < WALL_X + 120) { S.camel.x += 3; await api.wait(0.02); }
    await api.say([["Майстер", "Чудово! Верблюд на мурі."], ["Майстер", "А тепер — справжнього."], ["", "Майстер виводить з-за рогу верблюда вдвічі більшого."]]);
    api.locked = false; api.end("Г");
  }

  async function refuse(api) {
    const c = await api.choose("Відмовитися від завдання?", ["Так, це безглуздо", "Ні, ще спробую"], "Майстер");
    if (c !== 0) return;
    S.done = true; api.locked = true;
    await api.say([["Ти", "Затягнути верблюда на мур неможливо. Я відмовляюся."], ["Майстер", "Ти дуже розумний. Ти вже все знаєш. Тому мені нема чого тебе вчити."]]);
    api.locked = false; api.end("А");
  }

  async function timeUp(api) {
    S.done = true; api.locked = true;
    if (S.attempts >= 1) {
      await api.say([["Майстер", "Досить. Верблюд унизу, але ти пробував і не сказав «неможливо». Я готовий тебе вчити."]]);
      api.locked = false; return api.end("Б");
    }
    await api.say([["Майстер", "Ти навіть не спробував. Схоже, ти вже вирішив, що це неможливо."]]);
    api.locked = false; api.end("А");
  }

  PG.start(game);
})();
