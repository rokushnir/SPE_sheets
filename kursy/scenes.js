// Анімовані сцени для обкладинок курсів (поки немає фото). SCENES[назва](id) повертає SVG.
// Кольори — від CSS-змінної --sc (колір курсу), тож сцена пасує до будь-якого курсу.
const SCENES = {
  // Годинник, що показує справжній час (стрілки крутить startScenes).
  clock() {
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      ticks += `<line x1="200" y1="${big ? 72 : 76}" x2="200" y2="${big ? 92 : 84}" stroke="#fff" stroke-opacity="${big ? .95 : .45}" stroke-width="${big ? 5 : 2}" stroke-linecap="round" transform="rotate(${i * 6} 200 200)"/>`;
    }
    const nums = [[12, 200, 122], [3, 282, 212], [6, 200, 296], [9, 118, 212]].map(([n, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Unbounded, sans-serif" font-size="26" font-weight="700" fill="#fff">${n}</text>`).join('');
    return `<svg class="scene sc-clock" viewBox="0 0 400 400" aria-hidden="true">
      <circle class="sc-ring" cx="200" cy="200" r="190" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
      <circle class="sc-ring d2" cx="200" cy="200" r="170" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>
      <circle cx="200" cy="200" r="140" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-opacity=".9" stroke-width="6"/>
      <path class="sc-arc" d="M200 60 A140 140 0 0 1 340 200" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-opacity=".55"/>
      ${ticks}${nums}
      <line class="h-hour" x1="200" y1="200" x2="200" y2="140" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
      <line class="h-min" x1="200" y1="200" x2="200" y2="102" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <line class="h-sec" x1="200" y1="222" x2="200" y2="90" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>
      <circle cx="200" cy="200" r="10" fill="#ffd166"/>
    </svg>`;
  },
  // Складні відсотки: стовпчики ростуть, крива малюється, монети падають.
  money() {
    const vals = [18, 22, 28, 36, 47, 62, 82, 110];
    const bars = vals.map((v, i) => `<rect class="sc-bar" style="animation-delay:${i * .18}s" x="${58 + i * 38}" y="${330 - v * 2.2}" width="26" height="${v * 2.2}" rx="6" fill="#fff" fill-opacity="${.35 + i * .07}"/>`).join('');
    const pts = vals.map((v, i) => `${71 + i * 38},${318 - v * 2.2}`).join(' ');
    const coins = [0, 1, 2, 3].map((i) => `<g class="sc-coin" style="animation-delay:${1.2 + i * .35}s"><ellipse cx="330" cy="${118 - i * 14}" rx="32" ry="10" fill="#ffd166" stroke="#c99a1b" stroke-width="2"/></g>`).join('');
    return `<svg class="scene" viewBox="0 0 400 400" aria-hidden="true">
      <line x1="48" y1="332" x2="372" y2="332" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
      ${bars}
      <polyline class="sc-draw" points="${pts}" fill="none" stroke="#ffd166" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="sc-pop" cx="337" cy="76" r="9" fill="#ffd166"/>
      ${coins}
      <text x="56" y="72" font-family="Unbounded, sans-serif" font-size="42" font-weight="700" fill="#fff">+%</text>
      <text x="58" y="100" font-family="Inter, sans-serif" font-size="16" fill="#fff" fill-opacity=".8">відсотки на відсотки</text>
    </svg>`;
  },
  // Сцена з мікрофоном: промінь прожектора, звукові хвилі, еквалайзер.
  stage() {
    const eq = Array.from({ length: 11 }, (_, i) => `<rect class="sc-eq" style="animation-delay:${(i % 5) * .13}s" x="${84 + i * 22}" y="300" width="12" height="60" rx="6" fill="#fff" fill-opacity=".75"/>`).join('');
    return `<svg class="scene" viewBox="0 0 400 400" aria-hidden="true">
      <path d="M200 0 L90 400 L310 400 Z" fill="#fff" fill-opacity=".1"/>
      <circle class="sc-wave" cx="200" cy="140" r="70" fill="none" stroke="#fff" stroke-width="3"/>
      <circle class="sc-wave d2" cx="200" cy="140" r="70" fill="none" stroke="#fff" stroke-width="3"/>
      <circle class="sc-wave d3" cx="200" cy="140" r="70" fill="none" stroke="#fff" stroke-width="3"/>
      <rect x="168" y="70" width="64" height="120" rx="32" fill="#fff"/>
      <g stroke="#000" stroke-opacity=".15" stroke-width="3">${[90, 105, 120, 135, 150, 165].map((y) => `<line x1="172" x2="228" y1="${y}" y2="${y}"/>`).join('')}</g>
      <path d="M150 160 Q150 225 200 225 Q250 225 250 160" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <line x1="200" y1="225" x2="200" y2="262" stroke="#fff" stroke-width="8"/>
      <line x1="166" y1="266" x2="234" y2="266" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      ${eq}
    </svg>`;
  },
  // Бізнес як система: вузли, звʼязки й імпульси, що біжать між ними.
  system(id) {
    const n = 8, R = 130, cx = 200, cy = 200;
    const pts = Array.from({ length: n }, (_, i) => [cx + R * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2), cy + R * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2)]);
    let links = '', pulses = '', nodes = '';
    pts.forEach(([x, y], i) => {
      const [x2, y2] = pts[(i + 1) % n];
      links += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
      pulses += `<circle r="5" fill="#ffd166"><animateMotion dur="${2.4 + (i % 3) * .5}s" begin="${i * .3}s" repeatCount="indefinite" path="M${cx},${cy} L${x},${y}"/></circle>`;
      nodes += `<circle class="sc-node" style="animation-delay:${i * .2}s" cx="${x}" cy="${y}" r="${i % 2 ? 16 : 22}" fill="#fff"/>`;
    });
    return `<svg class="scene" viewBox="0 0 400 400" aria-hidden="true" data-id="${id || ''}">
      <circle cx="200" cy="200" r="${R}" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="40"/>
      ${links}${pulses}${nodes}
      <circle cx="200" cy="200" r="38" fill="#ffd166"/><circle class="sc-ring" cx="200" cy="200" r="52" fill="none" stroke="#ffd166" stroke-width="3"/>
    </svg>`;
  },
  // Команда: люди за столом, над ними — звʼязки, що зʼявляються.
  team() {
    const people = [[90, 250, 1], [150, 222, .9], [200, 212, 1], [250, 222, .9], [310, 250, 1]];
    const body = people.map(([x, y, s], i) => `<g class="sc-person" style="animation-delay:${i * .25}s"><circle cx="${x}" cy="${y - 56 * s}" r="${24 * s}" fill="#fff"/><path d="M${x - 40 * s} ${y + 40} Q${x - 40 * s} ${y - 22 * s} ${x} ${y - 22 * s} Q${x + 40 * s} ${y - 22 * s} ${x + 40 * s} ${y + 40} Z" fill="#fff" fill-opacity="${i === 2 ? 1 : .8}"/></g>`).join('');
    const arcs = [[90, 150], [150, 200], [200, 250], [250, 310], [90, 310]].map(([a, b], i) => `<path class="sc-draw" style="animation-delay:${1.4 + i * .3}s" d="M${a} 150 Q${(a + b) / 2} ${i === 4 ? 40 : 100} ${b} 150" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>`).join('');
    return `<svg class="scene" viewBox="0 0 400 400" aria-hidden="true">
      ${arcs}${body}
      <rect x="40" y="288" width="320" height="22" rx="11" fill="#fff" fill-opacity=".9"/>
      <rect x="70" y="310" width="14" height="60" fill="#fff" fill-opacity=".6"/><rect x="316" y="310" width="14" height="60" fill="#fff" fill-opacity=".6"/>
    </svg>`;
  },
};
const SCENE_CSS = `
  .scene { width: 100%; height: 100%; display: block; overflow: visible; }
  .sc-ring { animation: scPulse 3s ease-in-out infinite; transform-origin: 200px 200px; }
  .sc-ring.d2 { animation-delay: 1.5s; }
  .sc-arc { animation: scSpin 12s linear infinite; transform-origin: 200px 200px; }
  .sc-bar { transform-box: fill-box; transform-origin: bottom; animation: scGrow 4.8s ease-in-out infinite; }
  .sc-draw { stroke-dasharray: 900; stroke-dashoffset: 900; animation: scDraw 4.8s ease-in-out infinite; }
  .sc-pop { animation: scPop 4.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .sc-coin { animation: scDrop 4.8s ease-in infinite; }
  .sc-wave { animation: scWave 2.4s ease-out infinite; transform-origin: 200px 140px; }
  .sc-wave.d2 { animation-delay: .8s; } .sc-wave.d3 { animation-delay: 1.6s; }
  .sc-eq { transform-box: fill-box; transform-origin: bottom; animation: scEq .9s ease-in-out infinite alternate; }
  .sc-node { transform-box: fill-box; transform-origin: center; animation: scNode 2.4s ease-in-out infinite; }
  .sc-person { animation: scRise 4.8s ease-out infinite; }
  @keyframes scPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.04); opacity: .4; } }
  @keyframes scSpin { to { transform: rotate(360deg); } }
  @keyframes scGrow { 0% { transform: scaleY(0); } 30%, 85% { transform: scaleY(1); } 100% { transform: scaleY(0); } }
  @keyframes scDraw { 0%, 20% { stroke-dashoffset: 900; } 55%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 900; } }
  @keyframes scPop { 0%, 45% { transform: scale(0); } 55%, 85% { transform: scale(1); } 100% { transform: scale(0); } }
  @keyframes scDrop { 0%, 20% { transform: translateY(-160px); opacity: 0; } 35%, 85% { transform: none; opacity: 1; } 100% { opacity: 0; } }
  @keyframes scWave { from { transform: scale(1); opacity: .8; } to { transform: scale(2.4); opacity: 0; } }
  @keyframes scEq { from { transform: scaleY(.2); } to { transform: scaleY(1); } }
  @keyframes scNode { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }
  @keyframes scRise { 0% { transform: translateY(30px); opacity: 0; } 15%, 90% { transform: none; opacity: 1; } 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .scene * { animation: none !important; } .sc-draw { stroke-dashoffset: 0; } }
`;
// Крутить стрілки всіх годинників на сторінці за справжнім часом.
function startScenes() {
  const set = () => document.querySelectorAll('.sc-clock').forEach((svg) => {
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    svg.querySelector('.h-sec').setAttribute('transform', `rotate(${s * 6} 200 200)`);
    svg.querySelector('.h-min').setAttribute('transform', `rotate(${m * 6} 200 200)`);
    svg.querySelector('.h-hour').setAttribute('transform', `rotate(${h * 30} 200 200)`);
  });
  set(); setInterval(set, 1000);
}
// Поява елементів під час прокрутки: .rv отримує .in, коли видно на екрані; data-count рахує від 0.
function startReveal() {
  const count = (el) => {
    const raw = el.dataset.count, to = parseFloat(raw), suffix = raw.replace(/^[\d.]+/, ''), t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1200), e = 1 - (1 - k) ** 3; el.textContent = Math.round(to * e) + suffix; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const show = (el) => { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(count); if (el.dataset.count) count(el); };
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { document.querySelectorAll('.rv').forEach(show); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
}
const REVEAL_CSS = `
  .js .rv { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s cubic-bezier(.2, .7, .2, 1); transition-delay: var(--d, 0s); }
  .js .rv.in { opacity: 1; transform: none; }
  .js .rv.zoom { transform: scale(.92); } .js .rv.zoom.in { transform: none; }
  .js .rv.left { transform: translateX(-36px); } .js .rv.left.in { transform: none; }
  .words span { display: inline-block; opacity: 0; transform: translateY(.5em); animation: wIn .6s cubic-bezier(.2, .7, .2, 1) forwards; }
  @keyframes wIn { to { opacity: 1; transform: none; } }
  .float { animation: floaty 6s ease-in-out infinite; }
  @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @media (prefers-reduced-motion: reduce) { .js .rv { opacity: 1; transform: none; transition: none; } .words span { animation: none; opacity: 1; transform: none; } .float { animation: none; } }
`;
const words = (text, delay = 0) => text.split(' ').map((w, i) => `<span style="animation-delay:${(delay + i * 0.06).toFixed(2)}s">${w.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</span>`).join(' ');
