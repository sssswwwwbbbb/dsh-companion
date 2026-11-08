import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=fileURLToPath(new URL('../../',import.meta.url));
const [installation,mode,output]=process.argv.slice(2);
assert.ok(['natural','escape','disabled','hot','silent','reduced'].includes(mode));
const emulateFocus=process.argv.includes('--emulate-focus');
const expectOpening=mode!=='disabled'&&mode!=='hot';
const read=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
const dirOf=profile=>createHash('sha256').update(profile).digest('hex').slice(0,16);
const {home,profileDir,sha256,passed,status,executable}=read(installation);
assert.ok(passed&&status.version==='0.1.0-dev.26'&&home.startsWith(path.join(root,'.local/dev26-official-host-')));
assert.equal(profileDir,path.join(home,'profiles/desktop'));
const stateDir=path.join(home,'companion',dirOf(profileDir)),data=path.join(home,'chromium');
const stateFile=path.join(stateDir,'skin-state.json'),settingsFile=path.join(stateDir,'settings.json');
const licenseFile=path.join(stateDir,'license.json');
const key='3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16';
const {defaultSize}=read(path.resolve(path.dirname(executable),'../Resources/app/pet-backend/skin.json')).geometry;
const pixels=value=>Math.round(defaultSize*value/100);
if(mode==='natural'){
  const previous=read(path.join(root,'reports/dsh-cold-start-dev25-2026-11-05/official-host.json'));
  assert.ok(previous.home.startsWith(path.join(root,'.local/dev25-official-host-')));
  const source=path.join(previous.home,'companion',dirOf(previous.profileDir));
  const state=read(path.join(source,'skin-state.json'));
  assert.equal(state.selected.contentKey,key);
  state.selected.root=path.join(stateDir,'skin-packages',key);
  assert.ok(fs.existsSync(path.join(state.selected.root,'skin.json')));
  write(stateFile,state);
  const settings=read(path.join(source,'settings.json'));
  write(settingsFile,{...settings,settings:{...settings.settings,launcherEnabled:true}});
  const license=read(path.join(source,'license.json'));
  assert.ok(license.receipt&&!license.blocked);
  write(licenseFile,license);
}
const license=read(licenseFile);
assert.ok(license.receipt&&!license.blocked);
// Keep the already signed, same-device receipt unchanged and test locally.
write(licenseFile,{...license,checkedAt:Date.now()});
const oldSettings=read(settingsFile);
if(!expectOpening)write(settingsFile,{...oldSettings,settings:{...oldSettings.settings,startupEnabled:false}});
const overriddenStartup=mode==='silent'?'soundEnabled':mode==='reduced'?'reducedMotion':null;
let oldStartupValue;
if(overriddenStartup){
  const state=read(stateFile),skin=state.selected.manifest.id;
  const startup=((state.overrides[skin]??={}).startup??={});
  oldStartupValue=startup[overriddenStartup];
  startup[overriddenStartup]=mode==='reduced';write(stateFile,state);
}
const portFile=path.join(data,'DevToolsActivePort');
fs.mkdirSync(data,{recursive:true,mode:0o700});fs.rmSync(portFile,{force:true});
const env={PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,DSH_HOME:home,
  DSH_TELEMETRY_DISABLED:'1',DSH_DESKTOP_UPDATE_CHECK_INTERVAL_MS:'3600000',DEEPSEEK_API_KEY:'local-dev26-qa-unused'};
const binary='/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
const args=[`--user-data-dir=${data}`,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1'];
const fd=fs.openSync(path.join(home,mode+'.log'),'w',0o600);
const app=spawn(binary,args,{cwd:home,env,stdio:['ignore',fd,fd]});
const exited=new Promise(resolve=>app.once('exit',resolve));
const report={mode,artifactSha256:sha256,hostVersion:status.dshVersion,desktopPid:app.pid,isolated:true,emulateFocus,samples:[]};
let ws,seq=0;
const pending=new Map();
const wait=async(fn,reason,ms=15000)=>{
  const deadline=Date.now()+ms;
  while(Date.now()<deadline){
    if(app.exitCode!==null||app.signalCode)throw Error('ISOLATED_DSH_EXITED');
    const value=await fn();if(value)return value;
    await delay(65);
  }
  throw Error(reason);
};
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT '+method));},4000);
  pending.set(id,(error,value)=>{clearTimeout(timer);if(error)reject(Error(error.message));else resolve(value);});
  ws.send(JSON.stringify({id,method,params}));
});
async function evaluate(expression){
  const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
const press=async(key,code,windowsVirtualKeyCode)=>{
  for(const type of ['rawKeyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode});
};
const remote=async(method,args)=>evaluate(`(async()=>{
  const method=${JSON.stringify(method)},args=${JSON.stringify(args)},rpcId=crypto.randomUUID();
  const res=await fetch('/api/'+method,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({type:'client-request',rpcId,method,payload:{args}})});
  const envelope=await res.json();
  return {http:res.status,ok:envelope.result?.ok===true,application:envelope.result?.value?.application??null,
    errorCode:envelope.result?.error?.code??null};
})()`);
async function native(){
  const file=path.join(stateDir,'bridge.json');if(!fs.existsSync(file))return null;
  const {port,token}=read(file);
  assert.ok(Number.isInteger(port)&&port>0&&port<65536&&/^[a-f0-9]{64}$/.test(token));
  return fetch(`http://127.0.0.1:${port}/status`,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(1000)})
    .then(r=>r.ok?r.json():null).catch(()=>null);
}
const sample=()=>evaluate(`(() => {
  const root=document.getElementById('root'),layer=document.querySelector('[data-dsh-companion-desktop-opening]'),video=layer?.querySelector('video');
  return {at:performance.now(),layer:layer?.dataset.dshCompanionDesktopOpening??null,inert:root?.inert??false,
    workspace:!!root?.querySelector('[role=textbox],textarea,[contenteditable=true]'),
    nativeBoot:!!document.querySelector('[data-dsh-boot]'),gesture:navigator.userActivation.isActive,
    media:video&&Number.isFinite(video.duration)?{time:video.currentTime,duration:video.duration,muted:video.muted,audioBytes:video.webkitAudioDecodedByteCount}:null};
})()`);
const summary=s=>{
  const backend=s.backend,win=backend.windows[0],sprite=win.renderer.sprites[0];
  return {pid:backend.pid,supervisorPid:s.pid,windowId:win.id,visible:win.visible,bounds:win.bounds,
    size:sprite.size,center:sprite.center,hitRect:sprite.hitRect,generation:s.skin.generation,parked:win.renderer.videos[0]?.parkedIdle};
};
async function openSettings(){
  await wait(async()=>evaluate(`(() => {
    const button=document.querySelector('.dsh-skin-entry-light')?.closest('button,[role=button],a')??[...document.querySelectorAll('button,[role=button]')].find(e=>['陪伴','Companion'].includes(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent.trim()));
    if(!button)return false;button.click();return true;
  })()`),'COMPANION_ENTRY_NOT_FOUND');
  await wait(async()=>evaluate(`(() => {
    const button=[...document.querySelectorAll('.dshc-page button')].find(e=>e.textContent.trim()==='本套设置');
    if(!button||button.disabled)return false;button.click();return true;
  })()`),'SKIN_SETTINGS_NOT_FOUND');
}

try{
  const port=await wait(()=>fs.existsSync(portFile)&&Number(fs.readFileSync(portFile,'utf8').split('\n')[0]),'DSH_DEVTOOLS_NOT_READY');
  const targets=()=>fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1500)}).then(r=>r.json()).catch(()=>[]);
  const page=await wait(async()=>(await targets()).find(x=>x.type==='page'&&x.url==='dsh-app://app/'),'DSH_TARGET_NOT_READY');
  report.targetId=page.id;
  ws=new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener('message',({data})=>{
    const msg=JSON.parse(data),done=pending.get(msg.id);if(!done)return;pending.delete(msg.id);done(msg.error,msg.result);
  });
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  if(emulateFocus)await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await evaluate(`(() => {
    window.__dev26QaEndings=[];
    document.addEventListener('ended',event=>{
      const video=event.target;
      if(!video.closest?.('[data-dsh-companion-desktop-opening]'))return;
      window.__dev26QaEndings.push({time:video.currentTime,duration:video.duration,ended:video.ended,muted:video.muted,audioBytes:video.webkitAudioDecodedByteCount});
    },true);
  })()`);
  let sawPlaying=false,sawStill=false,sawHeldPet=false,sentEscape=false;
  await wait(async()=>{
    const view=await sample();report.samples.push(view);
    if(view.layer){
      assert.ok(view.inert);
      const live=await native();
      if(live?.backend?.windows.some(w=>w.visible))assert.equal((await sample()).layer,null);
      sawHeldPet||=live?.startup?.desktopOpeningHeld===true;
      sawPlaying||=view.layer==='playing'&&view.media?.time>0;
      sawStill||=view.layer==='still';
      if(mode==='escape'&&!sentEscape&&view.media?.time>.45){sentEscape=true;await press('Escape','Escape',27);}
    }
    const presented=mode==='reduced'?sawStill:sawPlaying;
    if(expectOpening&&view.workspace&&!view.inert&&!presented)throw Error('WORKSPACE_WAS_OPERABLE_BEFORE_OPENING');
    return view.workspace&&!view.inert&&!view.layer&&(!expectOpening||presented);
  },'OPENING_OR_WORKSPACE_NOT_READY',32000);
  const live=await wait(async()=>{
    const s=await native();return s?.ready&&s.backend?.windows[0]?.visible&&s;
  },'NATIVE_PET_NOT_READY');
  assert.equal((await targets()).find(x=>x.type==='page'&&x.url==='dsh-app://app/').id,page.id);
  assert.equal(live.startup.completions,0);
  assert.equal(live.settings.launcherEnabled,false);
  report.opening={sawPlaying,sawStill,sawHeldPet,sentEscape,endings:await evaluate('window.__dev26QaEndings'),sameTarget:true,
    beforeFirstOperableWorkspace:expectOpening?true:null,launchPreference:live.settings.startupEnabled};
  if(mode==='natural'){
    assert.ok(sawPlaying&&sawHeldPet);
    assert.equal(report.opening.endings.length,1);
    const end=report.opening.endings[0];
    assert.ok(end.ended&&end.time===12.5&&end.duration===12.5&&end.audioBytes>0&&!end.muted);
    assert.ok(report.samples.some(s=>s.layer==='playing'&&!s.gesture));
    await openSettings();
    const slider='input[aria-label="角色大小"]';
    await wait(async()=>evaluate(`(() => {
      const el=document.querySelector(${JSON.stringify(slider)});if(!el||el.disabled)return false;
      el.scrollIntoView({block:'center'});el.focus();return document.activeElement===el;
    })()`),'SIZE_CONTROL_NOT_FOUND');
    assert.ok(await evaluate(`!!document.querySelector('[role=switch][aria-label="启动时自动播放"]')`));
    await evaluate(`(() => {
      window.__dev26QaUnexpectedBoot=false;
      new MutationObserver(()=>{if(document.querySelector('[data-dsh-boot],[data-dsh-companion-desktop-opening]'))window.__dev26QaUnexpectedBoot=true;}).observe(document.body,{subtree:true,childList:true});
    })()`);
    await delay(400);
    const start=await wait(async()=>{
      const s=await native();return s?.backend?.windows[0]?.visible&&summary(s).parked&&summary(s);
    },'PET_IDLE_DID_NOT_SETTLE_IN_SETTINGS');
    const out=[];
    for(const [keyName,code,value] of [['End',35,140],['Home',36,70]]){
      const focused=await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(slider)});el?.focus();return !!el&&el===document.activeElement&&!el.disabled;})()`);
      assert.equal(focused,true);
      const at=Date.now();await press(keyName,keyName,code);
      const next=await wait(async()=>{
        const s=await native();if(!s?.backend?.windows[0]?.visible)return false;
        const now=summary(s);
        return read(stateFile).overrides['commander-workspace-private']?.pet?.size===value&&now.size===pixels(value)&&now;
      },'SIZE_NOT_APPLIED');
      for(const field of ['pid','supervisorPid','windowId','generation'])assert.equal(next[field],start[field]);
      assert.deepEqual(next.center,start.center);
      assert.ok(next.parked&&next.hitRect&&Math.abs(next.hitRect.w/start.hitRect.w-next.size/start.size)<.001);
      const regions=read(path.join(stateDir,'whole-pet/snapshot.json')).bodyInputs[0]?.rects;
      assert.ok(regions>0);
      out.push({value,elapsedMs:Date.now()-at,regions,...next});
    }
    assert.equal(await evaluate('window.__dev26QaUnexpectedBoot'),false);
    report.resize={path:'official in-app role size slider',start,changes:out,unexpectedBoot:false};
    const second=spawn(binary,[args[0]],{cwd:home,env,stdio:'ignore'});
    await new Promise((resolve,reject)=>{second.once('exit',resolve);second.once('error',reject);});
    await delay(500);
    const warm=await sample();assert.equal(warm.layer,null);assert.equal(warm.inert,false);
    assert.equal((await targets()).find(x=>x.type==='page'&&x.url==='dsh-app://app/').id,page.id);
    report.warm={sameTarget:true,opening:false};
  }else if(mode==='escape'){
    assert.ok(sentEscape&&sawPlaying);assert.deepEqual(report.opening.endings,[]);
    assert.equal(summary(live).size,pixels(70));report.persistedSize=summary(live).size;
  }else if(mode==='silent'){
    assert.ok(sawPlaying&&!sawStill);
    assert.equal(report.opening.endings.length,1);
    const end=report.opening.endings[0];assert.ok(end.ended&&end.time===12.5&&end.muted);
  }else if(mode==='reduced'){
    assert.ok(sawStill&&!sawPlaying);assert.deepEqual(report.opening.endings,[]);
  }else{
    assert.equal(report.samples.some(s=>s.layer),false);
    assert.equal(live.settings.startupEnabled,false);
    await delay(1500);assert.equal((await sample()).layer,null);
    if(mode==='hot'){
      await openSettings();
      await wait(async()=>evaluate(`(() => {
        const control=document.querySelector('[role=switch][aria-label="启动时自动播放"]');
        if(!control||control.disabled||control.getAttribute('aria-checked')!=='false')return false;
        control.click();return true;
      })()`),'STARTUP_SWITCH_NOT_READY');
      await wait(async()=>(await native())?.settings?.startupEnabled,'PREFERENCE_NOT_SAVED');
      report.hot={preferenceUpdated:true};
      assert.equal((await sample()).layer,null);
      const disabled=await remote('pluginManager/setBundleEnabled',{name:'dsh-plugin-companion',enabled:false});
      report.hot.disabled=disabled;
      assert.equal(disabled.ok,true);
      assert.equal(disabled.application,'applied');
      await wait(async()=>!(await native()),'NATIVE_PET_NOT_STOPPED');
      assert.equal((await sample()).layer,null);
      const enabled=await remote('pluginManager/setBundleEnabled',{name:'dsh-plugin-companion',enabled:true});
      report.hot.enabled=enabled;
      assert.equal(enabled.ok,true);
      assert.equal(enabled.application,'applied');
      const restored=await wait(async()=>{
        const s=await native();return s?.ready&&s.backend?.windows[0]?.visible&&s;
      },'NATIVE_PET_NOT_RESTORED');
      assert.equal(restored.settings.startupEnabled,true);
      assert.equal(restored.startup.completions,0);
      const warm=await sample();assert.equal(warm.layer,null);assert.equal(warm.inert,false);
      assert.equal((await targets()).find(x=>x.type==='page'&&x.url==='dsh-app://app/').id,page.id);
      Object.assign(report.hot,{opening:false,sameTarget:true,petRestored:true});
    }
  }
  report.passed=true;
}catch(error){report.passed=false;report.error=error.message;process.exitCode=1;}
finally{
  ws?.close();app.kill('SIGTERM');await Promise.race([exited,delay(3500)]);
  if(app.exitCode===null&&app.signalCode===null)app.kill('SIGKILL');
  fs.closeSync(fd);
  if(!expectOpening)write(settingsFile,oldSettings);
  if(overriddenStartup){
    const state=read(stateFile),startup=state.overrides[state.selected.manifest.id].startup;
    if(oldStartupValue===undefined)delete startup[overriddenStartup];else startup[overriddenStartup]=oldStartupValue;
    write(stateFile,state);
  }
  write(output,report);
  console.log(JSON.stringify({mode,passed:report.passed,error:report.error,opening:report.opening,resize:report.resize,last:report.samples.at(-1)}));
}
