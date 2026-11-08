#!/usr/bin/env node
/**
 * 0.8.0 -> 0.9.0: drop the desktop pet from this skin and ship the 1.0 artwork
 * I generate myself (dedicated cover, entry mark, three model scene badges).
 *
 *   node apply_no_pet_1_0_assets.mjs <checkout-root>
 *
 * Removing `modules.pet` frees the three pet clips and the unused props, which
 * keeps the manifest under the 1.0 ceiling of 128 assets while the badges and the
 * entry mark go in.
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(SRC, 'out');
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT) throw new Error('usage: apply_no_pet_1_0_assets.mjs <checkout-root>');
const NEXT = '0.9.0';
const read = p => readFileSync(p, 'utf8');
const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);

const before = loadSkin(skinRoot);
if (before.manifest.version !== '0.8.0') throw new Error(`unexpected version ${before.manifest.version}`);
const oldKey = before.contentKey;
const manifest = structuredClone(before.manifest);

// 1. no desktop pet for this skin
delete manifest.modules.pet;
delete manifest.modules.theme.settings.petEchoEnabled;
delete manifest.character.petContext;
delete manifest.character.petEnabledDefault;

// 2. drop what the pet module owned, plus the assets nothing referenced
const drop = ['master-idle', 'master-react', 'master-walk-left', 'book-prop', 'cup-prop',
              'master-turn-front', 'archive-grid', 'archive-startup-poster'];
for (const id of drop) {
  const asset = manifest.assets[id];
  if (!asset) throw new Error(`missing asset ${id}`);
  rmSync(path.join(skinRoot, asset.path), { force: true });
  delete manifest.assets[id];
}

// 3. dedicated cover replaces the reused workspace cover in place
const put = (id, file, mime, width, height, source) => {
  const data = readFileSync(path.join(ART, file));
  const rel = `assets/generated/${file}`;
  const target = path.join(skinRoot, rel);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
  manifest.assets[id] = {
    path: rel, mime, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length,
    width, height, alpha: mime === 'image/png', source, license: 'Project-generated for this skin; private use only.',
  };
  return id;
};
put('workspace-cover', 'skin-cover.png', 'image/png', 1440, 900, 'CS-07 panel-vocabulary library cover, generated 2026-11-08');
put('mark-light', 'mark-light.png', 'image/png', 96, 96, 'CS-07 entry mark, light, generated 2026-11-08');
put('mark-dark', 'mark-dark.png', 'image/png', 96, 96, 'CS-07 entry mark, dark, generated 2026-11-08');
put('badge-swift', 'badge-swift.png', 'image/png', 128, 128, 'Model scene badge: swift, generated 2026-11-08');
put('badge-deep', 'badge-deep.png', 'image/png', 128, 128, 'Model scene badge: deliberate, generated 2026-11-08');
put('badge-final', 'badge-final.png', 'image/png', 128, 128, 'Model scene badge: decisive, generated 2026-11-08');

// 4. wire the new artwork in
manifest.cover = 'workspace-cover';
manifest.modules.theme.config.entryMarks = { light: 'mark-light', dark: 'mark-dark' };
manifest.scenePresets = {
  ...manifest.scenePresets,
  model: {
    swift: { label: '速攻', badge: 'badge-swift', notice: '速攻模型已接入。' },
    deliberate: { label: '长思', badge: 'badge-deep', notice: '长思模型已接入。' },
    decisive: { label: '决算', badge: 'badge-final', notice: '决算模型已接入。' },
  },
};

manifest.version = NEXT;
writeFileSync(manifestPath, JSON.stringify(manifest));

const skin = loadSkin(skinRoot);
prepareResources(skin);
const newKey = skin.contentKey;

const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
if (!read(hostFile).includes(newKey)) writeFileSync(hostFile, read(hostFile).replace(`  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`));
const replyFile = path.join(ROOT, 'packages/dsh-companion/config/reply-styles.json');
if (!read(replyFile).includes(newKey)) {
  const styles = JSON.parse(read(replyFile));
  const out = {};
  for (const [k, v] of Object.entries(styles)) { out[k] = v; if (k === oldKey) out[newKey] = v; }
  writeFileSync(replyFile, JSON.stringify(out, null, 2) + '\n');
}
const petFile = path.join(ROOT, 'runtime-src/pet-backend/skin.json');
const pet = JSON.parse(read(petFile));
pet.contentKey = newKey;
pet.compatibleContentKeys = [...new Set([...(pet.compatibleContentKeys || []), oldKey])];
writeFileSync(petFile, JSON.stringify(pet, null, 2) + '\n');
const ctxPath = path.join(ROOT, 'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js');
writeFileSync(ctxPath, read(ctxPath).split(oldKey).join(newKey));

console.log(JSON.stringify({
  skin: skin.manifest.version,
  contentKey: newKey,
  modules: Object.keys(skin.manifest.modules),
  assets: Object.keys(skin.manifest.assets).length,
  dropped: drop,
  added: ['workspace-cover(1440x900)', 'mark-light', 'mark-dark', 'badge-swift', 'badge-deep', 'badge-final'],
}, null, 2));
