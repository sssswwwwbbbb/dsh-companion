import {supportsSkinHost} from './skin-core/src/host-compatibility.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {validateManifest,resolveSettings,fail} from './skin-core/src/schema.mjs';
import {loadSkin,prepareResources,materializeResources,readAsset,digest} from './skin-core/src/resources.mjs';
import {stopRequests} from './skin-core/src/state.mjs';

// Registration is independent of the pet renderer and never starts playback.
export class NativeStartupRuntime {
  constructor({stateDir,dshVersion,onCancel=()=>{}}){
    Object.assign(this,{stateDir,dshVersion,onCancel});this.generation=0;this.declared=false;this.descriptor=null;this.resources={};this.stopRequested=false;
    this.loadBoot();
  }
  status(){return {protocolVersion:1,generation:this.generation,declared:this.declared,ready:!!this.descriptor&&!this.stopRequested,contentKey:this.descriptor?.contentKey||null,workspaceHandoff:!!this.descriptor?.handoffSeconds,stopRequested:this.stopRequested,errorCode:this.errorCode||null};}
  loadBoot(){
    try{
      const state=JSON.parse(fs.readFileSync(path.join(this.stateDir,'skin-state.json'),'utf8'));
      this.generation=Number.isSafeInteger(state.generation)?state.generation:0;this.declared=!!state.selected?.manifest.modules?.startup;
      this.stopRequested=state.stopped===true||stopRequests(this.stateDir).length>0;
      if(!this.declared)return;
      if(this.stopRequested||state.pending||state.disabled?.startup||state.results?.startup?.status!=='ready')return;
      const contentKey=state.selected.contentKey;
      const skin=loadSkin(path.join(this.stateDir,'skin-packages',contentKey));
      if(skin.contentKey!==contentKey||digest(JSON.stringify(state.selected.manifest))!==contentKey)fail('SKIN_CONTENT_CHANGED');
      const config=resolveSettings(skin.manifest,state,{theme:true,pet:true,startup:true},{strictRequired:false}).startup;
      if(config.status!=='enabled')return;
      const resources=prepareResources(skin),ids=[config.values.poster,config.values.video].filter(Boolean);
      const assets=materializeResources(Object.fromEntries(ids.map(id=>[id,resources[id]])),path.join(this.stateDir,'skin-assets',contentKey));
      this.register({manifest:skin.manifest,config:config.values,contentKey,assets});
    }catch(e){if(e.code!=='ENOENT'){this.declared=true;this.errorCode=e.code||'SKIN_STATE_INVALID';}}
  }
  invalidate(generation){
    if(!Number.isSafeInteger(generation)||generation<1)fail('SKIN_GENERATION_INVALID');
    if(generation<this.generation)fail('SKIN_OPERATION_SUPERSEDED');
    if(generation!==this.generation)this.onCancel('generation-changed');this.generation=generation;
  }
  exit({generation,declared=this.declared}){
    this.invalidate(generation);this.onCancel('module-exit');this.declared=declared===true;this.descriptor=null;this.resources={};this.errorCode=null;return {generation,cleared:true};
  }
  stop(){this.stopRequested=true;this.onCancel('skin-stop');}
  register(operation){
    const manifest=validateManifest(operation.manifest),contentKey=operation.contentKey;
    if(!/^[a-f0-9]{64}$/.test(contentKey||'')||digest(JSON.stringify(manifest))!==contentKey)fail('SKIN_CONTENT_CHANGED');
    if(!supportsSkinHost(manifest,contentKey,this.dshVersion))fail('SKIN_HOST_UNSUPPORTED');
    if(!manifest.modules.startup)fail('SKIN_CONFIG_MISSING','startup');
    const effective=structuredClone(manifest);effective.modules.startup.config=operation.config;effective.modules.startup.settings={};validateManifest(effective);
    const resolved=resolveSettings(effective,{},{startup:true},{strictRequired:false}).startup;
    if(resolved.status!=='enabled')fail('SKIN_CAPABILITY_UNAVAILABLE','startup');
    const config=resolved.values,resources={};
    for(const id of [config.poster,config.video].filter(Boolean)){
      const asset=operation.assets[id],decl=manifest.assets[id];
      if(!asset||asset.sha256!==decl.sha256||asset.path!==asset.sha256||asset.mime!==decl.mime)fail('SKIN_RESOURCE_INVALID');
      resources[id]={data:readAsset(path.join(this.stateDir,'skin-assets',contentKey),{...decl,path:asset.sha256}),mime:asset.mime,sha256:asset.sha256};
    }
    const theme=manifest.modules.theme;
    const tokens=theme?.interfaceVersion===1&&[1,2,3].includes(theme.configVersion)?theme.config.tokens:{};
    const role=theme?.config.workspaceRole;
    this.resources=resources;
    this.descriptor={contentKey,name:manifest.name,...config,tokens,
      ...(role?.name&&role?.model?{roleName:role.name,roleModel:role.model}:{})};
    this.declared=true;this.errorCode=null;
  }
  activate({generation,contentKey}){
    this.invalidate(generation);this.onCancel('content-applied');this.declared=true;
    const file=path.join(this.stateDir,'skin-startup-operations',generation+'.json');
    if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>131072)fail('SKIN_OPERATION_INVALID');
    const operation=JSON.parse(fs.readFileSync(file,'utf8'));
    if(operation.contentKey!==contentKey)fail('SKIN_CONTENT_CHANGED');
    const state=JSON.parse(fs.readFileSync(path.join(this.stateDir,'skin-state.json'),'utf8'));
    const resume=operation.resumeStop===true&&typeof operation.operationId==='string'&&state.generation===generation&&state.pending?.operationId===operation.operationId&&state.pending.contentKey===contentKey;
    if(stopRequests(this.stateDir).length||(this.stopRequested||state.stopped)&&!resume)fail('SKIN_STOP_REQUESTED');
    this.register(operation);this.stopRequested=false;return {ready:true,generation,contentKey};
  }
  canPlay(identity){
    return !!this.descriptor&&!this.stopRequested&&!stopRequests(this.stateDir).length&&(!identity||identity.generation===this.generation&&identity.contentKey===this.descriptor.contentKey);
  }
  playback(){
    if(!this.canPlay())fail('STARTUP_NOT_REGISTERED');
    const d=this.descriptor,prefix='/startup-resource/'+d.contentKey+'/';
    const preferences={};
    if(d.handoffSeconds){
      const state=JSON.parse(fs.readFileSync(path.join(this.stateDir,'skin-state.json'),'utf8'));
      if(state.pending||state.stopped||state.generation!==this.generation||state.selected?.contentKey!==d.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const startup=resolveSettings(state.selected.manifest,state,{startup:true},{strictRequired:false}).startup;
      if(startup?.status!=='enabled')fail('STARTUP_NOT_REGISTERED');
      for(const field of ['soundEnabled','reducedMotion']){
        if(typeof startup.values[field]==='boolean')preferences[field]=startup.values[field];
      }
    }
    return {...d,...preferences,generation:this.generation,poster:prefix+d.poster,video:d.video?prefix+d.video:null,posterSha:this.resources[d.poster].sha256,videoSha:d.video?this.resources[d.video].sha256:null,custom:true};
  }
  resource(url){
    const parts=url.pathname.split('/');if(parts.length!==4||parts[2]!==this.descriptor?.contentKey)return new Response(null,{status:404});
    const a=this.resources[parts[3]];return a?new Response(a.data,{headers:{'Content-Type':a.mime,'Cache-Control':'no-store'}}):new Response(null,{status:404});
  }
}
