# YardCraft

Статический сайт игрового мира YardCraft. Для работы нужен Node.js 22 или новее. Пакеты npm не требуются.

```powershell
node _tools/build.mjs --check
node _tools/build.mjs
node _tools/serve.mjs
```

Локальный адрес · http://127.0.0.1:4173/

Публичный сайт · https://yardcraft.github.io/

Публичные данные находятся в `_content/`, шаблоны и компоненты — в `_templates/`, стили и скрипты браузера — в `assets/`. Генератор записывает готовый сайт в `build/site/`. Файлы `index.html`, `journal/` и `builds/` в корне представляют проверенный статический снимок для GitHub Pages.

Локальный просмотр статьи с параметром `?font=b` показывает основной текст системным шрифтом.
