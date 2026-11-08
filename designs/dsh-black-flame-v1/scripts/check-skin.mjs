// 用本机已安装的主题盒子（含 skin-core）校验本皮肤，等价于「皮肤库 → 安装本地皮肤」的检查。
// 运行：node scripts/check-skin.mjs            （校验 skin/ 目录）
//       node scripts/check-skin.mjs xxx.zip    （校验 ZIP，走真实导入逻辑）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const pluginDir = [
  path.join(os.homedir(), '.dsh/profiles/desktop/node_modules/dsh-plugin-companion'),
  path.join(os.homedir(), '.dsh/profiles/development/node_modules/dsh-plugin-companion'),
].find(dir => fs.existsSync(path.join(dir, 'skin-core/src/index.mjs')));

if (!pluginDir) {
  console.error(JSON.stringify({ valid: false, code: 'PLUGIN_NOT_FOUND' }));
  process.exit(1);
}

const core = await import(path.join(pluginDir, 'skin-core/src/index.mjs'));
const { supportsSkinHost } = await import(path.join(pluginDir, 'skin-core/src/host-compatibility.mjs'));
const { SkinLibrary } = await import(path.join(pluginDir, 'src/skin-library.mjs'));
const pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8'));

const DSH = '0.2.2-rc.1';
const input = process.argv[2] ?? 'skin';
let temp;

try {
  let skin;
  if (fs.statSync(input).isDirectory()) {
    skin = core.loadSkin(path.resolve(input));
    core.prepareResources(skin);
  } else {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'black-flame-install-'));
    skin = new SkinLibrary(temp).install(path.resolve(input)).skin;
  }

  const modules = core.resolveSettings(skin.manifest, { overrides: {}, disabled: {} }, {
    theme: true, startup: true, pet: true,
  });

  console.log(JSON.stringify({
    valid: true,
    plugin: pkg.version,
    dshVersion: DSH,
    hostSupported: supportsSkinHost(skin.manifest, skin.contentKey, DSH),
    id: skin.manifest.id,
    version: skin.manifest.version,
    contentKey: skin.contentKey,
    assets: Object.keys(skin.manifest.assets).length,
    bytes: Object.values(skin.manifest.assets).reduce((n, a) => n + a.bytes, 0),
    modules: Object.fromEntries(Object.entries(modules).map(([name, m]) => [name, {
      status: m.status,
      reason: m.reason,
      controls: (m.controls ?? []).map(c => `${c.field}=${c.value}`),
    }])),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ valid: false, code: error.code, field: error.field, message: error.message }));
  process.exitCode = 1;
} finally {
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
}
