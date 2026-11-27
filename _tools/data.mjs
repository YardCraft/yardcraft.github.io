import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const stepIds = Array.from({ length: 8 }, (_, i) => 'step-' + (i + 1));
const ascii = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function fail(at, reason) {
  throw new Error(at + ' — ' + reason);
}

function record(value, at, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(at, 'ожидается объект');
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(at + '.' + key, 'обязательное поле');
  }
  for (const key of Object.keys(value)) {
    if (!required.includes(key) && !optional.includes(key)) fail(at + '.' + key, 'неизвестное поле');
  }
}

function string(value, at) {
  if (typeof value !== 'string' || !value.trim()) fail(at, 'ожидается непустая строка');
}

function id(value, at) {
  string(value, at);
  if (!idPattern.test(value)) fail(at, 'используйте строчные латинские буквы, цифры и дефисы');
}

function list(value, at, validate, min = 0) {
  if (!Array.isArray(value) || value.length < min) fail(at, 'ожидается массив, минимум ' + min);
  value.forEach((entry, i) => validate(entry, at + '[' + i + ']'));
}

function unique(entries, key, at) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry[key])) fail(at, 'повторяется ' + key + ' ' + entry[key]);
    seen.add(entry[key]);
  }
}

function https(value, at, download = false) {
  string(value, at);
  if (!/^https:\/\/[^/?#\s\\]+[^\s\\]*$/u.test(value) || /%(?![0-9a-f]{2})/i.test(value)) {
    fail(at, 'ожидается абсолютный HTTPS-адрес');
  }
  const parsed = URL.parse(value);
  if (!parsed || parsed.username || parsed.password) fail(at, 'некорректный HTTPS-адрес');
  if (download && (!/\.zip$/i.test(parsed.pathname) || parsed.hash)) fail(at, 'ожидается адрес ZIP без фрагмента');
}

function link(value, at) {
  if (value && Object.hasOwn(value, 'url')) {
    record(value, at, ['label', 'url']);
    https(value.url, at + '.url');
  } else {
    record(value, at, ['label', 'route'], ['fragment']);
    if (!['home', 'journal', 'builds', 'legacy'].includes(value.route)) fail(at + '.route', 'неизвестный раздел');
    if (Object.hasOwn(value, 'fragment') && (value.route !== 'builds' || !['latest', 'install', ...stepIds].includes(value.fragment))) {
      fail(at + '.fragment', 'неизвестный якорь');
    }
  }
  string(value.label, at + '.label');
}

export function load(root) {
  function read(name) {
    try {
      return JSON.parse(readFileSync(join(root, name), 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      if (!(error instanceof SyntaxError)) fail(name, error.code || 'ошибка чтения');
      const location = error.message.match(/\(line (\d+) column (\d+)\)/);
      fail(name, location ? 'некорректный JSON, строка ' + location[1] + ', столбец ' + location[2] : 'некорректный JSON');
    }
  }

  function image(value, at) {
    record(value, at, ['src', 'alt'], ['caption', 'width', 'height']);
    string(value.src, at + '.src');
    if (typeof value.alt !== 'string') fail(at + '.alt', 'ожидается строка');
    if (Object.hasOwn(value, 'caption')) string(value.caption, at + '.caption');
    if (Object.hasOwn(value, 'width') || Object.hasOwn(value, 'height')) {
      for (const key of ['width', 'height']) {
        if (!Number.isSafeInteger(value[key]) || value[key] < 1) {
          fail(at + '.' + key, 'ожидается положительный целый размер в пикселях');
        }
      }
    }
    if (!/^assets\/images\/(?:[a-z0-9][a-z0-9_.-]*\/)*[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp|avif|gif)$/i.test(value.src)) {
      fail(at + '.src', 'ожидается путь к растровому изображению внутри assets/images');
    }
    try {
      const path = join(root, value.src);
      if (relative(realpathSync(root), realpathSync(path)).replaceAll('\\', '/') !== value.src || !statSync(path).isFile()) {
        fail(at + '.src', 'ожидается обычный файл по указанному пути');
      }
    } catch {
      fail(at + '.src', 'локальный ресурс не найден или перенаправлен');
    }
  }

  function cover(value, at) {
    if (value != null) image(value, at);
  }

  function body(blocks, at) {
    list(blocks, at, (block, here) => {
      switch (block?.type) {
        case 'paragraph':
          record(block, here, ['type', 'text'], ['links']);
          string(block.text, here + '.text');
          if (Object.hasOwn(block, 'links')) list(block.links, here + '.links', link);
          break;
        case 'heading':
          record(block, here, ['type', 'text']);
          string(block.text, here + '.text');
          break;
        case 'list':
          record(block, here, ['type', 'items']);
          list(block.items, here + '.items', string, 1);
          break;
        case 'image':
          record(block, here, ['type', 'image']);
          image(block.image, here + '.image');
          break;
        default:
          fail(here + '.type', 'ожидается paragraph, heading, list или image');
      }
    }, 1);
  }

  function version(value, at, extra = []) {
    record(value, at, ['version', 'minecraftVersion', 'downloadUrl', ...extra], ['requirements', 'changes', 'image']);
    for (const key of ['version', 'minecraftVersion']) string(value[key], at + '.' + key);
    https(value.downloadUrl, at + '.downloadUrl', true);
    for (const key of ['requirements', 'changes']) {
      if (Object.hasOwn(value, key)) list(value[key], at + '.' + key, string);
    }
    cover(value.image, at + '.image');
  }

  const site = read('_content/site.json');
  record(site, 'site.json', ['projectName', 'description', 'categories']);
  string(site.projectName, 'site.json.projectName');
  string(site.description, 'site.json.description');
  record(site.categories, 'site.json.categories', ['events', 'updates']);
  for (const [key, label] of Object.entries(site.categories)) string(label, 'site.json.categories.' + key);

  const posts = readdirSync(join(root, '_content/posts'), { withFileTypes: true }).sort((a, b) => ascii(a.name, b.name)).map(entry => {
    const at = '_content/posts/' + entry.name;
    if (!entry.isFile() || !/^[a-z0-9-]+\.json$/.test(entry.name)) fail(at, 'ожидается JSON-файл публикации');
    const post = read(at);
    record(post, at, ['id', 'slug', 'title', 'date', 'category', 'summary', 'body'], ['cover']);
    id(post.id, at + '.id');
    id(post.slug, at + '.slug');
    if (entry.name !== post.id + '.json') fail(at + '.id', 'должен совпадать с именем файла');
    for (const key of ['title', 'summary']) string(post[key], at + '.' + key);
    string(post.date, at + '.date');
    const date = new Date(post.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || post.date.startsWith('0000') ||
        !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== post.date) {
      fail(at + '.date', 'ожидается существующая дата YYYY-MM-DD');
    }
    string(post.category, at + '.category');
    if (!Object.hasOwn(site.categories, post.category)) fail(at + '.category', 'неизвестная категория');
    cover(post.cover, at + '.cover');
    body(post.body, at + '.body');
    return post;
  });
  unique(posts, 'id', '_content/posts');
  unique(posts, 'slug', '_content/posts');
  posts.sort((a, b) => ascii(b.date, a.date) || ascii(a.id, b.id));

  const home = read('_content/home.json');
  record(home, 'home.json', ['mode'], ['image', 'event']);
  if (!['default', 'event'].includes(home.mode)) fail('home.json.mode', 'ожидается default или event');
  cover(home.image, 'home.json.image');
  if (home.mode === 'event' || home.event != null) {
    const at = 'home.json.event';
    record(home.event, at, ['title', 'description'], ['details', 'image', 'journalSlug']);
    for (const key of ['title', 'description']) string(home.event[key], at + '.' + key);
    if (Object.hasOwn(home.event, 'details')) string(home.event.details, at + '.details');
    cover(home.event.image, at + '.image');
    if (home.event.journalSlug != null) {
      id(home.event.journalSlug, at + '.journalSlug');
      if (!posts.some(post => post.slug === home.event.journalSlug && post.category === 'events')) {
        fail(at + '.journalSlug', 'публикация категории «События» не найдена');
      }
    }
  }

  const builds = read('_content/builds.json');
  list(builds, 'builds.json', (build, at) => {
    version(build, at, ['id', 'name', 'description', 'archive']);
    id(build.id, at + '.id');
    string(build.name, at + '.name');
    string(build.description, at + '.description');
    list(build.archive, at + '.archive', (entry, where) => version(entry, where));
    unique([build, ...build.archive], 'version', at + '.archive');
  }, 1);
  unique(builds, 'id', 'builds.json');

  const install = read('_content/install.json');
  record(install, 'install.json', ['title', 'steps']);
  string(install.title, 'install.json.title');
  list(install.steps, 'install.json.steps', (step, at) => {
    record(step, at, ['title', 'body']);
    string(step.title, at + '.title');
    body(step.body, at + '.body');
  }, stepIds.length);
  if (install.steps.length !== stepIds.length) fail('install.json.steps', 'для прежних якорей нужны ровно восемь шагов');

  return { site, home, posts, builds, install, stepIds };
}
