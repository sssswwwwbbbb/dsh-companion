import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const lab=path.join(root,'.local/dsh-pet-host-20261104');
export const stage=path.join(lab,'staging');
export const report=path.join(root,'reports/dsh-pet-host-2026-11-04');
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()||['node_modules','runtime','runtime-bundles'].includes(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true,filter:p=>!/[\/](node_modules|runtime|runtime-bundles)([\/]|$)/.test(p)});};
const link=(from,to)=>{if(!fs.existsSync(to)){fs.mkdirSync(path.dirname(to),{recursive:true});fs.symlinkSync(from,to);}};
if(import.meta.url===new URL(process.argv[1],'file:').href){
 fs.mkdirSync(lab,{recursive:true});fs.mkdirSync(report,{recursive:true});
 if(!fs.existsSync(path.join(report,'baseline.json'))){
  const prior=JSON.parse(fs.readFileSync(path.join(root,'reports/dsh-pet-geometry-2026-11-04/source-freeze.json')));
  for(const item of prior.files)if(hash(path.join(root,item.path))!==item.sha256)throw new Error('GEOMETRY_FREEZE_DRIFT');
  const originals=[...walk(path.join(root,'runtime-src')),...walk(path.join(root,'packages/dsh-companion')),...walk(path.join(root,'packages/dsh-skin-core')),path.join(root,'scripts/build-client.mjs'),path.join(root,'scripts/build-mac.mjs')];
  fs.writeFileSync(path.join(report,'baseline.json'),JSON.stringify({at:new Date().toISOString(),sourceGeometryFreeze:prior.digest,protectedFiles:originals.map(file=>({file:path.relative(root,file),sha256:hash(file)})),scope:'Root maintained sources and outputs stay read-only; geometry source freeze verified once; no expanded framework matrix'},null,2)+'\n');
 }
 if(!fs.existsSync(path.join(stage,'runtime-src'))){
  copy(path.join(root,'runtime-src'),path.join(stage,'runtime-src'));
  for(const name of ['dsh-companion','dsh-skin-core'])copy(path.join(root,'packages',name),path.join(stage,'packages',name));
  fs.mkdirSync(path.join(stage,'scripts'),{recursive:true});
  for(const name of ['build-client.mjs','build-mac.mjs'])fs.copyFileSync(path.join(root,'scripts',name),path.join(stage,'scripts',name));
  link(path.join(root,'designs'),path.join(stage,'designs'));
  // Both standard builders only read these already-present cache files.
  link(path.join(root,'.cache'),path.join(stage,'.cache'));
  link(path.join(root,'node_modules'),path.join(stage,'node_modules'));
 }
 const geometry=path.join(root,'.local/dsh-pet-geometry-20261104');
 if(!fs.existsSync(path.join(lab,'dsh-pet')))fs.cpSync(path.join(geometry,'package'),path.join(lab,'dsh-pet'),{recursive:true});
 link(path.join(root,'.local/pet-engine-comparison-20261104/env/node_modules'),path.join(lab,'node_modules'));
 const native=path.join(lab,'DshHostPetBackend.app');
 if(!fs.existsSync(native))execFileSync('/usr/bin/ditto',[path.join(root,'.cache/electron/45.2.1/darwin-arm64/Electron.app'),native]);
 for(const [key,value] of [['CFBundleIdentifier','local.dsh.pet-host.backend'],['CFBundleName','DshHostPetBackend'],['CFBundleDisplayName','DSH 隔离新人物']])execFileSync('/usr/libexec/PlistBuddy',['-c','Set :'+key+' '+value,path.join(native,'Contents/Info.plist')]);
 fs.mkdirSync(path.join(lab,'backend-template'),{recursive:true});
 fs.copyFileSync(path.join(geometry,'fixture-base.json'),path.join(lab,'backend-template/config.json'));
 const map=JSON.parse(fs.readFileSync(path.join(geometry,'assets/content-map.json')));
 fs.writeFileSync(path.join(lab,'backend-template/source-geometry.json'),JSON.stringify(map));
 for(const [name,clip] of Object.entries(map.animations))fs.copyFileSync(path.join(root,clip.file),path.join(lab,'backend-template',name+'.webm'));
 for(const name of ['book','cup'])fs.copyFileSync(path.join(geometry,'assets',name+'.png'),path.join(lab,'backend-template',name+'.png'));
 console.log(JSON.stringify({privateStage:stage,backendSource:'fixed 0.4.1 with accepted 8-file content/input patch',officialProfileSeparate:true,oldGeometryTouched:false}));
}
