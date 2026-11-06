import {supportsSkinHost} from './host-compatibility.mjs';
import {randomUUID} from 'node:crypto';
import {clone,fail,definitions,resolveSettings} from './schema.mjs';
import {prepareResources} from './resources.mjs';
export async function bounded(promise,ms,code='SKIN_STAGE_TIMEOUT') {
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error(code),{code})),ms);})]);}finally{clearTimeout(timer);}
}
const errorInfo=e=>({code:e.code||(/^[A-Z_]+$/.test(e.message||'')?e.message:'SKIN_EXECUTION_FAILED'),...(e.field?{field:e.field}:{})});
export class SkinCoordinator {
  constructor({store,adapters,dshVersion,authorize=()=>{},timeout=20000}){
    this.store=store;this.adapters=adapters;this.dshVersion=dshVersion;this.authorize=authorize;this.timeout=timeout;
    this.state=store.read();store.consumeStops(this.state);this.generation=this.state.generation;this.requestSeq=0;this.pendingSelections=0;this.pendingUpdates=0;this.tail=Promise.resolve();this.phase=this.state.stopped?'stopped':'idle';this.disposed=false;
  }
  available(){return Object.fromEntries(Object.entries(this.adapters).map(([k,a])=>[k,a.available()]));}
  status(){return {...clone(this.state),phase:this.phase,selected:this.state.selected?{id:this.state.selected.manifest.id,name:this.state.selected.manifest.name,version:this.state.selected.manifest.version,contentKey:this.state.selected.contentKey}:null};}
  view(skin=this.state.selected){if(!skin)return {};const result=resolveSettings(skin.manifest,this.state,this.available(),{strictRequired:false});
    for(const [key,value] of Object.entries(result))if(value.status==='enabled'&&this.state.results?.[key]?.status==='unavailable')Object.assign(value,this.state.results[key]);return result;}
  next(){const generation=++this.generation;this.state.generation=generation;this.store.write(this.state);for(const a of Object.values(this.adapters))a.invalidate(generation);return generation;}
  context(generation,skin){return {generation,operationId:randomUUID(),contentKey:skin?.contentKey||null,skin,assertCurrent:()=>{if(generation!==this.generation||this.disposed)fail('SKIN_OPERATION_SUPERSEDED');if(this.store.hasStops())fail('SKIN_STOP_REQUESTED');}};}
  queue(operation){const task=this.tail.catch(()=>{}).then(operation);this.tail=task.catch(()=>{});return task;}
  select(skin,{active=true,mutate}={}){
    if(this.disposed)return Promise.reject(new Error('SKIN_DISPOSED'));
    // Persist and enqueue suppression before a later explicit recovery. Do not
    // await our own queue: the new selection follows the stop in request order.
    if(this.store.consumeStops(this.state,{recoverPending:false}))void this.stop().catch(()=>{});
    const request=++this.requestSeq;
    this.pendingSelections++;
    const selection=this.queue(async()=>{
      if(request!==this.requestSeq)fail('SKIN_OPERATION_SUPERSEDED');
      let generation=this.next();
      let context={...this.context(generation,skin),resumeStop:active};this.authorize();
      const candidate=clone(this.state);mutate?.(candidate,skin);
      if(!active&&this.state.stopped){if(mutate){resolveSettings(skin.manifest,candidate,this.available(),{strictRequired:false});this.store.write(candidate);this.state=candidate;}return this.status();}
      const previous=clone(this.state.selected);let destructive=false;
      this.phase='preparing';
      try{
        context.assertCurrent();
        if(!supportsSkinHost(skin.manifest,skin.contentKey,this.dshVersion))fail('SKIN_HOST_UNSUPPORTED');
        const config=resolveSettings(skin.manifest,candidate,this.available()),resources=prepareResources(skin),prepared={};
        for(const [key,value] of Object.entries(config))if(value.status==='enabled'){
          try{prepared[key]=await bounded(Promise.resolve(this.adapters[key].prepare({...context,config:value.values,resources})),this.timeout);}
          catch(e){if(skin.manifest.modules[key].required)throw e;config[key]={...value,status:'unavailable',reason:errorInfo(e).code};}
          context.assertCurrent();
        }
        this.state.pending={operationId:context.operationId,contentKey:skin.contentKey};this.store.write(this.state);
        destructive=true;this.phase='exiting';await this.clear(context);context.assertCurrent();this.phase='applying';
        for(const [key,p] of Object.entries(prepared)){
          try{const receipt=await bounded(this.adapters[key].apply({...context,config:config[key].values,resources},p),this.timeout);context.assertCurrent();if(receipt?.ready!==true)fail('SKIN_NOT_READY',key);config[key].status='ready';}
          catch(e){if(skin.manifest.modules[key].required)throw e;const receipt=await bounded(this.adapters[key].exit(context),this.timeout);if(!receipt?.cleared)throw e;config[key].status='unavailable';config[key].reason=errorInfo(e).code;}
        }
        // A page may have reconnected after its apply acknowledgement while a
        // native module was still loading. Confirm the current page, not A's
        // last committed snapshot, before committing B.
        for(const [key,p] of Object.entries(prepared))if(config[key].status==='ready'&&this.adapters[key].confirm){
          try{const receipt=await bounded(this.adapters[key].confirm({...context,config:config[key].values,resources},p),this.timeout);context.assertCurrent();if(!receipt?.ready)fail('SKIN_NOT_READY',key);}
          catch(e){if(skin.manifest.modules[key].required)throw e;const receipt=await bounded(this.adapters[key].exit(context),this.timeout);if(!receipt?.cleared)throw e;config[key].status='unavailable';config[key].reason=errorInfo(e).code;}
        }
        context.assertCurrent();candidate.selected=clone(skin);candidate.pending=null;candidate.generation=generation;candidate.stopped=false;candidate.suspension=null;candidate.error=null;candidate.results=Object.fromEntries(Object.entries(config).map(([k,v])=>[k,{status:v.status,reason:v.reason}]));
        this.store.write(candidate);this.state=candidate;this.phase='ready';return this.status();
      }catch(error){
        if(generation!==this.generation){this.phase='cancelled';throw error;}
        const independentStop=this.store.consumeStops(this.state,{recoverPending:false});
        if(independentStop||errorInfo(error).code==='SKIN_STOP_REQUESTED'){
          // Native stop wins over this request and its rollback, even when the
          // periodic Host heartbeat has not consumed the request yet.
          this.requestSeq++;this.state.stopped=true;this.store.write(this.state);
          generation=this.next();context=this.context(generation);
          await this.finishStop(context);throw error;
        }
        if(!destructive){this.phase=this.state.stopped?'stopped':this.state.selected?'ready':'idle';throw error;}
        // Fence timed-out work before cleanup/rollback: a late apply must not pass its old guard.
        generation=this.next();context=this.context(generation,previous);
        try{
          await this.clear(context);context.assertCurrent();
          if(previous&&!this.state.stopped){
            const oldConfig=resolveSettings(previous.manifest,this.state,this.available()),resources=prepareResources(previous);
            const oldContext={...context,skin:previous,contentKey:previous.contentKey,operationId:randomUUID()};
            for(const [key,value] of Object.entries(oldConfig))if(value.status==='enabled'){
              const c={...oldContext,config:value.values,resources};const p=await bounded(Promise.resolve(this.adapters[key].prepare(c)),this.timeout);const receipt=await bounded(this.adapters[key].apply(c,p),this.timeout);context.assertCurrent();if(!receipt?.ready)fail('SKIN_ROLLBACK_FAILED');
            }
          }
          this.state.pending=null;this.state.error=errorInfo(error);this.store.write(this.state);this.phase=this.state.stopped?'stopped':previous?'ready':'idle';
        }catch(cleanup){
          if(generation===this.generation){this.state.stopped=true;this.state.error={code:'SKIN_RECOVERY_REQUIRED',cause:errorInfo(error).code,cleanup:errorInfo(cleanup).code};this.store.write(this.state);this.phase='fault';await this.clear(context).catch(()=>{});}
        }
        throw error;
      }
    });
    return selection.finally(()=>{this.pendingSelections--;});
  }
  async clear(context){
    const results=await Promise.allSettled(Object.values(this.adapters).map(a=>bounded(Promise.resolve(a.exit(context)),this.timeout)));
    if(results.some(r=>r.status!=='fulfilled'||r.value?.cleared!==true))fail('SKIN_CLEANUP_UNCONFIRMED');
  }
  update({module,field,value,contentKey}){
    const skin=this.state.selected;if(!skin)fail('SKIN_NOT_SELECTED');
    if(this.disposed)fail('SKIN_DISPOSED');
    if(contentKey!==undefined&&contentKey!==skin.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    if(!Object.hasOwn(skin.manifest.modules[module]?.settings||{},field)||!definitions[module]?.fields[field]?.valid(value))fail('SKIN_SETTING_UNSUPPORTED');
    const setOverride=state=>{
      const overrides=state.overrides[skin.manifest.id]??={};
      (overrides[module]??={})[field]=value;
    };
    if(this.store.consumeStops(this.state,{recoverPending:false}))void this.stop().catch(()=>{});
    const adapter=this.adapters[module];
    if(!this.state.stopped&&!this.state.disabled[module]&&!adapter?.supportsUpdate?.(field))return this.select(skin,{active:false,mutate:setOverride});
    const request=this.requestSeq;this.pendingUpdates++;
    return this.queue(async()=>{
      if(request!==this.requestSeq||skin.contentKey!==this.state.selected?.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      this.authorize();const candidate=clone(this.state);setOverride(candidate);
      const config=resolveSettings(skin.manifest,candidate,this.available(),{strictRequired:false});
      // A disabled module or stopped skin only saves its preference. No generation,
      // resource read, renderer lifecycle or Native invalidation is involved.
      if(this.state.stopped||this.state.disabled[module]){this.store.write(candidate);this.state=candidate;return this.status();}
      if(this.phase!=='ready'||this.state.pending||this.pendingSelections||this.state.results[module]?.status!=='ready')fail('SKIN_UPDATE_NOT_READY');
      const generation=this.generation,base=this.context(generation,skin),previous=resolveSettings(skin.manifest,this.state,this.available(),{strictRequired:false})[module].values;
      const context={...base,field,config:config[module].values,assertCurrent:()=>{base.assertCurrent();if(request!==this.requestSeq||this.state.selected?.contentKey!==skin.contentKey)fail('SKIN_OPERATION_SUPERSEDED');}};
      // The module owns which settings can be changed in place and how already
      // presented resources remain valid. A new selection always uses prepareResources.
      context.assertCurrent();const prepared=adapter.prepareUpdate(context);context.assertCurrent();
      this.phase='updating';
      try{
        const receipt=await bounded(Promise.resolve(adapter.update(context,prepared)),this.timeout);context.assertCurrent();
        if(receipt?.ready!==true)fail('SKIN_NOT_READY',module);
        candidate.error=null;this.store.write(candidate);this.state=candidate;this.phase='ready';return this.status();
      }catch(error){
        if(generation!==this.generation)throw error;
        if(this.store.consumeStops(this.state,{recoverPending:false})||errorInfo(error).code==='SKIN_STOP_REQUESTED'){
          this.requestSeq++;this.state.stopped=true;this.store.write(this.state);const next=this.next();await this.finishStop(this.context(next));throw error;
        }
        // Roll back only this module. A newer selection is queued behind this
        // cleanup; a stop has already fenced it with a new generation above.
        const rollback={...base,operationId:randomUUID(),field,config:previous};
        try{
          rollback.assertCurrent();const old=adapter.prepareUpdate(rollback);
          const receipt=await bounded(Promise.resolve(adapter.update(rollback,old)),this.timeout);rollback.assertCurrent();
          if(receipt?.ready!==true)fail('SKIN_ROLLBACK_FAILED',module);
          this.state.error=errorInfo(error);this.store.write(this.state);this.phase='ready';
        }catch(cleanup){
          if(generation===this.generation){
            this.state.stopped=true;const next=this.next(),stopping=this.context(next);
            await this.clear(stopping).catch(()=>{});this.state.error={code:'SKIN_RECOVERY_REQUIRED',cause:errorInfo(error).code,cleanup:errorInfo(cleanup).code};this.phase='fault';this.store.write(this.state);
          }
        }
        throw error;
      }
    }).finally(()=>{this.pendingUpdates--;});
  }
  reset(){if(!this.state.selected)fail('SKIN_NOT_SELECTED');return this.select(this.state.selected,{active:false,mutate:s=>{delete s.overrides[this.state.selected.manifest.id];}});}
  disable(module,disabled){
    if(!definitions[module]||typeof disabled!=='boolean')fail('SKIN_SETTING_UNSUPPORTED');
    if(this.state.stopped){this.state.disabled[module]=disabled;this.store.write(this.state);return Promise.resolve(this.status());}
    if(disabled){this.state.disabled[module]=true;this.store.write(this.state);this.requestSeq++;this.next();}
    if(!this.state.selected){const generation=this.generation;return this.queue(async()=>{await this.clear(this.context(generation));this.phase='idle';return this.status();});}
    return this.select(this.state.selected,{active:false,mutate:s=>{s.disabled[module]=disabled;}});
  }
  stop(){
    this.requestSeq++;this.state.stopped=true;this.store.write(this.state);const generation=this.next();
    return this.queue(async()=>{if(generation!==this.generation)return this.status();return this.finishStop(this.context(generation));});
  }
  async finishStop(context){this.phase='stopping';try{await this.clear(context);this.state.pending=null;this.state.error=null;this.phase='stopped';}catch(e){this.state.error=errorInfo(e);this.phase='fault';}this.store.write(this.state);return this.status();}
  restore(){return this.state.selected&&!this.state.stopped&&!this.pendingSelections&&!this.pendingUpdates?this.select(this.state.selected,{active:false}):Promise.resolve(this.status());}
  async dispose(){
    this.requestSeq++;const generation=this.next();
    await this.queue(async()=>{
      const context=this.context(generation),results=await Promise.allSettled(Object.values(this.adapters).map(a=>bounded(Promise.resolve(a.exitForDisposal?a.exitForDisposal(context):a.exit(context)),this.timeout)));
      const unknown=results.some(r=>r.status!=='fulfilled'||(!r.value?.cleared&&!r.value?.scopeDisposal));
      if(unknown){this.state.stopped=true;this.state.error={code:'SKIN_CLEANUP_UNCONFIRMED'};}
      else {this.state.pending=null;this.state.suspension={reason:'PLUGIN_SCOPE_DISPOSAL',pageCleanup:'client effect disposer; no remote acknowledgement',restore:'fresh page handshake required'};}
      this.store.write(this.state);
    });
    this.disposed=true;for(const a of Object.values(this.adapters))await a.dispose?.();
  }
}
