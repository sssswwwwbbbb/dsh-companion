function App({design}) {
  const defaults=design.defaults;
  const skinId=design.skinIdProposal;
  const qa=location.search.includes("qa=1");
  const storageKey=qa?"dsh-skin-v3-qa":"dsh-skin-v3-preview";
  function recover() {
    try {
      const raw=JSON.parse(localStorage.getItem(storageKey)||"null");
      if(raw?.version===3)return {config:SkinPreview.resolve(design,raw.overrides?.[skinId]),stopped:raw.stopped===true};
      const old=JSON.parse(localStorage.getItem(qa?"dsh-skin-v1-qa":"dsh-skin-v1-preview")||"null");
      return {config:SkinPreview.resolve(design,old?.version===1?old.config:{}),stopped:old?.stopped===true};
    }catch{return {config:SkinPreview.copy(defaults),stopped:false};}
  }
  const [initial]=React.useState(recover);
  const [config,setConfigState]=React.useState(initial.config);
  const [stopped,setStopped]=React.useState(initial.stopped);
  const [screen,setScreen]=React.useState(["workspace","settings","flow","spec","assets"].includes(location.hash.slice(1))?location.hash.slice(1):"workspace");
  const [scenario,setScenarioState]=React.useState("default");
  const [toast,setToast]=React.useState("");
  const [saveProblem,setSaveProblem]=React.useState(false);
  const [modal,setModal]=React.useState(null);
  const [menu,setMenu]=React.useState(null);
  const [fileOpen,setFileOpen]=React.useState(false);
  const [sidebar,setSidebar]=React.useState(null);
  const [query,setQuery]=React.useState("");
  const [searchOpen,setSearchOpen]=React.useState(false);
  const [draft,setDraft]=React.useState("");
  const [attached,setAttached]=React.useState(false);
  const [empty,setEmpty]=React.useState(false);
  const [sent,setSent]=React.useState([]);
  const [runState,setRunState]=React.useState("complete");
  const [model,setModel]=React.useState("DeepSeek");
  const [complex,setComplex]=React.useState(false);
  const [phase,setPhase]=React.useState("ready");
  const [elapsed,setElapsed]=React.useState(0);
  const [action,setAction]=React.useState("idle");
  const [assetAction,setAssetAction]=React.useState("idle");
  const [bubble,setBubble]=React.useState("");
  const [feedbackKind,setFeedbackKind]=React.useState("idle");
  const [simulatedModel,setSimulatedModel]=React.useState("example-deepseek");
  const [log,setLog]=React.useState([]);
  const [systemReduced,setSystemReduced]=React.useState(matchMedia("(prefers-reduced-motion: reduce)").matches);
  const reduced=config.motion==="reduced"||systemReduced;
  const effective=SkinPreview.effective(config,scenario,stopped,runState==="needs-user"?"needs-user":feedbackKind);
  const introSeconds=config.startupStyle==="archive"?1.2:8.24;
  const timers=React.useRef({intro:[],response:[],pet:[],ambient:[],toast:null});
  const actionPriority=React.useRef(0);
  const lastComplete=React.useRef(-Infinity);
  const lastClick=React.useRef(-Infinity);
  const activeElement=React.useRef(null);
  const modalRef=React.useRef(null);
  const scrollRef=React.useRef(null);
  const lastView=React.useRef("workspace");
  function clearGroup(group){timers.current[group].forEach(clearTimeout);timers.current[group]=[];}
  function schedule(group,fn,ms){const id=setTimeout(fn,ms);timers.current[group].push(id);return id;}
  function notify(message){setToast(message);clearTimeout(timers.current.toast);timers.current.toast=setTimeout(()=>setToast(""),2800);}
  function appendLog(message){setLog(x=>[...x.slice(-5),new Date().toLocaleTimeString("zh-CN",{hour12:false})+"  "+message]);}
  function go(next){setScreen(next);location.hash=next;setMenu(null);if(next!=="flow"){clearGroup("intro");setPhase("ready");setElapsed(0);}}
  function setConfig(key,value){
    if(!design.controls[key]||!SkinPreview.valid(design.controls[key],value)){notify(key==="eventRules"?"规则无效：检查重复模型/事件或静态处理动作。":"请使用此项允许的值。");return;}
    setConfigState(x=>({...x,[key]:SkinPreview.copy(value)}));
  }
  function resetPet(){clearGroup("pet");setAction("idle");setBubble("");setFeedbackKind("idle");actionPriority.current=0;}
  function resolveAttention(){setRunState("complete");resetPet();appendLog("模拟已处理 → 解除静态状态，回待机");}
  function stopToggle(){
    const next=!stopped;setStopped(next);clearGroup("intro");clearGroup("ambient");resetPet();setPhase("workspace");setElapsed(0);
    appendLog(next?"停止 → 清空反馈队列，原会话状态保留":"恢复 → 待机/原处理状态，不重播开场");
    notify(next?"效果已停止，设置和会话状态保留":"已恢复效果，不重播开场");
  }
  function selectScenario(value){
    setScenarioState(value);
    if(value==="default"){setConfigState(SkinPreview.copy(defaults));setRunState("complete");resetPet();}
    if(value==="custom")setConfigState({...SkinPreview.copy(defaults),petScale:120,cooldown:60,background:false,profile:"lively",completionAction:"stretch"});
    if(value==="off")setConfigState(x=>({...x,pet:false}));
    if(value==="unavailable"||value==="unsupported"||value==="off"){resetPet();clearGroup("ambient");}
  }
  function playPlan(plan){
    if(!plan.allowed){notify(plan.reason);appendLog(plan.reason);return false;}
    if(plan.priority===2&&actionPriority.current===2){appendLog("重复点击 → 合并到当前回应");return false;}
    if(plan.priority<actionPriority.current){appendLog("低优先级反馈已合并");return false;}
    clearGroup("pet");actionPriority.current=plan.priority;setFeedbackKind(plan.kind);
    setAction(reduced||plan.kind==="needs-user"?"idle":plan.action);setBubble(config.bubbles?plan.text.trim():"");
    appendLog(plan.kind==="needs-user"?"需要处理 → 持续静态，与气泡偏好独立":(plan.source?plan.source+" → ":"")+plan.action+" → 统一角色姿态");
    if(plan.kind!=="needs-user")schedule("pet",()=>{resetPet();appendLog("反馈结束 → idle");},reduced?4000:({react:1800,greet:2600,stretch:3000}[plan.action]||1800));
    return true;
  }
  function completeFeedback(modelOverride){
    const sample=typeof modelOverride==="string"?modelOverride:simulatedModel;
    const plan=SkinPreview.plan(config,effective,"completed",sample);
    if(!plan.allowed){playPlan(plan);return;}
    const now=Date.now();
    if(now-lastComplete.current<config.cooldown*1000){appendLog("完成事件 → 冷却中合并");notify("提醒间隔内已合并，没有重复表演");return;}
    if(playPlan(plan))lastComplete.current=now;
  }
  function needFeedback(modelOverride){
    if(!effective.feedbackDeclared){notify("本套未声明工作反馈");return;}
    setRunState("needs-user");clearGroup("pet");setAction("idle");setFeedbackKind("needs-user");setBubble("");actionPriority.current=4;
    const sample=typeof modelOverride==="string"?modelOverride:simulatedModel;
    const plan=SkinPreview.plan(config,effective,"needs-user",sample);
    if(plan.allowed)playPlan(plan);else appendLog(plan.reason+"；原会话需要处理状态保留");
  }
  function directReaction(){
    const plan=SkinPreview.plan(config,effective,"click",simulatedModel);
    if(!plan.allowed){playPlan(plan);return;}
    if(actionPriority.current===2){appendLog("重复点击 → 合并到当前回应");return;}
    if(Date.now()-lastClick.current<config.clickCooldown*1000){appendLog("点击 → 冷却内忽略");return;}
    if(playPlan(plan))lastClick.current=Date.now();
  }
  function previewRule(rule){
    const sample=rule.model==="*"?simulatedModel:rule.model;
    setSimulatedModel(sample);go("flow");
    if(rule.event==="needs-user")needFeedback(sample);
    else playPlan(SkinPreview.plan(config,effective,"completed",sample));
  }
  function switchSimulatedModel(value){setSimulatedModel(value);setRunState("complete");lastComplete.current=-Infinity;lastClick.current=-Infinity;resetPet();appendLog("切换示例会话/模型 → 旧反馈失效");}
  function introStep(next){
    clearGroup("intro");setElapsed(0);
    if(stopped||!config.startup||reduced){setPhase("workspace");appendLog("开场跳过 → 停止 / 关闭 / 减少动态");return;}
    setPhase(next==="scan"&&config.startupStyle==="archive"?"workspace":next);appendLog("审稿定位 → "+next);
  }
  function startIntro(){
    clearGroup("intro");setElapsed(0);
    if(stopped||!config.startup||reduced){setPhase("workspace");notify(stopped?"效果已停止":reduced?"减少动态：静态进入工作区":"启动开场已关闭");return;}
    setPhase("archive");appendLog("开场开始 → archive");
    const start=Date.now();
    const tick=()=>{setElapsed((Date.now()-start)/1000);if(Date.now()-start<introSeconds*1000)schedule("intro",tick,100);};
    tick();
    if(config.startupStyle==="scan")schedule("intro",()=>{setPhase("scan");appendLog("1.2s → scan 原片");},1200);
    schedule("intro",()=>{setPhase("workspace");setElapsed(introSeconds);appendLog(introSeconds+"s → 工作区 + idle");},introSeconds*1000);
  }
  function skipIntro(){clearGroup("intro");setPhase("workspace");setElapsed(introSeconds);appendLog("用户跳过 → 立即交回工作区");}
  function send(){
    if(!draft.trim()||runState==="loading"||runState==="disabled")return;
    const text=draft.trim();setSent(x=>[...x,{question:text,answer:null}]);setDraft("");setAttached(false);setRunState("loading");
    clearGroup("response");
    schedule("response",()=>{
      setSent(x=>x.map((v,i)=>i===x.length-1?{...v,answer:"已收到这条本地示例输入。这里用于检查连续对话与滚动，未发送到模型。可继续试用文件预览、设置和菜单。"}:v));
      setRunState("complete");
    },1300);
    schedule("response",()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight}),40);
  }
  function simulateState(value){clearGroup("response");setMenu(null);if(value==="needs-user")needFeedback();else{resetPet();setRunState(value);}}
  function retry(){clearGroup("response");setRunState("loading");schedule("response",()=>{setRunState("complete");notify("示例回复已恢复");},1200);}
  function cancelResponse(){clearGroup("response");setRunState("complete");setSent(x=>x.map(v=>v.answer? v:{...v,answer:"已停止这次本地模拟。"}));}
  function newChat(){clearGroup("response");resetPet();lastComplete.current=-Infinity;lastClick.current=-Infinity;setEmpty(true);setSent([]);setDraft("");setRunState("complete");setFileOpen(false);setSearchOpen(false);notify("已新建本地示例会话");}
  async function copyExample(value){
    try{await navigator.clipboard.writeText(typeof value==="string"?value:"档案暖白 · 本地示例内容。");notify("已复制示例内容");}catch{notify("浏览器未允许复制，可在正文中选择文本。");}
  }
  function exportDesign(){
    const blob=new Blob([JSON.stringify({kind:"design-preview-overrides",runtimeLoadable:false,defaultsVersion:design.version,skinId,overrides:SkinPreview.overrides(design,config),resolvedValues:config,globalIntent:{stopped,muted:true},note:"仅设计值，不是 DSH 可导入包"},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="archive-warm-design-overrides-r3.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify("已导出设计值，不能作为运行包导入");
  }
  function openReset(){activeElement.current=document.activeElement;setModal("reset");}
  function closeModal(){setModal(null);setTimeout(()=>activeElement.current?.focus(),0);}
  React.useEffect(()=>{
    if(!menu)return;
    const closeOutside=e=>{
      if(e.target.closest(".popover"))return;
      const label=e.target.closest("button")?.getAttribute("aria-label");
      if(label!=="选择模型"&&label!=="预览检查选项")setMenu(null);
    };
    document.addEventListener("pointerdown",closeOutside);
    return()=>document.removeEventListener("pointerdown",closeOutside);
  },[menu]);
  React.useEffect(()=>{
    try{localStorage.setItem(storageKey,JSON.stringify({version:3,selectedSkinId:skinId,overrides:{[skinId]:SkinPreview.overrides(design,config)},stopped,muted:true}));setSaveProblem(false);}catch{setSaveProblem(true);}
  },[config,stopped]);
  React.useEffect(()=>{
    const mq=matchMedia("(prefers-reduced-motion: reduce)");const listener=e=>setSystemReduced(e.matches);mq.addEventListener("change",listener);return()=>mq.removeEventListener("change",listener);
  },[]);
  React.useEffect(()=>{
    document.documentElement.dataset.theme=config.theme;document.documentElement.dataset.reduced=String(reduced);document.documentElement.dataset.accent=config.accent;
  },[config.theme,reduced,config.accent]);
  React.useEffect(()=>{
    if(!effective.petRunning){resetPet();clearGroup("ambient");}
  },[effective.petRunning]);
  React.useEffect(()=>{
    if(reduced){resetPet();clearGroup("intro");setPhase("workspace");}
  },[reduced]);
  React.useEffect(()=>{
    if(!config.completion&&feedbackKind==="completed")resetPet();
    if(!config.clickResponse&&feedbackKind==="click")resetPet();
    if(!config.bubbles||(!config.needsFeedback&&feedbackKind==="needs-user"))setBubble("");
    if(!config.startup){clearGroup("intro");setPhase("workspace");}
  },[config.completion,config.clickResponse,config.bubbles,config.needsFeedback,config.startup]);
  React.useEffect(()=>{if(runState!=="needs-user"&&feedbackKind==="needs-user")resetPet();},[runState]);
  React.useEffect(()=>{
    clearGroup("ambient");
    if(screen!=="flow"||!effective.petRunning||effective.attention||reduced||!config.autonomous)return;
    const tick=()=>{playPlan({allowed:true,action:config.profile==="lively"?"greet":"stretch",text:"",priority:1,kind:"autonomous",source:"本地自主样例"});schedule("ambient",tick,config.activityFrequency*1000);};
    schedule("ambient",tick,config.activityFrequency*1000);
    return()=>clearGroup("ambient");
  },[screen,effective.petRunning,effective.attention,reduced,config.autonomous,config.profile,config.activityFrequency]);
  React.useEffect(()=>{
    if(modal)modalRef.current?.querySelector("button")?.focus();
  },[modal]);
  React.useEffect(()=>{
    function key(e){
      if(e.key==="Escape"){if(modal)closeModal();else if(menu)setMenu(null);else if(phase==="archive"||phase==="scan")skipIntro();else if(fileOpen)setFileOpen(false);}
      if(modal&&e.key==="Tab"){
        const f=[...modalRef.current.querySelectorAll("button:not(:disabled)")],first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
      if((e.metaKey||e.ctrlKey)&&e.key==="b"&&!modal){e.preventDefault();setSidebar(x=>x===null?true:!x);}
    }
    document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key);
  },[modal,menu,phase,fileOpen]);
  React.useEffect(()=>()=>{["intro","response","pet","ambient"].forEach(clearGroup);clearTimeout(timers.current.toast);},[]);
  React.useEffect(()=>{const fn=()=>{const s=location.hash.slice(1);if(["workspace","settings","flow","spec","assets"].includes(s))setScreen(s);};addEventListener("hashchange",fn);return()=>removeEventListener("hashchange",fn);},[]);
  const tabs=[["workspace","工作区"],["settings","皮肤设置"],["flow","启动与桌宠"],["spec","视觉规范"],["assets","角色对照"]];
  const sidebarClass=sidebar===false?"sidebar-closed":sidebar===true?"sidebar-manual":"";
  return <>
    <div aria-hidden={modal?true:undefined}>
    <header className="reviewbar">
      <div className="reviewbrand"><span className="brand-square">档</span><div><strong>档案暖白 · 鲸鱼娘</strong><small>DSH SKIN / DESIGN STUDY 01</small></div></div>
      <nav className="reviewnav" aria-label="关键稿导航">{tabs.map(([id,name])=><button key={id} className={screen===id?"active":""} aria-current={screen===id?"page":undefined} onClick={()=>go(id)}>{name}</button>)}</nav>
      <div className="reviewtools"><span className="reviewnotice">交互设计稿</span><button className="iconbutton" aria-label={config.theme==="light"?"切换夜间稿":"切换暖白稿"} onClick={()=>setConfig("theme",config.theme==="light"?"dark":"light")}><Icon name={config.theme==="light"?"moon":"sun"}></Icon></button><button className="iconbutton" aria-label="预览检查选项" aria-expanded={menu==="review"} onClick={()=>setMenu(menu==="review"?null:"review")}><Icon name="settings"></Icon></button><button className="iconbutton" aria-label={stopped?"恢复所有皮肤效果":"停止所有皮肤效果"} onClick={stopToggle}><Icon name={stopped?"play":"pause"}></Icon></button></div>
      {menu==="review"&&<div className="popover scenario-menu"><h3>预览检查</h3><label>会话状态</label><select aria-label="模拟会话状态" value={runState} onChange={e=>simulateState(e.target.value)}><option value="complete">已完成</option><option value="loading">正在生成</option><option value="error">连接中断</option><option value="disabled">输入不可用</option><option value="needs-user">需要用户处理</option></select><label><input type="checkbox" checked={complex} onChange={e=>setComplex(e.target.checked)}></input>复杂背景压力场景</label><label><input type="checkbox" checked={config.motion==="reduced"} onChange={e=>setConfig("motion",e.target.checked?"reduced":"system")}></input>减少动态</label><p className="caption">以上为审稿模拟，不连接 DSH。</p><Button small onClick={()=>setMenu(null)}>完成</Button></div>}
    </header>
    <main className="stage"><div className="frame" data-stopped={stopped}>
      {screen==="workspace"&&<section className={"workspace "+sidebarClass} data-screen-label="01 主工作区">
        <aside className="sidebar" aria-label="会话列表"><div className="sidebrand"><div><strong>DSH</strong><span className="sub">WORKSPACE</span></div><button className="iconbutton" aria-label="收起会话列表" onClick={()=>setSidebar(false)}><Icon name="panel"></Icon></button></div>
          <div className="sideactions"><Button icon="plus" onClick={newChat}>新建会话</Button><button className="iconbutton" aria-label="搜索示例会话" onClick={()=>setSearchOpen(x=>!x)}><Icon name="search"></Icon></button></div>
          {searchOpen&&<div className="searchbox"><Icon name="search"></Icon><input autoFocus aria-label="搜索会话" placeholder="搜索示例会话" value={query} onChange={e=>setQuery(e.target.value)}></input></div>}
          <div className="sidesection"><h3>工作区</h3><div className="projectlabel"><Icon name="folder"></Icon><span>我的工作台</span></div>{["整理工作区观察","一份清晰的阅读记录","今天的灵感"].filter(s=>s.includes(query)).map((s,i)=><button className={"sideitem "+(!empty&&i===0?"selected":"")} key={s} onClick={()=>{setEmpty(false);setSent([]);setRunState("complete");notify("已打开本地示例会话");}}><Icon name="chat"></Icon><span className="label">{s}</span>{i===0&&<span className="tail">现在</span>}</button>)}</div>
          <div className="sidesection"><h3>最近</h3><button className="sideitem" onClick={()=>{setEmpty(false);notify("此条使用同一份排版样例");}}><Icon name="chat"></Icon><span className="label">界面与互动想法</span><span className="tail">昨天</span></button></div>
          <div className="sidebar-bottom"><div className="skin-mini"><span>鲸</span><div><p>档案暖白</p><small>{stopped?"效果已停止":reduced?"减少动态":config.pet?"安静陪伴中":"桌宠已关闭"}</small></div></div><div className="sidebottom-row"><button className="sideitem" onClick={()=>go("settings")}><Icon name="settings"></Icon>皮肤与陪伴</button><button className="iconbutton" aria-label="皮肤效果管理" onClick={stopToggle}><Icon name={stopped?"play":"pause"}></Icon></button></div></div>
        </aside>
        <div className="mainspace"><header className="workspace-header"><div className="breadcrumb"><button className="iconbutton" aria-label="展开或收起会话列表" onClick={()=>setSidebar(x=>x===null?true:!x)}><Icon name="panel"></Icon></button><span>我的工作台</span><span>/</span><h2>{empty?"新建会话":"整理工作区观察"}</h2></div><div className="row" style={{gap:5}}><Pill tone={runState==="loading"?"blue":""}><span className="dot"></span>{runState==="loading"?"进行中":runState==="error"?"未完成":"本地示例"}</Pill><button className="iconbutton" aria-label="打开文件预览" onClick={()=>setFileOpen(x=>!x)}><Icon name="file"></Icon></button></div></header>
          {stopped&&<div className="stop-banner"><span>皮肤效果已停止 · 设置已保留</span><Button small onClick={stopToggle}>恢复效果</Button></div>}
          <div className="conversation-grid"><div className={"conversation "+(complex?"bg-complex":"")}>
            {config.background&&!stopped&&<div className={"archive-grid background-"+config.backgroundStyle} style={{opacity:config.backgroundOpacity*4}}></div>}
            <div className="chat-scroll" ref={scrollRef} tabIndex="0" aria-label="聊天记录"><div className="reading">
              {empty&&sent.length===0?<div className="empty-chat"><div className="eyebrow">A FRESH PAGE</div><h2>从一个想法开始。</h2><p>输入一段文字，试试本地对话和滚动。</p><Button small onClick={()=>setDraft("帮我整理今天的观察")}>整理今天的观察</Button></div>:!empty&&<ChatBody onFile={()=>setFileOpen(true)} onCopy={copyExample} state={sent.length&&runState==="loading"?"complete":runState} onRetry={retry}></ChatBody>}
              {sent.map((m,i)=><div className="sent-turn" key={i} style={{marginTop:30}}><div className="user-row"><div className="user-message">{m.question}</div></div><div className="assistant-label"><span className="assistant-mark">d</span>DSH</div>{m.answer?<p className="message-body">{m.answer}</p>:<div className="run-status"><span className="loading-dot"></span>正在整理本地示例…</div>}</div>)}
            </div></div>
            <div className="composer-zone"><div className="composer-wrap"><div className="composer">
              {attached&&<div className="attachment-draft">已附示例文件：观察记录.md <button onClick={()=>setAttached(false)} aria-label="移除示例附件">×</button></div>}
              <textarea aria-label="输入消息" placeholder={runState==="disabled"?"当前输入不可用 · 示例只读状态":"描述你的想法，或继续这份记录…"} value={draft} disabled={runState==="disabled"} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}></textarea>
              <div className="composer-controls"><div className="row"><button className="iconbutton" aria-label="添加示例附件" disabled={runState==="disabled"} onClick={()=>setAttached(x=>!x)}><Icon name="plus"></Icon></button><button className="button quiet small" aria-label="选择模型" aria-expanded={menu==="model"} onClick={()=>setMenu(menu==="model"?null:"model")}>{model}<Icon name="down"></Icon></button><Pill>工作模式</Pill></div>{runState==="loading"?<button className="iconbutton send" aria-label="停止本地生成" onClick={cancelResponse}><Icon name="stop"></Icon></button>:<button className="iconbutton send" aria-label="发送本地示例" disabled={!draft.trim()||runState==="disabled"} onClick={send}><Icon name="arrow"></Icon></button>}</div>
            </div><div className="composer-sub"><span>{runState==="disabled"?"当前会话为只读，输入已保留":"示例环境 · 不发送到模型"}</span><span>⌘ Enter 发送 · Shift Enter 换行</span></div></div></div>
            {menu==="model"&&<div className="popover model-menu" role="menu" aria-label="模型选择"><div className="menu-title">当前会话 · 模型选择示例</div>{["DeepSeek","示例模型 B"].map(x=><button role="menuitemradio" aria-checked={model===x} key={x} className={"menu-item "+(model===x?"selected":"")} onClick={()=>{setModel(x);setMenu(null);notify("仅更改本地示例显示，不切换真实模型");}}><Icon name={model===x?"check":"chat"}></Icon>{x}<small>{model===x?"当前":""}</small></button>)}<div className="divider"></div><div className="menu-title">Esc 关闭 · 仅本地模型示例</div></div>}
          </div>{fileOpen&&<FilePanel onClose={()=>setFileOpen(false)}></FilePanel>}</div>
        </div>
      </section>}
      {screen==="settings"&&<SettingsScreen config={config} defaults={defaults} setConfig={setConfig} scenario={scenario} setScenario={selectScenario} stopped={stopped} effective={effective} onReset={openReset} onStop={stopToggle} onPlay={()=>{lastView.current="settings";go("flow");completeFeedback();}} onPreviewRule={previewRule} onExport={exportDesign} saveProblem={saveProblem}></SettingsScreen>}
      {screen==="flow"&&<FlowScreen config={config} effective={effective} feedbackKind={feedbackKind} simulatedModel={simulatedModel} onSimulatedModel={switchSimulatedModel} onResolveAttention={resolveAttention} introSeconds={introSeconds} reduced={reduced} stopped={stopped} phase={phase} elapsed={elapsed} onStart={startIntro} onSkip={skipIntro} onStep={introStep} action={action} bubble={bubble} onReact={directReaction} onComplete={completeFeedback} onNeed={needFeedback} onIdle={resetPet} onStop={stopToggle} log={log} onMediaError={()=>notify("素材无法播放，保留静态回退并记录待检查。")}></FlowScreen>}
      {screen==="spec"&&<SpecScreen theme={config.theme} accent={config.accent} onTheme={v=>setConfig("theme",v)}></SpecScreen>}
      {screen==="assets"&&<AssetsScreen action={assetAction} onAction={v=>setAssetAction(v)} reduced={reduced||!effective.petRunning} reviewOnly={!effective.petRunning} onMediaError={()=>notify("素材无法播放，请检查本地资源。")}></AssetsScreen>}
    </div></main>
    <footer className="reviewfooter"><span>本地设计预览 · 模拟数据与事件 · 未接入真实 DSH</span><span>{reduced?"减少动态":"无声音"} · 内容与许可见角色对照 · 2026.11.03 / R3</span></footer>
    </div>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal();}}><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-desc"><div className="eyebrow">RESET THIS SKIN</div><h2 id="reset-title">回到本套默认？</h2><p id="reset-desc">恢复暖白、默认大小和互动节奏。全局停止、静音偏好和授权状态不受影响。</p><div className="modal-actions"><Button onClick={closeModal}>保留调整</Button><Button kind="primary" onClick={()=>{setConfigState(SkinPreview.copy(defaults));resetPet();closeModal();notify(stopped?"已重置本套；效果仍处于停止状态":"已恢复本套默认值");}}>重置本套参数</Button></div></section></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </>;
}
fetch("content/design-defaults.json").then(r=>{if(!r.ok)throw new Error("DEFAULTS_UNAVAILABLE");return r.json();}).then(design=>ReactDOM.createRoot(document.getElementById("root")).render(<App design={design}></App>)).catch(()=>{document.getElementById("root").textContent="设计配置未能加载。请通过项目 HTTP 预览地址打开，并检查 content/design-defaults.json。";});
