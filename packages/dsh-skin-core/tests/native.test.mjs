import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {pathToFileURL,fileURLToPath} from 'node:url';
import {loadSkin,resolveSettings,digest,cacheSkin,prepareResources,atomicJson} from '../src/index.mjs';
const coreRoot=fileURLToPath(new URL('../',import.meta.url));
async function setup(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-skin-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.symlinkSync(coreRoot,path.join(dir,'skin-core'));
  fs.copyFileSync(fileURLToPath(new URL('../../../runtime-src/skin.mjs',import.meta.url)),path.join(dir,'skin.mjs'));
  fs.copyFileSync(fileURLToPath(new URL('../../../runtime-src/work-feedback.mjs',import.meta.url)),path.join(dir,'work-feedback.mjs'));
  const {NativeSkinRuntime}=await import(pathToFileURL(path.join(dir,'skin.mjs')));return {dir,NativeSkinRuntime};
}
test('native generation fences delayed readiness after exit, and exit releases resources',async t=>{
  const {dir,NativeSkinRuntime}=await setup(t);const skin=loadSkin(path.join(coreRoot,'examples/b'));let ready=false,hidden=0;
  const runtime=new NativeSkinRuntime({stateDir:dir,loadPack:()=>({id:'fixture',animations:{}}),apply:()=>{},hide:()=>hidden++,isReady:()=>ready});
  const config=resolveSettings(skin.manifest,{},{theme:true,pet:true}).pet.values;
  atomicJson(path.join(dir,'skin-operations/1.json'),{manifest:skin.manifest,config,contentKey:skin.contentKey,assets:{}});
  const activation=runtime.activate({generation:1,contentKey:skin.contentKey});runtime.exit(2);ready=true;
  await assert.rejects(activation,/SKIN_OPERATION_SUPERSEDED/);assert.equal(runtime.visible,false);assert.equal(runtime.contentKey,null);assert.deepEqual(runtime.resources,{});assert.ok(hidden>=2);
});
test('native successful readiness carries content identity and stop writes separate request',async t=>{
  const {dir,NativeSkinRuntime}=await setup(t);const skin=loadSkin(path.join(coreRoot,'examples/b'));let expected;
  const runtime=new NativeSkinRuntime({stateDir:dir,loadPack:()=>({id:'fixture',animations:{}}),apply:x=>expected=x.token,hide:()=>{},isReady:token=>token===expected});
  atomicJson(path.join(dir,'skin-operations/3.json'),{manifest:skin.manifest,config:resolveSettings(skin.manifest,{},{theme:true,pet:true}).pet.values,contentKey:skin.contentKey,assets:{}});
  const result=await runtime.activate({generation:3,contentKey:skin.contentKey});assert.equal(result.ready,true);assert.equal(result.contentKey,skin.contentKey);assert.equal(runtime.visible,true);
  runtime.requestStop();assert.equal(runtime.visible,false);assert.equal(runtime.pausedMedia,true);assert.equal(fs.existsSync(path.join(dir,'skin-state.json')),false);assert.equal(fs.readdirSync(path.join(dir,'skin-stop-requests')).length,1);
});
test('cached content survives source edits and isolates identical names across updates',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skin-cache-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const root=path.join(dir,'author');fs.mkdirSync(root);const manifest=loadSkin(path.join(coreRoot,'examples/a')).manifest;
  const first=Buffer.from('89504e470d0a1a0a000000000000','hex');manifest.assets.texture={path:'same.png',mime:'image/png',bytes:first.length,sha256:digest(first)};manifest.modules.theme.config.background='texture';fs.writeFileSync(path.join(root,'same.png'),first);fs.writeFileSync(path.join(root,'skin.json'),JSON.stringify(manifest));
  const cached=cacheSkin(loadSkin(root),dir);const second=Buffer.concat([first,Buffer.from('x')]);fs.writeFileSync(path.join(root,'same.png'),second);manifest.assets.texture.bytes=second.length;manifest.assets.texture.sha256=digest(second);fs.writeFileSync(path.join(root,'skin.json'),JSON.stringify(manifest));
  const updated=cacheSkin(loadSkin(root),dir);assert.notEqual(cached.root,updated.root);assert.deepEqual(prepareResources(cached).texture.data,first);assert.deepEqual(prepareResources(updated).texture.data,second);
});
