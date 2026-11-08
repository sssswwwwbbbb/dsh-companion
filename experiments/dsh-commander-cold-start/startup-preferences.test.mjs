import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import {stage} from './setup.mjs';

const plugin=path.join(stage,'packages/dsh-companion');
const core=path.join(stage,'packages/dsh-skin-core');
const load=file=>import(pathToFileURL(file));
const {StateStore,initialState}=await load(path.join(core,'src/state.mjs'));
const {SkinCoordinator}=await load(path.join(core,'src/coordinator.mjs'));
const {cacheSkin,loadSkin}=await load(path.join(core,'src/resources.mjs'));
const {NativeStartupAdapter}=await load(path.join(core,'adapters/startup.mjs'));
const {NativeStartupRuntime}=await load(path.join(plugin,'runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/startup-skin.mjs'));

test('the two opening choices commit in place and the next native playback reads both current values',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-startup-choices-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const skin=cacheSkin(loadSkin(path.join(plugin,'skins/archive-workspace-r2-private')),dir);
 const store=new StateStore(dir);
 const generation=6;
 store.write({...initialState(),generation,selected:skin,results:{startup:{status:'ready'}}});
 const oldNative={start(){assert.fail('restarted native runtime');},request(){assert.fail('sent a native update');}};
 const coordinator=new SkinCoordinator({store,adapters:{startup:new NativeStartupAdapter(oldNative)},dshVersion:'0.2.1-rc.5'});
 coordinator.phase='ready';
 const runtime=new NativeStartupRuntime({stateDir:dir,dshVersion:'0.2.1-rc.5'});
 const first=runtime.playback();
 assert.equal(first.soundEnabled,false);
 assert.equal(first.reducedMotion,false);
 assert.deepEqual([first.name,first.roleName,first.roleModel],['冷启动','单元-07','CS-07']);
 for(const [field,value] of [['soundEnabled',true],['reducedMotion',true],['reducedMotion',false],['soundEnabled',false]]){
  await coordinator.update({module:'startup',field,value,contentKey:skin.contentKey});
  assert.equal(coordinator.generation,generation);
  assert.equal(store.read().overrides[skin.manifest.id].startup[field],value);
  assert.equal(runtime.playback()[field],value);
  assert.equal(runtime.playback().videoSha,first.videoSha);
 }
 assert.equal(first.soundEnabled,false);
 const stale=store.read();
 store.write({...stale,generation:generation+1});
 assert.throws(()=>runtime.playback(),{code:'SKIN_OPERATION_SUPERSEDED'});
});
