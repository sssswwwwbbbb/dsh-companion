#!/usr/bin/env node
/**
 * Package the cold-start skin (bold icon revision) as an importable skin ZIP.
 *
 *   node make_skin_zip.mjs <checkout-root>
 *
 * Why a ZIP instead of a plugin build: the shared worktree is being packaged by
 * another session (dev.45 is in flight), so shipping the skin through the plugin
 * would race with it. An imported skin is content only and does not touch the
 * plugin package.
 *
 * The only manifest deviation from the bundled copy is `dshVersions`, which adds
 * 0.2.2-rc.1: bundled skins rely on the host allowlist for that release, imported
 * skins are checked against their own declaration.
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const PNG = path.join(SRC, 'png');
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT) throw new Error('usage: make_skin_zip.mjs <checkout-root>');
const source = path.join(ROOT, 'packages/dsh-companion/skins/archive-workspace-r2-private');
const work = path.join(SRC, 'zip-work');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
execFileSync('/usr/bin/ditto', [source, work]);

const manifestPath = path.join(work, 'skin.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.version !== '0.6.0') throw new Error(`unexpected bundled version ${manifest.version}`);
manifest.version = '0.7.0';
if (!manifest.dshVersions.includes('0.2.2-rc.1')) manifest.dshVersions = [...manifest.dshVersions, '0.2.2-rc.1'];

const icons = manifest.modules.theme.config.semanticIcons;
let rewritten = 0;
for (const [name, pair] of Object.entries(icons)) {
  for (const [mode, id] of [['light', pair.light], ['dark', pair.dark]]) {
    const asset = manifest.assets[id];
    if (!asset) throw new Error(`missing asset ${id}`);
    const data = readFileSync(path.join(PNG, mode, `${name}.png`));
    const target = path.join(work, asset.path);
    writeFileSync(target, data);
    asset.sha256 = createHash('sha256').update(data).digest('hex');
    asset.bytes = data.length;
    asset.source = `CS-07 panel-vocabulary icon v3: ${name}; ${mode}; bolder redraw 2026-11-08`;
    rewritten++;
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest));

const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);
const { supportsSkinHost } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs')).href);
const skin = loadSkin(work);
prepareResources(skin);
if (skin.manifest.version !== '0.7.0') throw new Error('version bump missing');
for (const version of ['0.2.1-rc.5', '0.2.2-rc.1']) {
  if (!supportsSkinHost(skin.manifest, skin.contentKey, version)) throw new Error(`not supported on ${version}`);
}

const zip = path.join(SRC, 'commander-workspace-private-0.7.0.zip');
rmSync(zip, { force: true });
execFileSync('/usr/bin/zip', ['-r', '-q', '-X', zip, 'skin.json', 'assets'], { cwd: work });
rmSync(work, { recursive: true, force: true });

const files = execFileSync('/usr/bin/unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
console.log(JSON.stringify({
  zip: path.relative(ROOT, zip) === zip ? zip : zip,
  bytes: statSync(zip).size,
  sha256: sha,
  entries: files.length,
  iconsRewritten: rewritten,
  skinVersion: skin.manifest.version,
  contentKey: skin.contentKey,
  dshVersions: skin.manifest.dshVersions,
}, null, 2));
