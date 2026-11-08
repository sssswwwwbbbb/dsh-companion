#!/usr/bin/env node
/**
 * Install the v2 icon set (CS-07 面板语汇) into the cold-start skin.
 *
 *   node apply_icons_v2.mjs <checkout-root>
 *
 * Replaces the 112 icon PNGs in place (same asset ids and paths, so the manifest
 * only changes hash/size/provenance), bumps the skin 0.5.1 -> 0.6.0, and follows
 * the new content key through the allowlist, the reply styles and the desktop
 * pet backend.
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const PNG = path.join(SRC, 'png');
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT) throw new Error('usage: apply_icons_v2.mjs <checkout-root>');

const read = p => readFileSync(p, 'utf8');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);

const before = loadSkin(skinRoot);
if (before.manifest.version !== '0.5.1') throw new Error(`unexpected skin version ${before.manifest.version}`);
const oldKey = before.contentKey;
const icons = before.manifest.modules.theme.config.semanticIcons;
const generated = new Set(readdirSync(path.join(PNG, 'light')).filter(n => n.endsWith('.png')).map(n => n.slice(0, -4)));
if (JSON.stringify([...Object.keys(icons)].sort()) !== JSON.stringify([...generated].sort())) {
  throw new Error('generated icon keys do not match semanticIcons');
}

const manifest = structuredClone(before.manifest);
const report = [];
for (const [name, pair] of Object.entries(icons)) {
  for (const [mode, id] of [['light', pair.light], ['dark', pair.dark]]) {
    const asset = manifest.assets[id];
    if (!asset) throw new Error(`missing asset ${id}`);
    const source = path.join(PNG, mode, `${name}.png`);
    const data = readFileSync(source);
    if (data.length < 100 || data.subarray(1, 4).toString() !== 'PNG') throw new Error(`${source} is not a PNG`);
    const target = path.join(skinRoot, asset.path);
    writeFileSync(target, data);
    asset.sha256 = createHash('sha256').update(data).digest('hex');
    asset.bytes = data.length;
    asset.source = `CS-07 panel-vocabulary icon v2: ${name}; ${mode}; redrawn 2026-11-06`;
    report.push({ id, bytes: data.length });
  }
}
manifest.version = '0.6.0';
writeFileSync(manifestPath, JSON.stringify(manifest));

const skin = loadSkin(skinRoot);
prepareResources(skin);
const newKey = skin.contentKey;
if (newKey === oldKey) throw new Error('content key did not change');

const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
if (!read(hostFile).includes(newKey)) {
  const text = read(hostFile);
  if (!text.includes(oldKey)) throw new Error('0.5.1 content key missing from the allowlist');
  writeFileSync(hostFile, text.replace(`  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`));
}
const replyFile = path.join(ROOT, 'packages/dsh-companion/config/reply-styles.json');
if (!read(replyFile).includes(newKey)) {
  const styles = JSON.parse(read(replyFile));
  if (!styles[oldKey]) throw new Error('0.5.1 reply style missing');
  const out = {};
  for (const [k, v] of Object.entries(styles)) {
    out[k] = v;
    if (k === oldKey) out[newKey] = v;
  }
  writeFileSync(replyFile, JSON.stringify(out, null, 2) + '\n');
}
for (const file of ['runtime-src/pet-backend/skin.json',
                    'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js']) {
  const full = path.join(ROOT, file);
  const text = read(full);
  if (!text.includes(oldKey)) throw new Error(`0.5.1 content key missing from ${file}`);
  writeFileSync(full, text.split(oldKey).join(newKey));
}

// keep the generation inputs with the rest of the skin-material reviews
const target = path.join(ROOT, 'designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06');
mkdirSync(target, { recursive: true });
for (const name of ['make_icons.py']) copyFileSync(path.join(SRC, name), path.join(target, name));

console.log(JSON.stringify({
  version: skin.manifest.version,
  oldKey, newKey,
  iconsRewritten: report.length,
  totalBytes: report.reduce((sum, row) => sum + row.bytes, 0),
  provenance: path.relative(ROOT, target),
}, null, 2));
