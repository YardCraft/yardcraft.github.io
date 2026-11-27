import { escape, layout } from './layout.mjs';
import { action, body, date, figure, items, posts } from './components.mjs';

export function homePage(ctx) {
  const { home, site } = ctx;
  const event = home.mode === 'event' ? home.event : null;
  const image = event ? event.image : home.image;
  const journal = ctx.route('journal');
  const actions = event?.journalSlug
    ? action('Читать запись', ctx.postUrl(event.journalSlug), 'primary') + action('Сборки', ctx.route('builds'))
    : action('Смотреть сборки', ctx.route('builds'), 'primary') + action('Открыть журнал', journal);
  const brand = '<div class="hero-brand" aria-hidden="true"><img src="' + ctx.url('YardCraft.png') +
    '" alt="" width="1254" height="1254" fetchpriority="high"></div>';
  const visual = figure(ctx, image, 'hero-cover', false) || (event ? '<div class="event-surface" aria-hidden="true"></div>' : brand);
  const installLink = ['Инструкция по установке', ctx.route('builds') + '#install'];
  const eventsLink = ['События в журнале', ctx.categoryUrl('events')];
  const legacy = {
    install: installLink, 'tab-install': installLink, 'panel-install': installLink,
    events: eventsLink, 'tab-events': eventsLink, 'panel-events': eventsLink
  };
  for (const [index, step] of ctx.stepIds.entries()) {
    legacy[step] = ['К шагу ' + (index + 1) + ' инструкции', ctx.route('builds') + '#' + step];
  }
  return layout(ctx, {
    section: 'home',
    path: ctx.route('home'),
    title: event?.title,
    description: event?.description,
    content: `
  <div class="legacy">
    ${Object.entries(legacy).map(([hash, [label, url]]) => `<p id="${hash}"><a href="${url}" data-legacy>${label}</a></p>`).join('')}
  </div>
  <section class="hero${event ? ' event-hero' : ''}">
    <div class="hero-copy">
      ${event ? '<p class="kicker">' + escape(site.projectName) + '</p>' : ''}
      <h1>${escape(event?.title ?? site.projectName)}</h1>
      <p class="lead">${escape(event?.description ?? site.description)}</p>
      ${event?.details ? '<p>' + escape(event.details) + '</p>' : ''}
      <div class="actions">${actions}</div>
    </div>
    ${visual}
  </section>
  ${event ? '<p class="event-project muted">' + escape(site.description) + '</p>' : ''}
  <section class="site-section recent" aria-labelledby="recent">
    <div class="section-heading"><h2 id="recent">Последние публикации</h2><a href="${journal}">Весь журнал</a></div>
    ${posts(ctx, ctx.posts.slice(0, 3), 'h3')}
  </section>`
  });
}

export function journalPage(ctx, category) {
  const filters = [['all', 'Все'], ...Object.entries(ctx.site.categories)].map(([id, label]) =>
    `<a href="${ctx.categoryUrl(id)}"${category === id ? ' aria-current="page"' : ''}>${escape(label)}</a>`).join('');
  const entries = category === 'all' ? ctx.posts : ctx.posts.filter(post => post.category === category);
  return layout(ctx, {
    section: 'journal',
    path: ctx.categoryUrl(category),
    title: category === 'all' ? 'Журнал' : ctx.site.categories[category] + ' · Журнал',
    description: {
      all: 'События игрового мира и обновления проекта YardCraft.',
      events: 'Публикации о событиях игрового мира YardCraft.',
      updates: 'Новости и обновления проекта YardCraft.'
    }[category],
    content: `
  <header class="page-intro">
    <h1>Журнал</h1>
    <p class="lead">События игрового мира и обновления проекта.</p>
  </header>
  <nav class="filters" aria-label="Категории журнала">${filters}</nav>
  <section class="journal-feed" aria-label="Публикации">${posts(ctx, entries)}</section>`
  });
}

export function articlePage(ctx, post) {
  return layout(ctx, {
    section: 'journal',
    path: ctx.postUrl(post.slug),
    type: 'article',
    title: post.title,
    description: post.summary,
    content: `
  <article class="article narrow" data-article>
    <header class="page-intro">
      <a class="back" href="${ctx.route('journal')}">Журнал</a>
      <p class="meta"><a href="${ctx.categoryUrl(post.category)}">${escape(ctx.site.categories[post.category])}</a>${date(post.date)}</p>
      <h1>${escape(post.title)}</h1>
    </header>
    ${figure(ctx, post.cover, 'article-cover', false)}
    <div class="article-body">${body(ctx, post.body)}</div>
    <footer class="article-footer">${action('Вернуться в журнал', ctx.route('journal'))}</footer>
  </article>`
  });
}

function buildCard(ctx, build, version, archived) {
  const facts = [['Версия', version.version], ['Minecraft', version.minecraftVersion]]
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('');
  const sections = [['Системные требования', version.requirements], ['Список изменений', version.changes]]
    .filter(([, values]) => values?.length)
    .map(([title, values]) => '<h4>' + title + '</h4>' + items(values)).join('');
  return `<article class="build-card${archived ? ' archived' : ''}">
    ${figure(ctx, version.image, 'build-cover')}
    <h3>${escape(build.name)}</h3>
    <p>${escape(build.description)}</p>
    <dl class="facts">${facts}</dl>
    <div class="actions">
      ${action('Скачать ZIP', version.downloadUrl, archived ? '' : 'primary',
        'Скачать ZIP — ' + build.name + ' ' + version.version)}
      <a class="plain-action" href="#install">Установка</a>
    </div>
    ${sections}
  </article>`;
}

export function buildsPage(ctx) {
  const archive = ctx.builds.flatMap(build => build.archive.map(version => buildCard(ctx, build, version, true)));
  const steps = ctx.install.steps.map((step, index) => `
    <li id="${ctx.stepIds[index]}">
      <h3>${escape(step.title)}</h3>
      ${body(ctx, step.body, 'h4')}
    </li>`).join('');
  return layout(ctx, {
    section: 'builds',
    path: ctx.route('builds'),
    title: 'Клиентские сборки',
    description: 'Актуальные и предыдущие клиентские сборки YardCraft и YardCraft Potato. Инструкция по установке через PineconeMC.',
    content: `
  <header class="page-intro">
    <h1>Клиентские сборки</h1>
    <p class="lead">Выберите сборку для своего компьютера и импортируйте ZIP в PineconeMC.</p>
  </header>
  <section id="latest" aria-labelledby="latest-title">
    <h2 id="latest-title">Актуальные версии</h2>
    <div class="build-grid">${ctx.builds.map(build => buildCard(ctx, build, build, false)).join('')}</div>
  </section>
  ${archive.length ? `<section class="site-section" aria-labelledby="archive-title">
    <h2 id="archive-title">Предыдущие версии</h2>
    <div class="build-grid">${archive.join('')}</div>
  </section>` : ''}
  <section class="site-section install narrow" id="install">
    <h2>${escape(ctx.install.title)}</h2>
    <ol class="steps">${steps}</ol>
    <p><a href="${ctx.route('legacy')}">Открыть прежнюю инструкцию</a></p>
  </section>`
  });
}
