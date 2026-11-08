import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {NativeSkinRuntime} from '../../.local/dsh-pet-host-20261104/staging/packages/dsh-companion/runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/skin.mjs';
import {NativeWorkFeedback} from './work-feedback.mjs';
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(t,overrides={}){
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-awaitable-'));t.after(()=>fs.rmSync(stateDir,{recursive:true,force:true}));
 const manifest={formatVersion:2,id:'awaitable-pet',version:'0.1.0',name:'Awaitable pet',dshVersions:['0.2.1-rc.5'],assets:{},modules:{pet:{interfaceVersion:1,configVersion:1,required:false,config:{builtinPack:'whale-maid-demo'},settings:{}}}};
 const contentKey=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 fs.mkdirSync(path.join(stateDir,'skin-operations'));fs.writeFileSync(path.join(stateDir,'skin-operations/1.json'),JSON.stringify({manifest,contentKey,assets:{},config:{builtinPack:'whale-maid-demo'}}));
 const native=new NativeSkinRuntime({stateDir,loadPack:()=>({animations:{},profiles:{}}),hide:async()=>{},isReady:()=>true,apply:async()=>{},...overrides});
 return {native,contentKey};
}
test('apply receipt waits for the asynchronous backend, rather than dispatch',async t=>{
 const gate=defer();let entered=false,settled=false;const {native,contentKey}=fixture(t,{apply:async()=>{entered=true;await gate.promise;}});
 const result=native.activate({generation:1,contentKey}).then(x=>(settled=true,x));while(!entered)await tick();assert.equal(settled,false);gate.resolve();assert.equal((await result).ready,true);
});
test('exit receipt waits for actual asynchronous cleanup',async t=>{
 const gate=defer();let entered=false,settled=false;const {native}=fixture(t,{hide:async()=>{entered=true;await gate.promise;}});
 const result=native.exit(2).then(x=>(settled=true,x));while(!entered)await tick();assert.equal(native.visible,false);assert.equal(settled,false);gate.resolve();assert.equal((await result).cleared,true);
});
test('a late apply cannot become ready after stop/supersession',async t=>{
 const gate=defer();let entered=false;const {native,contentKey}=fixture(t,{apply:async()=>{entered=true;await gate.promise;}});
 const result=native.activate({generation:1,contentKey});while(!entered)await tick();await native.exit(2);gate.resolve();await assert.rejects(result,/SKIN_OPERATION_SUPERSEDED/);assert.equal(native.canShow(),false);
});
test('failed backend cleanup does not issue a cleared receipt',async t=>{
 const {native}=fixture(t,{hide:async()=>{throw new Error('BACKEND_STILL_ALIVE');}});await assert.rejects(native.exit(2),/BACKEND_STILL_ALIVE/);
});
const workSnapshot=()=>({generation:1,contentKey:'k',theme:{status:'enabled',values:{workFeedbackEnabled:true,petEchoEnabled:true}},pet:{status:'enabled',values:{allowActions:true,animations:{idle:{},react:{}},actionDescriptions:{react:'reply'}}}});
test('work receipt waits for execution and repeated completed packet stays deduplicated',async()=>{
 const gate=defer();let calls=0,settled=false;const w=new NativeWorkFeedback({snapshot:workSnapshot,act:async()=>{calls++;await gate.promise;return 'react';}});
 const input={generation:1,contentKey:'k',revision:1,state:'completed',sessionId:'current',seq:3};
 const result=w.deliver(input).then(x=>(settled=true,x));await tick();assert.equal(settled,false);assert.equal(w.reactions,0);gate.resolve();assert.equal((await result).action,'react');assert.equal(w.reactions,1);assert.equal((await w.deliver({...input,revision:2})).ignored,true);assert.equal(calls,1);
});
test('work execution finishing after its skin stops is rejected',async()=>{
 const gate=defer();let live=workSnapshot();const w=new NativeWorkFeedback({snapshot:()=>live,act:async()=>{await gate.promise;return 'react';}});
 const result=w.deliver({generation:1,contentKey:'k',revision:1,state:'completed',sessionId:'current',seq:3});await tick();live=null;gate.resolve();await assert.rejects(result,/SKIN_OPERATION_SUPERSEDED/);assert.equal(w.reactions,0);
});
