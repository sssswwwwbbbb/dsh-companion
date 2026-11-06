import fs from 'node:fs';import path from 'node:path';
import {atomicJson} from '../src/state.mjs';import {materializeResources} from '../src/resources.mjs';import {fail} from '../src/schema.mjs';
export class NativeStartupAdapter {
  constructor(controller){this.controller=controller;}
  available(){return process.platform==='darwin'&&process.arch==='arm64';}
  supportsUpdate(field){return field==='soundEnabled'||field==='reducedMotion';}
  prepareUpdate(context){context.assertCurrent();return null;}
  update(context){
    // The native player reads these preferences from the committed Host state
    // when it starts the next opening.
    context.assertCurrent();
    return {ready:true};
  }
  invalidate(generation){if(this.controller.credentials())void this.controller.request('/skin/startup/invalidate',{generation}).catch(()=>{});}
  prepare({skin,config,resources}){
    const live=this.controller.credentials();if(live&&live.startupProtocol!==1)fail('STARTUP_NATIVE_UPDATE_REQUIRED');
    const ids=[config.poster,config.video].filter(Boolean),selected=Object.fromEntries(ids.map(id=>[id,resources[id]]));
    return {manifest:skin.manifest,config,contentKey:skin.contentKey,assets:materializeResources(selected,path.join(this.controller.stateDir,'skin-assets',skin.contentKey))};
  }
  async apply(context,prepared){
    context.assertCurrent();const file=path.join(this.controller.stateDir,'skin-startup-operations',context.generation+'.json');
    atomicJson(file,{...prepared,operationId:context.operationId,resumeStop:context.resumeStop===true});
    try{
      await this.controller.start({skinStandby:true});context.assertCurrent();
      const result=await this.controller.request('/skin/startup/apply',{generation:context.generation,contentKey:context.contentKey});context.assertCurrent();
      if(result.generation!==context.generation||result.contentKey!==context.contentKey||!result.ready)fail('STARTUP_NOT_REGISTERED');return result;
    }finally{fs.rmSync(file,{force:true});}
  }
  async exit(context){
    if(!this.controller.credentials())return {cleared:true};
    const selected=context.skin||this.controller.skins.core.state.selected;
    const result=await this.controller.request('/skin/startup/exit',{generation:context.generation,declared:!!selected?.manifest.modules.startup});
    if(result.generation!==context.generation||!result.cleared)fail('STARTUP_CLEANUP_FAILED');return result;
  }
}
