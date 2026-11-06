import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import vm from 'node:vm';import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateManifest,resolveSettings} from '../src/schema.mjs';
import {digest,loadSkin,materializeResources,prepareResources} from '../src/resources.mjs';
import {atomicJson} from '../src/state.mjs';
import {PetBehavior} from '../../../designs/dsh-companion-v1/behavior.mjs';
const project=fileURLToPath(new URL('../../../',import.meta.url));
function subset(){
  const m=JSON.parse(fs.readFileSync(path.join(project,'packages/dsh-skin-core/examples/interaction/skin.json')));m.id='partial-pet';m.modules.pet.configVersion=2;
  const pet=m.modules.pet;pet.config={builtinPack:'whale-maid-demo',canvasHeight:195,animations:{idle:{asset:'idle-clip',seconds:3,loop:true},react:{asset:'react-clip',seconds:1.8,loop:false}},actionDescriptions:{idle:'待机',react:'回应'}};
  for(const field of ['autonomous','followMouse','profile'])delete pet.settings[field];
  for(const name of ['idle','react']){const source='packages/dsh-companion/skins/archive-warm-whale/assets/'+name+'-a2.webm',data=fs.readFileSync(path.join(project,source));m.assets[name+'-clip']={path:name+'.webm',mime:'video/webm',bytes:data.length,sha256:digest(data)};}
  return m;
}
test('pet config v2 accepts only declared idle/react; v1 retains full-pack semantics',()=>{
  const m=subset();validateManifest(m);assert.equal(resolveSettings(m,{},{theme:true,pet:true}).pet.values.canvasHeight,195);
  m.modules.pet.configVersion=1;assert.throws(()=>validateManifest(m),/SKIN_CONFIG_INVALID/);
  delete m.modules.pet.config.animations;validateManifest(m);assert.equal(resolveSettings(m,{},{pet:true,theme:true}).pet.status,'enabled');
});
test('partial resources require idle and do not offer unavailable autonomous/follow modes',()=>{
  for(const change of [m=>delete m.modules.pet.config.animations.idle,m=>m.modules.pet.config.animations.fly={asset:'react-clip',seconds:1,loop:false},m=>m.modules.pet.settings.autonomous={label:'自主',default:false},m=>m.modules.pet.config.followMouse=true]){
    const m=subset();change(m);assert.throws(()=>validateManifest(m));
  }
});
test('native subset replaces all old clips; returning to old v1 restores the actual complete pack',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'partial-pet-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.symlinkSync(path.join(project,'packages/dsh-skin-core'),path.join(dir,'skin-core'));for(const name of ['skin.mjs','work-feedback.mjs'])fs.copyFileSync(path.join(project,'runtime-src',name),path.join(dir,name));
  const {NativeSkinRuntime}=await import(pathToFileURL(path.join(dir,'skin.mjs'))),author=path.join(dir,'author');fs.mkdirSync(author);
  fs.writeFileSync(path.join(author,'skin.json'),JSON.stringify(subset()));for(const name of ['idle','react'])fs.copyFileSync(path.join(project,'packages/dsh-companion/skins/archive-warm-whale/assets/'+name+'-a2.webm'),path.join(author,name+'.webm'));
  const skin=loadSkin(author),resources=prepareResources(skin),assets=materializeResources(resources,path.join(dir,'skin-assets',skin.contentKey));let applied;
  const runtime=new NativeSkinRuntime({stateDir:dir,loadPack:()=>JSON.parse(fs.readFileSync(path.join(project,'packages/dsh-companion/packs/whale-maid.json'))),apply:value=>{applied=value;},hide(){},isReady:token=>token===applied?.token});
  atomicJson(path.join(dir,'skin-operations/1.json'),{manifest:skin.manifest,config:resolveSettings(skin.manifest,{},{theme:true,pet:true}).pet.values,contentKey:skin.contentKey,assets});await runtime.activate({generation:1,contentKey:skin.contentKey});
  assert.deepEqual(Object.keys(applied.pack.animations),['idle','react']);assert.equal(applied.pack.canvasHeight,195);assert.ok(Object.values(applied.pack.animations).every(x=>x.file.startsWith('skin-resource/'+skin.contentKey+'/')));
  runtime.exit(2);const old=loadSkin(path.join(project,'packages/dsh-skin-core/examples/b'));atomicJson(path.join(dir,'skin-operations/3.json'),{manifest:old.manifest,config:resolveSettings(old.manifest,{},{pet:true,theme:true}).pet.values,contentKey:old.contentKey,assets:{}});await runtime.activate({generation:3,contentKey:old.contentKey});assert.equal(Object.keys(applied.pack.animations).length,12);assert.equal(applied.pack.canvasHeight,300);
});
test('local action rejects absent clip and leftover behavior falls back to idle without replay',()=>{
  const source=fs.readFileSync(path.join(project,'runtime-src/main.mjs'),'utf8'),start=source.indexOf('function perform(action){'),end=source.indexOf('\nasync function deliverInteraction',start),fallbackStart=source.indexOf('function settleUnsupportedAction(){'),fallbackEnd=source.indexOf('\nfunction resolveDisplay()',fallbackStart);
  const model=new PetBehavior(),context={authorization(){},actions:new Set(['react','stretch']),readyActions:['idle','react'],pack:{animations:{idle:{seconds:3},react:{seconds:1.8}}},model,say(){},sendState(){},status:()=>({action:model.action})};
  vm.createContext(context);vm.runInContext(source.slice(start,end)+'\n'+source.slice(fallbackStart,fallbackEnd)+'\nthis.perform=perform;this.settle=settleUnsupportedAction;',context);
  assert.throws(()=>context.perform('stretch'),/ACTION_UNAVAILABLE/);assert.equal(context.perform('react').action,'react');model.action='stretch';context.settle();assert.equal(model.action,'idle');assert.equal(model.remaining,3);
});
