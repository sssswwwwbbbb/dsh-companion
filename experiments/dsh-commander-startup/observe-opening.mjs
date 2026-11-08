import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lab,report,comparisonKey} from './setup.mjs';

const [mode]=process.argv.slice(2);
if(!['manual','escape','stop','switch','reduced','cold'].includes(mode))throw new Error('UNKNOWN_OBSERVATION');
const write=(f,v)=>fs.writeFileSync(path.join(report,f),JSON.stringify(v,null,2)+'\n');
const probe=fileURLToPath(new URL('probe.mjs',import.meta.url));
const exec=promisify(execFile);
async function command(method){const {stdout}=await exec(process.execPath,[probe,method],{timeout:8000});return JSON.parse(stdout).value;}
const runtime=JSON.parse(fs.readFileSync(path.join(lab,'host-runtime.json')));
const runtimeEvents=()=>{try{return JSON.parse(fs.readFileSync(path.join(runtime.stateDir,'runtime-events.json'))).transitions;}catch{return [];}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,ms)=>{const end=Date.now()+ms;while(Date.now()<end){const s=await command('status');if(fn(s))return s;await pause(80);}throw new Error('STARTUP_NATIVE_OBSERVATION_TIMEOUT');};
const before=await command('status'),startedAt=Date.now(),oldCompletions=before.startup?.completions||0;
let playing,after,actionReceipt,samples=[];
const visiblePet=s=>s.backend?.windows?.some(w=>w.visible===true)===true;
try{
 console.log('Armed '+mode+' at '+startedAt);
 playing=await until(s=>{
  if(s.startup?.playing)samples.push({at:Date.now(),visiblePet:visiblePet(s),visible:s.startup.visible,media:s.startup.media});
  return s.startup?.visible&&s.startup.playing&&s.startup.rendererReady;
 },35000);
 if(mode==='stop'||mode==='switch')actionReceipt=await command(mode==='stop'?'stop-effects':'select-comparison');
 const ended=s=>s.supervisorPid===playing.supervisorPid&&!s.startup?.playing&&!s.startup?.visible;
 if(mode==='stop')after=await until(s=>ended(s)&&s.skin.stopped&&s.backend?.windows.length===0&&s.backend?.pid===null,6000);
 else if(mode==='switch')after=await until(s=>ended(s)&&s.skin.contentKey===comparisonKey&&s.skin.phase==='ready'&&visiblePet(s),10000);
 else after=await until(s=>{
  if(s.startup?.playing)samples.push({at:Date.now(),visiblePet:visiblePet(s),visible:s.startup.visible,media:s.startup.media});
  return ended(s)&&s.startup?.completions===oldCompletions+1&&s.ready&&visiblePet(s)&&!s.backend.suspended&&!s.backend.visibilityHeld;
 },22000);
 const events=runtimeEvents().filter(e=>e.at>=startedAt&&(/intro-|isolated-host-return/.test(e.type)));
 const starts=events.filter(e=>e.type==='intro-start'),finish=events.find(e=>e.type==='intro-complete'),handoff=events.find(e=>e.type==='intro-handoff'),cancel=events.find(e=>e.type==='intro-cancelled');
 const onScreen=samples.filter(s=>s.visible);
 const ok=starts.length===1&&onScreen.every(s=>!s.visiblePet)&&(
  mode==='stop'||mode==='switch'?!!cancel&&!finish&&after.startup.completions===oldCompletions:
  mode==='escape'?finish?.trigger==='escape'&&!finish.videoEnded&&!handoff:
  mode==='reduced'?playing.startup.media==='poster'&&events.some(e=>e.fallback==='reduced-motion')&&!!finish&&!handoff:
  finish?.trigger==='media-ended'&&!!handoff&&finish.videoEnded&&(
   mode!=='cold'||before.startup.coldPending&&events.some(e=>e.type==='cold-intro-request'&&e.workspaceCommitted)&&after.startup.coldAutoStarted));
 write(mode+'-native.json',{passed:ok,mode,before,playing,after,actionReceipt,events,openingSamples:onScreen.length,petVisibleDuringOpening:onScreen.filter(s=>s.visiblePet).length});
 console.log(JSON.stringify({mode,passed:ok,trigger:finish?.trigger||cancel?.reason||null,supervisor:after.supervisorPid,
  backend:after.backend?.pid,completion:after.startup?.completions,openingSamples:onScreen.length,petVisibleDuringOpening:onScreen.filter(s=>s.visiblePet).length}));
 process.exitCode=ok?0:1;
}catch(error){
 write(mode+'-native-failed-'+Date.now()+'.json',{mode,passed:false,before,playing,after,actionReceipt,error:error.message,
  events:runtimeEvents().filter(e=>e.at>=startedAt&&(/intro-|isolated-host-return/.test(e.type)))});
 console.error(error.message);process.exitCode=1;
}
