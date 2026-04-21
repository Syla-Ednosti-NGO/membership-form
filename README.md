# Заява на вступ до ГО

Веб-додаток для подачі заяви на членство в громадській організації.
Wizard-форма з 5 кроків → генерація 2-сторінкового PDF (Заява + Анкета)
з підписом, який можна намалювати пальцем/мишею або сфотографувати.

## Стек

- Vanilla HTML + CSS + JS, без збірки
- [Signature Pad](https://github.com/szimek/signature_pad) — підпис на canvas
- [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) — генерація PDF на клієнті
- [Cleave.js](https://nosir.github.io/cleave.js/) — маска телефону

Усі бібліотеки підключаються через CDN.

## Локальний запуск

```bash
python -m http.server 8765
# → http://127.0.0.1:8765/
```

Або будь-який інший статичний сервер.

## Деплой

Статичний сайт — Render Static Site, GitHub Pages, Netlify чи Cloudflare Pages.
Без білд-команди, publish directory — корінь репозиторію.

## Назва організації

У `template.js` константа `ORG_NAME` — зараз робоче значення `КИЇВТИЛ`.
Замінити на актуальну назву, коли буде обрана.
