import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {accepted,stage,acceptedKey,comparisonKey} from './setup.mjs';

const load=file=>import(pathToFileURL(path.join(stage,file)));
const {loadSkin,prepareResources}=await load('packages/dsh-skin-core/src/resources.mjs');
const {validateManifest,resolveSettings}=await load('packages/dsh-skin-core/src/schema.mjs');
const {CompanionSkins}=await load('packages/dsh-companion/src/skins.mjs');
const candidate=loadSkin(path.join(stage,'packages/dsh-companion/skins/archive-workspace-r2-private'));

test('the new declaration preserves the accepted theme, pet, and old comparison',()=>{
 const old=loadSkin(path.join(accepted,'staging/packages/dsh-companion/skins/archive-workspace-r2-private'));
 assert.equal(old.contentKey,acceptedKey);
 assert.deepEqual(candidate.manifest.modules.theme,old.manifest.modules.theme);
 assert.deepEqual(candidate.manifest.modules.pet,old.manifest.modules.pet);
 for(const [id,asset] of Object.entries(old.manifest.assets))assert.deepEqual(candidate.manifest.assets[id],asset);
 assert.equal(Object.keys(prepareResources(candidate)).length,128);
 const comparison=loadSkin(path.join(stage,'packages/dsh-companion/skins/archive-warm-whale'));
 assert.equal(comparison.contentKey,comparisonKey);
 assert.equal(resolveSettings(comparison.manifest,{},{theme:true,pet:true,startup:true}).startup.controls.length,0);
});
test('fixed handoff metadata is bounded and reduction is a declared preference',()=>{
 const manifest=candidate.manifest;
 for(const change of [
  s=>{s.configVersion=1;},s=>{delete s.config.video;},s=>{s.config.handoffSeconds=2;},
  s=>{s.config.stillSeconds=s.config.seconds+1;},s=>{s.settings.handoffSeconds={label:'Handoff',default:.4};},
 ]){
  const edited=structuredClone(manifest);change(edited.modules.startup);
  assert.throws(()=>validateManifest(edited),/SKIN_(CONFIG_INVALID|SETTING_UNSUPPORTED)/);
 }
 const caps={theme:true,pet:true,startup:true};
 assert.equal(resolveSettings(manifest,{},caps).startup.values.reducedMotion,false);
 const state={overrides:{[manifest.id]:{startup:{reducedMotion:true}}},disabled:{startup:true}};
 const resolved=resolveSettings(manifest,state,caps).startup;
 assert.equal(resolved.status,'disabled');assert.equal(resolved.values.reducedMotion,true);
});
test('cold opening receives only the actual committed page identity',async()=>{
 for(const acknowledged of [true,false]){
  const key=candidate.contentKey,requests=[];
  const page={client:{id:'owner'}},state={selected:{contentKey:key},stopped:false,generation:8,results:{theme:{status:'ready'}}};
  const core={generation:8,phase:'ready',state,restore:async()=>{
   assert.equal(requests.length,0);
   state.generation=++core.generation;page.lastReady={clientId:acknowledged?'owner':'stale',generation:core.generation,contentKey:key};
  }};
  const controller={nativeStatus:async()=>({startup:{workspaceHandoff:true,coldPending:true}}),request:async(...args)=>requests.push(args)};
  await CompanionSkins.prototype.restorePage.call({core,page,recoveryClient:'owner',controller},'owner');
  assert.deepEqual(requests,acknowledged?[['/intro/workspace-ready',{generation:9,contentKey:key}]]:[]);
 }
});
