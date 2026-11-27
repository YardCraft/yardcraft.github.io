import {
  copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, renameSync,
  rmdirSync, rmSync, writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from './data.mjs';
import { articlePage, buildsPage, homePage, journalPage } from '../_templates/pages.mjs';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const base = '/';
const output = join(root, 'build', 'site');
const marker = '.yardcraft-generated';
const staticFiles = [
  'Instruction.html', 'YardCraft.png', 'fonts/Monocraft-Regular.otf',
  'fonts/Monocraft-Bold.otf', 'fonts/Monocraft-Regular.woff2', 'fonts/Monocraft-Bold.woff2',
  'fonts/OFL.txt', 'assets/css/site.css', 'assets/js/legacy-links.js'
];

function collectImages(value, resources) {
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, 'src')) resources.add(value.src);
  for (const child of Object.values(value)) collectImages(child, resources);
}

function render(data) {
  const url = path => base + path;
  const canonical = path => new URL(path, 'https://yardcraft.github.io').href;
  const route = key => url({ home: '', journal: 'journal/', builds: 'builds/', legacy: 'Instruction.html' }[key]);
  const categoryPath = category => category === 'all' ? 'journal/' : 'journal/' + category + '/';
  const postPath = slug => 'journal/posts/' + slug + '/';
  const ctx = { ...data, url, canonical, route, categoryUrl: key => url(categoryPath(key)), postUrl: slug => url(postPath(slug)) };
  const pages = new Map([
    ['index.html', homePage(ctx)],
    ['builds/index.html', buildsPage(ctx)]
  ]);
  for (const category of ['all', ...Object.keys(data.site.categories)]) {
    pages.set(categoryPath(category) + 'index.html', journalPage(ctx, category));
  }
  for (const post of data.posts) pages.set(postPath(post.slug) + 'index.html', articlePage(ctx, post));
  return pages;
}

function writeSite(pages, resources) {
  const parent = dirname(output);
  mkdirSync(parent, { recursive: true });
  if (realpathSync(parent) !== parent) throw new Error('Каталог build должен находиться в исходной папке сайта');
  // Exclusive directory guards the fixed output during replacement.
  const lock = join(parent, '.site-lock');
  mkdirSync(lock);
  let stage;
  let preserve = false;
  try {
    const present = existsSync(output);
    if (present && (!lstatSync(output).isDirectory() || realpathSync(output) !== output ||
        !existsSync(join(output, marker)) || !lstatSync(join(output, marker)).isFile())) {
      throw new Error('build/site уже существует и не помечен как результат генерации');
    }
    stage = mkdtempSync(join(parent, '.site-'));
    const next = join(stage, 'next');
    const previous = join(stage, 'previous');
    for (const [name, html] of pages) {
      const path = join(next, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, html);
    }
    for (const name of resources) {
      const path = join(next, name);
      mkdirSync(dirname(path), { recursive: true });
      copyFileSync(join(root, name), path);
    }
    writeFileSync(join(next, marker), 'YardCraft static site\n');
    if (present) renameSync(output, previous);
    try {
      renameSync(next, output);
    } catch (error) {
      if (present) {
        preserve = true;
        renameSync(previous, output);
        preserve = false;
      }
      throw error;
    }
  } finally {
    try {
      if (stage && !preserve && realpathSync(stage) === stage) rmSync(stage, { recursive: true });
    } finally {
      rmdirSync(lock);
    }
  }
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Команда: node _tools/build.mjs [--check]');
  }
  const data = load(root);
  const resources = new Set(staticFiles);
  collectImages(data, resources);
  for (const file of resources) {
    const path = join(root, file);
    if (!existsSync(path) || !lstatSync(path).isFile() || realpathSync(path) !== path) {
      throw new Error(file + ' — отсутствует обычный локальный ресурс');
    }
  }
  const pages = render(data);
  if (args.length) console.log('Проверка пройдена. Страниц: ' + pages.size);
  else {
    writeSite(pages, resources);
    console.log('Сгенерировано страниц: ' + pages.size + '. Каталог: ' + output);
  }
} catch (error) {
  console.error('YardCraft: ' + error.message);
  process.exitCode = 1;
}
