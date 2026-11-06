import {fail} from '../skin-core/src/schema.mjs';
const states=new Set(['idle','running','attention','completed']);
const uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
// The existing Page mailbox owns this producer. No Agent-wide event subscription.
export class WorkFeedback {
  constructor(skins){this.skins=skins;this.revision=0;this.accepted=null;this.receipt=null;this.seen=new Set();this.echo=false;}
  ready(input){
    const {core,page}=this.skins,selected=core.state.selected,ready=page.lastReady;
    return !core.disposed&&['ready','updating'].includes(core.phase)&&!core.state.stopped&&!core.state.pending&&!core.pendingSelections&&!core.store.hasStops()&&
      page.available()&&page.active&&page.client?.id===input.clientId&&ready?.clientId===input.clientId&&
      ready.generation===core.generation&&ready.contentKey===selected?.contentKey&&
      (input.generation===undefined||input.generation===core.generation&&input.contentKey===selected?.contentKey);
  }
  accept(input,result){
    if(!input.work||result.busy||!this.ready(input))return null;
    const w=input.work,{core}=this.skins;
    if(w.generation!==core.generation||w.contentKey!==core.state.selected.contentKey)return null;
    if(Object.keys(w).some(k=>!['generation','contentKey','revision','bindingId','sessionId','seq','state','reducedMotion'].includes(k))||
      !Number.isSafeInteger(w.revision)||w.revision<1||!uuid(w.bindingId)||
      !(w.sessionId===null||typeof w.sessionId==='string'&&w.sessionId.length>0&&w.sessionId.length<=200&&!/[\x00-\x1f]/.test(w.sessionId))||
      !Number.isSafeInteger(w.seq)||w.seq< -1||!states.has(w.state)||typeof w.reducedMotion!=='boolean'||
      w.state==='completed'&&(w.sessionId===null||w.seq<0))fail('SKIN_WORK_INVALID');
    if(this.accepted?.clientId===input.clientId&&this.accepted.generation===w.generation&&w.revision<=this.accepted.revision)return this.accepted.revision;
    const config=core.view();if(typeof config.theme?.values?.workFeedbackEnabled!=='boolean')return null;
    const packet={...w,clientId:input.clientId,nativeRevision:++this.revision};this.accepted=packet;
    const allowed=config.theme.status==='enabled'&&config.theme.values.workFeedbackEnabled&&config.theme.values.petEchoEnabled&&
      config.pet?.status==='enabled'&&core.state.results.pet?.status==='ready'&&config.pet.values.allowActions&&
      config.pet.values.animations?.idle&&config.pet.values.animations?.react&&config.pet.values.actionDescriptions?.react;
    const key=w.contentKey+':'+w.sessionId+':'+w.seq;
    let state='idle';
    if(allowed&&!w.reducedMotion){
      state=w.state;
      if(state==='completed'){
        if(this.seen.has(key))return w.revision;
        else {this.seen.add(key);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);}
      }
    }
    if(state==='completed')this.echo=true;
    void this.deliver(packet,state).catch(()=>{});
    return w.revision;
  }
  async deliver(packet,state){
    if(this.accepted!==packet||!this.ready(packet))return;
    const controller=this.skins.controller;if(!controller.credentials?.())return;
    const result=await controller.request('/skin/work',{generation:packet.generation,contentKey:packet.contentKey,revision:packet.nativeRevision,
      sessionId:packet.sessionId,bindingId:packet.bindingId,seq:packet.seq,state});
    if(this.accepted===packet){this.receipt=result;if(state!=='completed')this.echo=false;}
  }
  cancel(){
    if(!this.echo||!this.accepted)return;
    const packet={...this.accepted,nativeRevision:++this.revision};this.accepted=packet;this.echo=false;
    // A stop/transaction invalidates Native first; this is only for a live Page
    // ownership or action-permission change in the same committed generation.
    void this.deliver(packet,'idle').catch(()=>{});
  }
  maintain(){
    if(!this.echo||!this.accepted)return;
    let allowed=false;try{const c=this.skins.core.view();allowed=this.ready(this.accepted)&&c.theme?.status==='enabled'&&c.theme.values.workFeedbackEnabled&&c.theme.values.petEchoEnabled&&c.pet?.status==='enabled'&&c.pet.values.allowActions;}catch{}
    if(!allowed){
      const controller=this.skins.controller,p=this.accepted;this.echo=false;
      if(controller.credentials?.())void controller.request('/skin/work',{generation:p.generation,contentKey:p.contentKey,revision:++this.revision,sessionId:p.sessionId,bindingId:p.bindingId,seq:p.seq,state:'idle'}).catch(()=>{});
    }
  }
}
