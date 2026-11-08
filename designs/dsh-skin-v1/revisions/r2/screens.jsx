function SettingsScreen({config,defaults,setConfig,scenario,setScenario,stopped,onReset,onStop,onPlay,onExport,saveProblem}) {
  const changed=Object.keys(defaults).some(k=>config[k]!==defaults[k]);
  const tag=(key)=><Pill tone={config[key]===defaults[key]?"":"orange"}>{config[key]===defaults[key]?"默认":"已自定义"}</Pill>;
  const unavailable=scenario==="unavailable";
  return <section className="settings-shell" data-screen-label="02 皮肤设置与状态">
    <nav className="settings-nav" aria-label="设置导航"><h2>皮肤与陪伴</h2><button className="sideitem selected"><Icon name="settings"></Icon>当前皮肤</button>{scenario!=="unsupported"&&<button className="sideitem" onClick={()=>document.getElementById("feedback-section")?.scrollIntoView({behavior:"smooth"})}><Icon name="heart"></Icon>轻量反馈</button>}<button className="sideitem" onClick={onStop}><Icon name={stopped?"play":"pause"}></Icon>{stopped?"恢复效果":"停止效果"}</button><div className="navfooter">管理入口始终可用<br></br>设置只保存在此预览中</div></nav>
    <div className="settings-main">
      <header className="settings-head"><div><div className="eyebrow">APPEARANCE / 01</div><h1>让陪伴刚刚好。</h1><p className="caption">调整本套皮肤。每一处改动，都有默认值可回到。</p></div><Pill tone={changed?"orange":""}>{changed?"已自定义":"使用本套默认"}</Pill></header>
      <div className="settings-body"><div className="settings-inner">
        <div className="state-review" role="group" aria-label="审稿状态"><span>审稿状态</span>{[{v:"default",t:"首次默认"},{v:"custom",t:"已自定义"},{v:"off",t:"用户关闭"},{v:"unavailable",t:"能力不可用"},{v:"unsupported",t:"未声明反馈"}].map(x=><button key={x.v} className={scenario===x.v?"active":""} aria-pressed={scenario===x.v} onClick={()=>setScenario(x.v)}>{x.t}</button>)}</div>
        <div className="skin-banner"><div><div className="eyebrow">CURRENT SKIN / CHARACTER R2</div><h2>档案暖白 · 鲸鱼娘</h2><p>从扫描睁眼，到安静陪伴，始终是熟悉的她。暖白承接工作，银蓝保留角色识别。</p><div className="row" style={{marginTop:12,gap:6}}><Pill>主工作区</Pill><Pill>自带背景</Pill><Pill tone="blue">统一角色</Pill></div></div><div className="banner-pet"><PetMedia reduced={true}></PetMedia></div></div>
        {saveProblem&&<div className="notice warning" role="alert">此浏览器未允许保存。当前改动仅在本次预览有效。</div>}
        {stopped&&<div className="notice warning"><Icon name="pause"></Icon><span>效果已停止。参数已保留；重置本套也不会自动恢复。</span><Button small onClick={onStop}>恢复效果</Button></div>}
        {unavailable&&<div className="notice warning"><Icon name="warning"></Icon><span>此设备尚无可用的桌面角色能力。主题可继续使用，桌宠参数已保留。</span></div>}
        {scenario==="unsupported"&&<div className="notice blue">审稿用精简声明：此版本只包含主题、背景、开场与桌宠，未声明工作反馈。</div>}
        <section className="setting-section"><header><h3>外观</h3><span className="caption">仅对本套生效</span></header>
          <SettingRow title="阅读配色" description="暖白为默认；夜间配色是本次设计候选。">{tag("theme")}<Segmented label="阅读配色" value={config.theme} options={[{value:"light",label:"暖白"},{value:"dark",label:"夜间"}]} onChange={v=>setConfig("theme",v)}></Segmented></SettingRow>
          <SettingRow title="自带档案背景" description="装饰留在阅读区外，关闭后使用纯色底。">{tag("background")}<Toggle label="自带档案背景" value={config.background} onChange={v=>setConfig("background",v)}></Toggle></SettingRow>
          <SettingRow title="动态效果" description="减少动态时使用静态角色，跳过扫描和自动表演。">{tag("motion")}<Segmented label="动态效果" value={config.motion} options={[{value:"system",label:"跟随系统"},{value:"reduced",label:"减少动态"}]} onChange={v=>setConfig("motion",v)}></Segmented></SettingRow>
          <SettingRow title="启动开场" description="随 DSH 窗口播放，可随时跳过。当前为本地参考演示。">{tag("startup")}<Toggle label="启动开场" value={config.startup} onChange={v=>setConfig("startup",v)}></Toggle></SettingRow>
        </section>
        <section className="setting-section"><header><h3>桌面陪伴</h3><Pill tone={unavailable?"orange":config.pet?"green":""}>{unavailable?"能力不可用":config.pet?"已启用":"用户已关闭"}</Pill></header>
          <SettingRow title="鲸鱼娘桌宠" description={unavailable?"需要底座提供可用的桌面角色模块；安装或更新后重试。":config.pet?"沿用扫描形象，默认安静待机。":"已保留大小和回应设置，随时可以重新开启。"}>{tag("pet")}<Toggle label="鲸鱼娘桌宠" disabled={unavailable} value={config.pet} onChange={v=>setConfig("pet",v)}></Toggle></SettingRow>
          {config.pet&&!unavailable&&<>
            <SettingRow title="角色大小" description="调整角色在预览中的显示大小。">{tag("size")}<input type="range" aria-label="角色大小" min="120" max="220" step="10" value={config.size} onChange={e=>setConfig("size",Number(e.target.value))}></input><span className="mono">{config.size}px</span></SettingRow>
            <SettingRow title="点击回应" description="点击后回应一次；连续点击合并，不叠加表演。">{tag("clickResponse")}<Toggle label="点击回应" value={config.clickResponse} onChange={v=>setConfig("clickResponse",v)}></Toggle></SettingRow>
          </>}
        </section>
        {scenario!=="unsupported"&&<section className="setting-section" id="feedback-section"><header><h3>工作反馈</h3><Pill tone="blue">设计提案 · 模拟状态</Pill></header>
          <SettingRow title="任务结果反馈" description={unavailable?"桌面能力不可用，反馈不会运行。":config.completion?"只跟随当前会话，不在每次输出文字时播放。":"已关闭；保留动作、气泡和冷却设置。"}>{tag("completion")}<Toggle label="任务结果反馈" value={config.completion} disabled={unavailable} onChange={v=>setConfig("completion",v)}></Toggle></SettingRow>
          {config.completion&&!unavailable&&<>
            <SettingRow title="显示短气泡" description="完成时轻声提醒；无声音也能理解反馈。">{tag("bubbles")}<Toggle label="显示短气泡" value={config.bubbles} onChange={v=>setConfig("bubbles",v)}></Toggle></SettingRow>
            <SettingRow title="最短提醒间隔" description="同类事件在间隔内合并；需要处理的提示优先。">{tag("cooldown")}<Segmented label="最短提醒间隔" value={config.cooldown} options={[{value:15,label:"15 秒"},{value:30,label:"30 秒"},{value:60,label:"60 秒"}]} onChange={v=>setConfig("cooldown",v)}></Segmented></SettingRow>
            <div className="mapping"><label>完成时的动作<select aria-label="完成时的动作" value={config.completionAction} onChange={e=>setConfig("completionAction",e.target.value)}><option value="greet">轻轻致意 · greet</option><option value="stretch">伸个懒腰 · stretch</option></select></label><div><div className="caption" style={{marginBottom:8}}>反馈预览</div><Button small icon="play" onClick={onPlay}>看看效果</Button></div><p className="mapping-caption">未完成或失败不会庆祝。需要你处理时使用静态提示，回到会话查看原始信息。{config.completionAction!=="greet"?" 动作已自定义。":""}</p></div>
          </>}
        </section>}
        <div className="notice"><Icon name="shield"></Icon><span>本套不提供声音或模型专属形象。对应设置不显示；全局静音与停止偏好继续保留。</span></div>
      </div></div>
      <footer className="settings-foot"><span className="caption">{saveProblem?"本次预览有效":"修改自动保存在本地预览"} · {changed?"已自定义":"本套默认"}</span><div className="row" style={{gap:8}}><Button small onClick={onExport} icon="download">导出设计值</Button><Button small onClick={onReset}>重置本套参数</Button></div></footer>
    </div>
  </section>;
}
function FlowScreen({config,reduced,stopped,phase,elapsed,onStart,onSkip,onStep,action,bubble,onReact,onComplete,onNeed,onIdle,onStop,log,onMediaError}) {
  const disabledPet=stopped||!config.pet;
  return <section className="flow-page" data-screen-label="03 启动、工作区与桌宠">
    <div className="flow-main">
      <header className="page-heading"><div><div className="eyebrow">CONTINUITY / 03</div><h1>从进入，到陪伴。</h1></div><Pill tone="blue">本地时序模拟</Pill></header>
      <div className="startup-preview">
        {(phase==="scan"&&!reduced&&!stopped)?<><video key="scan" className="startup-video" src="assets/reference/whale-girl-scan.mp4" autoPlay muted playsInline onEnded={()=>onStep("workspace")} onError={onMediaError}></video><span className="scan-credit">NativeDog1 / dsh-boot-animation · 上游标注 BSD-3-Clause，原作者待确认</span></>:<div className="startup-inner">
          <div className="archive-kicker"><span>DSH / PERSONAL WORKSPACE</span><span>ARCHIVE — 001</span></div>
          <div><div className="eyebrow" style={{marginBottom:15}}>{phase==="workspace"?"WORKSPACE READY":phase==="archive"?"OPENING YOUR WORKSPACE":"WELCOME BACK"}</div><h2 className="startup-title">{phase==="workspace"?"继续，把事情做好。":phase==="archive"?"翻开今天的档案。":"欢迎回来。"}</h2><p className="startup-sub">{phase==="workspace"?"开场交给工作区，角色回到桌面待机。":reduced?"减少动态已启用。以静态画面进入工作区。":"一张暖白底板，一段安静的开场。"}</p></div>
          <div className="startup-bottom"><div><span className="mono">{phase==="archive"?"01 / 03 · 档案":phase==="workspace"?"03 / 03 · 工作区":"LOCAL PREVIEW"}</span><span className="caption">无声 · 窗口范围 · 随时跳过</span></div><span className="archive-stamp">{phase==="workspace"?"READY":"ARCHIVE"}</span></div>
        </div>}
        {(phase==="archive"||phase==="scan")&&<button className="button small skip-intro" onClick={onSkip}>跳过开场 <span className="mono">ESC</span></button>}
        <div className="progress-line"><span style={{width:phase==="workspace"?"100%":Math.min(elapsed/8.24*100,100)+"%"}}></span></div>
      </div>
      <div className="sequence-controls"><Button icon="play" kind="primary" onClick={onStart}>播放完整衔接</Button><Button small onClick={()=>onStep("archive")}>档案</Button><Button small onClick={()=>onStep("scan")}>扫描</Button><Button small onClick={()=>onStep("workspace")}>工作区</Button><span className="caption">{reduced?"当前：减少动态":stopped?"当前：效果已停止":"1.2 秒档案 → 7.04 秒原片 → 工作区"}</span></div>
      <div className="desktop-preview">
        <div className="desktop-copy"><div className="eyebrow">DESKTOP COMPANION</div><h3>{stopped?"暂停，也很自在。":"我在这里。"}</h3><p>{stopped?"所有待播反馈已清理，恢复由你决定。":"点击角色试试回应，或模拟一条任务结果。"}</p><div className="row" style={{gap:7,marginTop:16,flexWrap:"wrap"}}><Button small onClick={onComplete}>任务完成</Button><Button small onClick={onNeed}>需要处理</Button><Button small onClick={onIdle}>回待机</Button></div></div>
        {disabledPet?<div className="empty-pet">{stopped?"效果已停止":"桌宠已关闭"}<br></br><span className="caption">管理入口仍然可用</span></div>:<div className="pet-area" style={{width:config.size+40,height:config.size+40}}><button className="pet-click" aria-label="点击鲸鱼娘" onClick={onReact}><PetMedia action={action} reduced={reduced} staticPose={action==="idle"&&!!bubble} onEnd={onIdle} onError={onMediaError}></PetMedia></button>{bubble&&config.bubbles&&<div className="pet-bubble" role="status">{bubble}</div>}</div>}
        <button className="iconbutton pet-menu" aria-label={stopped?"恢复皮肤效果":"停止皮肤效果"} onClick={onStop}><Icon name={stopped?"play":"pause"}></Icon></button>
      </div>
    </div>
    <aside className="flow-side"><h3>一次衔接，三个层次</h3>
      <div className="step"><span className="stepnum">01</span><div><h4>档案 / 1.2 秒</h4><p>暖白与橙色建立开场识别。文字只叙述进入，不伪造授权或身份核验。</p></div></div>
      <div className="step"><span className="stepnum">02</span><div><h4>扫描 / 7.04 秒</h4><p>原片按窗口容纳，不裁关键内容。冷启动可播放，运行中启用不强制重播。</p></div></div>
      <div className="step"><span className="stepnum">03</span><div><h4>工作区 / 持续</h4><p>正文使用稳定表面；角色回到桌面，不覆盖聊天输入区。</p></div></div>
      <div className="notice">同一角色，从扫描近景延伸为桌面 Q 版。姿态与轻动态为本轮设计稿，完整动作仍待制作。</div>
      <div className="timeline-log" aria-live="polite">{log.join("\n")||"等待预览事件…"}</div>
    </aside>
  </section>;
}
function SpecScreen({theme,onTheme}) {
  const colors=[["阅读底板","--paper",theme==="dark"?"#202423":"#F4F1E9"],["稳定表面","--surface",theme==="dark"?"#292E2C":"#FFFDF8"],["正文墨色","--ink",theme==="dark"?"#F1EFE6":"#2B302C"],["操作强调","--accent",theme==="dark"?"#F2AB71":"#A54C19"],["角色信号","--signal",theme==="dark"?"#91C3D7":"#35677E"],["分隔边界","--line",theme==="dark"?"#494F46":"#D9D4C7"]];
  return <section className="spec-page" data-screen-label="04 视觉规范">
    <div className="spec-top"><div><div className="eyebrow">ARCHIVE WARM / VISUAL NOTES 01</div><h1>有温度，也有秩序。</h1><p>沿用档案暖白与橙色识别，将开场的叙事感收进日常工作。角色负责短暂回应，阅读始终占据中心。</p></div><Segmented label="规范模式" value={theme} options={[{value:"light",label:"暖白"},{value:"dark",label:"夜间稿"}]} onChange={onTheme}></Segmented></div>
    <div className="spec-grid">
      <section className="spec-section"><header><span>01</span><h2>颜色有各自的职责</h2></header><div className="swatches">{colors.map(c=><div className="swatch" key={c[1]}><div className="swatch-color" style={{background:"var("+c[1]+")"}}></div><b>{c[0]}</b><small>{c[2]}</small></div>)}</div><p className="spec-text">参考橙 #FF7500 留给大块识别与装饰；小字号操作文字加深为 #A54C19。蓝色用于角色与状态，不替代操作强调。错误另用红色，并附文字。</p></section>
      <section className="spec-section"><header><span>02</span><h2>先读清楚，再有性格</h2></header><div className="type-sample"><span className="display">翻开今天的档案。</span><small>展示 / 30–52</small></div><div className="type-sample"><span>设置与日常操作</span><small>系统无衬线 / 13–15</small></div><div className="type-sample"><span className="reading-type">把重要的内容，留在清晰的表面。</span><small>正文 / 15 · 1.85</small></div><div className="type-sample"><span className="mono">const state = "ready";</span><small>等宽 / 12 · 1.8</small></div><p className="spec-text">中文系统字体 PingFang SC，展示文字 Songti SC；Latin 与中文分别回退。不携带外部字体，不修改用户字号偏好。</p></section>
      <section className="spec-section"><header><span>03</span><h2>状态不只靠颜色</h2></header><div className="component-samples"><Button kind="primary">主要操作</Button><Button>普通操作</Button><Button disabled>不可用</Button><Button kind="quiet">次要操作</Button></div><div className="component-samples" style={{marginTop:18}}><button className="button focus-demo">键盘焦点</button><Pill tone="orange">已选中</Pill><Pill tone="green">已完成</Pill><Pill tone="red">连接中断</Pill></div><div className="notice blue" style={{marginTop:18}}><Icon name="flag"></Icon>需要你处理：保留原始请求入口。</div><p className="spec-text">悬停加底色；选中有文案或标记；焦点为 2px 外描边；禁用保留原因。点击区域桌面至少 32px，小窗口关键操作至少 36px。</p></section>
      <section className="spec-section"><header><span>04</span><h2>一致的表面与节奏</h2></header><div className="spec-space">{[4,8,12,16,24,32].map(n=><div className="space-item" key={n}><span style={{height:n*2}}></span>{n}</div>)}</div><p className="spec-text">4px 基础间距。控件圆角 6px、输入区 14px、窗口 18px；卡片只用于独立内容，常规设置以分隔线组织。</p><p className="spec-text">边框 1px。焦点与文字不透明；阴影只用于浮层和窗口，不给每个区块加卡片。</p></section>
      <section className="spec-section"><header><span>05</span><h2>背景止于阅读之外</h2></header><div className="notice"><Icon name="file"></Icon>正文、代码、表格、菜单始终有稳定底色。</div><p className="spec-text">自带网格只在两侧留白可见。角色不进入输入与正文热区。长代码和宽表格局部滚动；页面滚动只归属聊天区。</p></section>
      <section className="spec-section"><header><span>06</span><h2>动态可以被关掉</h2></header><div className="row"><Pill>140ms 悬停</Pill><Pill>220ms 面板</Pill><Pill>30s 反馈冷却</Pill></div><p className="spec-text">减少动态时：无扫描、无自动角色视频、无脉冲与平滑滚动。状态与文字仍保留。停止效果清空队列，不被旧回调恢复。</p><p className="spec-text">暖白为设计默认，夜间只作为本套候选稿；未完成实际宿主接入前，不承诺任何官方界面已覆盖。</p></section>
    </div>
  </section>;
}
function AssetsScreen({action,onAction,reduced,onMediaError}) {
  const poses=[{key:"idle",name:"安静待机",note:"默认 · 轻微呼吸"},{key:"react",name:"侧头回应",note:"点击 · 1.8 秒"},{key:"greet",name:"轻轻挥手",note:"完成 · 2.6 秒"},{key:"stretch",name:"伸个懒腰",note:"可选 · 3 秒"}];
  const current=poses.find(p=>p.key===action)||poses[0];
  return <section className="asset-page character-r2" data-screen-label="05 统一角色设定 R2">
    <header className="page-heading"><div><div className="eyebrow">ONE CHARACTER / TWO SCALES</div><h1>从开场到桌面，都是她。</h1><p className="caption">以扫描形象为基准，统一五官、头饰与配色。画幅变小，角色不变。</p></div><Pill tone="blue">R2 · 统一角色稿</Pill></header>
    <div className="character-board">
      <div className="character-sample scan-study"><div className="character-image scan-reference">{action==="scan"&&!reduced?<video src="assets/reference/whale-girl-scan.mp4" poster="assets/reference/scan-poster.png" controls autoPlay muted playsInline onEnded={()=>onAction("idle")} onError={onMediaError}></video>:<img src="assets/reference/scan-poster.png" alt="角色基准：扫描开场中的银蓝长发、蓝青眼睛、白色褶边和深蓝蝴蝶结"></img>}<span className="study-label">01 / 角色基准</span></div><h3>扫描近景</h3><p>保留已确认的扫描睁眼方向，作为脸部、发色和头饰的共同依据。</p><div className="asset-controls"><Button small icon="play" onClick={()=>onAction("scan")} disabled={reduced}>播放扫描开场</Button>{reduced&&<span className="caption">当前保留静态画面</span>}</div></div>
      <div className="character-sample companion-study"><div className="character-image companion-stage"><div className="character-orbit" aria-hidden="true"></div><PetMedia action={action==="scan"?"idle":action} reduced={reduced} onError={onMediaError}></PetMedia><span className="study-label">02 / 同角色桌宠</span><span className="pose-label">{reduced?"静态待机":current.name}</span></div><h3>桌面 Q 版</h3><p>同款银蓝长发与头饰，用柔和立体材质承接扫描近景，避免换成另一位角色。</p><div className="asset-controls pose-buttons">{poses.map(p=><button key={p.key} className={"button small "+(action===p.key?"selected-pose":"")} aria-pressed={action===p.key} onClick={()=>onAction(p.key)}>{p.name}</button>)}</div></div>
    </div>
    <div className="identity-strip" aria-label="统一角色识别点"><div><span className="identity-color hair"></span><strong>银蓝长发</strong><small>统一发色与长发轮廓</small></div><div><span className="identity-color eyes"></span><strong>蓝青瞳色</strong><small>保留冷色的眼部识别</small></div><div><span className="identity-color headband"></span><strong>白色褶边</strong><small>头饰造型保持一致</small></div><div><span className="identity-color bow"></span><strong>深蓝蝴蝶结</strong><small>头部位置与色彩对应</small></div></div>
    <div className="pose-heading"><div><div className="eyebrow">EXPRESSION / 04 POSES</div><h2>表情有变化，设定不漂移。</h2></div><span className="caption">姿态稿 + 轻动态预览</span></div>
    <div className="pose-lineup">{poses.map((p,i)=><button className={"pose-card "+(action===p.key?"active":"")} key={p.key} onClick={()=>onAction(p.key)} aria-label={"预览"+p.name} aria-pressed={action===p.key}><span className="pose-number">0{i+1}</span><PetMedia action={p.key} staticPose={true}></PetMedia><strong>{p.name}</strong><small>{p.note}</small></button>)}</div>
    <div className="character-design-note"><Icon name="file"></Icon><div><strong>同一角色的设计延伸</strong><p>全身女仆裙、领结和鞋履是本轮补充设计，扫描原片未展示这些细节。四个姿态共用同一服装；当前以姿态切换和轻微位移动效演示，完整逐帧动作尚待制作。</p></div></div>
    <details className="resource-details"><summary>素材来源与运行接入说明</summary><div><p>桌宠姿态：本轮由 imagegen 根据扫描参考生成，保持相同角色识别点，未使用旧桌宠视频。扫描片来源为 LeeRolling → NativeDog1；原作者与 NOTICE 摘要差异仍待核对，当前仅作本地参考。</p><p>旧版与原素材保留在 index-r1.html 和 assets/whale-maid/。现有 formatVersion 2 内容包是 R1 技术验证包，仍引用旧桌宠，不代表本轮 R2 角色已接入实际 DSH。新角色尚未进入运行包。</p></div></details>
  </section>;
}
Object.assign(window,{SettingsScreen,FlowScreen,SpecScreen,AssetsScreen});
