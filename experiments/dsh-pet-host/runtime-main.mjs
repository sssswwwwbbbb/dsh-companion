import {app,BrowserWindow,ipcMain,screen,protocol,net,dialog} from 'electron';
import {readFileSync,existsSync,unlinkSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createBridge} from './bridge.mjs';
import {NativeSkinRuntime} from './skin.mjs';
import {NativeStartupRuntime} from './startup-skin.mjs';
import {WholePetBackend} from './backend.mjs';
import {validatedSettings} from './settings.mjs';
import {verifyLicense,deviceIdentity} from './license-core.mjs';
import {PackStore} from './packs.mjs';
import {readJson,writeJson} from './storage.mjs';
import {profileGate} from './integration.mjs';
import {hostWindowBounds,introBounds} from './host-window.mjs';
import {stopRequests} from './skin-core/src/state.mjs';
import {coldOpeningAllowed,chooseSkinFile} from './compatibility.mjs';
const root=dirname(fileURLToPath(import.meta.url)),version=JSON.parse(readFileSync(join(root,'package.json'))).version;
const stateDir=process.env.DSH_COMPANION_STATE_DIR;
if(!stateDir||!process.env.DSH_HOST_PET_LAB)throw new Error('PRIVATE_PROFILE_REQUIRED');
mkdirSync(stateDir,{recursive:true,mode:0o700});app.setPath('userData',join(stateDir,'supervisor-profile'));app.setName('DSH Pet Host Private');
const statePath=join(stateDir,'settings.json'),bridgePath=join(stateDir,'bridge.json');
const service=readJson(join(root,'config/service.json')),integration=readJson(join(stateDir,'integration.json'),{});
let settings=validatedSettings(readJson(statePath,{}).settings||{}),legacySettings={...settings};
const packs=new PackStore(join(root,'packs'),stateDir);let pack=packs.get(settings.packId);
let bridge,backend,skin,introWindow,monitor,quitting=false,exitAllowed=false,ready=false;
let ownerPid=Number(process.env.DSH_COMPANION_OWNER_PID||0),phase='standby',errorCode=null,launchMode='managed';
let introPlaying=false,introReady=false,introStartedAt=0,introError=null,introCompletions=0,activeIntro=null,introMedia=null,introVideoStarted=false,introVideoEnded=false;
let pendingInteraction=null,lastInteraction=null;const started=new Date().toISOString(),transitions=[];
const coldState=readJson(join(stateDir,'skin-state.json'),{}),coldKey=coldState.selected?.contentKey;
const coldRequested=process.env.DSH_COMPANION_PLAY_INTRO==='1';
let coldIntroPending=coldOpeningAllowed({requested:coldRequested,settings,state:coldState,hasStops:stopRequests(stateDir).length>0}),coldAutoStarted=false;
function event(type,extra={}){transitions.push({at:Date.now(),type,...extra});if(transitions.length>200)transitions.shift();writeJson(join(stateDir,'runtime-events.json'),{version,started,transitions});}
function authorization(){const record=readJson(join(stateDir,'license.json'),null);if(!record||record.blocked)throw new Error(record?.blocked||'LICENSE_REQUIRED');return verifyLicense(record.receipt,{publicKey:service.publicKey,deviceId:deviceIdentity()});}
const startup=new NativeStartupRuntime({stateDir,dshVersion:integration.dshVersion,onCancel:reason=>{if(activeIntro?.custom)cancelIntro(reason);}});
const showPet=()=>settings.visible&&!introPlaying&&skin?.canShow();
function status(){const b=backend?.status();return {running:!quitting,bridgeReady:!!bridge,ready:b?.ready===true,phase:introPlaying?'intro':b?.ready?'ready':'standby',version,pid:process.pid,started,errorCode,settings,needsHost:ownerPid<1,skin:skin?.status(),backend:b,window:b?.windows?.[0]?{visible:b.windows[0].visible,bounds:b.windows[0].bounds}:null,action:b?.windows?.[0]?.renderer?.sprites?.[0]?.anim||'idle',availableActions:b?.ready?['idle','react']:[],interaction:lastInteraction,startup:{...startup.status(),playing:introPlaying,rendererReady:introReady,media:introMedia,videoEnded:introVideoEnded,hostReady:ownerPid>0,coldRequested,coldPending:coldIntroPending,coldAutoStarted,elapsedSeconds:introStartedAt?(Date.now()-introStartedAt)/1000:0,durationSeconds:activeIntro?.seconds||startup.descriptor?.seconds||pack.startup.seconds,completions:introCompletions,errorCode:introError||null,visible:!!introWindow&&!introWindow.isDestroyed()&&introWindow.isVisible(),bounds:introWindow&&!introWindow.isDestroyed()?introWindow.getBounds():null}};}
function sendState(){ready=backend?.ready===true;if(introWindow&&!introWindow.isDestroyed())introWindow.webContents.send('companion:intro-state',{content:activeIntro,playing:introPlaying,hostReady:ownerPid>0,elapsed:(Date.now()-introStartedAt)/1000,errorCode:introError});}
function updateMenu(){} // No second pet tray or control window in this private path.
function openDsh(){event('isolated-host-return',{ownerPresent:ownerPid>0});}
async function releaseOpeningPet(){if(!coldIntroPending&&showPet()){await backend?.releaseVisibility();await backend?.resume();}}
async function maybeColdOpening(){
 if(!coldIntroPending||!backend)return;
 const state=readJson(join(stateDir,'skin-state.json'),{});
 if(!coldOpeningAllowed({requested:true,settings,state,hasStops:stopRequests(stateDir).length>0})||state.selected?.contentKey!==coldKey||state.pending&&state.pending.contentKey!==coldKey){coldIntroPending=false;await releaseOpeningPet();return;}
 if(!startup.canPlay()||startup.descriptor.contentKey!==coldKey)return;
 coldIntroPending=false;coldAutoStarted=true;event('cold-intro-request',{contentKey:coldKey});
 try{await showIntro();}catch(error){cancelIntro('load-error');throw error;}
}
__INTRO_FUNCTIONS__

async function applySettings(input){
 if(skin.owned&&Object.keys(input).some(k=>['packId','size','profile','autonomous','followMouse','visible'].includes(k)))throw new Error('SKIN_MANAGED_SETTINGS');
 settings=validatedSettings(input,settings);legacySettings={...legacySettings,...input};writeJson(statePath,{schemaVersion:1,settings:legacySettings});
 if(!settings.startupEnabled){coldIntroPending=false;cancelIntro('startup-disabled');}sendState();return status();
}
async function deliverInteraction(input){
 if(!skin.canShow()||input.generation!==skin.generation||input.contentKey!==skin.contentKey)throw new Error('SKIN_OPERATION_SUPERSEDED');
 const config=skin.interactionSettings();if(!config)throw new Error('SKIN_OPERATION_SUPERSEDED');
 if(typeof input.speech!=='string'||input.speech.length>120||!(input.action===null||['idle','react'].includes(input.action)))throw new Error('PET_DECISION_INVALID');
 if(config.allowSpeech&&input.speech)throw new Error('BACKEND_SPEECH_UNAVAILABLE');
 let action=config.allowActions&&config.actionDescriptions?.[input.action]?input.action:null;
 if(action)await backend.act(action,()=>{if(!skin.canShow()||skin.generation!==input.generation||skin.contentKey!==input.contentKey)throw new Error('SKIN_OPERATION_SUPERSEDED');});
 lastInteraction={speech:'',action,generation:skin.generation,at:Date.now()};return lastInteraction;
}
async function start(){
 app.dock?.hide();authorization();
 protocol.handle('dsh-companion',request=>{const url=new URL(request.url);if(url.hostname!=='app')return new Response(null,{status:403});if(url.pathname.startsWith('/startup-resource/'))return startup.resource(url);const target=resolve(root,'.'+decodeURIComponent(url.pathname));if(!target.startsWith(root+sep))return new Response(null,{status:403});return net.fetch(pathToFileURL(target).href,{headers:request.headers});});
 bridge=await createBridge({dispatch:async(route,input)=>{
  if(route==='/status')return status();
  if(route==='/shutdown'){await backend.stop();introWindow?.destroy();introWindow=null;setTimeout(()=>app.quit(),50);return {stopping:true,cleared:true};}
  if(route==='/skin/invalidate'){await skin.invalidate(input.generation);return {generation:input.generation};}
  if(route==='/skin/exit')return skin.exit(input.generation);
  if(route==='/skin/startup/invalidate'){startup.invalidate(input.generation);return {generation:input.generation};}
  if(route==='/skin/startup/exit')return startup.exit(input);
  authorization();
  if(route==='/skin/apply'){const result=await skin.activate(input);skin.assertReady(result);sendState();return result;}
  if(route==='/skin/startup/apply'){const result=startup.activate(input);await maybeColdOpening();return result;}
  if(route==='/skin/library/choose')return chooseSkinFile({focus:()=>{if(!existsSync(join(process.env.DSH_HOST_PET_LAB,'picker-fixture.json')))app.focus({steal:true});},showOpenDialog:options=>{const fixture=join(process.env.DSH_HOST_PET_LAB,'picker-fixture.json');return existsSync(fixture)?JSON.parse(readFileSync(fixture)):dialog.showOpenDialog(options);}});
  if(route==='/skin/work'){const result=await skin.work.deliver(input);event('work-feedback',result);return result;}
  if(route==='/settings')return applySettings(input);
  if(route==='/attach'){if(!Number.isSafeInteger(input.ownerPid)||!service.supportedDsh.includes(input.dshVersion))throw new Error('INVALID_OWNER');process.kill(input.ownerPid,0);ownerPid=input.ownerPid;sendState();return status();}
  if(route==='/host-window'){if(!hostWindowBounds(input.bounds))throw new Error('HOST_WINDOW_INVALID');if(introWindow)introWindow.setBounds(currentIntroBounds());return {saved:true};}
  if(route==='/intro/replay'){await showIntro();return status();}
  if(route==='/backend/input'){const config=skin.interactionSettings();if(input.contentKey!==skin.contentKey||input.generation!==skin.generation||!config)throw new Error('SKIN_OPERATION_SUPERSEDED');if(!config.allowActions)return {accepted:false,reason:'PET_ACTIONS_DISABLED'};pendingInteraction={trigger:'click',text:'用户轻点了你。',generation:skin.generation,contentKey:skin.contentKey};event('native-click-candidate',{generation:skin.generation});return {accepted:true};}
  if(route==='/interaction/poll'){const value=pendingInteraction;pendingInteraction=null;return {input:skin.canShow()&&value?.generation===skin.generation?value:null};}
  if(route==='/interaction')return deliverInteraction(input);
  if(route==='/action'){await backend.act(input.action);return status();}
  if(route==='/diagnostics')return {ownWindowOnly:true,backend:backend.status(),oldPetBranchActive:false,legacyPetWindowCount:0,legacyBehaviorConstructed:false,legacyMovementTickInstalled:false,transitions,startup:status().startup};
  throw new Error('UNKNOWN_ROUTE');
 }});
 backend=new WholePetBackend({stateDir,host:{origin:'http://127.0.0.1:'+bridge.port,token:bridge.token},event});
 skin=new NativeSkinRuntime({stateDir,loadPack:id=>packs.get(id),hide:async({stop=false}={})=>{if(stop){coldIntroPending=false;startup.stop();cancelIntro('skin-stop');}pendingInteraction=null;await backend.stop();sendState();},isReady:token=>backend.status().ready&&backend.token===token,workAction:(action,current)=>backend.act(action,current),apply:async({pack:next,config,token,resources,contentKey,generation,assertCurrent})=>{pack=next;settings={...legacySettings,packId:pack.id,profile:config.profile,size:config.size,autonomous:false,followMouse:false,visible:true};await backend.apply({pack,config,token,resources,contentKey,generation,assertCurrent,holdVisibility:coldIntroPending||introPlaying});if(introPlaying)await backend.suspend();else if(!coldIntroPending)await backend.releaseVisibility();}});
 const from=e=>introWindow&&!introWindow.isDestroyed()&&e.sender===introWindow.webContents&&e.senderFrame===introWindow.webContents.mainFrame;
 ipcMain.on('companion:intro-ready',(e,value)=>{if(!from(e))return;if(value?.mounted){sendState();return;}if(!introCurrent(value?.token))return;const first=!introReady;if(first||value.playing===true&&!introVideoStarted)introStartedAt=Date.now();if(value.playing===true)introVideoStarted=true;if(value.ended===true)introVideoEnded=true;if(value.media)introMedia=value.media;introReady=true;introWindow.showInactive();sendState();});
 ipcMain.on('companion:intro-control',(e,value)=>{if(from(e)&&introCurrent(value?.token)){if(value.action==='skip')finishIntro('enter-button');if(value.action==='open-dsh')openDsh();}});
 writeJson(bridgePath,{schemaVersion:1,pid:process.pid,port:bridge.port,token:bridge.token,version,skinProtocol:1,startupProtocol:1});event('runtime-started',{backend:'whole-dsh-pet'});
 monitor=setInterval(()=>{try{authorization();if(!profileGate(integration.profileDir).enabled)throw new Error('INTEGRATION_DISABLED');process.kill(ownerPid,0);if(introPlaying)sendState();void maybeColdOpening().catch(error=>event('cold-intro-failed',{code:error.message}));if(introPlaying&&introReady&&ownerPid>0&&Date.now()-introStartedAt>activeIntro.seconds*1000&&(!introVideoStarted||introVideoEnded||Date.now()-introStartedAt>(activeIntro.seconds+1)*1000))void finishIntro().catch(error=>event('intro-finish-failed',{code:error.message}));}catch(error){event('monitor-stop',{code:error.message});app.quit();}},250);
 await maybeColdOpening();
}
protocol.registerSchemesAsPrivileged([{scheme:'dsh-companion',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock())app.quit();else app.whenReady().then(start).catch(error=>{errorCode=error.message;event('start-failed',{errorCode});app.quit();});
app.on('before-quit',e=>{if(exitAllowed)return;e.preventDefault();if(quitting)return;quitting=true;clearInterval(monitor);void(async()=>{try{await backend?.stop();introWindow?.destroy();bridge?.server.close();if(readJson(bridgePath,{})?.pid===process.pid)unlinkSync(bridgePath);}finally{exitAllowed=true;app.quit();}})();});
process.on('SIGTERM',()=>app.quit());
