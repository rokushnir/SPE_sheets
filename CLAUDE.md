# Інструкції для Claude

- Кожна сторінка — окремий самодостатній HTML-файл у корені репозиторію (наприклад `money.html`).
- Сайт публікується GitHub Pages з гілки `main`: `https://rokushnir.github.io/SPE_sheets/<файл>.html`. Власний домен `bubbles.sp.org.ua` вимкнено (файл `CNAME` прибрано), бо сайт на ньому не відкривався. Повертати `CNAME` лише після того, як у DNS для sp.org.ua додано запис `CNAME bubbles → rokushnir.github.io`.
- Інтерактивні робочі зошити Bubbles лежать у папці `bubbles/` (`bubbles/<назва>.html` → `https://rokushnir.github.io/SPE_sheets/bubbles/<назва>`); додавай кожен новий зошит карткою на `bubbles/index.html`.
- Після створення сторінки додай її в таблицю в `README.md` і завжди давай користувачу пряме посилання на GitHub Pages.
- Не комітити службові файли (скриншоти перевірок тощо).
