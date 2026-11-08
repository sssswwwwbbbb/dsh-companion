import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ReplyStyle} from '../packages/dsh-companion/src/reply-style.mjs';
import {PetInteraction} from '../packages/dsh-companion/src/pet-interaction.mjs';
import {validateManifest,resolveSettings} from '../packages/dsh-skin-core/src/schema.mjs';
import {loadSkin} from '../packages/dsh-skin-core/src/resources.mjs';
import {fileURLToPath} from 'node:url';
const declared={name:'领航员',identity:'你是实验室领航员，耐心协助同伴。',workContext:'在工作区准确处理任务。',petContext:'在桌面安静陪伴。',petEnabledDefault:false};
const source=fileURLToPath(new URL('../packages/dsh-companion/skins/archive-workspace-r2-private',import.meta.url));
function system(){
 const selected=loadSkin(source);selected.manifest={...selected.manifest,character:declared};
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-shared-character-'));
 const core={phase:'ready',generation:1,store:{hasStops:()=>false,write:value=>{fs.writeFileSync(path.join(stateDir,'skin-state.json'),JSON.stringify(value));}},queue:async fn=>fn(),state:{selected,overrides:{},disabled:{},stopped:false,results:{pet:{status:'ready'}}}};
 core.view=()=>resolveSettings(core.state.selected.manifest,core.state,{theme:true,pet:true,startup:true});
 let active=true,cancelled=0,section;
 const controller={stateDir,skins:{core},status:()=>({}),interactions:{cancel(){cancelled++;}},entitlement:{status:()=>({active}),require(){if(!active)throw new Error('LICENSE_REQUIRED');}}};
 const sessions=new Map([['alpha',{}],['beta',{}]]),style=new ReplyStyle(controller,sessions);
 style.register({section(value){section=value;return()=>{section=null;};}});controller.replyStyle=style;
 return {selected,controller,core,style,sessions,stateDir,close:()=>fs.rmSync(stateDir,{recursive:true,force:true}),render:id=>section.text({agent:{session:{id}}}),setActive:value=>{active=value;},cancelled:()=>cancelled};
}

test('shared characters are optional and declared only for existing target modules',()=>{
 const original=loadSkin(source).manifest;
 assert.doesNotThrow(()=>validateManifest({...original,character:declared}));
 for(const character of [{...declared,name:''},{...declared,identity:''},{name:'角色',identity:'仅有身份'},{...declared,petContext:42}])assert.throws(()=>validateManifest({...original,character}),/SKIN_FIELDS_INVALID/);
 const workOnly={...original,modules:{theme:structuredClone(original.modules.theme),startup:original.modules.startup},character:{name:'助手',identity:'角色身份',workContext:''}};
 delete workOnly.modules.theme.settings.petEchoEnabled;
 assert.doesNotThrow(()=>validateManifest(workOnly));
 assert.throws(()=>validateManifest({...workOnly,character:declared}),/SKIN_FIELDS_INVALID/);
});

test('work identity and reply style have independent conversation switches and stop/switch/license cleanup',async()=>{
 const s=system();try{
  const key=s.selected.contentKey;
  s.style.session({sessionId:'alpha',contentKey:key,enabled:false});
  assert.equal(s.render('alpha'),'');assert.equal(s.style.petPersona(),null);
  s.style.characterSession({sessionId:'alpha',contentKey:key,enabled:true});
  assert.match(s.render('alpha'),/领航员/);assert.doesNotMatch(s.render('alpha'),/工作区回复风格/);assert.equal(s.render('beta'),'');
  s.style.session({sessionId:'alpha',contentKey:key,enabled:true});assert.match(s.render('alpha'),/工作区回复风格/);
  s.style.characterSession({sessionId:'alpha',contentKey:key,enabled:false});assert.doesNotMatch(s.render('alpha'),/领航员/);assert.match(s.render('alpha'),/工作区回复风格/);
  s.style.characterSession({sessionId:'alpha',contentKey:key,enabled:true});
  await s.style.saveCharacter({contentKey:key,name:'记录员',identity:'你是记录员。',workContext:'工作补充 {{保持字面}}'});
  assert.match(s.render('alpha'),/记录员.*保持字面/s);assert.doesNotMatch(s.render('alpha'),/领航员/);
  s.core.state.stopped=true;assert.equal(s.render('alpha'),'');s.core.state.stopped=false;
  s.setActive(false);assert.equal(s.render('alpha'),'');s.setActive(true);
  s.core.state.selected={...s.selected,contentKey:'other',manifest:{...s.selected.manifest,id:'other',character:undefined,replyStyle:undefined}};delete s.core.state.selected.manifest.character;
  assert.equal(s.render('alpha'),'');
  s.core.state.selected=s.selected;assert.match(s.render('alpha'),/记录员/);
  await assert.rejects(s.style.saveCharacter({contentKey:'stale',identity:'迟到保存'}),/SKIN_OPERATION_SUPERSEDED/);
 }finally{s.close();}
});

test('pet sharing updates manual and autonomous model inputs and preserves the independent persona',async()=>{
 const s=system();try{
  const key=s.selected.contentKey,base=s.core.view().pet.values.persona;
  const pet=new PetInteraction(s.controller,{complete:async({input})=>{assert.match(input.persona,/共用新身份/);return {text:'{"speech":null,"action":null}'};}});
  assert.equal(pet.current().config.persona,base);
  await s.style.characterPet({contentKey:key,enabled:true});
  await s.style.saveCharacter({contentKey:key,name:'同伴',identity:'共用新身份'});
  s.style.save({contentKey:key,address:'搭档',tone:'简短而温和。'});
  assert.match(pet.current().config.persona,/搭档/);assert.match(pet.current().config.persona,/在桌面安静陪伴/);
  const abort=new AbortController();assert.equal(await pet.chooseActivity({choices:[{id:'react',description:'回应'}],workState:'idle',last:null,signal:abort.signal}),null);
  assert.equal(await pet.chooseWorkReaction({previousState:'running',lastResult:null,signal:abort.signal}),null);
  assert.equal(s.core.view().pet.values.persona,base);assert.ok(s.cancelled()>=3);
  await s.style.characterPet({contentKey:key,enabled:false});assert.equal(pet.current().config.persona,base);
  s.core.state=JSON.parse(fs.readFileSync(path.join(s.stateDir,'skin-state.json'),'utf8'));
  const restored=new ReplyStyle(s.controller,s.sessions);restored.register({section:()=>()=>{}});
  assert.equal(restored.characterStatus().identity,'共用新身份');
  s.core.state.overrides={};assert.equal(restored.characterStatus().identity,declared.identity);assert.equal(restored.characterStatus().petEnabled,false);
 }finally{s.close();}
});

test('editing a shared character cancels an in-flight pet reply before it can execute the old persona',async()=>{
 const s=system();try{
  const key=s.selected.contentKey;await s.style.characterPet({contentKey:key,enabled:true});
  s.core.state.overrides[s.selected.manifest.id].pet={smartEnabled:true};
  let resolve,requests=0;
  s.controller.nativeStatus=async()=>({availableActions:['react']});
  s.controller.request=async()=>{requests++;return {action:'react',speech:''};};
  const pet=new PetInteraction(s.controller,{complete:()=>new Promise(r=>{resolve=r;})});s.controller.interactions=pet;
  const pending=pet.interact({text:'打个招呼'}),rejected=assert.rejects(pending,/SKIN_OPERATION_SUPERSEDED/);
  await new Promise(r=>setImmediate(r));
  await s.style.saveCharacter({contentKey:key,identity:'修改后的角色身份'});
  resolve({text:'{"speech":null,"action":"react"}'});await rejected;
  assert.equal(requests,0);assert.equal(pet.status().pending,false);
 }finally{s.close();}
});

test('a late Native acknowledgement cannot overwrite the new character interaction state',async()=>{
 const s=system();try{
  const key=s.selected.contentKey;await s.style.characterPet({contentKey:key,enabled:true});
  let acknowledge;
  s.controller.nativeStatus=async()=>({availableActions:['react']});
  s.controller.request=()=>new Promise(resolve=>{acknowledge=resolve;});
  const pet=new PetInteraction(s.controller,{complete:async()=>({text:'{"speech":null,"action":"react"}'})});s.controller.interactions=pet;
  const pending=pet.interact({text:'旧请求'}),rejected=assert.rejects(pending,/SKIN_OPERATION_SUPERSEDED/);
  await new Promise(resolve=>setImmediate(resolve));
  await s.style.saveCharacter({contentKey:key,identity:'新身份'});
  acknowledge({speech:'',action:'react'});await rejected;
  assert.equal(pet.status().last,null);assert.equal(pet.status().historyCount,0);
 }finally{s.close();}
});

test('same-skin upgrades preserve conversation choices across content keys without inheriting other or unknown owners',()=>{
 const s=system();try{
  s.selected.manifest.replyStyle={address:'搭档',tone:'简短。'};
  const oldKey=s.selected.contentKey,id=s.selected.manifest.id;
  s.style.session({sessionId:'alpha',contentKey:oldKey,enabled:false});
  s.style.session({sessionId:'beta',contentKey:oldKey,enabled:true});
  s.style.characterSession({sessionId:'alpha',contentKey:oldKey,enabled:true});
  // Legacy string choices and keys without an owner can still exist in saved state.
  s.style.commit({...s.style.data,sessions:{...s.style.data.sessions,legacy:oldKey,unknown:{contentKey:'unknown-key',enabled:false}},characterSessions:{...s.style.data.characterSessions,unknown:'unknown-key'}});
  s.core.state.selected={...s.selected,contentKey:'upgraded-key',manifest:{...s.selected.manifest,version:'99.0.0'}};
  const verify=style=>{
   assert.equal(style.sessionStatus('alpha').enabled,false);
   assert.equal(style.sessionStatus('beta').enabled,true);
   assert.equal(style.sessionStatus('legacy').enabled,true);
   assert.equal(style.characterSessionStatus('alpha').enabled,true);
   assert.equal(style.characterSessionStatus('beta').enabled,false);
   assert.equal(style.sessionStatus('unknown').enabled,true,'unknown owner uses the current skin default');
   assert.equal(style.characterSessionStatus('unknown').enabled,false);
  };
  verify(s.style);
  const restored=new ReplyStyle(s.controller,s.sessions);restored.register({section:()=>()=>{}});verify(restored);
  assert.equal(restored.data.skinOwners[oldKey],id);
  // A different skin has its own fallback; old per-conversation choices must not override it.
  s.core.state.selected={...s.core.state.selected,contentKey:'other-key',manifest:{...s.selected.manifest,id:'other-skin'}};
  restored.data.enabledBySkin['other-skin']=false;
  assert.equal(restored.sessionStatus('beta').enabled,false);
  assert.equal(restored.sessionStatus('legacy').enabled,false);
  assert.equal(restored.characterSessionStatus('alpha').enabled,false);
  restored.characterSession({sessionId:'alpha',contentKey:'other-key',enabled:false});
  assert.equal(restored.data.characterSessions.alpha,oldKey,'disabling another skin does not remove the original role choice');
  restored.data.enabledBySkin['other-skin']=true;
  assert.equal(restored.sessionStatus('alpha').enabled,true);
  // Returning to the upgraded skin restores both independent conversation choices.
  s.core.state.selected={...s.selected,contentKey:'upgraded-key'};verify(restored);
  restored.characterSession({sessionId:'alpha',contentKey:'upgraded-key',enabled:false});
  assert.equal(restored.characterSessionStatus('alpha').enabled,false);
  assert.equal(restored.sessionStatus('alpha').enabled,false);
  restored.session({sessionId:'alpha',contentKey:'upgraded-key',enabled:true});
  restored.session({sessionId:'beta',contentKey:'upgraded-key',enabled:false});
  s.core.state.selected={...s.selected,contentKey:'second-upgrade-key'};
  assert.equal(restored.sessionStatus('alpha').enabled,true,'explicit on survives a newer off default');
  assert.equal(restored.sessionStatus('beta').enabled,false);
  assert.equal(restored.sessionStatus('fresh').enabled,false);
 }finally{s.close();}
});
