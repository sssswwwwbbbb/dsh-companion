import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function verifyCompat({ctx,lab,report,log}){
 const out=path.join(report,'compatibility'),result={at:new Date().toISOString(),scope:'H2/H3/H4 targeted official Host interfaces only; old14/startup3 not rerun',checks:[],picker:'controlled dialog-result injection, OS picker GUI pending',clickIntent:'controlled native-intent packet, physical click pending',modelCalls:0,activationCalls:0,humanGUIAccepted:false};fs.mkdirSync(out,{recursive:true});
 const service=()=>ctx.get('dshCompanion'),clientId=service().controller.skins.page.client?.id||randomUUID();let seenCommand=null,ack=null;
 const poll=()=>{const r=service().skinPage({clientId,capable:true,seenCommand,...(ack?{ack}:{})});ack=null;if(r.command){seenCommand=r.command.id;if(['apply','update','exit'].includes(r.command.kind))ack={id:r.command.id,generation:r.command.generation,ok:true};}};poll();const timer=setInterval(()=>{try{poll();}catch{}},80);
 const until=async(predicate,code,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){const s=await service().status();if(predicate(s))return s;await delay(80);}throw new Error(code);};
 const check=(pass,name,data={})=>{result.checks.push({name,pass:!!pass,...data});if(!pass)throw new Error(name);};
 const writeFixture=x=>fs.writeFileSync(path.join(lab,'picker-fixture.json'),JSON.stringify(x));
 try{
  const registry=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json'))),key=registry.provenance.newKey;
  await service().skinStop();await service().skinSelect({contentKey:key});await until(s=>s.ready,'COMPAT_NATIVE_NOT_READY');
  writeFixture({canceled:true,filePaths:[]});let response=await service().skinInstall();check(response.skinImport?.canceled===true,'H2-existing-picker-route-preserves-cancel');
  const require=createRequire(path.join(lab,'staging/packages/dsh-companion/package.json')),{zipSync}=require('fflate');
  const content=path.join(lab,'content/archive-master04-private'),entries={};const add=(dir,prefix='')=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())add(path.join(dir,e.name),name+'/');else entries[name]=new Uint8Array(fs.readFileSync(path.join(dir,e.name)));}};add(content);
  const zip=path.join(lab,'compat-picker-candidate.zip');fs.writeFileSync(zip,zipSync(entries));writeFixture({canceled:false,filePaths:[zip]});response=await service().skinInstall();
  check(response.skinImport?.contentKey===key&&response.skinImport.filename==='compat-picker-candidate.zip','H2-selected-ZIP-uses-existing-library-validation');fs.rmSync(path.join(lab,'picker-fixture.json'));
  await service().skinConfigure({module:'pet',field:'allowActions',value:false});await service().skinStop();await service().skinSelect({contentKey:key});let s=await until(s=>s.ready,'H3_FALSE_APPLY_NOT_READY');
  const pid=s.backend.pid,win=s.backend.windows[0].id,generation=s.desktopSkin.generation,prior=s.backend.lastAction?.playbackId||null;
  const intent=()=>service().controller.request('/backend/input',{contentKey:key,generation,trigger:'click'});
  response=await intent();await service().controller.interactions.drainNative();s=await service().status();check(response.accepted===false&&(s.backend.lastAction?.playbackId||null)===prior,'H3-false-permission-does-not-execute');
  await service().skinConfigure({module:'pet',field:'allowActions',value:true});s=await service().status();check(s.backend.pid===pid&&s.backend.windows[0].id===win,'H3-permission-update-keeps-current-pet');
  response=await intent();await service().controller.interactions.drainNative();s=await until(s=>s.petInteraction.last?.actual.action==='react'&&s.backend.lastAction?.status==='playing','H3_TRUE_RESPONSE_NOT_PLAYING',6000);
  check(response.accepted===true&&s.petInteraction.last.mode==='local'&&s.backend.pid===pid,'H3-false-to-true-intent-reaches-actual-local-react',{playbackId:s.backend.lastAction.playbackId});
  await until(s=>s.backend.lastAction?.status==='ended','H3_REACT_NOT_ENDED',5000);await service().skinConfigure({module:'pet',field:'allowActions',value:false});s=await service().status();const last=s.backend.lastAction.playbackId;response=await intent();await service().controller.interactions.drainNative();s=await service().status();check(response.accepted===false&&s.backend.lastAction.playbackId===last,'H3-switching-off-again-remains-blocked');
  let staleBlocked=false;try{await service().controller.request('/backend/input',{contentKey:key,generation:generation-1,trigger:'click'});}catch{staleBlocked=true;}check(staleBlocked,'H3-stale-generation-intent-is-rejected');await service().skinConfigure({module:'pet',field:'allowActions',value:true});
  const info=JSON.parse(fs.readFileSync(path.join(lab,'host-runtime.json'))),dir=path.join(info.stateDir,'whole-pet'),snap=JSON.parse(fs.readFileSync(path.join(dir,'snapshot.json'))),cfg=JSON.parse(fs.readFileSync(path.join(dir,'home/dsh-pet/main-config.jsonc')));
  check(snap.applicationMenuPresent===false&&cfg.trayEnabled===false,'H4-independent-app-menu-and-tray-disabled');
  const context=fs.readFileSync(path.join(lab,'dsh-pet/runtime/electron-helper/content-context.js'),'utf8');check(context.includes('"managedHost":true'),'H4-native-menu-entry-uses-managed-policy');
  // Deliberately inject the upstream visibility mutation to test loss detection;
  // this is not a user-facing menu action and not an acceptance of that menu.
  const connection=JSON.parse(fs.readFileSync(path.join(dir,'connection.json')));await fetch(connection.origin+'/dsh-pet-7340/pet-display?surface=desktop',{method:'POST',headers:{'content-type':'application/json','x-dsh-pet-token':connection.token},body:JSON.stringify({id:'main',display:'none'})});
  s=await until(s=>s.backend?.windows.length===0&&!s.backend.ready,'H4_UNEXPECTED_LOSS_NOT_DETECTED',4000);check(s.backend.alive&&!s.backend.suspended,'H4-unexpected-zero-windows-invalidates-ready');
  fs.writeFileSync(path.join(out,'unexpected-native-loss.json'),JSON.stringify(s,null,2)+'\n');await service().skinStop();await service().skinSelect({contentKey:key});s=await until(s=>s.ready&&s.backend.windows.length===1,'H4_HOST_RECOVERY_NOT_READY');check(s.backend.windows[0].renderer.props.length===2,'H4-existing-Host-recovery-restores-owned-pet');
  await service().configure({autoStart:true,startupEnabled:true});result.next='fresh official Host cold process, no replayIntro';result.passed=true;
 }catch(error){result.passed=false;result.failure=error.code||error.message;log('compatibility-interface-failed',{code:result.failure});}
 finally{clearInterval(timer);fs.rmSync(path.join(lab,'picker-fixture.json'),{force:true});const f=path.join(out,'host-interfaces.json');if(fs.existsSync(f))fs.copyFileSync(f,path.join(out,'host-interfaces-before-'+Date.now()+'.json'));fs.writeFileSync(f,JSON.stringify(result,null,2)+'\n');}
 return {passed:result.passed,checks:result.checks.length,failure:result.failure,next:result.next};
}
