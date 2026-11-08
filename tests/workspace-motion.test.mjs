import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {commanderState} from '../packages/dsh-skin-core/adapters/commander-state.mjs';
const code=fs.readFileSync(new URL('../packages/dsh-skin-core/adapters/workspace-commander.mjs',import.meta.url),'utf8').replace(/^import.*\n/m,'').replace('export function','function')+'\ninstallWorkspaceCommander';
test('no-pet workspace motion responds to fresh completion, honors the toggle and ignores history',async()=>{
 let frames=new Map(),seq=0,animated=0,cancelled=0,typed='';const classes=new Set();
 const input={get textContent(){return typed;}},anchor={animate(){animated++;return {cancel(){cancelled++;},finished:new Promise(()=>{})};}};
 const doc={visibilityState:'visible',activeElement:{closest:()=>input},body:{classList:{add:()=>{},remove:()=>{},toggle:(name,on)=>{on?classes.add(name):classes.delete(name);}}},addEventListener(){},querySelector:selector=>selector.includes('data-dsh-work-state')?anchor:null};
 const install=vm.runInNewContext(code,{commanderState,WORKSPACE_R2_LEAVES:{},WORKSPACE_COMMANDER_STYLE:'',WORKSPACE_COMMANDER_BUILD:'test',matchMedia:()=>({matches:false,addEventListener(){}}),document:doc,AbortController,console:{info(){}},requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq;},cancelAnimationFrame:id=>frames.delete(id)});
 const config={icons:{},role:null,feedback:true,motion:true,petEcho:false},runtime=install({ctx:{layout:{panelInfo:{getSnapshot:()=>({activePanelId:null})}},slots:{register:()=>()=>{}}},React:{createElement(){}},config,identity:{}});
 const flush=()=>{const current=[...frames.values()];frames.clear();for(const frame of current)frame();};
 runtime.work({sessionId:'s',seq:0,state:'completed'});flush();assert.equal(animated,0);
 runtime.work({sessionId:'s',seq:1,state:'running'});runtime.work({sessionId:'s',seq:2,state:'completed'});flush();assert.equal(animated,1,'empty focused editor must not suppress a completed response');
 runtime.work({sessionId:'s',seq:2,state:'completed'});flush();assert.equal(animated,1);
 runtime.update({...config,motion:false});assert.ok(classes.has('dsh-workspace-motion-off'));assert.equal(cancelled,1);
 runtime.work({sessionId:'s',seq:3,state:'completed'});flush();assert.equal(animated,1);
 runtime.update(config);typed='unsent draft';runtime.work({sessionId:'s',seq:4,state:'completed'});flush();assert.equal(animated,1);
 typed='';runtime.work({sessionId:'s',seq:5,state:'completed'});runtime.dispose();flush();assert.equal(animated,1,'disposal cancels the queued animation');
});
