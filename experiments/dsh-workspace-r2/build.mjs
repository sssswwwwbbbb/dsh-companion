import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,lab,stage,report} from './setup.mjs';
const source=path.join(root,'experiments/dsh-workspace-r2/client'),adapters=path.join(stage,'packages/dsh-skin-core/adapters');
for(const [from,to] of [['workspace-r2.mjs','workspace-r2.mjs'],['performance.mjs','workspace-performance.mjs'],['leaves.json','workspace-leaves.json']])fs.copyFileSync(path.join(source,from),path.join(adapters,to));
fs.writeFileSync(path.join(adapters,'workspace-r2.css'),fs.readFileSync(path.join(source,'performance.css'),'utf8')+'\n'+fs.readFileSync(path.join(source,'preset.css'),'utf8'));
const builder=path.join(stage,'scripts/build-client.mjs');let code=fs.readFileSync(builder,'utf8');
if(!code.includes('const workspaceCode=')){
 code=code.replace("const sessionFeedback=",`const workspaceBase=new URL('../packages/dsh-skin-core/adapters/',import.meta.url);
const workspaceCode='const WORKSPACE_R2_STYLE='+JSON.stringify(readFileSync(new URL('workspace-r2.css',workspaceBase),'utf8'))+';\\nconst WORKSPACE_R2_LEAVES='+readFileSync(new URL('workspace-leaves.json',workspaceBase),'utf8')+';\\n'+readFileSync(new URL('workspace-performance.mjs',workspaceBase),'utf8').replace('export function createArchivePerformance','function createArchivePerformance')+'\\n'+readFileSync(new URL('workspace-r2.mjs',workspaceBase),'utf8').replace('export function installWorkspaceR2','function installWorkspaceR2');
const sessionFeedback=`);
 code=code.replace(".replace('export function installSkinPage','function installSkinPage')", ".replace(/^import \\{installWorkspaceR2\\} from '\\.\\/workspace-r2\\.mjs';\\n/m,'').replace('export function installSkinPage','function installSkinPage')");
 code=code.replace("()=>sessionFeedback+'\\n'+skinClient","()=>workspaceCode+'\\n'+sessionFeedback+'\\n'+skinClient");
 code=code.replace("writeFileSync(new URL('client.js',base)",`const workspaceSkin=loadSkin(fileURLToPath(new URL('skins/archive-workspace-r2-private/',base)));
const portrait=workspaceSkin.manifest.assets[workspaceSkin.manifest.modules.theme.config.workspaceRole.portrait];
settingsAssets.workspace={contentKey:workspaceSkin.contentKey,portrait:'data:image/png;base64,'+readFileSync(new URL('skins/archive-workspace-r2-private/'+portrait.path,base)).toString('base64')};
writeFileSync(new URL('client.js',base)`);
 fs.writeFileSync(builder,code);
}
// Dependencies stay read-only. Standard builders only write this new stage.
const deps=path.join(stage,'packages/dsh-companion/node_modules');fs.mkdirSync(deps,{recursive:true});
for(const [name,target] of [['@deepseek-ai','/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai'],['undici',path.join(root,'.local/pet-engine-comparison-20261104/env/node_modules/undici')],['fflate',path.join(root,'packages/dsh-companion/node_modules/fflate')]]){const to=path.join(deps,name);if(!fs.existsSync(to)&&!fs.lstatSync(path.dirname(to)).isSymbolicLink())try{fs.symlinkSync(target,to);}catch(error){if(error.code!=='EEXIST')throw error;}}
for(const script of ['build-client.mjs','build-mac.mjs'])execFileSync(process.execPath,[path.join(stage,'scripts',script)],{cwd:stage,stdio:'pipe'});
fs.writeFileSync(path.join(report,'build.json'),JSON.stringify({at:new Date().toISOString(),privateStage:stage,builders:['build-client','build-mac'],canonicalChanged:false,previousPetHostChanged:false})+'\n');
console.log(JSON.stringify({built:true,stage}));
