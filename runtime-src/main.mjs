import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, protocol, net, shell } from 'electron';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PetBehavior, clamp } from './behavior.mjs';
import { validatedSettings, defaults, actions } from './settings.mjs';
import { createBridge } from './bridge.mjs';
import { nativePosition } from './geometry.mjs';
import { verifyLicense, deviceIdentity } from './license-core.mjs';
import { PackStore } from './packs.mjs';
import { readJson, writeJson } from './storage.mjs';
import { profileGate } from './integration.mjs';
import { hostWindowBounds, introBounds } from './host-window.mjs';

const version='0.1.0-dev.11',root=dirname(fileURLToPath(import.meta.url));
app.setName('DSH Companion');
const stateDir=process.env.DSH_COMPANION_STATE_DIR||join(app.getPath('appData'),'dsh-companion','standalone');
mkdirSync(stateDir,{recursive:true,mode:0o700});app.setPath('userData',join(stateDir,'chromium'));
const statePath=join(stateDir,'settings.json'),bridgePath=join(stateDir,'bridge.json');
const service=readJson(join(root,'config/service.json'));
const integration=readJson(join(stateDir,'integration.json'),{});
let saved=readJson(statePath,{}),settings=validatedSettings(saved.settings||{}),launchMode=process.env.DSH_COMPANION_MODE||'managed';
const wantsPet=launchMode==='managed'||settings.autoStart;
const packs=new PackStore(join(root,'packs'),stateDir);
let pack=packs.get(settings.packId),packToken=tokenFor(pack);
let window,introWindow,tray,bridge,model,workArea,timer,monitor,ready=false,quitting=false,dragOffset,lastCursor,lastPosition,previousAction,lastEvent,speech='',speechSequence=0;
let ownerPid=Number(process.env.DSH_COMPANION_OWNER_PID||0),phase='starting',errorCode=null;
let introPlaying=false,introReady=false,introStartedAt=0,introError=null,introCompletions=0,openingDsh=false;
const started=new Date().toISOString(),geometry={positionUpdates:0,negativeZeroNormalizations:0,rejectedPositions:0};
const transitions=[];
function tokenFor(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,12);}
function event(type,extra={}){transitions.push({at:Date.now(),type,packId:settings.packId,...extra});if(transitions.length>80)transitions.shift();writeJson(join(stateDir,'runtime-events.json'),{version,started,transitions});}
function authorization(){const record=readJson(join(stateDir,'license.json'),null);if(!record||record.blocked)throw new Error(record?.blocked||'LICENSE_REQUIRED');return verifyLicense(record.receipt,{publicKey:service.publicKey,deviceId:deviceIdentity()});}
protocol.registerSchemesAsPrivileged([{scheme:'dsh-companion',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock({mode:launchMode}))app.quit();
else{
  app.on('second-instance',(_event,_args,_directory,data)=>{
    if(data?.mode==='launcher'){
      if(!settings.launcherEnabled||!profileGate(integration.profileDir||'').enabled){openDsh(false);return;}
      if(ready&&settings.startupEnabled)void showIntro().catch(()=>{});else openDsh(false);
    }else if(ready&&window&&settings.visible&&!introPlaying)window.showInactive();
  });
  app.whenReady().then(start).catch(error=>{errorCode=/^[A-Z_]+$/.test(error.message||'')?error.message:'DESKTOP_START_FAILED';phase='error';event('start-failed',{errorCode});app.quit();});
}
function persist(){if(model)writeJson(statePath,{schemaVersion:1,settings,position:{displayId:workArea.displayId,x:model.x,y:model.y},savedAt:new Date().toISOString()});}
function status(){return {running:!quitting,ready,phase,version,platform:process.platform,arch:process.arch,pid:process.pid,started,errorCode,settings,action:model?.action||'idle',needsHost:ownerPid<1,pack:{id:pack.id,name:pack.name,token:packToken},position:model?{x:Math.round(model.x),y:Math.round(model.y)}:null,window:window&&!window.isDestroyed()?{visible:window.isVisible(),bounds:window.getBounds(),alwaysOnTop:window.isAlwaysOnTop()}:null,startup:{playing:introPlaying,hostReady:ownerPid>0,elapsedSeconds:introStartedAt?(Date.now()-introStartedAt)/1000:0,durationSeconds:pack.startup.seconds,completions:introCompletions,errorCode:introError,bounds:introWindow&&!introWindow.isDestroyed()?introWindow.getBounds():null},availableActions:[...actions]};}
function say(text){speech=text;speechSequence++;}
function applySettings(input){
  const next=validatedSettings(input,settings),nextPack=packs.get(next.packId),nextToken=tokenFor(nextPack);if(nextToken!==packToken)ready=false;settings=next;pack=nextPack;packToken=nextToken;
  model.setProfile(pack.profiles[settings.profile]);model.autonomous=settings.autonomous;model.follow=settings.followMouse;sizeWindow();
  if(!settings.startupEnabled&&introPlaying){introPlaying=false;phase=ready?(ownerPid>0?'ready':'waiting-host'):'starting';introWindow?.hide();event('intro-cancelled',{reason:'startup-disabled'});if(launchMode==='launcher'&&ownerPid<1)openDsh();}
  if(settings.visible&&ready&&!introPlaying)window.showInactive();else window.hide();persist();updateMenu();sendState();return status();
}
function perform(action){
  authorization();if(!actions.has(action))throw new Error('UNKNOWN_ACTION');
  const messages={react:'欸，头发要被摸乱啦。',eat:'白饭！我才不是一直在等这个。',play:'和小猫玩一会儿。',stretch:'你也记得活动一下呀。','sleep-in':'先眯一会儿，醒来再陪你。',wake:'我醒啦，今天做点什么？',greet:'欢迎回来，今天也一起加油。'};
  model.perform(action,action==='sleep'?Infinity:pack.animations[action].seconds,messages[action]);if(messages[action])say(messages[action]);sendState();return status();
}
function resolveDisplay(){const displays=screen.getAllDisplays();const display=displays.find(item=>item.id===saved.position?.displayId)||screen.getDisplayNearestPoint(screen.getCursorScreenPoint());workArea={...display.workArea,displayId:display.id};}
function sizeWindow(){const scale=settings.size/100,height=Math.round(300*scale),width=Math.round(height*640/360);model.setBounds(workArea.width,workArea.height,92*scale,235*scale);window.setSize(width,height+50);positionWindow();}
function positionWindow(){
  if(!window||window.isDestroyed())return;const [width,height]=window.getSize();
  const rawX=workArea.x+model.x-width/2,rawY=workArea.y+model.y-height+8*settings.size/100,position=nativePosition(rawX,rawY);
  if(!position){geometry.rejectedPositions++;errorCode='DESKTOP_POSITION_INVALID';return;}
  if(Object.is(Math.round(rawX),-0)||Object.is(Math.round(rawY),-0))geometry.negativeZeroNormalizations++;
  if(errorCode==='DESKTOP_POSITION_INVALID')errorCode=null;const key=position.x+','+position.y;
  if(key!==lastPosition){window.setPosition(position.x,position.y,false);lastPosition=key;geometry.positionUpdates++;}
}
function sendState(){
  if(window&&!window.isDestroyed())window.webContents.send('companion:state',{action:model.action,facing:model.facing,dragging:model.dragging,falling:model.falling,speech,speechSequence,settings,packId:pack.id,packToken,appearance:pack.appearance});
  if(introWindow&&!introWindow.isDestroyed())introWindow.webContents.send('companion:intro-state',{pack:pack.startup,packId:pack.id,playing:introPlaying,hostReady:ownerPid>0,elapsed:(Date.now()-introStartedAt)/1000,errorCode:introError});
}
function openDsh(background=true){
  if(openingDsh)return;if(!existsSync(integration.dshApp||'')){introError='DSH_APP_NOT_FOUND';sendState();return;}
  openingDsh=true;const args=[...(background?['-g','-j']:[]),'-a',integration.dshApp];
  const child=spawn('/usr/bin/open',args,{stdio:'ignore',env:{HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG}});child.once('exit',()=>{openingDsh=false;});child.once('error',()=>{openingDsh=false;introError='DSH_START_FAILED';});event('dsh-open-requested');
}
async function showIntro(){
  authorization();introPlaying=true;introStartedAt=Date.now();introError=null;phase='intro';window?.hide();event('intro-start',{hostReady:ownerPid>0});
  if(!introWindow||introWindow.isDestroyed()){
    introReady=false;introWindow=new BrowserWindow({...currentIntroBounds(),show:false,frame:false,backgroundColor:'#111827',hasShadow:true,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,webPreferences:{preload:join(root,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
    introWindow.setAlwaysOnTop(true,'screen-saver');if(process.platform==='darwin')introWindow.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true,skipTransformProcessType:true});
    introWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));introWindow.webContents.on('will-navigate',event=>event.preventDefault());
    introWindow.on('closed',()=>{introWindow=undefined;introReady=false;});
    await introWindow.loadURL('dsh-companion://app/startup.html');
  }else{introWindow.setBounds(currentIntroBounds());introWindow.showInactive();sendState();}
  if(launchMode==='launcher'&&ownerPid<1&&introReady)openDsh();sendState();
}
function currentIntroBounds(){
  const bounds=hostWindowBounds(readJson(join(stateDir,'host-window.json'),null)?.bounds);
  const display=bounds?screen.getDisplayMatching(bounds):screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return introBounds(bounds,display.workArea,display.bounds);
}
function finishIntro(){
  if(!introPlaying||!ready||ownerPid<1)return;introPlaying=false;phase='ready';introCompletions++;introWindow?.hide();
  if(settings.visible&&wantsPet)window.showInactive();event('intro-complete',{hostReady:true});
  void shell.openExternal('dsh://open').catch(()=>{});
  if(!wantsPet&&launchMode==='launcher'){setTimeout(()=>app.quit(),250);}launchMode='managed';
}
function attach(value){
  if(!Number.isSafeInteger(value.ownerPid)||value.ownerPid<1)throw new Error('INVALID_OWNER');
  try{process.kill(value.ownerPid,0);}catch{throw new Error('INVALID_OWNER');}
  if(!service.supportedDsh.includes(value.dshVersion))throw new Error('DSH_UNSUPPORTED_VERSION');
  ownerPid=value.ownerPid;event('host-attached',{dshVersion:value.dshVersion});
  if(ready&&!introPlaying){phase='ready';if(settings.visible&&wantsPet)window.showInactive();if(launchMode==='launcher'&&!wantsPet)setTimeout(()=>app.quit(),250);launchMode='managed';}
  sendState();return status();
}
function updateMenu(){
  if(!tray)return;
  const built=Menu.buildFromTemplate([{label:'DSH 陪伴 · '+pack.name,enabled:false},{label:settings.visible?'隐藏大肥鱼':'显示大肥鱼',click:()=>applySettings({visible:!settings.visible})},{label:'重播启动动画',click:()=>void showIntro()},{label:'相处模式',submenu:Object.entries(pack.profiles).map(([id,profile])=>({label:profile.label,type:'radio',checked:settings.profile===id,click:()=>applySettings({profile:id})}))},{label:'自主活动',type:'checkbox',checked:settings.autonomous,click:item=>applySettings({autonomous:item.checked})},{type:'separator'},...[[ 'react','摸摸头'],['eat','喂白饭'],['play','撸猫时间'],['stretch','伸懒腰'],['sleep-in','睡一会儿'],['wake','叫她起床']].map(([action,label])=>({label,click:()=>perform(action)})),{type:'separator'},{label:'回到屏幕中间',click:()=>{model.dragging=false;model.falling=false;model.x=workArea.width*.6;model.y=workArea.height;model.perform('idle',5);positionWindow();persist();}},{label:'回到 DSH',click:()=>void shell.openExternal('dsh://open').catch(()=>{})},{label:'退出桌宠',click:()=>app.quit()}]);tray.setContextMenu(built);return built;
}
async function start(){
  if(process.platform==='darwin')app.dock.hide();
  if(launchMode==='launcher'&&(!profileGate(integration.profileDir||'').enabled||!settings.launcherEnabled)){openDsh(false);app.quit();return;}
  try{authorization();}catch(error){event('license-blocked',{errorCode:error.message});if(launchMode==='launcher')openDsh(false);app.quit();return;}
  protocol.handle('dsh-companion',request=>{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response(null,{status:403});
    if(url.pathname==='/selected-pack.json')return new Response(JSON.stringify({...pack,runtimeToken:packToken}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
    let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response(null,{status:400});}
    const target=resolve(root,'.'+pathname);if(!target.startsWith(root+sep))return new Response(null,{status:403});return net.fetch(pathToFileURL(target).href,{headers:request.headers});
  });
  resolveDisplay();model=new PetBehavior({width:workArea.width,height:workArea.height,halfWidth:92,petHeight:235});model.profile={...pack.profiles[settings.profile]};model.autonomous=settings.autonomous;model.follow=settings.followMouse;
  if(Number.isFinite(saved.position?.x))model.x=clamp(saved.position.x,model.halfWidth,workArea.width-model.halfWidth);
  window=new BrowserWindow({width:534,height:350,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,maximizable:false,minimizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,acceptFirstMouse:true,webPreferences:{preload:join(root,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false}});
  window.setAlwaysOnTop(true,'floating');window.setIgnoreMouseEvents(true,{forward:true});
  if(process.platform==='darwin')window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:false,skipTransformProcessType:true});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.on('render-process-gone',()=>{errorCode='RENDERER_EXITED';phase='error';app.quit();});window.on('closed',()=>{window=undefined;if(!quitting)app.quit();});
  const from=(event,target)=>target&&!target.isDestroyed()&&event.sender===target.webContents&&event.senderFrame===target.webContents.mainFrame;
  ipcMain.on('companion:ready',(event,value)=>{if(!from(event,window)||value?.packId!==pack.id||value?.packToken!==packToken)return;ready=true;if(!introPlaying){phase=ownerPid>0?'ready':'waiting-host';if(settings.visible&&ownerPid>0)window.showInactive();}sendState();});
  ipcMain.on('companion:intro-ready',event=>{if(!from(event,introWindow))return;introReady=true;introWindow.showInactive();sendState();if(launchMode==='launcher'&&ownerPid<1)openDsh();});
  ipcMain.on('companion:intro-control',(event,action)=>{if(!from(event,introWindow))return;if(action==='skip')finishIntro();if(action==='open-dsh')openDsh(false);});
  ipcMain.on('companion:hit',(event,hit)=>{if(from(event,window)&&!model.dragging)window.setIgnoreMouseEvents(hit!==true,{forward:true});});
  ipcMain.on('companion:action',(event,action)=>{if(from(event,window)&&actions.has(action))perform(action);});
  ipcMain.on('companion:menu',event=>{if(from(event,window))updateMenu().popup({window});});
  ipcMain.on('companion:drag',(event,mode)=>{if(!from(event,window))return;const cursor=screen.getCursorScreenPoint();if(mode==='begin'){model.startDrag();dragOffset={x:cursor.x-workArea.x-model.x,y:cursor.y-workArea.y-model.y};lastCursor={...cursor,at:Date.now()};window.setIgnoreMouseEvents(false);}else if(mode==='end'&&model.dragging){model.release(lastCursor?.vx||0,lastCursor?.vy||0);dragOffset=undefined;}});
  tray=new Tray(nativeImage.createEmpty());if(process.platform==='darwin')tray.setTitle('鲸');tray.setToolTip('DSH 陪伴 · '+pack.name);updateMenu();
  bridge=await createBridge({dispatch:async(route,input)=>{
    if(route==='/status')return status();
    if(route==='/shutdown'){event('shutdown-requested');setTimeout(()=>app.quit(),100);return {stopping:true};}
    authorization();
    if(route==='/settings')return applySettings(input);
    if(route==='/host-window'){
      if(!hostWindowBounds(input.bounds))throw new Error('HOST_WINDOW_INVALID');
      if(introWindow&&!introWindow.isDestroyed())introWindow.setBounds(currentIntroBounds());return {saved:true};
    }
    if(route==='/action')return perform(input.action);
    if(route==='/attach')return attach(input);
    if(route==='/intro/replay'){await showIntro();return status();}
    if(route==='/diagnostics'){
      if(!ready)throw new Error('DESKTOP_NOT_READY');const image=await window.webContents.capturePage(),bitmap=image.toBitmap();let transparent=0,opaque=0;
      for(let i=3;i<bitmap.length;i+=4){if(bitmap[i]<10)transparent++;else if(bitmap[i]>245)opaque++;}
      return {ownWindowOnly:true,width:image.getSize().width,height:image.getSize().height,transparentPixels:transparent,opaquePixels:opaque,totalPixels:bitmap.length/4,allMacSpaces:process.platform==='darwin'&&window.isVisibleOnAllWorkspaces(),singleInstance:app.hasSingleInstanceLock(),geometry,startup:status().startup,packId:pack.id,transitions};
    }
    throw new Error('UNKNOWN_ROUTE');
  }});
  writeJson(bridgePath,{schemaVersion:1,pid:process.pid,port:bridge.port,token:bridge.token,version});sizeWindow();event('runtime-started',{launchMode});
  if(settings.startupEnabled&&(launchMode==='launcher'||process.env.DSH_COMPANION_PLAY_INTRO==='1'))await showIntro();else if(launchMode==='launcher')openDsh();
  await window.loadURL('dsh-companion://app/pet.html');
  let last=performance.now(),lastFollow=0;
  timer=setInterval(()=>{
    if(!window||window.isDestroyed())return;const now=performance.now(),dt=(now-last)/1000;last=now;
    if(introPlaying){if(ownerPid>0&&introReady&&Date.now()-introStartedAt>=pack.startup.seconds*1000)finishIntro();else if(ownerPid<1&&Date.now()-introStartedAt>45000)introError='DSH_STARTUP_TIMEOUT';sendState();return;}
    const cursor=screen.getCursorScreenPoint();
    if(model.dragging&&dragOffset){model.dragTo(cursor.x-workArea.x-dragOffset.x,cursor.y-workArea.y-dragOffset.y);if(lastCursor){const interval=Math.max(.025,(Date.now()-lastCursor.at)/1000);lastCursor.vx=clamp((cursor.x-lastCursor.x)/interval,-700,700);lastCursor.vy=clamp((cursor.y-lastCursor.y)/interval,-650,800);}lastCursor={...cursor,vx:lastCursor?.vx||0,vy:lastCursor?.vy||0,at:Date.now()};}
    else{if(model.follow&&now-lastFollow>700&&!model.falling&&Math.abs(cursor.x-workArea.x-model.x)>75){model.walkTo(cursor.x-workArea.x,'跟着你，慢慢走。');lastFollow=now;}model.step(dt);}
    if(model.action!==previousAction){previousAction=model.action;if(!['walk','idle','sleep'].includes(model.action))model.remaining=pack.animations[model.action].seconds;}
    if(model.events[0]!==lastEvent){lastEvent=model.events[0];if(lastEvent)say(lastEvent.text);}positionWindow();sendState();
    const bounds=window.getBounds();if(!model.dragging&&(cursor.x<bounds.x||cursor.y<bounds.y||cursor.x>=bounds.x+bounds.width||cursor.y>=bounds.y+bounds.height))window.setIgnoreMouseEvents(true,{forward:true});
  },33);
  monitor=setInterval(()=>{
    persist();try{authorization();}catch(error){event('license-blocked',{errorCode:error.message});app.quit();return;}
    if(integration.profileDir&&!profileGate(integration.profileDir).enabled){event('integration-disabled');app.quit();return;}
    if(ownerPid){try{process.kill(ownerPid,0);}catch{event('owner-gone');app.quit();}}
  },2000);
  const displayChanged=()=>{resolveDisplay();model.setBounds(workArea.width,workArea.height);sizeWindow();if(introWindow&&!introWindow.isDestroyed())introWindow.setBounds(currentIntroBounds());};screen.on('display-removed',displayChanged);screen.on('display-metrics-changed',displayChanged);
}
app.on('before-quit',()=>{quitting=true;clearInterval(timer);clearInterval(monitor);try{persist();}catch{}try{if(JSON.parse(readFileSync(bridgePath,'utf8')).pid===process.pid)unlinkSync(bridgePath);}catch{}bridge?.server.close();tray?.destroy();});
app.on('window-all-closed',()=>app.quit());
