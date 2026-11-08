import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceCueTracker} from '../packages/dsh-companion/src/workspace-cue-tracker.mjs';
import {WorkspaceCues} from '../packages/dsh-companion/src/workspace-cues.mjs';
import {validateManifest,loadSkin} from '../packages/dsh-skin-core/src/index.mjs';
import {fileURLToPath} from 'node:url';

const cues={
  welcome:{text:'欢迎回来。',default:false,enabled:true},
  session:{text:'会话已切换。',default:false,enabled:true},
  workspace:{text:'工作区已切换。',default:false,enabled:true},
};
test('workspace cues distinguish a return, a session switch, and a workspace switch',()=>{
  let at=0;
  const tracker=createWorkspaceCueTracker({now:()=>at});
  let next={contentKey:'first',sessionId:'a',workspaceId:'alpha',workspaceVisible:true,foreground:true,cues,quiet:false};
  const sample=changes=>tracker.sample(next={...next,...changes})?.kind??null;
  assert.equal(sample({}),null);
  assert.equal(sample({sessionId:'b'}),'session');
  at+=100;
  assert.equal(sample({sessionId:'c'}),null);
  assert.equal(sample({sessionId:'d',workspaceId:'beta'}),'workspace');
  assert.equal(sample({foreground:false}),null);
  at+=14999;
  assert.equal(sample({foreground:true}),null);
  sample({foreground:false});at+=15000;
  assert.equal(sample({foreground:true}),'welcome');
  sample({foreground:false});at+=15000;
  assert.equal(sample({foreground:true}),null);
  assert.equal(sample({sessionId:'a',workspaceId:'alpha',quiet:true}),null);
  assert.equal(sample({quiet:false}),null);
  assert.equal(sample({sessionId:'b',contentKey:'second'}),null);
  assert.equal(sample({sessionId:'d',workspaceId:'beta',workspaceVisible:false}),null);
  assert.equal(sample({workspaceVisible:true}),null);
});

test('only declared workspace cues get preferences and the live skin lease controls presentation',async()=>{
  const source=fileURLToPath(new URL('../packages/dsh-skin-core/examples/a',import.meta.url));
  const skin=loadSkin(source);
  const spec={welcome:{text:'欢迎回来。',default:true},session:{text:'已切换。',default:false}};
  assert.throws(()=>validateManifest({...skin.manifest,workspaceCues:{session:{text:'缺默认值'}}}),/workspaceCues.session/);
  assert.throws(()=>validateManifest({...skin.manifest,workspaceCues:{unknown:spec.welcome}}),/workspaceCues/);
  const state={selected:skin,overrides:{},disabled:{},stopped:false};
  const core={state,generation:1,phase:'ready',queue:async fn=>fn(),store:{write(){}}};
  const page={active:true,lastReady:{clientId:'page-a',generation:1,contentKey:skin.contentKey}};
  const controller={entitlement:{require(){}},status:()=>null};
  const workspace=new WorkspaceCues({core,page,controller});
  assert.equal(workspace.status(),null);
  skin.manifest=validateManifest({...skin.manifest,workspaceCues:spec});
  assert.equal(workspace.status().cues.welcome.enabled,true);
  assert.equal(workspace.status().cues.session.enabled,false);
  assert.equal(workspace.presentation('page-b'),null);
  await workspace.configure({contentKey:skin.contentKey,cue:'session',enabled:true});
  assert.equal(workspace.presentation('page-a').cues.session.enabled,true);
  core.state.disabled.theme=true;
  assert.equal(workspace.presentation('page-a'),null);
  await assert.rejects(workspace.configure({contentKey:skin.contentKey,cue:'workspace',enabled:true}),/SKIN_SETTING_UNSUPPORTED/);
});

test('cue presentation defaults and independent overrides remain compatible with old boolean switches',async()=>{
  const skin=loadSkin(fileURLToPath(new URL('../packages/dsh-skin-core/examples/a',import.meta.url)));
  const colors={background:{light:'#fff4df',dark:'#281b14'},text:{light:'#332014',dark:'#fff1db'},border:{light:'#ab6737',dark:'#d9a16d'}};
  skin.manifest=validateManifest({...skin.manifest,workspaceCues:{welcome:{text:'欢迎回来。',default:true,seconds:6,position:'top-right',effect:'slide',colors},session:{text:'已切换。',default:false}}});
  const state={selected:skin,overrides:{[skin.manifest.id]:{theme:{workspaceCues:{welcome:false}}}},disabled:{},stopped:false};
  const core={state,generation:1,phase:'ready',queue:async fn=>fn(),store:{write(){}}};
  const service=new WorkspaceCues({core,controller:{entitlement:{require(){}},status:()=>null}});
  assert.equal(service.status().cues.welcome.enabled,false);assert.equal(service.status().cues.welcome.seconds,6);
  assert.equal(service.status().cues.session.position,'above-input');assert.equal(service.status().cues.session.seconds,4);
  await service.configure({contentKey:skin.contentKey,cue:'welcome',field:'seconds',value:8});
  assert.equal(service.status().cues.welcome.enabled,false);assert.equal(service.status().cues.welcome.seconds,8);assert.equal(service.status().cues.session.seconds,4);
  await service.configure({contentKey:skin.contentKey,cue:'welcome',enabled:true});
  assert.equal(service.status().cues.welcome.seconds,8);assert.deepEqual(service.status().cues.welcome.colors,colors);
  await service.configure({contentKey:skin.contentKey,cue:'session',field:'position',value:'bottom-right'});
  assert.equal(service.status().cues.welcome.position,'top-right');assert.equal(service.status().cues.session.position,'bottom-right');
  for(const [field,value]of [['seconds',.5],['seconds',9],['position','anywhere'],['effect','script']])await assert.rejects(service.configure({contentKey:skin.contentKey,cue:'welcome',field,value}),/SKIN_SETTING_UNSUPPORTED/);
  await service.configure({contentKey:skin.contentKey,cue:'welcome',field:'reset',value:null});
  assert.equal(service.status().cues.welcome.enabled,true);assert.equal(service.status().cues.welcome.seconds,6);assert.equal(service.status().cues.session.position,'bottom-right');
  const malformed=structuredClone(skin.manifest);malformed.workspaceCues.welcome.colors.text.light='url(secret)';assert.throws(()=>validateManifest(malformed),/SKIN_FIELDS_INVALID/);
  const tracker=createWorkspaceCueTracker({now:()=>100}),cues=service.status().cues;cues.session.enabled=true;
  const base={contentKey:skin.contentKey,sessionId:'a',workspaceId:'alpha',foreground:true,workspaceVisible:true,quiet:false,cues};tracker.sample(base);
  const shown=tracker.sample({...base,sessionId:'b'});assert.equal(shown.position,'bottom-right');assert.equal(shown.seconds,4);assert.equal(shown.effect,'fade');
});
