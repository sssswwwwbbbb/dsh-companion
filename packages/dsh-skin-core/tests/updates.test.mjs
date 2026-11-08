import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {SkinCoordinator,StateStore,loadSkin,cacheSkin,requestStop} from '../src/index.mjs';import {PageMailbox} from '../adapters/page-mailbox.mjs';
import {NativePetAdapter} from '../adapters/native.mjs';import {PetInteraction} from '../../dsh-companion/src/pet-interaction.mjs';
const project=fileURLToPath(new URL('../../../',import.meta.url)),source=path.join(project,'packages/dsh-skin-core/tests/fixtures/full-skin'),delay=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(t,{timeout=200}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skin-update-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const skin=cacheSkin(loadSkin(source),dir),page=new PageMailbox({timeout:400}),clientId=randomUUID(),calls=[];
 const adapter=module=>({visible:false,available:()=>true,invalidate(generation){calls.push([module,'invalidate',generation]);},prepare(){calls.push([module,'prepare']);return {};},async apply(c){c.assertCurrent();this.visible=true;calls.push([module,'apply']);return {ready:true};},async exit(){this.visible=false;calls.push([module,'exit']);return {cleared:true};}});
 const adapters={theme:page,pet:adapter('pet'),startup:adapter('startup')},core=new SkinCoordinator({store:new StateStore(dir),adapters,dshVersion:'0.2.1-rc.5',timeout});
 let seen='',ack,payload,held,rejects=0,holdNext=false;const commands=[];page.poll({clientId,capable:true});
 const timer=setInterval(()=>{const response=page.poll({clientId,capable:true,seenCommand:seen,...(ack?{ack}:{})});ack=undefined;const c=response.command;if(!c)return;seen=c.id;commands.push(c);if(c.kind==='invalidate')return;
  if(c.kind==='apply'||c.kind==='update')payload=c.payload;else payload=null;
  if(c.kind==='update'&&holdNext){holdNext=false;held=c;return;}
  const ok=!(c.kind==='update'&&rejects-->0);ack={id:c.id,generation:c.generation,ok};
 },2);t.after(()=>clearInterval(timer));
 return {dir,skin,page,core,adapters,calls,commands,get payload(){return payload;},rejectUpdates(n){rejects=n;},hold(){holdNext=true;},get held(){return held;},lateAck(){if(held)page.poll({clientId,capable:true,ack:{id:held.id,generation:held.generation,ok:true},seenCommand:seen});},async waitHeld(){for(let i=0;i<100&&!held;i++)await delay(2);assert.ok(held);}};
}
function assetReads(t,skin){const files=new Set(Object.values(skin.manifest.assets).map(a=>path.join(skin.root,a.path))),read=fs.readFileSync;const result={count:0,bytes:0};t.mock.method(fs,'readFileSync',function(file,...args){const data=read.call(this,file,...args);if(typeof file==='string'&&files.has(file)){result.count++;result.bytes+=Buffer.byteLength(data);}return data;});return result;}
function interactionFixture(f){
 let reply,entered;const started=new Promise(resolve=>entered=resolve),executed=[];
 const controller={skins:{core:f.core},entitlement:{require(){}},credentials:()=>null,nativeStatus:async()=>({availableActions:['idle','react']}),request:async(route,value)=>{assert.equal(route,'/interaction');executed.push(value);return {speech:value.speech,action:value.action};}};
 const service=new PetInteraction(controller,{complete:()=>{entered();return new Promise(resolve=>reply=resolve);}});controller.interactions=service;
 const pet=f.adapters.pet,original=pet.invalidate.bind(pet);pet.controller=controller;pet.invalidate=generation=>{original(generation);NativePetAdapter.prototype.invalidate.call(pet,generation);};
 for(const name of ['supportsUpdate','prepareUpdate','update','interactionPreferencesChanged'])pet[name]=NativePetAdapter.prototype[name];
 return {service,started,executed,reply:()=>reply({text:'{"speech":"我在这里。","action":"react"}',route:{provider:'controlled',model:'fixture'}})};
}
test('background update reuses only the live acknowledged Page payload without reading assets or touching native lifecycles',async t=>{
 const f=fixture(t);await f.core.select(f.skin);const generation=f.core.generation,reads=assetReads(t,f.skin);f.calls.length=0;const old=f.page.appliedPayload.background;
 await f.core.update({module:'theme',field:'backgroundOpacity',value:.09,contentKey:f.skin.contentKey});assert.equal(f.payload.backgroundOpacity,.09);assert.equal(f.payload.background,old);assert.equal(f.core.view().theme.values.backgroundOpacity,.09);assert.equal(f.core.generation,generation);assert.deepEqual(f.calls,[]);assert.deepEqual(reads,{count:0,bytes:0});assert.equal(f.commands.at(-1).kind,'update');
 const asset=Object.values(f.skin.manifest.assets)[0];fs.writeFileSync(path.join(f.skin.root,asset.path),Buffer.alloc(asset.bytes));await assert.rejects(f.core.select(f.skin),/SKIN_RESOURCE_HASH/);assert.ok(reads.count>0,'a new selection revalidates resource bytes');
});
test('explicit entry marks take precedence and disabling them restores the default icon',()=>{
 const page=new PageMailbox();
 const image=value=>({mime:'image/png',data:Buffer.from(value)});
 const resources={badgeLight:image('badge-light'),badgeDark:image('badge-dark'),iconLight:image('icon-light'),iconDark:image('icon-dark')};
 const base={workspacePreset:'commander-v1',workspaceDetailsEnabled:true,semanticIcons:{companion:{light:'iconLight',dark:'iconDark'}}};
 const legacy=page.prepare({config:base,resources});
 assert.deepEqual(legacy.entryMarks,legacy.workspace.icons.companion);
 const config={...base,entryMarks:{light:'badgeLight',dark:'badgeDark'},entryMarkEnabled:true};
 const prepared=page.prepare({config,resources});
 assert.deepEqual(prepared.entryMarks,prepared.entryMarkImages);
 assert.notDeepEqual(prepared.entryMarks,prepared.workspace.icons.companion);
 assert.equal(page.prepare({config:{...config,entryMarkEnabled:false},resources}).entryMarks,null);
 const clientId=randomUUID();
 page.poll({clientId,capable:true});
 page.active=true;page.lastReady={clientId,generation:1,contentKey:'example'};page.appliedPayload=prepared;
 const context={assertCurrent(){},generation:1,contentKey:'example'};
 const disabled=page.prepareUpdate({...context,config:{...config,entryMarkEnabled:false}});
 assert.equal(disabled.entryMarks,null);
 assert.deepEqual(disabled.entryMarkImages,prepared.entryMarkImages);
 page.appliedPayload=disabled;
 assert.deepEqual(page.prepareUpdate({...context,config}).entryMarks,prepared.entryMarkImages);
});
test('local Page failure rolls back just its config and preserves pet/startup plus committed preferences',async t=>{
 const f=fixture(t);await f.core.select(f.skin);const generation=f.core.generation,previous=f.core.view().theme.values.backgroundOpacity;f.calls.length=0;f.rejectUpdates(1);
 await assert.rejects(f.core.update({module:'theme',field:'backgroundOpacity',value:.11}),/SKIN_PAGE_APPLY_FAILED/);assert.equal(f.payload.backgroundOpacity,previous);assert.equal(f.core.view().theme.values.backgroundOpacity,previous);assert.equal(f.core.phase,'ready');assert.equal(f.core.generation,generation);assert.deepEqual(f.calls,[]);assert.equal(f.core.state.error.code,'SKIN_PAGE_APPLY_FAILED');
});
test('an unconfirmed local rollback fences delayed work and leaves a stopped, explicit recovery state',async t=>{
 const f=fixture(t);await f.core.select(f.skin);f.rejectUpdates(2);await assert.rejects(f.core.update({module:'theme',field:'backgroundOpacity',value:.11}),/SKIN_PAGE_APPLY_FAILED/);assert.equal(f.core.state.stopped,true);assert.equal(f.core.phase,'fault');assert.equal(f.core.state.error.code,'SKIN_RECOVERY_REQUIRED');assert.equal(f.adapters.pet.visible,false);assert.equal(f.adapters.startup.visible,false);assert.equal(f.page.active,false);
});
test('timeout supersedes the old command before local rollback and a late old acknowledgement cannot win',async t=>{
 const f=fixture(t,{timeout:60});await f.core.select(f.skin);const previous=f.payload.backgroundOpacity;f.calls.length=0;f.hold();const updating=f.core.update({module:'theme',field:'backgroundOpacity',value:.12});await f.waitHeld();await assert.rejects(updating,/SKIN_STAGE_TIMEOUT/);f.lateAck();assert.equal(f.payload.backgroundOpacity,previous);assert.equal(f.core.view().theme.values.backgroundOpacity,previous);assert.equal(f.core.phase,'ready');assert.deepEqual(f.calls,[]);
});
for(const independent of [false,true])test('stop wins over an in-flight local update: '+(independent?'native request':'Host stop'),async t=>{
 const f=fixture(t);await f.core.select(f.skin);const previous=f.core.view().theme.values.backgroundOpacity;f.hold();const updating=f.core.update({module:'theme',field:'backgroundOpacity',value:.13});const rejected=assert.rejects(updating,/SKIN_OPERATION_SUPERSEDED|SKIN_STOP_REQUESTED/);await f.waitHeld();
 if(independent){requestStop(f.dir);f.lateAck();}else await f.core.stop();await rejected;f.lateAck();assert.equal(f.core.state.stopped,true);assert.equal(f.core.phase,'stopped');assert.equal(f.core.view().theme.values.backgroundOpacity,previous);assert.equal(f.adapters.pet.visible,false);assert.equal(f.adapters.startup.visible,false);assert.equal(f.page.active,false);
});
test('disabled/stopped edits only save preferences and stale content cannot update the active skin',async t=>{
 const f=fixture(t);await f.core.select(f.skin);await f.core.disable('theme',true);f.calls.length=0;const generation=f.core.generation,commands=f.commands.length;
 await f.core.update({module:'theme',field:'backgroundOpacity',value:.08});assert.deepEqual(f.calls,[]);assert.equal(f.commands.length,commands);assert.equal(f.core.generation,generation);assert.equal(f.core.view().theme.values.backgroundOpacity,.08);
 await f.core.stop();f.calls.length=0;const stoppedGeneration=f.core.generation;await f.core.update({module:'pet',field:'size',value:81});assert.equal(f.core.view().pet.values.size,81);assert.equal(f.core.generation,stoppedGeneration);assert.deepEqual(f.calls,[]);assert.throws(()=>f.core.update({module:'theme',field:'backgroundOpacity',value:.03,contentKey:'0'.repeat(64)}),/SKIN_OPERATION_SUPERSEDED/);
});
test('a lost Page lease/owner cannot reuse the old prepared resources for local updates',async t=>{
 const f=fixture(t);await f.core.select(f.skin);const previous=f.core.view().theme.values.backgroundOpacity;f.page.client.seen=0;const clientId=randomUUID();f.page.poll({clientId,capable:true});
 await assert.rejects(f.core.update({module:'theme',field:'backgroundOpacity',value:.03}),/SKIN_UPDATE_NOT_READY/);assert.equal(f.core.view().theme.values.backgroundOpacity,previous);assert.equal(f.page.appliedPayload,null);
});
test('a newer full selection waits for module rollback and never commits the superseded local preference',async t=>{
 const f=fixture(t);await f.core.select(f.skin);const previous=f.payload.backgroundOpacity,generation=f.core.generation;f.calls.length=0;const start=f.commands.length;f.hold();
 const updating=f.core.update({module:'theme',field:'backgroundOpacity',value:.14});const rejected=assert.rejects(updating,/SKIN_OPERATION_SUPERSEDED/);await f.waitHeld();
 const selecting=f.core.select(f.skin);f.lateAck();await rejected;await selecting;
 assert.equal(f.core.phase,'ready');assert.equal(f.core.generation,generation+1);assert.equal(f.core.view().theme.values.backgroundOpacity,previous);assert.equal(f.payload.backgroundOpacity,previous);
 const commands=f.commands.slice(start);assert.deepEqual(commands.filter(c=>c.kind==='update').map(c=>c.payload.backgroundOpacity),[.14,previous]);assert.ok(commands.findIndex(c=>c.kind==='apply')>commands.findLastIndex(c=>c.kind==='update'));
 assert.deepEqual(f.calls.filter(c=>c[1]==='apply').map(c=>c[0]),['pet','startup']);assert.equal(f.adapters.pet.visible,true);assert.equal(f.adapters.startup.visible,true);
});
test('a real pet interaction reply executes while the unrelated Page update awaits acknowledgement',async t=>{
 const f=fixture(t),pet=interactionFixture(f);await f.core.select(f.skin);const generation=f.core.generation;f.calls.length=0;
 const response=pet.service.interact({trigger:'click'}).then(value=>({value}),error=>({error}));await pet.started;f.hold();const updating=f.core.update({module:'theme',field:'backgroundOpacity',value:.09});await f.waitHeld();
 try{
  assert.equal(f.core.phase,'updating');pet.reply();const result=await response;assert.ifError(result.error);assert.equal(result.value.mode,'model');assert.equal(result.value.actual.action,'react');
  assert.equal(pet.executed.length,1);assert.equal(pet.service.history.get(f.skin.manifest.id).length,1);assert.equal(f.core.phase,'updating');assert.equal(f.core.generation,generation);assert.deepEqual(f.calls,[]);
 }finally{f.lateAck();await updating;}
 assert.equal(f.core.view().theme.values.backgroundOpacity,.09);assert.equal(f.core.phase,'ready');assert.equal(f.core.generation,generation);
});
test('real pet cancellation and stale-context guards still suppress late provider replies',async t=>{
 for(const guard of ['Host stop','independent stop','full switch','pet disabled','interaction preference']){
  const f=fixture(t),pet=interactionFixture(f);await f.core.select(f.skin);
  await assert.rejects(pet.service.interact({generation:f.core.generation-1,contentKey:f.skin.contentKey}),/SKIN_OPERATION_SUPERSEDED/);
  await assert.rejects(pet.service.interact({generation:f.core.generation,contentKey:'0'.repeat(64)}),/SKIN_OPERATION_SUPERSEDED/);
  const response=pet.service.interact({trigger:'click'}).then(value=>({value}),error=>({error}));await pet.started;
  if(guard==='Host stop')await f.core.stop();
  else if(guard==='independent stop')requestStop(f.dir);
  else if(guard==='full switch')await f.core.select(f.skin);
  else if(guard==='pet disabled')await f.core.disable('pet',true);
  else await f.core.update({module:'pet',field:'allowActions',value:false});
  pet.reply();const result=await response;assert.ok(result.error,guard);assert.match(result.error.code,/PET_NOT_AVAILABLE|SKIN_OPERATION_SUPERSEDED/,guard);assert.equal(pet.executed.length,0,guard);assert.equal(pet.service.history.size,0,guard);
 }
});
