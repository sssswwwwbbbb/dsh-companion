// Hidden Electron test of the extracted renderer, exact media and native timer policy.
const {app,BrowserWindow,ipcMain,net,protocol}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {setTimeout:delay}=require('node:timers/promises');

const installed=JSON.parse(fs.readFileSync(process.argv[2]));
assert.equal(installed.passed,true);
const output=path.resolve(process.argv[3]);
const runtime=path.resolve(path.dirname(installed.executable),'../Resources/app');
const skin=path.join(installed.installed,'skins/archive-workspace-r2-private');
const manifest=JSON.parse(fs.readFileSync(path.join(skin,'skin.json')));
const config=manifest.modules.startup.config;
const assets={movie:manifest.assets[config.video],still:manifest.assets[config.poster]};
const result={artifactSha256:installed.sha256,voiceSha256:assets.movie.sha256,systemAudioMuted:true,checks:{}};
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'dsh-cinematic-player-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
protocol.registerSchemesAsPrivileged([{scheme:'dsh-companion',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.whenReady().then(async()=>{
 const {openingTimerTrigger}=await import(pathToFileURL(path.join(runtime,'compatibility.mjs')));
 app.dock?.hide();
 protocol.handle('dsh-companion',request=>{
  const url=new URL(request.url);
  if(url.hostname!=='app')return new Response(null,{status:404});
  if(url.pathname==='/movie')return net.fetch(pathToFileURL(path.join(skin,assets.movie.path)).href,{headers:request.headers});
  if(url.pathname==='/still')return net.fetch(pathToFileURL(path.join(skin,assets.still.path)).href);
  return net.fetch(pathToFileURL(path.join(runtime,url.pathname.slice(1))).href);
 });
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(runtime,'preload.cjs'),backgroundThrottling:false,sandbox:true,offscreen:true}});
 win.webContents.setAudioMuted(true);
 let active=null;
 const get=()=>win.webContents.executeJavaScript(`(()=>{const v=document.querySelector('video');return {time:v.currentTime,ended:v.ended,
  muted:v.muted,paused:v.paused,hidden:v.hidden,still:!document.querySelector('#poster').hidden,src:v.getAttribute('src')};})()`);
 const send=value=>win.webContents.send('companion:intro-state',value);
 ipcMain.on('companion:intro-ready',(event,value)=>{
  if(event.sender!==win.webContents||!active||value.token!==active.token)return;
  active.events.push({...value,at:Date.now()});
 });
 await win.loadURL('dsh-companion://app/startup.html');
 async function run(mode){
  const token='test-'+mode;
  const content={...config,token,name:manifest.name,video:'/movie',poster:'/still',soundEnabled:true,reducedMotion:mode==='reduced',custom:true};
  const start=Date.now(),events=[],samples=[];
  active={token,events};
  const rate=mode==='slow'?0.7:1;
  await win.webContents.executeJavaScript('document.querySelector("video").defaultPlaybackRate=document.querySelector("video").playbackRate='+rate);
  send({playing:true,content,hostReady:true,elapsed:0});
  let stalled=false,seenClockAdvance=false,cancelled=false;
  while(Date.now()-start<25000){
   const now=Date.now(),sample=await get();
   samples.push({at:now,...sample});
   const played=events.find(e=>e.playing),fallback=events.find(e=>e.fallback),ended=events.find(e=>e.ended);
   if(played&&!fallback&&!ended&&now-played.at>13500){
    assert.equal(openingTimerTrigger({cinematic:true,elapsed:now-played.at,duration:12500}),null);
    if(sample.time>samples.at(-2)?.time)seenClockAdvance=true;
   }
   if(mode==='stall'&&!stalled&&sample.time>1){
    stalled=true;await win.webContents.executeJavaScript('document.querySelector("video").pause()');
   }
   if(mode==='cancel'&&!cancelled&&sample.time>1){
    cancelled=true;
    send({playing:false});
    await delay(5250);
    const cleared=await get();
    assert.ok(cleared.hidden&&cleared.paused&&cleared.src===null&&cleared.muted);
    assert.ok(!events.some(e=>e.ended||e.fallback));
    result.checks.cancel={cleared,events};return;
   }
   if(mode==='slow'&&ended){
    assert.ok(played&&played.muted===false&&seenClockAdvance&&ended.at-played.at>13500);
    assert.ok(Math.abs(ended.mediaTime-12.5)<0.001&&!fallback);
    const handoff=events.find(e=>e.handoff);
    assert.ok(handoff?.mediaTime>=12.15&&handoff.mediaTime<12.23);
    result.checks.slow={durationMs:ended.at-played.at,handoff:handoff.mediaTime,ended:ended.mediaTime,events,
     crossing:samples.filter(s=>s.at-played.at>=13400&&s.at-played.at<=14050)};
    break;
   }
   if((mode==='stall'||mode==='reduced')&&fallback){
    assert.equal(fallback.fallback,mode==='stall'?'video-stalled':'reduced-motion');
    const held=await get();
    assert.ok(held.still&&held.hidden&&held.paused&&fallback.muted&&!ended);
    const trigger=openingTimerTrigger({cinematic:true,elapsed:1200,duration:1200,fallback:fallback.fallback});
    assert.equal(trigger,mode==='stall'?'static-fallback':'automatic');
    result.checks[mode]={fallback,trigger,events};break;
   }
   await delay(75);
  }
  assert.ok(result.checks[mode],mode+' did not finish');
  send({playing:false});
  await delay(100);
 }
 await run('slow');
 await run('stall');
 await run('cancel');
 await run('reduced');
 result.passed=true;
}).catch(error=>{result.passed=false;result.error=error.message;}).finally(()=>{
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 app.exit(result.passed?0:1);
});
