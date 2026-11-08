import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadSkin,prepareResources,resolveSettings,validateManifest} from '../../../packages/dsh-skin-core/src/index.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),design=path.resolve(here,'..'),root=path.resolve(here,'../../..');
const context={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(design,'preview-model.js'),'utf8'),context);
const M=context.module.exports,config=JSON.parse(fs.readFileSync(path.join(design,'content/design-defaults.json'))),base=config.defaults;
const checks=[];
function check(name,body){body();checks.push({name,passed:true});}
let combinations=0;
check('all 28 public prototype fields have legal defaults and a matrix row',()=>{
  assert.equal(Object.keys(config.controls).length,28);
  assert.equal(config.runtimeLoadable,false);
  const matrix=JSON.parse(fs.readFileSync(path.join(design,'content/configuration-matrix-r3.json')));
  for(const [key,c] of Object.entries(config.controls)){
    assert.ok(M.same(c.default,base[key])&&M.valid(c,c.default),key);
    assert.ok(matrix.rows.some(r=>r.field===key&&r.runtime&&r.fallback&&r.override&&r.reset),key);
  }
});
check('D-R2-01 and D-R2-02 state invariants survive 64 preference/capability combinations',()=>{
  for(const scenario of ['available','unavailable'])for(const stopped of [true,false])for(const pet of [true,false])for(const motion of ['system','reduced'])for(const bubbles of [true,false])for(const attention of [true,false]){
    const c={...base,pet,motion,bubbles},state=M.effective(c,scenario,stopped,attention?'needs-user':'idle');
    assert.equal(state.petRunning,!stopped&&pet&&scenario!=='unavailable');
    assert.equal(state.capabilityAvailable,scenario!=='unavailable');
    assert.equal(state.userEnabled,pet);
    assert.equal(state.freezePose,attention);
    if(!state.petRunning)assert.equal(M.plan(c,state,'click','example-deepseek').allowed,false);
    if(attention)assert.equal(M.plan(c,state,'completed','example-deepseek').allowed,false);
    combinations++;
  }
  assert.equal(combinations,64);
});
check('capability recovery preserves user-disabled intent and stored behavior values',()=>{
  const c={...base,pet:false,petScale:120,profile:'lively',autonomous:true,followMouse:true};
  assert.equal(M.effective(c,'unavailable',false,'idle').petStatus,'unavailable');
  assert.equal(M.effective(c,'available',false,'idle').petStatus,'disabled');
  assert.equal(c.petScale,120);assert.equal(c.profile,'lively');
});
check('bubble preference cannot change feedback action or mandatory attention state',()=>{
  for(const bubbles of [true,false]){
    const c={...base,bubbles},s=M.effective(c,'available',false,'needs-user');
    assert.equal(s.freezePose,true);assert.equal(M.plan(c,s,'needs-user','example-deepseek').action,'idle');
  }
});
check('unsupported feedback blocks events while explicit click remains declared',()=>{
  const s=M.effective(base,'unsupported',false,'idle');
  assert.equal(s.feedbackDeclared,false);assert.equal(M.plan(base,s,'completed','example-deepseek').allowed,false);
  assert.equal(M.plan(base,s,'click','example-deepseek').allowed,true);
});
check('mapping off, unmatched model and disabled rows fall back to skin defaults',()=>{
  assert.equal(M.eventRule(base,'completed','example-deepseek').action,'greet');
  const on={...base,mappingEnabled:true};
  assert.equal(M.eventRule(on,'completed','example-deepseek').action,'stretch');
  assert.equal(M.eventRule(on,'completed','example-other').action,'greet');
  assert.equal(M.eventRule({...on,eventRules:on.eventRules.map(r=>({...r,enabled:false}))},'completed','example-deepseek').action,'greet');
});
check('exact model wins over wildcard without reading a real model identifier',()=>{
  const rules=[{id:'wildcard',enabled:true,model:'*',event:'completed',action:'idle',text:'通用'},...base.eventRules];
  assert.ok(M.validRules(rules));
  assert.equal(M.eventRule({...base,mappingEnabled:true,eventRules:rules},'completed','example-deepseek').action,'stretch');
  assert.equal(M.eventRule({...base,mappingEnabled:true,eventRules:rules},'completed','example-other').action,'idle');
});
check('malformed, duplicate, celebratory-attention and executable rules are rejected',()=>{
  const r=base.eventRules[0];
  for(const rules of [[r,{...r,id:'duplicate'}],[{...r,event:'needs-user',action:'greet'}],[{...r,script:'fetch()'}],[{...r,text:'x'.repeat(61)}],[{...r,model:'real-private-id'}]])assert.equal(M.validRules(rules),false);
});
check('per-skin overrides round-trip and default restoration removes override entries',()=>{
  const values={...base,petScale:120,profile:'lively',bubbles:false,clickText:'收到。'};
  const o=M.overrides(config,values);assert.equal(Object.keys(o).length,4);
  assert.ok(M.same(M.resolve(config,o),values));
  assert.equal(Object.keys(M.overrides(config,M.resolve(config,{}))).length,0);
  assert.equal(M.resolve(config,{petScale:999,eventRules:[{script:'x'}]}).petScale,100);
});
check('R2 source, controls and independent evidence remain available unchanged',()=>{
  assert.ok(fs.existsSync(path.join(design,'index-r2.html')));
  assert.ok(fs.existsSync(path.join(design,'revisions/r2/design-defaults.json')));
  const original=JSON.parse(fs.readFileSync(path.join(root,'reports/first-skin/r3-independent-evidence-baseline.json')));
  for(const [name,d] of Object.entries(original))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),d.sha256,name);
});
check('current HTML references only local existing files and generated JS matches JSX',()=>{
  const html=fs.readFileSync(path.join(design,'index.html'),'utf8');
  for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!ref.startsWith('data:')){assert.ok(!/^https?:/.test(ref));assert.ok(fs.existsSync(path.join(design,ref)),ref);}
  const babel={};vm.runInNewContext(fs.readFileSync(path.join(design,'vendor/babel-7.29.0.min.js'),'utf8'),babel);
  for(const name of ['components','screens','app']){
    const js=fs.readFileSync(path.join(design,name+'.js'),'utf8');new vm.Script(js);
    assert.equal(js,babel.Babel.transform(fs.readFileSync(path.join(design,name+'.jsx'),'utf8'),{presets:['react'],filename:name+'.jsx',comments:false,compact:false}).code+'\n');
  }
});
const candidate=loadSkin(path.join(design,'content/archive-warm-whale-config-r3'));
check('R3 candidate is loaded by the unchanged foundation contract with five public settings',()=>{
  const resolved=resolveSettings(candidate.manifest,{},{theme:true,pet:true});
  prepareResources(candidate);assert.equal(resolved.theme.controls.length+resolved.pet.controls.length,5);
  assert.equal(resolved.pet.values.profile,'gentle');assert.equal(resolved.pet.values.autonomous,false);assert.equal(resolved.pet.values.followMouse,false);
});
check('five supported runtime overrides resolve with legal values and zero background',()=>{
  const state={overrides:{[candidate.manifest.id]:{theme:{backgroundOpacity:0},pet:{size:120,profile:'lively',autonomous:true,followMouse:true}}}};
  const resolved=resolveSettings(candidate.manifest,state,{theme:true,pet:true});
  assert.equal(resolved.theme.values.backgroundOpacity,0);assert.equal(resolved.pet.values.size,120);
  assert.equal(resolved.pet.values.profile,'lively');assert.equal(resolved.pet.values.autonomous,true);assert.equal(resolved.pet.values.followMouse,true);
});
check('R3 runtime unavailable and disabled retain different semantics',()=>{
  assert.equal(resolveSettings(candidate.manifest,{},{theme:true,pet:false}).pet.status,'unavailable');
  assert.equal(resolveSettings(candidate.manifest,{disabled:{pet:true}},{theme:true,pet:true}).pet.status,'disabled');
  const bad=structuredClone(candidate.manifest);delete bad.modules.pet.settings.profile.default;
  assert.throws(()=>validateManifest(bad),e=>e.code==='SKIN_DEFAULT_INVALID');
});
check('R1 content identity is unchanged and R3 candidate excludes unimplemented fields and new character',()=>{
  assert.equal(loadSkin(path.join(design,'content/archive-warm-whale')).contentKey,'ffe29076773d8f17b3c90d0794f14ca54ce69844d4b4a8948791f68ae45471d5');
  assert.ok(!candidate.manifest.modules.feedback&&!candidate.manifest.modules.startup);
  assert.equal(candidate.manifest.modules.pet.config.builtinPack,'whale-maid-demo');
  assert.ok(!JSON.stringify(candidate.manifest).includes('character-atlas-r2'));
});
const report={date:'2026-11-03',revision:'R3',scope:'authoring state model, matrix and unchanged foundation loader only',checks,passed:true,preferenceCombinations:combinations,previewFields:Object.keys(config.controls).length,runtimePublicFields:5,runtimeContentKey:candidate.contentKey,newCharacterInRuntime:false,hostBehaviorTested:false,realClientAcceptance:false};
fs.writeFileSync(path.join(root,'reports/first-skin/r3-state-content-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks:checks.length,combinations,runtimeContentKey:candidate.contentKey}));
