"""Збирає браузерні ігри «Притчі в русі» в самодостатні HTML-файли.

Запуск із кореня репозиторію:
    python3 prytchi-ihry/_src/build.py [--artifacts DIR] [--urls urls.json]

Результат (у корені репозиторію, для GitHub Pages):
    prytchi-ihry.html             — головна сторінка з усіма іграми
    prytchi-ihra-NN-<slug>.html    — окрема гра
Кожен файл містить усе потрібне всередині: стилі, рушій (engine.js) і код гри (games/NN-<slug>.js).
З --artifacts ті самі сторінки пишуться як фрагменти для публікації артефактами Claude.
"""

import argparse
import json
import os
from html import escape

SRC = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(SRC))
PAGES = "https://rokushnir.github.io/SPE_sheets"
HUB = "prytchi-ihry.html"
COLLECTION = "Притчі в русі"

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    "family=Unbounded:wght@500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400"
    '&family=Commissioner:wght@400;500;600;700&display=swap">'
)

# slug, назва гри, притча, жанр, емодзі для плитки, колір плитки
GAMES = [
    ("01-hilka", "Гілка над проваллям", "Атеїст", "Пригода в темряві", "🌑", "#24324f"),
    ("02-podvirya", "Подвір’я", "Орел, який став куркою", "Симулятор виживання на прив’язі", "🦅", "#6b4a23"),
    ("03-pereprava", "Переправа", "Жінка і ченці", "Платформер із вантажем", "🎒", "#1f5a55"),
    ("04-dva-svity", "Два світи", "Рай і пекло", "Головоломка «Знайди відмінності»", "🪞", "#4b2f6e"),
    ("05-vakansiya", "Вакансія Лисиці", "Лісова демократія", "Аркада «Музичні стільці»", "🦊", "#7a3216"),
    ("06-ne-tsvirinkay", "Не цвірінькай!", "Історія одного горобчика", "Стелс", "🐦", "#3d5a1e"),
    ("07-dveri-sultana", "Двері султана", "Важкі двері", "Квест-кімната", "🚪", "#6a4c12"),
    ("08-bahdad", "Перехрестя на Багдад", "Запитання", "Словесна головоломка з подорожжю", "🧭", "#1c4f66"),
    ("09-ozero", "Шлях до озера", "Про лицаря і дракона", "Настільна гра з кубиком", "🐉", "#6b1f2e"),
    ("10-melodiya", "Вічна мелодія", "Притча про скрипаля", "Ритм-гра", "🎻", "#35307a"),
    ("11-perlyny", "98 перлин", "Намисто", "Детектив", "🔍", "#6b1f52"),
    ("12-khata", "Тісна хата", "Коза", "Пазл «Сокобан»", "🐐", "#2a5a31"),
    ("13-bazar", "Базар", "Ініціатива", "Торговий симулятор", "🪙", "#5e5414"),
    ("14-slon", "Слоняча мотузка", "Про мотузку, яка втримує слона", "Експеримент-платформер", "🐘", "#2c3f6b"),
    ("15-verblyud", "Верблюд на мурі", "Спокуса очевидним", "Будівельна головоломка", "🐫", "#7a4318"),
    # ділова гра без притчі
    ("16-uhoda", "Земельна угода", None, "Ділова гра: від ринку землі до банку", "📜", "#3f6b3a"),
]

INTRO = (
    "П’ятнадцять браузерних ігор за притчами з книги Романа Кушніра «Історії і притчі для особистісного зростання». "
    "Ви керуєте персонажем притчі, під час руху з ним щось відбувається, а наприкінці ваш вибір веде до одного з кількох фіналів. "
    "Після кожного фіналу гра пояснює, чого вчить притча. Пройдіть гру кілька разів, щоб знайти всі фінали. "
    "А ще тут є ділова гра «Земельна угода»: проведіть угоду від ринку землі до банку."
)
CONCLUSION = [
    "У всіх п’ятнадцяти іграх найкращий фінал майже ніколи не залежить від спритності. Він залежить від одного внутрішнього вибору: відпустити, побачити або просто діяти.",
    "Відпустити гілку, образу чи думку про те, що в інших краще. Побачити, що мотузка давно перегнила, двері відчинені, перлин завжди було 98. Діяти просто: штовхнути двері, попросити води, принести готове рішення.",
    "Обставини у грі майже завжди однакові. Змінюється лише те, як гравець на них дивиться і що обирає. Так само і в житті.",
]


def e(s):
    return escape(s, quote=True)


def fname(slug):
    return f"prytchi-ihra-{slug}.html"


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def game_page(i, links, as_fragment):
    slug, title, parable, genre, art, color = GAMES[i]
    css = read(os.path.join(SRC, "engine.css"))
    engine = read(os.path.join(SRC, "engine.js"))
    code = read(os.path.join(SRC, "games", f"{slug}.js"))
    nxt = GAMES[i + 1] if i + 1 < len(GAMES) else None
    meta = {
        "num": f"{i + 1:02d}",
        "hub": links["hub"],
        "next": links[nxt[0]] if nxt else "",
    }
    head = (
        f"<title>{e(title)}</title>\n"
        f'<meta name="description" content="{e(genre)}{(" за притчею «" + e(parable) + "»") if parable else ""}.">\n'
        f"{FONTS}\n<style>{css}</style>\n"
    )
    body = f"""<div class="page">
<header class="top"><a class="back" href="{e(links['hub'])}">← Усі ігри</a>
<div class="ttl"><span class="n">{i + 1:02d}</span>{e(title)}</div>
<button id="mute" class="icon" type="button" aria-label="Вимкнути звук">🔊</button></header>
<div id="stage" class="stage">
<canvas id="cv" aria-label="Ігрове поле: {e(title)}"></canvas>
<div id="hud" class="hud" aria-live="polite"></div>
<div id="banner" class="banner" hidden aria-live="polite"></div>
<div id="dlg" class="dlg" hidden role="dialog" aria-live="polite"><div class="who"></div><div class="txt"></div><div class="opts"></div><div class="more">Далі ▸ Enter</div></div>
<div id="screen" class="screen" hidden></div>
</div>
<div id="pad" class="pad" aria-hidden="true"><div class="stick"><div class="knob"></div></div><div class="pbtns"><button type="button" data-k="alt" hidden>Б</button><button type="button" data-k="act">Дія</button></div></div>
<p class="help" id="help"></p>
</div>
<script>window.PG_META = {json.dumps(meta, ensure_ascii=False)};</script>
<script>{engine}</script>
<script>{code}</script>
"""
    return wrap(head, body, as_fragment)


def hub_page(links, as_fragment):
    head = (
        f"<title>{e(COLLECTION)}</title>\n"
        '<meta name="description" content="15 браузерних ігор за притчами: керуйте персонажем, робіть вибір і знаходьте різні фінали.">\n'
        f"{FONTS}\n<style>{read(os.path.join(SRC, 'engine.css'))}</style>\n"
    )
    tiles = []
    for i, (slug, title, parable, genre, art, color) in enumerate(GAMES):
        tiles.append(
            f'<a class="tile" href="{e(links[slug])}" data-id="{i + 1:02d}">'
            f'<span class="art" style="background:{color}" aria-hidden="true">{art}</span>'
            f'<span class="num">Гра {i + 1:02d}</span><h3>{e(title)}</h3>'
            f'<span class="genre">{e(genre)}</span><span class="par">{("притча «" + e(parable) + "»") if parable else "8 етапів, випадкові перешкоди, лічильник днів"}</span>'
            f'<span class="got" data-got></span></a>'
        )
    concl = "".join(f"<p>{e(p)}</p>" for p in CONCLUSION)
    body = f"""<main class="hub">
<header><span class="eyebrow">Ігри з навчанням</span><h1>{e(COLLECTION)}</h1><p class="lede">{e(INTRO)}</p></header>
<section><h2>Ігри за притчами</h2><div class="grid">{''.join(tiles[:15])}</div></section>
<section><h2>Ділова гра</h2><div class="grid">{''.join(tiles[15:])}</div></section>
<section><h2>Що спільного в усіх фіналах</h2><div class="concl">{concl}</div></section>
<p class="foot">За книгою: Роман Кушнір. «Історії і притчі для особистісного зростання». Дрогобич: Коло, 2013. Прогрес зберігається лише у вашому браузері. Ті самі притчі як живі ігри для групи: <a href="{PAGES}/prytchi.html">сценарії для ведучого</a>.</p>
</main>
<script>
(function () {{
  var totals = {json.dumps({f"{i + 1:02d}": n for i, n in enumerate(ENDING_COUNTS)})};
  document.querySelectorAll(".tile").forEach(function (t) {{
    var id = t.getAttribute("data-id"), got = [];
    try {{ got = JSON.parse(localStorage.getItem("pg:end:" + id) || "[]"); }} catch (err) {{ got = []; }}
    t.querySelector("[data-got]").innerHTML = "Фінали: <b>" + got.length + "</b> з " + totals[id];
  }});
}})();
</script>
"""
    return wrap(head, body, as_fragment)


ENDING_COUNTS = [4] * 16


def wrap(head, body, as_fragment):
    if as_fragment:
        return head + body
    return (
        '<!doctype html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + "</head>\n<body>\n" + body + "</body>\n</html>\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts")
    ap.add_argument("--urls")
    ap.add_argument("--only", help="зібрати лише ігри з цими номерами через кому")
    args = ap.parse_args()
    only = set(args.only.split(",")) if args.only else None

    rel = {"hub": HUB, **{g[0]: fname(g[0]) for g in GAMES}}
    for i, g in enumerate(GAMES):
        if only and f"{i + 1:02d}" not in only:
            continue
        if not os.path.exists(os.path.join(SRC, "games", f"{g[0]}.js")):
            continue
        with open(os.path.join(REPO_ROOT, fname(g[0])), "w", encoding="utf-8") as f:
            f.write(game_page(i, rel, False))
    with open(os.path.join(REPO_ROOT, HUB), "w", encoding="utf-8") as f:
        f.write(hub_page(rel, False))

    if args.artifacts:
        urls = {}
        if args.urls and os.path.exists(args.urls):
            urls = json.load(open(args.urls, encoding="utf-8"))
        links = {k: urls.get(k, "#") for k in rel}
        os.makedirs(args.artifacts, exist_ok=True)
        for i, g in enumerate(GAMES):
            if os.path.exists(os.path.join(SRC, "games", f"{g[0]}.js")):
                with open(os.path.join(args.artifacts, f"{g[0]}.html"), "w", encoding="utf-8") as f:
                    f.write(game_page(i, links, True))
        with open(os.path.join(args.artifacts, "hub.html"), "w", encoding="utf-8") as f:
            f.write(hub_page(links, True))
    print("ok")


if __name__ == "__main__":
    main()
