import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadSkin} from '../packages/dsh-skin-core/src/resources.mjs';
import {resolveSettings,validateManifest} from '../packages/dsh-skin-core/src/schema.mjs';
import {petActivitySettings} from '../packages/dsh-skin-core/src/pet-activities.mjs';
import {PetActivities} from '../packages/dsh-companion/src/pet-activities.mjs';
import {PetInteraction} from '../packages/dsh-companion/src/pet-interaction.mjs';
import {WorkFeedback} from '../packages/dsh-companion/src/work-feedback.mjs';
import {NativeWorkFeedback} from '../runtime-src/work-feedback.mjs';
const source=new URL('../packages/dsh-companion/skins/archive-workspace-r2-private',import.meta.url);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function system(){
  const selected=loadSkin(fileURLToPath(source)),state={selected,overrides:{},disabled:{},stopped:false,pending:null,results:{pet:{status:'ready'}}};
  let at=0,saved,playback=null,choice='walk';const calls=[],played=[];
  const core={state,generation:1,phase:'ready',pendingSelections:0,store:{hasStops:()=>false,write:value=>{saved=structuredClone(value);}},queue:async fn=>fn(),view:()=>resolveSettings(selected.manifest,core.state,{theme:true,pet:true,startup:true})};
  const page={active:true,client:{id:randomUUID()},available:()=>true,lastReady:{generation:1,contentKey:selected.contentKey}};page.lastReady.clientId=page.client.id;
  const controller={focus:{quiet:false},credentials:()=>({}),entitlement:{require(){}},status:()=>({}),nativeStatus:async()=>({workReactionAvailable:playback===null||playback.action==='idle',availableActions:['idle','react','walk']})};
  const skins={core,page,controller};controller.skins=skins;
  const native=new NativeWorkFeedback({snapshot:()=>({generation:core.generation,contentKey:core.state.selected.contentKey,...core.view(),petActivities:petActivitySettings(core.state.selected.manifest,core.state.selected.contentKey,core.state)}),playReaction:async(guard,action='react')=>{
    guard();if(playback&&playback.action!=='idle')return null;
    const owned=playback={action};played.push(action);
    return ()=>{if(playback!==owned)return null;playback={action:'idle'};played.push('idle');return 'idle';};
  }});
  controller.request=async(route,value)=>route==='/skin/activity'?native.activity(value):route==='/skin/activity/cancel'?native.cancelActivity(value):route==='/skin/work'?native.deliver(value):{action:value.action,speech:value.speech};
  skins.work=new WorkFeedback(skins);
  controller.interactions=new PetInteraction(controller,{complete:async args=>{calls.push(args);return {text:JSON.stringify({speech:null,action:choice})};}});
  const activities=skins.activities=new PetActivities(skins,{now:()=>at});
  let revision=0;
  const work=state=>skins.work.accept({clientId:page.client.id,work:{generation:core.generation,contentKey:core.state.selected.contentKey,revision:++revision,bindingId:randomUUID(),sessionId:'session-a',seq:10,state,reducedMotion:false}},{});
  work('idle');
  return {selected,core,controller,skins,native,activities,calls,played,work,setAt:value=>{at=value;},setChoice:value=>{choice=value;},manual:()=>{playback={action:'manual'};},saved:()=>saved};
}
const configure=(s,field,value)=>s.activities.configure({contentKey:s.selected.contentKey,field,value});

test('authors opt in with finite declared clips; accepted Cold Start gets a catalogue without rewriting its manifest',()=>{
  const s=system();
  assert.equal(s.activities.status().enabled,false);
  assert.deepEqual(s.activities.status().actions.map(row=>row.id),['react','walk']);
  const manifest=structuredClone(s.selected.manifest);
  manifest.modules.pet.config.activityDescriptions={walk:'缓步向左'};
  assert.doesNotThrow(()=>validateManifest(manifest));
  for(const invalid of [{idle:'待机'},{sleep:'睡着'},{run:'没有素材的跑步'}]){
    manifest.modules.pet.config.activityDescriptions=invalid;
    assert.throws(()=>validateManifest(manifest),/SKIN_SETTING_UNSUPPORTED/);
  }
  assert.equal(petActivitySettings({...manifest,modules:{}},'unknown',{overrides:{}}),null);
});

test('automatic decisions wait for the configured interval, execute an available action, and retain per-skin preferences',async()=>{
  const s=system();await tick();
  await s.activities.maintain(await s.controller.nativeStatus());assert.equal(s.calls.length,0);
  await configure(s,'enabled',true);
  s.setAt(179999);await s.activities.maintain(await s.controller.nativeStatus());assert.equal(s.calls.length,0);
  s.setAt(180001);await s.activities.maintain(await s.controller.nativeStatus());assert.equal(s.calls.length,1);
  assert.deepEqual(s.played,['walk']);assert.equal(s.activities.status().last.action,'walk');
  assert.equal(s.calls[0].input.trigger,'idle-activity');assert.equal(s.calls[0].input.capabilities.speech,false);
  assert.equal(s.calls[0].input.user,undefined);assert.equal(s.calls[0].input.recent,undefined);
  await configure(s,'actions',{action:'walk',enabled:false});await tick();
  assert.equal(s.saved().overrides[s.selected.manifest.id].pet.activities.actions.walk,false);
  assert.equal(s.activities.status().actions.find(row=>row.id==='walk').enabled,false);
  assert.deepEqual(s.played,['walk','idle']);
  s.setChoice('react');await s.activities.preview({contentKey:s.selected.contentKey});
  assert.deepEqual(s.calls.at(-1).input.capabilities.actions.map(row=>row.id),['react']);
  s.manual();s.activities.cancel();await tick();assert.equal(s.played.at(-1),'react');
  await configure(s,'reset',null);assert.equal(s.activities.status().enabled,false);assert.equal(s.activities.status().last,null);
  assert.equal(s.activities.status().actions.every(row=>row.enabled),true);
});

test('work, quiet, permission, page loss, and manual input suppress or cancel automatic activities',async()=>{
  const s=system();await tick();await configure(s,'enabled',true);
  for(const block of [()=>{s.controller.focus.quiet=true;},()=>{s.core.state.disabled.pet=true;},()=>{s.skins.page.active=false;},()=>{s.work('running');}]){
    block();s.setAt(1000000);await s.activities.maintain(await s.controller.nativeStatus());assert.equal(s.calls.length,0);
    s.controller.focus.quiet=false;s.core.state.disabled.pet=false;s.skins.page.active=true;s.work('idle');await tick();
  }
  let resolve;let input;
  s.controller.interactions.model.complete=args=>{input=args;return new Promise(r=>{resolve=r;});};
  const pending=s.activities.preview({contentKey:s.selected.contentKey});await tick();
  s.work('attention');resolve({text:'{"speech":null,"action":"walk"}'});await pending;
  assert.equal(input.signal.aborted,true);assert.deepEqual(s.played,[]);
  s.work('idle');await tick();s.controller.interactions.model.complete=async()=>({text:'{"speech":null,"action":"walk"}'});
  await s.activities.preview({contentKey:s.selected.contentKey});
  s.manual();s.activities.cancel();await tick();assert.deepEqual(s.played,['walk']);
});

test('model silence, invalid actions and failures stay idle, and disabled action choices are enforced again by Native',async()=>{
  const s=system();await tick();await configure(s,'enabled',true);
  s.setChoice(null);await s.activities.preview({contentKey:s.selected.contentKey});assert.equal(s.activities.status().last.result,'quiet');
  s.setChoice('invented');await s.activities.preview({contentKey:s.selected.contentKey});assert.equal(s.activities.status().last.result,'unavailable');
  s.controller.interactions.model.complete=async()=>{throw new Error('offline');};
  await s.activities.preview({contentKey:s.selected.contentKey});assert.equal(s.activities.status().last.result,'unavailable');assert.deepEqual(s.played,[]);
  await configure(s,'actions',{action:'walk',enabled:false});
  const result=await s.native.activity({generation:1,contentKey:s.selected.contentKey,owner:randomUUID(),action:'walk'});
  assert.equal(result.action,null);assert.deepEqual(s.played,[]);
  await assert.rejects(configure(s,'intervalMinutes',0),/SKIN_SETTING_UNSUPPORTED/);
  await assert.rejects(s.activities.configure({contentKey:'stale',field:'enabled',value:true}),/SKIN_OPERATION_SUPERSEDED/);
});

test('leaving the live work observer pauses scheduling while an explicit preview and manual input retain their own priority',async()=>{
  const s=system();await tick();await configure(s,'enabled',true);s.setChoice(null);
  s.skins.work.accepted={...s.skins.work.accepted,observing:false,observedState:'idle'};
  s.setAt(1000000);await s.activities.maintain(await s.controller.nativeStatus());assert.equal(s.calls.length,0);
  await s.activities.preview({contentKey:s.selected.contentKey});assert.equal(s.calls.length,1);
  let resolve;
  s.controller.interactions.model.complete=()=>new Promise(r=>{resolve=r;});
  const pending=s.activities.preview({contentKey:s.selected.contentKey});await tick();
  await s.controller.interactions.interact({text:'和我打个招呼'});
  resolve({text:'{"speech":null,"action":"walk"}'});await pending;
  assert.deepEqual(s.played,[]);assert.equal(s.activities.status().pending,false);
});

test('dragging or resizing while a model decides suppresses its late automatic movement',async()=>{
  const s=system();await tick();await configure(s,'enabled',true);
  let bounds={x:100,y:100,width:300,height:350},resolve;
  s.controller.nativeStatus=async()=>({workReactionAvailable:true,availableActions:['react','walk'],window:{bounds:{...bounds}}});
  s.controller.interactions.model.complete=()=>new Promise(r=>{resolve=r;});
  const pending=s.activities.preview({contentKey:s.selected.contentKey});await tick();
  bounds={...bounds,x:700};resolve({text:'{"speech":null,"action":"walk"}'});await pending;
  assert.deepEqual(s.played,[]);assert.equal(s.activities.status().last.result,'quiet');
});
