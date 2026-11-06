import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {app, screen} from 'electron';
import {WholePetBackend} from './backend.mjs';

const reportPath = path.join(path.dirname(process.execPath), 'DSH-W0-result.json');
const temp = fs.mkdtempSync(path.join(app.getPath('temp'), 'dsh-companion-w0-'));
app.setPath('userData', temp);
const held = process.argv.includes('--hold-window');
const report = {platform: process.platform, arch: process.arch, electron: process.versions.electron, held, passed: false};
const token = randomBytes(32).toString('hex');
let clicks = 0;
const server = createServer((request, response) => {
  if (request.url !== '/backend/input' || request.method !== 'POST' ||
      request.headers.authorization !== 'Bearer ' + token) {
    response.writeHead(404).end();
    return;
  }
  clicks++;
  request.resume();
  response.writeHead(204).end();
});

async function run() {
  let backend;
  try {
    await verify();
  } catch (error) {
    report.error = error.message;
  } finally {
    await backend?.stop().catch(() => {});
    server.close();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    app.exit(report.passed ? 0 : 1);
  }

  async function verify() {
    report.primaryDisplayScale = screen.getPrimaryDisplay().scaleFactor;
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    backend = new WholePetBackend({
      stateDir: temp,
      host: {origin: 'http://127.0.0.1:' + server.address().port, token},
      event: () => {},
    });
    const resources = Object.fromEntries(Object.values(backend.entry.media).map(({id, file}) => [
      id, {data: fs.readFileSync(new URL('./w0-media/' + file, import.meta.url))},
    ]));
    await backend.apply({
      config: {size: 100},
      resources,
      contentKey: backend.entry.contentKey,
      generation: 1,
      assertCurrent: () => {},
      holdVisibility: held,
    });
    const before = backend.status();
    assert.equal(before.windows[0]?.visible, !held);
    assert.ok(before.windows[0].renderer.sprites[0]);
    await backend.resize(83, () => {});
    const after = backend.status();
    const previousWindow = before.windows[0];
    const currentWindow = after.windows[0];
    assert.equal(after.pid, before.pid);
    assert.equal(currentWindow.id, previousWindow.id);
    const size = currentWindow.renderer.sprites[0].size;
    assert.equal(size, Math.round(backend.entry.geometry.defaultSize * 0.83));
    report.resize = {
      before: previousWindow.renderer.sprites[0].size,
      after: size,
      sameProcessAndWindow: true,
    };
    report.hitRegions = backend.snapshot().bodyInputs[0].rects;
    assert.ok(report.hitRegions > 0);
    if (!held) await delay(8000);
    report.clicks = clicks;
    report.cleanedUp = (await backend.stop()).cleared;
    report.passed = report.cleanedUp;
  }
}
void app.whenReady().then(run);
