import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {SkinLibrary} from '../packages/dsh-companion/src/skin-library.mjs';
import {CompanionSkins} from '../packages/dsh-companion/src/skins.mjs';
import {CompanionController} from '../packages/dsh-companion/src/controller.mjs';
import {digest,atomicJson} from '../packages/dsh-skin-core/src/index.mjs';
const {zipSync}=createRequire(new URL('../packages/dsh-companion/package.json',import.meta.url))('fflate');
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-library-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const fixtureManifest=(id='library-synthetic',version='1.0.0')=>({formatVersion:2,id,version,name:'隔离合成 · '+id,description:'仅用于隔离验证，不是正式皮肤',dshVersions:['0.2.1-rc.5'],assets:{},modules:{theme:{interfaceVersion:1,configVersion:1,required:true,config:{tokens:{'--dsw-alias-bg-base':{light:'#faf5ee',dark:'#232423'}}},settings:{backgroundOpacity:{label:'背景浓度',default:.02}}}}});
function zip(dir,manifest,extra={}){const file=path.join(dir,'fixture-'+Math.random().toString(16).slice(2)+'.zip');fs.writeFileSync(file,zipSync({'skin.json':Buffer.from(JSON.stringify(manifest)),...extra}));return file;}
function service(dir){
  const controller={stateDir:dir,dshVersion:'0.2.1-rc.5',entitlement:{require(){},status:()=>({active:true})},nativeStatus:async()=>({})},skins=new CompanionSkins(controller);controller.status=()=>({skin:skins.status()});
  const adapters=Object.fromEntries(['theme','pet','startup'].map(module=>[module,{visible:null,available:()=>true,invalidate(){},prepare:()=>({}),async apply(c){c.assertCurrent();this.visible=c.skin.contentKey;return {ready:true};},async exit(){this.visible=null;return {cleared:true};}}]));skins.core.adapters=adapters;return {skins,controller,adapters};
}
test('real ZIP imports exact bundled skin bytes, is idempotent, persists and never applies or resets',async t=>{
  const dir=temp(t),{skins}=service(path.join(dir,'profile')),bundled=skins.snapshots.values().next().value;
  await skins.select({contentKey:bundled.contentKey});await skins.configure({module:'pet',field:'size',value:82,contentKey:bundled.contentKey});
  const entries={'skin.json':fs.readFileSync(path.join(bundled.root,'skin.json'))};for(const asset of Object.values(bundled.manifest.assets))entries[asset.path]=fs.readFileSync(path.join(bundled.root,asset.path));
  const file=path.join(dir,'冷启动.zip');fs.writeFileSync(file,zipSync(entries));const before=JSON.stringify(skins.core.state);
  const imported=await skins.install(file);assert.equal(imported.contentKey,bundled.contentKey);assert.equal(JSON.stringify(skins.core.state),before);
  assert.equal((await skins.install(file)).duplicate,true);assert.equal(skins.status().catalog.filter(row=>row.contentKey===bundled.contentKey).length,1);
  const reopened=service(path.join(dir,'profile'));assert.equal(reopened.skins.status().catalog.filter(row=>row.contentKey===bundled.contentKey).length,1);assert.equal(reopened.skins.status().selected.contentKey,bundled.contentKey);assert.equal(reopened.skins.status().settings.pet.controls.find(c=>c.field==='size').value,82);
});
test('same ID content snapshots remain separate and do not replace the active identity',async t=>{
  const dir=temp(t),{skins}=service(path.join(dir,'profile'));
  const a=await skins.install(zip(dir,fixtureManifest())),b=await skins.install(zip(dir,fixtureManifest('library-synthetic','1.1.0')));
  await skins.select({contentKey:a.contentKey});const selected=skins.status().selected;
  assert.notEqual(a.contentKey,b.contentKey);assert.equal(skins.status().catalog.filter(c=>c.id==='library-synthetic').length,2);assert.equal(selected.contentKey,a.contentKey);
  const next=service(path.join(dir,'profile'));assert.equal(next.skins.status().selected.contentKey,a.contentKey);assert.equal(next.skins.status().catalog.filter(c=>c.id==='library-synthetic').length,2);
});
test('A to B to A keeps preferences, duplicate clicks do not reload, stop restores and failed B preserves A',async t=>{
  const dir=temp(t),{skins,adapters}=service(path.join(dir,'profile')),a=skins.snapshots.get((await skins.install(zip(dir,fixtureManifest('roundtrip-a')))).contentKey),b=await skins.install(zip(dir,fixtureManifest()));
  await skins.select({contentKey:a.contentKey});await skins.configure({module:'theme',field:'backgroundOpacity',value:.05,contentKey:a.contentKey});
  await skins.select({contentKey:b.contentKey});await skins.configure({module:'theme',field:'backgroundOpacity',value:.09,contentKey:b.contentKey});
  await assert.rejects(skins.configure({module:'theme',field:'backgroundOpacity',value:.1,contentKey:a.contentKey}),/SKIN_OPERATION_SUPERSEDED/);
  await assert.rejects(skins.disable({module:'theme',disabled:true,contentKey:a.contentKey}),/SKIN_OPERATION_SUPERSEDED/);
  await assert.rejects(skins.reset({contentKey:a.contentKey}),/SKIN_OPERATION_SUPERSEDED/);
  await skins.select({contentKey:a.contentKey});assert.equal(skins.status().settings.theme.controls[0].value,.05);
  const generation=skins.core.generation;await skins.select({contentKey:a.contentKey});assert.equal(skins.core.generation,generation);
  await skins.stop();await skins.select({contentKey:a.contentKey});assert.equal(skins.status().stopped,false);assert.equal(skins.status().settings.theme.controls[0].value,.05);
  const apply=adapters.theme.apply;adapters.theme.apply=async function(c){if(c.skin.contentKey===b.contentKey)throw new Error('SYNTHETIC_APPLY_FAILED');return apply.call(this,c);};
  await assert.rejects(skins.select({contentKey:b.contentKey}),/SYNTHETIC_APPLY_FAILED/);assert.equal(skins.status().selected.contentKey,a.contentKey);assert.equal(adapters.theme.visible,a.contentKey);
});
test('invalid ZIP, traversal, missing resources and bad digests do not enter the library or change selection',async t=>{
  const dir=temp(t),{skins}=service(path.join(dir,'profile')),before=JSON.stringify(skins.status());
  const broken=path.join(dir,'broken.zip');fs.writeFileSync(broken,Buffer.alloc(30));await assert.rejects(skins.install(broken),/SKIN_ZIP_INVALID/);
  await assert.rejects(skins.install(zip(dir,fixtureManifest(),{'../escape':Buffer.from('x')})),/SKIN_ZIP_PATH_INVALID/);
  const manifest=fixtureManifest();manifest.assets['missing-image']={path:'assets/a.png',mime:'image/png',bytes:8,sha256:'0'.repeat(64)};
  await assert.rejects(skins.install(zip(dir,manifest)),/SKIN_RESOURCE_MISSING/);
  await assert.rejects(skins.install(zip(dir,manifest,{'assets/a.png':Buffer.from([137,80,78,71,13,10,26,10])})),/SKIN_RESOURCE_HASH/);
  assert.equal(JSON.stringify(skins.status()),before);assert.equal(fs.existsSync(path.join(dir,'profile/skin-library.json')),false);
});
test('cancelled native selection writes nothing and browser arguments do not select a path',async()=>{
  let installs=0;const calls=[];const host={entitlement:{require(){}},nativeStatus:async()=>({running:true}),request:async(...args)=>{calls.push(args);return {canceled:true};},skins:{install(){installs++;}},status:async()=>({skin:{catalog:[]}})};
  const result=await CompanionController.prototype.installSkin.call(host,{file:'/not-a-user-selection.zip'});assert.equal(result.skinImport.canceled,true);assert.equal(installs,0);assert.equal(calls[0][0],'/skin/library/choose');assert.deepEqual(calls[0][1],{});
});
test('missing and corrupt installed snapshots stay visible without blocking healthy skins or losing preferences',async t=>{
  const dir=temp(t),stateDir=path.join(dir,'profile'),first=service(stateDir);
  const healthy=await first.skins.install(zip(dir,fixtureManifest('healthy-synthetic'))),manifest=fixtureManifest('broken-synthetic');
  const png=Buffer.from('89504e470d0a1a0a0000000000','hex');manifest.assets.texture={path:'texture.png',mime:'image/png',bytes:png.length,sha256:digest(png)};manifest.modules.theme.config.background='texture';
  const broken=await first.skins.install(zip(dir,manifest,{'texture.png':png}));await first.skins.select({contentKey:broken.contentKey});await first.skins.configure({module:'theme',field:'backgroundOpacity',value:.07,contentKey:broken.contentKey});
  const missing='1'.repeat(64);atomicJson(first.skins.library.file,{formatVersion:1,contentKeys:[healthy.contentKey,missing,broken.contentKey]});const index=fs.readFileSync(first.skins.library.file,'utf8');fs.unlinkSync(path.join(stateDir,'skin-packages',broken.contentKey,'texture.png'));
  const {skins}=service(stateDir),status=skins.status();assert.equal(status.selected.contentKey,broken.contentKey);assert.equal(status.settings.theme.values.backgroundOpacity,.07);
  for(const key of [missing,broken.contentKey]){const row=status.catalog.find(r=>r.contentKey===key);assert.equal(row.status,'unavailable');assert.equal(row.reason,'SKIN_RESOURCE_MISSING');await assert.rejects(skins.select({contentKey:key}),/SKIN_INSTALLED_UNAVAILABLE/);}
  await skins.select({contentKey:healthy.contentKey});await skins.stop();await skins.select({contentKey:healthy.contentKey});assert.equal(skins.status().phase,'ready');assert.equal(skins.core.state.overrides[manifest.id].theme.backgroundOpacity,.07);assert.equal(fs.readFileSync(skins.library.file,'utf8'),index);
});
test('a corrupt bundled cache and a broken index cannot abort management initialization',async t=>{
  const dir=temp(t),stateDir=path.join(dir,'profile'),first=service(stateDir),bundled=first.skins.snapshots.values().next().value;
  const healthy=await first.skins.install(zip(dir,fixtureManifest('healthy-synthetic')));fs.unlinkSync(path.join(bundled.root,Object.values(bundled.manifest.assets)[0].path));
  const next=service(stateDir);assert.equal(next.skins.status().catalog.find(r=>r.contentKey===bundled.contentKey).status,'unavailable');await next.skins.select({contentKey:healthy.contentKey});
  fs.writeFileSync(next.skins.library.file,'{"formatVersion":99,"contentKeys":[]}');const reopened=service(stateDir);assert.equal(reopened.skins.status().selected.contentKey,healthy.contentKey);assert.ok(reopened.skins.status().catalog.some(r=>r.status==='unavailable'&&r.reason==='SKIN_LIBRARY_INVALID'));assert.equal(fs.readFileSync(reopened.skins.library.file,'utf8'),'{"formatVersion":99,"contentKeys":[]}');
});

test('retired bundled MVP selection is cleared without altering current skin preferences or deliberate imports',async t=>{
 const dir=temp(t),stateDir=path.join(dir,'profile'),first=service(stateDir),cold=first.skins.snapshots.values().next().value;
 await first.skins.select({contentKey:cold.contentKey});await first.skins.configure({module:'pet',field:'size',value:82});
 const currentState=structuredClone(first.skins.core.state),retired=structuredClone(currentState.selected);
 retired.manifest.id='archive-warm-whale';retired.contentKey='b'.repeat(64);
 atomicJson(path.join(stateDir,'skin-state.json'),{...currentState,selected:retired});
 const migrated=service(stateDir);assert.equal(migrated.skins.status().selected,null);assert.equal(migrated.skins.status().stopped,true);
 assert.deepEqual(migrated.skins.core.state.overrides,currentState.overrides);
 assert.equal(migrated.skins.status().catalog.some(row=>row.id==='archive-warm-whale'),false);
 atomicJson(path.join(stateDir,'skin-state.json'),currentState);
 const unchanged=service(stateDir);assert.equal(unchanged.skins.status().selected.contentKey,cold.contentKey);assert.equal(unchanged.skins.core.view().pet.values.size,82);
 const imported=await unchanged.skins.install(zip(dir,fixtureManifest('archive-warm-whale','9.0.0')));await unchanged.skins.select(imported);
 assert.equal(service(stateDir).skins.status().selected.contentKey,imported.contentKey);
});
