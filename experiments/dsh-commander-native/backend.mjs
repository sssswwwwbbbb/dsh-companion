import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createNativeLock} from './native-lock.mjs';
import {validateCandidateMap} from './candidate-map.mjs';
import {backendReadiness} from './compatibility.mjs';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const hash=data=>createHash('sha256').update(data).digest('hex');
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
export class WholePetBackend {
 constructor({stateDir,host,event}){
  this.lab=process.env.DSH_HOST_PET_LAB;
  if(!this.lab||!path.isAbsolute(this.lab))throw new Error('PRIVATE_BACKEND_REQUIRED');
  this.dir=path.join(stateDir,'whole-pet');fs.mkdirSync(this.dir,{recursive:true,mode:0o700});
  this.host=host;this.event=event;this.revision=0;this.sequence=0;this.token=null;
  this.registry=validateCandidateMap(JSON.parse(fs.readFileSync(path.join(this.lab,'backend-template/runtime-candidates.json'))));
  this.lock=createNativeLock({acquire:ttl=>this.api('lock?pet=main',{ttl}),release:lockId=>this.api('lock/release?pet=main',{lockId})});
 }
 snapshot(){try{return JSON.parse(fs.readFileSync(path.join(this.dir,'snapshot.json')));}catch{return {windows:[],errors:[]};}}
 status(){const snap=this.snapshot(),live=!!this.child&&alive(this.child.pid),ready=backendReadiness({registered:this.ready,alive:live,suspended:this.suspended,held:this.visibilityHeld,snapshot:snap});return {engine:'dsh-pet',version:'0.4.1',pid:this.child?.pid||null,alive:live,ready,suspended:this.suspended===true,visibilityHeld:this.visibilityHeld===true,token:this.token,contentKey:this.contentKey,windows:snap.windows,errors:snap.errors||[],bodyInputs:snap.bodyInputs,lastAction:this.lastAction||null,oldPetBranchActive:false};}
 async wait(predicate,code,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await delay(60);}throw new Error(code);}
 async api(route,body,method=body===undefined?'GET':'POST'){
  const n=JSON.parse(fs.readFileSync(path.join(this.dir,'connection.json')));
  const r=await fetch(n.origin+'/dsh-pet-7340/'+route+(route.includes('?')?'&':'?')+'surface=desktop',{method,headers:{'content-type':'application/json','x-dsh-pet-token':n.token},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(4000)});
  const value=r.status===204?{}:await r.json();if(!r.ok||value.ok===false)throw new Error('BACKEND_REQUEST_FAILED');return value;
 }
 async stop(){
  this.revision++;this.sequence++;this.ready=false;this.suspended=false;this.visibilityHeld=false;this.token=null;
  const child=this.child;if(!child)return {cleared:true,windows:0};
  try{await this.lock.release();}catch{}
  try{await this.api('pet-display',{id:'main',display:'none'});await this.wait(()=>this.snapshot().windows.length===0,'BACKEND_WINDOWS_NOT_CLEARED',3000);}catch(error){this.event('backend-stop-notice',{code:error.message});}
  fs.writeFileSync(path.join(this.dir,'quit.json'),'{}');
  try{await this.wait(()=>!alive(child.pid),'BACKEND_EXIT_TIMEOUT',4000);}catch{
   child.kill('SIGTERM');await this.wait(()=>!alive(child.pid),'BACKEND_STILL_ALIVE',4000);
  }
  if(this.child===child)this.child=null;
  const windows=this.snapshot().windows?.length||0;
  if(windows)throw new Error('BACKEND_WINDOWS_NOT_CLEARED');
  this.event('backend-cleared',{pid:child.pid,windows:0});return {cleared:true,windows:0};
 }
 async apply({pack,config,token,resources,contentKey,generation,assertCurrent,holdVisibility=false}){
  await this.stop();const revision=++this.revision;
  const current=()=>{assertCurrent();if(revision!==this.revision)throw new Error('SKIN_OPERATION_SUPERSEDED');};
  current();const entry=this.registry.contents[contentKey];if(!entry)throw new Error('BACKEND_CONTENT_NOT_REGISTERED');
  for(const [id,sha256]of Object.entries(entry.requiredAssets))if(!resources[id]||hash(resources[id].data)!==sha256)throw new Error('BACKEND_CONTENT_CHANGED');
  const home=path.join(this.dir,'home'),animation=path.join(home,'dsh-pet/main-animation/webm');fs.mkdirSync(animation,{recursive:true});
  const cfg=JSON.parse(fs.readFileSync(path.join(this.lab,'backend-template/config.json')));
  const names={idle:entry.group+'-idle',react:entry.group+'-react',...(entry.walk?{walk:'master-walk-left'}:{})};
  for(const [action,name]of Object.entries(names)){
   const f=path.join(this.lab,'backend-template',entry.media[action].file),data=fs.readFileSync(f);
   if(hash(data)!==entry.media[action].sha256)throw new Error('BACKEND_DERIVATIVE_CHANGED');
   fs.writeFileSync(path.join(animation,name+'.webm'),data);
  }
  cfg.pets=[{...cfg.pets[0],id:'main',name:entry.name,size:Math.round(entry.geometry.defaultSize*config.size/100),display:'desktop',workStatusEnabled:false}];
  cfg.animations.idle=[names.idle];cfg.animations.clicks=[];cfg.animations.drag=[];cfg.animations.events={balance:[names.react],whisper:[names.react],workStatus:Array(6).fill(names.react)};
  cfg.animationWeights={idle:100,turn:0,move:0};
  if(entry.walk){
   // One finite native movement action; source frames contain no root travel.
   // The upstream tryMove/startMoveDrive owns the only root displacement.
   cfg.animations.moves={default:{minDist:entry.walk.distanceRef,maxDist:entry.walk.distanceRef,margin:18,leadSec:0,tailSec:0},actions:[{name:names.walk}]};
   cfg.pets[0].position={...cfg.pets[0].position,marginX:1100};
  }
  fs.writeFileSync(path.join(home,'dsh-pet/main-config.jsonc'),JSON.stringify(cfg,null,2));
  const profiles={[entry.group]:{...entry.geometry,id:entry.group,mirrorAllowed:false,props:entry.props}};
  const props={};const helper=path.join(this.lab,'dsh-pet/runtime/electron-helper');
  fs.mkdirSync(path.join(helper,'content-assets'),{recursive:true});
  for(const item of entry.props){const asset=resources[item.asset];fs.writeFileSync(path.join(helper,'content-assets',item.id+'.png'),asset.data);props[item.id]=item.geometry;}
  const data={profiles,animations:Object.fromEntries(Object.entries(names).map(([a,n])=>[n,{group:entry.group,loop:a==='idle',movement:a==='walk'}])),props};
  fs.writeFileSync(path.join(helper,'content-profiles.js'),'globalThis.DshContentProfiles='+JSON.stringify(data)+';\n');
  fs.writeFileSync(path.join(helper,'content-context.js'),'globalThis.DshCompanionContent='+JSON.stringify({contentKey,group:entry.group,managedHost:true})+';\n');
  for(const file of ['connection.json','snapshot.json','quit.json','reveal.json'])fs.rmSync(path.join(this.dir,file),{force:true});
  current();this.contentKey=contentKey;this.visibilityHeld=holdVisibility;
  const env={...process.env,DSH_HOST_PET_STATE:this.dir,DSH_HOME:home,DSH_HOST_PET_PARENT:String(process.pid),DSH_HOST_PET_CONTENT_KEY:contentKey,DSH_HOST_PET_GENERATION:String(generation),DSH_HOST_PET_HOLD:holdVisibility?'1':'0',DSH_HOST_PET_HOST_ORIGIN:this.host.origin,DSH_HOST_PET_HOST_TOKEN:this.host.token};delete env.ELECTRON_RUN_AS_NODE;
  const out=fs.openSync(path.join(this.dir,'backend.log'),'a');
  const child=spawn(path.join(this.lab,'DshHostPetBackend.app/Contents/MacOS/Electron'),[path.join(this.lab,'backend-entry.cjs')],{cwd:this.lab,env,stdio:['ignore',out,out]});this.child=child;
  child.on('exit',()=>{if(this.child===child){this.ready=false;this.token=null;}});
  try{
   await this.wait(()=>{current();if(!alive(child.pid))throw new Error('BACKEND_EXITED');const s=this.snapshot();return fs.existsSync(path.join(this.dir,'connection.json'))&&s.windows.length===1&&s.windows[0].renderer?.videos.some(v=>v.front&&v.source===names.idle+'.webm'&&v.loop&&!v.paused)&&s.windows[0].renderer.props.every(p=>p.complete)&&s.bodyInputs?.[0]?.rects>0;},'BACKEND_MEDIA_NOT_READY');
   current();this.token=token;this.ready=true;this.names=names;this.entry=entry;this.event('backend-ready',{pid:child.pid,contentKey,windows:1,size:cfg.pets[0].size,props:entry.props.length});
  }catch(error){if(this.child===child)await this.stop();throw error;}
 }
 async suspend(){if(!this.child||this.suspended)return;this.suspended=true;try{await this.api('pet-display',{id:'main',display:'none'});await this.wait(()=>this.snapshot().windows.length===0,'BACKEND_SUSPEND_TIMEOUT',3000);}catch(error){this.suspended=false;throw error;}}
 async releaseVisibility(){
  if(!this.child||!this.visibilityHeld)return;this.visibilityHeld=false;fs.writeFileSync(path.join(this.dir,'reveal.json'),'{}');
  if(!this.suspended)await this.wait(()=>this.snapshot().windows[0]?.visible===true,'BACKEND_REVEAL_TIMEOUT',4000);
 }
 async resume(){if(!this.child||!this.suspended)return;const revision=this.revision;await this.api('pet-display',{id:'main',display:'desktop'});await this.wait(()=>{if(revision!==this.revision)throw new Error('SKIN_OPERATION_SUPERSEDED');const w=this.snapshot().windows[0];return w?.visible===true&&w.renderer?.videos.some(v=>v.front&&v.source===this.names.idle+'.webm'&&!v.paused)&&w.renderer.props.every(p=>p.complete);},'BACKEND_RESUME_TIMEOUT',4000);this.suspended=false;}
 async act(action,assertCurrent=()=>{}){
  if(!this.ready||!this.names[action])throw new Error('ACTION_UNAVAILABLE');
  if(action==='walk'){
   const r=this.snapshot().windows[0]?.renderer,s=r?.sprites?.[0],g=this.entry.geometry;
   if(!s?.center||s.moving||s.dragging||s.positionFollow)throw new Error('WALK_BUSY');
   const halfBody=Math.max(320-g.hitBounds[0],g.hitBounds[2]-320)*s.size/640;
   const target=s.center.x-this.entry.walk.distanceLogical*s.size/640;
   const inside=x=>r.areas?.some(a=>x>=a.x&&x<=a.x+a.width&&s.center.y>=a.y&&s.center.y<=a.y+a.height);
   if(!inside(target-halfBody-18)||!inside(target+halfBody+18))throw new Error('WALK_LEFT_SPACE_REQUIRED');
  }
  const sequence=++this.sequence,revision=this.revision;
  const current=()=>{assertCurrent();if(sequence!==this.sequence||revision!==this.revision||!this.ready)throw new Error('SKIN_OPERATION_SUPERSEDED');};
  current();await this.releasing;current();const lockId=await this.lock.ensure();current();
  const receipt=await this.api('anim?pet=main&lock='+encodeURIComponent(lockId),{name:this.names[action],...(action==='walk'?{facing:'left'}:{})});current();
  await this.wait(()=>{current();const r=this.snapshot().windows[0]?.renderer;return r?.sprites[0]?.playback===receipt.playbackId&&r.videos.some(v=>v.front&&v.source===this.names[action]+'.webm'&&!v.paused);},'BACKEND_ACTION_NOT_PLAYING',3000);
  this.lastAction={action,playbackId:receipt.playbackId,status:'playing',at:Date.now()};this.event('backend-action',{...this.lastAction});
  void (async()=>{try{const polls=action==='walk'?240:180;for(let i=0;i<polls;i++){await delay(60);current();const r=await this.api('playback/'+receipt.playbackId);current();if(['ended','cancelled','failed'].includes(r.status)){this.releasing=this.lock.release();await this.releasing;current();this.lastAction={...this.lastAction,status:r.status};this.event('backend-action-terminal',{action,playbackId:receipt.playbackId,status:r.status});return;}}}catch{}})();
  return action;
 }
}
