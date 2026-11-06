import path from 'node:path';
import fs from 'node:fs';
import {atomicJson} from '../src/state.mjs';
import {materializeResources} from '../src/resources.mjs';
import {fail} from '../src/schema.mjs';
const preferences=new Set(['smartEnabled','persona','modelSelection','historyRounds','allowSpeech','allowActions']);
export class NativePetAdapter {
  constructor(controller){this.controller=controller;this.generation=0;}
  available(){return process.platform==='darwin'&&process.arch==='arm64';}
  interactionPreferencesChanged(){this.controller.interactions?.cancel();this.controller.skins?.work?.cancel();}
  supportsUpdate(field){return field==='size'||preferences.has(field);}
  prepareUpdate(context){context.assertCurrent();return null;}
  async update(context){
    context.assertCurrent();
    if(context.field==='size'){
      const {generation,contentKey}=context;
      const result=await this.controller.request('/skin/size',{generation,contentKey,size:context.config.size},17500);
      context.assertCurrent();
      if(!result.ready||result.generation!==generation||result.contentKey!==contentKey||result.size!==context.config.size)fail('SKIN_NATIVE_NOT_READY');
      return result;
    }
    this.interactionPreferencesChanged();return {ready:true};
  }
  invalidate(generation){this.controller.interactions?.cancel();this.generation=generation;if(this.controller.credentials())void this.controller.request('/skin/invalidate',{generation}).catch(()=>{});}
  prepare({skin,resources,config}){
    this.controller.packs.get(config.builtinPack);
    const live=this.controller.credentials();
    // A started legacy runtime must never be mistaken for a protocol-1 executor.
    if(live&&live.skinProtocol!==1)fail('SKIN_NATIVE_UPDATE_REQUIRED');
    const directory=path.join(this.controller.stateDir,'skin-assets',skin.contentKey),assets=materializeResources(resources,directory);
    return {manifest:skin.manifest,config,assets,contentKey:skin.contentKey};
  }
  async apply(context,prepared){
    context.assertCurrent();const dir=path.join(this.controller.stateDir,'skin-operations');
    atomicJson(path.join(dir,context.generation+'.json'),{...prepared,operationId:context.operationId,resumeStop:context.resumeStop===true});
    try{
      await this.controller.start({skinStandby:true});context.assertCurrent();
      const live=await this.controller.request('/status');if(live.skin?.protocolVersion!==1)fail('SKIN_NATIVE_UPDATE_REQUIRED');
      await this.controller.request('/skin/invalidate',{generation:context.generation});context.assertCurrent();
      const result=await this.controller.request('/skin/apply',{generation:context.generation,contentKey:context.contentKey},16000);context.assertCurrent();
      if(result.generation!==context.generation||result.contentKey!==context.contentKey||!result.ready)fail('SKIN_NATIVE_NOT_READY');return result;
    }finally{fs.rmSync(path.join(dir,context.generation+'.json'),{force:true});}
  }
  async exit(context){
    if(!this.controller.credentials())return {cleared:true};
    const result=await this.controller.request('/skin/exit',{generation:context.generation},8000);
    if(result.generation!==context.generation||!result.cleared)fail('SKIN_NATIVE_CLEANUP_FAILED');return result;
  }
}
