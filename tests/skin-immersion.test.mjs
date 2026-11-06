import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {validateManifest,resolveSettings} from '../packages/dsh-skin-core/src/schema.mjs';
import {WorkFeedback} from '../packages/dsh-companion/src/work-feedback.mjs';
import {NativeWorkFeedback} from '../runtime-src/work-feedback.mjs';
import {installSessionFeedback} from '../packages/dsh-skin-core/adapters/session-feedback.mjs';
const original=JSON.parse(fs.readFileSync(new URL('../packages/dsh-companion/skins/archive-warm-whale/skin.json',import.meta.url)));
function manifest(){const m=structuredClone(original);m.version='0.7.2';const t=m.modules.theme;t.configVersion=2;t.config.entryMarks={light:'mark-light',dark:'mark-dark'};
 for(const id of Object.values(t.config.entryMarks))m.assets[id]={path:'assets/'+id+'.png',mime:'image/png',bytes:8,sha256:'a'.repeat(64)};
 Object.assign(t.settings,{entryMarkEnabled:{label:'入口标识',default:true},workFeedbackEnabled:{label:'工作反馈',default:true},petEchoEnabled:{label:'桌宠呼应',default:true,showWhen:{field:'workFeedbackEnabled',equals:true}}});return m;}
const available={theme:true,pet:true,startup:true};
test('declarations are opt-in, use package defaults and retain hidden choices without changing exact0.7.1',()=>{
 const state={disabled:{},overrides:{}},old=resolveSettings(original,state,available);assert.equal(Object.values(old).flatMap(x=>x.controls).length,8);assert.equal(old.theme.values.workFeedbackEnabled,undefined);
 const m=validateManifest(manifest()),next=resolveSettings(m,state,available);assert.equal(Object.values(next).flatMap(x=>x.controls).length,11);assert.equal(next.theme.values.petEchoEnabled,true);
 state.overrides[m.id]={theme:{workFeedbackEnabled:false,petEchoEnabled:false}};let v=resolveSettings(m,state,available);assert.equal(v.theme.controls.some(c=>c.field==='petEchoEnabled'),false);
 state.overrides[m.id].theme.workFeedbackEnabled=true;v=resolveSettings(m,state,available);assert.equal(v.theme.controls.find(c=>c.field==='petEchoEnabled').value,false);
 assert.equal(resolveSettings(original,state,available).theme.controls.length,1);
 const svg=manifest();svg.assets['mark-light'].mime='image/svg+xml';assert.throws(()=>validateManifest(svg),/SKIN_ASSET_INVALID/);
 const oldVersion=manifest();oldVersion.modules.theme.configVersion=1;assert.throws(()=>validateManifest(oldVersion),/SKIN_SETTING_UNSUPPORTED/);
 const missingAction=manifest();delete missingAction.modules.pet.config.animations.react;assert.throws(()=>validateManifest(missingAction),/SKIN_SETTING_UNSUPPORTED/);
});
function system(){
 const m=manifest(),state={selected:{manifest:m,contentKey:'a'.repeat(64)},generation:1,stopped:false,pending:null,results:{pet:{status:'ready'}},disabled:{},overrides:{}};
 const core={state,generation:1,phase:'ready',pendingSelections:0,disposed:false,store:{hasStops:()=>false},view:()=>resolveSettings(m,state,available)};
 const page={active:true,client:{id:randomUUID()},available:()=>true};page.lastReady={clientId:page.client.id,generation:1,contentKey:state.selected.contentKey};
 const actions=[],native=new NativeWorkFeedback({snapshot:()=>state.stopped?null:{generation:core.generation,contentKey:state.selected.contentKey,...core.view()},act:action=>{actions.push(action);return action;}});
 const controller={credentials:()=>({}),request:async(_route,body)=>native.deliver(body)},skins={core,page,controller},work=new WorkFeedback(skins);
 const packet=(revision,state='completed',extra={})=>({clientId:page.client.id,work:{generation:1,contentKey:core.state.selected.contentKey,revision,bindingId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',sessionId:'session-a',seq:12,state,reducedMotion:false,...extra}});
 return {m,state,core,page,controller,work,native,actions,packet};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('current page echoes once; stale ownership, stop, action permission and reduced motion suppress actions',async()=>{
 const s=system();s.work.accept(s.packet(1),{});await tick();assert.equal(s.native.reactions,1);assert.deepEqual(s.actions,['react']);
 s.work.accept(s.packet(1),{});s.work.accept(s.packet(2),{});await tick();assert.deepEqual(s.actions,['react']);
 s.state.overrides[s.m.id]={pet:{allowActions:false}};s.work.cancel();await tick();assert.equal(s.actions.at(-1),'idle');
 delete s.state.overrides[s.m.id];
 s.work.accept(s.packet(3,'idle',{bindingId:randomUUID(),sessionId:'session-b'}),{});await tick();assert.equal(s.actions.at(-1),'idle');
 assert.equal(s.work.accept({...s.packet(4),clientId:randomUUID()},{}),null);
 s.state.stopped=true;assert.equal(s.work.accept(s.packet(5),{}),null);await assert.rejects(s.native.deliver({generation:1,contentKey:s.state.selected.contentKey,revision:99,seq:20,sessionId:'session-a',state:'completed'}),/SUPERSEDED/);s.state.stopped=false;
 s.state.overrides[s.m.id]={pet:{allowActions:false}};s.work.accept(s.packet(6,'completed',{seq:22}),{});await tick();assert.equal(s.native.reactions,1);
 delete s.state.overrides[s.m.id];s.work.accept(s.packet(7,'completed',{seq:23,reducedMotion:true}),{});await tick();assert.equal(s.native.reactions,1);
 s.state.disabled.pet=true;s.work.accept(s.packet(8,'completed',{seq:24}),{});await tick();assert.equal(s.native.reactions,1);
});
test('late completion cannot overtake the newer binding cancellation at Native',async()=>{
 const s=system();let release;const wait=new Promise(r=>release=r);
 s.controller.request=async(_route,body)=>{if(body.state==='completed')await wait;return s.native.deliver(body);};
 s.work.accept(s.packet(1),{});s.work.accept(s.packet(2,'idle',{sessionId:'session-b',bindingId:randomUUID()}),{});await tick();release();await tick();
 assert.equal(s.native.reactions,0);assert.equal(s.actions.includes('react'),false);
});
function store(value){const listeners=new Set();return {getSnapshot:()=>value,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},set:v=>{value=v;for(const f of [...listeners])f();},count:()=>listeners.size};}
function session(){const feed=store({entries:[],change:{kind:'replace',entries:[]}}),questions=store({active:[]}),inbox=store({'next-step':[],'next-turn':[]});return {eventSource:feed,questions,inbox,projections:{faceOf:key=>key==='userQuestions'?questions:inbox},append(type,seq,reason){const event={type,seq,data:{turn:1,...reason?{reason:{kind:reason}}:{}}},row={type:'durable',event};feed.set({entries:[...feed.getSnapshot().entries,row],change:{kind:'append',entries:[row]}});}};}
test('observer uses live typed events, durable pending questions and current binding; history and disposed sources stay silent',()=>{
 const a=session(),b=session();a.append('turn/end',5,'completed');
 const current=store({key:'a',hooks:{session:a}}),status=store(new Map([['a',{running:false}]]));let slots=0;const packets=[];
 const dispose=installSessionFeedback({ctx:{get:()=>({adapter:{current},sessionStatus:status}),slots:{register(){slots++;return()=>slots--;}}},React:{createElement(){},useSyncExternalStore(){}},onChange:p=>packets.push(p)});
 assert.equal(packets.some(p=>p.state==='completed'),false);
 a.append('turn/start',6);status.set(new Map([['a',{running:true}]]));a.append('turn/end',7,'error');assert.equal(packets.at(-1).state,'idle');
 a.append('turn/start',8);a.questions.set({active:[{callId:'q',state:'open'}]});status.set(new Map([['a',{running:true}]]));assert.equal(packets.at(-1).state,'attention');
 a.questions.set({active:[]});a.append('turn/end',9,'completed');assert.equal(packets.filter(p=>p.state==='completed').length,1);
 current.set({key:'b',hooks:{session:b}});const before=packets.length;a.append('turn/end',10,'completed');assert.equal(packets.length,before);
 b.append('turn/start',1);b.append('turn/end',2,'completed');assert.equal(packets.at(-1).sessionId,'b');
 dispose();assert.equal(slots,0);const count=packets.length;b.append('turn/end',3,'completed');status.set(new Map());assert.equal(packets.length,count);assert.equal(current.count(),0);assert.equal(status.count(),0);
});
