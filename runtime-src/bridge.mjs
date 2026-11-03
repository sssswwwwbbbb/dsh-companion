import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export async function createBridge({ dispatch }) {
  const token = randomBytes(32).toString('hex');
  const expected = Buffer.from(`Bearer ${token}`);
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const actual = Buffer.from(String(request.headers.authorization || ''));
    if (request.headers.origin || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      response.writeHead(403);response.end(JSON.stringify({ error: 'FORBIDDEN' }));return;
    }
    if (request.url !== '/status' && request.method !== 'POST') { response.writeHead(405);response.end('{}');return; }
    try {
      let body = '';
      for await (const chunk of request) { body += chunk; if (body.length > 8192) throw new Error('REQUEST_TOO_LARGE'); }
      const input = body ? JSON.parse(body) : {};
      const result = await dispatch(request.url, input);
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400);
      response.end(JSON.stringify({ error: /^[A-Z_]+$/.test(error.message || '') ? error.message : 'REQUEST_FAILED' }));
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => { server.once('error', reject);server.listen(0, '127.0.0.1', resolve); });
  return { server, port: server.address().port, token, close: () => new Promise(resolve => server.close(resolve)) };
}
