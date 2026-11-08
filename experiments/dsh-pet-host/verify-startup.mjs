import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
export async function verifyStartup({ctx,lab,report,log}){
 const prior=path.join(report,'startup-interface-verification.json');if(fs.existsSync(prior))fs.copyFileSync(prior,path.join(report,'startup-interface-before-'+Date.now()+'.json'));
 const result={at:new Date().toISOString(),scope:'only preserved startup interface; previously passed 14 checks retained without rerun',checks:[],modelCalls:0,activationCalls:0,controlledPageInterface:true,humanGUIAccepted:false,physicalDragAccepted:false};
 const service=()=>ctx.get('dshCompanion'),clientId=randomUUID();let seenCommand=null,ack=null;
 const poll=()=>{const out=service().skinPage({clientId,capable:true,seenCommand,...(ack?{ack}:{})});ack=null;if(out.command){seenCommand=out.command.id;if(['apply','update','exit'].includes(out.command.kind))ack={id:out.command.id,generation:out.command.generation,ok:true};}};
 poll();const timer=setInterval(()=>{try{poll();}catch{}},100);
 const until=async(test,code,ms)=>{const end=Date.now()+ms;while(Date.now()<end){const state=await service().status();if(test(state))return state;await new Promise(r=>setTimeout(r,100));}throw new Error(code);};
 const check=(pass,name)=>{result.checks.push({name,pass:!!pass});if(!pass)throw new Error(name);};
 try{
  // Establish one explicit committed skin for this startup-only check; this
  // does not recount the prior select/stop/restore checks as another matrix.
  const registry=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json')));
  await service().skinStop();await service().skinSelect({contentKey:registry.provenance.newKey});
  await until(s=>s.ready&&s.backend.windows.length===1,'STARTUP_PREREQUISITE_NOT_READY',20000);
  await service().replayIntro();let s=await until(s=>s.startup.rendererReady&&s.startup.playing&&s.startup.media==='video'&&s.backend.windows.length===0,'STARTUP_VIDEO_NOT_READY',8000);
  check(s.startup.media==='video'&&s.backend.windows.length===0,'existing-startup-video-ready-with-pet-suspended');
  fs.writeFileSync(path.join(report,'startup-native-playing.json'),JSON.stringify(s,null,2)+'\n');
  s=await until(s=>s.startup.completions>=1&&!s.startup.playing&&s.backend.windows[0]?.renderer?.videos.some(v=>v.front&&!v.paused),'STARTUP_RETURN_NOT_READY',14000);
  check(s.backend.windows.length===1&&s.backend.windows[0].renderer.props.length===2,'startup-completes-and-returns-one-native-pet-two-props');
  check(s.startup.hostReady,'startup-remains-bound-to-the-isolated-official-owner');
  fs.writeFileSync(path.join(report,'startup-native-returned.json'),JSON.stringify(s,null,2)+'\n');
  result.passed=true;
 }catch(e){result.passed=false;result.failure=e.code||e.message;log('startup-interface-failed',{code:result.failure});}
 finally{clearInterval(timer);fs.writeFileSync(path.join(report,'startup-interface-verification.json'),JSON.stringify(result,null,2)+'\n');}
 return result;
}
