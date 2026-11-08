// Run isolated-host --model-fixtures --config-fixtures examples/interaction,
// then isolated-renderer. These are controlled provider responses, not real AI.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {control} from './control.mjs';
const out=process.env.DSH_SKIN_REPORT_DIR||'reports/skin-foundation-m3-2026-11-03',info=JSON.parse(fs.readFileSync('.local/skin-foundation-current.json'));
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),scope:'isolated DSH 0.2.1-rc.5 Host + official llm service + controlled provider adapter + real native renderer',realModelCalls:0,fixtureRequests:0,userProfileChanged:false,checks:[]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),state=()=>control('host','status'),evaluate=text=>control('page','evaluate',text),requests=()=>JSON.parse(fs.readFileSync(path.join(info.home,'pet-model-requests.json'),'utf8'));
const configure=(field,value)=>control('host','configure',{module:'pet',field,value});
const save=()=>fs.writeFileSync(path.join(out,'integration.json'),JSON.stringify(report,null,2)+'\n');
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await wait(100);}throw new Error('M3_STATE_TIMEOUT');}
async function check(name,fn){try{const detail=await fn();report.checks.push({name,passed:true,...(detail?{detail}:{})});}catch(error){report.checks.push({name,passed:false,error:error.message.slice(0,500)});throw error;}finally{save();}}
async function native(route,value={}){const bridge=JSON.parse(fs.readFileSync(path.join(info.stateDir,'bridge.json')));const response=await fetch('http://127.0.0.1:'+bridge.port+route,{method:'POST',headers:{authorization:'Bearer '+bridge.token,'content-type':'application/json'},body:JSON.stringify(value)});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
async function open(){await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='继续')?.click()");await evaluate("document.querySelector('[role=dialog] button[aria-label=关闭]')?.click()");if(!await evaluate("!!document.querySelector('.dshc-page')"))await evaluate("document.querySelector('button[aria-label=陪伴]').click()");await until(()=>evaluate("!!document.querySelector('.dshc-page')"));await evaluate("[...document.querySelectorAll('.dshc-page nav button')].find(e=>e.textContent==='皮肤').click()");}
async function send(text){await until(()=>evaluate("!!document.querySelector('[data-pet-interaction] input[type=text]:not(:disabled)')"));await evaluate(`(()=>{const input=document.querySelector('[data-pet-interaction] input[type=text]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(text)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait(50);await evaluate("document.querySelector('[data-pet-interaction] form').requestSubmit()");}
try{
  await control('host','select','sample-interaction');await control('host','reset');await open();
  await check('declared defaults, six M3 controls and official model catalog reach settings',async()=>{
    const s=await state(),v=s.skin.settings.pet.values;assert.equal(v.smartEnabled,true);assert.equal(v.historyRounds,10);assert.deepEqual(v.modelSelection,{mode:'current'});assert.ok(v.persona.includes('鲸鱼娘'));assert.equal(v.allowSpeech,true);assert.equal(v.allowActions,true);
    const fields=await evaluate("[...document.querySelectorAll('.dshc-page label')].map(e=>e.firstChild?.textContent)");for(const label of ['智能互动','本套人设','互动使用的模型','最近互动轮数','允许说话','允许动作'])assert.ok(fields.includes(label));
    const models=await control('host','petModels');assert.ok(models.models.some(x=>x.provider==='companion-fixture'&&x.model==='pet-test'));
    return {declaredM3Controls:6,readyActions:s.availableActions,modelDirectory:'official llm catalog; controlled provider'};
  });
  await check('two UI rounds use official model stream, actual prior result and native text/action',async()=>{
    await send('请陪我一下');await until(async()=>{const s=await state();return s.petInteraction.last?.user==='请陪我一下'&&!s.petInteraction.pending;});const first=(await state()).petInteraction.last;
    await send('换个动作');await until(async()=>{const s=await state();return s.petInteraction.last?.user==='换个动作'&&!s.petInteraction.pending;});const second=(await state()).petInteraction.last;
    const req=requests().at(-1);assert.deepEqual(req.input.recent.at(-1).actual,first.actual);assert.notEqual(first.actual.action,second.actual.action);assert.equal(second.mode,'model');assert.equal(req.input.persona,(await state()).skin.settings.pet.values.persona);
    const actual=await native('/test/pet',{capture:true});assert.equal(actual.bubble.text,second.actual.speech);assert.equal(actual.bubble.shown,true);assert.equal(actual.bubble.action,second.actual.action);
    const capture=JSON.parse(fs.readFileSync(path.join(info.stateDir,'pet-capture.json')));fs.writeFileSync(path.join(out,'native-model-reply.png'),Buffer.from(capture.png,'base64'));
    await evaluate("document.querySelector('[data-pet-interaction]').scrollIntoView({block:'end'})");await control('page','screenshot',path.resolve(out,'interaction-settings.png'));
    return {first:first.actual,second:second.actual,secondReceivedActual: req.input.recent.at(-1).actual};
  });
  await check('quiet choice clears dynamic bubble and performs no new action',async()=>{
    const reply=await control('host','petInteract',{text:'安静陪着就好'});assert.deepEqual(reply.actual,{speech:'',action:null});const dom=await native('/test/pet');assert.equal(dom.bubble.shown,false);return reply.actual;
  });
  await check('invalid action and provider error use local reply, intelligence off makes zero requests',async()=>{
    const invalid=await control('host','petInteract',{text:'无效动作夹具'});assert.equal(invalid.mode,'fallback');assert.equal(invalid.reason,'PET_DECISION_INVALID');assert.equal(invalid.actual.action,'react');
    fs.writeFileSync(path.join(info.stateDir,'test-model-fail'),'fixture');const failed=await control('host','petInteract',{text:'测试调用失败'});fs.rmSync(path.join(info.stateDir,'test-model-fail'));assert.equal(failed.mode,'fallback');assert.equal(failed.reason,'AUTH');
    await configure('smartEnabled',false);const count=requests().length,local=await control('host','petInteract',{text:'关闭智能后摸摸头'});assert.equal(local.mode,'local');assert.equal(requests().length,count);assert.equal(local.actual.action,'react');return {invalidReason:invalid.reason,failureReason:failed.reason,disabledMode:local.mode};
  });
  await check('capability switches, persona/history override, specified route, switch and reset retain existing semantics',async()=>{
    await configure('smartEnabled',true);await configure('allowSpeech',false);await configure('allowActions',false);await configure('historyRounds',1);await configure('persona','你是验证用的小档案员，只说短句。');await configure('modelSelection',{mode:'specific',provider:'companion-fixture',model:'pet-test'});
    const reply=await control('host','petInteract',{text:'本轮不说话不动作'});assert.deepEqual(reply.actual,{speech:'',action:null});const req=requests().at(-1);assert.equal(req.input.recent.length,1);assert.deepEqual(req.input.capabilities,{speech:false,actions:[]});assert.equal(req.input.persona,'你是验证用的小档案员，只说短句。');assert.equal(req.provider,'companion-fixture');
    await control('host','select','sample-a');await control('host','select','sample-interaction');const saved=(await state()).skin.settings.pet.values;assert.equal(saved.historyRounds,1);assert.equal(saved.modelSelection.mode,'specific');assert.equal(saved.allowSpeech,false);
    await control('host','reset');const reset=(await state()).skin.settings.pet.values;assert.equal(reset.historyRounds,10);assert.equal(reset.modelSelection.mode,'current');assert.equal(reset.allowSpeech,true);assert.equal(reset.allowActions,true);return {savedHistory:1,resetHistory:10,resetRoute:reset.modelSelection};
  });
  await check('native click IPC feeds the same model service and history',async()=>{
    const count=requests().length;await native('/test/pet',{click:true});await until(async()=>{const s=await state();return requests().length>count&&s.petInteraction.last?.trigger==='click'&&!s.petInteraction.pending;});const last=(await state()).petInteraction.last;assert.equal(last.mode,'model');assert.ok(requests().at(-1).input.recent.length>0);return {trigger:last.trigger,mode:last.mode,entry:'existing native renderer IPC (controlled click, not physical pointer)'};
  });
  await check('stop while awaiting model suppresses late reply and never reveals the pet',async()=>{
    await open();const before=(await state()).interaction;fs.writeFileSync(path.join(info.stateDir,'test-model-hold'),'fixture');await send('等待中的回复不得在停止后出现');await until(async()=> (await state()).petInteraction.pending);
    await evaluate("document.querySelector('button[aria-label=停止全部皮肤效果]').click()");await until(async()=>{const s=await state();return s.skin.stopped&&s.skin.phase==='stopped';});fs.rmSync(path.join(info.stateDir,'test-model-hold'));await wait(700);
    const after=await state();assert.equal(after.window.visible,false);assert.equal(after.desktopSkin.mediaPaused,true);assert.deepEqual(after.interaction,before);assert.equal(after.petInteraction.available,false);return {stopped:after.skin.stopped,visible:after.window.visible,lateExecution:false};
  });
  await check('explicit resume works, pet disable blocks interaction, undeclared package explains unavailable',async()=>{
    await control('host','select','sample-interaction');const resumed=await control('host','petInteract',{text:'恢复后你好'});assert.equal(resumed.mode,'model');
    await control('host','disable',{module:'pet',disabled:true});await assert.rejects(control('host','petInteract',{text:'关闭不能响应'}),/PET_NOT_AVAILABLE/);assert.equal((await state()).window.visible,false);
    await control('host','disable',{module:'pet',disabled:false});await control('host','select','sample-b');assert.equal((await state()).petInteraction.reason,'PET_INTERACTION_NOT_DECLARED');await control('host','stop');
  });
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.message.slice(0,500);}
finally{for(const name of ['test-model-fail','test-model-hold'])fs.rmSync(path.join(info.stateDir,name),{force:true});}
report.fixtureRequests=fs.existsSync(path.join(info.home,'pet-model-requests.json'))?requests().length:0;
report.environment=JSON.parse(fs.readFileSync(path.join(info.home,'model-environment.json')));
report.limits=['No external real model or billing used; fresh isolated profile has zero configured catalog models','Native click uses existing renderer IPC, not physical pointer or tray acceptance','Historical builtin whale-maid media; no new R2/R4 character media acceptance','Recent history is per-skin in plugin memory and resets on plugin reload'];
save();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(x=>!x.passed).map(x=>x.name)}));if(!report.passed)process.exitCode=1;
