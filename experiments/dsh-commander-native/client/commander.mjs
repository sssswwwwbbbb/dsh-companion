// Trusted rc.5 presentation adapter. Original controls and Session own all work.
import {commanderState} from './commander-state.mjs';
export function installWorkspaceCommander({ctx,React,config,identity}){
 const h=React.createElement,off=[],listeners=new Set();let disposed=false,seenSession=null,seenSeq=-1,pulse=null;
 let snapshot=commanderState({state:'idle'}),lastPacket=null;
 const source={getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const record=(type,extra={})=>console.info('WORKSPACE_COMMANDER '+JSON.stringify({at:Date.now(),type,...identity,...extra}));
 const visible=()=>!disposed&&document.visibilityState==='visible'&&ctx.layout.panelInfo.getSnapshot().activePanelId===null;
 const inputActive=()=>document.activeElement?.closest('[data-composer-input],.JZLxKW_card,[contenteditable=true]');
 function cancel(){pulse?.cancel();pulse=null;}
 function dismissResponse(){cancel();if(snapshot.state==='completed')publish({...snapshot,copy:commanderState({state:'idle'}).copy});}
 function publish(value){snapshot=value;for(const fn of listeners)fn();}
 const icon=name=>{const pair=config.icons[name];return pair?h('span',{className:'dsh-commander-icon','aria-hidden':true},h('img',{className:'commander-light',src:pair.light,alt:''}),h('img',{className:'commander-dark',src:pair.dark,alt:''})):null;};
 let leaves='';
 for(const [name,selectors]of Object.entries(WORKSPACE_R2_LEAVES)){
  const pair=config.icons[name];if(!pair)continue;
  for(const selector of selectors){const s='body.dsh-workspace-commander '+selector;leaves+=s+'{background-image:url("'+pair.light+'");background-position:center;background-size:contain;background-repeat:no-repeat} body.dsh-workspace-commander[data-ds-dark-theme] '+selector+'{background-image:url("'+pair.dark+'")} '+s+' > *{opacity:0}';}
 }
 document.body.classList.add('dsh-workspace-commander');off.push(()=>document.body.classList.remove('dsh-workspace-commander'));
 off.push(ctx.slots.register({name:'shell.overlay',id:'commander-workspace-style',order:-99},()=>h('style',{'data-workspace-commander-style':true},WORKSPACE_COMMANDER_STYLE+'\n'+leaves)));
 function Companion(){
  const value=React.useSyncExternalStore(source.subscribe,source.getSnapshot);
  return h('section',{className:'dsh-commander-companion','data-commander-companion':true,'data-state':value.state,'aria-label':'机械姬陪伴位'},
   h('div',{className:'commander-portrait'},h('img',{src:config.role.portrait,alt:'机械姬 · 母版04',draggable:false}),h('i',{'aria-hidden':true})),
   h('div',{className:'commander-companion-copy'},h('strong',null,'机械姬',h('span',null,value.label)),h('p',null,value.copy)));
 }
 if(config.role)off.push(ctx.slots.register({name:'sidebar.footer.action',id:'commander-companion',order:-20},Companion));
 const abort=new AbortController();
 document.addEventListener('focusin',e=>{if(e.target.closest('[data-composer-input],.JZLxKW_card,[contenteditable=true]'))dismissResponse();},{signal:abort.signal});
 document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-composer-input],.JZLxKW_card'))dismissResponse();},{signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(!visible())cancel();},{signal:abort.signal});
 reduced.addEventListener('change',cancel,{signal:abort.signal});
 function work(packet,detail){
  if(disposed)return;
  if(seenSession!==packet.sessionId){lastPacket={packet,detail};seenSession=packet.sessionId;seenSeq=packet.seq;cancel();publish(commanderState(packet,detail));return;}
  if(packet.seq<seenSeq)return;const fresh=packet.seq>seenSeq;seenSeq=Math.max(seenSeq,packet.seq);
  lastPacket={packet,detail};
  publish(commanderState(packet,detail));
  if(packet.state!=='completed'){cancel();return;}
  if(!fresh)return;cancel();
  if(!config.feedback||!config.motion||!config.petEcho||reduced.matches||!visible()||inputActive())return;
  const anchor=document.querySelector('[data-commander-companion] .commander-portrait');if(!anchor)return;
  pulse=anchor.animate([{opacity:.72},{opacity:1}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  const owned=pulse;owned.finished.then(()=>{if(pulse===owned)pulse=null;},()=>{});
  record('completion-response',{sessionId:packet.sessionId,seq:packet.seq,placement:'sidebar companion',inputObscured:false});
 }
 record('attached',{preset:config.preset,presentationSha:WORKSPACE_COMMANDER_BUILD,icons:Object.keys(config.icons).length,automaticOpening:false,audio:false});
 return {work,update(next){config=next;if(!config.feedback){cancel();publish(commanderState({state:'idle'}));}else if(lastPacket)publish(commanderState(lastPacket.packet,lastPacket.detail));if(!config.motion||!config.petEcho)cancel();},
  dispose(){if(disposed)return;disposed=true;cancel();abort.abort();for(const fn of off.reverse())fn();listeners.clear();record('detached');}};
}
