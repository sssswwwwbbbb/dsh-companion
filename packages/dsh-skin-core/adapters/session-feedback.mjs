// Current Session sources only. Historical windows and other Sessions never celebrate.
export function installSessionFeedback({ctx,React,onChange}){
  const ui=ctx.get('uiSession');if(!ui?.adapter?.current||!ui.sessionStatus)return ()=>{};
  const current=ui.adapter.current,status=ui.sessionStatus;
  const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false,addEventListener(){},removeEventListener(){}};
  let active=true,session,id=null,bindingId=crypto.randomUUID(),lastSeq=-1,ended=false,phase='idle',completionSeq=-1,run=0,terminalReason=null;
  let offSession=[],lastPacket='',snapshot={state:'idle',run:0,sessionId:null};const listeners=new Set();
  const source={getSnapshot:()=>snapshot,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};
  function attention(){
    if(!session||id===null)return false;
    const pending=status.getSnapshot().get(id)?.pendingInteraction;
    if(pending&&pending.review===undefined&&['approval','question','plan-review'].includes(pending.kind))return true;
    const q=session.projections.faceOf('userQuestions').getSnapshot(),inbox=session.projections.faceOf('inbox').getSnapshot();
    const queued=new Set();for(const message of [...inbox?.['next-step']||[],...inbox?.['next-turn']||[]]){
      if(message?.source?.kind==='user-question-reply')queued.add(message.source.callId);
    }
    return (q?.active||[]).some(row=>row.state==='open'||row.state==='continued'&&!queued.has(row.callId));
  }
  function publish(next,seq=lastSeq){
    if(!active)return;
    if(next==='running'&&phase!=='running')run++;
    phase=next;if(next==='completed')completionSeq=seq;
    const packet={bindingId,sessionId:id,seq:next==='completed'?completionSeq:seq,state:next,reducedMotion:motion.matches};
    const key=JSON.stringify(packet);if(key===lastPacket)return;lastPacket=key;
    snapshot={state:next,run,sessionId:id};for(const listener of listeners)listener();onChange(packet,{reason:terminalReason});
  }
  function refresh(){
    if(!active)return;
    if(attention())publish('attention');
    else if(phase==='completed'&&ended)publish('completed',completionSeq);
    else publish(!ended&&status.getSnapshot().get(id)?.running?'running':'idle');
  }
  function baseline(){
    const entries=session?.eventSource.getSnapshot().entries||[];
    lastSeq=entries.reduce((n,row)=>Number.isSafeInteger(row.event?.seq)?Math.max(n,row.event.seq):n,-1);
    ended=false;completionSeq=-1;terminalReason=null;phase='idle';refresh();
  }
  function bind(){
    const value=current.getSnapshot(),next=value.hooks.session,nextId=value.key??null;
    if(next===session&&nextId===id)return;
    for(const off of offSession)off();offSession=[];
    session=next;id=nextId;bindingId=crypto.randomUUID();lastPacket='';baseline();
    if(!session)return;
    const owned=session,ownedId=id;
    offSession.push(session.eventSource.subscribe(()=>{
      if(!active||session!==owned||current.getSnapshot().key!==ownedId)return;
      const change=owned.eventSource.getSnapshot().change;
      if(change.kind==='replace'){baseline();return;}
      if(change.kind!=='append')return;
      for(const row of change.entries){
        const e=row.event;if(!Number.isSafeInteger(e?.seq)||e.seq<=lastSeq)continue;lastSeq=e.seq;
        if(e.type==='turn/start'){ended=false;completionSeq=-1;terminalReason=null;publish(attention()?'attention':'running');}
        else if(e.type==='turn/end'){
          ended=true;terminalReason=e.data.reason?.kind||null;publish(attention()?'attention':e.data.reason?.kind==='completed'?'completed':'idle',e.seq);
        }
      }
    }));
    offSession.push(session.projections.faceOf('userQuestions').subscribe(refresh),session.projections.faceOf('inbox').subscribe(refresh));
  }
  const offCurrent=current.subscribe(bind),offStatus=status.subscribe(refresh);bind();
  motion.addEventListener('change',refresh);
  const h=React.createElement;
  const Feedback=({sessionId})=>{
    const value=React.useSyncExternalStore(source.subscribe,source.getSnapshot);
    if(!sessionId||value.sessionId!==sessionId||value.state==='idle')return null;
    const label=value.state==='attention'?'有事项需要处理':value.state==='completed'?'本轮回复完成':'正在执行';
    return h(React.Fragment,null,h('style',null,
      '.dsh-skin-work{display:inline-flex;align-items:center;gap:7px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.dsh-skin-work-dots{display:inline-flex;gap:3px}.dsh-skin-work-dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.5;animation:dsh-skin-work-dot .8s ease-out 2}.dsh-skin-work-dots i:nth-child(2){animation-delay:.12s}.dsh-skin-work-dots i:nth-child(3){animation-delay:.24s}@keyframes dsh-skin-work-dot{40%{transform:translateY(-2px);opacity:1}}@media(prefers-reduced-motion:reduce){.dsh-skin-work-dots i{animation:none}}'),
      h('span',{className:'dsh-skin-work','data-dsh-work-state':value.state,role:'status','aria-live':'polite'},
        value.state==='running'&&h('span',{key:value.run,className:'dsh-skin-work-dots','aria-hidden':true},h('i'),h('i'),h('i')),label));
  };
  const offSlot=ctx.slots.register({name:'conversation.session.header.utilities',id:'dsh-skin-work-feedback',order:40},Feedback);
  return()=>{
    if(!active)return;
    active=false;offCurrent();offStatus();for(const off of offSession)off();motion.removeEventListener('change',refresh);offSlot();listeners.clear();
    onChange({bindingId,sessionId:id,seq:lastSeq,state:'idle',reducedMotion:motion.matches});
  };
}
