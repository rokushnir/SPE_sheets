"""Збирає HTML-збірку вправ (одна вправа — одна сторінка A4).

Запуск:  python3 build.py   → out/vpravy.html та out/<розділ>.html
Далі:    node render.mjs     → PDF-файли
"""
import importlib
import json
import pathlib
import sys

MODULES = ['content_1_samoorg', 'content_2_prodazhi', 'content_3_porozuminnia', 'content_4_batky',
           'content_5_vzaiemyny', 'content_6_tvorchist', 'content_7_sport']
# Для чернеткової перевірки можна передати лише потрібні модулі: python3 build.py content_1_samoorg
SECTIONS = [importlib.import_module(m).SECTION for m in (sys.argv[1:] or MODULES)]
OUT = pathlib.Path(__file__).parent / 'out'

CSS = (pathlib.Path(__file__).parent / 'style.css').read_text(encoding='utf-8')


def page_exercise(ex, num, sec, total):
    steps = ''
    if ex.get('steps'):
        lis = ''.join(f'<li>{s}</li>' for s in ex['steps'])
        steps = f'<ol class="steps">{lis}</ol>'
    intro = f'<div class="intro">{ex["intro"]}</div>' if ex.get('intro') else ''
    goal = f'<div class="goal"><b>Мета.</b> {ex["goal"]}</div>' if ex.get('goal') else ''
    work = ''.join(ex.get('blocks', []))
    tail = ''.join(ex.get('tail', []))
    return f'''
<section class="page ex" id="ex{num}" style="--accent:{sec['color']};--tint:{sec['tint']}">
  <header class="head"><span class="sec"><i></i>{sec['name']}</span><span class="num">Вправа {num}</span></header>
  <h1>{ex['title']}</h1>
  {goal}{intro}{steps}
  <div class="work">{work}</div>
  {tail}
  <footer class="foot"><span>Джерело: {sec["source"]} · Роман Кушнір, SPE школа розвитку</span><span>{num} / {total}</span></footer>
</section>'''


def page_cover(sections, total):
    items = ''.join(
        f'<li style="--accent:{s["color"]}"><i></i><b>{s["name"]}</b><span>{len(s["exercises"])} вправ</span>'
        f'<em>{s["source"]}</em></li>' for s in sections)
    return f'''
<section class="page cover">
  <div class="cover-top">
    <div class="kicker">SPE школа розвитку · Щоденники успіху</div>
    <h1 class="ctitle">Вправи<br>для роботи над собою</h1>
    <p class="csub">{total} вправ, зібраних із щоденників Романа Кушніра. Кожна вправа — на окремій сторінці:
    мета, коротка інструкція і місце для записів. Друкуйте потрібні сторінки й виконуйте у своєму темпі.</p>
  </div>
  <ul class="secs">{items}</ul>
  <div class="howto">
    <b>Як працювати зі збіркою</b>
    <ol>
      <li>Оберіть розділ, який зараз для вас найважливіший, і виконуйте по одній вправі на день.</li>
      <li>Пишіть від руки: мозок інакше ставиться до написаного, ніж до просто обдуманого.</li>
      <li>Повертайтеся до виконаних сторінок через місяць — порівняння показує справжній прогрес.</li>
    </ol>
  </div>
</section>'''


def page_contents(sections, start_nums):
    """Зміст на двох сторінках: розділи 1–5 і 6–7."""
    def sec_html(s, start):
        lis = ''.join(f'<li><span>{start + i}</span>{ex["title"]}</li>' for i, ex in enumerate(s['exercises']))
        return f'<div class="tocsec" style="--accent:{s["color"]}"><h3><i></i>{s["name"]}</h3><ol>{lis}</ol></div>'
    pairs = list(zip(sections, start_nums))
    groups = [pairs[:5], pairs[5:]] if len(pairs) > 5 else [pairs]
    pages = []
    for k, g in enumerate(groups):
        title = 'Зміст' if k == 0 else 'Зміст (продовження)'
        pages.append(f'<section class="page toc"><h2>{title}</h2>'
                     f'<div class="toccols">{"".join(sec_html(s, st) for s, st in g)}</div></section>')
    return ''.join(pages)


def document(title, body):
    return f'''<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><title>{title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{CSS}</style></head><body>{body}</body></html>'''


def main():
    OUT.mkdir(exist_ok=True)
    total = sum(len(s['exercises']) for s in SECTIONS)
    starts, n = [], 1
    for s in SECTIONS:
        starts.append(n)
        n += len(s['exercises'])

    pages_by_sec = []
    for s, start in zip(SECTIONS, starts):
        pages_by_sec.append([page_exercise(ex, start + i, s, total) for i, ex in enumerate(s['exercises'])])

    body = page_cover(SECTIONS, total) + page_contents(SECTIONS, starts) + ''.join(''.join(p) for p in pages_by_sec)
    (OUT / 'vpravy.html').write_text(document('Вправи зі Щоденників успіху', body), encoding='utf-8')

    manifest = [{'file': 'vpravy.html', 'pdf': 'vpravy-shchodennyky-uspikhu.pdf'}]
    for s, pages in zip(SECTIONS, pages_by_sec):
        fn = f'{s["key"]}.html'
        (OUT / fn).write_text(document(s['name'], ''.join(pages)), encoding='utf-8')
        manifest.append({'file': fn, 'pdf': f'{s["key"]}.pdf'})
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Вправ: {total}')
    for s in SECTIONS:
        print(f'  {s["name"]}: {len(s["exercises"])}')


if __name__ == '__main__':
    main()
