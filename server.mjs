import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.PORT || 4174);
createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (!['/', '/index.html'].includes(req.url?.split('?')[0])) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL('./index.html', import.meta.url));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(503); res.end('Build the experience first.'); }
}).listen(port, '127.0.0.1', () => console.log(`Crow preview: http://127.0.0.1:${port}`));
