import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '45.2.1';
const expected = 'a9a1a0a5b64df714957f83467c84823cb34792205922c6f136550b2403605922';
const cache = path.join(root, '.cache/electron', version);
if(process.platform!=='darwin'||process.arch!=='arm64')throw new Error('Mac dev.27 requires macOS arm64');
const archive = path.join(cache, `electron-v${version}-darwin-arm64.zip`);
if (!fs.existsSync(archive)) throw new Error('DOWNLOAD_VERIFIED_ELECTRON_FIRST');
if (createHash('sha256').update(fs.readFileSync(archive)).digest('hex') !== expected) throw new Error('ELECTRON_ARCHIVE_HASH_MISMATCH');
const unpacked = path.join(cache, 'darwin-arm64');
fs.rmSync(unpacked, { recursive: true, force: true });
fs.mkdirSync(unpacked, { recursive: true });
execFileSync('/usr/bin/ditto', ['-x', '-k', archive, unpacked]);
// The repository keeps a placeholder service URL; the real endpoint stays on the
// owner's machine in .local and is injected only into local builds.
const profile=process.env.DSH_BUILD_PROFILE||'official';
const serviceUrlFile=path.join(root,'.local/cloud/service-url.txt'),configFile=path.join(root,'packages/dsh-companion/config/service.json');
const configured=fs.existsSync(serviceUrlFile)?fs.readFileSync(serviceUrlFile,'utf8').trim():'';
const endpoint=profile==='community'?'https://license-host.invalid/dsh-companion':configured;
if(profile!=='community'&&(!endpoint||endpoint.includes('license-host.invalid')))throw new Error('OFFICIAL_BUILD_REQUIRES_REAL_ENDPOINT');
if(!['official','community'].includes(profile))throw new Error('UNKNOWN_BUILD_PROFILE');
{const original=fs.readFileSync(configFile,'utf8'),cfg=JSON.parse(original);cfg.serviceUrl=endpoint;fs.writeFileSync(configFile,JSON.stringify(cfg,null,2)+'\n');fs.mkdirSync(path.join(root,'.local/cloud'),{recursive:true});fs.writeFileSync(path.join(root,'.local/cloud/service-config.orig.json'),original);}
const target = path.join(root, 'packages/dsh-companion/runtime/darwin-arm64/DSHCompanion.app');
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
execFileSync('/usr/bin/ditto', [path.join(unpacked, 'Electron.app'), target]);
const contents = path.join(target, 'Contents');
const payload = path.join(contents, 'Resources/app');
fs.mkdirSync(payload, { recursive: true });
fs.cpSync(path.join(root, 'runtime-src'), payload, { recursive: true });
const petInputs=path.join(root,'runtime-src/pet-backend/dsh-pet');
const petPayload=path.join(payload,'pet-backend/dsh-pet');
fs.cpSync(path.join(petInputs,'lib'),path.join(petPayload,'lib'),{recursive:true});
fs.cpSync(path.join(petInputs,'assets/pic'),path.join(petPayload,'assets/pic'),{recursive:true});
fs.cpSync(path.join(root,'packages/dsh-skin-core'),path.join(payload,'skin-core'),{recursive:true,filter:source=>!/[\\/](tests|scripts|examples)([\\/]|$)/.test(source)});
for(const name of ['license-core.mjs','packs.mjs','storage.mjs','integration.mjs','host-window.mjs'])fs.copyFileSync(path.join(root,'packages/dsh-companion/src',name),path.join(payload,name));
fs.cpSync(path.join(root,'packages/dsh-companion/config'),path.join(payload,'config'),{recursive:true});
fs.copyFileSync(path.join(root, 'designs/dsh-companion-v1/behavior.mjs'), path.join(payload, 'behavior.mjs'));
fs.cpSync(path.join(root, 'packages/dsh-companion/packs'), path.join(payload, 'packs'), { recursive: true });
fs.cpSync(path.join(root, 'designs/dsh-companion-v1/assets'), path.join(payload, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'designs/dsh-companion-v1/ASSET-NOTICE.txt'), path.join(payload, 'ASSET-NOTICE.txt'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(payload, 'LICENSE'));
const pluginVersion = JSON.parse(fs.readFileSync(path.join(root, 'packages/dsh-companion/package.json'))).version;
const launchBin=path.join(root,'packages/dsh-companion/bin/darwin-arm64');fs.mkdirSync(launchBin,{recursive:true});
execFileSync('/usr/bin/clang',['-O2',path.join(root,'runtime-src/launcher.c'),'-o',path.join(launchBin,'companion-launch')],{stdio:'pipe'});
const settings = { CFBundleIdentifier: 'local.dsh.companion.development', CFBundleName: 'DSHCompanion', CFBundleDisplayName: '主题盒子', CFBundleShortVersionString: pluginVersion.split('-')[0], CFBundleVersion: String(JSON.parse(fs.readFileSync(path.join(root, 'packages/dsh-companion/package.json'))).build??pluginVersion.match(/dev\.(\d+)/)?.[1]??1) };
for (const [key, value] of Object.entries(settings)) execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, path.join(contents, 'Info.plist')]);
execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', '--timestamp=none', target], { stdio: 'pipe' });
// This is a local developer bundle. A distributable release needs our own signing
// and notarization; this does not touch the installed DeepSeek Harness app.
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/mac-build.json'), JSON.stringify({ at: new Date().toISOString(), platform: 'darwin-arm64', electron: version, archiveSha256: expected, matchedOfficialReleaseDigest: true, app: target, localSigning: 'ad-hoc-development', distributionSigning: 'not-yet-configured' }, null, 2) + '\n');
console.log(target);
