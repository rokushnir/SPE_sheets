"""Генерує сторінки ігор із data.py.

Запуск із кореня репозиторію:
    python3 prytchi-igry/_src/build.py [--artifacts DIR] [--urls urls.json]

Результат:
    prytchi-igry/index.html, prytchi-igry/<slug>.html  — повні HTML-сторінки (GitHub Pages, htmlpreview)
    prytchi-igry/README.md, prytchi-igry/md/<slug>.md  — Markdown, що відкривається прямо на GitHub
    --artifacts DIR — фрагменти сторінок для публікації як окремі артефакти Claude
"""

import argparse
import json
import os
import sys
from html import escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "rokushnir/SPE_sheets"
BRANCH = "claude/wizardly-rubin-l3togl"
FOLDER = "prytchi-igry"
COLLECTION = "Притчі в русі"

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    "family=Unbounded:wght@500;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400"
    '&family=Commissioner:wght@400;500;600&display=swap">'
)

CSS = r"""
/* Макет: аркуш правил настільної гри — одна колонка ~46rem, герой на ігровому полі-сітці,
   картки лише там, де це окремі об’єкти гри (події, фінали). Колір кожної гри задає --h. */
:root {
  --h: 205;
  --bg: hsl(var(--h) 28% 96%);
  --surface: hsl(var(--h) 40% 99%);
  --ink: hsl(var(--h) 35% 12%);
  --muted: hsl(var(--h) 12% 36%);
  --line: hsl(var(--h) 20% 85%);
  --accent: hsl(var(--h) 60% 32%);
  --accent-soft: hsl(var(--h) 55% 91%);
  --on-accent: hsl(var(--h) 40% 98%);
  --warn: hsl(28 80% 34%);
  --warn-soft: hsl(36 85% 92%);
  --f-display: "Unbounded", "Arial Black", system-ui, sans-serif;
  --f-body: "Literata", Georgia, "Times New Roman", serif;
  --f-ui: "Commissioner", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: hsl(var(--h) 20% 9%);
    --surface: hsl(var(--h) 18% 13%);
    --ink: hsl(var(--h) 20% 92%);
    --muted: hsl(var(--h) 10% 68%);
    --line: hsl(var(--h) 14% 25%);
    --accent: hsl(var(--h) 70% 72%);
    --accent-soft: hsl(var(--h) 30% 19%);
    --on-accent: hsl(var(--h) 40% 10%);
    --warn: hsl(36 90% 66%);
    --warn-soft: hsl(30 30% 17%);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: hsl(var(--h) 20% 9%);
  --surface: hsl(var(--h) 18% 13%);
  --ink: hsl(var(--h) 20% 92%);
  --muted: hsl(var(--h) 10% 68%);
  --line: hsl(var(--h) 14% 25%);
  --accent: hsl(var(--h) 70% 72%);
  --accent-soft: hsl(var(--h) 30% 19%);
  --on-accent: hsl(var(--h) 40% 10%);
  --warn: hsl(36 90% 66%);
  --warn-soft: hsl(30 30% 17%);
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding-inline: 16px;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--f-body);
  font-size: 1.0625rem;
  line-height: 1.62;
}
a { color: var(--accent); text-underline-offset: 0.18em; }
a:focus-visible, .card:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
.wrap { max-width: 46rem; margin-inline: auto; padding-block: 1.25rem 4rem; display: grid; gap: 2.75rem; }
h1, h2, h3 { text-wrap: balance; margin: 0; }
p { margin: 0; }

.topbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
  font-family: var(--f-ui); font-size: 0.875rem; color: var(--muted); }
.topbar a { font-weight: 600; text-decoration: none; }
.topbar a:hover { text-decoration: underline; }

/* Герой — ігрове поле */
.board {
  position: relative; overflow: hidden;
  border: 1px solid var(--line); border-radius: 18px;
  background-color: var(--surface);
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 32px 32px;
  background-position: -1px -1px;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  display: grid; gap: 1rem;
}
.board::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, var(--surface) 35%, transparent 110%);
}
.board > * { position: relative; z-index: 1; }
.board .num {
  position: absolute; z-index: 1; right: clamp(0.75rem, 3vw, 1.75rem); top: clamp(0.25rem, 1.5vw, 0.75rem);
  font-family: var(--f-display); font-weight: 700; font-size: clamp(4rem, 16vw, 8.5rem); line-height: 1;
  color: transparent; -webkit-text-stroke: 2px var(--accent); opacity: 0.55;
  font-variant-numeric: tabular-nums;
}
.token { width: 18px; height: 18px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 0 5px var(--accent-soft); }
.eyebrow { font-family: var(--f-ui); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent); max-width: min(30rem, calc(100% - 9rem)); }
h1 { font-family: var(--f-display); font-weight: 700; font-size: clamp(2rem, 7vw, 3.25rem); line-height: 1.08;
  letter-spacing: -0.01em; max-width: 15ch; }
.format { font-family: var(--f-ui); font-size: 1.125rem; font-weight: 500; color: var(--muted); max-width: 32rem; }
.meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.25rem 0 0; padding: 0; }
.meta div { border: 1px solid var(--line); background: var(--surface); border-radius: 999px;
  padding: 0.3rem 0.85rem; font-family: var(--f-ui); font-size: 0.875rem; display: flex; gap: 0.4rem; }
.meta dt { color: var(--muted); }
.meta dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

.story { margin: 0; padding-left: 1.25rem; border-left: 3px solid var(--accent);
  font-style: italic; font-size: 1.125rem; max-width: 40rem; display: grid; gap: 0.5rem; }
.story cite { font-style: normal; font-family: var(--f-ui); font-size: 0.8125rem; color: var(--muted); }

/* Розділи */
section { display: grid; gap: 1rem; min-width: 0; align-content: start; }
h2 { font-family: var(--f-ui); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent); display: flex; align-items: center; gap: 0.75rem; }
h2::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 2.75rem 2rem; }

.roles { margin: 0; display: grid; gap: 0.75rem; }
.roles div { display: grid; gap: 0.1rem; }
.roles dt { font-family: var(--f-ui); font-weight: 600; }
.roles dd { margin: 0; color: var(--muted); }

.props { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6rem; }
.props li { display: grid; grid-template-columns: 0.6rem 1fr; gap: 0.75rem; align-items: baseline; }
.props li::before { content: ""; width: 0.55rem; height: 0.55rem; background: var(--accent); border-radius: 2px;
  transform: translateY(-0.1em) rotate(45deg); }

.steps { margin: 0; padding: 0; list-style: none; counter-reset: step; display: grid; gap: 1.1rem; }
.steps li { counter-increment: step; display: grid; grid-template-columns: 2.75rem 1fr; gap: 0.25rem 0.75rem; }
.steps li::before { content: counter(step); grid-row: span 2; font-family: var(--f-display); font-weight: 700;
  font-size: 1.05rem; width: 2.25rem; height: 2.25rem; border-radius: 50%; display: grid; place-items: center;
  border: 2px solid var(--accent); color: var(--accent); font-variant-numeric: tabular-nums; }
.steps strong { font-family: var(--f-ui); font-weight: 600; }

.events { display: grid; grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr)); gap: 0.75rem; }
.event { border: 1.5px dashed var(--line); border-radius: 12px; padding: 0.9rem 1rem; display: grid; gap: 0.3rem;
  align-content: start; background: var(--surface); min-width: 0; }
.event .tag { font-family: var(--f-ui); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--muted); }
.event h3 { font-family: var(--f-ui); font-size: 1rem; font-weight: 600; }
.event p { font-size: 0.975rem; }

.choice { background: var(--accent-soft); border-radius: 18px; padding: clamp(1.25rem, 4vw, 2rem);
  display: grid; grid-template-columns: auto 1fr; gap: 1rem 1.25rem; align-items: start; }
.choice svg { width: 3rem; height: 3rem; color: var(--accent); }
.choice .label { font-family: var(--f-ui); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--accent); }
.choice p { font-size: 1.15rem; font-weight: 600; font-family: var(--f-body); }
.choice > div { display: grid; gap: 0.4rem; min-width: 0; }

.endings { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.9rem; }
.ending { border: 1px solid var(--line); background: var(--surface); border-radius: 14px; padding: 1.1rem 1.15rem;
  display: grid; grid-template-columns: 2.4rem 1fr; gap: 0.35rem 0.85rem; align-content: start; min-width: 0; }
.ending .letter { grid-row: span 2; width: 2.4rem; height: 2.4rem; border-radius: 50%; background: var(--accent);
  color: var(--on-accent); display: grid; place-items: center; font-family: var(--f-display); font-weight: 700; }
.ending h3 { font-family: var(--f-ui); font-size: 1.0625rem; font-weight: 600; align-self: center; }
.ending p { grid-column: 2; font-size: 0.99rem; }

.moral { font-size: clamp(1.2rem, 3.2vw, 1.45rem); line-height: 1.45; font-style: italic; max-width: 38rem; }
.questions { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.45rem; }
.questions li::marker { color: var(--accent); }

.note { border-radius: 14px; padding: 1rem 1.15rem; display: grid; gap: 0.3rem; background: var(--accent-soft); }
.note.safety { background: var(--warn-soft); }
.note .label { font-family: var(--f-ui); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--accent); }
.note.safety .label { color: var(--warn); }

.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; border-top: 1px solid var(--line); padding-top: 1.25rem; }
.pager a { display: grid; gap: 0.15rem; text-decoration: none; padding: 0.75rem 0.9rem; border-radius: 12px;
  border: 1px solid var(--line); background: var(--surface); min-width: 0; }
.pager a:hover { border-color: var(--accent); }
.pager .dir { font-family: var(--f-ui); font-size: 0.75rem; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
.pager .name { font-family: var(--f-ui); font-weight: 600; color: var(--ink); }
.pager .next { text-align: right; grid-column: 2; }
.foot { font-family: var(--f-ui); font-size: 0.8125rem; color: var(--muted); }

/* Головна сторінка */
.home h1 { max-width: 12ch; font-size: clamp(2.4rem, 9vw, 4.25rem); }
.lede { font-size: 1.15rem; max-width: 38rem; }
.flow { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.75rem; counter-reset: f; }
.flow li { counter-increment: f; display: grid; align-content: start; gap: 0.2rem; padding-top: 0.75rem; border-top: 2px solid var(--accent); }
.flow li::before { content: counter(f, decimal-leading-zero); font-family: var(--f-display); font-size: 0.8rem; color: var(--accent); }
.flow strong { font-family: var(--f-ui); }
.flow span { font-size: 0.925rem; color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr)); gap: 0.85rem; }
.card { --c: hsl(var(--gh) 60% 32%); display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.9rem;
  text-decoration: none; color: var(--ink); background: var(--surface); border: 1px solid var(--line);
  border-radius: 14px; padding: 1rem 1.1rem; min-width: 0; transition: border-color .15s, transform .15s; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .card { --c: hsl(var(--gh) 70% 72%); } }
:root[data-theme="dark"] .card { --c: hsl(var(--gh) 70% 72%); }
.card:hover { border-color: var(--c); transform: translateY(-2px); }
.card .n { grid-row: span 3; font-family: var(--f-display); font-weight: 700; font-size: 1.6rem; line-height: 1;
  color: transparent; -webkit-text-stroke: 1.5px var(--c); font-variant-numeric: tabular-nums; padding-top: 0.15rem; }
.card h3 { font-family: var(--f-display); font-weight: 500; font-size: 1.05rem; line-height: 1.25; }
.card .p { font-size: 0.95rem; font-style: italic; color: var(--muted); }
.card .f { font-family: var(--f-ui); font-size: 0.8125rem; color: var(--c); font-weight: 600; }
.home .conclusion { display: grid; gap: 0.9rem; max-width: 40rem; }
.home .conclusion p:first-child { font-size: 1.15rem; }

@media (max-width: 30rem) {
  .choice { grid-template-columns: 1fr; }
  .pager { grid-template-columns: 1fr; }
  .pager .next { grid-column: 1; }
}
@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
@media print {
  body { background: #fff; color: #000; }
  .pager, .topbar { display: none; }
  .board::after { display: none; }
  .event, .ending, .choice, .note { break-inside: avoid; }
}
"""

FORK_SVG = (
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" '
    'stroke-linejoin="round" aria-hidden="true"><path d="M24 44V26"/><path d="M24 26 10 10"/><path d="M24 26 38 10"/>'
    '<path d="M10 18V10h8"/><path d="M38 18V10h-8"/><circle cx="24" cy="26" r="3" fill="currentColor"/></svg>'
)

SECTION_NAMES = dict(data.SECTIONS)


def e(s):
    return escape(s, quote=True)


def head(title, hue, description):
    return (
        f"<title>{e(title)}</title>\n"
        f'<meta name="description" content="{e(description)}">\n'
        f"{FONTS}\n<style>{CSS.replace('--h: 205;', f'--h: {hue};', 1)}</style>\n"
    )


def full_document(fragment):
    return (
        '<!doctype html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + fragment.split("<!--body-->")[0]
        + "</head>\n<body>\n"
        + fragment.split("<!--body-->")[1]
        + "</body>\n</html>\n"
    )


def game_fragment(i, g, links):
    n = len(data.GAMES)
    num = f"{i + 1:02d}"
    title = g["game"]
    desc = f"Рухлива гра за притчею «{g['parable']}»: {g['format'].lower()}."
    parts = [head(title, g["hue"], desc), "<!--body-->", '<div class="wrap">']

    parts.append(
        f'<nav class="topbar" aria-label="Навігація"><a href="{e(links["index"])}">← {e(COLLECTION)}: усі ігри</a>'
        f"<span>Гра {num} з {n}</span></nav>"
    )

    meta = "".join(
        f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>"
        for k, v in (("Учасники", g["players"]), ("Час", g["time"]), ("Вік", g["age"]))
    )
    parts.append(
        '<header class="board">'
        f'<span class="num" aria-hidden="true">{num}</span>'
        '<span class="token" aria-hidden="true"></span>'
        f'<p class="eyebrow">{e(SECTION_NAMES[g["section"]])} · притча «{e(g["parable"])}»</p>'
        f"<h1>{e(title)}</h1>"
        f'<p class="format">{e(g["format"])}</p>'
        f'<dl class="meta">{meta}</dl>'
        "</header>"
    )

    parts.append(
        f'<blockquote class="story"><p>{e(g["story"])}</p>'
        f'<cite>Переказ притчі «{e(g["parable"])}», книга с. {g["page"]}</cite></blockquote>'
    )

    roles = "".join(f"<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in g["roles"])
    props = "".join(f"<li><span>{e(x)}</span></li>" for x in g["space"])
    parts.append(
        '<div class="cols">'
        f'<section aria-labelledby="h-roles"><h2 id="h-roles">Персонажі</h2><dl class="roles">{roles}</dl></section>'
        f'<section aria-labelledby="h-space"><h2 id="h-space">Простір і реквізит</h2><ul class="props">{props}</ul></section>'
        "</div>"
    )

    steps = "".join(f"<li><strong>{e(a)}</strong><span>{e(b)}</span></li>" for a, b in g["steps"])
    parts.append(f'<section aria-labelledby="h-steps"><h2 id="h-steps">Хід гри</h2><ol class="steps">{steps}</ol></section>')

    events = "".join(
        f'<article class="event"><span class="tag">Подія</span><h3>{e(a)}</h3><p>{e(b)}</p></article>'
        for a, b in g["events"]
    )
    parts.append(
        f'<section aria-labelledby="h-events"><h2 id="h-events">Що відбувається під час руху</h2>'
        f'<div class="events">{events}</div></section>'
    )

    parts.append(
        f'<section class="choice" aria-label="Точка вибору">{FORK_SVG}'
        f'<div><span class="label">Точка вибору</span><p>{e(g["choice"])}</p></div></section>'
    )

    endings = "".join(
        f'<article class="ending"><span class="letter" aria-hidden="true">{e(l)}</span>'
        f"<h3>{e(t)}</h3><p>{e(x)}</p></article>"
        for l, t, x in g["endings"]
    )
    parts.append(
        f'<section aria-labelledby="h-end"><h2 id="h-end">Фінали</h2><div class="endings">{endings}</div></section>'
    )

    qs = "".join(f"<li>{e(q)}</li>" for q in g["questions"])
    parts.append(
        f'<section aria-labelledby="h-moral"><h2 id="h-moral">Загальний висновок</h2>'
        f'<p class="moral">{e(g["moral"])}</p>'
        f'<ul class="questions">{qs}</ul></section>'
    )

    notes = []
    if g.get("safety"):
        notes.append(f'<aside class="note safety"><span class="label">Безпека</span><p>{e(g["safety"])}</p></aside>')
    if g.get("tip"):
        notes.append(f'<aside class="note"><span class="label">Порада ведучому</span><p>{e(g["tip"])}</p></aside>')
    notes.append(
        '<aside class="note"><span class="label">Розбір після гри</span><p>'
        + e(" ".join(f"{k + 1}) {s}" for k, s in enumerate(data.DEBRIEF)))
        + "</p></aside>"
    )
    parts.append('<div style="display:grid;gap:0.75rem">' + "".join(notes) + "</div>")

    pager = ['<nav class="pager" aria-label="Інші ігри">']
    if i > 0:
        p = data.GAMES[i - 1]
        pager.append(
            f'<a href="{e(links[p["slug"]])}"><span class="dir">← Попередня</span>'
            f'<span class="name">{e(p["game"])}</span></a>'
        )
    if i < n - 1:
        nx = data.GAMES[i + 1]
        pager.append(
            f'<a class="next" href="{e(links[nx["slug"]])}"><span class="dir">Наступна →</span>'
            f'<span class="name">{e(nx["game"])}</span></a>'
        )
    pager.append("</nav>")
    parts.append("".join(pager))
    parts.append(f'<p class="foot">За книгою: {e(data.BOOK)}.</p>')
    parts.append("</div>")
    return "\n".join(parts)


def index_fragment(links, github_url=None):
    desc = "Цикл із 15 рухливих ігор за притчами: ролі, події під час руху, точки вибору і кілька фіналів у кожній."
    parts = [head(COLLECTION, 205, desc), "<!--body-->", '<div class="wrap home">']
    parts.append(
        '<header class="board">'
        '<span class="num" aria-hidden="true">15</span>'
        '<span class="token" aria-hidden="true"></span>'
        f'<p class="eyebrow">Ігри для тренінгів і курсів</p>'
        f"<h1>{e(COLLECTION)}</h1>"
        f'<p class="lede">{e(data.INTRO)}</p>'
        '<dl class="meta"><div><dt>Ігор</dt><dd>15</dd></div><div><dt>Розділів книги</dt>'
        f'<dd>{len(data.SECTIONS)}</dd></div><div><dt>Фіналів у кожній</dt><dd>3–4</dd></div></dl>'
        "</header>"
    )
    flow = "".join(f"<li><strong>{e(a)}</strong><span>{e(b)}</span></li>" for a, b in data.STRUCTURE)
    parts.append(f'<section aria-labelledby="h-flow"><h2 id="h-flow">Як побудована кожна гра</h2><ol class="flow">{flow}</ol></section>')

    for key, name in data.SECTIONS:
        games = [(i, g) for i, g in enumerate(data.GAMES) if g["section"] == key]
        if not games:
            continue
        cards = "".join(
            f'<a class="card" style="--gh:{g["hue"]}" href="{e(links[g["slug"]])}">'
            f'<span class="n">{i + 1:02d}</span><h3>{e(g["game"])}</h3>'
            f'<span class="p">притча «{e(g["parable"])}»</span>'
            f'<span class="f">{e(g["format"])}</span></a>'
            for i, g in games
        )
        parts.append(f'<section aria-labelledby="h-{key}"><h2 id="h-{key}">{e(name)}</h2><div class="cards">{cards}</div></section>')

    deb = "".join(f"<li>{e(s)}</li>" for s in data.DEBRIEF)
    parts.append(f'<section aria-labelledby="h-deb"><h2 id="h-deb">Розбір після будь-якої гри</h2><ol class="steps">{deb}</ol></section>')
    concl = "".join(f"<p>{e(p)}</p>" for p in data.CONCLUSION)
    parts.append(
        f'<section aria-labelledby="h-concl"><h2 id="h-concl">Загальний висновок циклу</h2>'
        f'<div class="conclusion">{concl}</div></section>'
    )
    foot = f"За книгою: {e(data.BOOK)}."
    if github_url:
        foot += f' Усі сторінки також на <a href="{e(github_url)}">GitHub</a>.'
    parts.append(f'<p class="foot">{foot}</p>')
    parts.append("</div>")
    return "\n".join(parts)


# ----------------------------------------------------------------- Markdown

def preview_url(path):
    return f"https://htmlpreview.github.io/?https://github.com/{REPO}/blob/{BRANCH}/{FOLDER}/{path}"


def game_md(i, g):
    num = f"{i + 1:02d}"
    out = [
        f"[← Усі ігри](../README.md) · [Відкрити як сторінку]({preview_url(g['slug'] + '.html')})",
        "",
        f"# {num}. {g['game']}",
        "",
        f"**Притча:** «{g['parable']}» (розділ «{SECTION_NAMES[g['section']]}», с. {g['page']})  ",
        f"**Формат:** {g['format']}  ",
        f"**Учасники:** {g['players']} · **Час:** {g['time']} · **Вік:** {g['age']}",
        "",
        f"> {g['story']}",
        "",
        "## Персонажі",
        "",
    ]
    out += [f"- **{a}.** {b}" for a, b in g["roles"]]
    out += ["", "## Простір і реквізит", ""] + [f"- {x}" for x in g["space"]]
    out += ["", "## Хід гри", ""] + [f"{k + 1}. **{a}.** {b}" for k, (a, b) in enumerate(g["steps"])]
    out += ["", "## Що відбувається під час руху", ""] + [f"- **{a}.** {b}" for a, b in g["events"]]
    out += ["", "## Точка вибору", "", f"**{g['choice']}**", "", "## Фінали", ""]
    out += [f"- **{l}. {t}.** {x}" for l, t, x in g["endings"]]
    out += ["", "## Загальний висновок", "", f"*{g['moral']}*", "", "**Питання для обговорення:**", ""]
    out += [f"- {q}" for q in g["questions"]]
    if g.get("safety"):
        out += ["", f"> **Безпека.** {g['safety']}"]
    if g.get("tip"):
        out += ["", f"> **Порада ведучому.** {g['tip']}"]
    nav = []
    if i > 0:
        p = data.GAMES[i - 1]
        nav.append(f"[← {p['game']}]({p['slug']}.md)")
    if i < len(data.GAMES) - 1:
        nx = data.GAMES[i + 1]
        nav.append(f"[{nx['game']} →]({nx['slug']}.md)")
    out += ["", "---", "", " · ".join(nav), ""]
    return "\n".join(out)


def readme_md(artifact_urls):
    out = [
        f"# {COLLECTION}",
        "",
        data.INTRO,
        "",
        f"**Відкрити як сайт:** [головна сторінка]({preview_url('index.html')})",
        "",
        "| № | Гра | Притча | Формат | Сторінка | Markdown |",
        "|---|---|---|---|---|---|",
    ]
    for i, g in enumerate(data.GAMES):
        out.append(
            f"| {i + 1:02d} | **{g['game']}** | «{g['parable']}» | {g['format']} | "
            f"[відкрити]({preview_url(g['slug'] + '.html')}) | [читати](md/{g['slug']}.md) |"
        )
    out += ["", "## Як побудована кожна гра", ""]
    out += [f"{k + 1}. **{a}.** {b}" for k, (a, b) in enumerate(data.STRUCTURE)]
    out += ["", "## Розбір після будь-якої гри", ""]
    out += [f"{k + 1}. {s}" for k, s in enumerate(data.DEBRIEF)]
    out += ["", "## Загальний висновок циклу", ""]
    for p in data.CONCLUSION:
        out += [p, ""]
    out += [
        "## Як оновити сторінки",
        "",
        "Увесь текст лежить у `_src/data.py`. Після змін запустіть із кореня репозиторію:",
        "",
        "```",
        "python3 prytchi-igry/_src/build.py",
        "```",
        "",
        f"Джерело: {data.BOOK}.",
        "",
    ]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", help="тека для фрагментів-артефактів")
    ap.add_argument("--urls", help="JSON {slug|index: url} для посилань між артефактами")
    args = ap.parse_args()

    # Повні сторінки для GitHub
    rel = {"index": "index.html"}
    rel.update({g["slug"]: f"{g['slug']}.html" for g in data.GAMES})
    os.makedirs(os.path.join(ROOT, "md"), exist_ok=True)
    for i, g in enumerate(data.GAMES):
        with open(os.path.join(ROOT, f"{g['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(full_document(game_fragment(i, g, rel)))
        with open(os.path.join(ROOT, "md", f"{g['slug']}.md"), "w", encoding="utf-8") as f:
            f.write(game_md(i, g))
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(full_document(index_fragment(rel)))
    with open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_md({}))

    # Фрагменти для артефактів
    if args.artifacts:
        urls = {}
        if args.urls and os.path.exists(args.urls):
            with open(args.urls, encoding="utf-8") as f:
                urls = json.load(f)
        links = {k: urls.get(k, "#") for k in rel}
        os.makedirs(args.artifacts, exist_ok=True)
        gh = f"https://github.com/{REPO}/tree/{BRANCH}/{FOLDER}"
        for i, g in enumerate(data.GAMES):
            with open(os.path.join(args.artifacts, f"{g['slug']}.html"), "w", encoding="utf-8") as f:
                f.write(game_fragment(i, g, links).replace("<!--body-->", ""))
        with open(os.path.join(args.artifacts, "index.html"), "w", encoding="utf-8") as f:
            f.write(index_fragment(links, gh).replace("<!--body-->", ""))
    print("ok")


if __name__ == "__main__":
    main()
