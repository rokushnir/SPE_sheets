"""Будівельні блоки для сторінок-вправ (HTML-фрагменти для друку на A4)."""
import html
import math

esc = html.escape


def _label(label):
    return f'<div class="blabel">{label}</div>' if label else ''


def lines(n=None, label=None):
    """Розлінований простір. Без n — заповнює весь залишок сторінки."""
    if n is None:
        return f'<div class="blk grow col">{_label(label)}<div class="ruled grow"></div></div>'
    return f'<div class="blk">{_label(label)}<div class="ruled" style="height:{n * 8}mm"></div></div>'


def box(label=None, h=None, cls=''):
    """Порожня рамка для малювання чи вільних записів."""
    if h is None:
        return f'<div class="blk grow col">{_label(label)}<div class="frame grow {cls}"></div></div>'
    return f'<div class="blk">{_label(label)}<div class="frame {cls}" style="height:{h}mm"></div></div>'


def text(s, cls=''):
    return f'<div class="blk txt {cls}">{s}</div>'


def example(s, title='Приклад'):
    return f'<div class="blk example"><div class="extitle">{title}</div>{s}</div>'


def note(s):
    return f'<div class="blk note">{s}</div>'


def answer(s):
    """Відповідь догори дриґом унизу сторінки."""
    return f'<div class="answer"><span>Відповідь:</span> {s}</div>'


def table(headers, rows, widths=None, grow=False, row_h=8, label=None, small=False, number=False):
    """Таблиця для заповнення.

    rows: int (кількість порожніх рядків) або список рядків; рядок — str (перша клітинка)
    чи list (готові клітинки, решта порожні).
    """
    if isinstance(rows, int):
        rows = [[] for _ in range(rows)]
    rows = [[r] if isinstance(r, str) else list(r) for r in rows]
    ncol = len(headers)
    cg = ''
    if widths:
        cg = '<colgroup>' + ''.join(f'<col style="width:{w}">' for w in widths) + '</colgroup>'
    th = ''.join(f'<th>{h}</th>' for h in headers)
    body = []
    for i, r in enumerate(rows):
        cells = list(r)
        if number:
            cells = [f'{i + 1}'] + cells
        cells += [''] * (ncol - len(cells))
        tds = ''.join(f'<td>{c}</td>' for c in cells)
        style = '' if grow else f' style="height:{row_h}mm"'
        body.append(f'<tr{style}>{tds}</tr>')
    cls = 'tbl' + (' small' if small else '')
    t = f'<table class="{cls}">{cg}<thead><tr>{th}</tr></thead><tbody>{"".join(body)}</tbody></table>'
    if grow:
        return f'<div class="blk grow col">{_label(label)}<div class="grow tblwrap">{t}</div></div>'
    return f'<div class="blk">{_label(label)}{t}</div>'


def scale(items, extra_header='Що зроблю, щоб додати +1', label=None, top='Твердження'):
    """Самооцінка за шкалою 1–10."""
    th = f'<th>{top}</th>' + ''.join(f'<th class="n">{i}</th>' for i in range(1, 11))
    if extra_header:
        th += f'<th>{extra_header}</th>'
    body = ''
    for i, it in enumerate(items, 1):
        cells = f'<td class="it"><b>{i}.</b> {it}</td>' + '<td class="n"></td>' * 10
        if extra_header:
            cells += '<td></td>'
        body += f'<tr>{cells}</tr>'
    w = '<colgroup><col style="width:46%">' + '<col style="width:2.6%">' * 10
    w += '<col>' if extra_header else ''
    w += '</colgroup>'
    return (f'<div class="blk grow col">{_label(label)}<div class="grow tblwrap">'
            f'<table class="tbl scale">{w}<thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div></div>')


def qa(questions, n=2, label=None):
    """Запитання з лініями для відповіді."""
    out = []
    for q in questions:
        out.append(f'<div class="q">{q}</div><div class="ruled" style="height:{n * 8}mm"></div>')
    return f'<div class="blk">{_label(label)}{"".join(out)}</div>'


def qa_grow(questions, label=None):
    """Запитання, що ділять увесь залишок сторінки порівну."""
    out = ''.join(f'<div class="qcell"><div class="q">{q}</div><div class="ruled grow"></div></div>'
                  for q in questions)
    return f'<div class="blk grow col">{_label(label)}<div class="qgrid grow">{out}</div></div>'


def cols(*blocks, grow=True, ratio=None):
    """Розташувати блоки поруч."""
    inner = []
    for i, b in enumerate(blocks):
        st = f' style="flex:{ratio[i]}"' if ratio else ''
        inner.append(f'<div class="cell"{st}>{b}</div>')
    g = ' grow' if grow else ''
    return f'<div class="blk row{g}">{"".join(inner)}</div>'


def numbered(n, ncols=2, label=None, h=None):
    """Пронумеровані рядки у кілька колонок (31 день, 50 клієнтів тощо)."""
    per = math.ceil(n / ncols)
    colhtml = []
    for c in range(ncols):
        items = ''.join(f'<div class="numrow"><span>{i}</span></div>'
                        for i in range(c * per + 1, min(n, (c + 1) * per) + 1))
        colhtml.append(f'<div class="numcol">{items}</div>')
    if h:
        return f'<div class="blk">{_label(label)}<div class="numgrid" style="height:{h}mm">{"".join(colhtml)}</div></div>'
    return f'<div class="blk grow col">{_label(label)}<div class="numgrid grow">{"".join(colhtml)}</div></div>'


def checklist(items, label=None, ncols=1, small=False):
    lis = ''.join(f'<li><span class="cb"></span>{it}</li>' for it in items)
    cls = 'check' + (' small' if small else '')
    return f'<div class="blk">{_label(label)}<ul class="{cls}" style="column-count:{ncols}">{lis}</ul></div>'


# ---------- SVG-схеми ----------

def wheel(labels, size=120, label=None):
    """Колесо балансу: спиці зі шкалою 1–10."""
    n = len(labels)
    c, r = 100, 62
    parts = [f'<svg viewBox="-58 -4 316 208" class="svg" style="height:{size}mm">']
    for k in range(1, 11):
        parts.append(f'<circle cx="{c}" cy="{c}" r="{r * k / 10:.1f}" class="ring{" major" if k % 5 == 0 else ""}"/>')
    for i, lab in enumerate(labels):
        a = -math.pi / 2 + 2 * math.pi * i / n
        x, y = c + r * math.cos(a), c + r * math.sin(a)
        parts.append(f'<line x1="{c}" y1="{c}" x2="{x:.1f}" y2="{y:.1f}" class="spoke"/>')
        for k in (5, 10):
            tx, ty = c + r * k / 10 * math.cos(a), c + r * k / 10 * math.sin(a)
            parts.append(f'<text x="{tx + 2:.1f}" y="{ty - 1:.1f}" class="tick">{k}</text>')
        lx, ly = c + (r + 8) * math.cos(a), c + (r + 8) * math.sin(a)
        anchor = 'middle'
        if math.cos(a) > 0.3:
            anchor = 'start'
        elif math.cos(a) < -0.3:
            anchor = 'end'
        words = lab.split('|')
        dy0 = -(len(words) - 1) * 3.2 + (2 if math.sin(a) > 0.3 else 0) - (2 if math.sin(a) < -0.3 else 0)
        tsp = ''.join(f'<tspan x="{lx:.1f}" dy="{dy0 if j == 0 else 6.4:.1f}">{w}</tspan>' for j, w in enumerate(words))
        parts.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" class="wlab">{tsp}</text>')
    parts.append('</svg>')
    return f'<div class="blk center">{_label(label)}{"".join(parts)}</div>'


def matrix(quads, xlab, ylab, label=None, h=None):
    """Матриця 2×2. quads: [лівий-верх, правий-верх, лівий-низ, правий-низ]."""
    cells = ''.join(f'<div class="mq"><div class="mql">{q}</div></div>' for q in quads)
    st = f' style="height:{h}mm"' if h else ''
    g = '' if h else ' grow'
    return (f'<div class="blk col{g}">{_label(label)}<div class="matrix{g}"{st}>'
            f'<div class="ylab">{ylab} →</div><div class="mgrid">{cells}</div>'
            f'<div class="xlab">{xlab} →</div></div></div>')


def flow_chart(size=95):
    """Карта станів «Потоку» (за М. Чиксентміхаї)."""
    # кути задано вручну для читабельності: 0° — праворуч, 90° — вгору
    states =[('«Потік»', 45), ('Підйом', 85), ('Паніка', 128), ('Хвилювання', 175),
              ('Апатія', 225), ('Нудьга', 265), ('Розслабленість', 310), ('Контроль', 0)]
    c, r = 108, 56
    p = [f'<svg viewBox="0 0 215 200" class="svg" style="height:{size}mm">',
         '<line x1="20" y1="185" x2="195" y2="185" class="axis"/>',
         '<line x1="20" y1="185" x2="20" y2="8" class="axis"/>',
         '<text x="195" y="196" text-anchor="end" class="axl">Майстерність (навички) →</text>',
         '<text x="12" y="8" class="axl" transform="rotate(-90 12 8)" text-anchor="end">Складність задач →</text>']
    for name, deg in states:
        a = math.radians(deg)
        x, y = c + r * math.cos(a), c - r * math.sin(a)
        p.append(f'<line x1="{c}" y1="{c}" x2="{x:.1f}" y2="{y:.1f}" class="spoke"/>')
        lx, ly = c + (r + 6) * math.cos(a), c - (r + 6) * math.sin(a)
        anchor = 'start' if math.cos(a) > 0.3 else ('end' if math.cos(a) < -0.3 else 'middle')
        p.append(f'<text x="{lx:.1f}" y="{ly + 2:.1f}" text-anchor="{anchor}" class="wlab b">{name}</text>')
    p.append(f'<circle cx="{c}" cy="{c}" r="3" class="dot"/></svg>')
    return f'<div class="blk center">{"".join(p)}</div>'


def life_timeline(h=80):
    """Графік позитивних/негативних спогадів за періодами життя."""
    periods = ['Дитинство', 'Підлітковий|вік', 'Доросле|життя', 'Поточний|час', 'Недалеке|майбутнє', 'Далеке|майбутнє']
    w, left = 260, 16
    p = [f'<svg viewBox="0 0 {w} 134" class="svg" style="height:{h}mm;width:100%">',
         f'<line x1="{left}" y1="60" x2="{w - 4}" y2="60" class="axis"/>',
         f'<line x1="{left}" y1="4" x2="{left}" y2="116" class="axis"/>',
         '<text x="9" y="32" class="axl" text-anchor="middle" transform="rotate(-90 9 32)">+ позитивні</text>',
         '<text x="9" y="88" class="axl" text-anchor="middle" transform="rotate(-90 9 88)">− негативні</text>']
    for k in range(1, 6):
        p.append(f'<line x1="{left}" y1="{60 - k * 10}" x2="{w - 4}" y2="{60 - k * 10}" class="ring"/>')
        p.append(f'<line x1="{left}" y1="{60 + k * 10}" x2="{w - 4}" y2="{60 + k * 10}" class="ring"/>')
    seg = (w - 4 - left) / len(periods)
    for i, name in enumerate(periods):
        x = left + seg * i
        if i:
            p.append(f'<line x1="{x:.1f}" y1="4" x2="{x:.1f}" y2="116" class="spoke dash"/>')
        words = name.split('|')
        tsp = ''.join(f'<tspan x="{x + seg / 2:.1f}" dy="{0 if j == 0 else 5.6}">{wd}</tspan>' for j, wd in enumerate(words))
        p.append(f'<text x="{x + seg / 2:.1f}" y="123" text-anchor="middle" class="wlab">{tsp}</text>')
    p.append('</svg>')
    return f'<div class="blk">{"".join(p)}</div>'


def cause_arc(n=3):
    """Схема «Причина → Подія → Наслідок»."""
    def field(name):
        return f'<div class="af"><div class="afl">{name}</div><div class="frame grow"></div></div>'
    one = (f'<div class="arc">{field("Причина")}<div class="arw">→</div>{field("Подія")}'
           f'<div class="arw">→</div>{field("Наслідок")}</div>')
    return f'<div class="blk grow col arcs">{"".join([one] * n)}</div>'


def assoc_tree():
    """Дерево асоціацій 1 → 3 → 9 → 27."""
    p = ['<svg viewBox="0 0 270 150" class="svg" style="width:100%;height:110mm">']
    root = (135, 10)
    p.append('<rect x="105" y="2" width="60" height="14" rx="3" class="node"/>')
    l1 = [45, 135, 225]
    for x1 in l1:
        p.append(f'<line x1="135" y1="16" x2="{x1}" y2="40" class="spoke"/>')
        p.append(f'<rect x="{x1 - 28}" y="40" width="56" height="13" rx="3" class="node"/>')
        for j, dx in enumerate((-30, 0, 30)):
            x2 = x1 + dx
            p.append(f'<line x1="{x1}" y1="53" x2="{x2}" y2="78" class="spoke"/>')
            p.append(f'<rect x="{x2 - 14}" y="78" width="28" height="12" rx="2" class="node"/>')
            for dx3 in (-10, 0, 10):
                x3 = x2 + dx3
                p.append(f'<line x1="{x2}" y1="90" x2="{x3}" y2="112" class="spoke thin"/>')
                p.append(f'<rect x="{x3 - 4.5}" y="112" width="9" height="34" rx="1.5" class="node"/>')
    p.append('</svg>')
    return f'<div class="blk center">{"".join(p)}</div>'


def squiggles():
    """Чотири «кривульки» для домальовування."""
    paths = [
        'M30 120 C 60 40, 120 160, 150 70 S 210 90, 190 140',
        'M40 60 Q 100 20 120 90 T 200 110',
        'M60 150 C 40 80, 160 30, 140 120 C 130 160, 90 150, 100 110',
        'M30 100 L 80 60 L 110 120 L 160 50 L 190 130',
    ]
    cells = ''.join(f'<div class="sq"><svg viewBox="0 0 220 180" class="svg"><path d="{d}" class="squig"/></svg>'
                    f'<div class="sqcap">На що це схоже? ____________________</div></div>' for d in paths)
    return f'<div class="blk grow sqgrid">{cells}</div>'


def glyphs(items, font_cls='', cells=9):
    """Рядки для прописування незнайомих знаків."""
    rows = ''.join(f'<div class="grow-row"><div class="glyph {font_cls}">{g}</div><div class="gname">{n}</div>'
                   + '<div class="gcell"></div>' * cells + '</div>' for g, n in items)
    return f'<div class="blk grow col glyphs">{rows}</div>'


def quadrants(labels, h=None):
    """Коло, поділене на 4 сфери (без осей важливості)."""
    cells = ''.join(f'<div class="qd"><div class="qdl">{l}</div></div>' for l in labels)
    st = f' style="height:{h}mm"' if h else ''
    g = '' if h else ' grow'
    return f'<div class="blk col{g}"><div class="quad{g}"{st}>{cells}</div></div>'


def bars(pairs, label=None, head='Пара рис'):
    """Риси (або пари рис) з розподілом «я / інша людина» у відсотках."""
    rows = ''
    for a, b in pairs:
        name = f'{a} / {b}' if b else a
        rows += (f'<tr><td class="it">{name}</td><td>Я: ____ %</td><td>Інша людина: ____ %</td>'
                 f'<td class="barcell"><div class="bar"><span></span></div></td></tr>')
    return (f'<div class="blk">{_label(label)}<table class="tbl"><colgroup><col style="width:34%"><col style="width:17%">'
            f'<col style="width:22%"><col></colgroup><thead><tr><th>{head}</th><th>Скільки беру я</th>'
            f'<th>Скільки бере інша людина</th><th>Позначте розподіл: 0% ←→ 100%</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>')


def water_tracker(days=7, glasses=12):
    rows = ''.join(f'<tr><td class="it">{d}</td>' + '<td class="glass">◯</td>' * glasses + '<td></td></tr>'
                   for d in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'][:days])
    th = '<th>День</th>' + ''.join(f'<th class="n">{i}</th>' for i in range(1, glasses + 1)) + '<th>Разом, л</th>'
    return f'<div class="blk"><table class="tbl scale"><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div>'
