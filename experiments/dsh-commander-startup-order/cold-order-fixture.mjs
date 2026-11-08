// Controlled page ACK; the owner, supervisor, windows, media and pet are real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const visiblePet=n=>n.backend?.windows?.some(w=>w.visible===true)===true;
const raw=n=>({
 pid:n.pid,ready:n.ready,phase:n.phase,startup:n.startup,
 backend:n.backend?{pid:n.backend.pid,ready:n.backend.ready,suspended:n.backend.suspended,
  held:n.backend.visibilityHeld,windows:n.backend.windows.map(w=>({id:w.id,visible:w.visible}))}:null,
});
function withPage(service){
 const clientId=randomUUID();let seenCommand=null,ack=null;
 const poll=()=>{
  const out=service.skinPage({clientId,capable:true,seenCommand,...(ack?{ack}:{})});ack=null;
  const command=out.command;if(!command)return;
  seenCommand=command.id;
  if(['apply','update','exit'].includes(command.kind))ack={id:command.id,generation:command.generation,ok:true};
 };
 poll();let failure;const timer=setInterval(()=>{try{poll();}catch(e){failure=e;}},80);
 return {clientId,close:()=>clearInterval(timer),assertOK:()=>{if(failure)throw failure;}};
}
async function until(service,check,code,ms){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){const s=await service.controller.nativeStatus();if(check(s))return s;await delay(80);}
 throw new Error(code);
}
function emit(report,name,value){fs.writeFileSync(path.join(report,name),JSON.stringify(value,null,2)+'\n');}
export async function prepareOrder({service,key,report}){
 const page=withPage(service);
 try{
  const controller=service.controller;
  assert.equal(fs.existsSync(path.join(controller.stateDir,'host-window.json')),false);
  await service.skinSelect({contentKey:key});page.assertOK();
  const current=await controller.nativeStatus();
  assert.ok(current.ready&&current.startup?.ready&&!current.startup.playing);
  assert.equal(controller.skins.core.state.selected.contentKey,key);
  await service.configure({autoStart:true,startupEnabled:true});
  const {autoStart,startupEnabled,launcherEnabled}=controller.settings();
  assert.deepEqual({autoStart,startupEnabled,launcherEnabled},{autoStart:true,startupEnabled:true,launcherEnabled:false});
  const result={prepared:true,hostPid:process.pid,supervisorPid:current.pid,selected:key,autoStart,startupEnabled,launcherEnabled,ownerBoundsPresent:false};
  emit(report,'cold-order-prepared.json',result);return result;
 }finally{page.close();}
}
export async function exerciseOrder({service,key,report,acceptedReport}){
 const controller=service.controller,windowFile=path.join(controller.stateDir,'host-window.json');
 const evidence={scope:'private official Host, actual native supervisor and media, controlled page acknowledgment; no physical UI input',hostPid:process.pid};
 const eventsFile=path.join(controller.stateDir,'runtime-events.json');
 const readEvents=()=>{try{return JSON.parse(fs.readFileSync(eventsFile)).transitions;}catch{return [];}};
 let page;
 try{
  assert.equal(fs.existsSync(windowFile),false);
  const before=await until(service,s=>s.startup?.coldPending&&s.startup.ready,'COLD_BOOT_NOT_PENDING',10000);
  evidence.before=raw(before);
  assert.equal(before.startup.playing,false);
  page=withPage(service);
  const findReady=()=>readEvents().find(e=>e.type==='cold-workspace-ready'&&e.contentKey===key);
  const held=await until(service,s=>!!findReady()&&s.startup?.coldPending&&s.backend?.visibilityHeld,'COLD_WORKSPACE_RECEIPT_NOT_RETAINED',14000);
  const ready=findReady(),committed=controller.skins.page.lastReady;
  assert.equal(ready.boundsReady,false);
  assert.equal(fs.existsSync(windowFile),false);
  assert.equal(held.startup.playing,false);
  assert.equal(visiblePet(held),false);
  assert.equal(committed.clientId,page.clientId);
  assert.equal(committed.generation,ready.generation);
  assert.equal(committed.contentKey,key);
  assert.equal(controller.skins.core.state.pending,null);
  evidence.readyBeforeBounds={receipt:ready,committed:{generation:committed.generation,contentKey:committed.contentKey},native:raw(held)};
  const original=JSON.parse(fs.readFileSync(path.join(acceptedReport,'cold-native.json')));
  const bounds=original.playing.startup.bounds; // exact bounds of the observed private window
  evidence.boundsSentAt=Date.now();
  assert.ok(evidence.boundsSentAt>=ready.at);
  await service.syncHostWindow(bounds);
  const playing=await until(service,s=>s.startup?.visible&&s.startup.playing&&s.startup.media==='video','COLD_LATE_BOUNDS_DID_NOT_START',8000);
  assert.deepEqual(playing.startup.bounds,bounds);
  assert.equal(visiblePet(playing),false);
  evidence.playing=raw(playing);
  await service.syncHostWindow(bounds);
  await controller.request('/intro/workspace-ready',{generation:ready.generation,contentKey:key});
  const returned=await until(service,s=>s.pid===held.pid&&s.startup?.completions===1&&s.startup.videoEnded&&
   !s.startup.playing&&!s.startup.visible&&s.ready&&visiblePet(s)&&!s.backend.visibilityHeld&&!s.backend.suspended,
   'COLD_PET_NOT_RELEASED',Math.ceil(playing.startup.durationSeconds*1000)+8000);
  assert.equal(returned.backend.pid,held.backend.pid);
  await service.syncHostWindow(bounds);
  await controller.request('/intro/workspace-ready',{generation:ready.generation,contentKey:key});
  const duplicate=await controller.nativeStatus();
  assert.equal(duplicate.startup.completions,1);
  assert.equal(duplicate.startup.playing,false);
  assert.equal(duplicate.startup.coldPending,false);
  page.assertOK();
  const events=readEvents().filter(e=>['cold-workspace-ready','cold-intro-request','intro-start','intro-presented','intro-handoff','intro-complete','intro-cancelled','isolated-host-return'].includes(e.type));
  for(const type of ['cold-workspace-ready','cold-intro-request','intro-start','intro-presented','intro-handoff','intro-complete','isolated-host-return'])assert.equal(events.filter(e=>e.type===type).length,1,type);
  assert.ok(events.every(e=>e.type!=='intro-cancelled'));
  assert.equal(events.find(e=>e.type==='cold-intro-request').workspaceCommitted,true);
  assert.equal(events.find(e=>e.type==='intro-complete').trigger,'media-ended');
  evidence.returned=raw(returned);evidence.events=events;evidence.replayCalls=0;evidence.passed=true;
  return evidence;
 }catch(error){
  evidence.passed=false;evidence.failure=error.message;evidence.events=readEvents();
  throw error;
 }finally{
  try{
   await service.configure({autoStart:false,startupEnabled:false});
   const {autoStart,startupEnabled,launcherEnabled}=controller.settings();
   evidence.restoredPreferences={autoStart,startupEnabled,launcherEnabled};
  }finally{
   page?.close();emit(report,'cold-order-native.json',evidence);
  }
 }
}
