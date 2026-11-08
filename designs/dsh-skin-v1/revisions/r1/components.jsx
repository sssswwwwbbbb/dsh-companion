/* Presentational building blocks; prototype content is fictional and local. */
function Icon({name="plus"}) {
  const paths = {
    plus:<><path d="M12 5v14M5 12h14"></path></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></>,
    panel:<><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M9 4v16"></path></>,
    folder:<path d="M3 7V5h6l2 2h10v12H3Z"></path>,
    chat:<><path d="M4 4h16v13H9l-5 4Z"></path><path d="M8 8h8M8 12h5"></path></>,
    chevron:<path d="m9 5 7 7-7 7"></path>,
    down:<path d="m5 9 7 7 7-7"></path>,
    check:<path d="m5 12 4 4 10-10"></path>,
    close:<path d="m6 6 12 12M6 18 18 6"></path>,
    copy:<><rect x="8" y="8" width="12" height="13" rx="2"></rect><path d="M15 8V3H3v13h5"></path></>,
    file:<><path d="M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6"></path></>,
    arrow:<path d="M12 20V4m-6 6 6-6 6 6"></path>,
    bolt:<path d="m13 2-9 12h7l-1 8 10-13h-7Z"></path>,
    sun:<><circle cx="12" cy="12" r="4"></circle><path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l1 1M19 19l1 1M4 20l1-1M19 5l1-1"></path></>,
    moon:<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"></path>,
    settings:<><path d="M4 6h16M4 12h16M4 18h16"></path><circle cx="9" cy="6" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="8" cy="18" r="2"></circle></>,
    play:<path d="m8 4 12 8-12 8Z"></path>,
    pause:<path d="M8 5v14M16 5v14"></path>,
    reset:<><path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"></path></>,
    dots:<><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></>,
    shield:<><path d="m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6Z"></path><path d="m8 12 3 3 5-6"></path></>,
    warning:<><path d="m12 3 10 18H2Z"></path><path d="M12 9v5M12 17v1"></path></>,
    link:<><path d="m9 15 6-6M9 6l2-2a5 5 0 0 1 7 7l-2 2M8 11l-2 2a5 5 0 0 0 7 7l2-2"></path></>,
    stop:<rect x="5" y="5" width="14" height="14" rx="2"></rect>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"></path></>,
    heart:<path d="M12 21 3 12A6 6 0 0 1 12 4a6 6 0 0 1 9 8Z"></path>,
    flag:<><path d="M5 22V3h13l-2 5 2 5H5"></path></>
  };
  return <span className="icon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths[name] || paths.plus}</svg></span>;
}
function Button({children,icon,kind="",small=false,...props}) {
  return <button className={"button "+kind+(small?" small":"")} {...props}>{icon&&<Icon name={icon}></Icon>}{children}</button>;
}
function Toggle({label,value,onChange,disabled=false}) {
  return <button type="button" className={"toggle"+(value?" on":"")} role="switch" aria-label={label} aria-checked={value} disabled={disabled} onClick={()=>onChange(!value)}><span></span></button>;
}
function Pill({children,tone=""}) {return <span className={"pill "+tone}>{children}</span>;}
function SettingRow({title,description,children}) {
  return <div className="setting-row"><div><strong>{title}</strong>{description&&<p>{description}</p>}</div><div className="setting-control">{children}</div></div>;
}
function Segmented({label,value,options,onChange,disabled=false}) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(o=><button key={o.value} disabled={disabled} type="button" className={value===o.value?"active":""} aria-pressed={value===o.value} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>;
}
function PetMedia({action="idle",reduced=false,className="",onEnd,onError}) {
  const videoRef=React.useRef(null);
  React.useEffect(()=>{
    const v=videoRef.current;
    if(!v)return;
    if(reduced){v.pause();return;}
    v.currentTime=0;
    const p=v.play();if(p)p.catch(()=>{});
    return ()=>v.pause();
  },[action,reduced]);
  if(reduced)return <img className={"pet-portrait "+className} src="assets/whale-maid/idle-poster.png" alt="鲸鱼娘静态待机"></img>;
  return <video ref={videoRef} key={action} className={"pet-video "+className} src={"assets/whale-maid/"+action+".webm"} poster="assets/whale-maid/idle-poster.png" muted playsInline autoPlay loop={action==="idle"||action==="sleep"} onEnded={onEnd} onError={onError} aria-label={"鲸鱼娘动作："+action}></video>;
}
function ChatBody({onFile,onCopy,state="complete",onRetry}) {
  return <>
    <div className="chat-date">本地示例会话 · 11 月 3 日</div>
    <div className="user-row">
      <div className="user-message">帮我把这份观察整理成一份清晰的实施记录。保留状态、默认配置和需要继续验证的部分。</div>
      <button className="attachment" onClick={onFile}><Icon name="file"></Icon>观察记录.md <small>2.4 KB</small></button>
    </div>
    <div className="assistant-label"><span className="assistant-mark">d</span><span>DSH</span></div>
    <details className="process">
      <summary><span className="chevron"><Icon name="chevron"></Icon></span>查看工作过程<span className="summary-end">2 个步骤 · 已完成</span></summary>
      <div className="process-steps">
        <div><Icon name="check"></Icon><span>读取文件</span><button className="file-inline" onClick={onFile}>观察记录.md</button></div>
        <div><Icon name="check"></Icon><span>整理状态与配置示例</span></div>
      </div>
    </details>
    <article className="message-body">
      <h2>让工作安静地向前。</h2>
      <p>已把观察整理为三部分：日常阅读、轻量反馈和可恢复的设置。下面是一份用于检查<strong>长回复、表格和代码排版</strong>的示例记录。</p>
      <h3>01 / 先保护阅读</h3>
      <p>暖白背景保留档案感。正文、工具结果与输入区使用稳定表面；装饰留在两侧空白。即使切换到复杂背景，信息仍然有明确的层次。</p>
      <div className="table-wrap"><table><thead><tr><th>区域</th><th>处理方式</th><th>状态</th></tr></thead><tbody>
        <tr><td>正文与文件引用</td><td>稳定底色，清晰的链接与焦点</td><td><Pill tone="green">已设计</Pill></td></tr>
        <tr><td>代码与表格</td><td>独立滚动，保留完整内容</td><td><Pill tone="green">已设计</Pill></td></tr>
        <tr><td>任务完成反馈</td><td>短气泡，回到安静待机</td><td><Pill tone="blue">模拟展示</Pill></td></tr>
      </tbody></table></div>
      <h3>02 / 让默认值可以被理解</h3>
      <p>首次使用采用本套默认值。用户调整后显示“已自定义”；关闭效果保留开启入口；设备不可用时说明原因。</p>
      <div className="codeblock"><div className="codebar"><span>JSON · 设计值示意</span><button className="iconbutton" aria-label="复制配置示例" onClick={e=>onCopy(e.currentTarget.closest(".codeblock").querySelector("code").textContent)}><Icon name="copy"></Icon></button></div><pre><code>{'{\n  "appearance": "archive-warm",\n  "background": true,\n  "companion": { "enabled": true, "size": 160 },\n  "feedback": { "sound": false, "cooldownSeconds": 30 }\n}'}</code></pre></div>
      <h3>03 / 保留下一步的依据</h3>
      <p>视觉稿验证的是阅读与操作体验。真实主题接入、系统桌面角色和任务状态订阅，需要在对应运行能力就绪后单独检查。</p>
      <p>完整内容见 <button className="file-inline" onClick={onFile}>观察记录.md</button>。点击文件可打开右侧预览，关闭后回到当前阅读位置。</p>
    </article>
    {state==="loading"&&<div className="run-status" role="status"><span className="loading-dot"></span>正在整理下一段内容…<span className="caption">本地模拟</span></div>}
    {state==="error"&&<div className="error-banner" role="alert"><Icon name="warning"></Icon><div><strong>本次回复未完成</strong><p>示例连接中断，已保留输入内容。</p></div><Button small onClick={onRetry}>重试</Button></div>}
    {state==="needs-user"&&<div className="notice blue"><Icon name="flag"></Icon><span>有一项操作需要你处理。请查看会话中的原始请求。</span></div>}
    <div className="message-actions"><button className="iconbutton" aria-label="复制回复" onClick={e=>onCopy(e.currentTarget.closest(".reading").querySelector(".message-body").innerText)}><Icon name="copy"></Icon></button><button className="iconbutton" aria-label="重新生成示例" onClick={onRetry}><Icon name="reset"></Icon></button><span className="end">示例内容 · 未调用模型</span></div>
  </>;
}
function FilePanel({onClose}) {
  return <aside className="filepanel" aria-label="文件预览">
    <header className="filepanel-header"><span className="row"><Icon name="file"></Icon>观察记录.md</span><button className="iconbutton" aria-label="关闭文件预览" onClick={onClose}><Icon name="close"></Icon></button></header>
    <div className="filepanel-content"><div className="eyebrow">PREVIEW / LOCAL SAMPLE</div><h2>工作区观察记录</h2><Pill>只读示例</Pill><h3>阅读</h3><p>保持正文底色。密集表格不缩小文字，允许横向滚动。</p><h3>设置</h3><p>每个显示的皮肤选项都有默认值。调整后显示来源；停止效果后仍可进入管理页恢复。</p><h3>反馈</h3><p>完成反馈只提示结果，不代替原始会话记录。需要用户处理时，保留明确入口。</p><h3>接入检查</h3><p>主题 token、资源路径、生命周期与桌宠桥接按共享合同消费。这份示例不包含真实业务文件。</p></div>
  </aside>;
}
Object.assign(window,{Icon,Button,Toggle,Pill,SettingRow,Segmented,PetMedia,ChatBody,FilePanel});
