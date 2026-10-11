// Інтерактивність сайту-щоденника: навігація між вправами, заповнення полів, збереження в браузері, друк.
(function () {
  var KEY = document.body.getAttribute('data-site');
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page.ex'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.side li a'));
  var select = document.querySelector('.mobile-nav select');
  var counter = document.querySelector('.pager .cnt');
  var savedEl = document.querySelector('.pager .saved');
  var cur = 0;

  function store(i) { return KEY + ':' + (i + 1); }
  function load(i) {
    try { return JSON.parse(localStorage.getItem(store(i)) || 'null'); } catch (e) { return null; }
  }
  function save(i, data) {
    try { localStorage.setItem(store(i), JSON.stringify(data)); } catch (e) { /* приватний режим */ }
  }

  // ---------- перетворення друкованих полів на інтерактивні ----------
  function makeFields(page) {
    var fields = [];
    page.querySelectorAll('.ruled').forEach(function (r) {
      var t = document.createElement('textarea');
      t.className = r.className + ' lined';
      t.setAttribute('style', r.getAttribute('style') || '');
      t.setAttribute('aria-label', 'Поле для запису');
      r.parentNode.replaceChild(t, r);
    });
    page.querySelectorAll('.tbl tbody td').forEach(function (td) {
      if (td.classList.contains('n') || td.classList.contains('glass') || td.classList.contains('barcell')) return;
      if (td.textContent.trim() === '') td.setAttribute('contenteditable', 'true');
    });
    page.querySelectorAll('.frame').forEach(function (f) { f.setAttribute('contenteditable', 'true'); });
    page.querySelectorAll('.numrow, .mq, .qd').forEach(function (el) {
      var s = document.createElement('div');
      s.className = 'fill';
      s.setAttribute('contenteditable', 'true');
      el.appendChild(s);
    });
    page.querySelectorAll('.bar').forEach(function (b) { b.appendChild(document.createElement('i')); });

    page.querySelectorAll('textarea.lined, [contenteditable], .tbl td.n, .tbl td.glass, .check li, .bar, svg.plot')
      .forEach(function (el) { fields.push(el); });
    return fields;
  }

  function svgPoint(svg, evt) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  }
  function drawPlot(svg, pts) {
    svg.querySelectorAll('.pt, .pl').forEach(function (n) { n.remove(); });
    var ns = 'http://www.w3.org/2000/svg';
    if (svg.classList.contains('connect') && pts.length > 1) {
      var pl = document.createElementNS(ns, 'polyline');
      pl.setAttribute('class', 'pl');
      pl.setAttribute('points', pts.map(function (p) { return p.join(','); }).join(' '));
      svg.appendChild(pl);
    }
    pts.forEach(function (p) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('class', 'pt'); c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 2.6);
      svg.appendChild(c);
    });
  }

  function getVal(el) {
    if (el.tagName === 'TEXTAREA') return el.value;
    if (el.hasAttribute('contenteditable')) return el.innerText.replace(/\n$/, '');
    if (el.classList.contains('bar')) return el.dataset.v || '';
    if (el.tagName.toLowerCase() === 'svg') return el._pts || [];
    return el.classList.contains('on') ? 1 : 0;
  }
  function setVal(el, v) {
    if (v === undefined || v === null) return;
    if (el.tagName === 'TEXTAREA') { el.value = v; return; }
    if (el.hasAttribute('contenteditable')) { el.innerText = v; return; }
    if (el.classList.contains('bar')) { el.dataset.v = v; el.querySelector('i').style.width = v ? v + '%' : '0'; return; }
    if (el.tagName.toLowerCase() === 'svg') { el._pts = v || []; drawPlot(el, el._pts); return; }
    el.classList.toggle('on', !!v);
  }
  function isFilled(v) {
    return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim() && v !== 0);
  }

  var timers = {};
  pages.forEach(function (page, i) {
    var fields = makeFields(page);
    page._fields = fields;
    var data = load(i);
    if (data && data.f) fields.forEach(function (el, k) { setVal(el, data.f[k]); });

    function persist() {
      clearTimeout(timers[i]);
      timers[i] = setTimeout(function () {
        var vals = fields.map(getVal);
        save(i, { f: vals, t: Date.now() });
        markDone(i, vals.some(isFilled));
        if (savedEl) { savedEl.classList.add('on'); setTimeout(function () { savedEl.classList.remove('on'); }, 1200); }
      }, 400);
    }

    fields.forEach(function (el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'textarea' || el.hasAttribute('contenteditable')) {
        el.addEventListener('input', persist);
      } else if (el.classList.contains('n')) {
        el.addEventListener('click', function () {
          var on = !el.classList.contains('on');
          el.parentNode.querySelectorAll('td.n').forEach(function (c) { c.classList.remove('on'); });
          el.classList.toggle('on', on);
          persist();
        });
      } else if (el.classList.contains('bar')) {
        el.addEventListener('click', function (e) {
          var r = el.getBoundingClientRect();
          var v = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 20) * 5));
          setVal(el, String(v));
          el.title = v + '%';
          persist();
        });
      } else if (tag === 'svg') {
        el._pts = el._pts || [];
        el.addEventListener('click', function (e) {
          el._pts.push(svgPoint(el, e)); drawPlot(el, el._pts); persist();
        });
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'plot-clear'; b.textContent = 'Стерти останню точку';
        b.addEventListener('click', function () { el._pts.pop(); drawPlot(el, el._pts); persist(); });
        el.parentNode.insertBefore(b, el.nextSibling);
      } else {
        el.addEventListener('click', function () { el.classList.toggle('on'); persist(); });
      }
    });
    // відповіді задач перевертаються по кліку
    page.querySelectorAll('.answer').forEach(function (a) {
      a.title = 'Натисніть, щоб перевернути відповідь';
      a.addEventListener('click', function () { a.classList.toggle('shown'); });
    });
    // ширші таблиці на телефоні прокручуються горизонтально
    page.querySelectorAll('.tbl').forEach(function (t) {
      var n = t.querySelectorAll('thead th').length;
      if (n > 4) t.style.minWidth = Math.min(n * 78, 900) + 'px';
    });
    if (data && data.f) markDone(i, data.f.some(isFilled));
  });

  function markDone(i, done) {
    if (links[i]) links[i].classList.toggle('done', !!done);
    var count = links.filter(function (a) { return a.classList.contains('done'); }).length;
    var p = document.querySelector('.side .prog b');
    if (p) p.textContent = count;
    var bar = document.querySelector('.side .pbar span');
    if (bar) bar.style.width = (count / pages.length * 100) + '%';
  }

  // ---------- навігація ----------
  function show(i, push) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    cur = i;
    pages.forEach(function (p, k) { p.classList.toggle('active', k === i); });
    links.forEach(function (a, k) { a.classList.toggle('cur', k === i); });
    if (select) select.value = String(i + 1);
    if (counter) counter.textContent = (i + 1) + ' / ' + pages.length;
    var ttl = pages[i].querySelector('h1');
    document.title = (ttl ? ttl.textContent + ' — ' : '') + document.body.getAttribute('data-title');
    if (push !== false && location.hash !== '#' + (i + 1)) history.replaceState(null, '', '#' + (i + 1));
    var a = links[i]; if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    window.scrollTo(0, 0);
  }
  function fromHash() {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    return isNaN(n) ? 0 : n - 1;
  }
  links.forEach(function (a, k) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(k); });
  });
  if (select) select.addEventListener('change', function () { show(parseInt(select.value, 10) - 1); });
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { show(cur + parseInt(b.getAttribute('data-go'), 10)); });
  });
  window.addEventListener('hashchange', function () { show(fromHash(), false); });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable || t.tagName === 'SELECT')) return;
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
  });

  // ---------- друк і очищення ----------
  document.querySelectorAll('[data-act]').forEach(function (b) {
    b.addEventListener('click', function () {
      var act = b.getAttribute('data-act');
      if (act === 'print') { document.body.classList.remove('print-all'); window.print(); }
      if (act === 'print-all') { document.body.classList.add('print-all'); window.print(); }
      if (act === 'clear') {
        if (!confirm('Стерти всі записи на цій вправі?')) return;
        try { localStorage.removeItem(store(cur)); } catch (e) { /* ігноруємо */ }
        pages[cur]._fields.forEach(function (el) {
          if (el.tagName === 'TEXTAREA') el.value = '';
          else if (el.hasAttribute('contenteditable')) el.innerText = '';
          else if (el.classList.contains('bar')) setVal(el, '');
          else if (el.tagName.toLowerCase() === 'svg') setVal(el, []);
          else el.classList.remove('on');
        });
        markDone(cur, false);
      }
    });
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-all'); });

  show(fromHash(), false);
})();
