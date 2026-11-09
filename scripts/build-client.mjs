import fs, { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import {loadSkin,prepareResources} from '../packages/dsh-skin-core/src/resources.mjs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const base = new URL('../packages/dsh-companion/', import.meta.url);
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const CoverBuffer = value => Buffer.from(value);
const inputs=new URL('../tests/fixtures/',import.meta.url);
const workspaceSource=new URL('archive-workspace-r2-private/',inputs);
if(!existsSync(new URL('skin.json',workspaceSource)))throw new Error('Missing fixture skin in tests/fixtures');
// No bundled skin: skins come from the cloud library and stay in the user's
// profile. The source skin here only supplies settings-page artwork and the
// defaults baked into client.js.
rmSync(new URL('skins/',base),{recursive:true,force:true});
const buildProfile=process.env.DSH_BUILD_PROFILE||'official';
const packageFile=fileURLToPath(new URL('package.json',base));
{const original=readFileSync(packageFile,'utf8'),metadata=JSON.parse(original);const files=metadata.files||[];const without=files.filter(name=>name!=='skins');metadata.files=buildProfile==='community'?[...without,'skins']:without;writeFileSync(packageFile,JSON.stringify(metadata,null,2)+'\n');mkdirSync(path.join(projectRoot,'.local/cloud'),{recursive:true});writeFileSync(path.join(projectRoot,'.local/cloud/package-json.orig.json'),original);}

if(buildProfile==='community'){
  const {unzipSync}=await import('fflate');
  const skinsDir=path.resolve(fileURLToPath(new URL('skins/',base)));
  const bundledSkins=[
    ['designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/commander-workspace-private-1.0.1.zip'],
    ['designs/dsh-black-flame-v1/black-flame-0.2.4.zip'],
    ['designs/dsh-sky-dragon-v1/duelist-sky-dragon-1.1.0.zip']
  ];
  for(const [relative] of bundledSkins){
    const file=path.join(projectRoot,relative);
    if(!existsSync(file))throw new Error('MISSING_BUNDLED_SKIN: '+relative);
    const entries=unzipSync(new Uint8Array(readFileSync(file)));
    const manifest=JSON.parse(Buffer.from(entries['skin.json']).toString('utf8'));
    if(!/^[a-z][a-z0-9-]{2,63}$/.test(manifest.id))throw new Error('BUNDLED_SKIN_ID_INVALID');
    for(const [name,data] of Object.entries(entries)){
      if(name.endsWith('/'))continue;
      const target=path.join(skinsDir,manifest.id,name);
      if(!target.startsWith(skinsDir+path.sep))continue;
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,CoverBuffer(data));
    }
  }
}
if(!readFileSync(new URL('../runtime-src/settings.mjs',import.meta.url)).equals(readFileSync(new URL('src/settings.mjs',base))))throw new Error('PLUGIN_RUNTIME_SETTINGS_MISMATCH');
const workspaceSkin=loadSkin(fileURLToPath(workspaceSource));prepareResources(workspaceSkin);
mkdirSync(new URL('../reports/',import.meta.url),{recursive:true});
writeFileSync(new URL('../reports/bundled-skins.json',import.meta.url),JSON.stringify({localReviewOnly:true,shippedWithPlugin:false,bundled:[],note:'skins are not bundled; they are installed from the cloud skin library'},null,2)+'\n');
rmSync(new URL('skin-core/',base),{recursive:true,force:true});
const locales = Object.fromEntries(['zh','en'].map(locale => [locale,JSON.parse(readFileSync(new URL(`locale/${locale}.json`,base),'utf8'))]));
cpSync(new URL('../packages/dsh-skin-core/',import.meta.url),new URL('skin-core/',base),{recursive:true,filter:source=>!/[\\/](tests|scripts|examples)([\\/]|$)/.test(source)});
const skinClient=readFileSync(new URL('../packages/dsh-skin-core/adapters/page-client.mjs',import.meta.url),'utf8').replace(/^import \{installSessionFeedback\} from '\.\/session-feedback\.mjs';\n/m,'').replace(/^import \{installWorkspaceR2\} from '\.\/workspace-r2\.mjs';\n/m,'').replace(/^import \{installWorkspaceCommander\} from '\.\/workspace-commander\.mjs';\n/m,'').replace('export function installSkinPage','function installSkinPage');
const workspaceBase=new URL('../packages/dsh-skin-core/adapters/',import.meta.url);
const workspaceCode='const WORKSPACE_R2_STYLE='+JSON.stringify(readFileSync(new URL('workspace-r2.css',workspaceBase),'utf8'))+';\nconst WORKSPACE_R2_LEAVES='+readFileSync(new URL('workspace-leaves.json',workspaceBase),'utf8')+';\n'+readFileSync(new URL('workspace-performance.mjs',workspaceBase),'utf8').replace('export function createArchivePerformance','function createArchivePerformance')+'\n'+readFileSync(new URL('workspace-r2.mjs',workspaceBase),'utf8').replace('export function installWorkspaceR2','function installWorkspaceR2');
const presentationFiles=['workspace-commander.css','commander-state.mjs','workspace-commander.mjs'];
const presentation= createHash('sha256').update(JSON.stringify(presentationFiles.map(file=>readFileSync(new URL(file,workspaceBase),'utf8')))).digest('hex');
const commanderCode='const WORKSPACE_COMMANDER_BUILD='+JSON.stringify(presentation)+';\nconst WORKSPACE_COMMANDER_STYLE='+JSON.stringify(readFileSync(new URL('workspace-commander.css',workspaceBase),'utf8'))+';\n'+readFileSync(new URL('commander-state.mjs',workspaceBase),'utf8').replace(/^export /gm,'')+'\n'+readFileSync(new URL('workspace-commander.mjs',workspaceBase),'utf8').replace(/^import \{commanderState\} from '\.\/commander-state\.mjs';\n/m,'').replace('export function installWorkspaceCommander','function installWorkspaceCommander');
const sessionFeedback=readFileSync(new URL('../packages/dsh-skin-core/adapters/session-feedback.mjs',import.meta.url),'utf8').replace('export function installSessionFeedback','function installSessionFeedback');
const cueContract=readFileSync(new URL('../packages/dsh-skin-core/src/workspace-cues.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const cueTracker=cueContract+'\n'+readFileSync(new URL('src/workspace-cue-tracker.mjs',base),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const clientRequests=readFileSync(new URL('src/client-requests.mjs',base),'utf8').replace(/^export /gm,'');
const settingsUi=readFileSync(new URL('src/skin-settings-ui.mjs',base),'utf8').replace(/^export /gm,'');
const settingsAssets={};
writeFileSync(new URL('client.js',base),readFileSync(new URL('src/client.template.js',base),'utf8').replace('__LOCALES__',()=>JSON.stringify(locales)).replace('__SKIN_CLIENT__',()=>workspaceCode+'\n'+commanderCode+'\n'+sessionFeedback+'\n'+cueTracker+'\n'+skinClient).replace('__CLIENT_REQUESTS__',()=>clientRequests).replace('__SKIN_SETTINGS_UI__',()=>settingsUi).replace('__SKIN_SETTINGS_ASSETS__',()=>JSON.stringify(settingsAssets)));
