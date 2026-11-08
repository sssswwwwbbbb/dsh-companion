// The same tracker is used for focus/blur, official Session/Workspace stores and
// the skin lease. Only foreground workspaces may present a cue.
import {cuePresentation} from '../../dsh-skin-core/src/workspace-cues.mjs';
export function createWorkspaceCueTracker({now=Date.now}={}){
  const cooldown={welcome:60000,session:4000,workspace:4000,model:4000};
  const shown={};
  let previous,awayAt=null;
  return {
    sample(next){
      const before=previous;
      previous=next;
      if(!before||before.contentKey!==next.contentKey||!next.contentKey){
        awayAt=null;
        return null;
      }
      const at=now();
      if(before.foreground&&!next.foreground)awayAt=at;
      if(!next.foreground||!next.workspaceVisible)return null;
      let kind;
      if(!before.foreground){
        if(awayAt!==null&&at-awayAt>=15000)kind='welcome';
        awayAt=null;
      }else if(before.workspaceVisible&&before.sessionId&&next.sessionId&&before.sessionId!==next.sessionId){
        if(before.workspaceId&&next.workspaceId&&before.workspaceId!==next.workspaceId)kind='workspace';
        else if(before.workspaceId===next.workspaceId)kind='session';
      }else if(before.workspaceVisible&&next.sessionId&&before.sessionId===next.sessionId&&before.modelKey&&next.modelKey&&before.modelKey!==next.modelKey){
        kind='model';
      }
      const cue=next.cues?.[kind];
      if(next.quiet||!cue?.enabled||at-(shown[kind]??-Infinity)<cooldown[kind])return null;
      shown[kind]=at;
      return {kind,text:cue.text,...cuePresentation(cue)};
    },
  };
}

export function resolveWorkspaceScene(scenes,modelKey,workspaceId){
  function resolve(kind,key){
    const presets=scenes?.presets?.[kind],preset=scenes?.bindings?.[kind]?.[key];
    return presets&&Object.hasOwn(presets,preset)?{id:preset,...presets[preset]}:null;
  }
  return {model:resolve('model',modelKey),workspace:resolve('workspace',JSON.stringify(workspaceId))};
}

export function observeWorkspaceCues({ctx,getPreferences,getScenes,isQuiet,subscribe,show,showScene,showWorkspaces,bindPreview=()=>{}}){
  const current=ctx.get('uiSession').adapter.current;
  const workspaces=ctx.get('workspaces').list;
  const panels=ctx.layout.panelInfo;
  const directory=ctx.get('modelDirectories');
  const tracker=createWorkspaceCueTracker();
  let visibleCue=null,timer,currentScope,canPresent=false,currentSession=null;
  let boundSession,modelStore,offModel,confirmedRoute=null;
  function clear(){
    clearTimeout(timer);
    if(visibleCue){visibleCue=null;show(null);}
  }
  function present(cue,preview=false){
    clear();
    const position=cue.position==='above-input'&&!currentSession?'top-right':cue.position==='bottom-right'&&!currentSession?'top-right':cue.position;
    visibleCue={...cue,position,scope:currentScope,preview};show(visibleCue);
    timer=setTimeout(clear,cue.seconds*1000);
  }
  function sync(){
    const binding=current.getSnapshot();
    const sessionId=binding.key??null,session=binding.hooks?.session;
    if(session!==boundSession){
      boundSession=session;
      confirmedRoute=null;
      offModel?.();
      modelStore=session&&sessionId&&directory?directory.directoryFor(sessionId).store:null;
      offModel=modelStore?.subscribe(sync);
    }
    const modelState=modelStore?.getSnapshot();
    // DSH briefly clears routability while hydrating a confirmed projection.
    // Retain the last confirmed route in this session until that load settles.
    if(modelState?.routable!==null)confirmedRoute=modelState?.routable===true?modelState.current:null;
    const modelKey=confirmedRoute?JSON.stringify([confirmedRoute.provider,confirmedRoute.model]):null;
    const items=workspaces.getSnapshot().items;
    const workspaceId=items.find(row=>row.sessionIds.includes(sessionId))?.workspaceId??null;
    showWorkspaces(items.map(row=>({id:row.workspaceId,label:row.title||row.workspaceId})));
    const workspaceVisible=panels.getSnapshot().activePanelId===null;
    const foreground=document.visibilityState==='visible'&&document.hasFocus();
    const preferences=getPreferences(),scenes=getScenes();
    const contentKey=preferences?.contentKey??scenes?.contentKey;
    const {model,workspace}=resolveWorkspaceScene(scenes,modelKey,workspaceId);
    showScene(workspaceVisible&&(model||workspace)?{contentKey:scenes.contentKey,model,workspace}:null);
    const cues={...preferences?.cues};
    if(model?.notice)cues.model={...cues.session,enabled:true,text:model.notice};
    if(workspace?.notice&&cues.workspace?.enabled!==false)cues.workspace={...cues.workspace,enabled:true,text:workspace.notice};
    const quiet=isQuiet();
    const scope=JSON.stringify([contentKey,sessionId,workspaceId,modelKey]);
    currentScope=scope;currentSession=sessionId;canPresent=foreground&&workspaceVisible&&!quiet;
    if(visibleCue&&(visibleCue.scope!==scope||!canPresent||!visibleCue.preview&&!cues?.[visibleCue.kind]?.enabled))clear();
    const cue=tracker.sample({sessionId,workspaceId,modelKey,workspaceVisible,foreground,contentKey,cues,quiet});
    if(!cue)return;
    present(cue);
  }
  let disposed=false,previewFrame;
  bindPreview(({contentKey,kind,cue})=>{
    if(disposed||contentKey!==getPreferences()?.contentKey||!getPreferences()?.cues[kind])return;
    ctx.layout.selectPanel(null);
    if(previewFrame!==undefined)cancelAnimationFrame(previewFrame);
    previewFrame=requestAnimationFrame(()=>{
      if(disposed||contentKey!==getPreferences()?.contentKey)return;
      sync();if(canPresent)present({kind,text:cue.text,...cuePresentation(cue)},true);
    });
  });
  const listeners=new AbortController();
  const options={signal:listeners.signal};
  window.addEventListener('focus',sync,options);
  window.addEventListener('blur',sync,options);
  document.addEventListener('visibilitychange',sync,options);
  const stops=[subscribe(sync),current.subscribe(sync),workspaces.subscribe(sync),panels.subscribe(sync)];
  sync();
  return ()=>{disposed=true;if(previewFrame!==undefined)cancelAnimationFrame(previewFrame);bindPreview(null);listeners.abort();for(const stop of stops)stop();offModel?.();clear();showScene(null);showWorkspaces([]);};
}
