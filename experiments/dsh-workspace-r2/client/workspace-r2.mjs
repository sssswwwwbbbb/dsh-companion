// Trusted rc.5 presentation adapter. Original controls, events and Session own business state.
export function installWorkspaceR2({ctx,React,config,identity}){
 const h=React.createElement,disposers=[];let disposed=false,performance,seenSession=null,seenSeq=-1;
 const viewport=()=>document.querySelector('.kiGsTW_scrollBody')||document.querySelector('.kiGsTW_body')||document.querySelector('[data-slot="main"]');
 const visible=()=>!disposed&&document.visibilityState==='visible'&&ctx.layout.panelInfo.getSnapshot().activePanelId===null;
 const icon=(name)=>{const pair=config.icons[name];return pair?h('span',{className:'dsh-r2-icon','aria-hidden':true},h('img',{className:'r2-light',src:pair.light,alt:''}),h('img',{className:'r2-dark',src:pair.dark,alt:''})):null;};
 const record=(type,extra={})=>console.info('WORKSPACE_R2 '+JSON.stringify({at:Date.now(),type,...identity,...extra}));
 let styles='';
 for(const [name,selectors] of Object.entries(WORKSPACE_R2_LEAVES)){
  const pair=config.icons[name];if(!pair)continue;
  for(const selector of selectors){const s='body.dsh-workspace-r2 '+selector,dark='body.dsh-workspace-r2[data-ds-dark-theme] '+selector;styles+=s+'{background-image:url("'+pair.light+'");background-position:center;background-size:contain;background-repeat:no-repeat} '+dark+'{background-image:url("'+pair.dark+'")} '+s+' > *{opacity:0}';}
 }
 document.body.classList.add('dsh-workspace-r2');
 disposers.push(()=>document.body.classList.remove('dsh-workspace-r2'));
 disposers.push(ctx.slots.register({name:'shell.overlay',id:'archive-workspace-r2-style',order:-99},()=>h('style',{'data-workspace-r2-style':true},WORKSPACE_R2_STYLE+'\n'+styles)));
 const preferences=()=>({uiMotion:config.motion===true,petEcho:config.petEcho===true,reduced:false});
 const announce=message=>{record('scene-status',{message});};
 const htmlIcon=name=>{const pair=config.icons[name];return pair?'<span class="dsh-r2-icon" aria-hidden="true"><img class="r2-light" alt="" src="'+pair.light+'"><img class="r2-dark" alt="" src="'+pair.dark+'"></span>':'';};
 performance=config.role?createArchivePerformance({assets:config.role,preferences,isVisible:visible,viewport,anchor:()=>document.querySelector('[data-r2-companion]'),icon:htmlIcon,announce,observe:record,onLand:()=>record('opening-ended')}):{preview(){},complete(){return false;},sync(){},cancel(){},dispose(){}};
 const replay=()=>{record('manual-opening');performance.preview(true);};
 function Companion({wide=true}){
  return h('div',{className:'dsh-r2-companion','data-r2-companion':true},
   h('img',{className:'dsh-r2-avatar',src:config.role?.avatar,alt:'鲸鱼娘 · 母版04',draggable:false}),
   wide&&h('div',null,h('strong',null,'档案暖白'),h('span',null,'这页先放稳，我在这里。')),
   h('button',{type:'button','aria-label':'主题演出',title:'主题演出',onClick:replay},icon('play')));
 }
 function Replay(){return h('button',{type:'button',className:'dsh-r2-replay',onClick:replay,'aria-label':'重播主题开卷演出'},icon('play'),'主题演出');}
 if(config.role)disposers.push(ctx.slots.register({name:'sidebar.footer.action',id:'archive-r2-companion',order:-20},Companion));
 if(config.role)disposers.push(ctx.slots.register({name:'conversation.session.header.utilities',id:'archive-r2-replay',order:30},Replay));
 const start=()=>{
  if(config.opening&&visible()){config.opening=false;performance.preview(false);record('apply-opening');}
 };
 const timer=setTimeout(start,100);disposers.push(()=>clearTimeout(timer));
 record('attached',{icons:Object.keys(config.icons).length,preset:config.preset});
 return {
  update(next){config=next;performance.sync();},
  work(packet){
   if(disposed)return;
   if(seenSession!==packet.sessionId){seenSession=packet.sessionId;seenSeq=packet.seq;performance.cancel();return;}
   if(packet.state!=='completed'){if(packet.state==='attention'||packet.state==='idle')performance.cancel();return;}
   if(packet.seq<=seenSeq)return;seenSeq=packet.seq;
   requestAnimationFrame(()=>{if(disposed||seenSession!==packet.sessionId||seenSeq!==packet.seq)return;const area=viewport();if(!area||area.scrollHeight-area.scrollTop-area.clientHeight>90)return;if(performance.complete(area))record('completion',{sessionId:packet.sessionId,seq:packet.seq});});
  },
  dispose(){if(disposed)return;disposed=true;performance.dispose();for(const off of disposers.reverse())off();record('detached');}
 };
}
