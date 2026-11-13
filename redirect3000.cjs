const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: `http://localhost:5173${req.url || '/'}` });
  res.end();
});

server.on('error', (err) => {
  console.log('Port 3000 redirect server notice:', err.message);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Port 3000 redirector active: http://localhost:3000 -> http://localhost:5173');
});

