import {fail} from '../skin-core/src/schema.mjs';
const decisionInterval=60_000,decisionTimeout=8_000;
const states=new Set(['idle','running','attention','completed']);
const uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
// The existing Page mailbox owns this producer. No Agent-wide event subscription.
export class WorkFeedback {
  constructor(skins,{now=Date.now}={}){
    Object.assign(this,{skins,now});
    this.revision=0;this.accepted=null;this.receipt=null;this.seen=new Set();this.echo=false;
    this.lastDecisionAt=-Infinity;
  }
  supported(settings){
    const theme=settings.theme?.values,pet=settings.pet?.values;
    return !!(typeof theme?.workFeedbackEnabled==='boolean'&&typeof theme.petEchoEnabled==='boolean'&&
      (this.skins.controller.replyStyle?.petPersona()||pet?.persona)&&pet.animations?.idle&&pet.animations.react&&pet.actionDescriptions?.react);
  }
  enabled(){
    const {state}=this.skins.core;
    return state.overrides[state.selected?.manifest.id]?.theme?.smartWorkEcho===true;
  }
  status(settings){
    if(!this.supported(settings))return null;
    const id=this.skins.core.state.selected?.manifest.id;
    return {enabled:this.enabled(),pending:!!this.decision,last:this.lastChoice?.skinId===id?this.lastChoice.result:null};
  }
  async configure({contentKey,enabled}){
    const {controller,core}=this.skins;
    if(typeof enabled!=='boolean')fail('SKIN_SETTING_UNSUPPORTED');
    await core.queue(()=>{
      controller.entitlement.require();
      const selected=core.state.selected;
      if(!selected||selected.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      if(!this.supported(core.view()))fail('SKIN_SETTING_UNSUPPORTED');
      const next=structuredClone(core.state);
      const theme=(next.overrides[selected.manifest.id]??={}).theme??={};
      theme.smartWorkEcho=enabled;
      core.store.write(next);core.state=next;
      this.cancelDecision();this.lastChoice=null;
    });
    return controller.status();
  }
  cancelDecision(){
    const decision=this.decision;
    this.decision=null;
    decision?.abort();
  }
  allowed(config=this.skins.core.view()){
    return !this.skins.controller.focus?.quiet&&config.theme?.status==='enabled'&&config.theme.values.workFeedbackEnabled&&config.theme.values.petEchoEnabled&&
      config.pet?.status==='enabled'&&this.skins.core.state.results.pet?.status==='ready'&&config.pet.values.allowActions&&
      config.pet.values.animations?.idle&&config.pet.values.animations?.react&&config.pet.values.actionDescriptions?.react;
  }
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
    if(Object.keys(w).some(k=>!['generation','contentKey','revision','bindingId','sessionId','seq','state','reducedMotion','observing'].includes(k))||
      !Number.isSafeInteger(w.revision)||w.revision<1||!uuid(w.bindingId)||
      !(w.sessionId===null||typeof w.sessionId==='string'&&w.sessionId.length>0&&w.sessionId.length<=200&&!/[\x00-\x1f]/.test(w.sessionId))||
      !Number.isSafeInteger(w.seq)||w.seq< -1||!states.has(w.state)||typeof w.reducedMotion!=='boolean'||w.observing!==undefined&&typeof w.observing!=='boolean'||
      w.state==='completed'&&(w.sessionId===null||w.seq<0))fail('SKIN_WORK_INVALID');
    if(this.accepted?.clientId===input.clientId&&this.accepted.generation===w.generation&&w.revision<=this.accepted.revision)return this.accepted.revision;
    const config=core.view();if(typeof config.theme?.values?.workFeedbackEnabled!=='boolean')return null;
    const previous=this.accepted,packet={...w,observedState:w.observing===false?(previous?.observedState??previous?.state??'idle'):w.state,clientId:input.clientId,nativeRevision:++this.revision};
    this.skins.activities?.cancel();
    this.cancelDecision();this.accepted=packet;
    const key=w.contentKey+':'+w.sessionId+':'+w.seq;
    let state='idle';
    if(this.allowed(config)&&!w.reducedMotion){
      state=w.state;
      if(state==='completed'){
        if(this.seen.has(key))return w.revision;
        this.seen.add(key);
        if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
      }
    }
    if(state==='completed'&&this.enabled()){
      if(this.now()-this.lastDecisionAt>=decisionInterval)void this.decide(packet,previous?.sessionId===packet.sessionId?previous.state:'idle');
      return w.revision;
    }
    if(state==='completed')this.echo=true;
    void this.deliver(packet,state).catch(()=>{});
    return w.revision;
  }
  async decide(packet,previousState){
    const {controller,core}=this.skins,interaction=controller.interactions;
    if(!interaction||interaction.pending||!controller.credentials?.())return;
    const abort=new AbortController();this.decision=abort;
    const skinId=core.state.selected.manifest.id;
    const current=()=>this.decision===abort&&this.accepted===packet&&this.ready(packet)&&this.enabled()&&this.allowed();
    const timer=setTimeout(()=>abort.abort(),decisionTimeout);
    try{
      controller.entitlement.require();
      const live=await controller.nativeStatus();
      if(!current()||abort.signal.aborted||!live.workReactionAvailable||interaction.pending)return;
      this.lastDecisionAt=this.now();
      const action=await interaction.chooseWorkReaction({
        previousState,lastResult:this.lastChoice?.skinId===skinId?this.lastChoice.result:null,signal:abort.signal,
      });
      if(!current()||abort.signal.aborted||interaction.pending)return;
      let result='quiet';
      if(action==='react'){
        this.echo=true;
        const receipt=await this.deliver(packet,'completed');
        if(receipt?.action==='react')result='reacted';
      }
      if(current())this.lastChoice={skinId,result};
    }catch{
      if(current())this.lastChoice={skinId,result:'unavailable'};
    }finally{
      clearTimeout(timer);
      if(this.decision===abort)this.decision=null;
    }
  }
  async deliver(packet,state){
    if(this.accepted!==packet||!this.ready(packet))return;
    const controller=this.skins.controller;if(!controller.credentials?.())return;
    const result=await controller.request('/skin/work',{generation:packet.generation,contentKey:packet.contentKey,revision:packet.nativeRevision,
      sessionId:packet.sessionId,bindingId:packet.bindingId,seq:packet.seq,state});
    if(this.accepted===packet){
      this.receipt=result;this.echo=result?.action==='react';
      if(this.echo&&this.ready(packet))controller.interactions?.memory?.remember(packet,{source:'work',actual:{action:'react',speech:''}});
    }
    return result;
  }
  cancel(){
    this.cancelDecision();
    if(!this.echo||!this.accepted)return;
    const packet={...this.accepted,nativeRevision:++this.revision};this.accepted=packet;this.echo=false;
    // A stop/transaction invalidates Native first; this is only for a live Page
    // ownership or action-permission change in the same committed generation.
    void this.deliver(packet,'idle').catch(()=>{});
  }
  maintain(){
    if(this.decision&&(!this.ready(this.accepted)||!this.enabled()||!this.allowed()))this.cancelDecision();
    if(!this.echo||!this.accepted)return;
    let allowed=false;try{const c=this.skins.core.view();allowed=this.ready(this.accepted)&&c.theme?.status==='enabled'&&c.theme.values.workFeedbackEnabled&&c.theme.values.petEchoEnabled&&c.pet?.status==='enabled'&&c.pet.values.allowActions;}catch{}
    if(!allowed){
      const controller=this.skins.controller,p=this.accepted;this.echo=false;
      if(controller.credentials?.())void controller.request('/skin/work',{generation:p.generation,contentKey:p.contentKey,revision:++this.revision,sessionId:p.sessionId,bindingId:p.bindingId,seq:p.seq,state:'idle'}).catch(()=>{});
    }
  }
}
