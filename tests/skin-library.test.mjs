import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {SkinLibrary} from '../packages/dsh-companion/src/skin-library.mjs';
import {CompanionSkins} from '../packages/dsh-companion/src/skins.mjs';
import {ReplyStyle} from '../packages/dsh-companion/src/reply-style.mjs';
import {CompanionController} from '../packages/dsh-companion/src/controller.mjs';
import {digest,atomicJson,validateManifest,loadSkin} from '../packages/dsh-skin-core/src/index.mjs';
import {fileURLToPath} from 'node:url';
const fixturesDir=fileURLToPath(new URL('./fixtures',import.meta.url));
const {zipSync}=createRequire(new URL('../packages/dsh-companion/package.json',import.meta.url))('fflate');
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-library-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const fixtureManifest=(id='library-synthetic',version='1.0.0')=>({formatVersion:2,id,version,name:'隔离合成 · '+id,description:'仅用于隔离验证，不是正式皮肤',dshVersions:['0.2.1-rc.5'],assets:{},modules:{theme:{interfaceVersion:1,configVersion:1,required:true,config:{tokens:{'--dsw-alias-bg-base':{light:'#faf5ee',dark:'#232423'}}},settings:{backgroundOpacity:{label:'背景浓度',default:.02}}}}});
function zip(dir,manifest,extra={}){const file=path.join(dir,'fixture-'+Math.random().toString(16).slice(2)+'.zip');fs.writeFileSync(file,zipSync({'skin.json':Buffer.from(JSON.stringify(manifest)),...extra}));return file;}
function service(dir,options={}){
  const controller={stateDir:dir,dshVersion:'0.2.1-rc.5',entitlement:{require(){},status:()=>({active:true})},nativeStatus:async()=>({})},skins=new CompanionSkins(controller,{bundledDir:fixturesDir,...options});controller.skins=skins;controller.status=()=>({skin:skins.status()});
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
  const dir=temp(t),stateDir=path.join(dir,'profile'),first=service(stateDir),fixture=first.skins.snapshots.values().next().value;
  const healthy=await first.skins.install(zip(dir,fixtureManifest('healthy-synthetic')));
  // Next start points at a damaged copy of the bundled skin; management must still come up.
  const damaged=path.join(dir,'damaged-bundle');fs.mkdirSync(damaged,{recursive:true});
  const copy=path.join(damaged,'archive-workspace-r2-private');fs.cpSync(path.join(fixturesDir,'archive-workspace-r2-private'),copy,{recursive:true});
  const asset=Object.values(loadSkin(copy).manifest.assets)[0];fs.unlinkSync(path.join(copy,asset.path));
  const next=service(stateDir,{bundledDir:damaged});assert.equal(next.skins.status().catalog.filter(r=>r.contentKey===healthy.contentKey).length,1);await next.skins.select({contentKey:healthy.contentKey});
  fs.writeFileSync(next.skins.library.file,'{"formatVersion":99,"contentKeys":[]}');const reopened=service(stateDir,{bundledDir:damaged});assert.equal(reopened.skins.status().selected.contentKey,healthy.contentKey);assert.ok(reopened.skins.status().catalog.some(r=>r.status==='unavailable'&&r.reason==='SKIN_LIBRARY_INVALID'));assert.equal(fs.readFileSync(reopened.skins.library.file,'utf8'),'{"formatVersion":99,"contentKeys":[]}');
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

test('uninstall current and inactive snapshots releases files, preserves preferences by default and permits reinstall',async t=>{
 const dir=temp(t),stateDir=path.join(dir,'profile'),empty={bundledDir:path.join(dir,'no-bundle')},{skins,adapters}=service(stateDir,empty);
 const file=zip(dir,fixtureManifest()),a=await skins.install(file),b=await skins.install(zip(dir,fixtureManifest('other-skin')));
 await skins.select(a);await skins.configure({module:'theme',field:'backgroundOpacity',value:.08});
 fs.mkdirSync(path.join(stateDir,'skin-assets',a.contentKey),{recursive:true});
 fs.writeFileSync(path.join(stateDir,'skin-assets',a.contentKey,'test'),'cached asset');
 await skins.remove(a);assert.equal(skins.status().selected,null);assert.equal(skins.status().stopped,true);assert.equal(adapters.theme.visible,null);
 for(const cache of ['skin-packages','skin-assets'])assert.equal(fs.existsSync(path.join(stateDir,cache,a.contentKey)),false);
 assert.equal(fs.existsSync(file),true);assert.equal(service(stateDir,empty).skins.status().catalog.length,1);
 const again=await skins.install(file);await skins.select(again);assert.equal(skins.status().settings.theme.values.backgroundOpacity,.08);
 await skins.remove(b);assert.equal(skins.status().selected.contentKey,a.contentKey);assert.equal(skins.status().stopped,false);
 await skins.remove({...a,clearSettings:true});assert.equal(skins.core.state.overrides['library-synthetic'],undefined);
 await skins.install(file);await skins.select(a);assert.equal(skins.status().settings.theme.values.backgroundOpacity,.02);
});
test('failed effect cleanup retains installed files and a later queued selection cannot revive a removing skin',async t=>{
 const dir=temp(t),{skins,adapters}=service(path.join(dir,'profile'),{bundledDir:path.join(dir,'none')});
 const a=await skins.install(zip(dir,fixtureManifest()));await skins.select(a);
 const exit=adapters.theme.exit;adapters.theme.exit=async()=>{throw new Error('CLEANUP_FAILED');};
 const removal=skins.remove(a);await assert.rejects(skins.select(a),/SKIN_REMOVE_PENDING/);await assert.rejects(removal,/SKIN_CLEANUP_UNCONFIRMED/);
 assert.ok(fs.existsSync(skins.snapshots.get(a.contentKey).root));assert.ok(skins.library.keys().includes(a.contentKey));
 adapters.theme.exit=exit;await skins.remove(a);assert.equal(skins.status().catalog.length,0);
});
test('split-package upgrade retains selected bundled cache; shared preferences cannot be cleared while another version remains',async t=>{
 const dir=temp(t),stateDir=path.join(dir,'profile'),old=service(stateDir),skin=old.skins.snapshots.values().next().value;
 await old.skins.select({contentKey:skin.contentKey});await old.skins.configure({module:'pet',field:'size',value:82});
 const next=service(stateDir,{bundledDir:path.join(dir,'no-bundle')});assert.equal(next.skins.status().selected.contentKey,skin.contentKey);assert.ok(next.skins.library.keys().includes(skin.contentKey));assert.equal(next.skins.status().settings.pet.values.size,82);
 const a=await next.skins.install(zip(dir,fixtureManifest())),b=await next.skins.install(zip(dir,fixtureManifest('library-synthetic','2.0.0')));
 await assert.rejects(next.skins.remove({...a,clearSettings:true}),/SKIN_SETTINGS_SHARED/);await next.skins.remove(a);assert.ok(next.skins.snapshots.has(b.contentKey));
});

test('clear settings removes session choices from previously uninstalled versions without clearing another skin',async t=>{
 const dir=temp(t),{skins,controller}=service(path.join(dir,'profile'),{bundledDir:path.join(dir,'none')});
 const make=(id,version)=>({...fixtureManifest(id,version),replyStyle:{address:'用户',tone:'简练回答'},character:{name:'角色',identity:'测试身份',workContext:'协助工作'}});
 const oneFile=zip(dir,make('clear-history','1.0.0')),one=await skins.install(oneFile),other=await skins.install(zip(dir,make('keep-history','1.0.0')));
 controller.replyStyle=new ReplyStyle(controller,{get:()=>({})});controller.replyStyle.registered=true;
 await skins.select(other);controller.replyStyle.characterSession({sessionId:'keep',contentKey:other.contentKey,enabled:true});
 await skins.select(one);controller.replyStyle.session({sessionId:'old',contentKey:one.contentKey,enabled:false});controller.replyStyle.characterSession({sessionId:'old',contentKey:one.contentKey,enabled:true});
 await skins.remove(one);const two=await skins.install(zip(dir,make('clear-history','2.0.0')));await skins.select(two);await skins.remove({...two,clearSettings:true});
 const saved=JSON.parse(fs.readFileSync(controller.replyStyle.file));assert.equal(saved.sessions.old,undefined);assert.equal(saved.characterSessions.old,undefined);assert.equal(saved.characterSessions.keep,other.contentKey);
 await skins.install(oneFile);await skins.select(one);assert.equal(controller.replyStyle.sessionStatus('old').enabled,true);assert.equal(controller.replyStyle.characterSessionStatus('old').enabled,false);
});

test('a fresh engine refuses legacy start and intro while internal import standby remains available',async()=>{
 let launches=0;const host={disposed:false,entitlement:{require(){}},skins:{core:{state:{selected:null}}},config:{supportedDsh:['0.2.2-rc.1']},dshVersion:'0.2.2-rc.1',launch:async options=>{assert.equal(options.skinStandby,true);launches++;},status:async()=>({})};
 await assert.rejects(CompanionController.prototype.start.call(host),/SKIN_NOT_SELECTED/);
 await assert.rejects(CompanionController.prototype.replayIntro.call(host),/SKIN_NOT_SELECTED/);
 await CompanionController.prototype.start.call(host,{skinStandby:true});assert.equal(launches,1);
});


test('commander static role requires only an avatar while the legacy animated layout retains its full resource contract',t=>{
 const dir=temp(t),{skins}=service(path.join(dir,'profile')),source=[...skins.snapshots.values()][0];
 const m=structuredClone(source.manifest),role=m.modules.theme.config.workspaceRole;
 m.modules.theme.config.workspaceRole={avatar:role.avatar,name:role.name,model:role.model};
 assert.doesNotThrow(()=>validateManifest(m));
 m.modules.theme.config.workspacePreset='archive-warm-r2';assert.throws(()=>validateManifest(m),/SKIN_CONFIG_MISSING/);
});
test('rollback returns to the previous installed version of the same skin',async t=>{
  const dir=temp(t),{skins}=service(path.join(dir,'profile'));
  const make=(version)=>({...fixtureManifest('rollback-skin',version),name:'回退测试',description:'同套两版'});
  const one=await skins.install(zip(dir,make('1.0.0'))),two=await skins.install(zip(dir,make('2.0.0')));
  await skins.select(two);
  const status=await skins.rollback({id:'rollback-skin'});
  assert.equal(status.skin.selected.contentKey,one.contentKey);
  assert.ok(skins.status().catalog.some(row=>row.contentKey===two.contentKey));
});
