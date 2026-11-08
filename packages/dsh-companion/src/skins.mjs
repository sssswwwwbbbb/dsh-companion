import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {StateStore,SkinCoordinator,loadSkin,prepareResources,cacheSkin,readAsset,fail} from '../skin-core/src/index.mjs';
import {PageMailbox} from '../skin-core/adapters/page-mailbox.mjs';
import {NativePetAdapter} from '../skin-core/adapters/native.mjs';
import {NativeStartupAdapter} from '../skin-core/adapters/startup.mjs';
import {supportsSkinHost} from '../skin-core/src/host-compatibility.mjs';
import {SkinLibrary,unavailableSkin} from './skin-library.mjs';
import {WorkFeedback} from './work-feedback.mjs';
import {WorkspaceCues} from './workspace-cues.mjs';
import {PetActivities} from './pet-activities.mjs';
import {WorkspaceScenes} from './workspace-scenes.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export class CompanionSkins {
  constructor(controller,{includeExamples=false,bundledDir=path.join(root,'skins')}={}){
    this.controller=controller;this.catalog=new Map();this.snapshots=new Map();this.page=new PageMailbox();this.examples=new Set();this.library=new SkinLibrary(controller.stateDir);this.unavailable=[];this.removing=new Set();
    const bundled=bundledDir;if(fs.existsSync(bundled))for(const name of fs.readdirSync(bundled))if(fs.statSync(path.join(bundled,name)).isDirectory()){
      let skin;try{skin=loadSkin(path.join(bundled,name));this.registerSnapshot(cacheSkin(skin,this.controller.stateDir));}catch(error){this.unavailable.push(unavailableSkin(error,skin?.contentKey,skin));}
    }
    if(includeExamples)for(const name of ['a','b'])this.examples.add(this.registerDirectory(path.join(root,'skin-core/examples',name)).manifest.id);
    for(const skin of this.library.installed())this.registerSnapshot(skin);
    this.unavailable.push(...this.library.unavailable);
    this.core=new SkinCoordinator({store:new StateStore(controller.stateDir),adapters:{theme:this.page,pet:new NativePetAdapter(controller),startup:new NativeStartupAdapter(controller)},dshVersion:controller.dshVersion,authorize:()=>controller.entitlement.require()});
    // The retired bundled MVP can remain in a profile snapshot. Drop that old
    // selection; deliberate user imports and all other skins keep their state.
    const previous=this.core.state.selected;
    if(previous?.manifest.id==='archive-warm-whale'&&!this.snapshots.has(previous.contentKey)){
      Object.assign(this.core.state,{selected:null,pending:null,stopped:true,results:{},error:null});
      this.core.phase='stopped';this.core.store.write(this.core.state);
    }
    // An upgrade from bundled skins adopts the committed, verified snapshot.
    // Selection and preferences stay intact when the plugin no longer ships it.
    if(previous&&previous.manifest.id!=='archive-warm-whale'&&!this.snapshots.has(previous.contentKey)&&!this.unavailable.some(row=>row.contentKey===previous.contentKey)){
      try{const retained=loadSkin(path.join(controller.stateDir,'skin-packages',previous.contentKey));prepareResources(retained);if(retained.contentKey!==previous.contentKey)fail('SKIN_CACHE_INVALID');this.library.retain(retained);this.registerSnapshot(retained);}catch(error){this.unavailable.push(unavailableSkin(error,previous.contentKey,previous));}
    }
    this.work=new WorkFeedback(this);
    this.activities=new PetActivities(this);
    this.workspaceCues=new WorkspaceCues(this);
    this.workspaceScenes=new WorkspaceScenes(this);
  }
  registerSnapshot(skin){this.catalog.set(skin.manifest.id,skin);this.snapshots.set(skin.contentKey,skin);return skin;}
  registerDirectory(dir){return this.registerSnapshot(cacheSkin(loadSkin(dir),this.controller.stateDir));}
  status(){
    let settings={};try{settings=this.core.view();}catch{}
    const unavailable=this.unavailable.filter((row,index,rows)=>!this.snapshots.has(row.contentKey)&&rows.findIndex(other=>other.contentKey===row.contentKey)===index);
    const catalog=this.controller.entitlement.skinCatalog?.();
    const market=catalog?{...catalog,skins:catalog.skins.map(row=>({...row,compatible:supportsSkinHost({dshVersions:row.supportedDsh},row.contentKey,this.controller.dshVersion)}))}:null;
    return {...this.core.status(),settings,workAutonomy:this.work.status(settings),petActivities:this.activities.status(),workspaceCues:this.workspaceCues.status(),workspaceScenes:this.workspaceScenes.status(),market,catalog:[...this.snapshots.values()].map(s=>({id:s.manifest.id,contentKey:s.contentKey,name:s.manifest.name,description:s.manifest.description,version:s.manifest.version,hasCover:!!s.manifest.cover,modules:Object.keys(s.manifest.modules),example:this.examples.has(s.manifest.id)})).concat(unavailable)};
  }
  cover({contentKey}={}){
    this.controller.entitlement.require();
    const skin=this.snapshots.get(contentKey),coverId=skin?.manifest.cover;
    if(!coverId)return null;
    const asset=skin.manifest.assets[coverId];
    return 'data:'+asset.mime+';base64,'+readAsset(skin.root,asset).toString('base64');
  }
  async install(file,options){this.controller.entitlement.require();const result=this.library.install(file,options),duplicate=result.duplicate||this.snapshots.has(result.skin.contentKey);this.registerSnapshot(result.skin);this.unavailable=this.unavailable.filter(row=>row.contentKey!==result.skin.contentKey);return {contentKey:result.skin.contentKey,duplicate};}
  async remove({contentKey,clearSettings=false}={}){
    if(!/^[a-f0-9]{64}$/.test(contentKey||'')||typeof clearSettings!=='boolean')fail('SKIN_NOT_FOUND');
    if(this.removing.has(contentKey))fail('SKIN_REMOVE_PENDING');
    this.removing.add(contentKey);
    try{return await this.core.queue(async()=>{
      const skin=this.snapshots.get(contentKey),broken=this.unavailable.find(row=>row.contentKey===contentKey);
      if(!skin&&!broken)fail('SKIN_NOT_FOUND');
      const id=skin?.manifest.id||broken?.id;
      if(clearSettings&&id&&[...this.snapshots.values()].some(other=>other.contentKey!==contentKey&&other.manifest.id===id))fail('SKIN_SETTINGS_SHARED');
      if(this.core.state.selected?.contentKey===contentKey){
        this.core.requestSeq++;this.core.state.stopped=true;
        const generation=this.core.next();await this.core.finishStop(this.core.context(generation));
        if(this.core.phase!=='stopped')fail('SKIN_CLEANUP_UNCONFIRMED');
        Object.assign(this.core.state,{selected:null,pending:null,results:{},error:null});this.core.store.write(this.core.state);
      }
      this.library.remove(contentKey);this.snapshots.delete(contentKey);
      this.unavailable=this.unavailable.filter(row=>row.contentKey!==contentKey);
      if(id&&this.catalog.get(id)?.contentKey===contentKey){this.catalog.delete(id);const other=[...this.snapshots.values()].find(row=>row.manifest.id===id);if(other)this.catalog.set(id,other);}
      if(clearSettings&&id){delete this.core.state.overrides[id];this.controller.replyStyle?.forget(id,[contentKey]);this.controller.interactions?.memory?.forget(id);this.core.store.write(this.core.state);}
      return this.controller.status();
    });}finally{this.removing.delete(contentKey);}
  }
  async rollback({id}={}){
    this.controller.entitlement.require();
    const selected=this.core.state.selected;
    const skinId=typeof id==='string'?id:selected?.manifest.id;
    if(!skinId)fail('SKIN_NOT_FOUND');
    const versions=[...this.snapshots.values()].filter(row=>row.manifest.id===skinId).sort((a,b)=>b.manifest.version.localeCompare(a.manifest.version,'en'));
    const index=versions.findIndex(row=>row.contentKey===selected?.contentKey);
    const target=versions[index+1]||versions.find(row=>row.contentKey!==selected?.contentKey);
    if(!target)fail('SKIN_NO_PREVIOUS_VERSION');
    await this.core.select(target);
    return this.controller.status();
  }
  async select(value){
    const selected=this.core.state.selected,key=typeof value==='object'&&value?value.contentKey:null;
    if(key&&this.unavailable.some(row=>row.contentKey===key)&&!this.snapshots.has(key))fail('SKIN_INSTALLED_UNAVAILABLE');
    const skin=key?this.snapshots.get(key)||(selected?.contentKey===key?selected:null):this.catalog.get(value)||(selected?.manifest.id===value?selected:null);
    if(!skin)fail('SKIN_NOT_FOUND');
    if(this.removing.has(skin.contentKey))fail('SKIN_REMOVE_PENDING');
    if(selected?.contentKey===skin.contentKey&&this.core.phase==='ready'&&!this.core.state.stopped&&!this.core.pendingSelections&&!this.core.store.hasStops())return this.controller.status();
    try{await this.core.select(skin);}catch(error){
      // A non-destructive preflight rejection can retain the old backend.
      // Release it only once the coordinator has settled on that identity.
      const state=this.core.state;
      if(this.core.phase==='ready'&&state.selected&&!state.stopped&&!state.pending){
        const live=await this.controller.nativeStatus();
        if(live.startup?.workspaceHandoff&&!live.startup.playing&&(live.backend?.suspended||live.backend?.visibilityHeld)){
          await this.controller.request('/intro/desktop-release',{}).catch(()=>{});
        }
      }
      throw error;
    }
    return this.controller.status();
  }
  async configure(value){await this.core.update(value);this.work.maintain();return this.controller.status();}
  assertSelection(contentKey){if(contentKey!==undefined&&contentKey!==this.core.state.selected?.contentKey)fail('SKIN_OPERATION_SUPERSEDED');}
  async disable({module,disabled,contentKey}){this.assertSelection(contentKey);await this.core.disable(module,disabled);return this.controller.status();}
  async reset(value={}){this.assertSelection(value.contentKey);await this.core.reset();this.controller.interactions?.memory?.forget(this.core.state.selected.manifest.id);return this.controller.status();}
  async stop(){await this.core.stop();return this.controller.status();}
  poll(input){
    // Drain independent stop before offering a reconnecting page an old apply.
    if(this.core.store.consumeStops(this.core.state,{recoverPending:false}))void this.core.stop().catch(()=>{});
    const wasAvailable=this.page.available(),result=this.page.poll(input);
    // Keep recovery attached to this page until the active choice settles.
    // A successful B confirms the new page itself; a preflight failure instead
    // needs to replay whichever skin is still committed, never a captured A.
    if(!wasAvailable&&this.page.available())this.recoveryClient=this.page.client.id;
    if(this.core.state.stopped)this.recoveryClient=null;
    if(this.recoveryClient===this.page.client?.id&&!this.core.pendingSelections&&!this.core.pendingUpdates&&!this.restoring&&this.core.state.selected&&!this.core.state.stopped){
      const ready=this.page.lastReady;
      if(ready?.clientId===this.recoveryClient&&ready.generation===this.core.generation&&ready.contentKey===this.core.state.selected.contentKey)this.recoveryClient=null;
      else {this.restoring=true;void this.restorePage(this.recoveryClient).catch(()=>{}).finally(()=>{this.restoring=false;});}
    }
    const workRevision=this.work.accept(input,result);if(workRevision!==null)result.workRevision=workRevision;
    if(!result.busy&&!input.verify){
      result.workspaceCues=this.workspaceCues.presentation(input.clientId);
      result.workspaceScenes=this.workspaceScenes.presentation(input.clientId);
    }
    return result;
  }
  async restorePage(clientId){
    const generation=this.core.generation,contentKey=this.core.state.selected.contentKey;
    const current=()=>this.recoveryClient===clientId&&this.page.client?.id===clientId&&this.core.generation===generation&&!this.core.state.stopped&&!this.core.pendingSelections&&!this.core.pendingUpdates&&this.core.state.selected?.contentKey===contentKey;
    // A normal page reconnect can wait for the same opening to finish. It must
    // not advance the transaction generation mid-film or start another film.
    // Explicit selections, module changes and stop still fence it immediately.
    let live=await this.controller.nativeStatus();
    const deadline=Date.now()+this.core.timeout;
    while(current()&&live.startup?.playing&&live.startup.contentKey===contentKey&&live.startup.generation===generation&&Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,100));live=await this.controller.nativeStatus();
    }
    if(!current())return;
    await this.core.restore();
  }
  async maintain(){
    this.work.maintain();
    if(this.core.store.consumeStops(this.core.state,{recoverPending:false}))await this.core.stop();
    if(!this.controller.entitlement.status().active&&!this.core.state.stopped&&this.core.state.selected)await this.core.stop();
    if(this.core.phase==='ready'&&!this.core.state.stopped&&this.core.state.results.pet?.status==='ready'){
      const generation=this.core.generation,live=await this.controller.nativeStatus();
      if(generation!==this.core.generation||this.core.phase!=='ready')return;
      if(!live.running||!live.ready||live.skin?.contentKey!==this.core.state.selected.contentKey){
        if(this.core.state.selected.manifest.modules.pet.required){await this.core.stop();this.core.phase='fault';this.core.state.error={code:'SKIN_NATIVE_LOST'};}
        else this.core.state.results.pet={status:'unavailable',reason:'SKIN_NATIVE_LOST'};
        this.core.store.write(this.core.state);
      }
    }
  }
  dispose(){return this.core.dispose();}
}
