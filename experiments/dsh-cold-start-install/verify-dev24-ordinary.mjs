// Seed and restart the same real official Host profile in two separate processes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=fileURLToPath(new URL('../../',import.meta.url));
const [mode,installFile,output]=process.argv.slice(2);
assert.ok(['seed','restart'].includes(mode));
const read=file=>JSON.parse(fs.readFileSync(file));
const write=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600});
const {home,profileDir,sha256,passed,installed,status:{version}}=read(installFile);
const build=version.match(/^0\.1\.0-dev\.(24|25)$/)?.[1];
assert.ok(passed&&build&&home.startsWith(path.join(root,'.local/dev'+build+'-official-host-')));
const parkExpected=build==='25';
const stateDir=path.join(home,'companion',createHash('sha256').update(profileDir).digest('hex').slice(0,16));
const clientFile=path.join(home,'client-state.json');
fs.rmSync(clientFile,{force:true});
const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const anchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json';
const key='3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16';
process.env.DSH_HOME=home;
process.env.DSH_TELEMETRY_DISABLED='1';
const {stateDir:previous}=read(path.join(root,'.local/dsh-cold-start-install-qa-20261105/host-runtime.json'));
assert.ok(previous.startsWith(path.join(root,'.local/dsh-cold-start-install-qa-20261105/host-home/companion')+path.sep));
const license=read(path.join(previous,'license.json'));
assert.ok(!license.blocked&&license.receipt);
// Copy only the already approved, signed same-device test grant. The temporary
// check stamp keeps this short run offline; signed claims are copied verbatim.
write(path.join(stateDir,'license.json'),{...license,checkedAt:Date.now()});
if(mode==='seed')write(path.join(stateDir,'settings.json'),{schemaVersion:1,settings:{autoStart:false,startupEnabled:false,
 launcherEnabled:false,visible:true,autonomous:false,followMouse:false,size:100}});

let url,application,client,heldLock;
const stdout=process.stdout.write.bind(process.stdout);
process.stdout.write=(chunk,...args)=>{
 const s=String(chunk),found=s.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/);
 if(found)url=found[1];
 return stdout(s.replace(/([?&#]token=)[^\s&"']+/g,'$1[redacted]'),...args);
};
const began=Date.now(),result={mode,version,artifactSha256:sha256,officialHost:true,hostPid:process.pid,sourceAuthorization:'approved isolated copy, no remote renewal'};
const wait=async (predicate,message,ms=18000)=>{
 const until=Date.now()+ms;
 while(Date.now()<until){const value=await predicate();if(value)return value;await delay(95);}
 throw new Error(message);
};
const petDir=path.join(stateDir,'whole-pet');
async function petRoute(route,body){
 const {origin,token}=read(path.join(petDir,'connection.json'));
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 const response=await fetch(origin+'/dsh-pet-7340/'+route+'&surface=desktop',{method:'POST',
  headers:{'x-dsh-pet-token':token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(3000)});
 const data=await response.json();
 assert.ok(response.ok&&data.ok!==false);
 return data;
}
function cpu(pid){
 const rows=execFileSync('/bin/ps',['-axo','pid=,ppid=,time=,rss=,comm='],{encoding:'utf8'}).trim().split('\n').map(line=>{
  const m=line.trim().match(/^(\d+)\s+(\d+)\s+([\d:.]+)\s+(\d+)\s+(.+)$/);
  if(!m)return null;
  return {pid:Number(m[1]),parent:Number(m[2]),seconds:m[3].split(':').reduce((n,x)=>n*60+Number(x),0),
   rssKiB:Number(m[4]),role:path.basename(m[5])};
 }).filter(Boolean);
 const tree=new Set([pid]);
 for(let pass=0;pass<4;pass++)for(const row of rows)if(tree.has(row.parent))tree.add(row.pid);
 return rows.filter(row=>tree.has(row.pid));
}
async function measure(pid){
 const before=cpu(pid),at=Date.now();
 await delay(5500);
 const after=cpu(pid),elapsed=(Date.now()-at)/1000;
 const rows=after.map(row=>({...row,averageCpuPct:100*(row.seconds-(before.find(r=>r.pid===row.pid)?.seconds||0))/elapsed}));
 return {elapsed,rows,totalCpuPct:rows.reduce((n,r)=>n+r.averageCpuPct,0),rssMiB:rows.reduce((n,r)=>n+r.rssKiB,0)/1024};
}
async function observeAction(service,action,identity){
 const started=await service.action(action),receipt=started.backend.lastAction;
 assert.equal(receipt.action,action);assert.equal(receipt.status,'playing');
 const samples=[];
 const final=await wait(async()=>{
  const s=await service.status(),w=s.backend?.windows[0];
  assert.equal(s.backend.pid,identity.pid);
  assert.equal(w.id,identity.windowId);
  const frame=w.renderer?.videos[0],sprite=w.renderer?.sprites[0];
  if(frame&&sprite)samples.push({source:frame.source,paused:frame.paused,time:frame.time,
   parkedIdle:frame.parkedIdle,playback:sprite.playback,moving:sprite.moving,center:sprite.center});
  return s.backend.lastAction?.playbackId===receipt.playbackId&&s.backend.lastAction.status==='ended'&&
   frame?.parkedIdle===true&&frame.paused&&sprite.playback===null&&sprite;
 },'ACTION_DID_NOT_RETURN_TO_PARKED_IDLE: '+action,16000);
 const source=action==='walk'?'master-walk-left.webm':'master-'+action+'.webm';
 assert.ok(samples.some(x=>x.source===source&&!x.paused&&x.playback===receipt.playbackId&&x.time>0.1));
 if(action==='walk'){
  const turn=samples.filter(x=>x.source==='master-turn-front.webm');
  assert.ok(turn.length>=3&&turn.every(x=>!x.moving&&x.center.x===final.center.x&&x.center.y===final.center.y));
 }
 return {action,receipt,samples,final};
}
try{
 const {loadProfileDirectory,loadLayeredEnv}=await import(official('dsh-app-boot/lib/index.js'));
 const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
 application=await runProfile({environment:loadLayeredEnv('dsh'),profile:'package-check',
  resolvedProfile:{profile:loadProfileDirectory('dsh',profileDir,anchor),installAnchor:anchor},patchFiles:[],
  args:['--no-open','--host','127.0.0.1','--port','0'],
  packageManager:{command:process.execPath,
   args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],
   env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath,npm_config_offline:'true'}},
 });
 const service=application.ctx.get('dshCompanion');
 assert.ok(service&&(await service.status()).license.active);
 assert.equal(read(path.join(installed,'package.json')).version,version);
 assert.ok(url&&new URL(url).hostname==='127.0.0.1');
 write(path.join(home,'client-connection.json'),{url,owner:process.pid});
 const electron=path.join(root,'.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 client=spawn(electron,[fileURLToPath(new URL('verify-dev24-client.cjs',import.meta.url)),home],{env,stdio:'ignore'});
 await wait(()=>service.controller.skins.page.available(),'OFFICIAL_CLIENT_NOT_ATTACHED');
 if(mode==='seed'){
  await service.skinSelect({contentKey:key});
  await service.skinConfigure({module:'startup',field:'soundEnabled',value:true,contentKey:key});
  await service.configure({autoStart:true,startupEnabled:true});
 }
 const live=await wait(async()=>{
  const s=await service.status();
  return s.ready&&s.skin.phase==='ready'&&s.skin.selected?.contentKey===key&&s.skin.results?.theme?.status==='ready'&&s.backend?.windows?.[0]?.visible&&s;
 },'COLD_START_SKIN_NOT_RESTORED');
 const view=await wait(()=>fs.existsSync(clientFile)&&read(clientFile).theme&&read(clientFile),'WORKSPACE_NOT_PRESENTED');
 assert.ok(view.cardHeight>=40&&view.cardHeight<=50&&view.name==='单元-07 · CS-07'&&!view.windowVisible);
 assert.ok(live.settings.autoStart&&live.settings.startupEnabled&&live.skin.settings.startup.values.soundEnabled);
 result.workspace=view;
 result.ready={supervisorPid:live.pid,petPid:live.backend.pid,generation:live.skin.generation,prefs:{
  autoStart:live.settings.autoStart,startupEnabled:live.settings.startupEnabled,soundEnabled:live.skin.settings.startup.values.soundEnabled,
 },contentKey:key,startup:live.startup};
 if(mode==='restart'){
  const supervisorEnv=execFileSync('/bin/ps',['eww','-p',String(live.pid),'-o','command='],{encoding:'utf8'});
  assert.match(supervisorEnv,/(?:^|\s)DSH_COMPANION_PLAY_INTRO=1(?:\s|$)/);
  result.hostSentOrdinaryPlayRequest=true;
  const idle=await wait(async()=>{
   const w=(await service.status()).backend?.windows[0],v=w?.renderer?.videos[0];
   return v?.source==='master-idle.webm'&&v.paused===parkExpected&&(!parkExpected||v.parkedIdle===true)&&w;
  },'EXPECTED_IDLE_UNAVAILABLE');
  const idleSample=await measure(live.backend.pid);
  const sameWindow={workerPid:live.backend.pid,windowId:idle.id,bounds:idle.bounds,source:'master-idle.webm'};
  if(parkExpected){
   const {width,height}=idle.renderer.videos[0];
   assert.deepEqual([width,height],[1920,1080]);
   result.performance={...sameWindow,idleSample,parkedIdle:true,frame:{width,height}};
   result.actions=[];
   for(const action of ['idle','react','walk'])result.actions.push(await observeAction(service,action,{pid:live.backend.pid,windowId:idle.id}));
  }else{
   heldLock=await petRoute('lock?pet=main',{ttl:15000});
   const frozen=await wait(async()=>{const b=(await service.status()).backend?.windows[0];return b?.id===idle.id&&b.renderer?.videos[0]?.source==='master-idle.webm'&&b.renderer.videos[0].paused&&b;},'PAUSED_IDLE_UNAVAILABLE');
   const frozenSample=await measure(live.backend.pid);
   await petRoute('lock/release?pet=main',{lockId:heldLock.lockId});heldLock=null;
   const resumed=await wait(async()=>{const b=(await service.status()).backend?.windows[0];return b?.id===idle.id&&!b.renderer?.videos[0]?.paused&&b;},'IDLE_DID_NOT_RESUME');
   assert.ok(resumed.visible&&frozen.visible);
   result.performance={...sameWindow,idleSample,frozenSample,resumed:true};
  }
  const ended=await service.status();
  const events=read(path.join(stateDir,'runtime-events.json')).transitions.filter(e=>e.at>=began);
  assert.ok(ended.ready&&ended.backend.pid===live.backend.pid);
  assert.equal(ended.startup.completions,0);
  assert.ok(!ended.startup.visible&&!ended.startup.playing&&!ended.startup.coldPending&&!ended.startup.coldRequested);
  assert.ok(!events.some(e=>e.type==='cold-intro-request'||e.type==='intro-start'||e.type==='intro-presented'));
  result.observeMs=Date.now()-began;result.events=events;result.finalStartup=ended.startup;
 }
 result.passed=true;
}catch(error){
 result.passed=false;result.error=error.message;process.exitCode=1;
}finally{
 if(heldLock)await petRoute('lock/release?pet=main',{lockId:heldLock.lockId}).catch(()=>{});
 client?.kill('SIGTERM');
 await application?.ctx.fiber.dispose();
 fs.rmSync(path.join(home,'client-connection.json'),{force:true});
 write(output,result);
 stdout(JSON.stringify({mode,passed:result.passed,error:result.error,output})+'\n');
}
