import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const recipe=fileURLToPath(new URL('.',import.meta.url));
const accepted=path.join(root,'.local/dsh-commander-cold-start-20261105');
const base=path.join(root,'.local/dev19-candidate-80tc_gs4');
const stage=path.resolve(process.argv[2]||path.join(root,'.local/dsh-cold-start-dev22-build'));
const contentKey='3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16';
const legacyKey='4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b';
const version=process.argv[3]||'0.1.0-dev.22';
if(!['0.1.0-dev.22','0.1.0-dev.23','0.1.0-dev.24','0.1.0-dev.25','0.1.0-dev.26','0.1.0-dev.27'].includes(version))throw new Error('UNKNOWN_BUILD_VERSION');
const build=Number(version.split('.').at(-1));
const read=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report=path.join(root,'reports/dsh-commander-cold-start-2026-11-05');
const primary=read(path.join(report,'primary-review/review.json'));
if(primary.decision!=='accepted-local-isolated-macos-three-item-closeout'||primary.candidate.contentKey!==contentKey)throw new Error('REVIEWED_CONTENT_REQUIRED');
for(const item of read(path.join(report,'build.json')).files){
 if(sha(path.join(accepted,'staging/packages/dsh-companion',item.file))!==item.sha256)throw new Error('REVIEWED_BUILD_CHANGED: '+item.file);
}
const dev19=path.join(base,'dist/dsh-plugin-companion-0.1.0-dev.19.tgz');
if(sha(dev19)!=='d645d0b0e0d807b193004199e37ac11ca0501070bb734d1543565a07ea90d673')throw new Error('DEV19_ARCHIVE_CHANGED');
if(build>=24&&sha(path.join(root,'dist/dsh-plugin-companion-0.1.0-dev.23.tgz'))!=='bf8d662d12efccb598ffcec5985f3ee2b5829ac7148bcdd92562e95800ab5d0f')throw new Error('DEV23_ARCHIVE_CHANGED');
if(build>=25&&sha(path.join(root,'dist/dsh-plugin-companion-0.1.0-dev.24.tgz'))!=='40fcbd20b9db56718ff4ca60c86f7833a6420531ba6ff27513d7a29c4275dd57')throw new Error('DEV24_ARCHIVE_CHANGED');
if(build>=26&&sha(path.join(root,'dist/dsh-plugin-companion-0.1.0-dev.25.tgz'))!=='6836bf29efae26336dd2ed47e06035a77f79f2bd50e65d3292ded18efb540a81')throw new Error('DEV25_ARCHIVE_CHANGED');
if(build>=27&&sha(path.join(root,'dist/dsh-plugin-companion-0.1.0-dev.26.tgz'))!=='5130521f51eaf6dbfd4bfecac2769f709bbac9c23798d622e7fb1c90c02e809d')throw new Error('DEV26_ARCHIVE_CHANGED');
if(fs.existsSync(stage))throw new Error('BUILD_STAGE_ALREADY_EXISTS');
fs.mkdirSync(stage,{recursive:true,mode:0o700});
function copy(source,target){
 const destination=path.join(stage,target);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.cpSync(source,destination,{recursive:true,filter:file=>!['.DS_Store','node_modules','tests','scripts','examples'].includes(path.basename(file))});
}
const fromAccepted=file=>copy(path.join(accepted,'staging',file),file);
const fromBase=file=>copy(path.join(base,file),file);
fromBase('package.json');
fromBase('scripts/package-mac.mjs');
for(const file of ['scripts/build-client.mjs','scripts/build-mac.mjs','runtime-src','packages/dsh-skin-core'])fromAccepted(file);
fromBase('runtime-src/main.mjs');
fs.rmSync(path.join(stage,'runtime-src/candidate-map.mjs'));
const plugin='packages/dsh-companion';
for(const file of ['README.md','index.js','src','locale','package.json','cordis.patch.yml','icon.svg','packs'])fromAccepted(plugin+'/'+file);
fromBase(plugin+'/config/service.json');
for(const file of ['ASSET-NOTICE.txt','behavior.mjs','assets'])fromBase('designs/dsh-companion-v1/'+file);
for(const file of ['content/archive-warm-whale-startup-m6-ready','assets/whale-unified-r2/character-atlas-r2.png'])fromBase('designs/dsh-skin-v1/'+file);

const skin=plugin+'/skins/archive-workspace-r2-private';
const source=path.join(accepted,'staging',skin);
const manifest=read(path.join(source,'skin.json'));
for(const file of ['skin.json',...Object.values(manifest.assets).map(asset=>asset.path)])copy(path.join(source,file),skin+'/'+file);
const vendor='runtime-src/pet-backend/dsh-pet',upstream=path.join(accepted,'dsh-pet');
for(const file of ['LICENSE','assets/config.jsonc','assets/pic/cursor-grab.png','assets/pic/cursor-grabbing.png',
 'lib/app.js','lib/chunk-BI7llAj_.js','lib/promise-DLDcTBDg.js','lib/dist-DpF6qLoG.js','lib/node-BUxc_9IN.js','lib/node-BUn5KyQv.js','lib/node-y67FhQSo.js','runtime/electron-helper']){
 copy(path.join(upstream,file),vendor+'/'+file);
}
const helper=path.join(stage,vendor,'runtime/electron-helper');
for(const file of ['content-context.js','content-profiles.js','content-assets','main/smoke.js'])fs.rmSync(path.join(helper,file),{recursive:true,force:true});
write(path.join(stage,vendor,'package.json'),{name:'dsh-pet',version:'0.4.1',type:'module',license:'MIT',private:true});
const registry=read(path.join(accepted,'backend-template/runtime-candidates.json')).contents[contentKey];
const media=Object.fromEntries(Object.entries(registry.media).map(([action,entry])=>{
 const id=path.basename(entry.file,'.webm');
 if(manifest.assets[id]?.sha256!==entry.sha256)throw new Error('REVIEWED_MEDIA_MISMATCH: '+action);
 return [action,{...entry,id}];
}));
if(registry.props.length!==0)throw new Error('UNEXPECTED_PROPS');
write(path.join(stage,'runtime-src/pet-backend/skin.json'),{contentKey,name:registry.name,geometry:registry.geometry,walk:registry.walk,media});
copy(path.join(accepted,'backend-template/config.json'),'runtime-src/pet-backend/config.json');
const names=Object.fromEntries(Object.entries(media).map(([action,entry])=>[entry.id,{group:'master',loop:action==='idle',movement:action==='walk'}]));
names[media.walk.id].turnFront=media.turnFront.id;
if(build>=25)names[media.idle.id].parkIdle=true;
fs.writeFileSync(path.join(helper,'content-profiles.js'),'globalThis.DshContentProfiles='+JSON.stringify({
 profiles:{master:{...registry.geometry,id:'master',mirrorAllowed:false,props:[]}},animations:names,props:{},
})+';\n');
fs.writeFileSync(path.join(helper,'content-context.js'),'globalThis.DshCompanionContent='+JSON.stringify({contentKey,group:'master',managedHost:true})+';\n');

for(const file of ['package.json','runtime-src/package.json',plugin+'/package.json']){
 const target=path.join(stage,file);
 const meta={...read(target),version};
 if(file==='runtime-src/package.json')meta.main='entry.mjs';
 write(target,meta);
}
const electron='.cache/electron/45.2.1/electron-v45.2.1-darwin-arm64.zip';
copy(path.join(root,electron),electron);
if(fs.existsSync(path.join(recipe,'install.patch')))execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,'install.patch')],{cwd:stage});
if(version!=='0.1.0-dev.22')execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,'attached-launcher.patch')],{cwd:stage});
if(build>=24)for(const patch of ['opening-hotfix.patch','compact-companion.patch']){
 execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,patch)],{cwd:stage});
}
if(build>=25)execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,'park-idle.patch')],{cwd:stage});
if(fs.existsSync(path.join(recipe,'overlay')))fs.cpSync(path.join(recipe,'overlay'),stage,{recursive:true});
if(build>=26)execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,'desktop-entry-and-resize.patch')],{cwd:stage});
if(build>=27)execFileSync('/usr/bin/patch',['-s','-p1','-i',path.join(recipe,'dsh-022-compatibility.patch')],{cwd:stage});
const {loadSkin,prepareResources}=await import(path.join(stage,'packages/dsh-skin-core/src/resources.mjs'));
for(const [relative,key] of [[skin,contentKey],['designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready',legacyKey]]){
 const snapshot=loadSkin(path.join(stage,relative));
 if(snapshot.contentKey!==key)throw new Error('BUNDLED_SKIN_CONTENT_CHANGED');
 prepareResources(snapshot);
}
console.log(stage);
