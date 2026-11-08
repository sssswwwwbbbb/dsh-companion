import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {lab,report} from './setup.mjs';

const [mode,detail,target]=process.argv.slice(2);
const valid=mode==='toggle'?['soundEnabled','reducedMotion'].includes(detail)&&['true','false'].includes(target)
 : ['preview','cold'].includes(mode)&&['audible','muted','reduced','escape'].includes(detail);
if(!valid)throw new Error('UNKNOWN_COLD_START_OBSERVATION');
const exec=promisify(execFile),probe=fileURLToPath(new URL('probe.mjs',import.meta.url));
const {stateDir}=JSON.parse(fs.readFileSync(path.join(lab,'host-runtime.json')));
const events=()=>{try{return JSON.parse(fs.readFileSync(path.join(stateDir,'runtime-events.json'))).transitions;}catch{return [];}};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const status=async()=>{
 const {stdout}=await exec(process.execPath,[probe,'status'],{timeout:8000});
 return JSON.parse(stdout).value;
};
const visible=s=>s.backend?.windows?.filter(w=>w.visible===true)??[];
const before=await status(),startedAt=Date.now(),samples=[];
const result={mode,detail,before,startedAt};
const windowIdentity=s=>({generation:s.skin.generation,pid:s.backend?.pid,windows:visible(s).map(w=>w.id)});
async function until(predicate,ms){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){
  const s=await status();
  samples.push({at:Date.now(),...windowIdentity(s),value:s.settings?.[detail],opening:!!s.startup?.visible,
   audible:s.startup?.audioAudible??false,muted:s.startup?.audioMuted??null,media:s.startup?.media??null});
  if(predicate(s))return s;
  await delay(45);
 }
 throw new Error('OBSERVATION_TIMEOUT');
}
console.log('Armed '+[mode,detail,target].filter(Boolean).join(' '));
try{
 if(mode==='toggle'){
  const expected=target==='true';
  assert.notEqual(before.settings[detail],expected);
  assert.equal(visible(before).length,1);
  await until(s=>s.settings[detail]===expected,35000);
  const end=Date.now()+600;
  result.after=await until(()=>Date.now()>=end,2500);
  assert.equal(result.after.settings[detail],expected);
  for(const s of samples){
   assert.deepEqual({generation:s.generation,pid:s.pid,windows:s.windows},windowIdentity(before));
   assert.equal(s.opening,false);
  }
  assert.equal(events().filter(e=>e.at>=startedAt&&['backend-cleared','backend-ready','intro-start'].includes(e.type)).length,0);
 }else{
  if(mode==='cold')assert.ok(before.startup?.coldPending&&!before.page.available);
  const playing=await until(s=>s.startup?.visible&&s.startup.playing&&s.startup.rendererReady,35000);
  result.playing=playing;
  const complete=s=>s.startup?.completions===(before.startup?.completions||0)+1&&!s.startup.playing&&!s.startup.visible
    &&s.ready&&visible(s).length===1&&!s.backend.suspended&&!s.backend.visibilityHeld;
  result.after=await until(complete,22000);
  assert.equal(result.after.backend.pid,playing.backend.pid);
  const shown=samples.filter(s=>s.opening);
  const nativeEvents=events().filter(e=>e.at>=startedAt&&(/^intro-/.test(e.type)||e.type==='cold-intro-request'));
  const endings=nativeEvents.filter(e=>e.type==='intro-complete');
  assert.equal(endings.length,1);
  assert.equal(endings[0].audibleAfterClose,false);
  assert.equal(result.after.startup.audioAudible,false);
  assert.ok(shown.every(s=>s.windows.length===0));
  if(detail==='reduced'){
   assert.equal(playing.startup.media,'poster');
   assert.ok(shown.every(s=>!s.audible));
   assert.ok(nativeEvents.some(e=>e.type==='intro-presented'&&e.fallback==='reduced-motion'));
  }else{
   assert.equal(playing.startup.media,'video');
   assert.equal(playing.startup.audioMuted,detail==='muted');
   assert.equal(shown.some(s=>s.audible),detail!=='muted');
   if(detail==='escape'){
    assert.equal(endings[0].trigger,'escape');
    assert.equal(endings[0].audibleBeforeClose,true);
   }else{
    assert.equal(endings[0].trigger,'media-ended');
    assert.equal(endings[0].mediaEndedAt,12.5);
    const handoff=nativeEvents.find(e=>e.type==='intro-handoff');
    assert.ok(handoff?.mediaTime>=12.15&&handoff.mediaTime<12.21);
   }
  }
  if(mode==='cold')assert.equal(nativeEvents.filter(e=>e.type==='cold-intro-request').length,1);
  result.events=nativeEvents;
 }
 result.passed=true;
}catch(error){
 result.passed=false;
 result.error=error.message;
 result.events=events().filter(e=>e.at>=startedAt);
 process.exitCode=1;
}finally{
 result.samples=samples;
 const suffix=[mode,detail,target].filter(Boolean).join('-');
 fs.writeFileSync(path.join(report,suffix+(result.passed?'':'-failed-'+Date.now())+'.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({mode,detail,target,passed:result.passed,error:result.error,samples:samples.length,audible:samples.filter(s=>s.opening&&s.audible).length}));
}
