import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PetInteraction} from '../packages/dsh-companion/src/pet-interaction.mjs';
import {PetActivities} from '../packages/dsh-companion/src/pet-activities.mjs';
import {loadSkin} from '../packages/dsh-skin-core/src/resources.mjs';
import {validateManifest,resolveSettings} from '../packages/dsh-skin-core/src/schema.mjs';
import {petMemorySettings} from '../packages/dsh-skin-core/src/pet-memory.mjs';
const source=fileURLToPath(new URL('./fixtures/archive-workspace-r2-private',import.meta.url));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function system(t){
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-pet-memory-'));t.after(()=>fs.rmSync(stateDir,{recursive:true,force:true}));
 const selected=loadSkin(source),id=selected.manifest.id;
 const core={phase:'ready',generation:1,state:{selected,overrides:{[id]:{pet:{smartEnabled:true,allowSpeech:true,allowActions:true},theme:{workFeedbackEnabled:true}}},disabled:{},stopped:false,results:{pet:{status:'ready'}}},store:{hasStops:()=>false,write:value=>fs.writeFileSync(path.join(stateDir,'skin-state.json'),JSON.stringify(value))},queue:async fn=>fn()};
 core.view=()=>resolveSettings(core.state.selected.manifest,core.state,{theme:true,pet:true,startup:true});
 const calls=[],executions=[];
 const controller={stateDir,skins:{core},focus:{quiet:false},credentials:()=>({}),entitlement:{require(){}},status:()=>({}),nativeStatus:async()=>({availableActions:['react','walk'],activityActions:['react','walk'],workReactionAvailable:true}),request:async(route,value)=>{executions.push({route,...value});return {speech:value.speech||'',action:route==='/interaction'?null:value.action};}};
 const model={complete:async value=>{calls.push(value.input);return {text:'{"speech":"收到。","action":"react"}',route:{provider:'test',model:'test'}};}};
 controller.skins.controller=controller;controller.interactions=new PetInteraction(controller,model);
 const preference=(field,value)=>controller.interactions.memory.configure({contentKey:core.state.selected.contentKey,field,value});
 return {controller,core,id,selected,calls,executions,preference,restore(){core.state=JSON.parse(fs.readFileSync(path.join(stateDir,'skin-state.json')));controller.interactions=new PetInteraction(controller,model);return controller.interactions;}};
}
test('memory is optional, has per-skin defaults and keeps unsupported skins hidden',()=>{
 const skin=loadSkin(source),declared=structuredClone(skin.manifest);
 declared.modules.pet.config.interactionMemory={enabledDefault:true,preferenceDefault:'少走动。'};
 assert.doesNotThrow(()=>validateManifest(declared));
 assert.equal(petMemorySettings(declared,'authored-key',{}).enabled,true);
 for(const value of [{enabledDefault:true},{enabledDefault:1,preferenceDefault:''},{enabledDefault:false,preferenceDefault:'x'.repeat(401)},{enabledDefault:false,preferenceDefault:'',other:1}]){
  declared.modules.pet.config.interactionMemory=value;assert.throws(()=>validateManifest(declared),/SKIN_CONFIG_INVALID/);
 }
 assert.equal(petMemorySettings(skin.manifest,skin.contentKey,{}).enabled,false);
 assert.equal(petMemorySettings({id:'ordinary',modules:{pet:{config:{}}}},'ordinary',{}),null);
});
test('only acknowledged pet results persist, reload into the next real model input and remain skin-scoped',async t=>{
 const s=system(t);await s.controller.interactions.interact({text:'临时话'});
 assert.equal(fs.existsSync(path.join(s.controller.stateDir,'pet-memory',s.id+'.json')),false);
 await s.preference('enabled',true);await s.preference('preference',' 少走动，简短回应。 ');
 await s.controller.interactions.interact({text:'记住代号月光'});
 const saved=s.controller.interactions.memory.status();assert.equal(saved.records.length,2);assert.equal(saved.records.at(-1).actual.action,null);
 assert.equal(saved.records.at(-1).route,undefined);
 assert.equal(fs.statSync(path.join(s.controller.stateDir,'pet-memory',s.id+'.json')).mode&0o777,0o600);
 s.restore();assert.equal(s.controller.interactions.status().historyCount,2);
 await s.controller.interactions.interact({text:'刚才说了什么？'});
 assert.equal(s.calls.at(-1).recent.at(-1).user,'记住代号月光');assert.equal(s.calls.at(-1).recent.at(-1).actual.action,null);
 assert.equal(s.calls.at(-1).memory.preference,'少走动，简短回应。');
 assert.deepEqual(s.calls.at(-1).memory.recentActions,[]);

 const request=s.controller.request;s.controller.request=async()=>{throw new Error('NATIVE_REJECTED');};
 const count=s.controller.interactions.memory.status().records.length;
 await assert.rejects(s.controller.interactions.interact({text:'原生未确认'}),/NATIVE_REJECTED/);
 assert.equal(s.controller.interactions.memory.status().records.length,count);s.controller.request=request;
 const original=s.core.state.selected;
 s.core.state.selected={...original,contentKey:'another',manifest:{...original.manifest,id:'another-pet',modules:{...original.manifest.modules,pet:{...original.manifest.modules.pet,config:{...original.manifest.modules.pet.config,interactionMemory:{enabledDefault:true,preferenceDefault:''}}}}}};
 s.core.state.overrides['another-pet']={pet:{smartEnabled:true,allowSpeech:true}};
 await s.controller.interactions.interact({text:'另一套皮肤'});assert.deepEqual(s.calls.at(-1).recent,[]);assert.equal(s.calls.at(-1).memory.preference,'');
 s.core.state.selected=original;assert.equal(s.controller.interactions.memory.status().records.length,3);
});
test('clear, disable and reset erase records, cancel late model replies and preserve the intended preference scope',async t=>{
 const s=system(t);await s.preference('enabled',true);await s.preference('preference','更安静。');await s.controller.interactions.interact({text:'之前的一句话'});
 let release;s.controller.interactions.model.complete=()=>new Promise(resolve=>{release=resolve;});
 const pending=s.controller.interactions.interact({text:'不应保存'}),rejected=assert.rejects(pending,/SKIN_OPERATION_SUPERSEDED/);await tick();
 await s.preference('clear',null);release({text:'{"speech":"迟到","action":"react"}'});await rejected;
 assert.equal(s.executions.length,1);assert.deepEqual(s.controller.interactions.memory.status().records,[]);assert.equal(s.controller.interactions.memory.status().preference,'更安静。');
 assert.equal(s.controller.interactions.status().historyCount,0);
 s.controller.interactions.model.complete=async value=>{s.calls.push(value.input);return {text:'{"speech":null,"action":null}'};};
 await s.controller.interactions.interact({text:'重新开始'});assert.deepEqual(s.calls.at(-1).recent,[]);
 await s.preference('enabled',false);assert.deepEqual(s.controller.interactions.memory.status().records,[]);assert.equal(s.controller.interactions.memory.status().preference,'更安静。');
 await s.preference('enabled',true);assert.deepEqual(s.controller.interactions.memory.status().records,[]);
 await s.preference('reset',null);assert.equal(s.controller.interactions.memory.status().enabled,false);assert.equal(s.controller.interactions.memory.status().preference,'');
 await assert.rejects(s.preference('preference','x'.repeat(401)),/SKIN_SETTING_UNSUPPORTED/);
 await assert.rejects(s.controller.interactions.memory.configure({contentKey:'old',field:'enabled',value:true}),/SKIN_OPERATION_SUPERSEDED/);
});
test('autonomous decisions see bounded real action receipts and cancel/silence never invent a played action',async t=>{
 const s=system(t);await s.preference('enabled',true);
 const packet={state:'idle',observedState:'idle',reducedMotion:false,observing:true};
 const work={accepted:packet,ready:()=>true,cancelDecision(){}};s.controller.skins.work=work;
 const activities=new PetActivities(s.controller.skins);s.controller.skins.activities=activities;
 await activities.configure({contentKey:s.selected.contentKey,field:'enabled',value:true});
 s.controller.interactions.model.complete=async value=>{s.calls.push(value.input);return {text:'{"speech":null,"action":"walk"}'};};
 await activities.preview({contentKey:s.selected.contentKey});
 assert.equal(s.controller.interactions.memory.status().records.at(-1).source,'activity');assert.equal(s.controller.interactions.memory.status().records.at(-1).actual.action,'walk');
 await activities.preview({contentKey:s.selected.contentKey});assert.equal(s.calls.at(-1).memory.recentActions.at(-1).action,'walk');
 const before=s.controller.interactions.memory.status().records.length;
 s.controller.interactions.model.complete=async()=>({text:'{"speech":null,"action":null}'});await activities.preview({contentKey:s.selected.contentKey});assert.equal(s.controller.interactions.memory.status().records.length,before);
 for(let n=0;n<23;n++)s.controller.interactions.memory.remember({contentKey:s.selected.contentKey,generation:1},{source:'work',actual:{action:'react',speech:''}});
 assert.equal(s.controller.interactions.memory.status().records.length,20);
 s.controller.interactions.memory.remember({contentKey:'stale',generation:1},{source:'work',actual:{action:'walk'}});assert.equal(s.controller.interactions.memory.status().records.at(-1).actual.action,'react');
});
