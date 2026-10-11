/* Рушій ігор «Притчі в русі»: цикл гри, керування (клавіатура, миша, сенсор),
   діалоги з вибором, банери, HUD, фінали з підрахунком знайдених, простий звук. */
(function () {
  "use strict";
  const W = 960, H = 540;
  const META = window.PG_META || {};
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), cv = $("#cv"), ctx = cv.getContext("2d");
  const hudEl = $("#hud"), bannerEl = $("#banner"), dlg = $("#dlg"), screenEl = $("#screen"), pad = $("#pad");
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  // ---------- сховище
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* без сховища гра працює далі */ } },
  };

  // ---------- полотно
  let scale = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    scale = cv.width / W;
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- звук
  let actx = null, muted = store.get("pg:muted", false);
  const muteBtn = $("#mute");
  function syncMute() { if (muteBtn) { muteBtn.textContent = muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-label", muted ? "Увімкнути звук" : "Вимкнути звук"); } }
  syncMute();
  if (muteBtn) muteBtn.addEventListener("click", () => { muted = !muted; store.set("pg:muted", muted); syncMute(); muteBtn.blur(); });
  function ensureAudio() {
    if (actx || muted) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  function tone(freq, dur, type, vol, slide) {
    if (muted || !actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const SFX = {
    pick: () => { tone(660, 0.09, "triangle", 0.1); setTimeout(() => tone(990, 0.1, "triangle", 0.08), 60); },
    good: () => { tone(523, 0.12, "triangle"); setTimeout(() => tone(659, 0.12, "triangle"), 90); setTimeout(() => tone(784, 0.2, "triangle"), 180); },
    bad: () => tone(220, 0.25, "sawtooth", 0.07, 0.6),
    step: () => tone(140 + Math.random() * 40, 0.04, "square", 0.03),
    bell: () => { tone(880, 0.6, "sine", 0.1); tone(1320, 0.5, "sine", 0.04); },
    blip: () => tone(520, 0.05, "square", 0.04),
    whoosh: () => tone(300, 0.35, "sine", 0.08, 2.5),
    end: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.09), i * 110)); },
  };
  function sfx(name, freq) { ensureAudio(); if (name === "note") tone(freq || 440, 0.22, "triangle", 0.12); else if (SFX[name]) SFX[name](); }

  // ---------- введення
  const keys = new Set();
  const input = { x: 0, y: 0, act: false, actHeld: false, alt: false, altHeld: false, click: null, pointer: { x: -1, y: -1, down: false }, any: false };
  const pressedQ = new Set();
  const touchAxis = { x: 0, y: 0 }, touchBtn = { act: false, alt: false };
  const CODE = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    Space: "act", Enter: "act", KeyE: "act", NumpadEnter: "act", KeyQ: "alt", ShiftLeft: "alt", ShiftRight: "alt",
  };
  window.addEventListener("keydown", (e) => {
    ensureAudio();
    if (dlgState.open) { dlgKey(e); return; }
    if (screenState.open) { if (e.code === "Enter" || e.code === "Space") { const b = screenEl.querySelector("[data-primary]"); if (b && document.activeElement === document.body) { e.preventDefault(); b.click(); } } return; }
    const k = CODE[e.code];
    if (k) {
      e.preventDefault();
      if (!keys.has(k)) pressedQ.add(k);
      keys.add(k);
    }
    if (/^Digit[1-9]$/.test(e.code)) pressedQ.add("n" + e.code.slice(5));
  });
  window.addEventListener("keyup", (e) => { const k = CODE[e.code]; if (k) keys.delete(k); });
  window.addEventListener("blur", () => keys.clear());

  function toGame(ev) {
    const r = cv.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  }
  cv.addEventListener("pointerdown", (ev) => { ensureAudio(); const p = toGame(ev); input.pointer = { x: p.x, y: p.y, down: true }; input._click = p; });
  cv.addEventListener("pointermove", (ev) => { const p = toGame(ev); input.pointer.x = p.x; input.pointer.y = p.y; });
  window.addEventListener("pointerup", () => { input.pointer.down = false; });

  // сенсорний джойстик
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  function showPad() { if (pad && !pad.classList.contains("on")) pad.classList.add("on"); }
  if (coarse) showPad();
  window.addEventListener("touchstart", showPad, { passive: true, once: true });
  if (pad) {
    const stick = pad.querySelector(".stick"), knob = pad.querySelector(".knob");
    let sid = null;
    const setStick = (ev) => {
      const r = stick.getBoundingClientRect();
      let dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
      const m = r.width / 2, d = Math.hypot(dx, dy);
      if (d > m) { dx = (dx / d) * m; dy = (dy / d) * m; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / m, ny = dy / m;
      touchAxis.x = Math.abs(nx) < 0.22 ? 0 : nx; touchAxis.y = Math.abs(ny) < 0.22 ? 0 : ny;
    };
    stick.addEventListener("pointerdown", (ev) => { ensureAudio(); sid = ev.pointerId; stick.setPointerCapture(sid); setStick(ev); });
    stick.addEventListener("pointermove", (ev) => { if (ev.pointerId === sid) setStick(ev); });
    const rel = () => { sid = null; touchAxis.x = touchAxis.y = 0; knob.style.transform = ""; };
    stick.addEventListener("pointerup", rel); stick.addEventListener("pointercancel", rel);
    pad.querySelectorAll("button[data-k]").forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener("pointerdown", (ev) => {
        ev.preventDefault(); ensureAudio(); b.classList.add("down");
        if (dlgState.open) { dlgAdvance(); return; }
        if (screenState.open) { const p = screenEl.querySelector("[data-primary]"); if (p) p.click(); return; }
        touchBtn[k] = true; pressedQ.add(k);
      });
      const up = () => { b.classList.remove("down"); touchBtn[k] = false; };
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
    });
  }

  function pollInput() {
    let x = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
    let y = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    if (!x && !y) { x = touchAxis.x; y = touchAxis.y; }
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    input.x = x; input.y = y;
    input.act = pressedQ.has("act"); input.alt = pressedQ.has("alt");
    input.actHeld = keys.has("act") || touchBtn.act; input.altHeld = keys.has("alt") || touchBtn.alt;
    input.num = 0; for (let i = 1; i <= 9; i++) if (pressedQ.has("n" + i)) input.num = i;
    input.click = input._click || null; input._click = null;
    input.any = pressedQ.size > 0 || !!input.click;
    input.up = pressedQ.has("up"); input.down = pressedQ.has("down"); input.left = pressedQ.has("left"); input.right = pressedQ.has("right");
    pressedQ.clear();
  }
  function clearInput() { keys.clear(); pressedQ.clear(); input._click = null; touchBtn.act = touchBtn.alt = false; }

  // ---------- HUD і банер
  let hudCache = "";
  function hud(items) {
    const html = (items || []).filter(Boolean).map(([k, v]) => `<span>${esc(k)}${v === undefined || v === "" ? "" : `<b>${esc(String(v))}</b>`}</span>`).join("");
    if (html !== hudCache) { hudEl.innerHTML = html; hudCache = html; }
  }
  let bannerT = 0;
  function banner(text, ms) {
    bannerEl.textContent = text; bannerEl.hidden = false;
    bannerEl.style.animation = "none"; void bannerEl.offsetWidth; bannerEl.style.animation = "";
    clearTimeout(bannerT); bannerT = setTimeout(() => { bannerEl.hidden = true; }, ms || 2400);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  // ---------- діалоги
  const dlgState = { open: false, queue: [], resolve: null, options: null, sel: 0, mode: "say" };
  const dWho = dlg.querySelector(".who"), dTxt = dlg.querySelector(".txt"), dOpts = dlg.querySelector(".opts"), dMore = dlg.querySelector(".more");
  function renderLine(who, text) { dWho.textContent = who || ""; dTxt.textContent = text; }
  function say(lines, who) {
    if (typeof lines === "string") lines = [[who || "", lines]];
    lines = lines.map((l) => (typeof l === "string" ? [who || "", l] : l));
    return new Promise((res) => {
      clearInput();
      dlgState.open = true; dlgState.mode = "say"; dlgState.queue = lines.slice(1); dlgState.resolve = res;
      renderLine(lines[0][0], lines[0][1]); dOpts.innerHTML = ""; dMore.hidden = false; dlg.hidden = false;
      sfx("blip");
    });
  }
  function choose(text, options, who) {
    return new Promise((res) => {
      clearInput();
      dlgState.open = true; dlgState.mode = "choose"; dlgState.resolve = res; dlgState.options = options; dlgState.sel = 0;
      renderLine(who || "", text); dMore.hidden = true; dlg.hidden = false;
      dOpts.innerHTML = "";
      options.forEach((o, i) => {
        const b = document.createElement("button");
        b.className = "opt"; b.type = "button";
        b.innerHTML = `<span class="k">${i + 1}</span><span>${esc(o)}</span>`;
        b.addEventListener("click", (ev) => { ev.stopPropagation(); pickOpt(i); });
        dOpts.appendChild(b);
      });
      markSel(); sfx("blip");
    });
  }
  function markSel() { [...dOpts.children].forEach((b, i) => b.classList.toggle("sel", i === dlgState.sel)); }
  function pickOpt(i) { closeDlg(); sfx("pick"); const r = dlgState.resolve; dlgState.resolve = null; r && r(i); }
  function closeDlg() { dlgState.open = false; dlg.hidden = true; clearInput(); }
  function dlgAdvance() {
    if (dlgState.mode === "choose") { pickOpt(dlgState.sel); return; }
    if (dlgState.queue.length) { const [w, t] = dlgState.queue.shift(); renderLine(w, t); sfx("blip"); return; }
    closeDlg(); const r = dlgState.resolve; dlgState.resolve = null; r && r();
  }
  function dlgKey(e) {
    if (dlgState.mode === "choose") {
      const n = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (n) { const i = +n[2] - 1; if (i < dlgState.options.length) { e.preventDefault(); pickOpt(i); } return; }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); dlgState.sel = (dlgState.sel + 1) % dlgState.options.length; markSel(); return; }
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); dlgState.sel = (dlgState.sel - 1 + dlgState.options.length) % dlgState.options.length; markSel(); return; }
    }
    if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE" || e.code === "NumpadEnter") { e.preventDefault(); if (!e.repeat) dlgAdvance(); }
  }
  dlg.addEventListener("click", () => { if (dlgState.mode === "say") dlgAdvance(); });

  // ---------- екрани
  const screenState = { open: false };
  function showScreen(html, onBind) {
    screenEl.innerHTML = `<div class="card">${html}</div>`; screenEl.hidden = false; screenState.open = true; screenEl.scrollTop = 0;
    clearInput();
    if (onBind) onBind(screenEl);
    const p = screenEl.querySelector("[data-primary]"); if (p) setTimeout(() => p.focus({ preventScroll: true }), 30);
  }
  function hideScreen() { screenEl.hidden = true; screenState.open = false; screenEl.innerHTML = ""; }

  // ---------- малювання
  const D = {
    emoji(ch, x, y, size, o) {
      o = o || {};
      ctx.save(); ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (o.flip) ctx.scale(-1, 1);
      if (o.sy) ctx.scale(1, o.sy);
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ch, 0, size * 0.06);
      ctx.restore();
    },
    text(str, x, y, o) {
      o = o || {};
      const size = o.size || 18;
      ctx.save();
      ctx.font = `${o.weight || 600} ${size}px ${o.display ? '"Unbounded","Arial Black",sans-serif' : '"Commissioner","Segoe UI",sans-serif'}`;
      ctx.textAlign = o.align || "center"; ctx.textBaseline = o.baseline || "middle";
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      if (o.stroke) { ctx.lineWidth = o.strokeW || 4; ctx.strokeStyle = o.stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
      ctx.fillStyle = o.color || "#fff"; ctx.fillText(str, x, y);
      ctx.restore();
    },
    rr(x, y, w, h, r, fill, stroke, lw) {
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    },
    circle(x, y, r, fill, stroke, lw) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    },
    shadow(x, y, w, a) { ctx.save(); ctx.globalAlpha = a == null ? 0.25 : a; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); },
    bubble(str, x, y, o) {
      o = o || {};
      ctx.save();
      const size = o.size || 15;
      ctx.font = `600 ${size}px "Commissioner","Segoe UI",sans-serif`;
      const w = Math.min(ctx.measureText(str).width + 20, 360), h = size + 14;
      let bx = Math.max(6, Math.min(W - w - 6, x - w / 2)), by = y - h - 10;
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      D.rr(bx, by, w, h, 10, o.bg || "rgba(255,255,255,0.95)");
      ctx.beginPath(); ctx.moveTo(x - 6, by + h); ctx.lineTo(x + 6, by + h); ctx.lineTo(x, by + h + 8); ctx.fillStyle = o.bg || "rgba(255,255,255,0.95)"; ctx.fill();
      ctx.fillStyle = o.color || "#1b2030"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(str, bx + w / 2, by + h / 2 + 1, w - 14);
      ctx.restore();
    },
    bar(x, y, w, h, frac, fill, back) {
      D.rr(x, y, w, h, h / 2, back || "rgba(0,0,0,0.35)");
      D.rr(x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2, fill || "#f2c14e");
    },
  };

  // актори
  function actor(o) { return Object.assign({ x: 0, y: 0, vx: 0, vy: 0, size: 44, emoji: "🙂", flip: false, moving: false, phase: 0, speed: 180 }, o); }
  function moveActor(a, dt, bounds, speedMul) {
    const sp = a.speed * (speedMul == null ? 1 : speedMul);
    const dx = input.x * sp * dt, dy = input.y * sp * dt;
    a.moving = !!(input.x || input.y);
    if (a.moving) { a.phase += dt * 10; if (input.x) a.flip = input.x > 0; }
    let nx = a.x + dx, ny = a.y + dy;
    if (bounds) { nx = clamp(nx, bounds.x0, bounds.x1); ny = clamp(ny, bounds.y0, bounds.y1); }
    if (a.blocked && a.blocked(nx, a.y)) nx = a.x;
    if (a.blocked && a.blocked(a.x, ny)) ny = a.y;
    a.x = nx; a.y = ny;
    if (a.moving && Math.floor(a.phase / 3.14) !== a._lastStep) { a._lastStep = Math.floor(a.phase / 3.14); if (a.stepSound !== false) sfx("step"); }
  }
  function drawActor(a, o) {
    o = o || {};
    const bob = a.moving ? Math.abs(Math.sin(a.phase)) * 4 : Math.sin(api.t * 2 + (a.x % 7)) * 1.2;
    D.shadow(a.x, a.y + a.size * 0.42, a.size * 0.36);
    D.emoji(a.emoji, a.x, a.y - bob, a.size, { flip: o.flip != null ? o.flip : a.flip, alpha: a.alpha, rot: a.rot });
    if (a.label) D.text(a.label, a.x, a.y - a.size * 0.75 - bob, { size: 13, color: "#fff", stroke: "rgba(0,0,0,0.6)", strokeW: 4 });
  }

  // частинки
  const parts = [];
  function burst(x, y, what, n, o) {
    o = o || {};
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * Math.PI * 2, s = (o.speed || 120) * (0.4 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 40), life: o.life || 0.9, t: 0, what, size: o.size || 16, g: o.g == null ? 200 : o.g });
    }
  }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.t > p.life) parts.splice(i, 1);
    }
  }
  function drawParts() {
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      if (p.what.length <= 2 || /\p{Extended_Pictographic}/u.test(p.what)) D.emoji(p.what, p.x, p.y, p.size, { alpha: a });
      else D.circle(p.x, p.y, p.size / 4, p.what);
    }
  }

  let shakeT = 0, shakeA = 0;
  function shake(a, t) { shakeA = a || 6; shakeT = t || 0.3; }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------- гра
  let G = null, state = "intro", ended = false;
  const api = {
    W, H, ctx, input, D, t: 0, dt: 0,
    say, choose, banner, hud, sfx, shake, burst, actor, moveActor, drawActor, wait,
    clamp, dist, rand, pick, store,
    get busy() { return dlgState.open || screenState.open || api.locked; },
    locked: false,
    end, restart,
  };

  function endingKey() { return "pg:end:" + (G && G.id); }
  function found() { return store.get(endingKey(), []); }

  function intro() {
    state = "intro";
    const controls = (G.controls || []).map((c) => `<li>${c}</li>`).join("");
    showScreen(
      `<span class="eyebrow">Гра ${esc(META.num || G.id)} · за притчею «${esc(G.parable)}»</span>
       <h1>${esc(G.title)}</h1>
       <p class="story">${esc(G.story)}</p>
       ${G.goal ? `<p>${esc(G.goal)}</p>` : ""}
       ${controls ? `<ul>${controls}</ul>` : ""}
       <p class="muted">Фіналів у грі: ${Object.keys(G.endings).length}. Знайдено: ${found().length}.</p>
       <div class="row"><button class="btn" data-primary type="button">Почати гру</button></div>`,
      (el) => el.querySelector("[data-primary]").addEventListener("click", () => { ensureAudio(); hideScreen(); begin(); })
    );
  }
  function begin() {
    state = "play"; ended = false; api.locked = false; parts.length = 0; hud([]); bannerEl.hidden = true;
    api.t = 0; G.init(api);
    if (G.start) Promise.resolve(G.start(api)).catch(console.error);
  }
  function restart() { hideScreen(); closeDlgSilent(); begin(); }
  function closeDlgSilent() { dlgState.open = false; dlg.hidden = true; dlgState.resolve = null; }

  function end(letter) {
    if (ended) return; ended = true; state = "end";
    const e = G.endings[letter];
    const got = new Set(found()); got.add(letter); store.set(endingKey(), [...got]);
    const total = Object.keys(G.endings);
    sfx("end");
    const chips = total.map((k) => `<span class="${k === letter ? "now" : got.has(k) ? "got" : ""}">${k === letter || got.has(k) ? esc(k + ". " + G.endings[k].title) : esc(k + ". ???")}</span>`).join("");
    const qs = (G.questions || []).map((q) => `<li>${esc(q)}</li>`).join("");
    const next = META.next ? `<a class="btn ghost" href="${esc(META.next)}">Наступна гра →</a>` : "";
    setTimeout(() => showScreen(
      `<span class="eyebrow">Фінал ${esc(letter)} з ${total.length}</span>
       <h1><span class="letter">${esc(letter)}</span>${esc(e.title)}</h1>
       <p>${esc(e.text)}</p>
       <h2>Висновок</h2>
       <p class="moral">${esc(G.moral)}</p>
       ${qs ? `<ul>${qs}</ul>` : ""}
       <span class="eyebrow">Знайдені фінали: ${got.size} з ${total.length}</span>
       <div class="ends">${chips}</div>
       <div class="row"><button class="btn" data-primary type="button">Грати знову</button>${next}<a class="btn ghost" href="${esc(META.hub || "#")}">Усі ігри</a></div>`,
      (el) => el.querySelector("[data-primary]").addEventListener("click", restart)
    ), 500);
  }

  // ---------- цикл
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    pollInput();
    if (G) {
      if (state === "play" && !api.busy) { api.t += dt; api.dt = dt; G.update(dt, api); }
      updParts(dt);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (shakeT > 0) { shakeT -= dt; ctx.translate(rand(-shakeA, shakeA), rand(-shakeA, shakeA)); }
      ctx.clearRect(-20, -20, W + 40, H + 40);
      G.draw(ctx, api);
      drawParts();
    }
    requestAnimationFrame(frame);
  }

  window.PG = {
    start(game) {
      G = game; window.PG.game = game;
      if (game.dlgTop) dlg.classList.add("top");
      document.title = game.title;
      if (pad) {
        const a = pad.querySelector('[data-k="act"]'), b = pad.querySelector('[data-k="alt"]');
        a.textContent = game.actLabel || "Дія";
        if (game.altLabel) { b.textContent = game.altLabel; b.hidden = false; } else b.hidden = true;
        if (game.noMove) pad.querySelector(".stick").style.visibility = "hidden";
      }
      const help = $("#help");
      if (help && game.help) help.innerHTML = game.help;
      G.init(api);
      intro();
      requestAnimationFrame(frame);
    },
    api,
  };
})();
