function SmartCompanion(){
  const P=PetSmartPreview;
  const key=location.search.includes("qa=1")?"dsh-pet-r4-demo-qa":"dsh-pet-r4-demo";
  function recover(){try{const d=JSON.parse(localStorage.getItem(key)||"null");return {config:P.cleanConfig(d?.config),turns:Array.isArray(d?.turns)?d.turns.filter(t=>t&&typeof t.input==="string"&&["done","cancelled"].includes(t.status)).slice(-40):[],stopped:d?.stopped===true};}catch{return {config:{...P.defaults},turns:[],stopped:false};}}
  const [initial]=React.useState(recover);
  const [config,setConfig]=React.useState(initial.config);
  const [turns,setTurns]=React.useState(initial.turns);
  const [stopped,setStopped]=React.useState(initial.stopped);
  const [pending,setPending]=React.useState(false);
  const [draft,setDraft]=React.useState("");
  const [pose,setPose]=React.useState("idle");
  const [bubble,setBubble]=React.useState("");
  const [inspector,setInspector]=React.useState(false);
  const [pane,setPane]=React.useState("dialogue");
  const [sample,setSample]=React.useState("normal");
  const [lastContext,setLastContext]=React.useState(null);
  const [contextMode,setContextMode]=React.useState("next");
  const [notice,setNotice]=React.useState("");
  const [saveProblem,setSaveProblem]=React.useState(false);
  const serial=React.useRef(Math.max(0,...initial.turns.map(t=>Number(t.id)||0))),requestTimer=React.useRef(null),poseTimer=React.useRef(null),configRef=React.useRef(config),scroll=React.useRef(null);
  configRef.current=config;
  const noCapability=!config.allowSpeak&&!config.allowActions;
  function update(field,value){setConfig(c=>({...c,[field]:value}));}
  function cancelPending(){serial.current++;clearTimeout(requestTimer.current);requestTimer.current=null;setPending(false);setTurns(ts=>ts.map(t=>t.status==="pending"?{...t,status:"cancelled"}:t));}
  function resetPose(){clearTimeout(poseTimer.current);setPose("idle");setBubble("");}
  function stop(){cancelPending();resetPose();setStopped(x=>!x);setNotice(stopped?"已恢复，不补播上一条回应。":"效果已停止，待返回的结果不会继续执行。");}
  function commit(id,raw,origin){
    const caps=P.context(configRef.current,[],"", "message").capabilities,result=P.normalize(raw,caps);
    setTurns(ts=>ts.map(t=>t.id===id?{...t,status:"done",say:result.say,action:result.action,origin,notes:result.notes}:t));setPending(false);setPose(result.action||"idle");setBubble(result.say);
    if(result.notes.length)setNotice(result.notes.join("；"));
    clearTimeout(poseTimer.current);poseTimer.current=setTimeout(()=>{setPose("idle");setBubble("");},({react:1800,greet:2600,stretch:3000}[result.action]||3000));
  }
  function interact(text,event="message"){
    const input=text.trim();if(!input||stopped||pending||noCapability)return;
    resetPose();setNotice("");const id=++serial.current,time=new Date().toISOString(),ctx=P.context(config,turns,input,event,time);setLastContext(ctx);setDraft("");setTurns(ts=>[...ts.slice(-39),{id,time,input,status:"pending",event}]);
    if(config.mode==="local"){commit(id,{say:"嗯，我在。",action:"react"},"local");return;}
    setPending(true);
    // Explicit fixture adapter for the design review. It makes no model/network request.
    requestTimer.current=setTimeout(()=>{if(id!==serial.current)return;try{commit(id,P.fixture(ctx,sample),"fixture");}catch(e){setNotice(e.message+"；本次使用本地回退。");commit(id,{say:"我先在这里陪着你，稍后再试一次吧。",action:"react"},"fallback");}},900);
  }
  React.useEffect(()=>{if(config.mode==="local"&&pending){cancelPending();resetPose();setNotice("已回到本地陪伴，上一条示例请求已取消。");}},[config.mode]);
  React.useEffect(()=>{if(!config.allowSpeak)setBubble("");if(!config.allowActions)setPose("idle");},[config.allowSpeak,config.allowActions]);
  React.useEffect(()=>{try{localStorage.setItem(key,JSON.stringify({version:1,config,turns:turns.filter(t=>t.status!=="pending"),stopped}));setSaveProblem(false);}catch{setSaveProblem(true);}},[config,turns,stopped]);
  React.useEffect(()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:"smooth"});},[turns]);
  React.useEffect(()=>()=>{serial.current++;clearTimeout(requestTimer.current);clearTimeout(poseTimer.current);},[]);
  const nextContext=P.context(config,turns,draft||"（下一次互动）"),shownContext=contextMode==="last"&&lastContext?lastContext:nextContext;
  const labels={fixture:"示例返回",local:"本地回应",fallback:"本地回退"};
  return <div className="smart-app">
    <header className="smart-header"><a href="index.html#settings" className="smart-brand"><span className="brand-square">档</span><span><strong>鲸鱼娘 · 智能互动</strong><small>ARCHIVE WARM / R4</small></span></a><div className="smart-header-state"><Pill tone="blue">模型服务待接入</Pill><span>当前为固定样例预演</span></div><div className="row"><Button small icon="file" onClick={()=>setInspector(x=>!x)}>{inspector?"收起上下文":"查看上下文"}</Button><Button small icon={stopped?"play":"pause"} onClick={stop}>{stopped?"恢复效果":"停止效果"}</Button></div></header>
    <nav className="smart-mobile-tabs" aria-label="智能互动页面"><button aria-pressed={pane==="dialogue"} onClick={()=>setPane("dialogue")}>连续互动</button><button aria-pressed={pane==="settings"} onClick={()=>setPane("settings")}>角色与记忆</button></nav>
    <main className={"smart-layout "+(inspector?"with-inspector ":"")+"pane-"+pane}>
      <aside className="smart-settings" aria-label="角色与记忆设置"><div className="smart-settings-heading"><div className="eyebrow">CHARACTER / CONTEXT</div><h1>熟悉的她，记得刚才。</h1><p>配置人设和能做的事，回应交给模型来选择。</p></div>
        <section><label className="smart-field-title">行为模式</label><Segmented label="行为模式" value={config.mode} options={[{value:"local",label:"本地陪伴"},{value:"smart",label:"智能互动"}]} onChange={v=>update("mode",v)}></Segmented><p className="smart-help">智能模式：待机由本地执行，互动时由模型选择短句与动作。此页先用明确的样例服务预演。</p></section>
        <section><label className="smart-field-title" htmlFor="persona-r4">行为人设</label><textarea id="persona-r4" aria-label="行为人设" maxLength="500" value={config.persona} onChange={e=>update("persona",e.target.value)}></textarea><p className="smart-help">决定语气、性格与陪伴方式；不需要逐条写死事件台词。</p></section>
        <section><label className="smart-field-title" htmlFor="memory-r4">带入最近几轮</label><select id="memory-r4" aria-label="记忆轮数" value={config.memoryRounds} onChange={e=>update("memoryRounds",Number(e.target.value))}>{[0,3,5,10,20].map(n=><option value={n} key={n}>{n===0?"不带历史":n+" 轮互动"}</option>)}</select><p className="smart-help">包含当时说的话和实际选择的动作。设为0只是不带历史，演示记录仍保留。</p></section>
        <section><label className="smart-field-title">允许使用的能力</label><div className="smart-capability"><span><strong>说一句话</strong><small>简短回应或保持安静</small></span><Toggle label="允许说话" value={config.allowSpeak} onChange={v=>update("allowSpeak",v)}></Toggle></div><div className="smart-capability"><span><strong>表演已有动作</strong><small>从本角色已提供的姿态中选择</small></span><Toggle label="允许动作" value={config.allowActions} onChange={v=>update("allowActions",v)}></Toggle></div></section>
        <section><label className="smart-field-title">决策模型</label><div className="smart-model-placeholder"><Icon name="link"></Icon><span>跟随 DSH 默认模型</span><Pill>待接入</Pill></div><p className="smart-help">复用已配置的模型与账号。真实模型目录和调用由对应模块接入。</p></section>
        <p className="smart-storage">{saveProblem?"本次浏览器未允许保存":"只保存本地预览设置与演示记录"} · 不读取真实DSH对话</p>
      </aside>
      <section className="smart-dialogue" aria-label="连续互动预演"><header className="smart-dialogue-heading"><div><div className="eyebrow">A LITTLE COMPANY</div><h2>每次回应，都接得上。</h2></div><span className="smart-context-count">{turns.filter(t=>t.status==="done").length} 次已完成互动</span></header>
        <div className="smart-live" data-state={stopped?"stopped":pending?"waiting":"ready"}><div className="smart-live-copy"><Pill tone={stopped?"orange":"blue"}>{stopped?"效果已停止":pending?"等待样例返回":config.mode==="local"?"本地陪伴":"短句与动作一起选择"}</Pill><h3>{stopped?"暂停，也记得你。":pending?"把情景交给模型。":"我在这里。"}</h3><p>{stopped?"设置和记录保留；恢复后不补播上一条。":"点一下角色，或告诉她今天的心情。"}</p><div className="smart-available">{config.allowActions?"待机 · 回应 · 挥手 · 伸懒腰":"动作能力已关闭"}</div></div>
          {stopped?<div className="smart-stopped"><Icon name="pause"></Icon><span>角色表演已停止</span></div>:<button className="smart-pet-button" aria-label="点击鲸鱼娘预演互动" disabled={pending||noCapability} onClick={()=>interact("（用户轻轻点了一下你）","touch")}><PetMedia action={pose} reduced={false}></PetMedia></button>}{!stopped&&bubble&&<div className="smart-pet-bubble" role="status">{bubble}</div>}
        </div>
        <div className="smart-history" ref={scroll} aria-label="演示互动记录" tabIndex="0">{turns.length===0?<div className="smart-empty"><Icon name="chat"></Icon><p>从一句招呼开始。</p><span>试试“今天有点累”，再说“换个动作”。</span></div>:turns.map(t=><article className="smart-turn" key={t.id}><div className="smart-user"><span>你</span><p>{t.event==="touch"?"轻轻点了点桌宠":t.input}</p></div><div className={"smart-reply "+t.status}><div className="smart-reply-label"><span>鲸鱼娘</span><small>{t.status==="pending"?"样例处理中":t.status==="cancelled"?"已取消，未执行":labels[t.origin]}</small></div><p>{t.status==="pending"?"正在预演一次模型决策…":t.status==="cancelled"?"这次结果没有继续执行。":t.say||"安静陪伴，未说话。"}</p>{t.status==="done"&&<small className="smart-action-record">{t.action?"本次姿态："+(P.actions.find(a=>a.id===t.action)?.label||t.action):"没有调用动作"}</small>}</div></article>)}</div>
        {notice&&<div className="smart-notice" role="status">{notice}</div>}{noCapability&&<div className="smart-notice">开启说话或动作能力后，可继续预演。</div>}
        <form className="smart-composer" onSubmit={e=>{e.preventDefault();interact(draft);}}><textarea aria-label="对桌宠说的话" value={draft} placeholder="告诉她你的心情，或让她换个动作…" disabled={stopped||pending} onChange={e=>setDraft(e.target.value)}></textarea><div><span>固定样例演示 · 尚未发送真实模型请求</span><Button icon="arrow" kind="primary" type="submit" disabled={stopped||pending||noCapability||!draft.trim()}>预演回应</Button></div></form>
        <footer className="smart-demo-controls"><label>审稿样例<select aria-label="审稿样例" value={sample} onChange={e=>setSample(e.target.value)}><option value="normal">正常返回</option><option value="quiet">选择安静</option><option value="failure">请求失败</option></select></label><button onClick={()=>{cancelPending();resetPose();setTurns([]);setLastContext(null);setNotice("演示记录已清除，没有操作真实对话。");}}>清除演示记录</button></footer>
      </section>
      {inspector&&<aside className="smart-inspector" aria-label="上下文审稿面板"><header><div className="eyebrow">CONTEXT / REVIEW ONLY</div><h2>模型会看到什么</h2><p>这是拟发送的上下文结构。当前由固定样例接替模型阶段。</p><Segmented label="上下文快照" value={contextMode} options={[{value:"next",label:"下一次"},{value:"last",label:"上次请求"}]} onChange={setContextMode}></Segmented></header><pre aria-label="模型上下文预览">{JSON.stringify(shownContext,null,2)}</pre><div className="smart-inspector-foot">R2角色姿态用于逻辑预演；完整动画和真实模型接入单独验收。</div></aside>}
    </main>
    <footer className="smart-footer"><span>档案暖白 · 智能互动增量 R4</span><span>模型选择能力，本地执行与记录 · 设计预演</span></footer>
  </div>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<SmartCompanion></SmartCompanion>);
