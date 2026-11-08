import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {promisify} from 'node:util';
import {lab,report} from './setup.mjs';

const mode=process.argv[2]||'natural';
assert.ok(['natural','click','work'].includes(mode));
const json=file=>JSON.parse(fs.readFileSync(file));
const {stateDir}=json(path.join(lab,'host-runtime.json'));
const nativeDir=path.join(stateDir,'whole-pet');
const probePath=fileURLToPath(new URL('probe.mjs',import.meta.url));
const probe=async command=>JSON.parse((await promisify(execFile)(process.execPath,[probePath,command])).stdout).value;
const candidate=json(path.join(report,'candidate.json'));
const entry=json(path.join(lab,'backend-template/runtime-candidates.json')).contents[candidate.contentKey];
const logFile=path.join(nativeDir,'backend.log');
const logOffset=fs.statSync(logFile).size;
const runtimeEvents=()=>json(path.join(stateDir,'runtime-events.json')).transitions;
const actionNames={walk:entry.media.walk.file,turn:entry.media.turnFront.file,idle:entry.media.idle.file};

function sample(){
 const {at,windows}=json(path.join(nativeDir,'snapshot.json'));
 assert.equal(windows.length,1);
 const {id,visible,bounds,renderer}=windows[0];
 const {anim,center,moving,positionFollow,playback,size}=renderer.sprites[0];
 const front=renderer.videos.find(v=>v.front);
 return {at,id,visible,bounds,anim,center,moving,positionFollow,playback,size,source:front.source,time:front.time,loop:front.loop,paused:front.paused};
}

async function workTakeover(status){
 // Inject one controlled running signal at the existing native bridge, keeping the Session history intact.
 const bridge=json(path.join(stateDir,'bridge.json'));
 assert.equal(bridge.pid,status.supervisorPid);
 const previous=runtimeEvents().findLast(e=>e.type==='work-feedback');
 const body={generation:status.skin.generation,contentKey:candidate.contentKey,revision:(previous?.revision||0)+1,
  sessionId:json(path.join(report,'session-transfer.json')).sessionId,bindingId:'cold-start-walk-check',seq:-1,state:'running'};
 const response=await fetch('http://127.0.0.1:'+bridge.port+'/skin/work',{method:'POST',
  headers:{Authorization:'Bearer '+bridge.token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 assert.ok(response.ok,'Native work signal was rejected');
 return response.json();
}

async function playback(id){
 const {origin,token}=json(path.join(nativeDir,'connection.json'));
 const url=new URL('/dsh-pet-7340/playback/'+encodeURIComponent(id)+'?surface=desktop',origin);
 assert.equal(url.hostname,'127.0.0.1');
 const response=await fetch(url,{headers:{'x-dsh-pet-token':token},signal:AbortSignal.timeout(5000)});
 const value=await response.json();
 assert.ok(response.ok&&value.ok!==false,'Native playback record unavailable');
 return value;
}

const before=await probe('status'),start=sample(),startedAt=Date.now(),samples=[start];
const result={mode,before,start,startedAt,samples};
try{
 assert.equal(before.skin.contentKey,candidate.contentKey);
 assert.ok(before.ready&&start.visible&&start.source===actionNames.idle);
 const trigger=await probe('walk-start');
 result.trigger=trigger;
 assert.equal(trigger.contentKey,candidate.contentKey);
 const id=trigger.action.playbackId;
 console.log(JSON.stringify({mode,playbackId:id,armed:true}));
 while(Date.now()<startedAt+14000){
  const current=sample();
  if(current.at!==samples.at(-1).at)samples.push(current);
  if(mode==='work'&&!result.work&&current.source===actionNames.walk&&current.time>=2){
   result.takeoverAt=Date.now();
   result.work=await workTakeover(before);
  }
  await delay(47);
 }
 result.after=await probe('status');
 result.events=runtimeEvents().filter(e=>e.at>=startedAt);
 result.playback=await playback(id);
 const walk=samples.filter(s=>s.source===actionNames.walk);
 const turn=samples.filter(s=>s.source===actionNames.turn);
 assert.ok(walk.length>=5&&walk.some(s=>s.moving));
 assert.ok(walk.every(s=>s.playback===id));
 assert.equal(result.after.backend.pid,before.backend.pid);
 assert.equal(result.after.skin.generation,before.skin.generation);
 assert.equal(result.after.skin.contentKey,before.skin.contentKey);
 assert.ok(samples.every(s=>s.id===start.id&&s.visible&&!s.positionFollow));
 const last=samples.at(-1);
 assert.ok(last.source===actionNames.idle&&last.loop&&!last.paused&&!last.moving);
 assert.equal(last.center.y,start.center.y);
 if(mode==='natural'){
  assert.equal(result.playback.status,'ended');
  assert.equal(result.events.filter(e=>e.type==='backend-action-terminal'&&e.playbackId===id&&e.status==='ended').length,1);
  assert.ok(turn.length>=3&&turn.every(s=>!s.moving&&!s.loop&&s.playback===id));
  assert.ok(turn.some(s=>s.time>=0.4&&!s.paused));
  assert.deepEqual(samples.slice(1).map(s=>s.source).filter((v,i,a)=>v!==a[i-1]),
   [actionNames.idle,actionNames.walk,actionNames.turn,actionNames.idle].slice(samples[1].source===actionNames.idle?0:1));
  const target=start.center.x-entry.walk.distanceLogical*start.size/640;
  assert.ok(Math.abs(last.center.x-target)<=1);
  assert.ok(turn.every(s=>s.center.x===last.center.x&&s.center.y===last.center.y));
  assert.ok(walk.every((s,i)=>i===0||s.center.x<=walk[i-1].center.x));
 }else{
  if(mode==='click'){
   const input=fs.readFileSync(logFile).subarray(logOffset).toString().split('\n')
    .map(line=>line.match(/\[pet-host-input\] (\{.*\})/))
    .filter(Boolean).map(m=>JSON.parse(m[1]));
   result.input=input.filter(e=>e.at>=startedAt&&e.trusted&&['pointerdown','pointerup'].includes(e.type));
   const down=result.input.find(e=>e.type==='pointerdown'&&e.button===0);
   assert.ok(down,'No trusted native pointerdown on the pet');
   result.takeoverAt=down.at;
  }else assert.equal(result.work?.state==='running'&&result.work.action,'idle');
  assert.equal(result.playback.status,'cancelled');
  assert.equal(turn.length,0);
  const stopped=samples.find(s=>s.at>=result.takeoverAt&&!s.moving&&s.source!==actionNames.walk);
  assert.ok(stopped&&stopped.at-result.takeoverAt<650);
  assert.ok(last.center.x<start.center.x&&last.center.x>start.center.x-entry.walk.distanceLogical*start.size/640);
  assert.ok(samples.filter(s=>s.at>=stopped.at).every(s=>!s.moving&&s.center.x===last.center.x));
  result.stopped=stopped;
 }
 result.passed=true;
}catch(error){
 result.passed=false;result.error=error.message;process.exitCode=1;
}
const suffix=result.passed?'':'-failed-'+Date.now();
fs.writeFileSync(path.join(report,'walk-'+mode+suffix+'.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({mode,passed:result.passed,error:result.error,samples:samples.length,
 start:start.center,after:samples.at(-1).center,terminal:result.playback?.status,
 turnSamples:samples.filter(s=>s.source===actionNames.turn).length}));
