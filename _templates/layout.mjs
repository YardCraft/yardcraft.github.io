export const escape = value => String(value).replace(/[&<>"']/g, mark => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[mark]);

export function layout(ctx, page) {
  const nav = Object.entries({ home: 'Главная', journal: 'Журнал', builds: 'Сборки' })
    .map(([key, label]) => '<a href="' + ctx.route(key) + '"' +
      (page.section === key ? ' aria-current="' + (page.path === ctx.route(key) ? 'page' : 'location') + '"' : '') +
      '>' + label + '</a>').join('');
  const title = page.title ? page.title + ' · ' + ctx.site.projectName : ctx.site.projectName;
  const description = page.description || ctx.site.description;
  const canonical = ctx.canonical(page.path);
  const html = `<!doctype html>
<html lang="ru" data-font="a">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#3C1E1E">
  <meta name="description" content="${escape(description)}">
  <title>${escape(title)}</title>
  <link rel="canonical" href="${escape(canonical)}">
  <meta property="og:type" content="${page.type ?? 'website'}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="${escape(ctx.site.projectName)}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${escape(canonical)}">
  <meta property="og:image" content="${escape(ctx.canonical(ctx.url('YardCraft.png')))}">
  <meta property="og:image:alt" content="${escape(ctx.site.projectName)}">
  <link rel="preload" href="${ctx.url('fonts/Monocraft-Regular.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${ctx.url('assets/css/site.css')}">
  <link rel="icon" href="${ctx.url('YardCraft.png')}" type="image/png">
  ${page.section === 'home' ? '<script defer src="' + ctx.url('assets/js/legacy-links.js') + '"></script>' : ''}
</head>
<body>
  <a class="skip" href="#main">К содержимому</a>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="logo" href="${ctx.route('home')}" aria-label="${escape(ctx.site.projectName)} — главная">
        <img src="${ctx.url('YardCraft.png')}" alt="" width="1254" height="1254">
      </a>
      <nav class="navigation" aria-label="Основная">${nav}</nav>
    </div>
  </header>
  <main id="main" class="wrap" tabindex="-1">${page.content}</main>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <span>${escape(ctx.site.projectName)}</span>
      <nav class="footer-nav" aria-label="В подвале">${nav}</nav>
    </div>
  </footer>
</body>
</html>
`;
  return html.replace(/^[ \t]+$/gm, '');
}
