import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {StateStore,SkinCoordinator,loadSkin,cacheSkin,fail} from '../skin-core/src/index.mjs';
import {PageMailbox} from '../skin-core/adapters/page-mailbox.mjs';
import {NativePetAdapter} from '../skin-core/adapters/native.mjs';
import {NativeStartupAdapter} from '../skin-core/adapters/startup.mjs';
import {SkinLibrary,unavailableSkin} from './skin-library.mjs';
import {WorkFeedback} from './work-feedback.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export class CompanionSkins {
  constructor(controller,{includeExamples=false}={}){
    this.controller=controller;this.catalog=new Map();this.snapshots=new Map();this.page=new PageMailbox();this.examples=new Set();this.library=new SkinLibrary(controller.stateDir);this.unavailable=[];
    const bundled=path.join(root,'skins');if(fs.existsSync(bundled))for(const name of fs.readdirSync(bundled))if(fs.statSync(path.join(bundled,name)).isDirectory()){
      let skin;try{skin=loadSkin(path.join(bundled,name));this.registerSnapshot(cacheSkin(skin,this.controller.stateDir));}catch(error){this.unavailable.push(unavailableSkin(error,skin?.contentKey,skin));}
    }
    if(includeExamples)for(const name of ['a','b'])this.examples.add(this.registerDirectory(path.join(root,'skin-core/examples',name)).manifest.id);
    for(const skin of this.library.installed())this.registerSnapshot(skin);
    this.unavailable.push(...this.library.unavailable);
    this.core=new SkinCoordinator({store:new StateStore(controller.stateDir),adapters:{theme:this.page,pet:new NativePetAdapter(controller),startup:new NativeStartupAdapter(controller)},dshVersion:controller.dshVersion,authorize:()=>controller.entitlement.require()});
    this.work=new WorkFeedback(this);
  }
  registerSnapshot(skin){this.catalog.set(skin.manifest.id,skin);this.snapshots.set(skin.contentKey,skin);return skin;}
  registerDirectory(dir){return this.registerSnapshot(cacheSkin(loadSkin(dir),this.controller.stateDir));}
  status(){
    let settings={};try{settings=this.core.view();}catch{}
    const unavailable=this.unavailable.filter((row,index,rows)=>!this.snapshots.has(row.contentKey)&&rows.findIndex(other=>other.contentKey===row.contentKey)===index);
    return {...this.core.status(),settings,catalog:[...this.snapshots.values()].map(s=>({id:s.manifest.id,contentKey:s.contentKey,name:s.manifest.name,description:s.manifest.description,version:s.manifest.version,modules:Object.keys(s.manifest.modules),example:this.examples.has(s.manifest.id)})).concat(unavailable)};
  }
  async install(file){this.controller.entitlement.require();const result=this.library.install(file),duplicate=result.duplicate||this.snapshots.has(result.skin.contentKey);this.registerSnapshot(result.skin);this.unavailable=this.unavailable.filter(row=>row.contentKey!==result.skin.contentKey);return {contentKey:result.skin.contentKey,duplicate};}
  async select(value){
    const selected=this.core.state.selected,key=typeof value==='object'&&value?value.contentKey:null;
    if(key&&this.unavailable.some(row=>row.contentKey===key)&&!this.snapshots.has(key))fail('SKIN_INSTALLED_UNAVAILABLE');
    const skin=key?this.snapshots.get(key)||(selected?.contentKey===key?selected:null):this.catalog.get(value)||(selected?.manifest.id===value?selected:null);
    if(!skin)fail('SKIN_NOT_FOUND');
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
  async reset(value={}){this.assertSelection(value.contentKey);await this.core.reset();return this.controller.status();}
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
