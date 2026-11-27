import { escape } from './layout.mjs';

export function action(label, url, style = '', accessibleLabel) {
  const name = accessibleLabel ? ' aria-label="' + escape(accessibleLabel) + '"' : '';
  return '<a class="button' + (style ? ' ' + style : '') + '" href="' + escape(url) + '"' + name + '>' + escape(label) + '</a>';
}

export function figure(ctx, image, style = '', lazy = true) {
  if (!image) return '';
  const src = escape(ctx.url(image.src));
  const caption = image.caption ? '<figcaption>' + escape(image.caption) + '</figcaption>' : '';
  const dimensions = image.width === undefined ? '' : ' width="' + image.width + '" height="' + image.height + '"';
  const loading = lazy && (style || dimensions) ? ' loading="lazy"' : '';
  return '<figure class="media' + (style ? ' ' + style : '') + '"><img src="' + src + '" alt="' + escape(image.alt) +
    '"' + dimensions + ' decoding="async"' + loading + '>' + caption + '</figure>';
}

export function date(value) {
  const label = new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value));
  return '<time datetime="' + escape(value) + '">' + escape(label) + '</time>';
}

export const items = values => '<ul>' + values.map(value => '<li>' + escape(value) + '</li>').join('') + '</ul>';

export function body(ctx, blocks, heading = 'h2') {
  return blocks.map(block => {
    switch (block.type) {
      case 'paragraph': {
        const links = (block.links ?? []).map(link => {
          const href = link.url ?? ctx.route(link.route) + (link.fragment ? '#' + link.fragment : '');
          return '<a href="' + escape(href) + '">' + escape(link.label) + '</a>';
        }).join('<br>');
        return '<p>' + escape(block.text) + (links ? '<br>' + links : '') + '</p>';
      }
      case 'heading':
        return '<' + heading + '>' + escape(block.text) + '</' + heading + '>';
      case 'list':
        return items(block.items);
      case 'image':
        return figure(ctx, block.image);
    }
  }).join('\n');
}

export function posts(ctx, entries, heading = 'h2') {
  if (!entries.length) return '<p class="empty">Здесь пока нет публикаций.</p>';
  return '<ul class="post-list">' + entries.map(post => `
    <li><article class="post-card${post.cover ? ' has-cover' : ''}">
      ${figure(ctx, post.cover, 'card-cover')}
      <div>
        <p class="meta"><span>${escape(ctx.site.categories[post.category])}</span>${date(post.date)}</p>
        <${heading}><a href="${ctx.postUrl(post.slug)}">${escape(post.title)}</a></${heading}>
        <p>${escape(post.summary)}</p>
      </div>
    </article></li>`).join('') + '</ul>';
}
