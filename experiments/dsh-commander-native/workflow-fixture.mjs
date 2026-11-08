// Reuses the already reviewed workspace-v2 local adapter pattern. Test-only;
// never bundled into the Companion or presented as real model output.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
export async function registerLocalWorkflow({ctx,lab,report}){
 const official=n=>pathToFileURL('/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/'+n).href;
 const {LlmAdapter,createUserMessage}=await import(official('dsh-llm/lib/index.js'));
 const gates=[],requests=[],events=[];let seeding=true,questionArmed=false;
 const status=()=>({fixture:'existing workspace-v2 offline adapter pattern',externalModelCalls:0,requests,events,sessionId:agent?.id});
 const save=()=>fs.writeFileSync(path.join(report,'workflow-events.json'),JSON.stringify(status(),null,2)+'\n');let agent;
 class OfflineAdapter extends LlmAdapter{
  listModels(){return Promise.resolve([{provider:'workspace-v2-offline',id:'probe',name:'本地离线验收'},{provider:'workspace-v2-offline',id:'probe-alt',name:'本地离线备选'}]);}
  async *stream(options){
   if(!options.tools?.length){yield {type:'text-delta',index:0,text:'指挥官私有流程 · 离线验收'};yield {type:'finish',reason:{kind:'stop'}};return;}
   requests.push({at:Date.now(),sessionId:options.sessionId,provider:options.provider,model:options.model,seeding});save();
   if(seeding){seeding=false;yield {type:'text-delta',index:0,text:'这是一条用于 指挥官桌面流程验收的本地离线回复。用于检查复制、纸面层次、附件、发送和停止，未调用外部模型。'};yield {type:'finish',reason:{kind:'stop'}};return;}
   if(questionArmed){
    questionArmed=false;if(!options.tools.some(t=>t.name==='ask_user_question'))throw new Error('ASK_USER_TOOL_UNAVAILABLE');
    yield {type:'tool-call-delta',index:0,id:'commander-native-question-'+Date.now(),name:'ask_user_question',argumentsDelta:JSON.stringify({questions:[{id:'native-test-mode',header:'本地验收',question:'本地桌面验收：选择下一步，只影响当前私有测试。',options:[{label:'继续本地验收',description:'提交选择，继续检查原生回执。'},{label:'保留待决策',description:'保留当前问题，稍后处理。'}]}]})};
    yield {type:'finish',reason:{kind:'stop'}};return;
   }
   const gate=Promise.withResolvers();gates.push(gate);yield {type:'text-delta',index:0,text:'本地受控回复进行中。此处验证原有发送、停止和完成通路。'};
   await Promise.race([gate.promise,new Promise((resolve,reject)=>{if(options.signal?.aborted)reject(options.signal.reason);else options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true});})]);options.signal?.throwIfAborted();
   yield {type:'text-delta',index:0,text:'\n\n本次本地验收已完成，可以继续编辑。'};yield {type:'finish',reason:{kind:'stop'}};
  }
 }
 for(let i=0;i<100&&!ctx.get('agentLoop');i++)await new Promise(r=>setTimeout(r,100));
 ctx.llm.registerAdapter(['workspace-v2-offline'],new OfflineAdapter());
 ctx.get('agentDefaultModel').currentSelection=()=>({provider:'workspace-v2-offline',model:'probe'});
 const created=await ctx.sessionController.create({sessionId:'commander-private-local-workflow-'+Date.now(),cwd:lab});agent=ctx.agents.get(created.sessionId);
 await ctx.workingDirectory.set(agent,lab,AbortSignal.timeout(5000));ctx.get('sessionTitle').rename(agent.session,'指挥官接入验收 · 当前本地会话');
 const workspace=await ctx.workspaceRegistry.create(lab,'指挥官私有验收');await workspace.attachSession(agent.id);
 ctx.on('session/event',(session,event)=>{if(session.id===agent.id&&['turn/start','turn/end','message/assistant'].includes(event.type)){events.push({at:Date.now(),type:event.type,seq:event.seq,...event.type==='turn/end'?{reason:event.data.reason?.kind}:{}});save();}});
 agent.followup(createUserMessage({content:[{type:'text',text:'仅生成一条用于桌面复制与排版验收的本地离线回复。'}],source:{kind:'user'}}));
 for(let i=0;i<200&&!events.some(x=>x.type==='turn/end');i++)await new Promise(r=>setTimeout(r,50));
 fs.writeFileSync(path.join(lab,'commander-attachment.txt'),'Commander private desktop workflow attachment. Local fixture only.\n');save();
 return {status,release(){gates.at(-1)?.resolve();return {released:true};},question(){questionArmed=true;return {armed:true,tool:'ask_user_question',realHostTool:true};}};
}
