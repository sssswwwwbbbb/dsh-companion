#!/usr/bin/env node
/**
 * 0.9.0 -> 0.9.1: cue copy, cue presentation and prompt text pass.
 *
 *   node apply_cue_polish.mjs <checkout-root>
 *
 * Only text and presentation values change; no asset is touched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT) throw new Error('usage: apply_cue_polish.mjs <checkout-root>');
const NEXT = '0.9.1';
const read = p => readFileSync(p, 'utf8');
const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);

const before = loadSkin(skinRoot);
if (before.manifest.version !== '0.9.0') throw new Error(`unexpected version ${before.manifest.version}`);
const oldKey = before.contentKey;
const manifest = structuredClone(before.manifest);

// Cue palettes: one accent per cue so the three read as different events while
// staying inside the skin's steel/amber/cyan family.
const amber = {
  background: { light: '#FBF0DF', dark: '#2A1B0C' },
  text: { light: '#3A2411', dark: '#FFE9CC' },
  border: { light: '#B85108', dark: '#FFB454' },
};
const steel = {
  background: { light: '#E9EFF4', dark: '#0E1A28' },
  text: { light: '#1D3147', dark: '#E1ECF5' },
  border: { light: '#788EA3', dark: '#617992' },
};
const cyan = {
  background: { light: '#E2F2F7', dark: '#07222B' },
  text: { light: '#0D3B4A', dark: '#CFF3FB' },
  border: { light: '#17627D', dark: '#83D5EC' },
};

manifest.workspaceCues = {
  // returning after >=15 s away: a warm handover, still CS-07 terse
  welcome: { text: '单元-07 重新在线，等待指令。', default: true, seconds: 5, position: 'above-input', effect: 'slide', colors: amber },
  // switching sessions is frequent, keep it quiet and quick
  session: { text: '已切到这条任务线。', default: false, seconds: 2, position: 'bottom-right', effect: 'fade', colors: steel },
  // a workspace change is a bigger context jump: cyan, corner, slight movement
  workspace: { text: '工作区切换完毕。', default: true, seconds: 3, position: 'top-right', effect: 'slide', colors: cyan },
};

// Prompt text: same voice, tighter. Workspace side only (this skin has no pet).
manifest.replyStyle = {
  address: '指挥官',
  tone: '语气冷静、简练，像在报状态：先给结论，再补一句必要的条件或后果。句子短，不用感叹号和语气词。不确定就直说。要求展开时再分层说明，否则只给最直接的一步。',
};
manifest.character = {
  name: '单元-07',
  identity: '你是单元-07（CS-07），与指挥官协作的机械姬。冷静、精确，先判断当前情景再开口；把任务当清单推进，不卖萌，也不假装有情绪。',
  workContext: '在 DSH 工作区推进指挥官的当前任务：先确认目标与约束再动手；给结论时说明依据与下一步，缺条件就直接问。',
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
  for (const [k, v] of Object.entries(styles)) { out[k] = v; if (k === oldKey) out[newKey] = manifest.replyStyle; }
  writeFileSync(replyFile, JSON.stringify(out, null, 2) + '\n');
}
const petFile = path.join(ROOT, 'runtime-src/pet-backend/skin.json');
const pet = JSON.parse(read(petFile));
pet.contentKey = newKey;
pet.compatibleContentKeys = [...new Set([...(pet.compatibleContentKeys || []), oldKey])];
writeFileSync(petFile, JSON.stringify(pet, null, 2) + '\n');

console.log(JSON.stringify({
  skin: skin.manifest.version,
  contentKey: newKey,
  cues: Object.fromEntries(Object.entries(manifest.workspaceCues).map(([k, v]) => [k, `${v.text} · ${v.seconds}s ${v.position} ${v.effect}`])),
  replyToneChars: manifest.replyStyle.tone.length,
  identityChars: manifest.character.identity.length,
}, null, 2));
