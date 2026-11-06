import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadSkin,resolveSettings,atomicJson,StateStore,initialState,requestStop,digest} from '../src/index.mjs';
import {CompanionSkins} from '../../dsh-companion/src/skins.mjs';
import {PageMailbox} from '../adapters/page-mailbox.mjs';
import {createClientRequestGate} from '../../dsh-companion/src/client-requests.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),b=loadSkin(path.join(root,'examples/b')),delay=ms=>new Promise(r=>setTimeout(r,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skin-race-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
async function nativeFixture(t,callbacks={}){
  const dir=temp(t);fs.symlinkSync(root,path.join(dir,'skin-core'));for(const name of ['skin.mjs','work-feedback.mjs'])fs.copyFileSync(fileURLToPath(new URL('../../../runtime-src/'+name,import.meta.url)),path.join(dir,name));
  const {NativeSkinRuntime}=await import(pathToFileURL(path.join(dir,'skin.mjs')));let ready=false,applied=0;
  const runtime=new NativeSkinRuntime({stateDir:dir,loadPack:()=>({id:'fixture',animations:{}}),apply:()=>{applied++;callbacks.apply?.();},hide:()=>{},isReady:()=>callbacks.isReady?callbacks.isReady(runtime):ready});
  const operation=(generation,extra={})=>atomicJson(path.join(dir,'skin-operations',generation+'.json'),{manifest:b.manifest,config:resolveSettings(b.manifest,{},{theme:true,pet:true}).pet.values,assets:{},contentKey:b.contentKey,...extra});
  return {dir,runtime,operation,ready:()=>{ready=true;},applied:()=>applied};
}
for(const stage of ['before-apply','loading','ready-callback','before-window-show'])test('F1 independent stop fences '+stage,async t=>{
  let stopAtReady=stage==='ready-callback';const f=await nativeFixture(t,stopAtReady?{isReady:r=>{r.requestStop();return true;}}:{});f.operation(1);
  if(stage==='before-apply'){f.runtime.requestStop();await assert.rejects(f.runtime.activate({generation:1,contentKey:b.contentKey}),/SKIN_STOP_REQUESTED/);assert.equal(f.applied(),0);}
  else if(stage==='before-window-show'){f.ready();const receipt=await f.runtime.activate({generation:1,contentKey:b.contentKey});f.runtime.requestStop();assert.throws(()=>f.runtime.assertReady(receipt),/SKIN_OPERATION_SUPERSEDED/);}
  else {const work=f.runtime.activate({generation:1,contentKey:b.contentKey});if(!stopAtReady)f.runtime.requestStop();f.ready();await assert.rejects(work,/SKIN_STOP_REQUESTED/);}
  assert.equal(f.runtime.generation,1,'native does not invent a Host generation');assert.equal(f.runtime.visible,false);assert.equal(f.runtime.canShow(),false);assert.equal(f.runtime.stopRequested,true);
});
test('F1 pending stop survives unavailable Host, consumes once, blocks rollback and permits explicit recovery',async t=>{
  const f=await nativeFixture(t);f.operation(1);const loading=f.runtime.activate({generation:1,contentKey:b.contentKey});const stopped=assert.rejects(loading,/SKIN_STOP_REQUESTED/);const [one,same]=await Promise.all([f.runtime.requestStop(),f.runtime.requestStop()]);assert.equal(one,same);f.ready();await stopped;
  await delay(130);f.operation(2,{resumeStop:true,operationId:randomUUID()});await assert.rejects(f.runtime.activate({generation:2,contentKey:b.contentKey}),/SKIN_STOP_REQUESTED/);
  const store=new StateStore(f.dir),state=initialState();state.generation=2;store.write(state);assert.equal(store.consumeStops(state),true);assert.equal(store.consumeStops(state),false);
  f.operation(3);await assert.rejects(f.runtime.activate({generation:3,contentKey:b.contentKey}),/SKIN_STOP_REQUESTED/);
  state.generation=4;state.pending={operationId:randomUUID(),contentKey:b.contentKey};store.write(state);f.operation(4,{resumeStop:true,operationId:state.pending.operationId});const result=await f.runtime.activate({generation:4,contentKey:b.contentKey});f.runtime.assertReady(result);assert.equal(f.runtime.canShow(),true);assert.equal(f.runtime.stopRequested,false);
  const next=await f.runtime.requestStop();assert.notEqual(next,one);assert.equal(store.consumeStops(state),true);assert.equal(store.consumeStops(state),false);
});
test('F1 a fresh native process respects an unconsumed stop before Host startup',async t=>{
  const f=await nativeFixture(t);f.runtime.requestStop();const {NativeSkinRuntime}=await import(pathToFileURL(path.join(f.dir,'skin.mjs')));const restarted=new NativeSkinRuntime({stateDir:f.dir,hide(){},apply(){},loadPack(){},isReady:()=>true});assert.equal(restarted.owned,true);assert.equal(restarted.stopRequested,true);assert.equal(restarted.canShow(),false);
});
function serviceFixture(t){
  const dir=temp(t),controller={stateDir:dir,dshVersion:'0.2.1-rc.5',entitlement:{require(){},status:()=>({active:true})},packs:{get:id=>({id})},credentials:()=>null,nativeStatus:async()=>({})};
  const skins=new CompanionSkins(controller);for(const name of ['a','b'])skins.registerDirectory(path.join(root,'examples',name));controller.status=()=>skins.status();
  const adapter=()=>({visible:null,available:()=>true,invalidate(){},prepare:()=>({}),async apply(c){c.assertCurrent();this.visible=c.skin.manifest.id;return {ready:true};},async exit(){this.visible=null;return {cleared:true};}});
  const adapters={theme:adapter(),pet:adapter()};skins.core.adapters=adapters;
  const reconnect=()=>{skins.page.client={id:randomUUID(),capable:true,seen:Date.now()-3000};return skins.poll({clientId:randomUUID(),capable:true});};
  return {dir,skins,adapters,reconnect};
}
for(const stage of ['preparing','theme-apply','native-wait','precommit-confirm','commit-write'])test('F2 reconnect cannot replace explicit B at '+stage,async t=>{
  const f=serviceFixture(t),{skins,adapters}=f;await skins.select('sample-a');const entered=deferred(),release=deferred();
  const hold=async()=>{entered.resolve();await release.promise;};
  if(stage==='preparing')adapters.theme.prepare=async c=>{if(c.skin.manifest.id==='sample-b')await hold();return {};};
  if(stage==='theme-apply'||stage==='native-wait'){const adapter=stage==='theme-apply'?adapters.theme:adapters.pet;const apply=adapter.apply;adapter.apply=async function(c){if(c.skin.manifest.id==='sample-b')await hold();return apply.call(this,c);};}
  if(stage==='precommit-confirm')adapters.theme.confirm=async c=>{if(c.skin.manifest.id==='sample-b')await hold();return {ready:true};};
  if(stage==='commit-write'){const write=skins.core.store.write.bind(skins.core.store);skins.core.store.write=s=>{if(s.selected?.manifest.id==='sample-b'&&!s.pending)f.reconnect();write(s);};}
  const work=skins.select('sample-b');if(stage!=='commit-write'){await entered.promise;f.reconnect();release.resolve();}const result=await work;await skins.core.tail;
  assert.equal(result.selected.id,'sample-b');assert.equal(skins.core.state.selected.manifest.id,'sample-b');assert.equal(adapters.theme.visible,'sample-b');assert.equal(adapters.pet.visible,'sample-b');
});
test('F2 queued latest choice and stop priority survive page reconnect',async t=>{
  const f=serviceFixture(t),{skins,adapters}=f;await skins.select('sample-a');let entered=deferred(),release=deferred();
  const original=adapters.pet.apply;adapters.pet.apply=async function(c){entered.resolve();await release.promise;return original.call(this,c);};
  const c=structuredClone(skins.catalog.get('sample-a'));c.manifest.id='sample-c';c.contentKey=digest(JSON.stringify(c.manifest));skins.catalog.set('sample-c',c);
  const bRequest=skins.select('sample-b');await entered.promise;const latest=skins.select('sample-c');f.reconnect();release.resolve();await bRequest;await latest;await skins.core.tail;assert.equal(skins.core.state.selected.manifest.id,'sample-c');
  entered=deferred();release=deferred();const again=skins.select('sample-b');await entered.promise;const stopped=skins.stop();f.reconnect();release.resolve();await assert.rejects(again,/SKIN_OPERATION_SUPERSEDED/);await stopped;assert.equal(skins.core.state.stopped,true);assert.equal(adapters.theme.visible,null);
});
test('F1 Host observes independent stop at stage boundary before rollback',async t=>{
  const f=serviceFixture(t),{skins,adapters}=f;await skins.select('sample-a');const entered=deferred(),release=deferred();adapters.pet.apply=async c=>{entered.resolve();await release.promise;c.assertCurrent();return {ready:true};};
  const applying=skins.select('sample-b');await entered.promise;requestStop(f.dir);release.resolve();await assert.rejects(applying,/SKIN_STOP_REQUESTED/);assert.equal(skins.core.state.stopped,true);assert.equal(skins.core.phase,'stopped');assert.equal(adapters.theme.visible,null);assert.equal(skins.core.store.hasStops(),false);
});
test('F2 current page acknowledgement is required at the final confirmation',async()=>{
  const page=new PageMailbox({timeout:300});const old=randomUUID(),next=randomUUID(),context={generation:1,contentKey:'content-b'};page.poll({clientId:old,capable:true});page.invalidate(1);
  const work=page.apply(context,{tokens:{}});let command=page.command;page.poll({clientId:old,ack:{id:command.id,generation:1,ok:true}});await work;
  page.client.seen=Date.now()-3000;page.poll({clientId:next,capable:true});const confirming=page.confirm(context,{tokens:{}});command=page.command;let done=false;void confirming.then(()=>done=true);await Promise.resolve();assert.equal(done,false);
  page.poll({clientId:old,ack:{id:command.id,generation:1,ok:true}});assert.ok(page.pending);page.poll({clientId:next,ack:{id:command.id,generation:1,ok:true}});await confirming;assert.equal(page.lastReady.clientId,next);
});
test('F3 stop bypasses normal lock, deduplicates itself and fences late responses/refresh',()=>{
  const gate=createClientRequestGate(),old=gate.beginNormal(),oldRefresh=gate.stamp();assert.equal(gate.beginNormal(),null);const stop=gate.beginStop();assert.ok(stop);assert.equal(gate.beginStop(),null);assert.equal(gate.current(old),false);assert.equal(gate.refreshCurrent(oldRefresh),false);assert.equal(gate.beginNormal(),null);assert.equal(gate.finish(old),false);assert.equal(gate.busy,true);assert.equal(gate.current(stop),true);assert.equal(gate.finish(stop),true);assert.equal(gate.refreshCurrent(gate.stamp()),true);
  const recovery=gate.beginNormal();assert.ok(recovery);assert.equal(gate.finish(old),false);assert.equal(gate.current(recovery),true);gate.finish(recovery);assert.equal(gate.busy,false);
});
test('F2 failed preparation reconnect restores the still-committed skin, not a stale request',async t=>{
  const f=serviceFixture(t);await f.skins.select('sample-a');const entered=deferred(),release=deferred();
  f.adapters.pet.prepare=async()=>{entered.resolve();await release.promise;throw new Error('SKIN_TEST_PREPARE_FAILED');};
  const work=f.skins.select('sample-b');await entered.promise;f.reconnect();release.resolve();await assert.rejects(work,/SKIN_TEST_PREPARE_FAILED/);
  const clientId=f.skins.page.client.id;f.skins.poll({clientId,capable:true});await f.skins.core.tail;assert.equal(f.skins.core.state.selected.manifest.id,'sample-a');assert.equal(f.adapters.theme.visible,'sample-a');
});
test('F3 refresh started during a stop can never publish after the stop finishes',()=>{
  const gate=createClientRequestGate(),stop=gate.beginStop(),stamp=gate.stamp();assert.equal(stamp,null);gate.finish(stop);assert.equal(gate.refreshCurrent(stamp),false);assert.equal(gate.refreshCurrent(gate.stamp()),true);
});
test('F1 reconnect poll consumes pending stop before replaying any old page apply',async t=>{
  const f=serviceFixture(t);await f.skins.select('sample-b');requestStop(f.dir);f.reconnect();assert.equal(f.skins.core.state.stopped,true);assert.equal(f.skins.core.store.hasStops(),false);await f.skins.core.tail;assert.equal(f.skins.core.phase,'stopped');assert.equal(f.adapters.theme.visible,null);assert.equal(f.adapters.pet.visible,null);
});
test('F3 expected stop cancellation is distinct from a failed ordinary request',()=>{
  const gate=createClientRequestGate();assert.equal(gate.cancelled(new Error('SKIN_STOP_REQUESTED')),true);assert.equal(gate.cancelled(new Error('SKIN_OPERATION_SUPERSEDED')),true);assert.equal(gate.cancelled(new Error('LICENSE_REQUIRED')),false);
});
test('F1 clear waits for a reconnecting page and only succeeds after its exit acknowledgement',async()=>{
  const page=new PageMailbox({timeout:500}),client=randomUUID();page.poll({clientId:client,capable:true});page.invalidate(1);const applying=page.apply({generation:1,contentKey:'one'},{tokens:{}});page.poll({clientId:client,ack:{id:page.command.id,generation:1,ok:true}});await applying;
  page.client.seen=Date.now()-3000;page.invalidate(2);let complete=false;const clearing=page.exit({generation:2}).then(r=>{complete=true;return r;});await delay(30);assert.equal(complete,false);const command=page.poll({clientId:client,capable:true}).command;assert.equal(command.kind,'exit');page.poll({clientId:client,ack:{id:command.id,generation:2,ok:true}});assert.equal((await clearing).cleared,true);assert.equal(page.active,false);
});
