"""Генерує веб-версію: хаб shchodennyky.html і 7 сайтів-щоденників у корені репозиторію.

Кожен сайт — самодостатній HTML-файл (стилі й скрипт усередині); кожна вправа відкривається
окремою сторінкою, поля можна заповнювати, записи зберігаються в браузері.
Запуск: python3 build_site.py
"""
import html
import pathlib

from build import CSS, SECTIONS, page_exercise

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
SITE_CSS = (HERE / 'site.css').read_text(encoding='utf-8')
SITE_JS = (HERE / 'site.js').read_text(encoding='utf-8')
FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">')

# ключ розділу → (файл сайту, емодзі, опис для хабу)
SITES = {
    '1-samoorganizatsiia': ('shchodennyk-samoorganizatsiia.html', '⏱️',
                            'Цілі, ідеальний тиждень, матриця Ейзенхауера, «потік», хронофаги, звички і 10 000 годин.'),
    '2-prodazhi': ('shchodennyk-prodazhi.html', '🤝',
                   'План продажів, колесо продавця, 20/80 і ABC-аналіз, 50 омріяних клієнтів, відмови і система продажів.'),
    '3-porozuminnia-z-soboiu': ('shchodennyk-porozuminnia.html', '🪞',
                                'Робота з минулим: мапа спогадів, історії дитинства, емоційні вузлики, листи Всесвіту, цикли повторень.'),
    '4-svidome-batkivstvo': ('shchodennyk-batky.html', '👨‍👩‍👧',
                             'Увага до дитини, структура спільного часу, моя поведінка, важливі розмови, девʼять «так» на одне «ні».'),
    '5-vzaiemyny': ('shchodennyk-vzaiemyny.html', '❤️',
                    'Емоційний банк, ритуали, претензії, моделі батьків, щотижневе обговорення, погладжування і самодостатність.'),
    '6-tvorche-myslennia': ('shchodennyk-tvorchist.html', '💡',
                            'Банк ідей, асоціації, ІКР і ТРИЗ, нестандартні рішення, каліграфія і 22 задачі на кмітливість.'),
    '7-sport-i-zdorovia': ('shchodennyk-sport.html', '💪',
                           'Колесо стану організму, журнал харчування й тренувань, вода, спліт, кругові й інтервальні тренування, сон.'),
}
HUB = 'shchodennyky.html'
PDF_ALL = 'vpravy/out/vpravy-shchodennyky-uspikhu.pdf'


def site_page(sec):
    fname, emoji, _ = SITES[sec['key']]
    exs = sec['exercises']
    total = len(exs)
    pages = ''.join(page_exercise(ex, i + 1, sec, total) for i, ex in enumerate(exs))
    links = ''.join(f'<li><a href="#{i + 1}"><span class="n">{i + 1}</span><span>{ex["title"]}</span><i class="dot"></i></a></li>'
                    for i, ex in enumerate(exs))
    opts = ''.join(f'<option value="{i + 1}">{i + 1}. {html.escape(ex["title"])}</option>' for i, ex in enumerate(exs))
    title = f'{sec["name"]} — вправи зі Щоденника успіху'
    return f'''<!doctype html>
<html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{total} вправ за матеріалами {html.escape(sec['source'])}. Кожна вправа — окрема сторінка, яку можна заповнити й надрукувати.">
{FONT}
<style>{CSS}
{SITE_CSS}</style></head>
<body class="site" data-site="spe-shchodennyk:{sec['key']}" data-title="{html.escape(title)}" style="--accent:{sec['color']};--tint:{sec['tint']}">
<header class="topbar">
  <a class="back" href="{HUB}">← Усі щоденники</a>
  <div class="ttl">{emoji} {sec['name']}</div>
  <button class="tb-btn" type="button" data-act="clear" title="Стерти записи на поточній вправі">Очистити</button>
  <button class="tb-btn hide-sm" type="button" data-act="print-all">Друкувати всі</button>
  <a class="tb-btn hide-sm" href="vpravy/out/{sec['key']}.pdf" download>PDF</a>
  <button class="tb-btn primary" type="button" data-act="print">Друкувати</button>
</header>
<div class="layout">
  <aside class="side">
    <h2>{total} вправ</h2>
    <div class="prog">Заповнено: <b>0</b> з {total}<div class="pbar"><span></span></div></div>
    <ol>{links}</ol>
  </aside>
  <div class="stage">
    <div class="mobile-nav"><select aria-label="Оберіть вправу">{opts}</select></div>
    {pages}
    <div class="pager">
      <button class="tb-btn" type="button" data-go="-1">‹ Попередня</button>
      <span><span class="cnt"></span> <span class="saved">✓ збережено</span></span>
      <button class="tb-btn primary" type="button" data-go="1">Наступна ›</button>
    </div>
    <p class="hint-web">Пишіть прямо на сторінці: записи зберігаються лише у вашому браузері.
    Кнопка «Друкувати» друкує поточну вправу на одному аркуші A4.</p>
  </div>
</div>
<script>{SITE_JS}</script>
</body></html>'''


def hub_page():
    total = sum(len(s['exercises']) for s in SECTIONS)
    cards = ''
    for s in SECTIONS:
        fname, emoji, desc = SITES[s['key']]
        n = len(s['exercises'])
        cards += f'''
    <a class="card" href="{fname}" style="--accent:{s['color']};--tint:{s['tint']}" data-key="spe-shchodennyk:{s['key']}" data-n="{n}">
      <div class="em">{emoji}</div>
      <div class="body">
        <h2>{s['name']}</h2>
        <p>{desc}</p>
        <div class="meta"><span>{n} вправ</span><span class="pr"></span></div>
        <div class="pbar"><span></span></div>
        <div class="src">{s['source']}</div>
      </div>
    </a>'''
    return f'''<!doctype html>
<html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Щоденники успіху — {total} вправ</title>
<meta name="description" content="{total} вправ зі Щоденників успіху Романа Кушніра: сім окремих сайтів, кожна вправа — окрема сторінка.">
{FONT}
<style>
:root {{ --ink:#1d1d1f; --muted:#6b6b70; --bg:#f3f3f5; }}
* {{ box-sizing: border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink); font-family:"Inter", system-ui, sans-serif; }}
.wrap {{ max-width: 1100px; margin: 0 auto; padding: 36px 18px 56px; }}
.top {{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom: 28px; font-size:14px; }}
.top a {{ color:#555; text-decoration:none; }}
.top a:hover {{ color:#2f5d8a; }}
.kicker {{ font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#2f5d8a; font-weight:700; }}
h1 {{ font-size: clamp(30px, 5vw, 46px); line-height:1.05; margin:10px 0 14px; letter-spacing:-.02em; }}
.lead {{ font-size:17px; line-height:1.55; color:#3a3a3d; max-width: 720px; margin:0 0 30px; }}
.grid {{ display:grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }}
.card {{ display:flex; gap:14px; background:#fff; border-radius:14px; padding:20px; text-decoration:none; color:inherit;
  border-top: 4px solid var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,.07); transition: transform .15s, box-shadow .15s; }}
.card:hover {{ transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.1); }}
.em {{ font-size: 30px; line-height: 1; flex:none; width:48px; height:48px; border-radius:12px; background:var(--tint);
  display:flex; align-items:center; justify-content:center; }}
.body {{ min-width:0; flex:1; }}
.card h2 {{ font-size: 19px; margin: 2px 0 6px; color: var(--accent); }}
.card p {{ margin: 0 0 12px; font-size: 14px; line-height:1.5; color:#444; }}
.meta {{ display:flex; justify-content:space-between; font-size:13px; font-weight:600; }}
.meta .pr {{ color: var(--muted); font-weight:500; }}
.pbar {{ height:5px; background:#eee; border-radius:3px; margin:7px 0 10px; overflow:hidden; }}
.pbar span {{ display:block; height:100%; width:0; background:var(--accent); }}
.src {{ font-size:12px; color:var(--muted); }}
.how {{ margin-top: 30px; background:#fff; border-radius:14px; padding:20px 22px; font-size:15px; line-height:1.6; }}
.how h3 {{ margin:0 0 6px; font-size:16px; }}
.how ol {{ margin:0; padding-left: 20px; }}
.how a {{ color:#2f5d8a; }}
</style></head>
<body>
<div class="wrap">
  <div class="top"><a href="index.html">← Головна</a><a href="{PDF_ALL}" download>⬇ Уся збірка в PDF</a></div>
  <div class="kicker">SPE школа розвитку · Роман Кушнір</div>
  <h1>Щоденники успіху</h1>
  <p class="lead">{total} вправ для роботи над собою, зібраних із щоденників SPE. Сім окремих сайтів — оберіть свій.
  Кожна вправа відкривається на окремій сторінці: її можна заповнити прямо тут або надрукувати на аркуші A4.</p>
  <div class="grid">{cards}
  </div>
  <div class="how">
    <h3>Як працювати</h3>
    <ol>
      <li>Оберіть щоденник, який зараз для вас найважливіший, і виконуйте по одній вправі на день.</li>
      <li>Пишіть прямо на сторінці: записи зберігаються лише у вашому браузері, на цьому пристрої.</li>
      <li>Хочете писати від руки — натисніть «Друкувати» або завантажте PDF.</li>
    </ol>
  </div>
</div>
<script>
document.querySelectorAll('.card').forEach(function (c) {{
  var key = c.getAttribute('data-key'), n = +c.getAttribute('data-n'), done = 0;
  for (var i = 1; i <= n; i++) {{
    try {{
      var d = JSON.parse(localStorage.getItem(key + ':' + i) || 'null');
      if (d && d.f && d.f.some(function (v) {{ return Array.isArray(v) ? v.length : (v && String(v).trim() && v !== 0); }})) done++;
    }} catch (e) {{}}
  }}
  c.querySelector('.pr').textContent = done ? 'заповнено ' + done + ' з ' + n : '';
  c.querySelector('.pbar span').style.width = (done / n * 100) + '%';
}});
</script>
</body></html>'''


def main():
    for s in SECTIONS:
        fname = SITES[s['key']][0]
        (ROOT / fname).write_text(site_page(s), encoding='utf-8')
        print('✓', fname, len(s['exercises']))
    (ROOT / HUB).write_text(hub_page(), encoding='utf-8')
    print('✓', HUB)


if __name__ == '__main__':
    main()
