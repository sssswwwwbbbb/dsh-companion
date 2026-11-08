#!/usr/bin/env node
/**
 * Cold-start skin: adopt the 1.0 declarative fields.
 *
 *   node apply_1_0_fields.mjs <checkout-root>
 *
 * Adds everything the 1.0 kit documents and that needs no new artwork
 * (the manifest is already at the 128-asset ceiling):
 *   replyStyle, character, cover (reuse workspace-cover),
 *   theme.entryMarks + entryMarkEnabled (reuse the CS-07 unit marks),
 *   workspaceCues (three lines, presentation matching the documented
 *   cold-start compatibility defaults), scenePresets.workspace (accent colours
 *   only), pet activityDescriptions + interactionMemory.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || '');
if (!ROOT) throw new Error('usage: apply_1_0_fields.mjs <checkout-root>');
const NEXT = '0.8.0';
const read = p => readFileSync(p, 'utf8');
const skinRoot = path.join(ROOT, '.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifestPath = path.join(skinRoot, 'skin.json');
const { loadSkin, prepareResources } = await import(pathToFileURL(path.join(ROOT, 'packages/dsh-skin-core/src/resources.mjs')).href);
const before = loadSkin(skinRoot);
if (before.manifest.version !== '0.7.1') throw new Error(`unexpected version ${before.manifest.version}`);
const oldKey = before.contentKey;
const manifest = structuredClone(before.manifest);
if (Object.keys(manifest.assets).length !== 128) throw new Error(`asset count changed: ${Object.keys(manifest.assets).length}`);

const INK = { light: '#1D3147', dark: '#E1ECF5' };
const PAPER = { light: '#E9EFF4', dark: '#0E1A28' };
const BORDER = { light: '#788EA3', dark: '#617992' };
const cueColors = { background: PAPER, text: INK, border: BORDER };

// 1. reply style + shared character (previously only available through the
//    plugin's content-key tables, which grow with every skin edit)
manifest.replyStyle = {
  address: '指挥官',
  tone: '语气冷静、简练。先给结论，再说明依据或下一步。用户要求详细说明时展开，遇到不确定的内容直说。',
};
manifest.character = {
  name: '单元-07',
  identity: '你是单元-07（CS-07），与用户协作的机械姬。冷静、简练，认真观察当前情景，以自然的角色表达提供帮助。',
  workContext: '在工作区协助用户处理问题，准确完成当前任务，在需要时清楚说明依据与下一步。',
  petContext: '在桌面陪伴用户，依据当前情景与可用动作简短回应，也可以安静待机。',
  petEnabledDefault: false,
};

// 2. library cover reuses the artwork the skin already ships
manifest.cover = 'workspace-cover';

// 3. CS-07 entry mark, also reusing an existing pair
manifest.modules.theme.config.entryMarks = { light: 'i-companion-l', dark: 'i-companion-d' };
if (!manifest.modules.theme.settings.entryMarkEnabled) {
  manifest.modules.theme.settings = {
    ...manifest.modules.theme.settings,
    entryMarkEnabled: { label: '入口徽记', default: true },
  };
}

// 4. three workspace cues; presentation follows the documented cold-start defaults
manifest.workspaceCues = {
  welcome: { text: '指挥官，系统已恢复待命。', default: true, seconds: 4, position: 'above-input', effect: 'fade', colors: cueColors },
  session: { text: '已回到这条任务线。', default: false, seconds: 2, position: 'bottom-right', effect: 'fade', colors: cueColors },
  workspace: { text: '工作区切换完成，继续待命。', default: true, seconds: 3, position: 'top-right', effect: 'slide', colors: cueColors },
};

// 5. workspace accents need no artwork; model badges/portraits would
manifest.scenePresets = {
  workspace: {
    'amber-duty': { label: '琥珀值班', accent: { light: '#B85108', dark: '#FFB454' }, notice: '值班配色已上线。' },
    'cold-standby': { label: '冷启动待命', accent: { light: '#17627D', dark: '#83D5EC' }, notice: '冷启动配色已上线。' },
    'alert-guard': { label: '警戒守卫', accent: { light: '#9C3D36', dark: '#FFB2AB' }, notice: '警戒配色已上线。' },
  },
};

// 6. pet autonomy + interaction memory (text only)
manifest.modules.pet.config.activityDescriptions = { react: '侧头确认一下指挥官的状态' };
manifest.modules.pet.config.interactionMemory = {
  enabledDefault: true,
  preferenceDefault: '偏好先给结论再补依据的简短回应；工作时安静待机，不主动卖萌。',
};

manifest.version = NEXT;
writeFileSync(manifestPath, JSON.stringify(manifest));

const skin = loadSkin(skinRoot);
prepareResources(skin);
const newKey = skin.contentKey;

// 7. follow the content key through the plugin tables
const hostFile = path.join(ROOT, 'packages/dsh-skin-core/src/host-compatibility.mjs');
if (!read(hostFile).includes(newKey)) {
  writeFileSync(hostFile, read(hostFile).replace(`  '${oldKey}',`, `  '${oldKey}',\n  '${newKey}',`));
}
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
writeFileSync(path.join(ROOT, 'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js'),
  read(path.join(ROOT, 'runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js')).split(oldKey).join(newKey));

console.log(JSON.stringify({
  skin: skin.manifest.version,
  contentKey: newKey,
  assets: Object.keys(skin.manifest.assets).length,
  added: ['replyStyle', 'character', 'cover', 'theme.entryMarks', 'workspaceCues', 'scenePresets.workspace', 'pet.activityDescriptions', 'pet.interactionMemory'],
}, null, 2));
