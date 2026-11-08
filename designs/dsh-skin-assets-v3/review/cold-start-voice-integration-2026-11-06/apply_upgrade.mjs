#!/usr/bin/env node
/**
 * Apply the CS-07 cold-start upgrade to a dsh-companion checkout.
 *
 *   node apply_upgrade.mjs <checkout-root>
 *
 * Delta versus the accepted 0.4.0 skin:
 *   - startup film re-rendered with the CS-07 (unit-07) voice delivery,
 *   - burned-in dialogue captions removed,
 *   - skin version 0.4.0 -> 0.5.0 and every place that pins the old content
 *     key updated to the new one.
 *
 * The delivered `subtitle` field in the startup module is left untouched: the
 * request was to remove the captions burned into the film, not the reduced
 * motion still-screen caption.
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REVIEW = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.join(REVIEW, 'entrance-cs07.mp4');
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT || !existsSync(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs'))) {
  throw new Error('usage: apply_upgrade.mjs <checkout-root>');
}
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const read = p => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s);
const replaceOnce = (file, from, to) => {
  const before = read(file);
  const count = before.split(from).length - 1;
  if (count !== 1) throw new Error(`expected exactly one ${JSON.stringify(from)} in ${file}, found ${count}`);
  write(file, before.replace(from, to));
};

const filmBytes = readFileSync(FILM);
const filmSha = createHash('sha256').update(filmBytes).digest('hex');
const review = JSON.parse(read(path.join(REVIEW, 'review.json')));
if (review.film_sha256 !== filmSha) throw new Error(`film hash mismatch: ${filmSha} != review.json`);

const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);

const before = loadSkin(skinRoot);
const oldKey = before.contentKey;
if (before.manifest.version !== '0.4.0') throw new Error(`unexpected skin version ${before.manifest.version}`);

// 1. Swap the startup film in the accepted build input.
const startupDir = path.join(skinRoot, 'assets/startup');
rmSync(path.join(startupDir, 'entrance-voice-b.mp4'), { force: true });
writeFileSync(path.join(startupDir, 'entrance-cs07.mp4'), filmBytes);

// 2. Point the manifest at it, bump the version, and drop the "B voicing" wording.
let manifestText = read(manifestPath);
const asset = {
  path: 'assets/startup/entrance-cs07.mp4',
  mime: 'video/mp4',
  sha256: filmSha,
  bytes: filmBytes.length,
  width: 1280,
  height: 720,
  source: 'Cold-start entrance film, 12.50 s: accepted visual master re-rendered 2026-11-06 with the CS-07 voice delivery; 0.35/2.80/7.48/9.15 s cue sheet; burned-in dialogue captions removed',
  license: 'Project-authored visuals and locally generated CS-07 voice; not a real-person voice clone; private isolated candidate, no distribution license assigned',
};
const assetMatch = manifestText.match(/"entrance-film":\{[^}]*\}/);
if (!assetMatch) throw new Error('entrance-film asset entry not found');
manifestText = manifestText.replace(assetMatch[0], '"entrance-film":' + JSON.stringify(asset));
write(manifestPath, manifestText.replace('"version":"0.4.0"', '"version":"0.5.0"').replace('B 声线开场', 'CS-07 声线开场'));

const skin = loadSkin(skinRoot);
prepareResources(skin); // verifies every asset hash and size
const newKey = skin.contentKey;
if (newKey === oldKey) throw new Error('content key did not change');
if (skin.manifest.version !== '0.5.0') throw new Error('version bump missing');
if (skin.manifest.modules.startup.config.subtitle !== 'CS-07 · 工作区已就绪。') throw new Error('startup subtitle changed unexpectedly');
if (skin.manifest.modules.startup.config.video !== 'entrance-film') throw new Error('startup video binding changed unexpectedly');
if (skin.manifest.assets['entrance-film'].sha256 !== filmSha) throw new Error('manifest film hash mismatch');

// 3a. The host allowlist and the reply styles keep the accepted key as well:
// a user can still roll back to the 0.4.0 package, and both keys describe the
// same skin identity on DSH 0.2.2-rc.1.
const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
if (!read(hostFile).includes(newKey)) {
  replaceOnce(hostFile, `  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`);
}
const replyFile = path.join(ROOT, 'packages/dsh-companion/config/reply-styles.json');
if (!read(replyFile).includes(newKey)) {
  const styles = JSON.parse(read(replyFile));
  if (!styles[oldKey]) throw new Error('accepted reply style missing');
  const next = {};
  for (const [key, value] of Object.entries(styles)) {
    next[key] = value;
    if (key === oldKey) next[newKey] = value;
  }
  write(replyFile, JSON.stringify(next, null, 2) + '\n');
}

// 3b. The desktop pet backend carries a single content key and must follow the
// shipped skin, otherwise /backend/input rejects the click interaction.
const pinned = [
  'runtime-src/pet-backend/skin.json',
  'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js',
];
for (const file of pinned) {
  const full = path.join(ROOT, file);
  const text = read(full);
  if (!text.includes(oldKey)) throw new Error(`old content key missing from ${file}`);
  write(full, text.split(oldKey).join(newKey));
}

// 4. Keep the provenance folder next to the other skin-material reviews.
const target = path.join(ROOT, 'designs/dsh-skin-assets-v3/review/cold-start-voice-integration-2026-11-06');
mkdirSync(target, { recursive: true });
for (const name of ['render_entrance_cs07.py', 'review.json', 'entrance-cs07.mp4', 'sound-scene-cs07.wav', 'sound-scene-cs07-raw.wav']) {
  cpSync(path.join(REVIEW, name), path.join(target, name));
}

console.log(JSON.stringify({
  skinRoot,
  oldKey,
  newKey,
  version: skin.manifest.version,
  film: { path: asset.path, sha256: filmSha, bytes: filmBytes.length },
  startup: skin.manifest.modules.startup.config,
  pinned: [...pinned, 'packages/dsh-skin-core/src/host-compatibility.mjs', 'packages/dsh-companion/config/reply-styles.json (both keys)'],
  provenance: path.relative(ROOT, target),
}, null, 2));
