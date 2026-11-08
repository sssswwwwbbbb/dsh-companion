import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createNativeLock} from './native-lock.mjs';
import {backendReadiness} from './compatibility.mjs';
import {atomicJson} from './skin-core/src/state.mjs';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const hash=data=>createHash('sha256').update(data).digest('hex');
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const idlePresented=(renderer,name)=>renderer?.videos.some(v=>v.front&&v.source===name+'.webm'&&v.loop&&(!v.paused||v.parkedIdle===true));
export class WholePetBackend {
 constructor({stateDir,host,event}){
  this.root=fileURLToPath(new URL('pet-backend/',import.meta.url));
  this.dir=path.join(stateDir,'whole-pet');fs.mkdirSync(this.dir,{recursive:true,mode:0o700});
  this.host=host;this.event=event;this.revision=0;this.sequence=0;this.token=null;
  this.entry=JSON.parse(fs.readFileSync(path.join(this.root,'skin.json')));
 }
 supports(contentKey){return this.entry.contentKey===contentKey||this.entry.compatibleContentKeys?.includes(contentKey)===true;}
 snapshot(){try{return JSON.parse(fs.readFileSync(path.join(this.dir,'snapshot.json')));}catch{return {windows:[],errors:[]};}}
 status(){const live=!!this.child&&alive(this.child.pid),snap=live?this.snapshot():{windows:[]},ready=backendReadiness({registered:this.ready,alive:live,suspended:this.suspended,held:this.visibilityHeld,snapshot:snap});return {engine:'dsh-pet',version:'0.4.1',pid:live?this.child.pid:null,alive:live,ready,suspended:this.suspended===true,visibilityHeld:this.visibilityHeld===true,contentKey:live?this.contentKey:null,windows:snap.windows,errors:snap.errors||[],lastAction:this.lastAction||null};}
 async wait(predicate,code,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await delay(60);}throw new Error(code);}
 async api(route,body,method=body===undefined?'GET':'POST'){
  const n=JSON.parse(fs.readFileSync(path.join(this.dir,'connection.json')));
  const origin=new URL(n.origin);
  if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||!n.token)throw new Error('BACKEND_CONNECTION_INVALID');
  const r=await fetch(n.origin+'/dsh-pet-7340/'+route+(route.includes('?')?'&':'?')+'surface=desktop',{method,headers:{'content-type':'application/json','x-dsh-pet-token':n.token},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(4000)});
  const value=r.status===204?{}:await r.json();if(!r.ok||value.ok===false)throw new Error('BACKEND_REQUEST_FAILED');return value;
 }
 async stop(){
  if(this.stopping)return this.stopping;
  this.revision++;this.sequence++;this.ready=false;this.suspended=false;this.visibilityHeld=false;this.token=null;this.lastAction=null;this.pendingAction=undefined;
  const child=this.child;if(!child)return {cleared:true,windows:0};
  this.stopping=(async()=>{
   child.kill('SIGTERM');
   try{await this.wait(()=>!alive(child.pid),'BACKEND_EXIT_TIMEOUT',3000);}
   catch{child.kill('SIGKILL');await this.wait(()=>!alive(child.pid),'BACKEND_STILL_ALIVE',2000);}
   if(this.child===child)this.child=null;
   this.event('backend-cleared',{pid:child.pid,windows:0});
   return {cleared:true,windows:0};
  })();
  try{return await this.stopping;}finally{this.stopping=null;}
 }
 async apply({config,token,resources,contentKey,generation,assertCurrent,holdVisibility=false}){
  await this.stop();const revision=++this.revision;
  const current=()=>{assertCurrent();if(revision!==this.revision)throw new Error('SKIN_OPERATION_SUPERSEDED');};
  current();if(!this.supports(contentKey))throw new Error('BACKEND_CONTENT_NOT_REGISTERED');
  const entry=this.entry;
  const home=path.join(this.dir,'home'),animation=path.join(home,'dsh-pet/main-animation/webm');fs.mkdirSync(animation,{recursive:true});
  const cfg=JSON.parse(fs.readFileSync(path.join(this.root,'config.json')));
  const names={idle:entry.media.idle.id,react:entry.media.react.id,walk:entry.media.walk.id};
  for(const {id,file,sha256}of Object.values(entry.media)){
   const data=resources[id]?.data;
   if(!data||hash(data)!==sha256)throw new Error('BACKEND_CONTENT_CHANGED');
   fs.writeFileSync(path.join(animation,file),data);
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
  for(const file of ['connection.json','snapshot.json','reveal.json','resize.json'])fs.rmSync(path.join(this.dir,file),{force:true});
  current();this.visibilityHeld=holdVisibility;this.releasing=null;
  const env={HOME:process.env.HOME,PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,
   DSH_HOME:home,DSH_COMPANION_PET_WORKER:'1',DSH_COMPANION_PET_STATE:this.dir,DSH_COMPANION_PET_PARENT:String(process.pid),
   DSH_COMPANION_PET_CONTENT_KEY:contentKey,DSH_COMPANION_PET_GENERATION:String(generation),DSH_COMPANION_PET_HOLD:holdVisibility?'1':'0',
   DSH_COMPANION_PET_ORIGIN:this.host.origin,DSH_COMPANION_PET_TOKEN:this.host.token};
  this.contentKey=contentKey;
  const child=spawn(process.execPath,[],{env,stdio:'ignore'});this.child=child;
  child.on('error',()=>{if(this.child===child)this.ready=false;});
  child.on('exit',()=>{if(this.child===child){this.ready=false;this.token=null;}});
  this.lock=createNativeLock({acquire:ttl=>this.api('lock?pet=main',{ttl}),release:lockId=>this.api('lock/release?pet=main',{lockId})});
  try{
   await this.wait(()=>{current();if(!alive(child.pid))throw new Error('BACKEND_EXITED');const s=this.snapshot();return fs.existsSync(path.join(this.dir,'connection.json'))&&s.windows.length===1&&idlePresented(s.windows[0].renderer,names.idle)&&s.windows[0].renderer.props.every(p=>p.complete)&&s.bodyInputs?.[0]?.rects>0;},'BACKEND_MEDIA_NOT_READY');
   current();this.token=token;this.ready=true;this.names=names;this.event('backend-ready',{pid:child.pid,contentKey,windows:1,size:cfg.pets[0].size});
  }catch(error){if(this.child===child)await this.stop();throw error;}
 }
 async resize(percent,assertCurrent){
  const revision=this.revision,child=this.child;
  const current=()=>{assertCurrent();if(revision!==this.revision||!this.ready||!child||!alive(child.pid))throw new Error('SKIN_OPERATION_SUPERSEDED');};
  current();
  const size=Math.round(this.entry.geometry.defaultSize*percent/100);
  const config=path.join(this.dir,'home/dsh-pet/main-config.jsonc');
  const save=()=>{
   current();const value=JSON.parse(fs.readFileSync(config,'utf8'));
   if(value.pets[0].size!==size){value.pets[0].size=size;atomicJson(config,value);}
  };
  const window=this.snapshot().windows[0];
  if(this.suspended){save();return;}
  if(!window)throw new Error('BACKEND_WINDOW_UNAVAILABLE');
  const id=randomUUID(),file=path.join(this.dir,'resize.json');
  if(this.resizing)throw new Error('BACKEND_RESIZE_BUSY');
  atomicJson(file,{id,size,windowId:window.id});
  const resize=this.wait(()=>{
   current();const snapshot=this.snapshot(),active=snapshot.windows[0];
   return active?.id===window.id&&active.resize?.id===id&&active.resize.size===size&&
    active.renderer?.sprites[0]?.size===size&&snapshot.bodyInputs?.[0]?.rects>0;
  },'BACKEND_RESIZE_TIMEOUT',15000);
  this.resizing=resize;
  try{await resize;save();this.event('backend-resized',{pid:child.pid,windowId:window.id,size});}
  finally{
   if(this.resizing===resize){this.resizing=null;fs.rmSync(file,{force:true});}
  }
 }
 async suspend(){if(this.resizing)await this.resizing.catch(()=>{});if(!this.child||this.suspended)return;this.suspended=true;try{await this.api('pet-display',{id:'main',display:'none'});await this.wait(()=>this.snapshot().windows.length===0,'BACKEND_SUSPEND_TIMEOUT',3000);}catch(error){this.suspended=false;throw error;}}
 async releaseVisibility(){
  if(!this.child||!this.visibilityHeld)return;fs.writeFileSync(path.join(this.dir,'reveal.json'),'{}');
  if(!this.suspended)await this.wait(()=>this.snapshot().windows[0]?.visible===true,'BACKEND_REVEAL_TIMEOUT',4000);
  this.visibilityHeld=false;
 }
 async resume(){if(!this.child||!this.suspended)return;const revision=this.revision;await this.api('pet-display',{id:'main',display:'desktop'});await this.wait(()=>{if(revision!==this.revision)throw new Error('SKIN_OPERATION_SUPERSEDED');const w=this.snapshot().windows[0];return w?.visible===true&&idlePresented(w.renderer,this.names.idle)&&w.renderer.props.every(p=>p.complete);},'BACKEND_RESUME_TIMEOUT',4000);this.suspended=false;}
 async say(text,assertCurrent=()=>{}){
  if(typeof text!=='string'||text.length>120)throw new Error('PET_DECISION_INVALID');
  text=text.trim();if(!text)return '';
  const revision=this.revision,sequence=this.sequence,lock=this.lock;
  const current=()=>{assertCurrent();if(!this.ready||this.revision!==revision)throw new Error('SKIN_OPERATION_SUPERSEDED');};
  current();
  try{
   const lockId=await lock.ensure();current();
   await this.api('broadcast?pet=main&lock='+encodeURIComponent(lockId),{text,duration:8000,anim:false});current();
   await this.wait(()=>{current();return this.snapshot().windows[0]?.renderer?.sprites?.[0]?.bubbleText===text;},'BACKEND_SPEECH_NOT_PRESENTED',2000);
   return text;
  }finally{
   if(this.revision===revision&&this.sequence===sequence&&this.pendingAction===undefined&&this.lastAction?.status!=='playing')await lock.release();
  }
 }
 async act(action,assertCurrent=()=>{}){
  if(!this.ready||!this.names[action])throw new Error('ACTION_UNAVAILABLE');
  if(action==='walk'){
   const r=this.snapshot().windows[0]?.renderer,s=r?.sprites?.[0];
   if(!s?.center||s.moving||s.dragging||s.positionFollow)throw new Error('WALK_BUSY');
   if(!this.canWalk(r))throw new Error('WALK_LEFT_SPACE_REQUIRED');
  }
  const sequence=++this.sequence,revision=this.revision,lock=this.lock;
  this.pendingAction=sequence;
  const ownsPlayback=()=>{if(sequence!==this.sequence||revision!==this.revision||!this.ready)throw new Error('SKIN_OPERATION_SUPERSEDED');};
  const current=()=>{assertCurrent();ownsPlayback();};
  try{
   current();await this.releasing;current();const lockId=await lock.ensure();current();
   const receipt=await this.api('anim?pet=main&lock='+encodeURIComponent(lockId),{name:this.names[action],...(action==='walk'?{facing:'left'}:{})});current();
   await this.wait(()=>{current();const r=this.snapshot().windows[0]?.renderer;return r?.sprites[0]?.playback===receipt.playbackId&&r.videos.some(v=>v.front&&v.source===this.names[action]+'.webm'&&!v.paused);},'BACKEND_ACTION_NOT_PLAYING',3000);
   this.lastAction={action,playbackId:receipt.playbackId,status:'playing',at:Date.now()};this.event('backend-action',{...this.lastAction});
   void (async()=>{try{const polls=action==='walk'?240:180;for(let i=0;i<polls;i++){await delay(60);ownsPlayback();const r=await this.api('playback/'+receipt.playbackId);ownsPlayback();if(['ended','cancelled','failed'].includes(r.status)){this.releasing=lock.release();await this.releasing;ownsPlayback();this.lastAction={...this.lastAction,status:r.status};this.event('backend-action-terminal',{action,playbackId:receipt.playbackId,status:r.status});return;}}}catch{}})();
   return action;
  }finally{if(this.pendingAction===sequence)this.pendingAction=undefined;}
 }

 canWalk(renderer=this.snapshot().windows[0]?.renderer){
  const s=renderer?.sprites?.[0],g=this.entry?.geometry;
  if(!g||!s?.center||s.moving||s.dragging||s.positionFollow)return false;
  const halfBody=Math.max(320-g.hitBounds[0],g.hitBounds[2]-320)*s.size/640;
  const target=s.center.x-this.entry.walk.distanceLogical*s.size/640;
  const inside=x=>renderer.areas?.some(a=>x>=a.x&&x<=a.x+a.width&&s.center.y>=a.y&&s.center.y<=a.y+a.height);
  return !!(inside(target-halfBody-18)&&inside(target+halfBody+18));
 }

 canWorkReact(renderer=this.snapshot().windows[0]?.renderer){
  const sprite=renderer?.sprites?.[0];
  return !!(this.ready&&this.pendingAction===undefined&&sprite&&!sprite.dragging&&!sprite.moving&&idlePresented(renderer,this.names.idle));
 }

 async workReaction(assertCurrent,action='react'){
  if(!this.canWorkReact())return null;
  const pending=this.act(action,assertCurrent),sequence=this.sequence;
  try{await pending;}catch(error){
   const sprite=this.snapshot().windows[0]?.renderer?.sprites?.[0];
   if(this.ready&&this.sequence===sequence&&!sprite?.dragging)await this.act('idle');
   throw error;
  }
  const playbackId=this.lastAction.playbackId;
  return current=>{
   if(!this.ready||this.sequence!==sequence)return null;
   const sprite=this.snapshot().windows[0]?.renderer?.sprites?.[0];
   if(sprite?.playback!==playbackId||sprite.dragging||sprite.moving&&action!=='walk')return null;
   return this.act('idle',current);
  };
 }
}
