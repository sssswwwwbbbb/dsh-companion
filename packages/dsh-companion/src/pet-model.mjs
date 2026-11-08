import {randomUUID} from 'node:crypto';
import {BlockAssembler,createUserMessage} from '@deepseek-ai/dsh-llm';
const memoryHint='若提供 memory，按 preference 参考用户互动偏好。recentActions 是过去已确认的动作回执，不代表当前姿态；能力清单和本次要求继续优先。';
const prompt=input=>input.trigger==='idle-activity'?[
  '你是本套桌宠。根据角色、当前工作状态和上次动作，决定做一个当前可用的短动作或保持安静。优先安静，避免重复同一动作。',
  '仅返回 JSON 对象 {"speech":null,"action":null} 或将 action 设为能力清单中的一个 id。speech 必须为 null。',
  memoryHint,JSON.stringify(input),
].join('\n'):input.trigger==='work-completed'?[
  '你是本套桌宠。当前会话已完成，请依据角色与场景决定安静待机或轻回应一次。优先保持安静，特别是刚回应过或刚有待处理事项时。',
  '仅返回 JSON 对象 {"speech":null,"action":null} 或 {"speech":null,"action":"react"}。',
  memoryHint,JSON.stringify(input),
].join('\n'):[

  '你是本套桌宠。结合角色人设、用户输入和最近实际执行结果，选择一个现在可用的动作、一句不超过120字的短话，或保持安静。',
  '只返回JSON：{"speech":"短话或null","action":"能力清单中的id或null"}。不得虚构能力。speech关闭时返回null；不需动作时返回null。',
  'recent.actual记录的是已经执行的结果；用户要求换个动作时参考它。以下是本次桌宠专属情景：',
  memoryHint,JSON.stringify(input),
].join('\n');
export class DshPetModel {
  constructor(ctx){this.ctx=ctx;this.sessions=new Map();}
  async models(){
    const llm=this.ctx.get('llm'),current=this.ctx.get('agentDefaultModel')?.currentSelection()||null;
    if(!llm)return {current,models:[],reason:'PET_MODEL_UNAVAILABLE'};
    const providers=llm.listProviders(),models=[];
    for(const provider of providers)try{for(const model of await llm.listModels(provider.id))models.push({provider:provider.id,model:model.id,label:provider.name+' / '+model.name});}catch{}
    return {current,models,reason:models.length?null:'PET_MODEL_NOT_CONFIGURED'};
  }
  async complete({selection,input,skinId,signal}){
    const llm=this.ctx.get('llm'),store=this.ctx.get('sessions');
    if(!llm||!store)throw Object.assign(new Error('PET_MODEL_UNAVAILABLE'),{code:'PET_MODEL_UNAVAILABLE'});
    const route=selection.mode==='specific'?{provider:selection.provider,model:selection.model}:this.ctx.get('agentDefaultModel')?.currentSelection();
    if(!route?.provider||!route?.model)throw Object.assign(new Error('PET_MODEL_NOT_CONFIGURED'),{code:'PET_MODEL_NOT_CONFIGURED'});
    const call=await llm.prepareCall({...route,maxTokens:512},signal,(controls,model)=>({...controls,...(controls.reasoningEffort===undefined&&model.reasoning?.efforts?.length?{reasoningEffort:model.reasoning.efforts[0].id}:{})}));
    // Keep every model-visible byte in a dedicated official Session. We never
    // read work-chat messages, register a global Agent tool, or change its model.
    let session=this.sessions.get(skinId);
    if(!session){session=store.create('companion-'+randomUUID(),{meta:{cwd:this.ctx.get('profileContext')?.dir||process.cwd()}});this.sessions.set(skinId,session);}
    const message=createUserMessage({content:[{type:'text',text:prompt(['work-completed','idle-activity'].includes(input.trigger)?input:{...input,model:call.config})}],source:{kind:'user'}});
    session.append('user/message',message,{surfaceOp:'append'});
    const assembler=new BlockAssembler();
    for await(const chunk of call.stream({...call.config,messages:Object.freeze([message]),sessionId:session.id,purpose:'pet-interaction',signal})){signal.throwIfAborted();assembler.push(chunk);}
    signal.throwIfAborted();
    if(['error','aborted'].includes(assembler.finish.kind))throw Object.assign(new Error(assembler.finish.failure.code),{code:assembler.finish.failure.code});
    if(assembler.finish.kind!=='stop')throw Object.assign(new Error('PET_DECISION_INCOMPLETE'),{code:'PET_DECISION_INCOMPLETE'});
    return {text:assembler.blocks().filter(x=>x.type==='text').map(x=>x.text).join(''),route:{provider:call.config.provider,model:call.config.model}};
  }
}
