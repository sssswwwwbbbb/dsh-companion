// Actual upstream React pet, scheduler, video double buffer, motion and physics.
// No upstream source patch. The standalone host is also the published upstream.
import React from 'react';import {createRoot} from 'react-dom/client';import {jsx} from 'react/jsx-runtime';
import {makePetUI} from '../../.local/pet-engine-comparison-20261104/upstreams/dsh-pet/dsh-pet/src/client/pet.ts';
import {petBridge} from '../../.local/pet-engine-comparison-20261104/upstreams/dsh-pet/dsh-pet/src/client/settings/bridge.ts';
import {readPose,poseReaderCount} from '../../.local/pet-engine-comparison-20261104/upstreams/dsh-pet/dsh-pet/src/client/pose.ts';
import {readProgress} from '../../.local/pet-engine-comparison-20261104/upstreams/dsh-pet/dsh-pet/src/client/progress.ts';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(route,body,method=body===undefined?'GET':'POST'){
 route+=(route.includes('?')?'&':'?')+'surface=web';
 const r=await fetch('/dsh-pet-7340/'+route,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const value=r.status===204?{}:await r.json();if(!r.ok||value.ok===false)throw new Error((value.reason||value.error||('HTTP_'+r.status))+(value.message?': '+value.message:''));return value;
}
export class Engine {
 constructor(manifest,log){this.manifest=manifest;this.log=log;this.enabled=false;this.sequence=0;this.commandRevision=0;this.root=null;this.lock=null;this.closing=null;}
 beginCommand(){this.commandRevision++;}
 context(){const life=this.sequence,command=this.commandRevision;return ()=>{if(!this.enabled||life!==this.sequence||command!==this.commandRevision)throw new Error('COMMAND_SUPERSEDED');};}
 async apply(){
  const command=this.commandRevision;if(this.root)await this.stop();if(this.closing)await this.closing;if(command!==this.commandRevision)throw new Error('COMMAND_SUPERSEDED');this.enabled=true;this.sequence++;const current=this.context();document.documentElement.style.setProperty('--dsh-pet-font-family','system-ui,sans-serif');
  const PetUI=makePetUI({h:jsx,useState:React.useState,useEffect:React.useEffect,useRef:React.useRef});
  this.root=createRoot(document.querySelector('#actor-root'));this.root.render(React.createElement(PetUI));
  for(let i=0;i<100;i++){current();if(this.sample().decoded)return;await sleep(50);}throw new Error('DSH_PET_MEDIA_NOT_READY');
 }
 async acquire(){const current=this.context();if(!this.lock){const value=await api('lock?pet=main',{ttl:60000});try{current();}catch(e){await api('lock/release?pet=main',{lockId:value.lockId}).catch(()=>{});throw e;}this.lock=value.lockId;this.log('upstream-lock-acquired');}current();}
 async release(){if(this.lock){const lockId=this.lock;this.lock=null;await api('lock/release?pet=main',{lockId});}}
 async play(name,facing='left'){
  const current=this.context();await this.acquire();current();const value=await api('anim?pet=main&lock='+encodeURIComponent(this.lock),{name,facing});current();this.log('upstream-playback',{name,playbackId:value.playbackId});return value.playbackId;
 }
 async waitPlayback(id){
  for(let i=0;i<130&&this.enabled;i++){const value=await api('playback/'+id);if(['ended','completed','interrupted','failed','cancelled'].includes(value.status))return value;await sleep(75);}throw new Error('UPSTREAM_PLAYBACK_TIMEOUT');
 }
 async idle(){await this.play('idle');}
 async walk(fast=false){return this.play(fast?'run':'walk',fast?'left':'right');}
 async sit(){const current=this.context();await this.release();current();await api('sleep?pet=main',{});current();this.log('upstream-sleep-sequence-started');}
 async wake(){
  const current=this.context(),name=readProgress('main')?.anim;if(!name?.startsWith('sit-'))return;
  if(name!=='sit-end'){await api('wake?pet=main',{});current();}
  let sawExit=name==='sit-end';
  for(let i=0;i<80;i++){current();const name=readProgress('main')?.anim;if(name==='sit-end')sawExit=true;if(sawExit&&name!=='sit-end'){this.log('upstream-sleep-exit-confirmed');return;}await sleep(50);}
  current();throw new Error('UPSTREAM_SLEEP_EXIT_TIMEOUT');
 }
 async work(active){
  const current=this.context();await this.wake();current();await this.release();current();
  if(active)await api('work-status',{state:'working',task:'本地受控工作事件，未调用模型'});
  else await api('work-status',undefined,'DELETE');
 }
 async interact(){const current=this.context();await this.wake();current();await this.release();current();return this.play('react');}
 async extend(){
  const current=this.context();await fetch('/experiment/extend',{method:'POST'});current();const merged=await api('config');current();petBridge.reload(merged);this.log('extra-action-and-prop-registered',{action:'look',prop:'cup'});
 }
 async look(){return this.play('look');}
 async position(x=.3,y=.62){const current=this.context();await this.acquire();current();await api('position?pet=main&lock='+encodeURIComponent(this.lock),{x,y,mode:'instant'});}
 sample(){
  const pose=readPose('main'),progress=readProgress('main');
  return {engine:'dsh-pet',enabled:this.enabled,x:pose?pose.x*innerWidth:null,y:pose?pose.y*innerHeight:null,facing:pose?.facing||null,source:progress?.anim,time:progress?.currentTime,decoded:!!progress&&progress.duration>0,paused:progress?.paused,roots:poseReaderCount(),videos:document.querySelectorAll('video').length};
 }
 async stop(){
  this.enabled=false;this.sequence++;this.root?.unmount();this.root=null;this.log('upstream-react-unmounted');
  if(!this.closing){this.closing=(async()=>{await this.release().catch(()=>{});await api('work-status',undefined,'DELETE').catch(()=>{});await api('wake?pet=main',{}).catch(()=>{});})();}await this.closing;this.closing=null;
 }
}
