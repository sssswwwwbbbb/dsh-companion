import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
const delay=ms=>new Promise(r=>setTimeout(r,ms));const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
export async function verify({ctx,lab,report,log}){
 const prior=path.join(report,'official-host-verification.json');if(fs.existsSync(prior))fs.copyFileSync(prior,path.join(report,'official-host-verification-before-'+Date.now()+'.json'));
 const result={at:new Date().toISOString(),scope:'actual official Host and native backend interfaces/lifecycle; controlled Page/Session input, no human UI claims',officialHost:true,modelCalls:0,activationCalls:0,themePageAcknowledgement:'controlled interface injection; no rendered theme acceptance',currentSessionWorkInput:'controlled local packet through existing skinPage/WorkFeedback path; not a real user turn',checks:[],failures:[],humanGUIAccepted:false,physicalDragAccepted:false};
 const service=()=>ctx.get('dshCompanion'),state=()=>service().status();
 const check=(condition,name,data={})=>{result.checks.push({name,pass:!!condition,...data});if(!condition)throw new Error(name);};
 const save=()=>fs.writeFileSync(path.join(report,'official-host-verification.json'),JSON.stringify(result,null,2)+'\n');
 const until=async(test,name,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){const s=await state();if(await test(s))return s;await delay(100);}throw new Error(name);};
 const clientId=randomUUID();result.injectedPageClientId=clientId;let seenCommand=null,ack=null,polling=false;
 const poll=()=>{const out=service().skinPage({clientId,capable:true,seenCommand,...(ack?{ack}:{})});ack=null;if(out.command){seenCommand=out.command.id;if(['apply','update','exit'].includes(out.command.kind)){ack={id:out.command.id,generation:out.command.generation,ok:true};log('controlled-page-interface-ack',{kind:out.command.kind,generation:out.command.generation});}}return out;};
 poll();const timer=setInterval(()=>{if(polling)return;polling=true;try{poll();}catch{}finally{polling=false;}},100);
 try{
  const registry=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json'))),master=registry.provenance.newKey,legacy=registry.provenance.legacyKey;
  check((await state()).license.active,'existing-signed-license-active-without-activation');
  if((await state()).skin.selected)await service().skinStop();
  await service().skinSelect({contentKey:master});let s=await until(s=>s.ready&&s.desktopSkin?.contentKey===master,'MASTER_NATIVE_READY');
  check(s.backend.windows.length===1&&s.backend.windows[0].renderer.props.length===2,'master-one-native-window-two-props');
  check(s.backend.oldPetBranchActive===false,'old-pet-branch-not-active');
  fs.writeFileSync(path.join(report,'master-native-ready.json'),JSON.stringify(s,null,2)+'\n');
  await service().skinConfigure({module:'pet',field:'size',value:80});s=await until(s=>s.ready&&s.backend.windows[0]?.renderer.sprites[0]?.size===548,'SIZE_MAPPING_NOT_READY');
  check(s.backend.windows[0].renderer.props.length===2,'existing-size-setting-maps-to-548-with-props');
  await service().skinConfigure({module:'pet',field:'size',value:100});s=await until(s=>s.ready&&s.backend.windows[0]?.renderer.sprites[0]?.size===685,'SIZE_RESTORE_NOT_READY');
  const g=s.skin.generation,key=s.desktopSkin.contentKey;
  // This invokes the existing local interaction service. It is NOT a mouse
  // click; the real native click bridge stays for consolidated GUI acceptance.
  const reply=await service().petInteract({trigger:'click',generation:g,contentKey:key});
  check(reply.mode==='local'&&reply.actual.action==='react','controlled-local-interaction-actually-started-react');
  await until(s=>s.backend.lastAction?.status==='ended','REACT_RECEIPT_NOT_ENDED',7000);
  const completed={generation:g,contentKey:key,revision:1,bindingId:randomUUID(),sessionId:'injected-current-session',seq:1,state:'completed',reducedMotion:false};
  service().skinPage({clientId,capable:true,seenCommand,work:completed});
  s=await until(s=>s.desktopSkin.workFeedback?.state==='completed'&&s.desktopSkin.workFeedback.action==='react','WORK_FEEDBACK_NOT_EXECUTED',7000);
  check(s.backend.lastAction?.action==='react','existing-session-work-route-started-native-react',{input:'controlled injection'});
  await until(s=>s.backend.lastAction?.status==='ended','WORK_REACT_NOT_ENDED',7000);
  const oldPid=s.backend.pid;await service().skinDisable({module:'pet',disabled:true,contentKey:master});s=await state();
  check(!s.backend.alive&&s.backend.windows.length===0&&!alive(oldPid),'pet-module-disable-waits-for-zero-windows-and-process-exit');
  await service().skinDisable({module:'pet',disabled:false,contentKey:master});s=await until(s=>s.ready&&s.backend.windows.length===1,'PET_REENABLE_NOT_READY');
  check(s.backend.windows[0].renderer.props.length===2,'pet-module-reenable-restores-one-prop-group');
  await service().skinSelect({contentKey:legacy});s=await until(s=>s.ready&&s.desktopSkin.contentKey===legacy,'LEGACY_NATIVE_NOT_READY');
  await service().skinConfigure({module:'pet',field:'smartEnabled',value:false});await service().skinConfigure({module:'pet',field:'allowSpeech',value:false});
  check(s.backend.windows.length===1&&s.backend.windows[0].renderer.props.length===0&&s.backend.windows[0].renderer.sprites[0].size===367,'legacy071-original-identity-maps-without-master-props');
  fs.writeFileSync(path.join(report,'legacy-native-ready.json'),JSON.stringify(s,null,2)+'\n');
  const pid=s.backend.pid;await service().skinStop();s=await state();check(!s.backend.alive&&s.backend.windows.length===0&&!alive(pid),'skin-stop-clears-native-and-helper-before-receipt');
  await service().skinSelect({contentKey:master});s=await until(s=>s.ready&&s.backend.windows.length===1,'MASTER_RESTORE_NOT_READY');
  const supervisor=s.pid,backendPid=s.backend.pid,manager=ctx.get('pluginManager');
  const off=await manager.setBundleEnabled('dsh-plugin-companion',false);check(off.application==='applied'&&!alive(supervisor)&&!alive(backendPid),'official-plugin-disable-cleans-supervisor-and-backend');
  const on=await manager.setBundleEnabled('dsh-plugin-companion',true);check(on.application==='applied','official-plugin-reenable-applied');
  await until(s=>s.license.active,'REENABLED_SERVICE_NOT_READY');
  seenCommand=null;ack=null;poll();
  await service().skinSelect({contentKey:master});s=await until(s=>s.ready&&s.backend.windows.length===1,'FINAL_MASTER_NOT_READY');
  check(s.backend.windows[0].renderer.props.length===2,'final-private-instance-one-window-two-props');
  const diagnostic=await service().controller.request('/diagnostics',{});check(!diagnostic.legacyBehaviorConstructed&&!diagnostic.legacyMovementTickInstalled&&diagnostic.legacyPetWindowCount===0,'native-diagnostic-confirms-whole-old-pet-unit-absent');
  fs.writeFileSync(path.join(report,'final-native-status.json'),JSON.stringify(s,null,2)+'\n');result.passed=true;
 }catch(error){result.passed=false;result.failures.push({code:error.code||error.message});log('verification-failed',{code:error.code||error.message});}
 finally{clearInterval(timer);save();}
 return {passed:result.passed,checks:result.checks.length,failures:result.failures,report:'official-host-verification.json',humanGUIAccepted:false,physicalDragAccepted:false};
}
