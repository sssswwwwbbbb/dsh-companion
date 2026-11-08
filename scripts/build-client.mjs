import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import {loadSkin,prepareResources} from '../packages/dsh-skin-core/src/resources.mjs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const base = new URL('../packages/dsh-companion/', import.meta.url);
const inputs=new URL('../.local/accepted-inputs/',import.meta.url);
const workspaceSource=new URL('skins/archive-workspace-r2-private/',inputs);
if(!existsSync(new URL('skin.json',workspaceSource)))throw new Error('Missing accepted Cold Start build input');
// Retire the MVP built-in, including leftovers from an earlier local build.
rmSync(new URL('skins/archive-warm-whale/',base),{recursive:true,force:true});
if(!readFileSync(new URL('../runtime-src/settings.mjs',import.meta.url)).equals(readFileSync(new URL('src/settings.mjs',base))))throw new Error('PLUGIN_RUNTIME_SETTINGS_MISMATCH');
const workspaceSkin=loadSkin(fileURLToPath(workspaceSource));prepareResources(workspaceSkin);
const workspaceTarget=new URL('skins/archive-workspace-r2-private/',base);
rmSync(workspaceTarget,{recursive:true,force:true});cpSync(workspaceSource,workspaceTarget,{recursive:true});
mkdirSync(new URL('../reports/',import.meta.url),{recursive:true});
writeFileSync(new URL('../reports/bundled-skins.json',import.meta.url),JSON.stringify({localReviewOnly:true,skins:[{id:workspaceSkin.manifest.id,version:workspaceSkin.manifest.version,contentKey:workspaceSkin.contentKey,source:'.local/accepted-inputs/skins/archive-workspace-r2-private',target:'packages/dsh-companion/skins/archive-workspace-r2-private',assets:Object.keys(workspaceSkin.manifest.assets).length}]},null,2)+'\n');
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
const clientRequests=readFileSync(new URL('src/client-requests.mjs',base),'utf8').replace('export function createClientRequestGate','function createClientRequestGate');
const settingsUi=readFileSync(new URL('src/skin-settings-ui.mjs',base),'utf8').replace(/^export /gm,'');
const settingsAssets={};
const portrait=workspaceSkin.manifest.assets[workspaceSkin.manifest.modules.theme.config.workspaceRole.portrait];
settingsAssets.workspace={contentKey:workspaceSkin.contentKey,portrait:'data:image/png;base64,'+readFileSync(new URL('skins/archive-workspace-r2-private/'+portrait.path,base)).toString('base64')};

settingsAssets.workspace.preset=workspaceSkin.manifest.modules.theme.config.workspacePreset;
const role=workspaceSkin.manifest.modules.theme.config.workspaceRole;
if(role.name&&role.model)settingsAssets.workspace.roleLabel=role.name+' · '+role.model;
const cover=workspaceSkin.manifest.assets['workspace-cover'];
settingsAssets.workspace.cover='data:image/png;base64,'+readFileSync(new URL('skins/archive-workspace-r2-private/'+cover.path,base)).toString('base64');
settingsAssets.workspace.controlIcons={};
for(const [control,key]of Object.entries({library:'archive',install:'download',settings:'sliders',more:'more',shield:'shield',pause:'pause',play:'play',reset:'retry',arrow:'chevron-right'})){
 settingsAssets.workspace.controlIcons[control]=Object.fromEntries(Object.entries(workspaceSkin.manifest.modules.theme.config.semanticIcons[key]).map(([mode,id])=>[mode,'data:image/png;base64,'+readFileSync(new URL('skins/archive-workspace-r2-private/'+workspaceSkin.manifest.assets[id].path,base)).toString('base64')]));
}
writeFileSync(new URL('client.js',base),readFileSync(new URL('src/client.template.js',base),'utf8').replace('__LOCALES__',()=>JSON.stringify(locales)).replace('__SKIN_CLIENT__',()=>workspaceCode+'\n'+commanderCode+'\n'+sessionFeedback+'\n'+cueTracker+'\n'+skinClient).replace('__CLIENT_REQUESTS__',()=>clientRequests).replace('__SKIN_SETTINGS_UI__',()=>settingsUi).replace('__SKIN_SETTINGS_ASSETS__',()=>JSON.stringify(settingsAssets)));
