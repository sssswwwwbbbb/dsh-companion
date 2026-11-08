#!/usr/bin/env node
/**
 * Follow-up to apply_upgrade.mjs: rebalance the last CS-07 line.
 *
 *   node apply_rebalance.mjs <checkout-root>
 *
 * The delivered `04_report_wet` measures -19.9 LUFS against -15.5 / -15.2 /
 * -13.7 for the first three lines, so it was quieter than the rest even though
 * the delivery note claims they are RMS-aligned. The film is re-rendered with
 * +5.1 dB on line 04 and the skin goes 0.5.0 -> 0.5.1 (new content key).
 */
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REVIEW = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.join(REVIEW, 'entrance-cs07.mp4');
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT || !existsSync(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs'))) {
  throw new Error('usage: apply_rebalance.mjs <checkout-root>');
}
const read = p => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s);
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');

const filmBytes = readFileSync(FILM);
const filmSha = createHash('sha256').update(filmBytes).digest('hex');
const review = JSON.parse(read(path.join(REVIEW, 'review.json')));
if (review.film_sha256 !== filmSha) throw new Error('film hash mismatch against review.json');
if (review.qa?.rebalance?.gain_db !== 5.1) throw new Error('review.json is not the rebalanced render');

const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);
const before = loadSkin(skinRoot);
if (before.manifest.version !== '0.5.0') throw new Error(`unexpected skin version ${before.manifest.version}`);
const oldKey = before.contentKey;

writeFileSync(path.join(skinRoot, 'assets/startup/entrance-cs07.mp4'), filmBytes);
const manifestPath = path.join(skinRoot, 'skin.json');
const assetPattern = /"entrance-film":\{[^}]*\}/;
const manifest = read(manifestPath);
const match = manifest.match(assetPattern);
if (!match) throw new Error('entrance-film asset entry not found');
const asset = JSON.parse('{' + match[0] + '}')['entrance-film'];
asset.sha256 = filmSha;
asset.bytes = filmBytes.length;
asset.source = asset.source.replace(/12\.50 s:.*$/, '12.50 s: accepted visual master re-rendered 2026-11-06 with the CS-07 voice delivery; line 04 lifted +5.1 dB to match lines 01-03; burned-in dialogue captions removed');
let next = manifest.replace(assetPattern, '"entrance-film":' + JSON.stringify(asset));
next = next.replace('"version":"0.5.0"', '"version":"0.5.1"');
write(manifestPath, next);

const skin = loadSkin(skinRoot);
prepareResources(skin);
const newKey = skin.contentKey;
if (newKey === oldKey) throw new Error('content key did not change');
if (skin.manifest.version !== '0.5.1') throw new Error('version bump missing');
if (skin.manifest.assets['entrance-film'].sha256 !== filmSha) throw new Error('manifest film hash mismatch');

// Allowlist and reply styles accumulate keys; the pet backend follows the shipped skin.
const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
if (!read(hostFile).includes(newKey)) {
  const current = read(hostFile);
  if (!current.includes(oldKey)) throw new Error('0.5.0 content key missing from the allowlist');
  write(hostFile, current.replace(`  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`));
}
const replyFile = path.join(ROOT, 'packages/dsh-companion/config/reply-styles.json');
if (!read(replyFile).includes(newKey)) {
  const styles = JSON.parse(read(replyFile));
  if (!styles[oldKey]) throw new Error('0.5.0 reply style missing');
  const out = {};
  for (const [key, value] of Object.entries(styles)) {
    out[key] = value;
    if (key === oldKey) out[newKey] = value;
  }
  write(replyFile, JSON.stringify(out, null, 2) + '\n');
}
for (const file of ['runtime-src/pet-backend/skin.json',
                    'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js']) {
  const full = path.join(ROOT, file);
  const text = read(full);
  if (!text.includes(oldKey)) throw new Error(`0.5.0 content key missing from ${file}`);
  write(full, text.split(oldKey).join(newKey));
}

const target = path.join(ROOT, 'designs/dsh-skin-assets-v3/review/cold-start-voice-integration-2026-11-06');
mkdirSync(target, { recursive: true });
for (const name of ['render_entrance_cs07.py', 'review.json', 'entrance-cs07.mp4',
                    'sound-scene-cs07.wav', 'sound-scene-cs07-raw.wav',
                    'caption-removed-comparison.png', 'apply_upgrade.mjs', 'apply_rebalance.mjs']) {
  cpSync(path.join(REVIEW, name), path.join(target, name));
}

console.log(JSON.stringify({
  oldKey, newKey,
  version: skin.manifest.version,
  film: { path: asset.path, sha256: filmSha, bytes: filmBytes.length },
  gains: review.lines.map(l => ({ id: l.id, lufs: l.stem_lufs, gain_db: l.mix_gain_db })),
  provenance: path.relative(ROOT, target),
}, null, 2));
