import { spawn, execFile } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, lstatSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { SkinDownloads } from './skin-downloads.mjs';
import { CompanionSkins } from './skins.mjs';
import { FocusTimer } from './focus.mjs';
import { Entitlement } from './entitlement.mjs';
import { PackStore } from './packs.mjs';
import { Integration, profileGate } from './integration.mjs';
import { readJson, writeJson } from './storage.mjs';
import { validatedSettings, defaults } from './settings.mjs';
import { hostWindowBounds } from './host-window.mjs';
import { updateInfo } from './update-info.mjs';

const packageRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const metadata=JSON.parse(readFileSync(join(packageRoot,'package.json')));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const execute=promisify(execFile);
export const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
export function childEnvironment(source,extra){
  const allowed=['HOME','USER','LOGNAME','TMPDIR','PATH','LANG','LC_ALL','SystemRoot','WINDIR','USERPROFILE','APPDATA','LOCALAPPDATA','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR'];
  return {...Object.fromEntries(allowed.filter(key=>source[key]!==undefined).map(key=>[key,source[key]])),...extra};
}
export class CompanionController {
  constructor({profileDir=process.cwd(),stateDir,dshVersion='unknown',config,deviceId,launcherDirectory,fetcher}={}){
    this.profileDir=profileDir;this.dshVersion=dshVersion;
    this.stateDir=stateDir||join(process.env.DSH_HOME||join(homedir(),'.dsh'),'companion',createHash('sha256').update(profileDir).digest('hex').slice(0,16));
    mkdirSync(this.stateDir,{recursive:true,mode:0o700});
    this.bridgePath=join(this.stateDir,'bridge.json');this.settingsFile=join(this.stateDir,'settings.json');
    this.config=config||readJson(join(packageRoot,'config/service.json'));
    this.entitlement=new Entitlement({stateDir:this.stateDir,config:this.config,...(deviceId?{deviceId}:{}),...(fetcher?{fetcher}:{})});
    this.packs=new PackStore(join(packageRoot,'packs'),this.stateDir);
    this.integration=new Integration({stateDir:this.stateDir,profileDir,packageRoot,launcherDirectory});
    this.phase='stopped';this.child=undefined;this.pending=undefined;this.disposed=false;
    this.focus=new FocusTimer(this.stateDir);
    this.skins=new CompanionSkins(this);
    this.skinDownloads=new SkinDownloads(this);
    this.build=metadata.build??Number(metadata.version.match(/dev\.(\d+)/)?.[1]||1);
  }
  credentials(){
    try{const file=lstatSync(this.bridgePath);if(!file.isFile()||file.isSymbolicLink()||process.platform!=='win32'&&(file.mode&0o077)!==0)return;
      const value=JSON.parse(readFileSync(this.bridgePath,'utf8'));if(!Number.isInteger(value.pid)||value.pid<1||!alive(value.pid)||!Number.isInteger(value.port)||value.port<1||value.port>65535||!/^[a-f0-9]{64}$/.test(value.token||''))return;return value;
    }catch{return;}
  }
  async request(route,body,timeout=3000){
    const bridge=this.credentials();if(!bridge)throw new Error('DESKTOP_NOT_RUNNING');
    const response=await fetch('http://127.0.0.1:'+bridge.port+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+bridge.token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(timeout)});
    const value=await response.json();if(!response.ok)throw new Error(/^[A-Z_]+$/.test(value.error||'')?value.error:'DESKTOP_REQUEST_FAILED');return value;
  }
  settings(){return validatedSettings(readJson(this.settingsFile,{}).settings||{},defaults);}
  async nativeStatus(){try{return await this.request('/status');}catch{return {running:false,ready:false,phase:this.phase,errorCode:this.errorCode||null};}}
  async status(){
    const native=await this.nativeStatus(), license=this.entitlement.status(), settings=native.settings||this.settings();
    const update=readJson(join(this.stateDir,'update.json'),null), download=readJson(join(this.stateDir,'download.json'),null);
    return JSON.parse(JSON.stringify({...native,desktopSkin:native.skin||null,skin:this.skins.status(),skinDownloads:this.skinDownloads?.status()||{jobs:[]},focus:this.focus.snapshot(),character:license.active?this.replyStyle?.characterStatus()||null:null,replyStyle:license.active?this.replyStyle?.status()||null:null,petInteraction:this.interactions?.status()||null,petMemory:license.active?this.interactions?.memory.status()||null:null,version:metadata.version,desktopVersion:native.version||null,platform:process.platform,phase:!license.active?'locked':native.phase,settings,license,packs:this.packs.summaries(),selectedPack:settings.packId,launcher:this.integration.status(),compatibility:{dshVersion:this.dshVersion,supported:this.config.supportedDsh.includes(this.dshVersion),testedVersions:this.config.supportedDsh},update:update?{...updateInfo(update.release,this.build),checkedAt:update.checkedAt}:null,download:download?{version:download.version,filename:basename(download.file),verified:true}:null}));
  }
  async boot({playIntro=false}={}){
    this.bootIntroRequested=playIntro&&this.settings().autoStart&&this.settings().startupEnabled;
    this.integration.record(this.dshVersion);
    if(this.settings().launcherEnabled||this.integration.status().installed)await this.configure({launcherEnabled:false}).catch(()=>{});
    if(this.entitlement.status().active){await this.entitlement.refresh();if(this.entitlement.status().active){
      const live=await this.nativeStatus();
      if(live.running)await this.request('/attach',{ownerPid:process.pid,dshVersion:this.dshVersion});
      if(this.settings().autoStart&&this.skins.core.state.selected&&!this.skins.core.state.stopped)await this.start({playIntro});
    }else await this.stop();}else await this.stop();
    this.heartbeat=setInterval(()=>{void this.maintain().catch(()=>{});},2000);this.heartbeat.unref?.();
    return this.status();
  }
  async maintain(){
    if(this.disposed||this.maintaining)return;this.maintaining=true;
    try{
      const license=await this.entitlement.refresh();await this.skins.maintain();const live=await this.nativeStatus();
      void this.interactions?.drainNative();
      if(license.active)void this.skins.activities.maintain(live).catch(()=>{});
      if(!license.active&&live.running)await this.stop();
      else if(license.active&&live.running){
        if(live.needsHost)await this.request('/attach',{ownerPid:process.pid,dshVersion:this.dshVersion});
        const {phase,quiet}=this.focus.snapshot();
        const result=await this.request('/focus/menu',{phase,quiet}).catch(()=>null);
        for(const value of result?.actions||[])this.changeFocus(value);
      }
    }finally{this.maintaining=false;}
  }
  async start({playIntro=false,skinStandby=!!this.skins.core.state.selected}={}){
    if(this.disposed)throw new Error('PLUGIN_DISPOSED');this.entitlement.require();
    if(!skinStandby&&!this.skins.core.state.selected)throw new Error('SKIN_NOT_SELECTED');
    if(!this.config.supportedDsh.includes(this.dshVersion))throw new Error('DSH_UNSUPPORTED_VERSION');
    if(this.pending)return this.pending;this.pending=this.launch({playIntro,skinStandby}).finally(()=>{this.pending=undefined;});await this.pending;return this.status();
  }
  async executable(){
    if(process.platform!=='darwin'||process.arch!=='arm64')throw new Error('DESKTOP_COMPONENT_MISSING');
    const relative='DSHCompanion.app/Contents/MacOS/Electron',development=join(packageRoot,'runtime','darwin-arm64',relative);
    if(existsSync(development))return development;
    const directory=join(packageRoot,'runtime-bundles'),archive=join(directory,'DSHCompanion-darwin-arm64.zip');
    const manifest=readJson(join(directory,'manifest.json'),null);
    if(!manifest||manifest.platform!=='darwin-arm64'||!/^[a-f0-9]{64}$/.test(manifest.sha256||'')||!existsSync(archive))throw new Error('DESKTOP_COMPONENT_MISSING');
    const cache=join(this.stateDir,'runtime'),destination=join(cache,manifest.sha256.slice(0,20)),executable=join(destination,relative);
    if(existsSync(executable))return executable;
    if(createHash('sha256').update(readFileSync(archive)).digest('hex')!==manifest.sha256)throw new Error('DESKTOP_ARCHIVE_INVALID');
    mkdirSync(cache,{recursive:true,mode:0o700});const temporary=mkdtempSync(join(cache,'.extract-'));
    try{await execute('/usr/bin/ditto',['-x','-k',archive,temporary],{env:childEnvironment(process.env,{}),timeout:30000});if(!existsSync(join(temporary,relative)))throw new Error();renameSync(temporary,destination);}
    catch{rmSync(temporary,{recursive:true,force:true});throw new Error('DESKTOP_EXTRACT_FAILED');}return executable;
  }
  async launch({playIntro=false,skinStandby=false}={}){
    let live=await this.nativeStatus();
    if(live.running&&live.version!==metadata.version){await this.stop();live={running:false};}
    if(live.running){await this.request('/attach',{ownerPid:process.pid,dshVersion:this.dshVersion});return live;}
    this.phase='starting';this.errorCode=null;this.integration.record(this.dshVersion);
    let executable;try{executable=await this.executable();}catch(error){this.phase='error';this.errorCode=error.message;throw error;}
    if(this.disposed)throw new Error('PLUGIN_DISPOSED');
    const child=spawn(executable,[],{env:childEnvironment(process.env,{DSH_COMPANION_STATE_DIR:this.stateDir,DSH_COMPANION_OWNER_PID:String(process.pid),DSH_COMPANION_MODE:'managed',DSH_COMPANION_PLAY_INTRO:playIntro||this.bootIntroRequested?'1':'0',DSH_COMPANION_SKIN_STANDBY:skinStandby?'1':'0'}),stdio:'ignore',windowsHide:true});this.child=child;this.bootIntroRequested=false;
    child.on('error',()=>{this.phase='error';this.errorCode='DESKTOP_LAUNCH_FAILED';});
    child.on('exit',()=>{if(this.child===child){this.child=undefined;this.phase='stopped';}});
    for(let i=0;i<100;i++){
      if(this.disposed){await this.stop();throw new Error('PLUGIN_DISPOSED');}
      const state=await this.nativeStatus();
      if(state.ready||state.bridgeReady&&(skinStandby||state.startup?.ready===true)){this.phase=state.phase;return state;}if(this.errorCode)throw new Error(this.errorCode);await delay(150);
    }
    this.errorCode='DESKTOP_READY_TIMEOUT';await this.stop();throw new Error(this.errorCode);
  }
  changeFocus(value){
    this.entitlement.require();
    const wasQuiet=this.focus.quiet;
    this.focus.change(value);
    if(!wasQuiet&&this.focus.quiet){this.skins.work.cancel();this.skins.activities.cancel();}
  }
  async focusAction(value){
    this.changeFocus(value);
    return this.status();
  }
  async configure(value){
    if(this.skins.core.state.selected&&Object.keys(value).some(key=>['packId','size','profile','autonomous','followMouse','visible'].includes(key)))throw new Error('SKIN_MANAGED_SETTINGS');
    const next=validatedSettings(value,this.settings());this.packs.get(next.packId);
    if((await this.nativeStatus()).running)await this.request('/settings',value);
    else writeJson(this.settingsFile,{...readJson(this.settingsFile,{}),schemaVersion:1,settings:next});return this.status();
  }
  async selectPack(value){const pack=this.packs.get(value);return this.configure({packId:pack.id,...pack.defaults});}
  async importPack(value){this.packs.import(value);return this.status();}
  exportPack(value){return this.packs.export(value||this.settings().packId);}
  async action(value){this.entitlement.require();await this.request('/action',{action:value});return this.status();}
  async replayIntro(){this.entitlement.require();const skin=this.skins.core.state.selected;if(!skin)throw new Error('SKIN_NOT_SELECTED');if(!skin.manifest.modules.startup||this.skins.core.state.stopped||this.skins.core.state.disabled.startup)throw new Error('SKIN_SETTING_UNSUPPORTED');if(!(await this.nativeStatus()).running)await this.start();await this.request('/intro/replay',{});return this.status();}
  async syncHostWindow(value){
    const bounds=hostWindowBounds(value);if(!bounds)throw new Error('HOST_WINDOW_INVALID');
    writeJson(join(this.stateDir,'host-window.json'),{format:1,bounds,ownerPid:process.pid,updatedAt:Date.now(),workspaceVisible:value.workspaceVisible===true});
    if(this.credentials()&&this.entitlement.status().active)await this.request('/host-window',{bounds}).catch(()=>{});
    return {saved:true};
  }
  async activate(value){await this.skinDownloads.cancelAll();try{await this.entitlement.activate(value);if(this.settings().autoStart&&this.skins.core.state.selected&&!this.skins.core.state.stopped)await this.start();return this.status();}finally{this.skinDownloads.resume();}}
  async refreshLicense(){const value=await this.entitlement.refresh(true);if(!value.active)await this.stop();return this.status();}
  async deactivate(){await this.skinDownloads.cancelAll();try{await this.entitlement.deactivate();await this.skins.core.stop();await this.stop();return this.status();}finally{this.skinDownloads.resume();}}
  async installLauncher(){this.entitlement.require();this.integration.record(this.dshVersion);if(!this.settings().launcherEnabled)await this.configure({launcherEnabled:true});await this.integration.install(await this.executable());return this.status();}
  async removeLauncher(){await this.configure({launcherEnabled:false});await this.integration.remove();return this.status();}
  async revealLauncher(){if(!this.integration.status().installed)throw new Error('LAUNCHER_NOT_FOUND');await execute('/usr/bin/open',['-R',this.integration.appPath]);return this.status();}
  async installSkin(){
    this.entitlement.require();if(!(await this.nativeStatus()).running)await this.start({skinStandby:true});
    const chosen=await this.request('/skin/library/choose',{},300000);
    if(chosen.canceled)return {...await this.status(),skinImport:{canceled:true}};
    const imported=await this.skins.install(chosen.file);
    return {...await this.status(),skinImport:{...imported,filename:chosen.file.split('/').pop()}};
  }
  async refreshSkinCatalog(query){await this.entitlement.refreshSkinCatalog(query);return this.status();}
  async downloadSkin(value){
    const licenseId=this.entitlement.require().licenseId;
    if(value?.licenseId&&value.licenseId!==licenseId)throw new Error('SKIN_DOWNLOAD_LICENSE_CHANGED');
    const {file,entry}=await this.entitlement.downloadSkin({releaseId:value?.releaseId,dshVersion:this.dshVersion,signal:value?.signal,onProgress:value?.onProgress});
    try{value?.signal?.throwIfAborted();if(this.entitlement.require().licenseId!==licenseId)throw new Error('SKIN_DOWNLOAD_LICENSE_CHANGED');if(this.disposed)throw new Error('PLUGIN_DISPOSED');const imported=await this.skins.install(file,{expected:entry});return {...await this.status(),skinImport:imported};}
    finally{rmSync(file,{force:true});}
  }
  async checkUpdate(){const update=await this.entitlement.latest({dshVersion:this.dshVersion,build:this.build});writeJson(join(this.stateDir,'update.json'),{...update,checkedAt:Date.now()});return this.status();}
  async downloadUpdate(){await this.entitlement.download({dshVersion:this.dshVersion,build:this.build});return this.status();}
  async revealDownload(){
    const value=readJson(join(this.stateDir,'download.json'),null);
    if(!value||!existsSync(value.file))throw new Error('DOWNLOAD_NOT_FOUND');
    if(process.platform==='win32'){
      const explorer=join(process.env.SystemRoot||process.env.WINDIR||'C:\\Windows','explorer.exe');
      await new Promise((resolve,reject)=>{
        const child=spawn(explorer,[dirname(value.file)],{stdio:'ignore',detached:true});
        child.once('error',reject);
        child.once('spawn',()=>{child.unref();resolve();});
      });
    }else await execute('/usr/bin/open',['-R',value.file]);
    return this.status();
  }
  async stop(){
    this.interactions?.cancel();
    const bridge=this.credentials();if(bridge){try{await this.request('/shutdown',{},12000);}catch{}}
    for(let i=0;i<30&&bridge&&alive(bridge.pid);i++)await delay(100);
    if(this.child&&this.child.exitCode===null)this.child.kill('SIGTERM');this.phase='stopped';return this.status();
  }
  async dispose(){this.disposed=true;clearInterval(this.heartbeat);await this.skinDownloads.dispose();await this.skins.dispose();await this.stop();if(!profileGate(this.profileDir).enabled)await this.integration.remove();}
}
