import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function pageFixture(ctx){const service=()=>ctx.get('dshCompanion'),clientId=service().controller.skins.page.client?.id||randomUUID();let seenCommand=null,ack=null;const poll=()=>{const r=service().skinPage({clientId,capable:true,seenCommand,...(ack?{ack}:{})});ack=null;if(r.command){seenCommand=r.command.id;if(['apply','update','exit'].includes(r.command.kind))ack={id:r.command.id,generation:r.command.generation,ok:true};}};poll();const timer=setInterval(()=>{try{poll();}catch{}},80);return()=>clearInterval(timer);}
export async function verifyCold({ctx,lab,report,mode,trace}){
 const service=()=>ctx.get('dshCompanion'),stop=pageFixture(ctx),result={at:new Date().toISOString(),mode,actualFreshOfficialHost:true,hostPid:process.pid,replayIntroCalls:0,controlledPageHandshake:true,modelCalls:0,checks:[],humanGUIAccepted:false};
 const until=async(predicate,code,ms=22000)=>{const end=Date.now()+ms;while(Date.now()<end){const s=await service().status();if(predicate(s))return s;await delay(80);}throw new Error(code);};
 const check=(pass,name,data={})=>{result.checks.push({name,pass:!!pass,...data});if(!pass)throw new Error(name);};
 try{
  if(mode==='enabled'){
   let s=await until(s=>s.startup?.coldAutoStarted&&(s.startup?.playing||s.startup?.completions===1),'H1_COLD_AUTOMATIC_OPENING_NOT_STARTED',12000);check(s.startup.coldRequested,'H1-cold-process-consumes-original-boot-intro-request');
   s=await until(s=>s.startup.completions===1&&!s.startup.playing&&s.ready&&s.skin.phase==='ready'&&s.backend.windows[0]?.visible===true&&!s.backend.suspended&&!s.backend.visibilityHeld&&s.backend.windows[0].renderer.props.length===2,'H1_COLD_HANDOFF_NOT_READY',22000);
   const samples=fs.readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse),opening=samples.filter(x=>x.startup?.coldPending||x.startup?.playing),exposed=opening.filter(x=>x.backend?.windows.some(w=>w.visible));
   check(opening.length>0&&samples.every(x=>x.hostPid===process.pid)&&exposed.length===0,'H1-pet-never-exposed-during-pending-or-playing-opening',{openingSamples:opening.length,exposed:exposed.length});
   check(s.backend.windows.length===1&&s.backend.windows[0].renderer.props.length===2&&!s.backend.suspended&&!s.backend.visibilityHeld,'H1-automatic-opening-finishes-before-visible-owned-pet');
   fs.writeFileSync(path.join(report,'compatibility/cold-enabled-native.json'),JSON.stringify(s,null,2)+'\n');
  }else{
   await until(s=>s.running&&s.startup?.protocolVersion===1&&(mode==='stopped'||s.skin.phase==='ready'),'H1_COLD_NATIVE_NOT_READY',12000);await delay(2200);const s=await service().status();check(!s.startup.coldAutoStarted&&!s.startup.playing&&s.startup.completions===0,'H1-'+mode+'-suppresses-cold-opening');
   if(mode==='stopped')check(s.skin.stopped&&!s.backend?.alive,'H1-stopped-skin-does-not-spawn-pet');
   fs.writeFileSync(path.join(report,'compatibility/cold-'+mode+'-native.json'),JSON.stringify(s,null,2)+'\n');
  }
  result.passed=true;
 }catch(error){result.passed=false;result.failure=error.code||error.message;}
 finally{stop();const out=path.join(report,'compatibility/cold-'+mode+'.json');if(fs.existsSync(out))fs.copyFileSync(out,out.replace('.json','-before-'+Date.now()+'.json'));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}
 return result;
}
export async function prepareCold({ctx,lab,mode}){
 const service=ctx.get('dshCompanion'),stop=pageFixture(ctx);try{
  const key=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json'))).provenance.newKey;
  if(mode==='stopped'){await service.configure({autoStart:true,startupEnabled:true});await service.skinStop();}
  else {let state=await service.status();if(state.skin.stopped){await service.skinSelect({contentKey:key});state=await service.status();}if(!!state.skin.disabled?.startup!==(mode==='module-off'))await service.skinDisable({module:'startup',disabled:mode==='module-off',contentKey:key});await service.configure({autoStart:true,startupEnabled:mode!=='startup-off'});}
  return {prepared:mode};
 }finally{stop();}
}
