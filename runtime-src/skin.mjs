import fs from 'node:fs';
import path from 'node:path';
import {validateManifest,resolveSettings,definitions,fail} from './skin-core/src/schema.mjs';
import {readAsset,digest} from './skin-core/src/resources.mjs';
import {requestStop,stopRequests,StateStore} from './skin-core/src/state.mjs';
import {NativeWorkFeedback} from './work-feedback.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export class NativeSkinRuntime {
  constructor({stateDir,loadPack,apply,hide,isReady,workAction=()=>null}){
    Object.assign(this,{stateDir,loadPack,apply,hide,isReady});this.store=new StateStore(stateDir);this.generation=0;this.visible=false;this.resources={};this.contentKey=null;this.pausedMedia=true;this.localRevision=0;this.stopRequested=stopRequests(stateDir).length>0;
    this.owned=process.env.DSH_COMPANION_SKIN_STANDBY==='1';
    try{const s=JSON.parse(fs.readFileSync(path.join(stateDir,'skin-state.json'),'utf8'));this.owned=!!(s.selected||s.pending||s.stopped);this.stopRequested ||= s.stopped===true;}catch(e){if(e.code!=='ENOENT'){this.owned=true;this.stopRequested=true;}}
    this.owned ||= this.stopRequested;
    this.work=new NativeWorkFeedback({snapshot:()=>this.workSettings(),act:workAction});
  }
  status(){return {protocolVersion:1,generation:this.generation,contentKey:this.contentKey,visible:this.visible,mediaPaused:this.pausedMedia,owned:this.owned,stopRequested:this.stopRequested,workFeedback:this.work.last};}
  canShow(){return this.visible&&!this.pausedMedia&&!this.stopRequested;}
  assertReady(receipt){if(!this.canShow()||receipt.generation!==this.generation||receipt.contentKey!==this.contentKey||receipt.localRevision!==this.localRevision)fail('SKIN_OPERATION_SUPERSEDED');}
  async resize({generation,contentKey,size},applySize){
    const receipt={generation,contentKey,localRevision:this.localRevision};
    const assertCurrent=()=>{
      this.assertReady(receipt);
      if(!this.interactionSettings())fail('SKIN_OPERATION_SUPERSEDED');
    };
    assertCurrent();
    if(!definitions.pet.fields.size.valid(size))fail('SKIN_SETTING_UNSUPPORTED');
    await applySize(size,assertCurrent);assertCurrent();
    return {generation,contentKey,ready:true,size};
  }
  interactionSettings(){
    // Read the committed preferences at the click/delivery boundary, never in
    // the animation loop. Native execution still gates speech and actions.
    if(!this.canShow()||!this.manifest)return null;
    try{
      const state=this.store.read();
      if(state.stopped||state.pending||state.disabled.pet||this.store.hasStops()||
         state.generation!==this.generation||state.selected?.contentKey!==this.contentKey)return null;
      return resolveSettings(this.manifest,state,{pet:true},{strictRequired:false}).pet.values;
    }catch{return null;}
  }
  workSettings(){
    if(!this.canShow()||!this.manifest)return null;
    try{const s=this.store.read();if(s.stopped||s.pending||this.store.hasStops()||s.generation!==this.generation||s.selected?.contentKey!==this.contentKey)return null;
      return {generation:this.generation,contentKey:this.contentKey,...resolveSettings(this.manifest,s,{theme:true,pet:true,startup:true},{strictRequired:false})};
    }catch{return null;}
  }
  async invalidate(generation){if(!Number.isSafeInteger(generation)||generation<1)fail('SKIN_GENERATION_INVALID');if(generation<this.generation)fail('SKIN_OPERATION_SUPERSEDED');this.generation=generation;await this.work.invalidate(generation);}
  async exit(generation){this.localRevision++;this.owned=true;this.visible=false;this.contentKey=null;this.resources={};this.pausedMedia=true;await this.invalidate(generation);await this.hide();return {generation,cleared:true};}
  async activate({generation,contentKey}){
    await this.invalidate(generation);this.owned=true;this.visible=false;await this.hide();
    const revision=++this.localRevision;
    if(!/^[a-f0-9]{64}$/.test(contentKey||''))fail('SKIN_CONTENT_INVALID');
    const file=path.join(this.stateDir,'skin-operations',generation+'.json');
    if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>131072)fail('SKIN_OPERATION_INVALID');
    const operation=JSON.parse(fs.readFileSync(file,'utf8')),manifest=validateManifest(operation.manifest);
    if(digest(JSON.stringify(manifest))!==contentKey||operation.contentKey!==contentKey)fail('SKIN_CONTENT_CHANGED');
    let hostState;try{hostState=JSON.parse(fs.readFileSync(path.join(this.stateDir,'skin-state.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')fail('SKIN_STATE_INVALID');}
    // Only a new explicit Host transaction may release a stop latch. A rollback,
    // automatic restore or unconsumed independent stop can never release it.
    const resume=operation.resumeStop===true&&typeof operation.operationId==='string'&&hostState?.generation===generation&&hostState?.pending?.operationId===operation.operationId&&hostState.pending.contentKey===contentKey;
    const assertCurrent=()=>{
      if(revision!==this.localRevision||generation!==this.generation)fail(this.stopRequested?'SKIN_STOP_REQUESTED':'SKIN_OPERATION_SUPERSEDED');
      if(stopRequests(this.stateDir).length||(this.stopRequested||hostState?.stopped===true)&&!resume)fail('SKIN_STOP_REQUESTED');
    };
    assertCurrent();
    // Revalidate effective values as declarations, not arbitrary native settings.
    const effective=structuredClone(manifest);effective.modules.pet.config=operation.config;effective.modules.pet.settings={};validateManifest(effective);
    const {values:config}=resolveSettings(effective,{overrides:{},disabled:{}},{theme:true,pet:true}).pet;
    const pack=structuredClone(this.loadPack(config.builtinPack));const resources={};
    for(const [id,asset] of Object.entries(operation.assets)){
      if(!manifest.assets[id]||asset.sha256!==manifest.assets[id].sha256||asset.path!==asset.sha256||asset.mime!==manifest.assets[id].mime)fail('SKIN_RESOURCE_INVALID');
      resources[id]={data:readAsset(path.join(this.stateDir,'skin-assets',contentKey),{...manifest.assets[id],path:asset.sha256}),mime:asset.mime};
    }
    if(config.animations){
      pack.animations={};
      for(const [id,a] of Object.entries(config.animations)){if(!resources[a.asset])fail('SKIN_RESOURCE_MISSING');pack.animations[id]={file:'skin-resource/'+contentKey+'/'+a.asset,seconds:a.seconds,loop:a.loop};}
    }
    pack.canvasHeight=config.canvasHeight;pack.canvasOffsetY=config.canvasOffsetY;pack.name=manifest.name;
    assertCurrent();
    this.contentKey=contentKey;this.resources=resources;this.pausedMedia=false;const token='skin-'+generation+'-'+contentKey;
    this.manifest=manifest;await this.apply({pack,config,token,resources,contentKey,generation,assertCurrent});
    for(let i=0;i<150;i++){
      assertCurrent();if(this.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      if(await this.isReady(token)){assertCurrent();this.stopRequested=false;this.stopRequestId=undefined;this.visible=true;return {ready:true,generation,contentKey,localRevision:revision};}await delay(100);
    }
    fail('SKIN_NATIVE_READY_TIMEOUT');
  }
  resource(url){const parts=url.pathname.split('/');if(parts.length!==4||parts[2]!==this.contentKey)return new Response(null,{status:404});const a=this.resources[parts[3]];return a?new Response(a.data,{headers:{'Content-Type':a.mime,'Cache-Control':'no-store'}}):new Response(null,{status:404});}
  async requestStop(){
    void this.work.cancel().catch(()=>{});
    this.localRevision++;this.owned=true;this.stopRequested=true;this.visible=false;this.pausedMedia=true;
    try{if(!this.stopRequestId||!fs.existsSync(path.join(this.stateDir,'skin-stop-requests',this.stopRequestId+'.json')))this.stopRequestId=requestStop(this.stateDir);return this.stopRequestId;}finally{await this.hide({stop:true});}
  }
}
