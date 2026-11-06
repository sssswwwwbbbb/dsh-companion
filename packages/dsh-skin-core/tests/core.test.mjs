import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {SkinCoordinator,StateStore,loadSkin,validateManifest,resolveSettings,prepareResources,digest,requestStop,migrateLegacySettings} from '../src/index.mjs';
import {PageMailbox} from '../adapters/page-mailbox.mjs';
import {NativePetAdapter} from '../adapters/native.mjs';
const base=path.dirname(fileURLToPath(import.meta.url)),a=loadSkin(path.join(base,'../examples/a')),b=loadSkin(path.join(base,'../examples/b'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(t,options={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skin-core-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const adapter=()=>({generation:0,visible:null,available:()=>true,invalidate(n){this.generation=n;},prepare(c){return c;},async apply(c){if(this.fail){this.fail=false;throw Object.assign(new Error('TEST_APPLY_FAILED'),{code:'TEST_APPLY_FAILED'});}c.assertCurrent();this.visible=c.skin.manifest.id;return {ready:true};},async exit(){this.visible=null;return {cleared:true};}});
  const adapters={theme:adapter(),pet:adapter()},store=new StateStore(dir),core=new SkinCoordinator({store,adapters,dshVersion:'0.2.1-rc.5',timeout:200,...options});return {dir,store,core,adapters};
}
test('A/B use declared modules; overrides are per skin, controls hide, global off and reset are distinct',async t=>{
  const {core,adapters}=fixture(t);await core.select(a);assert.equal(adapters.pet.visible,null);
  await core.select(b);assert.equal(adapters.pet.visible,'sample-b');assert.equal(core.view().pet.values.size,90);assert.equal(core.view().pet.controls.some(x=>x.field==='profile'),false);
  await core.update({module:'pet',field:'size',value:110});await core.update({module:'pet',field:'autonomous',value:true});assert.ok(core.view().pet.controls.some(x=>x.field==='profile'));
  await core.select(a);assert.equal(adapters.pet.visible,null);await core.select(b);assert.equal(core.view().pet.values.size,110);
  await core.disable('pet',true);assert.equal(adapters.pet.visible,null);await core.reset();assert.equal(core.view().pet.values.size,90);assert.equal(core.view().pet.status,'disabled');
  await core.select(a);await core.select(b);assert.equal(core.view().pet.status,'disabled');await core.stop();assert.equal(adapters.theme.visible,null);assert.equal(core.status().stopped,true);
});
test('stop intent survives reboot; failed restore does not clear it; explicit success clears',async t=>{
  const {core,store,adapters}=fixture(t);await core.select(b);await core.stop();
  const reloaded=new SkinCoordinator({store,adapters,dshVersion:'0.2.1-rc.5'});await reloaded.restore();assert.equal(adapters.pet.visible,null);
  adapters.theme.fail=true;await assert.rejects(reloaded.select(b));assert.equal(reloaded.state.stopped,true);await reloaded.select(a);assert.equal(reloaded.state.stopped,false);
});
test('defaults, types, unknown modules and host compatibility fail before disrupting current effects',async t=>{
  const {core,adapters}=fixture(t);await core.select(a);
  const bad=structuredClone(b.manifest);delete bad.modules.pet.settings.size.default;assert.throws(()=>validateManifest(bad),/SKIN_DEFAULT_INVALID/);
  const missing=structuredClone(b.manifest);missing.modules.extra={interfaceVersion:1,configVersion:1,required:true,config:{},settings:{}};
  assert.throws(()=>resolveSettings(validateManifest(missing),core.state,{theme:true,pet:true}),/SKIN_CAPABILITY_REQUIRED/);
  missing.modules.extra.required=false;assert.equal(resolveSettings(validateManifest(missing),core.state,{theme:true,pet:true}).extra.status,'unavailable');
  const incompatible={...a,manifest:{...a.manifest,dshVersions:['9.0.0']}};await assert.rejects(core.select(incompatible),/SKIN_HOST_UNSUPPORTED/);assert.equal(adapters.theme.visible,'sample-a');
  assert.equal(core.state.selected.manifest.id,'sample-a');
});
test('required failure rolls back prior effects and snapshot; cleanup uncertainty enters fault',async t=>{
  const {core,adapters}=fixture(t);await core.select(a);adapters.pet.fail=true;await assert.rejects(core.select(b),/TEST_APPLY_FAILED/);
  assert.equal(core.state.selected.manifest.id,'sample-a');assert.equal(adapters.theme.visible,'sample-a');assert.equal(core.phase,'ready');
  adapters.pet.exit=async()=>({cleared:false});await assert.rejects(core.select(b),/SKIN_CLEANUP_UNCONFIRMED/);assert.equal(core.phase,'fault');assert.equal(core.state.stopped,true);
});
test('late apply cannot resurrect after stop; queued normal requests coalesce',async t=>{
  const {core,adapters}=fixture(t);let entered;
  const started=new Promise(r=>entered=r);adapters.pet.apply=async c=>{entered();await delay(40);c.assertCurrent();adapters.pet.visible='late';return {ready:true};};
  const applying=core.select(b);await started;const stopping=core.stop();await assert.rejects(applying,/SKIN_OPERATION_SUPERSEDED/);await stopping;assert.equal(adapters.pet.visible,null);assert.equal(core.state.stopped,true);
  const one=core.select(b),two=core.select(a);await assert.rejects(one,/SKIN_OPERATION_SUPERSEDED/);await two;assert.equal(core.state.selected.manifest.id,'sample-a');
});
test('pending recovery and independent stop request are consumed once; live pending is not crash recovery',async t=>{
  const {core,store,dir}=fixture(t);await core.select(a);core.state.pending={operationId:'interrupted'};store.write(core.state);
  assert.equal(store.consumeStops(core.state,{recoverPending:false}),false);assert.equal(store.consumeStops(core.state),true);assert.equal(core.state.stopped,true);
  requestStop(dir);assert.equal(store.consumeStops(core.state),true);assert.equal(store.consumeStops(core.state),false);
  await core.select(a);assert.equal(store.consumeStops(core.state),false);assert.equal(core.state.stopped,false);
});
test('resources are hash isolated; traversal, symbolic links, missing and changed bytes reject',t=>{
  const {dir}=fixture(t);const resource=Buffer.from('89504e470d0a1a0a00000000414243','hex');
  const make=(folder,bytes)=>{fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'same.png'),bytes);const m=structuredClone(a.manifest);m.assets.background={path:'same.png',mime:'image/png',bytes:bytes.length,sha256:digest(bytes)};m.modules.theme.config.background='background';fs.writeFileSync(path.join(folder,'skin.json'),JSON.stringify(m));return loadSkin(folder);};
  const first=make(path.join(dir,'one'),resource),second=make(path.join(dir,'two'),Buffer.concat([resource,Buffer.from('D')]));assert.notEqual(first.contentKey,second.contentKey);assert.notEqual(prepareResources(first).background.sha256,prepareResources(second).background.sha256);
  const invalid=structuredClone(first.manifest);invalid.assets.background.path='../private';assert.throws(()=>validateManifest(invalid),/SKIN_ASSET_INVALID/);
  fs.unlinkSync(path.join(first.root,'same.png'));fs.symlinkSync(path.join(second.root,'same.png'),path.join(first.root,'same.png'));assert.throws(()=>prepareResources(first),/SKIN_RESOURCE_SYMLINK/);
  fs.unlinkSync(path.join(first.root,'same.png'));assert.throws(()=>prepareResources(first),/SKIN_RESOURCE_MISSING/);
  fs.writeFileSync(path.join(second.root,'same.png'),Buffer.alloc(second.manifest.assets.background.bytes));assert.throws(()=>prepareResources(second),/SKIN_RESOURCE_HASH/);
});
test('corrupt/future state is not overwritten and legacy migration is explicit and preserves false',t=>{
  const {dir,store}=fixture(t);fs.writeFileSync(store.file,'{"formatVersion":99}');assert.throws(()=>store.read(),/SKIN_STATE_INVALID/);assert.equal(fs.readFileSync(store.file,'utf8'),'{"formatVersion":99}');
  const legacy={size:85,autonomous:false,followMouse:false,visible:false,profile:'free',futureValue:7};const migrated=migrateLegacySettings(legacy,'sample-b');assert.equal(migrated.overrides['sample-b'].pet.autonomous,false);assert.equal(migrated.legacy.futureValue,7);assert.equal(migrated.disabled.pet,true);assert.deepEqual(legacy,migrated.legacy);
});
test('page receipts require current client, generation and command; stale receipts cannot commit',async()=>{
  const page=new PageMailbox({timeout:100});const clientId='11111111-1111-4111-8111-111111111111';page.poll({clientId,capable:true});page.invalidate(1);
  const work=page.apply({generation:1,contentKey:a.contentKey},{tokens:{}});const command=page.command;
  page.poll({clientId,ack:{id:command.id,generation:0,ok:true}});assert.ok(page.pending);
  page.poll({clientId,ack:{id:command.id,generation:1,ok:true}});assert.equal((await work).ready,true);
  const pending=page.exit({generation:1});page.invalidate(2);await assert.rejects(pending,/SKIN_OPERATION_SUPERSEDED/);
});

test('editing/resetting while stopped preserves stop; enabling preference does not restart',async t=>{
  const {core,adapters}=fixture(t);await core.select(b);await core.disable('pet',true);await core.stop();
  await core.update({module:'pet',field:'size',value:105});assert.equal(core.state.stopped,true);assert.equal(core.view().pet.values.size,105);assert.equal(adapters.theme.visible,null);
  await core.disable('pet',false);assert.equal(core.state.disabled.pet,false);assert.equal(core.state.stopped,true);
  await core.reset();assert.equal(core.view().pet.values.size,90);assert.equal(core.state.stopped,true);
});
test('timed-out apply is fenced before rollback and cannot reappear afterwards',async t=>{
  const {core,adapters}=fixture(t,{timeout:30});await core.select(a);
  adapters.pet.apply=async c=>{await delay(65);c.assertCurrent();adapters.pet.visible='late';return {ready:true};};
  await assert.rejects(core.select(b),/SKIN_STAGE_TIMEOUT/);await delay(80);assert.equal(adapters.pet.visible,null);assert.equal(adapters.theme.visible,'sample-a');assert.equal(core.state.selected.manifest.id,'sample-a');
});
test('global disable during a slow apply fences the old candidate and persists close intent',async t=>{
  const {core,adapters}=fixture(t);await core.select(b);let entered;
  const start=new Promise(r=>entered=r);adapters.pet.apply=async c=>{entered();await delay(40);c.assertCurrent();adapters.pet.visible='late';return {ready:true};};
  const change=core.update({module:'pet',field:'size',value:105});await start;const disabled=core.disable('pet',true);await assert.rejects(change,/SKIN_OPERATION_SUPERSEDED/);await disabled;
  assert.equal(core.state.disabled.pet,true);assert.equal(adapters.pet.visible,null);
});
test('optional runtime failure is reported unavailable and plugin disposal preserves successful selection',async t=>{
  const {core,adapters,store}=fixture(t);const skin=structuredClone(b);skin.manifest.modules.pet.required=false;skin.contentKey=digest(JSON.stringify(skin.manifest));adapters.pet.fail=true;
  await core.select(skin);assert.equal(core.view().pet.status,'unavailable');await core.dispose();assert.equal(store.read().stopped,false);assert.equal(adapters.theme.visible,null);assert.equal(store.read().selected.manifest.id,'sample-b');
});

test('editing an interaction preference persists it without reloading the active skin',async t=>{
  const {core,store,adapters}=fixture(t);
  const skin=loadSkin(path.join(base,'../../dsh-companion/skins/archive-warm-whale'));
  let cancelled=0;adapters.pet.interactionPreferencesChanged=()=>{cancelled++;};
  for(const method of ['supportsUpdate','prepareUpdate','update'])adapters.pet[method]=NativePetAdapter.prototype[method];
  await core.select(skin);const generation=core.generation;
  await core.update({module:'pet',field:'historyRounds',value:19,contentKey:skin.contentKey});
  assert.equal(core.generation,generation);
  assert.equal(core.view().pet.values.historyRounds,19);
  assert.equal(store.read().overrides[skin.manifest.id].pet.historyRounds,19);
  assert.equal(cancelled,1);
  assert.throws(()=>core.update({module:'pet',field:'historyRounds',value:11,contentKey:'0'.repeat(64)}),/SKIN_OPERATION_SUPERSEDED/);
});
