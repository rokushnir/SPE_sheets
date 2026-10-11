/*
 * Чат-бот у стилі PatentBot: бот сам веде розмову — ставить прості запитання
 * з готовими варіантами відповіді, а людина може будь-коли написати своє.
 * Залежно від ролі та теми бот показує заздалегідь підготовлені завдання з data.js.
 * Працює повністю в браузері, без сервера; розмова зберігається в localStorage.
 */
(() => {
  const { CONFIG, ROLES, TOPICS, TASKS, FAQ } = window;
  const STORE_KEY = "rk-finbot-v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const chat = $("[data-chat]");
  const log = $("[data-log]");
  const choicesBox = $("[data-choices]");
  const form = $("[data-form]");
  const input = $("[data-input]");

  /* ---------- Сховище ---------- */

  const storage = {
    get(key, area = localStorage) { try { return JSON.parse(area.getItem(key)); } catch { return null; } },
    set(key, value, area = localStorage) { try { area.setItem(key, JSON.stringify(value)); } catch { /* приватний режим */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  };

  const freshState = () => ({ name: "", role: null, step: "start", log: [] });
  let state = storage.get(STORE_KEY) || freshState();
  const save = () => storage.set(STORE_KEY, state);

  /* ---------- Оформлення сторінки ---------- */

  const initials = CONFIG.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  function paintAvatar(el) {
    if (CONFIG.photo) {
      el.style.backgroundImage = `url("${CONFIG.photo}")`;
      el.textContent = "";
    } else {
      el.textContent = initials;
    }
  }
  $$("[data-avatar]").forEach(paintAvatar);
  $$("[data-name]").forEach((el) => (el.textContent = CONFIG.name));
  $$("[data-tagline]").forEach((el) => (el.textContent = CONFIG.tagline));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  function taskCard(task) {
    const el = document.createElement(task.url ? "a" : "div");
    el.className = "task" + (task.url ? "" : " task--soon");
    if (task.url) {
      el.href = task.url;
      el.target = "_blank";
      el.rel = "noopener";
    }
    const title = document.createElement("strong");
    title.textContent = "📋 " + task.title;
    const desc = document.createElement("small");
    desc.textContent = task.desc;
    const cta = document.createElement("span");
    cta.className = "task__cta";
    cta.textContent = task.url ? "Відкрити завдання →" : "Посилання скоро буде";
    el.append(title, desc, cta);
    return el;
  }

  // Каталог завдань на головній сторінці, згрупований за темами.
  const groups = $("[data-task-groups]");
  Object.entries(TOPICS).forEach(([id, topic]) => {
    const list = TASKS.filter((t) => t.topic === id);
    if (!list.length) return;
    const box = document.createElement("div");
    box.className = "task-group";
    const h = document.createElement("h3");
    h.textContent = topic.label;
    const ul = document.createElement("ul");
    list.forEach((t) => {
      const li = document.createElement("li");
      li.append(taskCard(t));
      ul.append(li);
    });
    box.append(h, ul);
    groups.append(box);
  });

  /* ---------- Відкриття / закриття ---------- */

  const teaser = $("[data-teaser]");
  let started = false;

  function openChat() {
    chat.hidden = false;
    teaser.hidden = true;
    document.body.classList.add("chat-open");
    storage.set("rk-finbot-seen", true, sessionStorage);
    if (!started) {
      started = true;
      if (state.log.length) {
        state.log.forEach(renderEntry);
        prompt(state.step);
        scrollDown();
      } else {
        greet();
      }
    }
    if (window.matchMedia("(min-width: 521px)").matches) input.focus();
  }
  function closeChat() {
    chat.hidden = true;
    document.body.classList.remove("chat-open");
  }
  $$("[data-open-chat]").forEach((b) => b.addEventListener("click", openChat));
  $("[data-close-chat]").addEventListener("click", closeChat);
  teaser.addEventListener("click", (e) => {
    if (e.target.closest("[data-teaser-close]")) {
      teaser.hidden = true;
      storage.set("rk-finbot-seen", true, sessionStorage);
    } else {
      openChat();
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !chat.hidden) closeChat(); });
  $("[data-restart]").addEventListener("click", () => {
    gen++;
    queue = Promise.resolve();
    state = freshState();
    save();
    log.innerHTML = "";
    clearChoices();
    greet();
  });

  // Як у PatentBot: через кілька секунд бот сам «стукає» до відвідувача.
  if (!storage.get("rk-finbot-seen", sessionStorage)) {
    setTimeout(() => { if (chat.hidden) teaser.hidden = false; }, 4000);
  }

  /* ---------- Повідомлення ---------- */

  const scrollDown = () => (log.scrollTop = log.scrollHeight);

  function bubble(from, text) {
    const b = document.createElement("div");
    b.className = "bubble bubble--" + from;
    text.split("\n\n").forEach((part) => {
      const p = document.createElement("p");
      p.textContent = part;
      b.append(p);
    });
    return b;
  }

  function renderEntry(entry) {
    if (entry.type === "tasks") {
      const box = document.createElement("div");
      box.className = "tasks-list";
      entry.ids.map((id) => TASKS.find((t) => t.id === id)).filter(Boolean).forEach((t) => box.append(taskCard(t)));
      log.append(box);
      return;
    }
    if (entry.type === "contacts") {
      const box = document.createElement("div");
      box.className = "tasks-list";
      contactLinks().forEach((c) => {
        const a = document.createElement("a");
        a.className = "task";
        a.href = c.href;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = "<strong></strong><span class='task__cta'>Написати →</span>";
        a.firstChild.textContent = c.label;
        box.append(a);
      });
      log.append(box);
      return;
    }
    const row = document.createElement("div");
    row.className = "msg msg--" + entry.type;
    if (entry.type === "bot") {
      const av = document.createElement("span");
      av.className = "avatar avatar--xs";
      paintAvatar(av);
      row.append(av);
    }
    row.append(bubble(entry.type, entry.text));
    log.append(row);
  }

  function push(entry) {
    state.log.push(entry);
    save();
    renderEntry(entry);
    scrollDown();
  }

  // Усі репліки бота йдуть через чергу, щоб «друкування» не накладалося.
  // gen змінюється при рестарті — тоді недоговорені старі репліки відкидаються.
  let queue = Promise.resolve();
  let gen = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function enqueue(fn) {
    const g = gen;
    queue = queue.then(() => (g === gen ? fn(() => g === gen) : undefined));
    return queue;
  }

  function typing() {
    const row = document.createElement("div");
    row.className = "msg msg--bot";
    const av = document.createElement("span");
    av.className = "avatar avatar--xs";
    paintAvatar(av);
    const b = document.createElement("div");
    b.className = "bubble bubble--bot typing";
    b.innerHTML = "<i></i><i></i><i></i>";
    row.append(av, b);
    log.append(row);
    scrollDown();
    return row;
  }

  function say(text) {
    const fill = (s) => s.replaceAll("{name}", state.name || "друже");
    return enqueue(async (alive) => {
      const t = fill(text);
      const dots = typing();
      await wait(Math.min(400 + t.length * 12, 1600));
      dots.remove();
      if (alive()) push({ type: "bot", text: t });
    });
  }

  function sayEntry(entry) {
    return enqueue(async (alive) => {
      await wait(300);
      if (alive()) push(entry);
    });
  }

  /* ---------- Варіанти відповіді ---------- */

  let currentChoices = [];

  function clearChoices() {
    choicesBox.innerHTML = "";
    currentChoices = [];
  }

  function offer(options) {
    enqueue(() => {
      clearChoices();
      currentChoices = options;
      options.forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        b.textContent = opt.label;
        b.addEventListener("click", () => pick(opt));
        choicesBox.append(b);
      });
      scrollDown();
    });
  }

  function pick(opt) {
    clearChoices();
    push({ type: "user", text: opt.label });
    opt.run();
  }

  function setStep(step) {
    enqueue(() => {
      state.step = step;
      save();
    });
    prompt(step);
  }

  /* ---------- Сценарій ---------- */

  function greet() {
    say(`Привіт! Я ${CONFIG.name} 👋`);
    say("Допомагаю розібратися з грошима — без складних слів. Відповім на ваші запитання і підберу практичні завдання саме під вас.");
    say("Як до вас звертатися?");
    setStep("askName");
  }

  const roleReplies = {
    school: "Круто, що ви цікавитеся грошима вже зараз — це величезна перевага на все життя!",
    student: "Студентські роки — ідеальний час, щоб навчитися керувати грошима: помилки ще недорогі.",
    adult: "Чудово! Покажу, як змусити гроші працювати на вас, а не навпаки.",
    parent: "Дуже ціную, коли батьки хочуть навчити дітей фінансової грамотності. Допоможу і вам, і їм.",
    teacher: "Дякую, що несете фінансову грамотність у класи! Маю для вас і завдання для учнів, і готові сценарії.",
  };

  function onName(raw) {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    state.name = name.charAt(0).toUpperCase() + name.slice(1);
    save();
    say("{name}, приємно познайомитися! 🙂");
    say("Розкажіть трохи про себе — так я підберу завдання, які підходять саме вам. Хто ви?");
    setStep("askRole");
  }

  function onRole(roleId) {
    state.role = roleId;
    save();
    say(roleReplies[roleId] || "Чудово!");
    showMenu("Що вас зараз найбільше цікавить? Оберіть тему або просто напишіть своє запитання.");
  }

  function showMenu(text) {
    say(text);
    setStep("menu");
  }

  function startTopic(id) {
    say(TOPICS[id].question.text);
    setStep("topic:" + id);
  }

  function onTopicAnswer(id, option) {
    say(option.reply);
    showTasks(id);
    afterAnswer();
  }

  function tasksFor(topicId) {
    return TASKS.filter((t) => t.topic === topicId && (t.levels.includes("all") || !state.role || t.levels.includes(state.role)));
  }

  function showTasks(topicId) {
    const list = tasksFor(topicId);
    if (!list.length) return;
    say(list.length === 1 ? "Ось завдання, яке я підготував для вас 👇" : "Ось завдання, які я підготував для вас 👇");
    sayEntry({ type: "tasks", ids: list.map((t) => t.id) });
  }

  function afterAnswer() {
    say("Що далі, {name}?");
    setStep("after");
  }

  function contactLinks() {
    const out = [];
    if (CONFIG.contacts.telegram) out.push({ label: "✈️ Telegram", href: CONFIG.contacts.telegram });
    if (CONFIG.contacts.email) out.push({ label: "✉️ " + CONFIG.contacts.email, href: "mailto:" + CONFIG.contacts.email });
    return out;
  }

  function goodbye() {
    say("Дякую за розмову, {name}! Успіхів із завданнями 💪");
    say("Повертайтеся, коли з'являться нові запитання — я тут.");
    setStep("done");
  }

  /* ---------- Розпізнавання вільного тексту ---------- */

  const norm = (s) => " " + s.toLowerCase().replace(/[’'`ʼ]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ") + " ";

  function score(text, keywords) {
    // Ключове слово — це початок слова: шукаємо його після пробілу.
    return keywords.reduce((n, k) => n + (text.includes(" " + k.toLowerCase()) ? 1 + k.length / 100 : 0), 0);
  }

  function bestMatch(text) {
    let faq = null, faqScore = 0;
    FAQ.forEach((f) => {
      const s = score(text, f.keywords);
      if (s > faqScore) { faq = f; faqScore = s; }
    });
    let topic = null, topicScore = 0;
    Object.entries(TOPICS).forEach(([id, t]) => {
      const s = score(text, t.keywords);
      if (s > topicScore) { topic = id; topicScore = s; }
    });
    return { faq, faqScore, topic, topicScore };
  }

  function answerFree(raw) {
    const text = norm(raw);

    if (/ (дяку|спасиб|дзенкую)/.test(text)) {
      say("Будь ласка! Радий допомогти 🙂");
      setStep(state.name ? "after" : state.step);
      return;
    }
    if (/ (привіт|добрий|вітаю|хай|hello|hi) /.test(text) && text.trim().split(" ").length <= 3) {
      say("Привіт-привіт! 👋 Про що хочете поговорити?");
      setStep("menu");
      return;
    }

    const { faq, faqScore, topic, topicScore } = bestMatch(text);
    if (faq && faqScore >= topicScore) {
      say(faq.answer);
      showTasks(faq.topic);
      afterAnswer();
      return;
    }
    if (topic) {
      say(`Схоже, це про тему «${TOPICS[topic].label.replace(/^\S+\s/, "")}». Уточню одне:`);
      startTopic(topic);
      return;
    }

    say("Гарне запитання! Не хочу відповідати навмання 🙂");
    if (contactLinks().length) {
      say("Напишіть мені особисто — відповім, щойно зможу:");
      sayEntry({ type: "contacts" });
      say("А поки можете обрати одну з тем — можливо, відповідь уже там.");
    } else {
      say("Спробуйте переформулювати інакше або оберіть одну з тем — можливо, відповідь уже там.");
    }
    setStep("menu");
  }

  /* ---------- Кроки розмови ---------- */

  const topicChoices = () => [
    ...Object.entries(TOPICS).map(([id, t]) => ({ label: t.label, run: () => startTopic(id) })),
    { label: "✍️ Своє запитання", run: askOwn },
  ];

  function askOwn() {
    say("Напишіть запитання в полі нижче — своїми словами, як другу 🙂");
    setStep("free");
  }

  // Що показати на кожному кроці (і при поверненні до збереженої розмови).
  function prompt(step) {
    if (step === "askName" || step === "free") {
      offer(step === "free" ? [{ label: "↩️ До тем", run: () => showMenu("Оберіть тему:") }] : []);
    } else if (step === "askRole") {
      offer(ROLES.map((r) => ({ label: r.label, run: () => onRole(r.id) })));
    } else if (step === "menu") {
      offer(topicChoices());
    } else if (step.startsWith("topic:")) {
      const id = step.slice(6);
      offer(TOPICS[id].question.options.map((o) => ({ label: o.label, run: () => onTopicAnswer(id, o) })));
    } else if (step === "after") {
      offer([
        { label: "📚 Інша тема", run: () => showMenu("Яка тема цікавить?") },
        { label: "✍️ Своє запитання", run: askOwn },
        { label: "👋 Дякую, на сьогодні все", run: goodbye },
      ]);
    } else if (step === "done") {
      offer([{ label: "📚 Повернутися до тем", run: () => showMenu("Із задоволенням! Яка тема цікавить?") }]);
    } else {
      greet();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    // Якщо людина надрукувала текст однієї з кнопок — вважаємо це натисканням.
    const lower = text.toLowerCase();
    const choice = currentChoices.find((c) => c.label.toLowerCase().replace(/^\P{L}+/u, "").startsWith(lower) && lower.length > 2);
    if (choice) return pick(choice);

    clearChoices();
    push({ type: "user", text });
    if (state.step === "askName") onName(text);
    else answerFree(text);
  });
})();
