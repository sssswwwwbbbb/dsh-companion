import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {stage,acceptedKey} from './setup.mjs';

const {CompanionSkins}=await import(pathToFileURL(path.join(stage,'packages/dsh-companion/src/skins.mjs')));
test('cold ready uses native status after the real page commit, then rechecks the owner',async()=>{
 for(const [name,change] of [['late bridge',null],['stale ack','ack'],['new generation','generation'],['new owner','client']]){
  const page={client:{id:'current'}},requests=[],observations=[];
  const state={selected:{contentKey:acceptedKey,manifest:{modules:{startup:{config:{handoffSeconds:.35}}}}},
   stopped:false,generation:7,results:{theme:{status:'ready'},startup:{status:'ready'}}};
  const core={phase:'ready',generation:7,timeout:20000,state,restore:async()=>{
   assert.deepEqual(observations,['bridge absent']);
   state.generation=++core.generation;
   page.lastReady={clientId:change==='ack'?'previous':'current',generation:8,contentKey:acceptedKey};
  }};
  const controller={nativeStatus:async()=>{
   if(!observations.length){observations.push('bridge absent');return {running:false};}
   observations.push('bridge ready');
   if(change==='generation')state.generation=++core.generation;
   if(change==='client')page.client={id:'new-owner'};
   return {startup:{workspaceHandoff:true,coldPending:true,generation:8,contentKey:acceptedKey}};
  },request:async(...args)=>requests.push(args)};
  await CompanionSkins.prototype.restorePage.call({core,page,recoveryClient:'current',controller},'current');
  assert.deepEqual(requests,change?[]:[['/intro/workspace-ready',{generation:8,contentKey:acceptedKey}]],name);
  assert.deepEqual(observations,change==='ack'?['bridge absent']:['bridge absent','bridge ready'],name);
 }
});
