// Bundled into the existing DSH client entry. Uses only official theme/layout/slot APIs.
import {installSessionFeedback} from './session-feedback.mjs';
import {installWorkspaceR2} from './workspace-r2.mjs';
import {installWorkspaceCommander} from './workspace-commander.mjs';
export function installSkinPage({ctx,React,call,setEntryMark=()=>{}}) {
  const installWorkspace=options=>options.config.preset==='commander-v1'?installWorkspaceCommander(options):installWorkspaceR2(options);
  const clientId=crypto.randomUUID(),theme=ctx.get('theme'),layout=ctx.layout;
  let stopped=false,polling=false,ack,lastCommand='',generation=0,lease=0,selected,disposeLayer,disposeBackground,disposeSidebar,disposeWork,workspaceVisible,offPanel,workPacket,workRevision=0,backgroundNode,workspaceRuntime;
  function clearWorkspace(){
    workspaceRuntime?.dispose();workspaceRuntime=undefined;
    disposeWork?.();disposeWork=undefined;
    disposeLayer?.();disposeLayer=undefined;
    disposeBackground?.();disposeBackground=undefined;backgroundNode=undefined;
  }
  function clear(){
    clearWorkspace();disposeSidebar?.();disposeSidebar=undefined;workspaceVisible=undefined;setEntryMark(null);
  }
  function syncFeedback(){
    if(!workspaceVisible)return;
    if(!selected.workFeedback?.enabled){disposeWork?.();disposeWork=undefined;return;}
    if(!disposeWork){const identity={generation:selected.generation,contentKey:selected.contentKey};disposeWork=installSessionFeedback({ctx,React,onChange:(value,detail)=>{workPacket={...value,...identity,revision:++workRevision};workspaceRuntime?.work(value,detail);}});}
  }
  function present(){
    if(stopped||!selected)return;
    setEntryMark(selected.workspace?.icons?.companion||selected.entryMarks||null);
    // The official sidebar outlet spans its entire column. Its Mac root is
    // transparent over native glass, so a token override on body alone is insufficient.
    if(!disposeSidebar&&selected.tokens['--dsw-specific-sidebar-fill']){
      const nav='[data-slot="sidebar"]',tokens=Object.entries(selected.tokens);
      const declarations=mode=>tokens.map(([name,pair])=>name+':'+pair[mode]).join(';');
      const css=nav+'{'+declarations('light')+'} [data-ds-dark-theme] '+nav+'{'+declarations('dark')+'}'
        +'html[data-platform=darwin] '+nav+' > *{background-color:var(--dsw-specific-sidebar-fill)}'
        +nav+' button[aria-current=page],'+nav+' [role=treeitem][aria-selected=true]{background-color:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-specific-sidebar-nav-item-active-accent)}';
      disposeSidebar=ctx.slots.register({name:'shell.overlay',id:'dsh-skin-navigation',order:-101},
        ()=>React.createElement('style',{'data-dsh-skin-navigation':true},css));
    }
    const workspace=layout.panelInfo.getSnapshot().activePanelId===null;
    if(workspace===workspaceVisible)return;
    clearWorkspace();workspaceVisible=workspace;
    if(!workspace)return;
    if(selected.workspace?.enabled)workspaceRuntime=installWorkspace({ctx,React,config:selected.workspace,identity:{generation:selected.generation,contentKey:selected.contentKey}});
    syncFeedback();
    disposeLayer=theme.overrideTokens('dsh-plugin-companion',selected.tokens);
    if(selected.background){
      const background=selected.background;
      const Background=()=>React.createElement('div',{ref:node=>{backgroundNode=node;},'aria-hidden':true,'data-dsh-skin-background':true,style:{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'url("'+background+'")',backgroundSize:'cover',backgroundPosition:'center',opacity:selected?.backgroundOpacity??0}});
      disposeBackground=ctx.slots.register({name:'shell.overlay',id:'dsh-skin-background',order:-100},Background);
    }
  }
  const capable=!!(theme?.overrideTokens&&layout?.panelInfo?.subscribe);
  if(capable)offPanel=layout.panelInfo.subscribe(present);
  async function execute(command){
    if(command.generation<generation)return;generation=command.generation;lastCommand=command.id;
    if(command.kind==='invalidate'){return;}
    if(command.kind==='exit'){selected=undefined;clear();return;}
    const payload=command.payload;
    if(command.kind==='update'){
      if(!selected||selected.generation!==command.generation||selected.contentKey!==command.contentKey)throw new Error('STALE_PAGE_UPDATE');
      if(payload.background!==selected.background||JSON.stringify(payload.tokens)!==JSON.stringify(selected.tokens)||JSON.stringify(payload.entryMarkImages)!==JSON.stringify(selected.entryMarkImages))throw new Error('SKIN_UPDATE_RESOURCE_CHANGED');
      const latest=await call('skinPage',{clientId,capable,verify:true});
      if(stopped||command.generation!==generation||latest.command?.id!==command.id)throw new Error('STALE_PAGE_OPERATION');
      selected={...payload,generation:command.generation,contentKey:command.contentKey};setEntryMark(selected.workspace?.icons?.companion||selected.entryMarks||null);
      if(backgroundNode)backgroundNode.style.opacity=String(selected.backgroundOpacity);
      if(workspaceVisible&&selected.workspace?.enabled){if(workspaceRuntime)workspaceRuntime.update(selected.workspace);else workspaceRuntime=installWorkspace({ctx,React,config:selected.workspace,identity:{generation:selected.generation,contentKey:selected.contentKey}});}else {workspaceRuntime?.dispose();workspaceRuntime=undefined;}
      syncFeedback();return;
    }
    if(payload.background){const image=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('BACKGROUND_TIMEOUT')),5000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('BACKGROUND_INVALID'));};image.src=payload.background;});}
    const latest=await call('skinPage',{clientId,capable,verify:true});
    if(latest.command?.id!==command.id)throw new Error('STALE_PAGE_OPERATION');
    if(stopped||command.generation!==generation)throw new Error('STALE_PAGE_OPERATION');
    clear();workPacket=undefined;selected={...payload,generation:command.generation,contentKey:command.contentKey};present();
    await new Promise(resolve=>setTimeout(resolve,32));
    if(stopped||command.generation!==generation)throw new Error('STALE_PAGE_OPERATION');
    if(layout.panelInfo.getSnapshot().activePanelId===null){
      const scheme=theme.getTheme().active.colorScheme;
      for(const [name,modes] of Object.entries(selected.tokens))if(document.body.style.getPropertyValue(name).trim().toLowerCase()!==modes[scheme].toLowerCase())throw new Error('THEME_NOT_PRESENTED');
    }
  }
  async function poll(){
    if(stopped||polling)return;polling=true;
    try{
      const result=await call('skinPage',{clientId,capable,ack,seenCommand:lastCommand,...(workPacket?{work:workPacket}:{})});if(stopped)return;
      if(result.busy){selected=undefined;clear();return;}
      lease=Date.now()+result.leaseMs;ack=undefined;
      if(result.command&&result.command.id!==lastCommand){
        try{await execute(result.command);ack={id:result.command.id,generation:result.command.generation,ok:true};}
        catch{if(result.command.kind!=='update'){selected=undefined;clear();}ack={id:result.command.id,generation:result.command.generation,ok:false};}
      }
    }catch{if(Date.now()>lease){selected=undefined;clear();lastCommand='';}}
    finally{polling=false;}
  }
  const timer=setInterval(()=>{if(lease&&Date.now()>lease){selected=undefined;clear();lastCommand='';}void poll();},250);void poll();
  return ()=>{stopped=true;generation++;clearInterval(timer);offPanel?.();selected=undefined;clear();};
}
