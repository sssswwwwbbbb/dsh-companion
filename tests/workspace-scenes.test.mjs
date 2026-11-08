import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateManifest,sceneModelKey} from '../packages/dsh-skin-core/src/schema.mjs';
import {loadSkin} from '../packages/dsh-skin-core/src/resources.mjs';
import {WorkspaceScenes} from '../packages/dsh-companion/src/workspace-scenes.mjs';
import {createWorkspaceCueTracker,resolveWorkspaceScene} from '../packages/dsh-companion/src/workspace-cue-tracker.mjs';

const source=fileURLToPath(new URL('../packages/dsh-skin-core/examples/author-no-pet-v3',import.meta.url));
const presets={model:{badge:{label:'几何徽记',badge:'mark-light',notice:'模型已切换。'}},workspace:{amber:{label:'琥珀',accent:{light:'#A45622',dark:'#E2A56E'},notice:'进入琥珀工作区。'}}};

test('skin scenes require declared raster assets and complete light/dark colors',()=>{
  const skin=loadSkin(source);
  assert.doesNotThrow(()=>validateManifest({...skin.manifest,scenePresets:presets}));
  for(const value of [
    {model:{bad:{label:'缺失',badge:'missing'}}},
    {model:{bad:{label:'视频',portrait:'opening-video'}}},
    {model:{bad:{label:'空素材'}}},
    {workspace:{bad:{label:'缺深色',accent:{light:'#A45622'}}}},
    {workspace:{bad:{label:'非法颜色',accent:{light:'red;background:url(x)',dark:'#123456'}}}},
  ])assert.throws(()=>validateManifest({...skin.manifest,scenePresets:value}),/SKIN_/);
});

test('scene binding writes preserve other preferences, remain skin scoped and clear to default',async()=>{
  const skin=loadSkin(source);skin.manifest=validateManifest({...skin.manifest,scenePresets:presets});
  let saved;
  const core={state:{selected:skin,overrides:{[skin.manifest.id]:{theme:{backgroundOpacity:.3}}},disabled:{},stopped:false},generation:1,phase:'ready',queue:async fn=>fn(),store:{write:value=>{saved=value;}}};
  const page={active:true,lastReady:{clientId:'page-a',generation:1,contentKey:skin.contentKey}};
  const scenes=new WorkspaceScenes({core,page,controller:{entitlement:{require(){}},status:()=>null}});
  const target={provider:'provider',model:'model'},key=sceneModelKey(target);
  await scenes.configure({contentKey:skin.contentKey,kind:'model',target,preset:'badge'});
  assert.equal(saved.overrides[skin.manifest.id].theme.backgroundOpacity,.3);
  assert.equal(scenes.status().bindings.model[key],'badge');
  assert.match(scenes.art({contentKey:skin.contentKey,preset:'badge'}).badge,/^data:image\/png;base64,/);
  assert.equal(scenes.presentation('page-b'),null);
  core.state.disabled.theme=true;
  assert.equal(scenes.presentation('page-a'),null);
  await assert.rejects(scenes.configure({contentKey:'stale',kind:'model',target,preset:'badge'}),/SKIN_OPERATION_SUPERSEDED/);
  await assert.rejects(scenes.configure({contentKey:skin.contentKey,kind:'model',target,preset:'missing'}),/SKIN_SETTING_UNSUPPORTED/);
  await scenes.configure({contentKey:skin.contentKey,kind:'model',target,preset:null});
  assert.equal(scenes.status().bindings.model[key],undefined);
  core.state.selected={...skin,contentKey:'other',manifest:{...skin.manifest,id:'other'}};
  assert.deepEqual(scenes.status().bindings,{});
});

test('scene resolution restores defaults for unmatched routes, workspaces and removed presets',()=>{
  const route=sceneModelKey({provider:'p',model:'m'});
  const scenes={presets,bindings:{model:{[route]:'badge'},workspace:{[JSON.stringify('alpha')]:'amber'}}};
  assert.equal(resolveWorkspaceScene(scenes,route,'alpha').model.id,'badge');
  assert.equal(resolveWorkspaceScene(scenes,route,'alpha').workspace.id,'amber');
  assert.deepEqual(resolveWorkspaceScene(scenes,'other','beta'),{model:null,workspace:null});
  scenes.bindings.model[route]='removed';
  assert.equal(resolveWorkspaceScene(scenes,route,'alpha').model,null);
  assert.equal(sceneModelKey({provider:'p',model:'a:b'}),JSON.stringify(['p','a:b']));
  assert.equal(sceneModelKey(null),null);
});

test('model cues only follow confirmed route changes in the same visible session',()=>{
  let at=10000;
  const tracker=createWorkspaceCueTracker({now:()=>at});
  const state={sessionId:'a',workspaceId:'alpha',contentKey:'skin',workspaceVisible:true,foreground:true,cues:{model:{enabled:true,text:'切换完成。'}}};
  const sample=extra=>tracker.sample({...state,...extra});
  assert.equal(sample({modelKey:null}),null);
  assert.equal(sample({modelKey:'one'}),null);
  assert.equal(sample({modelKey:'one'}),null);
  assert.equal(sample({modelKey:'two'}).kind,'model');
  at+=5000;
  assert.equal(sample({modelKey:'three',sessionId:'b'}),null);
  assert.equal(sample({modelKey:'four',sessionId:'b',quiet:true}),null);
  at+=5000;
  assert.equal(sample({modelKey:'five',sessionId:'b',workspaceVisible:false}),null);
  assert.equal(sample({modelKey:'five',sessionId:'b'}),null);
});

test('model subscriptions stay stable when DSH returns a new service proxy per lookup',async()=>{
  const {observeWorkspaceCues}=await import('../packages/dsh-companion/src/workspace-cue-tracker.mjs');
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  globalThis.window=new EventTarget();
  globalThis.document=Object.assign(new EventTarget(),{hasFocus:()=>true,visibilityState:'visible'});
  const listeners=new Set();
  let subscriptions=0;
  let snapshot={current:{provider:'p',model:'m'},routable:true},shown;
  const modelStore={getSnapshot:()=>snapshot,subscribe:fn=>{subscriptions++;listeners.add(fn);return()=>listeners.delete(fn);}};
  const source=value=>({getSnapshot:()=>value,subscribe:()=>()=>{}});
  const ctx={get(name){
    if(name==='uiSession')return {adapter:{current:source({key:'session-a',hooks:{session:{}}})}};
    if(name==='workspaces')return {list:source({items:[{workspaceId:'alpha',title:'甲区',sessionIds:['session-a']}]})};
    if(name==='modelDirectories')return new Proxy({directoryFor:()=>({store:modelStore})},{});
  },layout:{panelInfo:source({activePanelId:null})}};
  let dispose;
  try{
    dispose=observeWorkspaceCues({ctx,getPreferences:()=>null,getScenes:()=>({contentKey:'skin',presets:{model:{badge:presets.model.badge}},bindings:{model:{[JSON.stringify(['p','m'])]:'badge',[JSON.stringify(['p','second'])]:'badge'}}}),isQuiet:()=>false,subscribe:()=>()=>{},show:cue=>{shown=cue;},showScene(){},showWorkspaces(){}});
    let delivered=0;
    for(const listener of listeners){
      assert.ok(++delivered<5,'resubscribing during delivery requeues the same listener');
      listener();
    }
    snapshot={...snapshot,routable:null};
    for(const listener of listeners)listener();
    snapshot={current:{provider:'p',model:'second'},routable:true};
    for(const listener of listeners)listener();
    assert.equal(shown.kind,'model');
    assert.equal(subscriptions,1);
    assert.equal(listeners.size,1);
  }finally{
    dispose?.();
    globalThis.window=previousWindow;globalThis.document=previousDocument;
  }
  assert.equal(listeners.size,0);
});
