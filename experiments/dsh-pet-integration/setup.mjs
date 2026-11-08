import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const lab=path.join(root,'.local/dsh-pet-integration-20261104');
const old=path.join(root,'.local/pet-engine-comparison-20261104');
const report=path.join(root,'reports/dsh-pet-integration-2026-11-04');
const source=path.join(root,'experiments/dsh-pet-integration');
const commit='51c3395d9e175d80fd7e29c6864da3747ebfe209';
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(lab,{recursive:true});
const run=(exe,args)=>execFileSync(exe,args,{cwd:root,stdio:'inherit'});
if(!fs.existsSync(path.join(report,'baseline.json'))){
  const freeze=JSON.parse(fs.readFileSync(path.join(root,'reports/pet-engine-comparison-2026-11-04/source-freeze.json')));
  fs.writeFileSync(path.join(report,'baseline.json'),JSON.stringify({at:new Date().toISOString(),commit,version:'0.4.1',comparisonFreeze:freeze,workingTree:execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'}),readOnlyDependencies:path.relative(root,path.join(old,'env/node_modules')),mediaManifest:JSON.parse(fs.readFileSync(path.join(old,'assets/manifest.json')))},null,2)+'\n');
}
const repo=path.join(lab,'upstream');
if(!fs.existsSync(repo)){
  // The comparison checkout is partial; clone from origin to avoid lazy-fetching
  // or otherwise altering its frozen object database.
  run('git',['clone','--filter=blob:none','--no-checkout','https://github.com/PC2005-cloud/dsh-pet.git',repo]);
  run('git',['-C',repo,'sparse-checkout','set','dsh-pet/src','dsh-pet/runtime','dsh-pet/scripts']);
  run('git',['-C',repo,'fetch','--depth=1','origin',commit]);
  run('git',['-C',repo,'checkout','--detach',commit]);
}
if(execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==commit)throw new Error('FIXED_UPSTREAM_REQUIRED');
if(!fs.existsSync(path.join(lab,'package')))fs.cpSync(path.join(old,'env/node_modules/dsh-pet'),path.join(lab,'package'),{recursive:true});
// Runtime libraries are reused read-only; neither installs nor builds target them.
if(!fs.existsSync(path.join(lab,'node_modules')))fs.symlinkSync(path.join(old,'env/node_modules'),path.join(lab,'node_modules'));
for(const name of ['book.svg','cup.svg'])fs.copyFileSync(path.join(root,'experiments/pet-engine-comparison',name),path.join(source,name));
for(const [home,display] of [['native-home','desktop']]){
 const cfg=JSON.parse(fs.readFileSync(path.join(old,'dsh-home/dsh-pet/main-config.jsonc')));
 cfg.pets[0].display=display;cfg.pets[0].position={corner:'bottom-left',marginX:160,marginY:120};
 cfg.pets[0].name='隔离适配 · 旧机制素材';cfg.animationWeights={idle:20,turn:25,move:55};
 cfg.animations.idle=['idle','look'];cfg.animations.turn=['turn'];
 // Distinct action names keep upstream ended classification unambiguous.
 cfg.animations.events.workStatus=['work','work','work','work','work','work'];
 const dir=path.join(lab,home,'dsh-pet');fs.mkdirSync(path.join(dir,'main-animation/webm'),{recursive:true});
 if(!fs.existsSync(path.join(dir,'main-config.jsonc')))fs.writeFileSync(path.join(dir,'main-config.jsonc'),JSON.stringify(cfg,null,2)+'\n');
 for(const name of fs.readdirSync(path.join(old,'assets')).filter(n=>n.endsWith('.webm')))fs.copyFileSync(path.join(old,'assets',name),path.join(dir,'main-animation/webm',name));
 for(const alias of ['turn','work'])fs.copyFileSync(path.join(old,'assets/react.webm'),path.join(dir,'main-animation/webm',alias+'.webm'));
}
for(const [name,suffix] of [['PetIntegrationConsole','console'],['PetIntegrationNative','native']]){
 const app=path.join(lab,name+'.app');
 if(!fs.existsSync(app))run('/usr/bin/ditto',[path.join(root,'.cache/electron/45.2.1/darwin-arm64/Electron.app'),app]);
 run('/usr/libexec/PlistBuddy',['-c','Set :CFBundleIdentifier local.dsh.pet-integration.'+suffix,path.join(app,'Contents/Info.plist')]);
 run('/usr/libexec/PlistBuddy',['-c','Set :CFBundleName '+name,path.join(app,'Contents/Info.plist')]);
 run('/usr/libexec/PlistBuddy',['-c','Set :CFBundleDisplayName '+name,path.join(app,'Contents/Info.plist')]);
}
console.log(JSON.stringify({lab,upstream:commit,version:'0.4.1',separateGitDatabase:true,comparisonWritten:false}));
