// 生成 designs/dsh-sky-dragon-v1/skin/skin.json 与资源副本。
// 用法：node scripts/build-skin.mjs [素材包解包目录]
// 素材来源默认读取 /tmp/slifer_pack 下的解包结果，缺失时从 素材/ 的 ZIP 解出。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const project = path.resolve(import.meta.dirname, '..');
const skinDir = path.join(project, 'skin');
const assetDir = path.join(skinDir, 'assets');
const repoRoot = path.resolve(project, '../..');
const zipSource = path.join(repoRoot, '素材/DSH-神之召唤-天空龙皮肤包-v1.0.zip');
const tempPack = '/tmp/slifer_pack/DSH-神之召唤-天空龙皮肤包-v1.0';

if (!fs.existsSync(tempPack)) {
  if (!fs.existsSync('/tmp/slifer_pack')) fs.mkdirSync('/tmp/slifer_pack', {recursive: true});
  execFileSync('ditto', ['-x', '-k', zipSource, '/tmp/slifer_pack']);
}
const src = path.resolve(process.argv[2] || tempPack);

// 工作区图标替换位：来自制作工具包 skin-author-reference 的 50 个键。
const iconKeys = [
  'workspace', 'compose', 'conversation', 'search', 'panel-left', 'folder', 'folder-open',
  'pin', 'archive', 'more', 'attachment', 'link', 'copy', 'retry', 'edit', 'branch',
  'stop', 'chevron-down', 'chevron-right', 'plus', 'terminal', 'external', 'file-code',
  'file-table', 'file-image', 'file-text', 'check', 'clock', 'alert', 'info', 'play', 'pause',
  'close', 'settings', 'sliders', 'sun', 'moon', 'palette', 'download', 'shield', 'expand',
  'plugin', 'skill', 'model', 'agent', 'question', 'plan', 'inbox', 'git-diff',
];

const baseAssets = [
  {id: 'chat-bg', from: 'exports/backgrounds/chat-bg-1440x900.webp', mime: 'image/webp', alpha: false},
  {id: 'opening-poster', from: 'exports/opening/opening-still-1280x720.png', mime: 'image/png', alpha: false},
  {id: 'opening-film', from: 'exports/video/opening-film.mp4', mime: 'video/mp4'},
  {id: 'mark-light', from: 'exports/brand/entry-mark-light-96x96.png', mime: 'image/png', alpha: true},
  {id: 'mark-dark', from: 'exports/brand/entry-mark-dark-96x96.png', mime: 'image/png', alpha: true},
  {id: 'library-cover', from: 'exports/covers/theme-cover-960x600.png', mime: 'image/webp', alpha: false, convert: 'webp'},
  {id: 'badge-scene', from: 'assets-src/badge-512.png', mime: 'image/png', alpha: true, local: true},
  {id: 'workspace-avatar', from: 'exports/avatar-256x256-transparent.png', mime: 'image/png', alpha: true},
];

const iconAssets = iconKeys.flatMap(name => [
  {id: `icon-${name}-light`, from: `exports/icons/light/${name}.png`, mime: 'image/png', alpha: true},
  {id: `icon-${name}-dark`, from: `exports/icons/dark/${name}.png`, mime: 'image/png', alpha: true},
]);

const all = [...baseAssets, ...iconAssets];

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (!b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null;
  return {width: b.readUInt32BE(16), height: b.readUInt32BE(20)};
}

fs.rmSync(assetDir, {recursive: true, force: true});
fs.mkdirSync(assetDir, {recursive: true});

const assets = {};
for (const item of all) {
  const source = item.local ? path.join(project, item.from) : path.join(src, item.from);
  if (!fs.existsSync(source)) throw new Error(`缺少素材: ${item.from}`);
  const ext = path.extname(item.from);
  const target = path.join(assetDir, `${item.id}${ext}`);
  fs.copyFileSync(source, target);
}

// 强调色实心按钮上的图标换成浅色，否则红色图标会隐形（发送 / 停止）。
const recolor = path.join(import.meta.dirname, 'recolor-icons.py');
const python = process.env.PYTHON || (() => {
  const runtime = process.env.HOME ? path.join(process.env.HOME, '.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3') : '';
  return runtime && fs.existsSync(runtime) ? runtime : 'python3';
})();
execFileSync(python, [path.join(import.meta.dirname, 'themed-icons.py'), '--assets', assetDir]);
execFileSync(python, [recolor, assetDir]);
execFileSync(python, [path.join(import.meta.dirname, 'make-cover.py'), assetDir]);

for (const item of all) {
  const ext = item.convert ? '.' + item.convert : path.extname(item.from);
  const target = path.join(assetDir, `${item.id}${ext}`);
  const data = fs.readFileSync(target);
  const entry = {
    path: `assets/${item.id}${ext}`,
    mime: item.mime,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    bytes: data.length,
  };
  const size = pngSize(target);
  if (size) Object.assign(entry, size);
  if (item.mime === 'video/mp4') Object.assign(entry, {width: 1280, height: 720});
  if (item.mime === 'image/webp') Object.assign(entry, {width: 1440, height: 900});
  if (item.alpha !== undefined) entry.alpha = item.alpha;
  entry.source = 'Dr.S 原创素材（素材包 DSH-神之召唤-天空龙皮肤包-v1.0）';
  entry.license = '© Dr.S；作者授权公开分发，详见包内 LICENSE.md';
  assets[item.id] = entry;
}

const tokens = {
  '--dsw-alias-bg-base': ['#F5F0E1', '#1E1637'],
  '--dsw-alias-bg-document-preview': ['#FFF9EB', '#28203E'],
  '--dsw-alias-bg-document-selection': ['#F3DCDC', '#3A1E33'],
  '--dsw-alias-bg-layer-1': ['#FFF9EB', '#2A2046'],
  '--dsw-alias-bg-layer-2': ['#F6EFDD', '#251C3B'],
  '--dsw-alias-bg-layer-3': ['#FFFDF6', '#332651'],
  '--dsw-alias-bg-multi-select': ['#F3DCDC', '#3A1E33'],
  '--dsw-alias-bg-overlay': ['#FFFDF6', '#2C2049'],
  '--dsw-alias-bg-skeleton': ['#EAE2CC', '#28203E'],
  '--dsw-alias-bg-module-platform': ['#EFE7D2', '#231A3A'],
  '--dsw-alias-border-l1': ['#E4DAC0', '#2A2044'],
  '--dsw-alias-border-l2': ['#C9B887', '#3D2E5C'],
  '--dsw-alias-border-l3': ['#A08A5B', '#5A477F'],
  '--dsw-alias-border-l4': ['#7A6C54', '#7E6AA3'],
  '--dsw-alias-border-inverted': ['#2B2416', '#F1E7CF'],
  '--dsw-alias-label-primary': ['#2B2416', '#E6DFD2'],
  '--dsw-alias-label-primary-bluish': ['#A32026', '#E43B3B'],
  '--dsw-alias-label-primary-dimmed': ['#7A6C54', '#9A8BB8'],
  '--dsw-alias-label-primary-foreground': ['#FFF9EB', '#1E1637'],
  '--dsw-alias-label-primary-inverted': ['#FFF9EB', '#1E1637'],
  '--dsw-alias-label-secondary': ['#6B5C45', '#C2B4D9'],
  '--dsw-alias-label-tertiary': ['#7F7159', '#B3A6CB'],
  '--dsw-alias-label-caption': ['#8A7B62', '#B3A6CB'],
  '--dsw-alias-label-dimmed': ['#A89B82', '#8C80AA'],
  '--dsw-alias-label-document-preview': ['#2B2416', '#E6DFD2'],
  '--dsw-alias-menu-group-header-fill': ['#EFE7D2', '#241A3C'],
  '--dsw-alias-menu-icon': ['#6B5C45', '#C2B4D9'],
  '--dsw-alias-scrollbar-bg-l1': ['#DDD3B8', '#2A2044'],
  '--dsw-alias-scrollbar-bg-l2': ['#DDD3B8', '#2A2044'],
  '--dsw-alias-scrollbar-hover-l1': ['#B5A37C', '#4A3A6B'],
  '--dsw-alias-scrollbar-hover-l2': ['#B5A37C', '#4A3A6B'],
  '--dsw-alias-state-business-primary': ['#B52328', '#E43B3B'],
  '--dsw-alias-state-business-tertiary': ['#F3DCDC', '#3A1E33'],
  '--dsw-alias-state-idle-primary': ['#6B5C45', '#B3A6CB'],
  '--dsw-alias-state-success-primary': ['#3A7D44', '#46A960'],
  '--dsw-alias-state-success-secondary': ['#E6F0E3', '#1E3A2B'],
  '--dsw-alias-state-success-tertiary': ['#F0F6EC', '#24402F'],
  '--dsw-alias-state-warn-primary': ['#D48828', '#F2A93B'],
  '--dsw-alias-state-warn-label': ['#8A5A12', '#F2A93B'],
  '--dsw-alias-state-warn-secondary': ['#FAF0DC', '#3A2E1C'],
  '--dsw-alias-state-warn-tertiary': ['#FDF8EE', '#33291A'],
  '--dsw-alias-state-error-primary': ['#C0282E', '#E6454C'],
  '--dsw-alias-state-error-secondary': ['#F9E7E5', '#3B1F2A'],
  '--dsw-alias-switch-thumb': ['#FFFFFF', '#F1E7CF'],
  '--dsw-alias-toast-bg': ['#FFFDF6', '#332651'],
  '--dsw-alias-toast-label': ['#2B2416', '#F1E7CF'],
  '--dsw-alias-tooltip-bg': ['#2B2416', '#0F0A1E'],
  '--dsw-alias-tooltip-key-bg': ['#3E3526', '#28203E'],
  '--dsw-alias-turn-trigger-bg': ['#F1E9D6', '#28203E'],
  '--dsw-alias-turn-trigger-bg-hover': ['#E8DDC3', '#302350'],
  '--dsw-specific-bubble': ['#FFF9EB', '#2C2147'],
  '--dsw-specific-bubble-highlight': ['#F6EDD8', '#362A55'],
  '--dsw-specific-input-major': ['#FFFFFF', '#2A2046'],
  '--dsw-specific-login-input': ['#FFFDF6', '#28203E'],
  '--dsw-specific-menu': ['#FFFDF6', '#2C2049'],
  '--dsw-specific-selector': ['#EFE7D2', '#2A2046'],
  '--dsw-specific-sidebar-fill': ['#EFE7D2', '#21183B'],
  '--dsw-specific-sidebar-nav-item-active': ['#F3DCDC', '#3A1E33'],
  '--dsw-specific-sidebar-nav-item-active-accent': ['#B52328', '#E43B3B'],
  '--dsw-specific-sidebar-nav-item-hover': ['#FAEDEA', '#33203C'],
  '--dsw-specific-tip': ['#FBF3E1', '#28203E'],
};

const manifest = {
  formatVersion: 2,
  id: 'duelist-sky-dragon',
  version: '1.1.0',
  name: '决斗者 · 天空龙',
  description: '无桌宠版：决斗盘米白与夜空神卡两套配色、成套题材化工作区图标、10 秒有声开场、场景提示与回复风格。作者 Dr.S。',
  dshVersions: ['0.2.1-rc.5', '0.2.2-rc.1'],
  cover: 'library-cover',
  character: {
    name: '亚图姆',
    identity: '你是法老王亚图姆，千年积木的持有者。把每一次对话当成一场决斗：用户的问题是要应对的局势，你的分析是展开手牌，执行是召唤与布局。沉稳、克制、判断精准，不虚张声势，也不为气氛牺牲准确。',
    workContext: '在工作区先给结论，再补必要的条件与代价；不确定就直说，不编造。称用户为「决斗者」，不必每句重复。',
  },
  workspaceCues: {
    welcome: {
      text: '决斗者，回来了。',
      default: true,
      seconds: 4,
      position: 'above-input',
      effect: 'fade',
      colors: {
        background: {light: '#F3DCDC', dark: '#3A1E33'},
        text: {light: '#2B2416', dark: '#F1E7CF'},
        border: {light: '#B52328', dark: '#E43B3B'},
      },
    },
    session: {
      text: '换到这一场了。',
      default: false,
      seconds: 3,
      position: 'bottom-right',
      effect: 'slide',
      colors: {
        background: {light: '#F3DCDC', dark: '#3A1E33'},
        text: {light: '#2B2416', dark: '#F1E7CF'},
        border: {light: '#B52328', dark: '#E43B3B'},
      },
    },
    workspace: {
      text: '换了个决斗场。',
      default: false,
      seconds: 3,
      position: 'above-input',
      effect: 'fade',
      colors: {
        background: {light: '#F3DCDC', dark: '#3A1E33'},
        text: {light: '#2B2416', dark: '#F1E7CF'},
        border: {light: '#B52328', dark: '#E43B3B'},
      },
    },
  },
  scenePresets: {
    model: {
      'sky-dragon': {label: '天空龙', badge: 'badge-scene', notice: '神之卡已接入。'},
    },
    workspace: {
      'duel-field': {label: '决斗场', accent: {light: '#B52328', dark: '#E43B3B'}, notice: '决斗场已就绪。'},
      millennium: {label: '千年', accent: {light: '#A8752A', dark: '#FFD36A'}, notice: '千年积木亮起了。'},
    },
  },
  replyStyle: {
    address: '决斗者',
    tone: '语气沉稳克制，结论先行，句子短，不喊口号、不用轻佻语气。可用「回合」「手牌」「召唤」「条件」作比喻，但每三轮最多一次，并保证非玩家也能看懂上下文。报错时归因于条件不满足，不指责用户；用户要求展开时分层详述，否则先给最直接的一步。'
  },
  assets,
  modules: {
    theme: {
      interfaceVersion: 1,
      configVersion: 3,
      required: true,
      config: {
        tokens: Object.fromEntries(Object.entries(tokens).map(([k, [light, dark]]) => [k, {light, dark}])),
        background: 'chat-bg',
        workspacePreset: 'commander-v1',
        semanticIcons: Object.fromEntries(iconKeys.map(name => [name, {
          light: `icon-${name}-light`,
          dark: `icon-${name}-dark`,
        }])),
        entryMarks: {light: 'mark-light', dark: 'mark-dark'},
        workspaceRole: {avatar: 'workspace-avatar', name: '亚图姆', model: 'SKY-DRAGON'},
      },
      settings: {
        backgroundOpacity: {label: '背景浓度', default: 0.04},
        entryMarkEnabled: {label: '入口标识', default: true},
        workFeedbackEnabled: {label: '工作反馈', default: true},
        workspaceDetailsEnabled: {label: '工作区细节', default: true},
        workspaceMotionEnabled: {label: '界面动效', default: true},
      },
    },
    startup: {
      interfaceVersion: 1,
      configVersion: 3,
      required: false,
      config: {
        poster: 'opening-poster',
        video: 'opening-film',
        seconds: 10.08,
        handoffSeconds: 0.35,
        stillSeconds: 1.2,
        greeting: '神之召唤',
        subtitle: '决斗者，展开你的手牌。',
      },
      settings: {
        reducedMotion: {label: '减少开场动态', default: false},
        soundEnabled: {label: '开场声音', default: true},
      },
    },
  },
};

fs.writeFileSync(path.join(skinDir, 'skin.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`assets=${Object.keys(assets).length} tokens=${Object.keys(tokens).length} icons=${iconKeys.length}`);
console.log(`total=${(Object.values(assets).reduce((n, a) => n + a.bytes, 0) / 1048576).toFixed(2)} MiB`);
