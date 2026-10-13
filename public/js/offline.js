// Демо-рушій без ШІ: заготовлені репліки й прості правила.
// Вмикається, коли немає ні Claude у переглядачі, ні сервера з ключем API.

import { BLOCKS, BLOCK_IDS, DIRECTOR_IDS, BUDGETS } from "./characters.js";

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

function hash(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return h;
}

// Ключові слова, за якими вгадуємо, який блок карти гравець уже пояснив.
const DETECT = {
  product: /(продукт|товар|послуг|смак|якіст|унікальн|відрізня|рецепт|дизайн|розмір|вид[иі]в|асортимент)/i,
  customer: /(клієнт|покупц|покупат|школяр|студент|мам|батьк|офіс|сусід|підліт|доросл|віку|років|аудитор|люд[иея])/i,
  market: /(конкурент|ринок|ринку|у місті|в місті|район|попит|опитав|опитую|скільки людей|тисяч людей|населенн)/i,
  channels: /(інстаграм|instagram|тікток|tiktok|телеграм|telegram|сайт|доставк|маркетплейс|olx|prom|rozetka|ярмар|кав'ярн|магазин|точк|рекла|блогер|сарафан|друз)/i,
  production: /(обладн|піч|печ|духовк|виготов|технолог|сировин|постачальн|інгредієнт|матеріал|принтер|кухн|цех|за день|на день|штук|вручну)/i,
  cost: /(собівартіст|витрат|закуп|коштує|обходиться|інгредієнт.*₴|за кілограм|оренд)/i,
  price: /(ціна|ціну|продава[тю].*\d|за \d+|по \d+\s*(₴|грн)|\d+\s*(₴|грн|гривень).*(штук|шт|за))/i,
  money: /(заощадж|накопич|батьки дадуть|позик|кредит|інвест|грант|власні гроші|стартов|бюджет|зароблю|кишенькові)/i,
  legal: /(фоп|тов|ліценз|санітар|договір|податк|законн|дозвіл|сертифікат|згод|реєстрац|єдиний податок|чек)/i,
  risks: /(ризик|якщо не|план б|запасн|не вийде|зіпсу|повернен|страхов|що як)/i,
};

const QUESTIONS = {
  product: [
    { who: "coo", text: "Опиши свій продукт так, ніби я його вперше бачу: що саме ти робиш і чим воно краще, ніж те, що вже є?" },
    { who: "cco", text: "Чому людина обере саме тебе, а не те, що вже продається поруч?" },
  ],
  customer: [
    { who: "cco", text: "Хто твій перший покупець? Опиши одну конкретну людину: вік, де живе, коли і навіщо купує." },
    { who: "cco", text: "Назви трьох знайомих, які купили б це вже наступного тижня. Чому саме вони?" },
  ],
  market: [
    { who: "cco", text: "Скільки таких покупців реально є у твоєму місті чи районі? Прикинь хоча б грубо." },
    { who: "cco", text: "Хто вже продає щось схоже поблизу і за скільки?" },
  ],
  channels: [
    { who: "cco", text: "Де люди про тебе дізнаються і як саме куплять: соцмережі, точка продажу, доставка?" },
    { who: "cco", text: "Як ти зробиш перший продаж? Опиши крок за кроком." },
  ],
  production: [
    { who: "coo", text: "Яка в тебе технологія? Що треба з обладнання й сировини, і скільки штук ти реально зробиш за день?" },
    { who: "coo", text: "Де ти будеш це робити і хто, крім тебе, допомагатиме?" },
  ],
  cost: [
    { who: "cfo", text: "Скільки коштує зробити ОДНУ штуку? Розпиши: сировина, упаковка, доставка." },
    { who: "cfo", text: "Які витрати будуть щомісяця, навіть якщо ти нічого не продаси?" },
  ],
  price: [
    { who: "cfo", text: "За скільки продаватимеш і скільки з цього залишиться тобі після всіх витрат?" },
    { who: "cfo", text: "Чому саме така ціна? Порівняй із конкурентами." },
  ],
  money: [
    { who: "cfo", text: "Скільки грошей треба на старт і звідки вони візьмуться?" },
    { who: "cfo", text: "Через скільки місяців проєкт поверне вкладені гроші?" },
  ],
  legal: [
    { who: "lawyer", text: "Як ти оформиш бізнес? Знаєш, що таке ФОП (фізична особа-підприємець) і хто з дорослих тобі допоможе?" },
    { who: "lawyer", text: "Чи потрібні для цього якісь дозволи, санітарні вимоги чи договори?" },
  ],
  risks: [
    { who: "lawyer", text: "Що найгірше може статися з твоїм бізнесом і який у тебе план Б?" },
    { who: "coo", text: "Що буде, якщо замовлень раптом стане вдвічі більше, ніж ти можеш зробити?" },
  ],
};

// Короткі суперечки між директорами. {idea} і {name} підставляються.
const DEBATES = [
  [
    { who: "cco", mood: "excited", to: "all", text: "Мені вже подобається! Пару коротких відео в соцмережах, і про {idea} говоритиме весь район." },
    { who: "cfo", mood: "skeptical", to: "cco", text: "Тарасе, лайки не платять за сировину. Спершу хочу побачити, скільки коштує одна штука." },
  ],
  [
    { who: "cco", mood: "happy", to: "coo", text: "Якщо піде попит, можна одразу брати замовлення на весь тиждень наперед!" },
    { who: "coo", mood: "worried", to: "cco", text: "Стоп. Ти обіцяєш, а робити буду я. Скільки штук ми реально встигнемо за день?" },
  ],
  [
    { who: "cfo", mood: "thinking", to: "all", text: "Можна почати з мінімуму: маленька партія, продаємо знайомим, рахуємо, що вийшло." },
    { who: "lawyer", mood: "neutral", to: "cfo", text: "Згодна, але навіть маленька партія для чужих людей уже означає відповідальність за якість. Треба знати правила." },
  ],
  [
    { who: "coo", mood: "thinking", to: "all", text: "Найслабше місце я бачу у виробництві: ніхто ще не пояснив, як саме це робиться." },
    { who: "cco", mood: "skeptical", to: "coo", text: "Богдане, клієнту байдуже, як ми це робимо. Йому важливо, щоб було смачно і швидко." },
    { who: "coo", mood: "neutral", to: "cco", text: "Байдуже рівно до першого браку. Потім клієнт пам'ятає саме це." },
  ],
  [
    { who: "lawyer", mood: "worried", to: "all", text: "Поки ви сперечаєтесь про маркетинг, я нагадаю: без оформлення будь-який продаж — це ризик штрафу." },
    { who: "cco", mood: "neutral", to: "lawyer", text: "Ірино, на старті ж можна тестувати на друзях?" },
    { who: "lawyer", mood: "thinking", to: "cco", text: "Тестувати можна. А от регулярно продавати незнайомцям — уже бізнес, і його треба оформити." },
  ],
  [
    { who: "cfo", mood: "skeptical", to: "cco", text: "Бюджет на рекламу на старті — нуль. Хай продукт спершу сам себе продасть." },
    { who: "cco", mood: "worried", to: "cfo", text: "Марто, без жодної реклами про нас дізнається хіба що мама. Дай хоча б на пробний пост." },
    { who: "cfo", mood: "thinking", to: "cco", text: "Добре. Мінімальна сума і чіткий результат: скільки замовлень вона принесла." },
  ],
];

const REACT_GOOD = {
  cfo: ["Ось це вже розмова: цифри я люблю.", "Можна рахувати далі. Конкретика тебе прикрашає.", "Неочікувано тверезо. Записую."],
  cco: ["Оце я розумію, бачення! Так і продаватимемо.", "Клієнт у тебе вже живий, а не абстрактний. Клас!", "З цим можна йти до людей."],
  lawyer: ["Чітко і зрозуміло, мені подобається.", "Добре, що ти про це подумав(ла) заздалегідь.", "Так, це правильний напрямок."],
  coo: ["О, процес починає вимальовуватись.", "Це вже схоже на план, а не на мрію.", "Нормально. З цим можна працювати в цеху."],
};

const REACT_WEAK = {
  cfo: ["«Якось буде» — це не фінансовий план. Дай число, хай навіть приблизне.", "Мені бракує цифр. Без них я голосую проти."],
  cco: ["Звучить загально. Хто КОНКРЕТНО це купить?", "Так кожен скаже. Чим ти відрізняєшся?"],
  lawyer: ["Розмито. Мені треба розуміти, як це буде оформлено.", "Тут я поки бачу більше питань, ніж відповідей."],
  coo: ["Я так і не зрозумів, як це робиться руками.", "Красиво, але в цеху так не працює. Деталі?"],
};

const PITCH_REACT = {
  cfo: "Цікаво. Але перш ніж радіти, мені треба зрозуміти, скільки це коштує і коли окупиться.",
  cco: "О, мені вже подобається! Питання одне: хто купуватиме і скільки таких людей?",
  lawyer: "Ідея жива. Перевіримо, як зробити це законно і без сюрпризів від податкової.",
  coo: "Мене цікавить кухня процесу. Як саме ти це вироблятимеш і скільки штук на день?",
};

const DONTKNOW = [
  { who: "lawyer", mood: "happy", to: "player", text: "Чесне «не знаю» краще за вигадані цифри. Справжні підприємці теж починають із цього." },
  { who: "cco", mood: "thinking", to: "player", text: "Ось як дізнатися: опитай 10–15 знайомих, сходи до конкурента як покупець, запиши ціни і що люди купують найчастіше." },
  { who: "cfo", mood: "neutral", to: "player", text: "Можеш і приблизно: візьми ціни з інтернет-магазину на сировину і поділи на кількість штук. Неточна цифра краща за жодну." },
];

function detectCovered(text) {
  const out = [];
  for (const id of BLOCK_IDS) if (DETECT[id].test(text)) out.push(id);
  return out;
}

function shortIdea(idea) {
  const s = String(idea || "твою ідею").trim().replace(/[.!?]+$/, "");
  const first = s.split(/[.!?\n]/)[0];
  return cutWords(first, 60);
}

function cutWords(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n / 2 ? cut.slice(0, sp) : cut).replace(/[\s,;:–-]+$/, "") + "…";
}

function fill(text, state) {
  return text
    .replace(/\{idea\}/g, "«" + shortIdea(state.idea) + "»")
    .replace(/\{name\}/g, state.player?.name || "засновнику");
}

export function offlineTurn(state) {
  const seed = hash((state.idea || "") + state.round + (state.transcript?.length || 0));
  const lastPlayer = [...(state.transcript || [])].reverse().find((m) => m.who === "player");
  const answer = lastPlayer?.text || state.idea || "";
  const action = state.action || "answer";

  const newly = action === "dontknow" ? [] : detectCovered(answer);
  const covered = [...new Set([...(state.covered || []), ...newly])];
  if (action === "pitch" && !covered.includes("product") && answer.length > 40) covered.push("product");

  const hasNumbers = /\d/.test(answer);
  const long = answer.length > 90;
  const quality = action === "dontknow" ? 1 : Math.min(3, (long ? 1 : 0) + (hasNumbers ? 1 : 0) + (newly.length >= 2 ? 1 : 0));

  const trust = {};
  for (const id of DIRECTOR_IDS) {
    const owns = BLOCKS.filter((b) => b.owner === id).map((b) => b.id);
    const hit = newly.some((b) => owns.includes(b));
    let d = hit ? 7 : -2;
    if (id === "cfo" && hasNumbers) d += 4;
    if (answer.length < 25 && action === "answer") d -= 6;
    if (action === "dontknow") d = 1;
    if (action === "pitch") d = long ? 3 : 0;
    trust[id] = Math.max(-15, Math.min(15, d));
  }

  const messages = [];
  if (action === "pitch") {
    const order = [...DIRECTOR_IDS].sort((a, b) => hash(a + seed) - hash(b + seed));
    for (const id of order.slice(0, 3)) messages.push({ who: id, mood: id === "cco" ? "excited" : "thinking", to: "player", text: PITCH_REACT[id] });
  } else if (action === "dontknow") {
    messages.push(...DONTKNOW);
  } else {
    const speaker = state.addressee || pick(DIRECTOR_IDS, seed);
    const good = quality >= 2;
    messages.push({
      who: speaker,
      mood: good ? "happy" : "skeptical",
      to: "player",
      text: pick((good ? REACT_GOOD : REACT_WEAK)[speaker], seed >> 3),
    });
  }

  if (state.event) {
    messages.push(
      { who: "cfo", mood: "worried", to: "all", text: `Подія «${state.event.title}» б'є по наших цифрах. Треба закласти запас.` },
      { who: "cco", mood: "thinking", to: "cfo", text: "А можна перетворити це на можливість? Напишемо клієнтам чесно, що відбувається." },
    );
  } else {
    const debate = pick(DEBATES, seed + (state.round || 0));
    for (const m of debate) messages.push({ ...m, text: fill(m.text, state) });
  }

  const open = BLOCK_IDS.filter((b) => !covered.includes(b));
  const asked = new Set((state.transcript || []).map((m) => m.text));
  const questions = [];
  for (const b of open) {
    const q = QUESTIONS[b].find((x) => !asked.has(x.text));
    if (q && !questions.some((x) => x.who === q.who)) questions.push(q);
    if (questions.length === 2) break;
  }
  if (!questions.length) {
    questions.push({ who: "cfo", text: "Карта майже повна. Що ти зробиш першим ділом цього тижня, щоб перевірити ідею в житті?" });
  }

  const hintBlock = BLOCKS.find((b) => b.id === open[0]);
  const hint = hintBlock
    ? `Почни з блоку «${hintBlock.label}»: ${hintBlock.hint}. Дай хоча б одне конкретне число чи приклад.`
    : "Назви один маленький крок, який ти зробиш уже цього тижня, і як зрозумієш, що він вдався.";

  return { messages, questions, trust, covered, quality, hint };
}

export function offlineVerdict(state) {
  const covered = new Set(state.covered || []);
  const t = state.trust || {};
  const votes = DIRECTOR_IDS.map((id) => {
    const v = t[id] ?? 50;
    const vote = v >= 70 ? "invest" : v >= 45 ? "rework" : "pass";
    const comments = {
      cfo: { invest: "Цифри сходяться. Вкладаюсь, але звіт щомісяця.", rework: "Ідея жива, але порахуй собівартість і ціну, тоді повернемось.", pass: "Без цифр я не можу ризикувати грошима. Поки пас." },
      cco: { invest: "Я бачу покупців і знаю, як до них дістатися. Я в ділі!", rework: "Потенціал є, але чітко опиши клієнта і як він тебе знайде.", pass: "Не розумію, хто це купуватиме. Поки пас." },
      lawyer: { invest: "Юридично все прозоро. Підтримую.", rework: "Розберись з оформленням і дозволами, тоді можна стартувати.", pass: "Забагато юридичних ризиків. Поки ні." },
      coo: { invest: "Процес зрозумілий, можна запускати пробну партію.", rework: "Опиши технологію і скільки штук на день, тоді поговоримо.", pass: "Як це виробляти, досі загадка. Пас." },
    };
    return { who: id, vote, comment: comments[id][vote] };
  });
  const avg = DIRECTOR_IDS.reduce((s, id) => s + (t[id] ?? 50), 0) / DIRECTOR_IDS.length;
  const score = Math.round(Math.min(100, covered.size * 6 + avg * 0.4));
  const budget = BUDGETS.find((b) => b.id === state.player?.budget)?.label;
  return {
    title: cutWords(shortIdea(state.idea).replace(/…$/, ""), 34),
    votes,
    score,
    summary: `${state.player?.name || "Засновнику"}, ти відкрив(ла) ${covered.size} з ${BLOCK_IDS.length} блоків бізнес-карти. ${covered.size >= 7 ? "Це вже схоже на справжній план." : "Є що допрацювати, але старт зроблено."}`,
    strengths: BLOCKS.filter((b) => covered.has(b.id)).slice(0, 3).map((b) => `Продумано: ${b.label.toLowerCase()}`),
    risks: BLOCKS.filter((b) => !covered.has(b.id)).slice(0, 3).map((b) => `Не вирішено: ${b.hint}`),
    homework: [
      "Опитай 15 людей зі своєї цільової аудиторії: чи купили б вони і за скільки.",
      "Порахуй собівартість однієї штуки в таблиці: кожен інгредієнт чи матеріал окремо.",
      "Зроби пробну партію і продай її знайомим. Запиши, що сподобалось, а що ні.",
      budget ? `Склади список покупок на старт у межах бюджету «${budget}».` : "Склади список покупок на старт.",
      "Поговори з батьками чи дорослим наставником про оформлення ФОП.",
    ],
    card: BLOCKS.map((b) => ({
      block: b.id,
      text: covered.has(b.id) ? "Обговорено на нараді, деталі в стенограмі." : `Ще не вирішено: ${b.hint}.`,
    })),
  };
}
