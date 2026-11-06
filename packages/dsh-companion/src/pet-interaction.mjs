// One explicit pet interaction. Animation, physics and skin lifecycle remain with
// their existing owners; this service only selects and records an executed reply.
const copy=value=>structuredClone(value);
const codeOf=error=>/^[A-Z_]+$/.test(error?.code||error?.message||'')?(error.code||error.message):'PET_MODEL_FAILED';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function parsePetDecision(text,capabilities){
  const raw=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value;try{value=JSON.parse(raw);}catch{fail('PET_DECISION_INVALID');}
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(x=>!['speech','action'].includes(x))||!(value.speech===null||typeof value.speech==='string'&&value.speech.length<=120)||!(value.action===null||typeof value.action==='string'&&capabilities.actions.some(x=>x.id===value.action)))fail('PET_DECISION_INVALID');
  return {speech:capabilities.speech?value.speech||'':'',action:value.action};
}
export class PetInteraction {
  constructor(controller,model){this.controller=controller;this.model=model;this.history=new Map();this.sequence=0;this.last=null;}
  cancel(){this.sequence++;this.pending?.abort();this.pending=null;this.controller.skins.work?.cancelDecision();}
  current(){
    const core=this.controller.skins.core,pet=core.view().pet;
    // Module-local updates keep the committed skin live. Pet preference updates
    // still cancel via their adapter; full switches and stops keep their guards.
    if(core.disposed||!['ready','updating'].includes(core.phase)||core.state.stopped||core.pendingSelections||core.store.hasStops()||pet?.status!=='enabled')fail('PET_NOT_AVAILABLE');
    if(!pet.values.persona||!pet.values.actionDescriptions)fail('PET_INTERACTION_NOT_DECLARED');
    return {skinId:core.state.selected.manifest.id,contentKey:core.state.selected.contentKey,generation:core.generation,config:pet.values};
  }
  status(){
    let context;try{context=this.current();}catch(error){return {available:false,reason:codeOf(error),pending:false};}
    return {available:true,smartEnabled:context.config.smartEnabled,pending:!!this.pending,last:this.last?.skinId===context.skinId?this.last:null,historyCount:(this.history.get(context.skinId)||[]).length};
  }
  async models(){return this.model?this.model.models():{current:null,models:[],reason:'PET_MODEL_UNAVAILABLE'};}
  async chooseWorkReaction({previousState,lastResult,signal}){
    const {skinId,config}=this.current();
    if(!this.model)fail('PET_MODEL_UNAVAILABLE');
    const capabilities={speech:false,actions:[{id:'react',description:config.actionDescriptions.react}]};
    const input={persona:config.persona,trigger:'work-completed',scene:{state:'completed',previousState,posture:'idle',lastResult},capabilities};
    const reply=await this.model.complete({selection:config.modelSelection,input,skinId,signal});
    signal.throwIfAborted();
    return parsePetDecision(reply.text,capabilities).action;
  }
  async interact({text='',trigger='input',generation,contentKey}={}){
    if(typeof text!=='string'||text.length>1000||!['input','click'].includes(trigger))fail('PET_INPUT_INVALID');
    if(this.pending)fail('PET_INTERACTION_BUSY');
    const context=this.current();
    if(generation!==undefined&&(generation!==context.generation||contentKey!==context.contentKey))fail('SKIN_OPERATION_SUPERSEDED');
    this.controller.skins.work?.cancelDecision();
    const sequence=++this.sequence,abort=new AbortController();this.pending=abort;
    const assertCurrent=()=>{
      const current=this.current();
      if(abort.signal.aborted||sequence!==this.sequence||current.generation!==context.generation||current.contentKey!==context.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    };
    let timer;
    try{
      this.controller.entitlement.require();
      const live=await this.controller.nativeStatus();assertCurrent();
      const capabilities={speech:context.config.allowSpeech,actions:context.config.allowActions?Object.entries(context.config.actionDescriptions).filter(([id])=>live.availableActions?.includes(id)).map(([id,description])=>({id,description})):[]};
      const recent=this.history.get(context.skinId)||[];
      const input={persona:context.config.persona,trigger,user:text||'用户轻点了你。',recent:context.config.historyRounds?copy(recent.slice(-context.config.historyRounds)):[],capabilities};
      let decision,mode='local',reason=null,route=null;
      const fallback=()=>({speech:capabilities.speech?context.config.localReply:'',action:capabilities.actions.find(x=>x.id==='react')?.id||null});
      if(context.config.smartEnabled){
        try{
          if(!this.model)fail('PET_MODEL_UNAVAILABLE');
          timer=setTimeout(()=>abort.abort(Object.assign(new Error('PET_MODEL_TIMEOUT'),{code:'PET_MODEL_TIMEOUT'})),30000);
          const reply=await this.model.complete({selection:context.config.modelSelection,input,skinId:context.skinId,signal:abort.signal});
          assertCurrent();decision=parsePetDecision(reply.text,capabilities);route=reply.route;mode='model';
        }catch(error){
          // A user stop/switch always wins. A model timeout/failure may use the
          // same local reply only while this exact skin is still active.
          if(sequence!==this.sequence)throw error;
          const current=this.current();if(current.generation!==context.generation||current.contentKey!==context.contentKey)throw error;
          decision=fallback();mode='fallback';reason=codeOf(error);
        }finally{clearTimeout(timer);}
      }else decision=fallback();
      // Abort caused by the model deadline permits local fallback; a skin
      // invalidation changes sequence, and independent native stop is checked
      // again by the existing native latch at the execution boundary.
      if(sequence!==this.sequence)fail('SKIN_OPERATION_SUPERSEDED');
      const current=this.current();if(current.generation!==context.generation||current.contentKey!==context.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const actual=await this.controller.request('/interaction',{generation:context.generation,contentKey:context.contentKey,...decision});
      const round={user:input.user,trigger,mode,reason,route,actual:{speech:actual.speech,action:actual.action},at:Date.now()};
      recent.push(round);this.history.set(context.skinId,recent.slice(-20));
      this.last={skinId:context.skinId,...round};return copy(this.last);
    }finally{clearTimeout(timer);if(this.pending===abort)this.pending=null;}
  }
  async drainNative(){
    if(this.draining||this.pending)return;try{this.current();}catch{return;}
    this.draining=true;
    try{const event=await this.controller.request('/interaction/poll',{});if(event.input)void this.interact(event.input).catch(()=>{});}catch{}finally{this.draining=false;}
  }
}
