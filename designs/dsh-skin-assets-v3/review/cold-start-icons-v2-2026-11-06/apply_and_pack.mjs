#!/usr/bin/env node
/**
 * One-shot: fold the generated icon PNGs into the build input, bump the skin
 * version, follow the content key through the plugin, and emit an importable ZIP.
 *
 *   node apply_and_pack.mjs <checkout-root> <next-version> [--zip-only]
 *
 * `--zip-only` skips the build-input rewrite (used when the input already holds
 * this version) and only rebuilds the ZIP from the current input + PNGs.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const PNG = path.join(SRC, 'png');
const ROOT = path.resolve(process.argv[2] || '');
const NEXT = process.argv[3];
const zipOnly = process.argv.includes('--zip-only');
if (!ROOT || !/^\d+\.\d+\.\d+$/.test(NEXT || '')) throw new Error('usage: apply_and_pack.mjs <checkout-root> <x.y.z> [--zip-only]');

const read = p => readFileSync(p, 'utf8');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);
const { supportsSkinHost } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs')).href);

const before = loadSkin(skinRoot);
const oldKey = before.contentKey;
const icons = before.manifest.modules.theme.config.semanticIcons;
const generated = new Set(readdirSync(path.join(PNG, 'light')).filter(n => n.endsWith('.png')).map(n => n.slice(0, -4)));
if (JSON.stringify([...Object.keys(icons)].sort()) !== JSON.stringify([...generated].sort())) throw new Error('icon keys do not match semanticIcons');

const manifest = structuredClone(before.manifest);
let rewritten = 0;
for (const [name, pair] of Object.entries(icons)) {
  for (const [mode, id] of [['light', pair.light], ['dark', pair.dark]]) {
    const data = readFileSync(path.join(PNG, mode, `${name}.png`));
    const asset = manifest.assets[id];
    if (!asset) throw new Error(`missing asset ${id}`);
    if (!zipOnly) writeFileSync(path.join(skinRoot, asset.path), data);
    asset.sha256 = createHash('sha256').update(data).digest('hex');
    asset.bytes = data.length;
    asset.source = `CS-07 panel-vocabulary icon v3: ${name}; ${mode}; bolder redraw 2026-11-08`;
    rewritten++;
  }
}
if (!zipOnly) {
  manifest.version = NEXT;
  writeFileSync(manifestPath, JSON.stringify(manifest));
} else if (manifest.version !== NEXT) {
  throw new Error(`input is ${manifest.version}, expected ${NEXT} for --zip-only`);
}

const skin = loadSkin(skinRoot);
prepareResources(skin);
const newKey = skin.contentKey;

if (!zipOnly) {
  const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
  if (!read(hostFile).includes(newKey)) {
    const text = read(hostFile);
    if (!text.includes(oldKey)) throw new Error('previous content key missing from the allowlist');
    writeFileSync(hostFile, text.replace(`  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`));
  }
  const replyFile = path.join(ROOT, 'packages/dsh-companion/config/reply-styles.json');
  if (!read(replyFile).includes(newKey)) {
    const styles = JSON.parse(read(replyFile));
    if (!styles[oldKey]) throw new Error('previous reply style missing');
    const out = {};
    for (const [k, v] of Object.entries(styles)) { out[k] = v; if (k === oldKey) out[newKey] = v; }
    writeFileSync(replyFile, JSON.stringify(out, null, 2) + '\n');
  }
  const petFile = path.join(ROOT, 'runtime-src/pet-backend/skin.json');
  const pet = JSON.parse(read(petFile));
  pet.contentKey = newKey;
  pet.compatibleContentKeys = [...new Set([...(pet.compatibleContentKeys || []), oldKey])];
  writeFileSync(petFile, JSON.stringify(pet, null, 2) + '\n');
  for (const file of ['runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js']) {
    const full = path.join(ROOT, file);
    writeFileSync(full, read(full).split(oldKey).join(newKey));
  }
}

// importable ZIP: the imported copy must declare the host version itself
const zipped = structuredClone(manifest);
zipped.dshVersions = [...new Set([...zipped.dshVersions, '0.2.2-rc.1'])];
const work = path.join(SRC, 'zip-work');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
execFileSync('/usr/bin/ditto', [skinRoot, work]);
for (const [name, pair] of Object.entries(icons)) {
  for (const [mode, id] of [['light', pair.light], ['dark', pair.dark]]) {
    writeFileSync(path.join(work, zipped.assets[id].path), readFileSync(path.join(PNG, mode, `${name}.png`)));
  }
}
writeFileSync(path.join(work, 'skin.json'), JSON.stringify(zipped));
const asImport = loadSkin(work);
prepareResources(asImport);
for (const v of ['0.2.1-rc.5', '0.2.2-rc.1']) {
  if (!supportsSkinHost(asImport.manifest, asImport.contentKey, v)) throw new Error(`not supported on ${v}`);
}
const zip = path.join(SRC, `commander-workspace-private-${NEXT}.zip`);
rmSync(zip, { force: true });
execFileSync('/usr/bin/zip', ['-r', '-q', '-X', zip, 'skin.json', 'assets'], { cwd: work });
rmSync(work, { recursive: true, force: true });

console.log(JSON.stringify({
  bundled: { version: skin.manifest.version, contentKey: newKey },
  imported: { version: asImport.manifest.version, contentKey: asImport.contentKey, dshVersions: asImport.manifest.dshVersions },
  iconsRewritten: rewritten,
  zip: { file: path.basename(zip), bytes: statSync(zip).size, sha256: sha(zip) },
}, null, 2));
