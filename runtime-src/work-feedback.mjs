const fail=code=>{throw Object.assign(new Error(code),{code});};
// Same Session/revision/permission contract; action acknowledgement is awaitable.
export class NativeWorkFeedback {
 constructor({snapshot,act}){this.snapshot=snapshot;this.act=act;this.revision=0;this.generation=0;this.active=false;this.seen=new Set();this.reactions=0;this.last=null;}
 async cancel(){const active=this.active;this.active=false;if(active)await this.act('idle');}
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
   action=await this.act('react',current);current();this.seen.add(key);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);this.active=action==='react';if(this.active)this.reactions++;
  }else if(this.active||enabled&&input.state!=='completed'){action=await this.act('idle',current);current();this.active=false;}
  this.last={state:input.state,action,generation:input.generation,contentKey:input.contentKey,revision:this.revision,sessionId:input.sessionId,seq:input.seq,reactions:this.reactions};return this.last;
 }
}
