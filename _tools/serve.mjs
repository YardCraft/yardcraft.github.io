import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join } from 'node:path';

const root = fileURLToPath(new URL('../build/site/', import.meta.url));
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.otf', 'font/otf'], ['.woff2', 'font/woff2'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.webp', 'image/webp'], ['.avif', 'image/avif'],
  ['.txt', 'text/plain; charset=utf-8']
]);

const port = Number(process.argv[2] ?? 4173);
if (process.argv.length > 3 || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Команда: node _tools/serve.mjs [порт]');
  process.exit(1);
}
try {
  await stat(join(root, 'index.html'));
} catch {
  console.error('Сначала выполните node _tools/build.mjs');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname.slice(1));
    if (relative.includes('\\') || relative.split('/').some(part => part && !/^[a-z0-9][a-z0-9_.-]*$/i.test(part))) {
      throw new Error('Invalid path');
    }
    let file = relative;
    if (!file || file.endsWith('/')) file += 'index.html';
    const mime = types.get(extname(file).toLowerCase());
    if (!mime) {
      if (!(await stat(join(root, file))).isDirectory()) throw new Error('Unsupported file');
      res.writeHead(302, { Location: url.pathname + '/' + url.search }).end();
      return;
    }
    let content = await readFile(join(root, file));
    if (file.startsWith('journal/posts/') && file.endsWith('.html') && url.searchParams.get('font') === 'b') {
      content = content.toString('utf8').replace('data-font="a"', 'data-font="b"');
    }
    res.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Страница не найдена');
  }
});
server.on('error', error => {
  console.error('YardCraft: ' + error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/'));
