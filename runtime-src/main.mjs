import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, protocol, net, shell, dialog } from 'electron';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PetBehavior, clamp } from './behavior.mjs';
import { validatedSettings, defaults, actions } from './settings.mjs';
import { createBridge } from './bridge.mjs';
import { NativeSkinRuntime } from './skin.mjs';
import { NativeStartupRuntime } from './startup-skin.mjs';
import { nativePosition } from './geometry.mjs';
import { verifyLicense, deviceIdentity } from './license-core.mjs';
import { PackStore } from './packs.mjs';
import { readJson, writeJson } from './storage.mjs';
import { profileGate } from './integration.mjs';
import { hostWindowBounds, introBounds } from './host-window.mjs';
import { focusMenuItems } from './focus-menu.mjs';
import { WholePetBackend } from './backend.mjs';
import { openingTimerTrigger } from './compatibility.mjs';
import { stopRequests } from './skin-core/src/state.mjs';

const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version,root=dirname(fileURLToPath(import.meta.url));
app.setName('DSH Companion');
const stateDir=process.env.DSH_COMPANION_STATE_DIR||join(app.getPath('appData'),'dsh-companion','standalone');
mkdirSync(stateDir,{recursive:true,mode:0o700});app.setPath('userData',join(stateDir,'chromium'));
const statePath=join(stateDir,'settings.json'),bridgePath=join(stateDir,'bridge.json');
const service=readJson(join(root,'config/service.json'));
const integration=readJson(join(stateDir,'integration.json'),{});
let saved=readJson(statePath,{}),settings=validatedSettings(saved.settings||{});
const launchMode=process.env.DSH_COMPANION_MODE||'managed',wantsPet=launchMode==='managed'||settings.autoStart;
const packs=new PackStore(join(root,'packs'),stateDir);
let pack=packs.get(settings.packId),packToken=tokenFor(pack);
let window,introWindow,tray,bridge,backend,model,workArea,timer,monitor,ready=false,quitting=false,exitAllowed=false,dragOffset,lastCursor,lastPosition,previousAction,lastEvent,speech='',speechSequence=0;
let ownerPid=Number(process.env.DSH_COMPANION_OWNER_PID||0),phase='starting',errorCode=null;
let introPlaying=false,introReady=false,introStartedAt=0,introError=null,introCompletions=0,openingDsh=false,activeIntro=null,introMedia=null,introVideoStarted=false,introVideoEnded=false;
let introDuration=0,introHandoff=false,introReturning=false,introAudioMuted=null,introFallback=null;
const started=new Date().toISOString(),geometry={positionUpdates:0,negativeZeroNormalizations:0,rejectedPositions:0};
const transitions=[];
let legacySettings={...settings},readyActions=[],pendingInteraction=null,lastInteraction=null;
let focusMenuState=null;const focusMenuActions=[];
const coldState=readJson(join(stateDir,'skin-state.json'),{});
const cinematicCold=!!coldState.selected?.manifest.modules.startup?.config?.handoffSeconds;
const coldRequested=!cinematicCold&&process.env.DSH_COMPANION_PLAY_INTRO==='1';
function desktopOpeningHeld(){
  try{
    const hold=readJson(join(stateDir,'desktop-opening-hold.json'),null);
    return hold?.hostPid===ownerPid&&hold.expiresAt>Date.now()&&settings.startupEnabled;
  }catch{return false;}
}
const startup=new NativeStartupRuntime({stateDir,dshVersion:integration.dshVersion,onCancel:reason=>{if(activeIntro?.custom)cancelIntro(reason);}});
const usesWorker=()=>backend?.supports(skin.contentKey)===true;
const desktopReady=()=>usesWorker()?backend.status().ready:ready;
const legacyActionReady=()=>ready&&model?.action==='idle'&&!model.dragging&&!model.falling;
const skin=new NativeSkinRuntime({stateDir,loadPack:id=>packs.get(id),workReaction:(current,action='react')=>{
  if(pendingInteraction)return null;
  if(usesWorker())return backend.workReaction(current,action);
  const pet=model;
  if(!legacyActionReady())return null;
  if(!readyActions.includes(action)||!pack.animations[action]||!pet.perform(action,pack.animations[action].seconds))return null;
  const reaction=pet.actionRevision;
  sendState();
  return (assertCurrent=()=>{})=>{
    assertCurrent();
    if(model!==pet||pet.action!==action||pet.actionRevision!==reaction||!pet.perform('idle',pack.animations.idle.seconds))return null;
    sendState();return 'idle';
  };
},hide:async({stop=false}={})=>{
  if(stop){startup.stop();cancelIntro('skin-stop');}
  pendingInteraction=null;closeLegacyPet();await backend?.stop();updateMenu();sendState();
},isReady:token=>usesWorker()?backend.token===token&&backend.status().ready:ready&&packToken===token,apply:async context=>{
  const {pack:next,config,token,contentKey}=context;
  pack=next;packToken=token;ready=false;readyActions=[];pendingInteraction=null;say('');settings={...legacySettings,packId:pack.id,profile:config.profile,size:config.size,autonomous:config.autonomous,followMouse:config.followMouse,visible:true};
  if(backend.supports(contentKey)){
    await backend.apply({...context,holdVisibility:desktopOpeningHeld()||introPlaying});
    if(introPlaying)await backend.suspend();else if(!desktopOpeningHeld())await backend.releaseVisibility();
  }else{
    model.setProfile(pack.profiles[settings.profile]);model.autonomous=settings.autonomous;model.follow=settings.followMouse;
    settleUnsupportedAction();await createLegacyPet();
  }
  updateMenu();sendState();
}});
const showPet=()=>settings.visible&&!introPlaying&&!desktopOpeningHeld()&&(!skin.owned||skin.canShow());

function tokenFor(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,12);}
function event(type,extra={}){transitions.push({at:Date.now(),type,packId:settings.packId,...extra});if(transitions.length>80)transitions.shift();writeJson(join(stateDir,'runtime-events.json'),{version,started,transitions});}
function authorization(){const record=readJson(join(stateDir,'license.json'),null);if(!record||record.blocked)throw new Error(record?.blocked||'LICENSE_REQUIRED');return verifyLicense(record.receipt,{publicKey:service.publicKey,deviceId:deviceIdentity()});}
protocol.registerSchemesAsPrivileged([{scheme:'dsh-companion',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock({mode:launchMode}))app.quit();
else{
  app.on('second-instance',(_event,_args,_directory,data)=>{
    if(data?.mode==='launcher')openDsh(false);
    else if(desktopReady()&&showPet())void releaseOpeningPet().catch(()=>{});
  });
  app.whenReady().then(start).catch(error=>{errorCode=/^[A-Z_]+$/.test(error.message||'')?error.message:'DESKTOP_START_FAILED';phase='error';event('start-failed',{errorCode});app.quit();});
}
function persist(){if(model)writeJson(statePath,{schemaVersion:1,settings:skin.owned?legacySettings:settings,position:{displayId:workArea.displayId,x:model.x,y:model.y},savedAt:new Date().toISOString()});}
function openingAudioAudible(){return !!introWindow&&!introWindow.isDestroyed()&&introWindow.webContents.isCurrentlyAudible();}
function status(){
  const worker=usesWorker()?backend.status():null;
  const nativeWindow=worker?worker.windows[0]||null:window&&!window.isDestroyed()?{visible:window.isVisible(),bounds:window.getBounds(),alwaysOnTop:window.isAlwaysOnTop()}:null;
  return {running:!quitting,bridgeReady:!!bridge,ready:worker?.ready??ready,phase,version,skin:skin.status(),platform:process.platform,arch:process.arch,pid:process.pid,started,errorCode,settings,
    action:worker?worker.lastAction?.action||'idle':model?.action||'idle',needsHost:ownerPid<1,pack:{id:pack.id,name:pack.name,token:packToken},
    backend:worker,workReactionAvailable:!!(!pendingInteraction&&skin.canShow()&&nativeWindow?.visible&&(worker?worker.ready&&backend.canWorkReact(nativeWindow.renderer):legacyActionReady())),position:model&&!worker?{x:Math.round(model.x),y:Math.round(model.y)}:null,window:nativeWindow,
    startup:{...startup.status(),playing:introPlaying,rendererReady:introReady,media:introMedia,videoEnded:introVideoEnded,handoff:introHandoff,fallback:introFallback,audioMuted:introAudioMuted,audioAudible:openingAudioAudible(),
      hostReady:ownerPid>0,coldRequested,desktopOpeningHeld:desktopOpeningHeld(),elapsedSeconds:introPlaying?(Date.now()-introStartedAt)/1000:0,
      durationSeconds:introPlaying?introDuration:startup.descriptor?.seconds||pack.startup.seconds,completions:introCompletions,errorCode:introError||startup.errorCode||null,
      visible:!!introWindow&&!introWindow.isDestroyed()&&introWindow.isVisible(),bounds:introWindow&&!introWindow.isDestroyed()?introWindow.getBounds():null},
    activityActions:worker?.ready?['react',...(backend.canWalk(nativeWindow?.renderer)?['walk']:[])]:[...actions].filter(id=>readyActions.includes(id)),
    availableActions:worker?.ready?['idle','react','walk']:[...actions].filter(id=>readyActions.includes(id)),interaction:lastInteraction};
}
function say(text){speech=text;speechSequence++;}
function applySettings(input){
  if(skin.owned&&Object.keys(input).some(key=>['packId','size','profile','autonomous','followMouse','visible'].includes(key)))throw new Error('SKIN_MANAGED_SETTINGS');
  const next=validatedSettings(input,settings),nextPack=skin.owned?pack:packs.get(next.packId),nextToken=skin.owned?packToken:tokenFor(nextPack);if(nextToken!==packToken)ready=false;settings=next;legacySettings={...legacySettings,...input};pack=nextPack;packToken=nextToken;
  model.setProfile(pack.profiles[settings.profile]);model.autonomous=settings.autonomous;model.follow=settings.followMouse;sizeWindow();
  if(!settings.startupEnabled&&introPlaying)cancelIntro('startup-disabled');
  if(showPet()&&ready)window?.showInactive();else window?.hide();persist();updateMenu();sendState();return status();
}
function perform(action){
  authorization();if(!actions.has(action))throw new Error('UNKNOWN_ACTION');if(!readyActions.includes(action)||!pack.animations[action])throw new Error('ACTION_UNAVAILABLE');
  const messages={react:'欸，头发要被摸乱啦。',eat:'白饭！我才不是一直在等这个。',play:'和小猫玩一会儿。',stretch:'你也记得活动一下呀。','sleep-in':'先眯一会儿，醒来再陪你。',wake:'我醒啦，今天做点什么？',greet:'欢迎回来，今天也一起加油。'};
  model.perform(action,action==='sleep'?Infinity:pack.animations[action].seconds,messages[action]);if(messages[action])say(messages[action]);sendState();return status();
}
async function deliverInteraction(input){
  const current=()=>{
    if(!desktopReady()||!skin.canShow()||input.generation!==skin.generation||input.contentKey!==skin.contentKey)throw new Error('SKIN_OPERATION_SUPERSEDED');
  };
  current();
  const config=skin.interactionSettings();if(!config)throw new Error('SKIN_OPERATION_SUPERSEDED');
  if(typeof input.speech!=='string'||input.speech.length>120||!(input.action===null||actions.has(input.action)))throw new Error('PET_DECISION_INVALID');
  let action=config.allowActions&&config.actionDescriptions?.[input.action]?input.action:null;
  let speech=config.allowSpeech?input.speech:'';
  if(usesWorker()){
    if(action)await backend.act(action,current);
    if(speech)speech=await backend.say(speech,()=>{
      current();if(!skin.interactionSettings()?.allowSpeech)throw new Error('SKIN_OPERATION_SUPERSEDED');
    });
  }else{
    if(action&&(!readyActions.includes(action)||!model.perform(action,action==='sleep'?Infinity:pack.animations[action].seconds)))action=null;
    say(speech);sendState();
  }
  current();lastInteraction={speech,action,generation:skin.generation,at:Date.now()};return lastInteraction;
}
function settleUnsupportedAction(){if(!pack.animations[model.action]){model.action='idle';model.remaining=pack.animations.idle.seconds;}}
function resolveDisplay(){const displays=screen.getAllDisplays();const display=displays.find(item=>item.id===saved.position?.displayId)||screen.getDisplayNearestPoint(screen.getCursorScreenPoint());workArea={...display.workArea,displayId:display.id};}
function sizeWindow(){if(!window)return;const scale=settings.size/100,height=Math.round((pack.canvasHeight||300)*scale),width=Math.round(height*640/360);model.setBounds(workArea.width,workArea.height,height*92/300,height*235/300);window.setSize(width,height+50);positionWindow();}
function positionWindow(){
  if(!window||window.isDestroyed())return;const [width,height]=window.getSize();
  const rawX=workArea.x+model.x-width/2,rawY=workArea.y+model.y-height+8*settings.size/100,position=nativePosition(rawX,rawY);
  if(!position){geometry.rejectedPositions++;errorCode='DESKTOP_POSITION_INVALID';return;}
  if(Object.is(Math.round(rawX),-0)||Object.is(Math.round(rawY),-0))geometry.negativeZeroNormalizations++;
  if(errorCode==='DESKTOP_POSITION_INVALID')errorCode=null;const key=position.x+','+position.y;
  if(key!==lastPosition){window.setPosition(position.x,position.y,false);lastPosition=key;geometry.positionUpdates++;}
}
function sendState(){
  if(window&&!window.isDestroyed())window.webContents.send('companion:state',{skinSuspended:skin.owned&&skin.pausedMedia,action:model.action,facing:model.facing,dragging:model.dragging,falling:model.falling,speech,speechSequence,settings,packId:pack.id,packToken,appearance:pack.appearance});
  if(introWindow&&!introWindow.isDestroyed())introWindow.webContents.send('companion:intro-state',{content:activeIntro,playing:introPlaying,hostReady:ownerPid>0,elapsed:(Date.now()-introStartedAt)/1000,errorCode:introError});
}
function openDsh(background=true){
  if(openingDsh)return;if(!existsSync(integration.dshApp||'')){introError='DSH_APP_NOT_FOUND';sendState();return;}
  openingDsh=true;const args=[...(background?['-g','-j']:[]),'-a',integration.dshApp];
  const child=spawn('/usr/bin/open',args,{stdio:'ignore',env:{HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG}});child.once('exit',()=>{openingDsh=false;});child.once('error',()=>{openingDsh=false;introError='DSH_START_FAILED';});event('dsh-open-requested');
}
function bringDsh(){void shell.openExternal('dsh://open').catch(()=>openDsh(false));}
async function releaseOpeningPet(){
  if(!showPet()||readJson(join(stateDir,'skin-state.json'),{}).stopped||stopRequests(stateDir).length)return;
  if(usesWorker()){await backend.releaseVisibility();await backend.resume();}
  else if(ready&&wantsPet)window?.showInactive();
  updateMenu();
}
async function showIntro(){
   if(introPlaying||introReturning)return;
  authorization();if(!introAvailable())throw new Error(startup.declared?'STARTUP_NOT_REGISTERED':'ACTION_UNAVAILABLE');
  introStartedAt=Math.max(Date.now(),introStartedAt+1);const content=startup.declared?startup.playback():{...pack.startup,custom:false,name:pack.name,video:'/'+pack.animations[pack.startup.animation].file,contentKey:packToken};
   const token=content.contentKey+':'+(content.generation||0)+':'+introStartedAt,cinematic=!!content.handoffSeconds;
   activeIntro={...content,theme:content.theme||pack.startup.theme,token};
   introPlaying=true;introReady=false;introMedia=null;introVideoStarted=false;introVideoEnded=false;introHandoff=false;introDuration=content.seconds;introError=null;introAudioMuted=null;introFallback=null;phase='intro';
   try{
     if(usesWorker())await backend.suspend();else window?.hide();
     if(!introCurrent(token))return;
     if(cinematic&&introWindow)introWindow.destroy();
     if(!introWindow||introWindow.isDestroyed()){
       const win=new BrowserWindow({...currentIntroBounds(),show:false,frame:false,acceptFirstMouse:true,transparent:cinematic,backgroundColor:cinematic?'#00000000':'#111827',hasShadow:!cinematic,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,webPreferences:{preload:join(root,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,...(content.soundEnabled===true?{autoplayPolicy:'no-user-gesture-required'}:{})}});
       introWindow=win;
       win.setAlwaysOnTop(true,'screen-saver');if(process.platform==='darwin')win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true,skipTransformProcessType:true});
       win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
       win.webContents.on('render-process-gone',()=>{if(introWindow===win)cancelIntro('renderer-exited');});
       if(cinematic)win.webContents.on('before-input-event',(event,input)=>{
         if(input.type!=='keyDown'||input.key!=='Escape'||!introCurrent(token))return;
         event.preventDefault();void finishIntro('escape',token).catch(error=>eventError('intro-finish-failed',error));
       });
       win.on('closed',()=>{if(introWindow===win){introWindow=undefined;introReady=false;if(introCurrent(token))cancelIntro('window-closed');}});
       event('intro-start',{hostReady:ownerPid>0,custom:content.custom,contentKey:content.contentKey,generation:content.generation,cinematic,ownerPid,bounds:win.getBounds()});
       await win.loadURL('dsh-companion://app/startup.html');
     }else{introWindow.setBounds(currentIntroBounds());event('intro-start',{hostReady:ownerPid>0,custom:content.custom,contentKey:content.contentKey});}
     if(introCurrent(token))sendState();
   }catch(error){if(!introCurrent(token))return;cancelIntro('load-error');throw error;}
}
function introAvailable(){
 if(!startup.declared)return !!pack.animations[pack.startup.animation];
 if(!startup.canPlay())return false;
 if(!startup.descriptor.handoffSeconds)return true;
 const state=readJson(join(stateDir,'skin-state.json'),{});
 return !state.pending&&!state.stopped&&state.generation===startup.generation&&state.selected?.contentKey===startup.descriptor.contentKey&&state.results?.startup?.status==='ready';
}
function introCurrent(token){return introPlaying&&activeIntro?.token===token&&(!activeIntro.custom||startup.canPlay(activeIntro));}
function dismissOpening(content){
 if(introWindow&&!introWindow.isDestroyed()){
   if(content?.soundEnabled===true)introWindow.webContents.setAudioMuted(true);
   if(content?.handoffSeconds)introWindow.destroy();else introWindow.hide();
 }
}
function cancelIntro(reason){
  if(!introPlaying){void releaseOpeningPet().catch(()=>{});return;}
  const content=activeIntro;introPlaying=false;introReady=false;introMedia=null;activeIntro=null;dismissOpening(content);phase=desktopReady()?(ownerPid>0?'ready':'waiting-host'):'starting';
  event('intro-cancelled',{reason,contentKey:content.contentKey,generation:content.generation});
  // A new generation owns the old pet's exit and the new pet's visibility.
  // Resuming the old backend here would race its /skin/exit request.
  if(!content.handoffSeconds||!['generation-changed','module-exit','content-applied','skin-stop'].includes(reason))void releaseOpeningPet().catch(()=>{});
  sendState();
}
function currentIntroBounds(){
  const bounds=hostWindowBounds(readJson(join(stateDir,'host-window.json'),null)?.bounds);
  const display=bounds?screen.getDisplayMatching(bounds):screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return introBounds(bounds,display.workArea,display.bounds);
}
function eventError(type,error){event(type,{code:error.message});}
async function finishIntro(trigger='automatic',token=activeIntro?.token,mediaEndedAt=null){
   if(!introCurrent(token)||!introReady||!activeIntro.custom&&!desktopReady()||ownerPid<1)return;
   const content=activeIntro;
   const audibleBeforeClose=openingAudioAudible();
   introPlaying=false;introReturning=true;activeIntro=null;phase='ready';introCompletions++;
   dismissOpening(content);sendState();
   event('intro-complete',{trigger,hostReady:true,media:introMedia,videoEnded:introVideoEnded,handoff:introHandoff,contentKey:content.contentKey,generation:content.generation,
     mediaEndedAt,fallback:introFallback,audibleBeforeClose,audibleAfterClose:openingAudioAudible()});
   try{await releaseOpeningPet();}finally{bringDsh();introReturning=false;}
}


function attach(value){
  if(!Number.isSafeInteger(value.ownerPid)||value.ownerPid<1)throw new Error('INVALID_OWNER');
  try{process.kill(value.ownerPid,0);}catch{throw new Error('INVALID_OWNER');}
  if(!service.supportedDsh.includes(value.dshVersion))throw new Error('DSH_UNSUPPORTED_VERSION');
  ownerPid=value.ownerPid;event('host-attached',{dshVersion:value.dshVersion});
  if(desktopReady()&&!introPlaying){phase='ready';if(showPet()&&wantsPet)void releaseOpeningPet().catch(()=>{});}
  sendState();return status();
}
function updateMenu(){
  if(!tray)return;
  tray.setTitle(usesWorker()?'07':'鲸');
  tray.setToolTip('主题盒子 · '+pack.name);
  const focusItems=focusMenuItems(focusMenuState,value=>focusMenuActions.push(value));
  if(usesWorker()){
    const built=Menu.buildFromTemplate([
      {label:'主题盒子 · '+pack.name,enabled:false},
      {label:'向左走',enabled:desktopReady()&&showPet(),click:()=>void runAction('walk').catch(error=>eventError('pet-action-failed',error))},
      {label:'重播启动动画',enabled:introAvailable(),click:()=>void showIntro().catch(()=>{})},
      ...focusItems,
      {label:'回到 DSH',click:bringDsh},
      {label:'停止皮肤效果',click:()=>void skin.requestStop().catch(()=>{})},
    ]);
    tray.setContextMenu(built);return built;
  }
  const built=Menu.buildFromTemplate([{label:'主题盒子 · '+pack.name,enabled:false},...(skin.owned?[{label:'停止皮肤效果',click:()=>skin.requestStop()}]:[]),{label:settings.visible?'隐藏大肥鱼':'显示大肥鱼',enabled:!skin.owned,click:()=>applySettings({visible:!settings.visible})},{label:'重播启动动画',enabled:introAvailable(),click:()=>void showIntro().catch(()=>{})},{label:'相处模式',enabled:!skin.owned,submenu:Object.entries(pack.profiles).map(([id,profile])=>({label:profile.label,type:'radio',checked:settings.profile===id,click:()=>applySettings({profile:id})}))},{label:'自主活动',enabled:!skin.owned,type:'checkbox',checked:settings.autonomous,click:item=>applySettings({autonomous:item.checked})},{type:'separator'},...[[ 'react','摸摸头'],['eat','喂白饭'],['play','撸猫时间'],['stretch','伸懒腰'],['sleep-in','睡一会儿'],['wake','叫她起床']].filter(([action])=>readyActions.includes(action)).map(([action,label])=>({label,click:()=>perform(action)})),{type:'separator'},{label:'回到屏幕中间',click:()=>{model.dragging=false;model.falling=false;model.x=workArea.width*.6;model.y=workArea.height;model.perform('idle',5);positionWindow();persist();}},...focusItems,{label:'回到 DSH',click:bringDsh},{label:'退出桌宠',click:()=>{if(skin.owned)skin.requestStop();app.quit();}}]);tray.setContextMenu(built);return built;
}
function closeLegacyPet(){
  if(window){
    const win=window;window=undefined;
    win.destroy();
    model.dragging=false;model.falling=false;dragOffset=undefined;
  }
  ready=false;readyActions=[];lastPosition=null;
}
async function runAction(action){
  if(!usesWorker())return perform(action);
  authorization();
  if(!showPet())throw new Error('ACTION_UNAVAILABLE');
  await backend.act(action);
  return status();
}
async function createLegacyPet(){
  if(window)return;
  const win=new BrowserWindow({width:534,height:350,show:false,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,maximizable:false,minimizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,acceptFirstMouse:true,webPreferences:{preload:join(root,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false}});
  win.setAlwaysOnTop(true,'floating');win.setIgnoreMouseEvents(true,{forward:true});
  if(process.platform==='darwin')win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:false,skipTransformProcessType:true});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());win.webContents.on('render-process-gone',()=>{errorCode='RENDERER_EXITED';phase='error';app.quit();});win.on('closed',()=>{if(window===win){window=undefined;if(!quitting)app.quit();}});
  window=win;lastPosition=null;sizeWindow();
  await win.loadURL('dsh-companion://app/pet.html');
}
async function start(){
  if(process.platform==='darwin')app.dock.hide();
  if(launchMode==='launcher'){openDsh(false);app.quit();return;}
  try{authorization();}catch(error){event('license-blocked',{errorCode:error.message});app.quit();return;}
  protocol.handle('dsh-companion',request=>{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response(null,{status:403});
    if(url.pathname.startsWith('/skin-resource/'))return skin.resource(url);
    if(url.pathname.startsWith('/startup-resource/'))return startup.resource(url);
    if(url.pathname==='/selected-pack.json')return new Response(JSON.stringify({...pack,runtimeToken:packToken}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
    let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response(null,{status:400});}
    const target=resolve(root,'.'+pathname);if(!target.startsWith(root+sep))return new Response(null,{status:403});return net.fetch(pathToFileURL(target).href,{headers:request.headers});
  });
  resolveDisplay();model=new PetBehavior({width:workArea.width,height:workArea.height,halfWidth:92,petHeight:235});model.profile={...pack.profiles[settings.profile]};model.autonomous=settings.autonomous;model.follow=settings.followMouse;
  if(Number.isFinite(saved.position?.x))model.x=clamp(saved.position.x,model.halfWidth,workArea.width-model.halfWidth);
  const from=(event,target)=>target&&!target.isDestroyed()&&event.sender===target.webContents&&event.senderFrame===target.webContents.mainFrame;
  ipcMain.on('companion:ready',(event,value)=>{if(!from(event,window)||value?.packId!==pack.id||value?.packToken!==packToken)return;readyActions=Array.isArray(value.availableActions)?value.availableActions.filter(id=>actions.has(id)&&pack.animations[id]):[];ready=readyActions.includes('idle');updateMenu();if(!introPlaying){phase=ownerPid>0?'ready':'waiting-host';if(showPet()&&ownerPid>0)window.showInactive();}sendState();});
 ipcMain.on('companion:intro-ready',(e,value)=>{
   if(!from(e,introWindow))return;if(value?.mounted){sendState();return;}if(!introCurrent(value?.token))return;
   const content=activeIntro,first=!introReady,cinematic=!!content.handoffSeconds;
   if(cinematic&&value.handoff===true){
     if(!introHandoff&&introVideoStarted&&Number.isFinite(value.mediaTime)&&Number.isFinite(value.mediaDuration)&&value.mediaTime>=value.mediaDuration-content.handoffSeconds&&value.mediaTime<=value.mediaDuration){
       introHandoff=true;event('intro-handoff',{generation:content.generation,contentKey:content.contentKey,mediaTime:value.mediaTime,mediaDuration:value.mediaDuration});
     }
     return;
   }
   if(first||value.playing===true&&!introVideoStarted||cinematic&&value.fallback)introStartedAt=Date.now();
   if(cinematic&&value.fallback){introDuration=content.stillSeconds;introVideoStarted=false;introFallback=value.fallback;}
   if(value.playing===true)introVideoStarted=true;
   if(value.ended===true&&(!cinematic||introVideoStarted&&!introFallback))introVideoEnded=true;
   if(typeof value.muted==='boolean')introAudioMuted=value.muted;
   if(value.media)introMedia=value.media;introReady=true;
   if(first){
     if(cinematic)introWindow.show();else introWindow.showInactive();
   }
   if(cinematic&&(first||value.playing||value.fallback))event('intro-presented',{generation:content.generation,contentKey:content.contentKey,media:introMedia,fallback:introFallback,mediaTime:value.fallback?value.mediaTime??null:null,seconds:introDuration,assetSha256:introMedia==='video'?content.videoSha:content.posterSha,muted:introAudioMuted});
   if(cinematic&&introVideoStarted&&!introFallback&&value.ended===true)void finishIntro('media-ended',value.token,Number.isFinite(value.mediaTime)?value.mediaTime:null).catch(error=>eventError('intro-finish-failed',error));else sendState();
 });
 ipcMain.on('companion:intro-control',(e,value)=>{if(from(e,introWindow)&&introCurrent(value?.token)){if(value.action==='skip')void finishIntro('enter-button',value.token).catch(error=>eventError('intro-finish-failed',error));if(value.action==='open-dsh')openDsh();}});
  ipcMain.on('companion:hit',(event,hit)=>{if(from(event,window)&&!model.dragging)window.setIgnoreMouseEvents(hit!==true,{forward:true});});
  ipcMain.on('companion:action',(event,action)=>{
    if(!from(event,window)||!actions.has(action))return;
    if(skin.owned){
      const config=skin.interactionSettings();if(!config)return;
      if(config.persona&&config.actionDescriptions){
        pendingInteraction={trigger:'click',text:action==='eat'?'用户双击了你。':'用户轻点了你。',generation:skin.generation,contentKey:skin.contentKey};return;
      }
    }
    perform(readyActions.includes(action)?action:'idle');
  });
  ipcMain.on('companion:menu',event=>{if(from(event,window))updateMenu().popup({window});});
  ipcMain.on('companion:drag',(event,mode)=>{if(!from(event,window))return;const cursor=screen.getCursorScreenPoint();if(mode==='begin'){model.startDrag();dragOffset={x:cursor.x-workArea.x-model.x,y:cursor.y-workArea.y-model.y};lastCursor={...cursor,at:Date.now()};window.setIgnoreMouseEvents(false);}else if(mode==='end'&&model.dragging){model.release(lastCursor?.vx||0,lastCursor?.vy||0);dragOffset=undefined;}});
  tray=new Tray(nativeImage.createEmpty());if(process.platform==='darwin')tray.setTitle('鲸');tray.setToolTip('主题盒子 · '+pack.name);updateMenu();
  bridge=await createBridge({dispatch:async(route,input)=>{
    if(route==='/status')return status();
    if(route==='/shutdown'){event('shutdown-requested');setTimeout(()=>app.quit(),100);return {stopping:true};}
    if(route==='/skin/invalidate'){await skin.invalidate(input.generation);return {generation:input.generation};}
    if(route==='/skin/exit')return skin.exit(input.generation);
    if(route==='/skin/startup/invalidate'){startup.invalidate(input.generation);return {generation:input.generation};}
    if(route==='/skin/startup/exit'){const result=startup.exit(input);updateMenu();return result;}
    authorization();
    if(route==='/focus/menu'){
      if(input.quiet===true)await skin.work.cancel();
      if(focusMenuState?.phase!==input.phase||focusMenuState?.quiet!==input.quiet){
        focusMenuState={phase:input.phase,quiet:input.quiet};
        updateMenu();
      }
      return {actions:focusMenuActions.splice(0)};
    }
    if(route==='/skin/library/choose'){
      app.focus({steal:true});
      const result=await dialog.showOpenDialog({title:'安装本地皮肤',buttonLabel:'选择 ZIP 皮肤包',properties:['openFile'],filters:[{name:'ZIP 皮肤包',extensions:['zip']}]});
      return result.canceled?{canceled:true}:{canceled:false,file:result.filePaths[0]};
    }
    if(route==='/skin/startup/apply'){const result=startup.activate(input);updateMenu();return result;}
    if(route==='/skin/apply'){
      const result=await skin.activate(input);skin.assertReady(result);if(!introPlaying)phase='ready';
      await releaseOpeningPet();updateMenu();return result;
    }
    if(route==='/skin/work'){const result=await skin.work.deliver(input);event('work-feedback',result);return result;}
    if(route==='/skin/activity'){
      if(focusMenuState?.quiet||pendingInteraction||!status().workReactionAvailable)return {action:null};
      return skin.work.activity(input);
    }
    if(route==='/skin/activity/cancel')return skin.work.cancelActivity(input);
    if(route==='/settings')return applySettings(input);
    if(route==='/host-window'){
      if(!hostWindowBounds(input.bounds))throw new Error('HOST_WINDOW_INVALID');
      if(introWindow&&!introWindow.isDestroyed())introWindow.setBounds(currentIntroBounds());
      return {saved:true};
    }
    if(route==='/intro/desktop-release'){await releaseOpeningPet();return {ready:true};}
    if(route==='/backend/input'){
      const config=skin.interactionSettings();
      if(!usesWorker()||input.contentKey!==skin.contentKey||input.generation!==skin.generation||!config)throw new Error('SKIN_OPERATION_SUPERSEDED');
      if(input.trigger==='menu'){
        if(showPet())tray.popUpContextMenu(updateMenu(),screen.getCursorScreenPoint());
        return {accepted:true};
      }
      if(!config.allowActions)return {accepted:false,reason:'PET_ACTIONS_DISABLED'};
      pendingInteraction={trigger:'click',text:'用户轻点了你。',generation:skin.generation,contentKey:skin.contentKey};
      return {accepted:true};
    }
    if(route==='/interaction/poll'){const value=pendingInteraction;pendingInteraction=null;return {input:skin.canShow()&&value?.generation===skin.generation?value:null};}
    if(route==='/interaction')return deliverInteraction(input);
    if(route==='/action')return runAction(input.action);
    if(route==='/attach')return attach(input);
    if(route==='/intro/replay'){await showIntro();return status();}
    if(route==='/skin/size')return skin.resize(input,async(size,assertCurrent)=>{
      if(usesWorker())await backend.resize(size,assertCurrent);
      assertCurrent();
      settings={...settings,size};sizeWindow();sendState();
    });
    if(route==='/diagnostics'){
      if(usesWorker())return {ownWindowOnly:true,backend:backend.status(),startup:status().startup,transitions};
      if(!ready)throw new Error('DESKTOP_NOT_READY');const image=await window.webContents.capturePage(),bitmap=image.toBitmap();let transparent=0,opaque=0;
      for(let i=3;i<bitmap.length;i+=4){if(bitmap[i]<10)transparent++;else if(bitmap[i]>245)opaque++;}
      return {ownWindowOnly:true,width:image.getSize().width,height:image.getSize().height,transparentPixels:transparent,opaquePixels:opaque,totalPixels:bitmap.length/4,allMacSpaces:process.platform==='darwin'&&window.isVisibleOnAllWorkspaces(),singleInstance:app.hasSingleInstanceLock(),geometry,startup:status().startup,packId:pack.id,transitions};
    }
    throw new Error('UNKNOWN_ROUTE');
  }});
  backend=new WholePetBackend({stateDir,host:{origin:'http://127.0.0.1:'+bridge.port,token:bridge.token},event});
  writeJson(bridgePath,{schemaVersion:1,pid:process.pid,port:bridge.port,token:bridge.token,version,skinProtocol:1,startupProtocol:1});
  event('runtime-started',{launchMode});
  if(settings.startupEnabled&&coldRequested&&introAvailable())await showIntro();
  if(!skin.owned)await createLegacyPet();
  let last=performance.now(),lastFollow=0;
  timer=setInterval(()=>{
    const now=performance.now(),dt=(now-last)/1000;last=now;
    if(introPlaying){
      if(!introCurrent(activeIntro?.token)){cancelIntro('identity-invalid');return;}
      const elapsed=Date.now()-introStartedAt,duration=introDuration*1000;
      const trigger=openingTimerTrigger({cinematic:!!activeIntro.handoffSeconds,fallback:introFallback,elapsed,duration,
        legacyVideoPending:activeIntro.custom&&introMedia==='video'&&introVideoStarted&&!introVideoEnded});
      if(ownerPid>0&&introReady&&trigger)void finishIntro(trigger).catch(error=>eventError('intro-finish-failed',error));
      else if(ownerPid<1&&elapsed>45000)introError='DSH_STARTUP_TIMEOUT';
      sendState();return;
    }
    if(!window||window.isDestroyed()||skin.owned&&!skin.visible)return;
    const cursor=screen.getCursorScreenPoint();
    if(model.dragging&&dragOffset){model.dragTo(cursor.x-workArea.x-dragOffset.x,cursor.y-workArea.y-dragOffset.y);if(lastCursor){const interval=Math.max(.025,(Date.now()-lastCursor.at)/1000);lastCursor.vx=clamp((cursor.x-lastCursor.x)/interval,-700,700);lastCursor.vy=clamp((cursor.y-lastCursor.y)/interval,-650,800);}lastCursor={...cursor,vx:lastCursor?.vx||0,vy:lastCursor?.vy||0,at:Date.now()};}
    else{if(model.follow&&now-lastFollow>700&&!model.falling&&Math.abs(cursor.x-workArea.x-model.x)>75){model.walkTo(cursor.x-workArea.x,'跟着你，慢慢走。');lastFollow=now;}model.step(dt);}
    settleUnsupportedAction();
    if(model.action!==previousAction){previousAction=model.action;if(!['walk','idle','sleep'].includes(model.action))model.remaining=pack.animations[model.action].seconds;}
    if(model.events[0]!==lastEvent){lastEvent=model.events[0];if(lastEvent)say(lastEvent.text);}positionWindow();sendState();
    const bounds=window.getBounds();if(!model.dragging&&(cursor.x<bounds.x||cursor.y<bounds.y||cursor.x>=bounds.x+bounds.width||cursor.y>=bounds.y+bounds.height))window.setIgnoreMouseEvents(true,{forward:true});
  },33);
  monitor=setInterval(()=>{
    persist();try{authorization();}catch(error){event('license-blocked',{errorCode:error.message});app.quit();return;}
    if(integration.profileDir&&!profileGate(integration.profileDir).enabled){event('integration-disabled');app.quit();return;}
    if(ownerPid){try{process.kill(ownerPid,0);}catch{event('owner-gone');app.quit();}}
    if(backend.visibilityHeld&&!desktopOpeningHeld())void releaseOpeningPet().catch(()=>{});
  },2000);
  const displayChanged=()=>{resolveDisplay();model.setBounds(workArea.width,workArea.height);sizeWindow();if(introWindow&&!introWindow.isDestroyed())introWindow.setBounds(currentIntroBounds());};screen.on('display-removed',displayChanged);screen.on('display-metrics-changed',displayChanged);
}
app.on('before-quit',e=>{
  if(exitAllowed)return;
  e.preventDefault();if(quitting)return;quitting=true;clearInterval(timer);clearInterval(monitor);
  void (async()=>{
    try{
      try{persist();}catch{}
      closeLegacyPet();await backend?.stop();introWindow?.destroy();
      try{if(JSON.parse(readFileSync(bridgePath,'utf8')).pid===process.pid)unlinkSync(bridgePath);}catch{}
      bridge?.server.close();tray?.destroy();
    }finally{exitAllowed=true;app.quit();}
  })().catch(error=>eventError('shutdown-failed',error));
});
app.on('window-all-closed',()=>{});
process.on('SIGTERM',()=>app.quit());
