import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PetBehavior} from '../../../designs/dsh-companion-v1/behavior.mjs';
import {PetInteraction,parsePetDecision} from '../../dsh-companion/src/pet-interaction.mjs';
import {validateManifest,resolveSettings} from '../src/schema.mjs';
const defaults={smartEnabled:true,persona:'你是测试档案室的小鲸，语气简短温和。',modelSelection:{mode:'current'},historyRounds:5,allowSpeech:true,allowActions:true,actionDescriptions:{react:'轻轻回应',play:'和猫玩',stretch:'伸懒腰'},localReply:'我在这儿。'};
function fixture(complete){
  const core={phase:'ready',generation:1,pendingSelections:0,state:{selected:{manifest:{id:'test-pet'},contentKey:'a'.repeat(64)},stopped:false},store:{hasStops:()=>false},view:()=>({pet:{status:'enabled',values:config}})};
  const config=structuredClone(defaults),requests=[],executed=[];
  const controller={skins:{core},entitlement:{require(){}},nativeStatus:async()=>({availableActions:['react','play','stretch']}),request:async(route,value)=>{assert.equal(route,'/interaction');executed.push(value);return {speech:value.speech,action:value.action};}};
  const service=new PetInteraction(controller,{complete:async input=>{requests.push(structuredClone({...input,signal:null}));return complete(input);}});
  controller.interactions=service;return {core,config,controller,service,requests,executed};
}
test('second model input uses actual execution result rather than the original planned action',async()=>{
  const f=fixture(async({input})=>({text:JSON.stringify({speech:input.recent.length?'那这次伸个懒腰。':'一起玩吧。',action:input.recent.length?'stretch':'play'}),route:{provider:'test',model:'test'}}));
  const base=f.controller.request;f.controller.request=async(route,value)=>{const actual=await base(route,value);return f.executed.length===1?{...actual,action:'react'}:actual;};
  const one=await f.service.interact({text:'陪我一下'}),two=await f.service.interact({text:'换个动作'});
  assert.equal(one.actual.action,'react');assert.equal(two.actual.action,'stretch');
  assert.equal(f.requests[1].input.recent[0].actual.action,'react');assert.equal(f.requests[1].input.recent[0].actual.speech,'一起玩吧。');
  assert.equal(f.requests[0].input.persona,defaults.persona);
});
test('native receipt and next round reflect real behavior rejection during dragging/falling, while speech remains delivered',async()=>{
  const source=fs.readFileSync(new URL('../../../runtime-src/main.mjs',import.meta.url),'utf8');
  const start=source.indexOf('async function deliverInteraction(input){'),end=source.indexOf('\nfunction settleUnsupportedAction()',start);
  assert.ok(start>=0&&end>start);
  for(const state of ['standing','dragging','falling']){
    const model=new PetBehavior();let calls=0,spoken;
    const f=fixture(async()=>{
      if(calls++)return {text:'{"speech":null,"action":null}'};
      if(state==='dragging')model.startDrag();else if(state==='falling')model.falling=true;
      return {text:'{"speech":"舒展一下。","action":"stretch"}'};
    });
    const context={desktopReady:()=>true,usesWorker:()=>false,skin:{generation:f.core.generation,contentKey:f.core.state.selected.contentKey,interactionSettings:()=>f.config,canShow:()=>true},actions:new Set(['react','stretch']),readyActions:['react','stretch'],pack:{animations:{react:{seconds:1.8},stretch:{seconds:3}}},model,say:text=>{spoken=text;},sendState(){},lastInteraction:null};
    vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nthis.deliver=deliverInteraction;',context);
    f.controller.request=async(route,input)=>{assert.equal(route,'/interaction');return context.deliver(input);};
    const first=await f.service.interact({text:'做个动作'}),expected=state==='standing'?'stretch':null;
    assert.equal(first.actual.action,expected,state);assert.equal(model.action,state==='standing'?'stretch':'idle',state);
    assert.equal(spoken,'舒展一下。',state);assert.equal(first.actual.speech,spoken,state);
    await f.service.interact({text:'刚才做了什么？'});assert.equal(f.requests[1].input.recent.at(-1).actual.action,expected,state);
  }
});
test('unsupported action and model failure both use the declared local fallback',async()=>{
  for(const mode of ['invalid','failure']){
    const f=fixture(async()=>{if(mode==='failure')throw Object.assign(new Error('NO_ADAPTER'),{code:'NO_ADAPTER'});return {text:'{"speech":"飞起来","action":"fly"}'};});
    const reply=await f.service.interact({text:'你好'});assert.equal(reply.mode,'fallback');assert.deepEqual(reply.actual,{speech:'我在这儿。',action:'react'});assert.ok(reply.reason);
  }
});
test('disabled intelligence remains local; capability switches allow silence and no movement',async()=>{
  const f=fixture(async()=>assert.fail('local interaction called a model'));f.config.smartEnabled=false;
  assert.equal((await f.service.interact({trigger:'click'})).mode,'local');
  f.config.allowSpeech=false;f.config.allowActions=false;
  assert.deepEqual((await f.service.interact({text:'安静陪我'})).actual,{speech:'',action:null});
  assert.equal(f.requests.length,0);
});
test('model may choose silence, and only currently ready declared actions enter its input',async()=>{
  const f=fixture(async({input})=>{assert.deepEqual(input.capabilities.actions,[{id:'react',description:'轻轻回应'}]);return {text:'{"speech":null,"action":null}',route:{provider:'test',model:'test'}};});
  f.controller.nativeStatus=async()=>({availableActions:['react','walk','fly']});
  assert.deepEqual((await f.service.interact({text:'陪着就好'})).actual,{speech:'',action:null});
});
test('stopping while a provider ignores cancellation suppresses its late response',async()=>{
  let release;const f=fixture(()=>new Promise(resolve=>{release=resolve;}));
  const request=f.service.interact({text:'你好'});await new Promise(resolve=>setImmediate(resolve));
  f.core.state.stopped=true;f.service.cancel();release({text:'{"speech":"迟到回应","action":"play"}'});
  await assert.rejects(request);assert.equal(f.executed.length,0);assert.equal(f.service.history.size,0);
});
test('independent stop, skin switch, history limit and per-skin isolation use existing state',async()=>{
  const f=fixture(async()=>({text:'{"speech":"收到","action":null}'}));
  f.config.historyRounds=0;await f.service.interact({text:'一'});await f.service.interact({text:'二'});assert.deepEqual(f.requests[1].input.recent,[]);
  f.config.historyRounds=1;await f.service.interact({text:'三'});assert.equal(f.requests[2].input.recent.length,1);
  f.core.state.selected.manifest.id='another-pet';await f.service.interact({text:'四'});assert.deepEqual(f.requests[3].input.recent,[]);
  f.core.store.hasStops=()=>true;await assert.rejects(f.service.interact({text:'不应该执行'}),/PET_NOT_AVAILABLE/);
});
test('pet module declares M3 defaults and overrides without changing older five controls',()=>{
  const manifest={formatVersion:2,id:'test-pet',version:'1.0.0',name:'测试',dshVersions:['0.2.1-rc.5'],assets:{},modules:{pet:{interfaceVersion:1,configVersion:1,required:true,config:{builtinPack:'whale-maid-demo',actionDescriptions:defaults.actionDescriptions,localReply:defaults.localReply},settings:Object.fromEntries(['smartEnabled','persona','modelSelection','historyRounds','allowSpeech','allowActions'].map(field=>[field,{label:field,default:defaults[field]}]))}}};
  validateManifest(manifest);
  const values=resolveSettings(manifest,{overrides:{'test-pet':{pet:{historyRounds:2,modelSelection:{mode:'specific',provider:'test',model:'small'}}}}},{pet:true}).pet;
  assert.equal(values.values.historyRounds,2);assert.equal(values.values.modelSelection.model,'small');assert.equal(values.controls.length,6);
  const bad=structuredClone(manifest);bad.modules.pet.settings.modelSelection.default={mode:'specific',provider:'test'};assert.throws(()=>validateManifest(bad),/SKIN_DEFAULT_INVALID/);
});
test('parser rejects partial or overlong decisions, preserving explicit null as no action',()=>{
  const capabilities={speech:true,actions:[{id:'react'}]};
  assert.deepEqual(parsePetDecision('```json\n{"speech":null,"action":null}\n```',capabilities),{speech:'',action:null});
  assert.throws(()=>parsePetDecision('{"speech":"hello"}',capabilities));
  assert.throws(()=>parsePetDecision(JSON.stringify({speech:'a'.repeat(121),action:null}),capabilities));
});
