const http = require('http');

const PORT = 3001;
const HOOKS = new Set([
  '/srs/publish',
  '/srs/unpublish',
  '/srs/play',
  '/srs/stop',
  '/srs/hls',
  '/srs/hls_notify'
]);

const srv = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && HOOKS.has(req.url)) {
    let body=''; req.on('data', c => body+=c);
    req.on('end', () => {
      // optional: console.log(req.url, body);  // enable if you want to see payloads
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ code: 0 }));
    });
    return;
  }

  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('not found');
});

srv.listen(PORT, '0.0.0.0', () => {
  console.log(`SRS hook server listening on :${PORT}`);
});
