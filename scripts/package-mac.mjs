import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = path.join(root, 'packages/dsh-companion');
const bundles = path.join(packageDir, 'runtime-bundles');
const application = path.join(packageDir, 'runtime/darwin-arm64/DSHCompanion.app');
const dist = path.join(root, 'dist');
const profile = process.env.DSH_BUILD_PROFILE || 'official';
if(!['official','community'].includes(profile)) throw new Error('UNKNOWN_BUILD_PROFILE');
fs.mkdirSync(bundles, { recursive: true });fs.mkdirSync(dist, { recursive: true });
execFileSync('/usr/bin/codesign', ['--verify', '--strict', application], { stdio: 'pipe' });
const archive = path.join(bundles, 'DSHCompanion-darwin-arm64.zip');
if (fs.existsSync(archive)) fs.rmSync(archive);
execFileSync('/usr/bin/ditto', ['-c', '-k', '--norsrc', '--keepParent', application, archive]);
const sha256 = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
const version = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'))).version;
fs.writeFileSync(path.join(bundles, 'manifest.json'), JSON.stringify({ schemaVersion: 1, platform: 'darwin-arm64', version, sha256, localSigning: 'ad-hoc-development' }, null, 2)+'\n');
// Community builds pack into a private temp directory so they can never
// overwrite an official package with the same name in dist/.
const packDir = profile === 'community' ? fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-community-pack-')) : dist;
const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], { cwd: packageDir, encoding: 'utf8', maxBuffer: 2*1024*1024 }))[0];
if (packed.files.some(row => /(?:^|\/)(?:bridge\.json|settings\.json|chromium|\.local|\.cache|node_modules)(?:\/|$)/.test(row.path))) throw new Error('PRIVATE_STATE_IN_PACKAGE');
if (packed.files.some(row => row.path.startsWith('runtime/'))) throw new Error('LOOSE_APP_IN_NPM_PACKAGE');
if(packed.files.some(row=>/(?:^|\/)(?:signing-private\.pem|admin\.token|database\.json|license\.json|activation\.json)$/.test(row.path)))throw new Error('LICENSING_SECRET_IN_PACKAGE');
let output = path.join(packDir, packed.filename);
if(profile==='community'){const renamed=path.join(dist, packed.filename.replace(/\.tgz$/,'-community-darwin-arm64.tgz'));fs.renameSync(output,renamed);output=renamed;}
fs.writeFileSync(path.join(root, 'reports/mac-package.json'), JSON.stringify({ at:new Date().toISOString(), version, file:output, sizeBytes:fs.statSync(output).size, sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'), includesDesktopRuntime:true, privateStateIncluded:false, files:packed.files.map(row=>row.path), signing:'local-development', publication:'local-only' }, null, 2)+'\n');
// The packaged endpoint must match the build profile: official -> real endpoint,
// community -> placeholder. Never ship one under the other's name.
const packedConfig=JSON.parse(fs.readFileSync(path.join(packageDir,'config/service.json'),'utf8'));
if(profile==='community'){if(!packedConfig.serviceUrl.includes('license-host.invalid'))throw new Error('COMMUNITY_BUILD_HAS_REAL_ENDPOINT');if(packedConfig.channel!=='community')throw new Error('COMMUNITY_BUILD_CHANNEL_MISMATCH');}
else{const endpoint=fs.readFileSync(path.join(root,'.local/cloud/service-url.txt'),'utf8').trim();if(packedConfig.serviceUrl!==endpoint)throw new Error('SERVICE_ENDPOINT_NOT_INJECTED');}
const originalPackageFile=path.join(root,'.local/cloud/package-json.orig.json');
if(fs.existsSync(originalPackageFile)){fs.copyFileSync(originalPackageFile,path.join(packageDir,'package.json'));fs.rmSync(originalPackageFile,{force:true});}
const originalConfig=path.join(root,'.local/cloud/service-config.orig.json');
if(fs.existsSync(originalConfig)){fs.copyFileSync(originalConfig,path.join(packageDir,'config/service.json'));fs.rmSync(originalConfig,{force:true});}
console.log(output);
