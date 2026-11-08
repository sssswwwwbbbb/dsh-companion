import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateManifest,resolveSettings} from '../src/schema.mjs';
import {loadSkin,cacheSkin,prepareResources,materializeResources,digest} from '../src/resources.mjs';
import {atomicJson,initialState,requestStop} from '../src/state.mjs';
import {CompanionSkins} from '../../dsh-companion/src/skins.mjs';
const project=fileURLToPath(new URL('../../../',import.meta.url)),core=path.join(project,'packages/dsh-skin-core'),sample=path.join(core,'examples/startup-poster');
async function setup(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'startup-skin-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.symlinkSync(core,path.join(dir,'skin-core'));for(const name of ['startup-skin.mjs','skin.mjs','work-feedback.mjs'])fs.copyFileSync(path.join(project,'runtime-src',name),path.join(dir,name));
  const {NativeStartupRuntime}=await import(pathToFileURL(path.join(dir,'startup-skin.mjs'))),{NativeSkinRuntime}=await import(pathToFileURL(path.join(dir,'skin.mjs')));
  const author=path.join(dir,'author');fs.mkdirSync(path.join(author,'assets'),{recursive:true});
  fs.copyFileSync(path.join(sample,'skin.json'),path.join(author,'skin.json'));
  fs.copyFileSync(path.join(sample,'assets/archive-grid.png'),path.join(author,'assets/archive-grid.png'));
  const skin=cacheSkin(loadSkin(author),dir),state={...initialState(),generation:1,selected:skin,results:{theme:{status:'ready'},startup:{status:'ready'}}};
  atomicJson(path.join(dir,'skin-state.json'),state);return {dir,skin,state,NativeStartupRuntime,NativeSkinRuntime};
}
function operation(dir,skin,state,generation,{resumeStop=false,operationId='new-explicit-choice'}={}){
  state.generation=generation;state.pending={operationId,contentKey:skin.contentKey};atomicJson(path.join(dir,'skin-state.json'),state);
  const config=resolveSettings(skin.manifest,{},{theme:true,startup:true}).startup.values,assets=materializeResources(prepareResources(skin),path.join(dir,'skin-assets',skin.contentKey));
  atomicJson(path.join(dir,'skin-startup-operations',generation+'.json'),{manifest:skin.manifest,contentKey:skin.contentKey,config,assets,resumeStop,operationId});
  return {generation,contentKey:skin.contentKey};
}
test('startup poster is sufficient; resource types, fixed fields and 1–15s budget are enforced',()=>{
  const manifest=loadSkin(sample).manifest;validateManifest(manifest);assert.equal(resolveSettings(manifest,{},{theme:true,startup:true}).startup.status,'enabled');
  for(const change of [m=>delete m.modules.startup.config.poster,m=>m.modules.startup.config.seconds=.9,m=>m.modules.startup.config.seconds=15.1,m=>m.modules.startup.config.video='archive-poster',m=>m.modules.startup.config.enabled=true,m=>m.modules.startup.settings.seconds={label:'时长',default:2}]){
    const m=structuredClone(manifest);change(m);assert.throws(()=>validateManifest(m));
  }
});
test('native registration is independent of pet readiness and owns its resource map',async t=>{
  const {dir,skin,state,NativeStartupRuntime,NativeSkinRuntime}=await setup(t);let cancels=0;
  const startup=new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5',onCancel:()=>cancels++});
  assert.equal(cancels,0);assert.equal(startup.canPlay(),true);assert.equal(startup.status().ready,true);
  const identity=operation(dir,skin,state,2);assert.equal(startup.activate(identity).ready,true);assert.equal(startup.status().contentKey,skin.contentKey);
  const pet=new NativeSkinRuntime({stateDir:dir,hide(){},loadPack(){},apply(){},isReady:()=>false});pet.exit(2);
  const playback=startup.playback();assert.equal(playback.video,null);assert.equal(startup.resource(new URL('dsh-companion://app'+playback.poster)).status,200);assert.equal(startup.canPlay(playback),true);
  startup.exit({generation:3,declared:true});assert.equal(startup.status().ready,false);assert.equal(startup.declared,true);assert.equal(startup.resource(new URL('dsh-companion://app'+playback.poster)).status,404);assert.throws(()=>startup.playback(),/STARTUP_NOT_REGISTERED/);
});
test('same id updated content refreshes identity; stale generation and old resources cannot return',async t=>{
  const {dir,skin,state,NativeStartupRuntime}=await setup(t),startup=new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'}),old=startup.playback();
  const updated=structuredClone(skin);updated.manifest.modules.startup.config.greeting='同 ID 更新后的文案。';updated.contentKey=digest(JSON.stringify(updated.manifest));
  const identity=operation(dir,updated,state,2);startup.activate(identity);const current=startup.playback();
  assert.notEqual(current.contentKey,old.contentKey);assert.equal(current.greeting,'同 ID 更新后的文案。');assert.equal(startup.canPlay(old),false);assert.equal(startup.resource(new URL('dsh-companion://app'+old.poster)).status,404);
  startup.exit({generation:3,declared:true});assert.throws(()=>startup.activate(identity),/SKIN_OPERATION_SUPERSEDED/);assert.equal(startup.canPlay(current),false);
});
test('independent stop survives restore and mismatched explicit resume; only current Host choice releases it',async t=>{
  const {dir,skin,state,NativeStartupRuntime}=await setup(t),startup=new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'}),before=startup.playback();
  requestStop(dir);startup.stop();assert.equal(startup.canPlay(before),false);
  let identity=operation(dir,skin,state,2,{resumeStop:true});assert.throws(()=>startup.activate(identity),/SKIN_STOP_REQUESTED/);
  fs.rmSync(path.join(dir,'skin-stop-requests'),{recursive:true});state.stopped=true;
  identity=operation(dir,skin,state,3);assert.throws(()=>startup.activate(identity),/SKIN_STOP_REQUESTED/);
  identity=operation(dir,skin,state,4,{resumeStop:true});state.pending.operationId='different';atomicJson(path.join(dir,'skin-state.json'),state);assert.throws(()=>startup.activate(identity),/SKIN_STOP_REQUESTED/);
  identity=operation(dir,skin,state,5,{resumeStop:true});assert.equal(startup.activate(identity).ready,true);assert.equal(startup.canPlay(),true);assert.equal(startup.canPlay(before),false);
});
test('cold boot only registers last successful compatible snapshot; disabled/pending/stopped never falls back',async t=>{
  const {dir,state,NativeStartupRuntime}=await setup(t);
  for(const mutate of [s=>s.stopped=true,s=>s.pending={operationId:'unsettled'},s=>s.disabled.startup=true,s=>s.results.startup.status='unavailable']){
    const value=structuredClone(state);mutate(value);atomicJson(path.join(dir,'skin-state.json'),value);const runtime=new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'});assert.equal(runtime.canPlay(),false);assert.equal(runtime.declared,true);
  }
  atomicJson(path.join(dir,'skin-state.json'),state);assert.equal(new NativeStartupRuntime({stateDir:dir,dshVersion:'different'}).canPlay(),false);
  requestStop(dir);assert.equal(new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'}).canPlay(),false);fs.rmSync(path.join(dir,'skin-stop-requests'),{recursive:true});
  const legacy=structuredClone(state);delete legacy.selected.manifest.modules.startup;atomicJson(path.join(dir,'skin-state.json'),legacy);assert.equal(new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'}).declared,false);
});
test('page recovery lets the same opening finish once before advancing the coordinator',async()=>{
  let polls=0,restores=0;const core={generation:7,timeout:1000,pendingSelections:0,state:{stopped:false,selected:{contentKey:'same'}},restore:async()=>{restores++;assert.ok(polls>=2);}};
  const service={core,recoveryClient:'page',page:{client:{id:'page'}},controller:{nativeStatus:async()=>({startup:{playing:++polls===1,contentKey:'same',generation:7,durationSeconds:1.2,elapsedSeconds:.5}})}};
  await CompanionSkins.prototype.restorePage.call(service,'page');assert.equal(restores,1);assert.equal(core.generation,7);
});
test('an explicit stop during page recovery wins instead of restoring the captured choice',async()=>{
  let polls=0,restores=0;const core={generation:7,timeout:1000,pendingSelections:0,state:{stopped:false,selected:{contentKey:'same'}},restore:async()=>restores++};
  const service={core,recoveryClient:'page',page:{client:{id:'page'}},controller:{nativeStatus:async()=>{if(++polls===2){core.generation++;core.state.stopped=true;}return {startup:{playing:true,contentKey:'same',generation:7,durationSeconds:1.2,elapsedSeconds:.5}};}}};
  await CompanionSkins.prototype.restorePage.call(service,'page');assert.equal(restores,0);
});
