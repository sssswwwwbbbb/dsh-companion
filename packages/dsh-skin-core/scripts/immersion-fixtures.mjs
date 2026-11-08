// Independent-profile integration fixture, never shipped in the plugin.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
export async function installImmersionFixtures({ctx,companion,official,home,candidate}){
 const {LlmAdapter,createUserMessage}=await import(official('dsh-llm/lib/index.js'));
 const {zipSync}=createRequire(path.join(home,'plugin/package.json'))('fflate');
 const manifest=JSON.parse(fs.readFileSync(path.join(candidate,'skin.json'))),entries={'skin.json':fs.readFileSync(path.join(candidate,'skin.json'))};
 for(const asset of Object.values(manifest.assets))entries[asset.path]=fs.readFileSync(path.join(candidate,asset.path));
 const file=path.join(home,'immersion-content.zip');fs.writeFileSync(file,zipSync(entries));const installed=await companion.controller.skins.install(file);
 const agents=new Map(),plans=new Map(),events=[],requests=[];let calls=0;
 const save=()=>fs.writeFileSync(path.join(home,'activity-evidence.json'),JSON.stringify({events,requests,externalModelCalls:0},null,2));
 class ActivityAdapter extends LlmAdapter {
  listModels(){return Promise.resolve([{provider:'immersion-activity',id:'offline',name:'沉浸反馈无网探针'}]);}
  async *stream(options){
   // Session title requests are auxiliary: they never become work-turn signals.
   if(!options.tools?.length){yield {type:'text-delta',index:0,text:'沉浸反馈隔离会话'};yield {type:'finish',reason:{kind:'stop'}};return;}
   const plan=plans.get(options.sessionId);if(!plan)throw new Error('UNEXPECTED_ACTIVITY_REQUEST');
   requests.push({sessionId:options.sessionId,mode:plan.mode,tools:options.tools.map(t=>t.name)});save();
   if(plan.mode==='question'&&!plan.asked){
    const tool=options.tools.find(t=>t.name==='ask_user_question');
    if(!tool){
      const directory=options.tools.find(t=>t.name==='working_directory');
      if(directory&&!plan.directoryCalled){
        plan.directoryCalled=true;
        yield {type:'tool-call-delta',index:0,id:'immersion-directory-'+(++calls),name:directory.name,argumentsDelta:JSON.stringify({cd:home})};
        yield {type:'finish',reason:{kind:'tool-calls'}};return;
      }
      throw new Error('OFFICIAL_QUESTION_TOOL_MISSING_AFTER_DIRECTORY');
    }
    plan.asked=true;plan.callId='immersion-question-'+(++calls);
    yield {type:'tool-call-delta',index:0,id:plan.callId,name:tool.name,argumentsDelta:JSON.stringify({questions:[{id:'immersion-check',header:'隔离验证',question:'当前只验证沉浸反馈，选择继续。',options:[{label:'继续',description:'仅完成这条本地探针。'}]}],timeout:60})};
    yield {type:'finish',reason:{kind:'tool-calls'}};return;
   }
   await plan.promise;options.signal?.throwIfAborted();
   if(plan.outcome==='error')throw new Error('IMMERSION_CONTROLLED_FAILURE');
   yield {type:'text-delta',index:0,text:'本轮本地验证回复完成。'};yield {type:'finish',reason:{kind:'stop'}};
  }
 }
 ctx.llm.registerAdapter(['immersion-activity'],new ActivityAdapter());
 const defaults=ctx.get('agentDefaultModel');if(defaults)defaults.currentSelection=()=>({provider:'immersion-activity',model:'offline'});
 ctx.on('session/event',(session,event)=>{
  if(![...agents.values()].some(a=>a.id===session.id)||!['turn/start','turn/end','tool/call','tool/result'].includes(event.type))return;
  events.push({sessionId:session.id,type:event.type,seq:event.seq,turn:event.data.turn,...event.type==='turn/end'?{reason:event.data.reason?.kind}:{},...event.type==='tool/call'?{name:event.data.name,callId:event.data.callId}:{}});save();
 });
 return {installed,async command(method,value){
  if(method==='activityCreate'){
   if(!/^immersion-work-[ab]$/.test(value))throw new Error('OWN_ACTIVITY_IDS_ONLY');
   // Use the same Session composition as the official UI; the low-level Agent
   // factory alone intentionally omits the ordinary Session's preset tools.
   const created=await ctx.sessionController.create({sessionId:value,cwd:home});
   const agent=ctx.agents.get(created.sessionId);if(!agent)throw new Error('OFFICIAL_SESSION_NOT_CREATED');
   // Session header cwd alone is not the official live directory initialization.
   await ctx.workingDirectory.set(agent,home,AbortSignal.timeout(5000));agents.set(value,agent);
   ctx.get('sessionTitle').rename(agent.session,value.endsWith('a')?'隔离验证 A':'隔离验证 B');return {alias:value,created:agent.id,directoryInitialized:true};
  }
  if(method==='activityStart'){
   const a=agents.get(value.id);if(!a)throw new Error('OWN_AGENT_MISSING');const deferred=Promise.withResolvers();plans.set(a.id,{...deferred,mode:value.mode||'normal',outcome:'success'});
   a.followup(createUserMessage({content:[{type:'text',text:'请运行本地沉浸反馈探针，不访问外部服务。'}],source:{kind:'user'}}));return {started:value.id};
  }
  if(method==='activityRelease'){const p=plans.get(agents.get(value.id).id);p.outcome=value.outcome||'success';p.resolve();return {released:true};}
  if(method==='activityCancel'){const a=agents.get(value);a.cancel({kind:'user'});plans.get(a.id)?.resolve();return {canceled:true};}
  if(method==='activityStatus')return {events,requests,questions:[...agents].map(([alias,a])=>({alias,id:a.id,status:a.status,projection:ctx.sessionProjections.stateOf(a.session,'userQuestions'),inbox:ctx.sessionProjections.stateOf(a.session,'inbox')})),work:companion.controller.skins.work.receipt,installed};
  throw new Error('UNKNOWN_ACTIVITY_METHOD');
 }};
}
