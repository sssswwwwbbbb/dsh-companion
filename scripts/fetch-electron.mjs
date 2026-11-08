import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 下载构建所需的官方 Electron 45.2.1 归档并校验摘要。
// 用法：node scripts/fetch-electron.mjs [mac|win|all]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.cache/electron/45.2.1');
const targets = {
  mac: { file: 'electron-v45.2.1-darwin-arm64.zip', url: 'https://github.com/electron/electron/releases/download/v45.2.1/electron-v45.2.1-darwin-arm64.zip', sha256: 'a9a1a0a5b64df714957f83467c84823cb34792205922c6f136550b2403605922' },
  win: { file: 'electron-v45.2.1-win32-x64.zip', url: 'https://github.com/electron/electron/releases/download/v45.2.1/electron-v45.2.1-win32-x64.zip', sha256: '7c342aee45d5b4ccafe5dfe9037028796b082735a576e21e2b4e2d8422ebb727' }
};

async function fetchOne(name, target) {
  const dest = path.join(cache, target.file);
  if (fs.existsSync(dest)) {
    const actual = createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
    if (actual === target.sha256) { console.log(`${name}: cached`); return; }
    fs.rmSync(dest);
  }
  fs.mkdirSync(cache, { recursive: true });
  console.log(`${name}: downloading ${target.url}`);
  const response = await fetch(target.url);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== target.sha256) throw new Error(`${name}: sha256 mismatch`);
  fs.writeFileSync(dest, buffer);
  console.log(`${name}: ok`);
}

const which = process.argv[2] || 'all';
const list = which === 'all' ? Object.entries(targets) : [[which, targets[which]]];
for (const [name, target] of list) {
  if (!target) throw new Error(`unknown target: ${name}`);
  await fetchOne(name, target);
}
