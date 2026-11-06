import {randomUUID} from 'node:crypto';
import {fail} from '../src/schema.mjs';
export class PageMailbox {
  constructor({timeout=8000,leaseMs=4000}={}){this.timeout=timeout;this.leaseMs=leaseMs;this.generation=0;this.command=null;this.client=null;this.active=false;}
  available(){return this.client&&Date.now()-this.client.seen<2000&&this.client.capable===true;}
  invalidate(generation){this.generation=generation;if(this.pending){this.pending.reject(Object.assign(new Error('SKIN_OPERATION_SUPERSEDED'),{code:'SKIN_OPERATION_SUPERSEDED'}));this.pending=null;}this.command={id:randomUUID(),generation,kind:'invalidate'};}
  poll(input){
    if(!input||!/^[a-f0-9-]{36}$/.test(input.clientId||''))fail('SKIN_PAGE_INVALID');
    if(this.client?.id!==input.clientId){
      if(this.available())return {busy:true,leaseMs:0};
      this.client={id:input.clientId,capable:input.capable===true,seen:Date.now()};this.lastReady=null;this.appliedPayload=null;
    }else this.client.seen=Date.now();
    if(input.ack&&this.pending&&input.ack.id===this.command?.id&&input.ack.generation===this.generation){
      const pending=this.pending;this.pending=null;
      if(input.ack.ok===true){this.active=['apply','update'].includes(this.command.kind);this.lastReady=this.active?{clientId:this.client.id,generation:this.generation,contentKey:this.command.contentKey}:null;this.appliedPayload=this.active?structuredClone(this.command.payload):null;pending.resolve(this.active?{ready:true}:{cleared:true});}
      else pending.reject(Object.assign(new Error('SKIN_PAGE_APPLY_FAILED'),{code:'SKIN_PAGE_APPLY_FAILED'}));
    }
    const command=input.seenCommand===this.command?.id?null:input.verify&&this.command?{id:this.command.id,generation:this.command.generation,kind:this.command.kind}:this.command;
    return {command,leaseMs:this.leaseMs};
  }
  execute(kind,context,payload){
    if(context.generation!==this.generation)fail('SKIN_OPERATION_SUPERSEDED');
    if(!this.available()){
      if(kind==='exit'&&!this.active)return Promise.resolve({cleared:true});
      // A temporarily unavailable Host/page still needs an actual clear ack.
      // Keep an exit in the mailbox for reconnection, bounded by the normal
      // timeout, rather than failing before that page can poll again.
      if(kind!=='exit')fail('SKIN_PAGE_UNAVAILABLE');
    }
    if(this.pending){this.pending.reject(Object.assign(new Error('SKIN_OPERATION_SUPERSEDED'),{code:'SKIN_OPERATION_SUPERSEDED'}));this.pending=null;}
    this.command={id:randomUUID(),generation:context.generation,contentKey:context.contentKey,kind,payload};const command=this.command;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{if(this.pending?.id===command.id)this.pending=null;reject(Object.assign(new Error('SKIN_PAGE_TIMEOUT'),{code:'SKIN_PAGE_TIMEOUT'}));},this.timeout);
      this.pending={id:this.command.id,resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}};
    });
  }
  prepare({config,resources,resumeStop}){
    const image=id=>'data:'+resources[id].mime+';base64,'+resources[id].data.toString('base64');
    const marks=config.entryMarks?{light:image(config.entryMarks.light),dark:image(config.entryMarks.dark)}:null;
    let role=null;
    if(config.workspaceRole){
      const {name,model,...artwork}=config.workspaceRole;
      role=Object.fromEntries(Object.entries(artwork).map(([key,id])=>[key,image(id)]));
      if(name&&model)Object.assign(role,{name,model});
    }
    const workspace=config.workspacePreset?{preset:config.workspacePreset,enabled:config.workspaceDetailsEnabled===true,motion:config.workspaceMotionEnabled===true,petEcho:config.petEchoEnabled===true,opening:config.workspacePreset==='archive-warm-r2'&&resumeStop===true,feedback:config.workFeedbackEnabled===true,icons:Object.fromEntries(Object.entries(config.semanticIcons).map(([name,pair])=>[name,{light:image(pair.light),dark:image(pair.dark)}])),role}:null;
    return {tokens:config.tokens,backgroundOpacity:config.backgroundOpacity,...(workspace?{workspace}:{}),...(config.background?{background:image(config.background)}:{}),
      entryMarks:marks?(config.entryMarkEnabled?marks:null):workspace?.icons.companion||null,
      ...(marks?{entryMarkImages:marks}:{}),
      ...(typeof config.workFeedbackEnabled==='boolean'?{workFeedback:{enabled:config.workFeedbackEnabled,petEcho:config.petEchoEnabled===true}}:{})};
  }
  apply(context,prepared){return this.execute('apply',context,prepared);}
  supportsUpdate(field){return ['backgroundOpacity','entryMarkEnabled','workFeedbackEnabled','petEchoEnabled','workspaceDetailsEnabled','workspaceMotionEnabled'].includes(field);}
  prepareUpdate(context){
    context.assertCurrent();const ready=this.lastReady;
    // Reuse only the successfully acknowledged payload in this live Page lease.
    // A new owner/generation/content or exit requires a full verified apply.
    if(!this.available()||!this.active||!this.appliedPayload||ready?.clientId!==this.client.id||ready.generation!==context.generation||ready.contentKey!==context.contentKey)fail('SKIN_UPDATE_NOT_READY');
    const payload=structuredClone(this.appliedPayload),config=context.config;payload.backgroundOpacity=config.backgroundOpacity;
    if(config.entryMarks)payload.entryMarks=config.entryMarkEnabled?payload.entryMarkImages:null;
    if(typeof config.workFeedbackEnabled==='boolean')payload.workFeedback={enabled:config.workFeedbackEnabled,petEcho:config.petEchoEnabled===true};
    if(payload.workspace){payload.workspace.enabled=config.workspaceDetailsEnabled===true;payload.workspace.motion=config.workspaceMotionEnabled===true;payload.workspace.petEcho=config.petEchoEnabled===true;payload.workspace.opening=false;payload.workspace.feedback=config.workFeedbackEnabled===true;}
    return payload;
  }
  update(context,prepared){context.assertCurrent();return this.execute('update',context,prepared);}
  confirm(context,prepared){
    if(this.available()&&this.lastReady?.clientId===this.client.id&&this.lastReady.generation===context.generation&&this.lastReady.contentKey===context.contentKey)return Promise.resolve({ready:true});
    return this.execute('apply',context,prepared);
  }
  exit(context){return this.execute('exit',context);}
  exitForDisposal(context){
    this.invalidate(context.generation);this.command={id:randomUUID(),generation:context.generation,kind:'exit'};this.appliedPayload=null;
    // Official plugin removal also disposes the client ctx.effect synchronously.
    // There is no remote service left for an acknowledgement. Record this separate
    // boundary; a future restore requires a fresh, capable page handshake.
    return {cleared:false,scopeDisposal:true};
  }
  dispose(){this.invalidate(this.generation+1);}
}
