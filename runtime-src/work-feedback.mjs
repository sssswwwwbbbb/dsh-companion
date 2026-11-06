const fail=code=>{throw Object.assign(new Error(code),{code});};
// Same Session/revision/permission contract; action acknowledgement is awaitable.
export class NativeWorkFeedback {
 constructor({snapshot,playReaction}){this.snapshot=snapshot;this.playReaction=playReaction;this.revision=0;this.generation=0;this.stopReaction=null;this.seen=new Set();this.reactions=0;this.last=null;}
 async cancel(assertCurrent){
  const stop=this.stopReaction;this.stopReaction=null;
  return stop?await stop(assertCurrent):null;
 }
 async invalidate(generation){if(generation>this.generation){this.generation=generation;this.revision=0;try{await this.cancel();}catch{}}}
 async deliver(input){
  const s=this.snapshot();if(!s||input.generation!==s.generation||input.contentKey!==s.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
  if(!Number.isSafeInteger(input.revision)||input.revision<1||!['idle','running','attention','completed'].includes(input.state)||!Number.isSafeInteger(input.seq)||input.seq< -1||input.state==='completed'&&(typeof input.sessionId!=='string'||input.seq<0))fail('SKIN_WORK_INVALID');
  await this.invalidate(input.generation);if(input.revision<=this.revision)return {ignored:true,revision:this.revision};this.revision=input.revision;
  const current=()=>{const live=this.snapshot();if(!live||live.generation!==input.generation||live.contentKey!==input.contentKey||input.revision!==this.revision)fail('SKIN_OPERATION_SUPERSEDED');};
  const enabled=s.theme?.status==='enabled'&&s.theme.values.workFeedbackEnabled&&s.theme.values.petEchoEnabled&&s.pet?.status==='enabled'&&s.pet.values.allowActions&&s.pet.values.animations?.idle&&s.pet.values.animations?.react&&s.pet.values.actionDescriptions?.react;
  let action=null;const key=input.contentKey+':'+input.sessionId+':'+input.seq;
  if(enabled&&input.state==='completed'&&this.seen.has(key))return {ignored:true,revision:this.revision};
  current();
  if(enabled&&input.state==='completed'){
   const stop=await this.playReaction(current);current();
   this.seen.add(key);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
   if(stop){this.stopReaction=stop;action='react';this.reactions++;}
  }else{action=await this.cancel(current);current();}
  this.last={state:input.state,action,generation:input.generation,contentKey:input.contentKey,revision:this.revision,sessionId:input.sessionId,seq:input.seq,reactions:this.reactions};return this.last;
 }
}
