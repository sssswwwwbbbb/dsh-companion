// Faithful runtime port of the R3 settings vocabulary. State and actions stay in Page.
// Sources: designs/dsh-skin-v1/{tokens.css,styles.css,screens.js,components.js}.
function formatFocusTime(seconds){
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
export function createSkinSettingsUi(React,assets){
  const h=React.createElement;
  const paths={clock:'M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 1 1 20 0Z',library:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',install:'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',settings:'M4 6h16M4 12h16M4 18h16',more:'M5 12h.01M12 12h.01M19 12h.01',shield:'m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6Z',pause:'M8 5v14M16 5v14',play:'m8 4 12 8-12 8Z',reset:'M4 9a8 8 0 1 1 0 7M4 3v6h6',arrow:'M5 12h14m-5-5 5 5-5 5'};
  const Icon=({name})=>{const pair=assets.workspace?.controlIcons?.[name];return pair?h('span',{className:'r3-icon r3-semantic-icon','aria-hidden':true},h('img',{className:'r3-icon-light',src:pair.light,alt:''}),h('img',{className:'r3-icon-dark',src:pair.dark,alt:''})):h('svg',{className:'r3-icon',viewBox:'0 0 24 24','aria-hidden':true},h('path',{d:paths[name]||paths.settings}));};
  const Pill=({children,tone=''})=>h('span',{className:'r3-pill '+tone},children);
  const Button=({children,icon,kind='',buttonRef,...props})=>h('button',{type:'button',ref:buttonRef,...props,className:'r3-button '+kind},icon&&h(Icon,{name:icon}),children);
  function Toggle({label,value,onChange,disabled=false}){
    const [pending,setPending]=React.useState(null);
    const checked=pending??value;
    function toggle(){
      const next=!checked,saving=onChange(next);
      if(saving){setPending(next);void saving.finally(()=>setPending(null));}
    }
    return h('button',{type:'button',className:'r3-toggle'+(checked?' on':''),role:'switch','aria-label':label,'aria-checked':!!checked,disabled,onClick:toggle},h('span'));
  }
  function RangeField({label,field,value,min,max,onChange,disabled}){
    const [draft,setDraft]=React.useState(null),held=React.useRef(false),last=React.useRef(null);
    const shown=draft??value;
    function finish(){
      if(!held.current)return;
      held.current=false;const next=last.current;last.current=null;setDraft(null);
      if(next!==null&&next!==value)onChange(next);
    }
    const adjustKey=e=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key);
    return h(React.Fragment,null,
      h('input',{type:'range','aria-label':label,value:shown,min,max,step:max<=1?.01:1,disabled,
        onPointerDown:e=>{if(e.button!==0)return;held.current=true;e.currentTarget.setPointerCapture(e.pointerId);},
        onPointerUp:finish,onLostPointerCapture:finish,onBlur:finish,
        onKeyDown:e=>{if(adjustKey(e))held.current=true;},onKeyUp:e=>{if(adjustKey(e))finish();},
        onChange:e=>{const next=e.currentTarget.valueAsNumber;if(held.current){last.current=next;setDraft(next);}else onChange(next);}
      }),
      h('output',null,field==='backgroundOpacity'?Math.round(shown*100)+'%':field==='size'?shown+'%':String(shown)));
  }
  function TextField({label,value,maxLength,disabled,onChange}){
    const [draft,setDraft]=React.useState(null);
    return h('textarea',{'aria-label':label,value:draft??value,maxLength,rows:4,disabled,
      onChange:e=>setDraft(e.currentTarget.value),onBlur:()=>{if(draft!==null&&draft!==value)onChange(draft);setDraft(null);}});
  }
  const Row=({title,description,feedback,children,...props})=>h('div',{className:'r3-setting-row',...props},h('div',{className:'r3-setting-copy'},h('strong',null,title),description&&h('p',null,description),feedback),h('div',{className:'r3-setting-control'},children));
  const Section=({title,children,tag})=>h('section',{className:'r3-setting-section'},h('header',null,h('h3',null,title),tag),children);
  function Shell({tab,view,setSection,skin,busy,stopping,active,status,error,notice,footer,scheme,work,stopSkin,replyStyle,character,petMemory,children}){
    const selected=skin?.selected,canRestore=!!(skin?.stopped&&selected),body=React.useRef(null),hasMore=!!skin?.settings?.pet,hasScenes=!!skin?.workspaceScenes;
    const [resetKey,setResetKey]=React.useState(null);
    const resetButton=React.useRef(null),cancelReset=React.useRef(null);
    const selectedKey=selected?.contentKey;
    const confirmingReset=tab==='skin'&&resetKey!==null&&resetKey===selectedKey;
    React.useEffect(()=>{body.current?.scrollTo({top:0});},[tab,view]);
    React.useEffect(()=>{setResetKey(null);},[tab,selectedKey]);
    React.useEffect(()=>{if(confirmingReset)cancelReset.current?.focus();},[confirmingReset]);
    function closeReset(){setResetKey(null);resetButton.current?.focus();}
    async function reset(){
      const result=await work('skinReset',{contentKey:selectedKey});
      if(result)setResetKey(null);
    }
    const nav=(title,to,icon,disabled=false)=>h('button',{type:'button',className:'r3-sideitem'+(tab===to?' selected':''),'aria-current':tab===to?'page':undefined,disabled,onClick:()=>setSection(to,to==='skin'?'common':undefined)},h(Icon,{name:icon}),title);
    return h('section',{className:'dshc-page dshc-r3','data-theme':scheme,'data-screen-label':'主题盒子','data-skin-preset':assets.workspace&&skin?.selected?.contentKey===assets.workspace.contentKey?assets.workspace.preset:undefined},h('style',null,skinSettingsCss+commanderSettingsCss),
      h('aside',{className:'r3-settings-nav','aria-label':'主题盒子导航'},h('h2',null,'主题盒子'),
        nav('皮肤库','library','library'),nav('本套设置','skin','settings',!selected),nav('专注与休息','focus','clock'),nav('开始使用','setup','arrow'),nav('授权与更新','account','shield'),
        selected&&tab!=='library'&&h('button',{type:'button',className:'r3-sideitem r3-stop','aria-label':canRestore?'恢复本套皮肤':'停止全部皮肤效果',disabled:stopping||canRestore&&(busy||!active)||skin?.stopped&&!selected,onClick:()=>canRestore?void work('skinSelect',{contentKey:selected.contentKey}):void stopSkin()},h(Icon,{name:canRestore?'play':'pause'}),canRestore?'恢复效果':'停止效果'),
        h('p',{className:'r3-navfooter'},active?'插件已激活':'插件尚未激活',h('br'),'本地皮肤共用插件授权')),
      h('div',{className:'r3-settings-main'},h('header',{className:'r3-settings-head'},h('div',null,
        h('h1',null,tab==='library'?'皮肤库':tab==='skin'?'按你的习惯，刚刚好。':tab==='account'?'授权与更新':tab==='control'?'桌面陪伴':tab==='focus'?'专注与休息':'开始使用'),
        h('p',{className:'r3-caption'},tab==='library'?'管理工作区主题、桌宠和开场。':tab==='skin'?(selected?.name||'本套设置')+' · 只调整这套已提供的偏好。':tab==='focus'?'用一段计时安排工作与休息。':'从同一处管理你的皮肤与陪伴。')),
        tab==='library'?h(Button,{icon:'install',disabled:busy||!active,onClick:()=>void work('skinInstall')},'导入本地 ZIP'):tab!=='focus'&&h(Pill,{tone:skin?.stopped?'orange':''},status)),
        tab==='skin'&&(hasMore||hasScenes||character)&&h('div',{className:'r3-settings-tabs',role:'tablist','aria-label':'本套设置层级'},...['common',...(character?['character']:[]),...(hasMore?['more']:[]),...(hasScenes?['scenes']:[])].map(value=>h('button',{key:value,type:'button',role:'tab','aria-selected':view===value,onClick:()=>setSection('skin',value)},({common:'常用',character:'角色',more:'更多',scenes:'场景'})[value]))),
        h('div',{className:'r3-settings-body',ref:body},error&&h('p',{className:'r3-notice error',role:'alert'},error),notice&&h('p',{className:'r3-notice',role:'status'},notice),children),
        tab!=='library'&&tab!=='focus'&&h('footer',{className:'r3-settings-foot'},h('div',null,h('p',null,footer),h('small',null,skin?.stopped?'效果已停止，参数与关闭选择已保留。':'工作区与左侧导航使用本套配色。')),
          h('div',{className:'r3-actions'},tab==='skin'&&h(Button,{buttonRef:resetButton,icon:'reset',disabled:busy||!active||!selected,'aria-expanded':confirmingReset,onClick:()=>confirmingReset?closeReset():setResetKey(selectedKey)},'重置本套'),canRestore&&h(Button,{kind:'primary',icon:'play',disabled:busy||!active,onClick:()=>void work('skinSelect',{contentKey:selected.contentKey})},'恢复本套皮肤')),
          confirmingReset&&h('div',{className:'r3-reset-confirm',role:'group','aria-label':'确认重置本套设置',onKeyDown:event=>{if(event.key==='Escape'&&!busy){event.stopPropagation();closeReset();}}},
            h('p',null,(replyStyle?'将主题、桌宠与开场参数恢复为默认值。模块开关、自动播放与回复风格照旧。':'将本套自定义参数恢复为默认值。模块开关与启动时自动播放设置照旧。')+(petMemory?'已保存的桌宠互动也会清空。':'')),
            h('div',{className:'r3-actions'},
              h(Button,{buttonRef:cancelReset,disabled:busy,onClick:closeReset},'取消'),
              h(Button,{kind:'primary',disabled:busy||!active,onClick:()=>void reset()},'确认重置'))))));

  }
  function FocusPanel({focusSource,active,busy,work}){
    const focus=React.useSyncExternalStore(focusSource.subscribe,focusSource.getSnapshot);
    const [minutes,setMinutes]=React.useState(25),[breakMinutes,setBreakMinutes]=React.useState(5);
    if(!focus)return h('p',{className:'r3-caption',role:'status'},'正在读取计时状态…');
    const {phase,kind,seconds,quiet}=focus;
    const live=phase==='running'||phase==='paused',done=phase==='done';
    const disabled=busy||!active;
    const action=(name,value={})=>work('focusAction',{action:name,...value});
    function startRow(mode,title,options,value,setValue){
      return h(Row,{title},h('select',{className:'r3-focus-duration','aria-label':title+'时长',disabled,value,onChange:event=>setValue(Number(event.currentTarget.value))},...options.map(option=>h('option',{key:option,value:option},option+' 分钟'))),
        h(Button,{kind:mode==='focus'?'primary':'',disabled,onClick:()=>void action('start',{kind:mode,minutes:value})},'开始'+title));
    }
    return h('div',{'data-focus-panel':true},
      !active&&h('p',{className:'r3-notice'},'激活主题盒子后即可使用计时和陪伴勿扰。'),
      h(Section,{title:'计时'},
        (live||done)&&h(Row,{title:(kind==='break'?'休息':'专注')+(done?'结束':phase==='paused'?'已暂停':'中'),
          description:done?'可以开始下一段计时。':'回到会话后，窗口底部会显示剩余时间。',
          feedback:live&&h('output',{className:'r3-focus-time','aria-label':'剩余时间','aria-live':'off'},formatFocusTime(seconds)),
          ...(done?{role:'status'}:{})},
          live&&h(Button,{kind:'primary',disabled,onClick:()=>void action(phase==='paused'?'resume':'pause')},phase==='paused'?'继续':'暂停'),
          h(Button,{disabled,onClick:()=>void action('clear')},done?'清除提示':'结束计时')),
        !live&&startRow('focus','专注',[15,25,45],minutes,setMinutes),
        !live&&startRow('break','休息',[5,10],breakMinutes,setBreakMinutes)),
      h(Section,{title:'陪伴提醒'},h(Row,{title:'陪伴勿扰',description:'暂停自动桌宠回应，仍可点击角色或主动和它说话。'},
        h(Toggle,{label:'陪伴勿扰',value:quiet,disabled,onChange:enabled=>action('quiet',{enabled})}))));
  }
  function ImportedCover({contentKey,loadCover,children}){
    const [src,setSrc]=React.useState(null),[visible,setVisible]=React.useState(false),node=React.useRef(null);
    React.useEffect(()=>{
      if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
      const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'180px'});
      if(node.current)observer.observe(node.current);return()=>observer.disconnect();
    },[]);
    React.useEffect(()=>{
      if(!visible)return;let current=true;
      void loadCover(contentKey).then(url=>{if(current)setSrc(url);}).catch(()=>{});return()=>{current=false;};
    },[contentKey,loadCover,visible]);
    return h('span',{ref:node,className:'r3-cover-frame'},src?h('img',{className:'r3-imported-cover',src,alt:'',loading:'lazy',draggable:false,onError:()=>setSrc(null)}):children);
  }
  function Pager({page,pages,total,disabled,onChange}){
    const [target,setTarget]=React.useState(String(page));
    React.useEffect(()=>setTarget(String(page)),[page]);
    return h('nav',{className:'r3-library-pagination','aria-label':'皮肤分页'},
      h('span',{className:'r3-caption'},'共 '+total+' 项 · 第 '+page+' / '+pages+' 页'),
      h('div',{className:'r3-actions'},h(Button,{disabled:disabled||page<=1,onClick:()=>onChange(page-1),'aria-label':'上一页皮肤'},'上一页'),h(Button,{disabled:disabled||page>=pages,onClick:()=>onChange(page+1),'aria-label':'下一页皮肤'},'下一页'),pages>1&&h('form',{className:'r3-page-jump',onSubmit:event=>{event.preventDefault();const value=Number(target);if(Number.isSafeInteger(value)&&value>=1&&value<=pages)onChange(value);}},h('input',{type:'number',min:1,max:pages,required:true,value:target,disabled,'aria-label':'跳转皮肤页',onChange:event=>setTarget(event.target.value)}),h(Button,{type:'submit',disabled},'跳转'))));
  }
  function Library({skin,active,busy,selection,importedKey,setSection,select,work,stopSkin,loadCover,dshVersion,loadOnlineCover,downloads,downloadAction,catalogAction,catalogLoading,catalogError,errorText,community=false}){
    const defaults={page:1,pageSize:24,q:'',module:'all',sort:'newest',owned:false};
    const [view,setView]=React.useState(community?'installed':'online'),[query,setQuery]=React.useState(defaults),[search,setSearch]=React.useState(''),[localQuery,setLocalQuery]=React.useState(''),[localModule,setLocalModule]=React.useState('all'),[localPage,setLocalPage]=React.useState(1),[removeKey,setRemoveKey]=React.useState(null),[clearSettings,setClearSettings]=React.useState(false),[adding,setAdding]=React.useState([]),[showAllJobs,setShowAllJobs]=React.useState(false);
    const attempted=React.useRef(false),currentHeading=React.useRef(null),grid=React.useRef(null),localTools=React.useRef(null),focusAfterApply=React.useRef(null);
    const market=skin?.market,rows=(skin?.catalog||[]).filter(row=>!row.example),selected=skin?.selected,selectedKey=selected?.contentKey;
    const jobs=downloads?.jobs||[],isWorking=job=>['queued','downloading','cancelling'].includes(job.status),running=jobs.filter(isWorking);
    const applied=skin?.phase==='ready'&&!skin.stopped;
    React.useEffect(()=>{
      if(active&&!community&&!attempted.current){attempted.current=true;const initial=market?.query?{...defaults,...market.query,pageSize:24}:defaults;setQuery(initial);setSearch(initial.q);void catalogAction(initial);}
    },[active]);
    React.useEffect(()=>{if(!applied||!selectedKey||focusAfterApply.current!==selectedKey)return;focusAfterApply.current=null;currentHeading.current?.focus();},[applied,selectedKey]);
    React.useEffect(()=>{if(removeKey&&!rows.some(row=>row.contentKey===removeKey))setRemoveKey(null);},[skin?.catalog,removeKey]);
    React.useEffect(()=>{if(importedKey){setView('installed');setLocalQuery('');setLocalModule('all');setLocalPage(1);}},[importedKey]);
    if(!skin)return h('p',{className:'r3-caption',role:'status'},'正在读取皮肤库…');
    const modules={theme:'工作区主题',pet:'桌宠',startup:'开场'},current=rows.find(row=>row.contentKey===selectedKey),unavailable=current?.status==='unavailable';
    const switching=selection?.status==='applying',ready=skin.phase==='ready'&&!skin.stopped&&active&&!unavailable;
    const canPreview=ready&&skin.settings?.startup?.status==='enabled'&&skin.results?.startup?.status==='ready';
    const status=skin.phase==='stopping'?'正在停止':switching?'正在切换':unavailable?'文件不可用':!active?'等待激活':skin.phase==='fault'?'需要恢复':skin.stopped?'效果已停止':ready?'已应用':'等待生效';
    const quota=market?.quota,acquired=new Set(quota?.acquiredIds||[]);
    const reserved=new Set(running.filter(job=>job.skinId&&!acquired.has(job.skinId)).map(job=>job.skinId));
    const noFreeSlot=quota?.limit>0&&quota.remaining-reserved.size<=0;
    function apply(row){focusAfterApply.current=row.contentKey;select(row);}
    function moduleStatus(module){if(skin.disabled?.[module])return '已关闭';if(skin.settings?.[module]?.status==='unavailable'||skin.results?.[module]?.status==='unavailable')return '不可用';if(!ready)return '未运行';return skin.results?.[module]?.status==='ready'?'已启用':'未运行';}
    function browse(patch){const next={...query,...patch};setQuery(next);void catalogAction(next);}
    async function download(row){
      setAdding(list=>[...list,row.releaseId]);
      try{await downloadAction('skinDownloadAdd',{releaseId:row.releaseId,id:row.id,title:row.title||row.name,size:row.size});}
      finally{setAdding(list=>list.filter(id=>id!==row.releaseId));}
    }
    function matchesModule(row,value){if(value==='all')return true;if(value==='no-pet')return !row.modules.includes('pet');return row.modules.includes(value);}
    const groups=new Map();
    for(const row of rows){const list=groups.get(row.id)||[];list.push(row);groups.set(row.id,list);}
    const grouped=[...groups.values()].map(list=>{const versions=[...list].sort((a,b)=>b.version.localeCompare(a.version,'en'));const current=versions.find(row=>row.contentKey===selectedKey);return {...(current||versions[0]),versions};});
    const localRows=grouped.filter(row=>matchesModule(row,localModule)&&[row.name,row.id,row.description||''].join(' ').toLowerCase().includes(localQuery.trim().toLowerCase())).sort((a,b)=>Number(b.contentKey===selectedKey)-Number(a.contentKey===selectedKey)||a.name.localeCompare(b.name,'zh-CN')||b.version.localeCompare(a.version));
    const localPages=Math.max(1,Math.ceil(localRows.length/24)),localCurrent=Math.min(localPage,localPages),localVisible=localRows.slice((localCurrent-1)*24,localCurrent*24);
    const shownJobs=[...jobs.filter(job=>isWorking(job)).sort((a,b)=>a.createdAt-b.createdAt),...jobs.filter(job=>!isWorking(job))].slice(0,showAllJobs?jobs.length:8);
    const queueStatus={queued:'等待下载',downloading:'下载与校验中',cancelling:'正在取消',completed:'安装完成',failed:'下载失败',cancelled:'已取消'};
    function moduleOptions(label,value,onChange){return h('select',{'aria-label':label,value,onChange:event=>onChange(event.target.value)},h('option',{value:'all'},'全部模块'),h('option',{value:'pet'},'含桌宠'),h('option',{value:'no-pet'},'不含桌宠'));}
    function localCard(row){
      const isCurrent=selectedKey===row.contentKey,isTarget=selection?.contentKey===row.contentKey,pending=isTarget&&switching,failed=isTarget&&selection.status==='failed',available=row.status!=='unavailable';
      const older=(row.versions||[]).find(item=>item.contentKey!==row.contentKey&&item.contentKey!==selectedKey)||(row.versions||[]).find(item=>item.contentKey!==row.contentKey);
      const label=!available?'文件不可用':pending?'应用中':failed?'应用失败':isCurrent?status:'已安装';
      const action=!available||isCurrent&&!failed?null:pending?'正在应用…':failed?'重试应用':'应用皮肤';
      const fallback=h('span',{className:'r3-library-cover-title'},row.name);
      return h('article',{key:row.contentKey||'invalid-index',className:'r3-library-card','data-current':isCurrent,'data-skin-key':row.contentKey},
        h('div',{className:'r3-library-cover','aria-hidden':true},active&&row.hasCover?h(ImportedCover,{contentKey:row.contentKey,loadCover},fallback):fallback),
        h('div',{className:'r3-library-card-body'},h('div',{className:'r3-library-card-title'},h('h3',null,row.name),h('span',null,row.version+(row.versions&&row.versions.length>1?' · '+row.versions.length+' 个版本':''))),
          h('div',{className:'r3-library-modules'},...row.modules.map(module=>h('span',{key:module},modules[module]||module))),
          !available&&h('p',{className:'r3-caption'},row.reason==='SKIN_RESOURCE_MISSING'?'部分文件缺失。':'文件校验未通过。'),
          h('div',{className:'r3-library-card-foot'},h('span',{className:'r3-caption'},label),action&&h(Button,{kind:'primary',disabled:busy||!active,onClick:()=>apply(row),'aria-label':action+' · '+row.name},action),older&&h(Button,{disabled:busy||!active,onClick:()=>void work('rollbackSkin',{id:row.id}),'aria-label':'回退到 '+older.version+' · '+row.name},'回退 '+older.version),row.contentKey&&h(Button,{disabled:busy,'aria-label':'卸载 · '+row.name,'aria-expanded':removeKey===row.contentKey,onClick:()=>{setRemoveKey(removeKey===row.contentKey?null:row.contentKey);setClearSettings(false);}},'卸载')),
          removeKey===row.contentKey&&h('div',{className:'r3-remove-confirm',role:'group','aria-label':'确认卸载 · '+row.name,onKeyDown:event=>{if(event.key==='Escape'&&!busy)setRemoveKey(null);}},
            h('p',null,isCurrent?'卸载前会停止本套效果并恢复 DSH 默认外观。':'将删除本机安装的这个皮肤版本。'),
            h('p',{className:'r3-caption'},'默认保留设置，重装后继续使用；卸载不返还领取名额。'),
            rows.some(other=>other.contentKey!==row.contentKey&&other.id===row.id)?h('p',{className:'r3-caption'},'还有其他版本，共用设置将保留。'):h('label',{className:'r3-clear-settings'},h('input',{type:'checkbox',checked:clearSettings,disabled:busy,onChange:event=>setClearSettings(event.currentTarget.checked)}),'同时清除本套设置与互动记忆'),
            h('div',{className:'r3-actions'},h(Button,{disabled:busy,onClick:()=>setRemoveKey(null)},'取消'),h(Button,{disabled:busy,onClick:async()=>{const result=await work('skinRemove',{contentKey:row.contentKey,clearSettings});if(result)setRemoveKey(null);}},'确认卸载')))));
    }
    const page=market?.page||1,pages=market?.pages||1,total=market?.total??market?.skins.length??0;
    return h('section',{className:'r3-library','data-skin-library':true},
      !active&&h('div',{className:'r3-notice'},'激活主题盒子后即可下载、导入和应用皮肤。',h(Button,{onClick:()=>setSection('setup')},'前往激活')),
      h('div',{className:'r3-library-current'},h('div',{className:'r3-library-current-title'},h('h2',{ref:currentHeading,tabIndex:-1},selected?.name||'DSH 默认外观'),selected&&h(Pill,{tone:ready&&!switching?'blue':''},status)),
        h('p',null,!selected?'下载只安装资源，点击「应用皮肤」后才切换外观。':unavailable?'部分文件不可用，可选择其他皮肤。':skin.stopped?'本套设置已保留，可随时恢复。':'当前选择 · '+selected.version),
        selected&&current?.modules.length>0&&h('ul',{className:'r3-current-modules','aria-label':'本套模块状态'},...current.modules.map(module=>h('li',{key:module},modules[module]+' · '+moduleStatus(module)))),
        selected&&h('div',{className:'r3-actions'},!unavailable&&(skin.stopped||skin.phase==='fault')&&h(Button,{kind:'primary',disabled:busy||!active,onClick:()=>apply(selected)},'恢复本套'),h(Button,{disabled:busy,onClick:()=>setSection('skin','common')},'本套设置'),canPreview&&h(Button,{disabled:busy,onClick:()=>void work('replayIntro')},'预览开场'),(!skin.stopped||switching)&&h(Button,{disabled:skin.phase==='stopping',onClick:()=>void stopSkin()},'停止本套效果'))),
      h('div',{className:'r3-library-switch',role:'tablist','aria-label':'皮肤库视图'},!community&&h('button',{type:'button',role:'tab','aria-selected':view==='online',onClick:()=>setView('online')},'在线皮肤'),h('button',{type:'button',role:'tab','aria-selected':view==='installed'||community,onClick:()=>setView('installed')},community?'自带皮肤':'已安装',h('span',null,rows.length))),
      jobs.length>0&&h('details',{className:'r3-downloads',open:running.length>0},h('summary',null,'下载任务',running.length?' · '+running.filter(job=>job.status==='downloading'||job.status==='cancelling').length+' 项进行中，'+running.filter(job=>job.status==='queued').length+' 项等待':' · 最近完成与失败记录'),
        h('ul',null,...shownJobs.map(job=>h('li',{key:job.id,'data-download-job':job.releaseId},h('div',{className:'r3-download-copy'},h('strong',null,job.title),h('span',{className:'r3-caption'},queueStatus[job.status],job.status==='completed'&&job.autoApplied?' · 已自动应用':'',job.status==='completed'&&job.applyError?' · 自动应用失败：'+errorText(job.applyError):'',job.status==='downloading'&&job.total>0?' · '+Math.floor(job.bytes/job.total*100)+'%':''),job.status==='downloading'&&h('progress',{max:job.total||1,value:job.bytes,'aria-label':job.title+'下载进度'}),job.error&&h('p',{className:'r3-download-error'},errorText(job.error))),
          isWorking(job)?h(Button,{disabled:job.status==='cancelling',onClick:()=>void downloadAction('skinDownloadCancel',{id:job.id}),'aria-label':'取消下载 · '+job.title},job.status==='cancelling'?'正在取消':'取消'):['failed','cancelled'].includes(job.status)&&h(Button,{disabled:!active,onClick:()=>void download({releaseId:job.releaseId,id:job.skinId,title:job.title,size:job.total})},'重试')))),jobs.length>8&&h(Button,{onClick:()=>setShowAllJobs(!showAllJobs)},showAllJobs?'收起任务':'查看全部 '+jobs.length+' 个任务')),
      view==='online'&&!community?h(React.Fragment,null,
        h('form',{ref:grid,className:'r3-library-toolbar',onSubmit:event=>{event.preventDefault();browse({q:search.trim(),page:1});}},h('input',{type:'search',value:search,'aria-label':'搜索在线皮肤',placeholder:'搜索名称、描述或 ID',maxLength:80,onChange:event=>setSearch(event.target.value)}),h(Button,{type:'submit',disabled:!active},'搜索'),moduleOptions('在线皮肤模块',query.module,value=>browse({module:value,page:1})),h('select',{'aria-label':'在线皮肤排序',value:query.sort,onChange:event=>browse({sort:event.target.value,page:1})},h('option',{value:'newest'},'最近更新'),h('option',{value:'name'},'按名称')),h(Button,{disabled:catalogLoading||!active,onClick:()=>browse({})},catalogLoading?'正在刷新…':'刷新皮肤库')),
        h('div',{className:'r3-library-subtoolbar'},h('label',null,h('input',{type:'checkbox',checked:query.owned,disabled:!active,onChange:event=>browse({owned:event.target.checked,page:1})}),'只看已领取'),quota&&h('p',{className:'r3-caption','data-skin-quota':true},quota.limit===0?'可下载皮肤数量：不限量':'已领取 '+quota.used+' / '+quota.limit+' 套 · 剩余 '+quota.remaining+' 套')),
        h('p',{className:'r3-caption r3-market-caption'},'首次下载会领取本套；更新、重装不重复计数，卸载不返还名额。可继续添加其他下载。'),
        catalogError&&h('p',{className:'r3-notice error',role:'alert'},catalogError),
        h('div',{className:'r3-library-results','aria-busy':catalogLoading},h('p',{className:'r3-caption',role:'status'},catalogLoading?'正在查找皮肤…':'找到 '+total+' 套皮肤'),
          h('div',{className:'r3-library-grid r3-market-grid'},...(market?.skins||[]).slice(0,24).map(row=>{
            const installed=rows.find(local=>local.contentKey===row.contentKey&&local.status!=='unavailable'),hasOlder=rows.some(local=>local.id===row.id&&local.contentKey!==row.contentKey),supported=row.compatible??row.supportedDsh.includes(dshVersion),job=jobs.find(job=>job.releaseId===row.releaseId&&isWorking(job)),alreadyAcquired=acquired.has(row.id);
            const exhausted=!alreadyAcquired&&noFreeSlot,waiting=adding.includes(row.releaseId),downloading=job?.status==='downloading';
            const inUseHere=!!selected&&selected.manifest.id===row.id&&selected.version!==row.version;
            const label=job?job.status==='queued'?'等待下载':job.status==='cancelling'?'正在取消':'下载与校验中':waiting?'加入队列…':installed?'已安装':exhausted?'暂无可用名额':hasOlder?(inUseHere?'更新皮肤（自动应用）':'下载更新'):alreadyAcquired?'重新下载安装':'下载安装';
            const fallback=h('span',{className:'r3-library-cover-title'},row.title);
            return h('article',{key:row.releaseId,className:'r3-library-card','data-online-skin':row.id},h('div',{className:'r3-library-cover','aria-hidden':true},active&&row.hasCover?h(ImportedCover,{contentKey:row.releaseId,loadCover:loadOnlineCover},fallback):fallback),
              h('div',{className:'r3-library-card-body'},h('div',{className:'r3-library-card-title'},h('h3',null,row.title),h('span',null,row.version)),h('div',{className:'r3-library-modules'},...row.modules.map(module=>h('span',{key:module},modules[module]||module))),h('p',{className:'r3-caption'},(row.size/1048576).toFixed(1)+' MB'+(!supported?' · 当前 DSH 暂不支持':'')),
                h('div',{className:'r3-library-card-foot'},h(Button,{kind:installed?'':'primary',disabled:!active||!!job||waiting||!!installed||!supported||exhausted,onClick:()=>void download(row),'aria-label':label+' · '+row.title},label),installed&&h(Button,{disabled:busy||!active||selectedKey===installed.contentKey&&!skin.stopped,onClick:()=>apply(installed)},selectedKey===installed.contentKey&&!skin.stopped?'正在使用':'应用皮肤')),
                downloading&&h('progress',{max:job.total||1,value:job.bytes,'aria-label':row.title+'下载进度'})));
          }),!market?.skins.length&&!catalogLoading&&h('div',{className:'r3-library-empty'},h('h2',null,market?'没有匹配的皮肤':'尚未获取在线皮肤'),h('p',null,market?'试试其他关键词或模块筛选。':'激活后刷新皮肤库，也可以导入本地 ZIP。')))),
        h(Pager,{page,pages,total,disabled:catalogLoading||!active,onChange:value=>{browse({page:value});grid.current?.scrollIntoView({block:'start'});}})):
      h(React.Fragment,null,h('div',{ref:localTools,className:'r3-library-toolbar'},h('input',{type:'search',value:localQuery,'aria-label':'搜索已安装皮肤',placeholder:'搜索已安装的名称或 ID',onChange:event=>{setLocalQuery(event.target.value);setLocalPage(1);}}),moduleOptions('已安装皮肤模块',localModule,value=>{setLocalModule(value);setLocalPage(1);})),h('p',{className:'r3-caption r3-market-caption'},'当前使用的皮肤优先显示。同套多个版本分别管理，卸载默认保留设置。'),h('div',{className:'r3-library-grid'},...localVisible.map(localCard),!localVisible.length&&h('div',{className:'r3-library-empty'},h('h2',null,rows.length?'没有匹配的已安装皮肤':'还没有安装皮肤'),h('p',null,rows.length?'试试其他关键词。':'到在线皮肤选择下载，或使用右上角导入本地 ZIP。'),!rows.length&&h(Button,{onClick:()=>setView('online')},'浏览在线皮肤'))),h(Pager,{page:localCurrent,pages:localPages,total:localRows.length,onChange:value=>{setLocalPage(value);localTools.current?.scrollIntoView({block:'start'});}})));
  }
  function ReplyStyleEditor({style,active,busy,work}){
    const [draft,setDraft]=React.useState(null);
    const value=draft??style;
    const changed=value.address!==style.address||value.tone!==style.tone;
    async function save(){
      const result=await work('replyStyleSave',{contentKey:style.contentKey,address:value.address,tone:value.tone});
      if(result)setDraft(null);
    }
    return h(Section,{title:'工作区回复风格'},
      h('p',{className:'r3-caption'},'称呼和语气按皮肤保存。回复风格默认开启，新会话沿用本套最近的开关选择；已单独选择的会话保留自己的开关。下一次模型请求使用这里的设置。'),
      h('form',{className:'r3-reply-style-editor',onSubmit:event=>{event.preventDefault();void save();}},
        h('label',{className:'r3-input-label'},'称呼',
          h('input',{value:value.address,maxLength:32,disabled:busy||!active,placeholder:'留空时不指定称呼',onChange:event=>setDraft({...value,address:event.target.value})})),
        h('label',{className:'r3-input-label'},'语气',
          h('textarea',{value:value.tone,maxLength:280,rows:3,disabled:busy||!active,onChange:event=>setDraft({...value,tone:event.target.value})})),
        h('div',{className:'r3-actions'},
          h(Button,{type:'submit',kind:'primary',disabled:busy||!active||!changed||!value.tone.trim()},'保存回复风格'),
          h(Button,{disabled:busy||!active||value.address===style.defaults.address&&value.tone===style.defaults.tone,onClick:()=>setDraft(style.defaults)},'填入默认风格'))));
  }
  function CharacterEditor({character,hasStyle,active,busy,work}){
    const [draft,setDraft]=React.useState(null);
    const fields=['name','identity',...['workContext','petContext'].filter(key=>Object.hasOwn(character,key))];
    const value=draft??character;
    const changed=fields.some(key=>value[key]!==character[key]);
    async function save(){
      const next=Object.fromEntries(fields.map(key=>[key,value[key]]));
      if(await work('characterSave',{contentKey:character.contentKey,...next}))setDraft(null);
    }
    const field=(key,label,maxLength,rows)=>h('label',{className:'r3-input-label'},label,
      h(rows?'textarea':'input',{value:value[key],maxLength,rows,disabled:busy||!active,onChange:event=>setDraft({...value,[key]:event.target.value})}));
    return h(Section,{title:'主题角色设定'},
      h('p',{className:'r3-caption'},Object.hasOwn(character,'workContext')?'在会话标题旁开启「主题角色」后，共用下方身份设定。'+(hasStyle?'开启「回复风格」可同时采用本套称呼与语气。':''):'本套角色设定可用于桌宠。'),
      h('form',{className:'r3-reply-style-editor',onSubmit:event=>{event.preventDefault();void save();}},
        field('name','角色名',32),field('identity','角色设定',2000,5),
        Object.hasOwn(character,'workContext')&&field('workContext','工作区场景补充',600,3),
        Object.hasOwn(character,'petContext')&&field('petContext','桌宠场景补充',600,3),
        h('div',{className:'r3-actions'},h(Button,{type:'submit',kind:'primary',disabled:busy||!active||!changed||!value.name.trim()||!value.identity.trim()},'保存角色设定'),
          h(Button,{disabled:busy||!active,onClick:()=>setDraft(character.defaults)},'填入默认角色'))),
      Object.hasOwn(character,'petContext')&&h(Row,{title:'桌宠使用主题角色',description:'采用同一身份、本套称呼与语气，再加入桌宠场景补充。关闭后使用桌宠独立人设。'},
        h(Toggle,{label:'桌宠使用主题角色',value:character.petEnabled,disabled:busy||!active,onChange:enabled=>work('characterPet',{contentKey:character.contentKey,enabled})})));
  }
  function WorkspaceCueSettings({skin,active,busy,quiet,work,previewCue}){
    const positions={'above-input':'输入框上方居中','bottom-right':'输入框右上方','top-right':'窗口右上角','bottom-bar':'窗口底栏'};
    const effects={none:'直接显示',fade:'淡入',slide:'轻移入场'};
    const change=(cue,field,value)=>work('workspaceCueConfigure',{contentKey:skin.selected.contentKey,cue,field,value});
    return h(Section,{title:'工作区场景提示'},
      h('p',{className:'r3-caption'},'每种场景可单独设置位置、时长和出场效果。预览会返回会话页面；陪伴勿扰时暂停。'),
      ...Object.entries(skin.workspaceCues.cues).map(([key,cue])=>{
        const title={welcome:'回到 DSH 时招呼',session:'切换会话时提示',workspace:'切换工作区时提示'}[key];
        const when={welcome:'离开至少 15 秒后返回，每分钟最多一次。',session:'同一工作区的已有会话之间切换，间隔至少 4 秒。',workspace:'切到另一工作区里的会话时显示，间隔至少 4 秒。展开目录不会触发。'}[key];
        const select=(label,field,options)=>h('label',{className:'r3-input-label'},label,h('select',{'aria-label':label+' · '+title,value:cue[field],disabled:busy||!active,onChange:event=>void change(key,field,field==='seconds'?Number(event.target.value):event.target.value)},...Object.entries(options).map(([value,label])=>h('option',{key:value,value},label))));
        return h('div',{key,className:'r3-cue-setting'},
          h(Row,{title,description:when+' 提示：'+cue.text},h(Button,{disabled:busy||!active||quiet||skin.stopped,onClick:()=>previewCue({contentKey:skin.selected.contentKey,kind:key,cue})},'预览提示'),h(Toggle,{label:title,value:cue.enabled,disabled:busy||!active,onChange:enabled=>change(key,'enabled',enabled)})),
          cue.enabled&&h(React.Fragment,null,h('div',{className:'r3-cue-options'},
            select('提示位置','position',positions),select('显示时长','seconds',Object.fromEntries([...new Set([1,2,3,4,5,6,7,8,cue.seconds])].sort((a,b)=>a-b).map(value=>[value,value+' 秒']))),select('出场效果','effect',effects)),
            h('div',{className:'r3-actions'},h(Button,{disabled:busy||!active,onClick:()=>change(key,'reset',null)},'恢复本条默认'))));
      }));
  }
  function MemorySettings({skin,memory,active,busy,work}){
    const [draft,setDraft]=React.useState(null);
    if(!memory)return null;
    const value=draft??memory.preference,change=(field,value)=>work('petMemoryConfigure',{contentKey:skin.selected.contentKey,field,value});
    const descriptions={...skin.settings.pet?.values.actionDescriptions,...Object.fromEntries((skin.petActivities?.actions||[]).map(row=>[row.id,row.description]))};
    return h(Section,{title:'连续陪伴',tag:h(Pill,null,'本套偏好')},
      h(Row,{title:'记住近期桌宠互动',description:'保留最近 20 条专属互动和实际动作，重启后继续使用。关闭会清空记录，保留偏好文字。'},
        h(Toggle,{label:'记住近期桌宠互动',value:memory.enabled,disabled:busy||!active,onChange:value=>change('enabled',value)})),
      memory.enabled&&h(React.Fragment,null,
        h('form',{className:'r3-reply-style-editor',onSubmit:async event=>{event.preventDefault();if(await change('preference',value))setDraft(null);}},
          h('label',{className:'r3-input-label'},'桌宠互动偏好',h('textarea',{rows:3,maxLength:400,value,disabled:busy||!active,placeholder:'例如：工作时安静一些，少走动，更多用短句回应。',onChange:event=>setDraft(event.target.value)})),
          h('p',{className:'r3-caption'},'提供给桌宠对话、完成回应和自主活动作参考。已有动作开关与勿扰继续生效。'),
          h('div',{className:'r3-actions'},h(Button,{type:'submit',kind:'primary',disabled:busy||!active||value===memory.preference},'保存互动偏好'),h(Button,{disabled:busy||!active||value===memory.defaults.preference,onClick:()=>setDraft(memory.defaults.preference)},'填入默认偏好'))),
        h('details',{className:'r3-pet-memory'},h('summary',null,'查看近期互动（'+memory.records.length+' / 20）'),
          memory.records.length?h('ol',null,...memory.records.slice().reverse().map((row,index)=>h('li',{key:row.at+':'+index},
            h('div',null,h('strong',null,({interaction:'桌宠互动',activity:'自主活动',work:'工作完成回应'})[row.source]),h('time',{dateTime:new Date(row.at).toISOString()},new Date(row.at).toLocaleString('zh-CN'))),
            row.user&&h('p',null,'你：'+row.user),h('p',null,'桌宠：'+(row.actual.speech||'安静待机')+(row.actual.action?' · '+(descriptions[row.actual.action]||row.actual.action):''))))):h('p',{className:'r3-caption'},'还没有保存的互动。下一次专属互动或实际动作后会出现在这里。')),
        h('div',{className:'r3-actions'},h(Button,{disabled:busy||!active||!memory.records.length,onClick:()=>change('clear',null)},'清空近期互动'),h(Button,{disabled:busy||!active,onClick:()=>change('reset',null)},'恢复连续陪伴默认')),
        h('p',{className:'r3-caption'},'清空会保留互动偏好；恢复默认会同时清空记录并恢复本套开关和偏好。')));
  }
  function ActivitySettings({skin,state,active,busy,work}){
    const settings=skin.petActivities;
    if(!settings)return null;
    const change=(field,value)=>work('petActivityConfigure',{contentKey:skin.selected.contentKey,field,value});
    const canRun=settings.canDecide&&active&&!busy&&!skin.stopped&&skin.settings.theme?.status==='enabled'&&settings.enabled&&!state.focus?.quiet&&skin.settings.pet?.status==='enabled'&&skin.settings.pet.values.allowActions&&skin.settings.theme?.values.workFeedbackEnabled;
    const last=settings.last;
    return h(Section,{title:'自主陪伴'},
      h(Row,{title:'自动决定短动作',description:'使用本套互动模型，在工作空闲时从已允许的动作中选择，也可以保持安静。'},
        h(Toggle,{label:'自动决定短动作',value:settings.enabled,disabled:busy||!active,onChange:value=>change('enabled',value)})),
      settings.enabled&&h(React.Fragment,null,
        h(Row,{title:'决定间隔',description:'工作中、等待处理或陪伴勿扰时暂停。'},
          h('select',{'aria-label':'自主活动间隔',value:settings.intervalMinutes,disabled:busy||!active,onChange:event=>void change('intervalMinutes',Number(event.target.value))},...[3,5,10].map(value=>h('option',{key:value,value},value+' 分钟')))),
        ...settings.actions.map(action=>h(Row,{key:action.id,title:action.description,description:action.id==='walk'?'需要角色左侧留有活动空间。':undefined},
          h(Toggle,{label:'允许自主动作 · '+action.id,value:action.enabled,disabled:busy||!active,onChange:value=>change('actions',{action:action.id,enabled:value})}))),
        h('p',{className:'r3-caption',role:'status','data-pet-activity-result':settings.pending?'pending':last?.result||'none'},settings.pending?'正在决定…':last?.result==='performed'?'最近活动 · '+(settings.actions.find(row=>row.id===last.action)?.description||last.action):last?.result==='quiet'?'最近决定 · 安静待机':last?.result==='unavailable'?'本次未能决定，保持待机。':'开启工作反馈与允许动作后，工作空闲时生效。'),
        h('div',{className:'r3-actions'},h(Button,{disabled:!canRun||settings.pending,onClick:()=>void work('petActivityDecide',{contentKey:skin.selected.contentKey})},'现在决定一次'),
          h(Button,{disabled:busy||!active,onClick:()=>void change('reset',null)},'重置活动偏好'))));
  }
  function Settings({state,skin,view,active,busy,fieldBusy,fieldDrafts,fieldFailures,saveField,work,stopSkin,stopping,modelDirectory,petText,setPetText,sendPet,petReply,setSection,previewCue}){
    const selected=skin?.selected,candidate=selected,modules=skin?.settings||{},r2=candidate?.contentKey===assets.workspace?.contentKey,commander=r2&&assets.workspace.preset==='commander-v1';
    const candidateArt=r2?assets.workspace.portrait:null;
    const roleLabel=commander?assets.workspace.roleLabel:null;
    if(!selected)return h('div',{className:'r3-library-empty'},h('p',null,'先在皮肤库选择一套皮肤。'),h(Button,{onClick:()=>setSection('library')},'前往皮肤库'));
    if(!modules.pet)view='common';
    const supported=module=>modules[module]?.status==='enabled';
    const control=(module,field)=>modules[module]?.controls?.find(c=>c.field===field);
    const changed=c=>c.overridden&&JSON.stringify(c.value)!==JSON.stringify(c.default);
    const tag=c=>h(Pill,{tone:changed(c)?'orange':''},changed(c)?'已自定义':'默认');
    function fieldRow(module,c,title,description){
      if(!c)return null;
      const key=module+'.'+c.field,pending=Object.hasOwn(fieldDrafts,key);
      const failed=pending?null:fieldFailures[key];
      const fieldValue=pending?fieldDrafts[key]:c.value,change=value=>saveField(module,c.field,value);
      const feedback=failed&&h('p',{className:'r3-field-failure',role:'status'},'保存未确认，当前显示已读取的设置。');
      let input;
      if(c.type==='boolean')input=h(Toggle,{label:title||c.label,value:fieldValue,disabled:fieldBusy,onChange:change});
      else if(c.type==='text')input=h(TextField,{label:title||c.label,value:fieldValue,maxLength:c.maxLength,disabled:fieldBusy,onChange:change});
      else if(c.type==='model'){
        const choices=[{value:{mode:'current'},label:'跟随 DSH 默认模型'+(modelDirectory.current?'（'+modelDirectory.current.model+'）':'')},...modelDirectory.models.map(m=>({value:{mode:'specific',provider:m.provider,model:m.model},label:m.label}))];
        const value=JSON.stringify(fieldValue);if(!choices.some(m=>JSON.stringify(m.value)===value))choices.push({value:fieldValue,label:'已保存模型（当前不可用）'});
        input=h('select',{'aria-label':title||c.label,value,disabled:fieldBusy,onChange:e=>change(JSON.parse(e.target.value))},...choices.map(m=>h('option',{key:JSON.stringify(m.value),value:JSON.stringify(m.value)},m.label)));
      }else if(c.type==='enum')input=h('select',{'aria-label':title||c.label,value:fieldValue,disabled:fieldBusy,onChange:e=>change(e.target.value)},...c.options.map(value=>h('option',{key:value,value},value)));
      else input=h(RangeField,{label:title||c.label,field:c.field,value:fieldValue,min:c.min,max:c.max,disabled:fieldBusy,onChange:change});
      return h(Row,{key,title:title||c.label,description,feedback,'data-skin-field':key},pending?h(Pill,null,'保存中…'):tag(c),input,
        failed&&h(Button,{disabled:busy||!active,'aria-label':'重试保存 · '+(title||c.label),onClick:()=>saveField(module,c.field,failed.value,true)},'重试保存'));
    }
    const moduleRow=(module,title,description)=>{
      const item=modules[module];if(!item)return null;const unavailable=item.status==='unavailable';
      return h(Row,{title,description:unavailable?'当前不可用：'+item.reason:description,'data-skin-module':module},h(Pill,{tone:unavailable?'orange':''},unavailable?'能力不可用':skin.disabled?.[module]?'已关闭':'已启用'),h(Toggle,{label:module==='startup'?'启用本套开场内容':module==='pet'?'启用桌宠':'启用工作区主题',value:!skin.disabled?.[module],disabled:busy||unavailable,onChange:value=>work('skinDisable',{module,disabled:!value,contentKey:selected.contentKey})}));
    };
    const startupReady=supported('startup')&&skin?.results?.startup?.status==='ready'&&!skin?.stopped;
    const startupSound=control('startup','soundEnabled');
    const autoPlayLabel='启动时自动播放';
    const legacyExample=selected&&['sample-a','sample-b'].includes(selected.id);
    const stateNotice=skin?.stopped?h('div',{className:'r3-notice warning',role:'status'},'效果已停止，参数已保留。',selected&&h(Button,{disabled:busy||!active,onClick:()=>void work('skinSelect',{contentKey:selected.contentKey})},'恢复本套皮肤')):null;
    const interaction=h(Section,{title:'和桌宠说话'},h('div',{'data-pet-interaction':true},state?.petInteraction?.available?h(React.Fragment,null,
      h('p',{className:'r3-caption'},state.petInteraction.smartEnabled?'结合本套人设与近期互动，回应点击和桌宠专属输入。':'智能互动已关闭，仍可使用本套的本地回应。'),modelDirectory.reason&&state.petInteraction.smartEnabled&&h('p',{className:'r3-caption'},'尚无可用模型，当前使用本地回应。'),
      h('form',{onSubmit:e=>{e.preventDefault();void sendPet();}},h('label',{className:'r3-input-label'},'桌宠专属输入',h('input',{type:'text',value:petText,maxLength:1000,disabled:busy,onChange:e=>setPetText(e.target.value),placeholder:'例如：换个动作陪我一下'})),h('div',{className:'r3-actions'},h(Button,{type:'submit',kind:'primary',disabled:busy||!petText.trim()},busy?'正在回应…':'发送'),h(Button,{disabled:busy,onClick:()=>void sendPet('click')},'轻点一下'))),
      (petReply||state.petInteraction.last)&&h('p',{'data-pet-reply':true,role:'status'},(()=>{const reply=petReply||state.petInteraction.last;return (reply.actual.speech||'安静陪着你')+(reply.actual.action?' · '+reply.actual.action:'')+(reply.mode==='fallback'?'（本地回应）':'');})())):h('p',{className:'r3-caption'},skin?.stopped?'恢复本套后可互动。':skin?.disabled?.pet?'桌宠已关闭，参数已保留。':'本套尚未提供可用的桌宠互动。')));
    return h(React.Fragment,null,h(Button,{onClick:()=>setSection('library')},'返回皮肤库'),stateNotice,skin?.error&&h('div',{className:'r3-notice error',role:'alert'},'恢复信息：'+skin.error.code),!active&&h('div',{className:'r3-notice'},'完成本机授权后即可应用皮肤。',h(Button,{onClick:()=>setSection('setup')},'前往开始使用')),
      legacyExample&&h('div',{className:'r3-notice warning'},'当前保留的是历史技术样例。可返回皮肤库选择已安装的整套皮肤。'),
      view==='common'?h(React.Fragment,null,h('div',{className:'r3-skin-banner'},h('div',null,h('div',{className:'r3-eyebrow'},'本套皮肤'),h('h2',null,candidate?.name||'选择你的日常'),h('p',null,roleLabel||'这是当前皮肤的参数。换一套时，保留这一套的偏好。'),h('div',{className:'r3-actions'},h(Pill,null,candidate?.version||'本套偏好'),h(Pill,{tone:'blue'},skin.stopped?'当前选择 · 已停止':'当前选择'))),candidateArt&&h('span',{className:'r3-banner-pet'+(r2?' workspace-role':''),role:'img','aria-label':roleLabel||(commander?'机械姬 · 母版04':'鲸鱼娘 · 安静待机')},h('img',{src:candidateArt,alt:'',draggable:false}))),
        
        state?.replyStyle&&h(ReplyStyleEditor,{style:state.replyStyle,active,busy,work}),
        supported('theme')&&skin.workspaceCues&&h(WorkspaceCueSettings,{skin,active,busy,quiet:state.focus?.quiet,work,previewCue}),
        modules.theme&&h(Section,{title:'阅读与表面'},moduleRow('theme','工作区主题','为会话工作区和左侧导航应用本套配色。'),supported('theme')&&h(React.Fragment,null,
          fieldRow('theme',control('theme','backgroundOpacity'),'背景浓度','0 为纯色；保留本套的图案与浓度。'),
          fieldRow('theme',control('theme','entryMarkEnabled'),'入口标识','在主题盒子入口使用本套标识。'))),
        supported('theme')&&control('theme','workspaceDetailsEnabled')&&h(Section,{title:'主题细节'},fieldRow('theme',control('theme','workspaceDetailsEnabled'),'工作区细节',commander?'成套图标、指挥链路与导航陪伴。':'成套图标、纸面与导航陪伴。'),control('theme','workspaceMotionEnabled')&&fieldRow('theme',control('theme','workspaceMotionEnabled'),'界面动效',commander?'完成回应留在陪伴位；输入、停止或切换会话会取消，系统减少动态优先。':'开卷与归档演出可随时跳过；系统减少动态优先。')),
        supported('theme')&&control('theme','workFeedbackEnabled')&&h(Section,{title:'工作反馈'},
          fieldRow('theme',control('theme','workFeedbackEnabled'),'工作反馈','显示当前会话的执行与待处理状态。'),
          supported('pet')&&fieldRow('theme',control('theme','petEchoEnabled'),'桌宠呼应',modules.pet.values.allowActions?'本轮回复完成时，桌宠可轻回应一次。':'开启桌宠动作后生效；关闭选择会保留。'),
          supported('pet')&&modules.theme.values.workFeedbackEnabled&&modules.theme.values.petEchoEnabled&&skin.workAutonomy&&h(Row,{title:'模型决定完成回应',description:'桌宠待机时，可用已选桌宠模型决定保持安静或轻回应。最多每分钟一次，只使用工作状态和桌宠设定。'},
            skin.workAutonomy.enabled&&h('span',{className:'r3-caption',role:'status'},skin.workAutonomy.pending?'正在决定…':({quiet:'上次保持待机',reacted:'上次轻回应',unavailable:'模型暂未回应'})[skin.workAutonomy.last]||'等待本轮完成'),
            h(Toggle,{label:'模型决定完成回应',value:skin.workAutonomy.enabled,disabled:busy||!active||!modules.pet.values.allowActions,onChange:enabled=>work('workAutonomyConfigure',{contentKey:selected.contentKey,enabled})}))),
        h(ActivitySettings,{skin,state,active,busy,work}),
        modules.pet&&h(Section,{title:'桌面陪伴'},moduleRow('pet','桌宠','关闭时保留参数，随时可以重新开启。'),supported('pet')&&h(React.Fragment,null,fieldRow('pet',control('pet','size'),'角色大小','按百分比调整角色，保持原有比例。'),fieldRow('pet',control('pet','smartEnabled'),'智能互动','开启后，点击与桌宠专属输入使用互动模型。'))),
        modules.startup&&h(Section,{title:'开场与进入'},moduleRow('startup','本套开场内容',startupSound?'开场后回到当前工作区。':'静音影片与静态回退独立于桌宠。'),supported('startup')&&h(React.Fragment,null,
          h(Row,{title:autoPlayLabel,description:'完全退出后，从 DeepSeek Harness 图标重新打开时播放。'},h(Pill,null,'全局偏好'),h(Toggle,{label:autoPlayLabel,value:state?.settings?.startupEnabled,disabled:busy||!active,onChange:value=>work('configure',{startupEnabled:value})})),
          fieldRow('startup',control('startup','reducedMotion'),'减少开场动态','显示同角色静态画面。macOS 的减少动态效果同样生效。'),
          fieldRow('startup',startupSound,'开场声音','关闭后仍会播放开场画面。'),
          h(Row,{title:'预览开场',description:skin?.stopped?'恢复本套后可预览。':state?.startup?.workspaceHandoff?'播放后返回当前会话，保留草稿。':'手动预览不会修改自动播放偏好。'},h(Pill,{tone:startupReady?'green':''},state?.startup?.playing?'正在播放':startupReady?'内容就绪':'尚未就绪'),h(Button,{icon:'play',disabled:busy||!active||!startupReady,onClick:()=>void work('replayIntro')},'预览开场'))))
      ):h(React.Fragment,null,modules.pet&&h(Section,{title:'互动与近期记忆',tag:h(Pill,null,'本套偏好')},supported('pet')?modules.pet.controls.filter(c=>!['size','smartEnabled'].includes(c.field)).map(c=>fieldRow('pet',c,null,c.field==='allowSpeech'?'以文字气泡回应。开启智能互动并选择可用模型后，可根据人设与你对话。':c.field==='historyRounds'?(state.petMemory?.enabled?'每次专属互动参考的近期对话轮数。开启连续陪伴后可在重启后延续。':'仅本次运行的近期互动。下方开启连续陪伴后可保留。'):c.field==='persona'?(state.character?.petEnabled?'当前使用共用主题角色；关闭共用后使用这里的桌宠独立人设。':'用于本套桌宠的简短回应与陪伴。'):null)):h('p',{className:'r3-caption'},modules.pet.status==='unavailable'?'桌宠能力当前不可用，原有设置继续保留。':'桌宠已关闭，原有设置继续保留。')),modules.pet&&interaction,h(MemorySettings,{key:skin.selected.contentKey,skin,memory:state.petMemory,active,busy,work})),
      h('p',{className:'r3-caption r3-scope-note'},'只显示本套已提供的能力。'));
  }
  function SceneBindingRow({kind,scenes,targets,active,busy,work}){
    const [chosen,setChosen]=React.useState('');
    const target=targets.find(row=>row.key===chosen)??targets[0];
    const presets=scenes.presets[kind],saved=scenes.bindings[kind]?.[target?.key];
    const selected=saved&&Object.hasOwn(presets,saved)?saved:'';
    const isModel=kind==='model';
    return h(Section,{title:isModel?'随模型变化':'随工作区变化'},
      h(Row,{title:isModel?'选择模型':'选择工作区',description:isModel?'使用 DSH 中已配置的模型。':'选择当前 DSH 中的工作区。'},
        h('select',{'aria-label':isModel?'场景模型':'场景工作区',value:target?.key??'',disabled:busy||!active||!targets.length,onChange:event=>setChosen(event.target.value)},
          !targets.length&&h('option',{value:''},isModel?'请先在 DSH 配置模型':'暂无工作区'),
          ...targets.map(row=>h('option',{key:row.key,value:row.key},row.label)))),
      h(Row,{title:isModel?'工作区形象':'工作区配色',description:isModel?'切换到此模型后，工作区底部显示本套提供的形象或徽记。':'进入此工作区后，当前会话标记和底部标识使用所选配色。'},
        h('select',{'aria-label':isModel?'模型外观':'工作区配色',value:selected,disabled:busy||!active||!target,onChange:event=>void work('sceneConfigure',{contentKey:scenes.contentKey,kind,target:target.value,preset:event.target.value||null})},
          h('option',{value:''},'使用皮肤默认'),
          ...Object.entries(presets).map(([key,preset])=>h('option',{key,value:key},preset.label)))),
      selected&&presets[selected].notice&&h('p',{className:'r3-caption'},'切换提示「'+presets[selected].notice+'」'+(isModel?'':'，跟随常用页的工作区切换开关。')));
  }
  function ScenePanel({skin,workspaceSource,modelDirectory,active,busy,work}){
    const workspaces=React.useSyncExternalStore(workspaceSource.subscribe,workspaceSource.getSnapshot);
    const scenes=skin.workspaceScenes;
    const targets={
      model:modelDirectory.models.map(row=>({key:JSON.stringify([row.provider,row.model]),value:{provider:row.provider,model:row.model},label:row.label})),
      workspace:workspaces.map(row=>({key:JSON.stringify(row.id),value:row.id,label:row.label})),
    };
    return h(React.Fragment,null,
      h('p',{className:'r3-caption'},'为模型与工作区选择本套场景。选择会自动保存；使用皮肤默认可清除对应设置。勿扰时保持外观，暂停切换提示。'),
      ...Object.keys(scenes.presets).map(kind=>h(SceneBindingRow,{key:kind,kind,scenes,targets:targets[kind],active,busy,work})));
  }
  function CharacterPanel({character,style,active,busy,work,setSection}){
    return h(React.Fragment,null,style&&h(ReplyStyleEditor,{style,active,busy,work}),h(CharacterEditor,{character,hasStyle:!!style,active,busy,work}),Object.hasOwn(character,'petContext')&&h(Button,{onClick:()=>setSection('skin','more')},'桌宠互动设置'));
  }
  return {Shell,Settings,Library,FocusPanel,ScenePanel,CharacterPanel};
}

export const skinSettingsCss=`
.dshc-r3{--paper:#f4f1e9;--surface:#fffdf8;--surface-soft:#ece8de;--ink:#2b302c;--muted:#68685e;--line:#d9d4c7;--accent:#a54c19;--accent-soft:#f9e9da;--signal:#35677e;--signal-soft:#e5eef1;--positive:#3b6751;--danger:#a0372b;--font-ui:-apple-system,"SF Pro Text","PingFang SC",sans-serif;--font-title:"Iowan Old Style","Baskerville","Songti SC",serif;height:100%;min-height:0;min-width:0;display:grid;grid-template-columns:220px minmax(0,1fr);background:var(--surface);color:var(--ink);font:14px/1.6 var(--font-ui);overflow:hidden}
.dshc-r3[data-theme=dark]{--paper:#202423;--surface:#292e2c;--surface-soft:#353b37;--ink:#f1efe6;--muted:#b6b9ac;--line:#494f46;--accent:#f2ab71;--accent-soft:#443326;--signal:#91c3d7;--signal-soft:#293e46;--positive:#9cc7ab;--danger:#f4a99a;color-scheme:dark}
.dshc-r3 *{box-sizing:border-box}.dshc-r3 h1,.dshc-r3 h2,.dshc-r3 h3,.dshc-r3 p{margin:0}.dshc-r3 button,.dshc-r3 input,.dshc-r3 textarea,.dshc-r3 select{font:inherit;color:inherit}.dshc-r3 button{cursor:pointer}.dshc-r3 button:disabled{opacity:.45;cursor:not-allowed}.dshc-r3 button:focus-visible,.dshc-r3 input:focus-visible,.dshc-r3 textarea:focus-visible,.dshc-r3 select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.dshc-r3 button{transition:background 140ms,color 140ms,border-color 140ms}.dshc-r3 button:hover{background:var(--surface-soft)}
.r3-icon{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}.r3-settings-nav{padding:30px 18px;background:var(--paper);border-right:1px solid var(--line);display:flex;flex-direction:column;gap:5px;min-width:0}.r3-settings-nav h2{font-size:19px;font-weight:600;margin:0 12px 28px}.r3-sideitem{width:100%;display:flex;gap:10px;align-items:center;text-align:left;border:0;border-radius:7px;background:transparent;padding:10px 12px;color:var(--muted)!important;font-size:13px!important;white-space:nowrap}.r3-sideitem.selected{background:var(--accent-soft);color:var(--accent)!important}.r3-settings-nav .r3-stop{margin-top:16px}.r3-navfooter{margin-top:auto!important;padding:12px;font-size:11px;color:var(--muted)}
.r3-settings-main{min-width:0;min-height:0;display:flex;flex-direction:column}.r3-settings-head{padding:25px 36px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid var(--line);flex-shrink:0}.r3-settings-head h1{font-family:var(--font-title);font-size:30px;line-height:1.35;font-weight:500;margin:4px 0 8px}.r3-eyebrow{font-size:10px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase}.r3-caption{font-size:12px;color:var(--muted);line-height:1.8}.r3-settings-tabs{padding:10px 36px;display:flex;gap:4px;border-bottom:1px solid var(--line);flex-shrink:0}.r3-settings-tabs button{padding:8px 25px;border:0;background:transparent;border-radius:6px;color:var(--muted);font-size:13px}.r3-settings-tabs [aria-selected=true]{color:var(--accent);background:var(--accent-soft)}.r3-settings-body{overflow:auto;padding:26px 36px;flex:1;min-height:0;scrollbar-gutter:stable}.r3-settings-foot{padding:16px 28px;border-top:1px solid var(--line);display:flex;gap:16px;justify-content:space-between;align-items:center;flex-shrink:0}.r3-settings-foot p{font-size:11px;color:var(--muted)}.r3-settings-foot small{font-size:10px;color:var(--muted)}
.r3-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}.r3-button{padding:8px 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line);border-radius:6px;background:var(--surface);white-space:nowrap;font-size:12px!important}.r3-button.primary{background:var(--accent);color:var(--surface);border-color:var(--accent)}.r3-button.primary:hover{background:var(--accent);filter:brightness(.93)}.r3-button.selected{border-color:var(--accent);color:var(--accent)}.r3-pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:30px;background:var(--surface-soft);font-size:11px;color:var(--muted);white-space:nowrap}.r3-pill.orange{background:var(--accent-soft);color:var(--accent)}.r3-pill.blue{background:var(--signal-soft);color:var(--signal)}.r3-pill.green{color:var(--positive)}
.r3-skin-banner{display:grid;grid-template-columns:minmax(0,1fr) 155px;min-height:164px;border:1px solid var(--line);border-radius:10px;padding:22px;background:var(--paper);overflow:hidden;position:relative;margin-bottom:16px}.r3-skin-banner h2{font-family:var(--font-title);font-size:25px;font-weight:500;margin:7px 0}.r3-skin-banner p{font-size:12px;color:var(--muted);max-width:420px}.r3-banner-pet{position:absolute;right:10px;bottom:0;width:155px;height:155px;overflow:hidden;pointer-events:none}.r3-banner-pet img{display:block;width:200%;height:200%;max-width:none;position:absolute;left:0;top:0;object-fit:fill}
.r3-setting-section{margin:26px 0}.r3-setting-section>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.r3-setting-section h3{font-size:13px;font-weight:600}.r3-setting-row{display:flex;justify-content:space-between;align-items:center;gap:25px;border-bottom:1px solid var(--line);padding:16px 0}.r3-setting-copy{flex:1;min-width:0}.r3-setting-copy strong{display:block;font-size:13px;font-weight:500}.r3-setting-copy p{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.8}.r3-setting-control{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:56%;min-width:0}.r3-setting-control output{font-size:11px;font-family:Menlo,monospace;min-width:35px}.r3-setting-control input[type=range]{width:155px;accent-color:var(--accent)}.r3-setting-control textarea{width:300px;max-width:100%;resize:vertical}.r3-setting-control select{width:260px;max-width:100%;font-size:12px}.r3-setting-control textarea,.r3-setting-control select,.r3-input-label input{padding:9px 11px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}.r3-toggle{width:36px;height:21px;padding:3px;border:0;border-radius:20px;background:var(--line);flex-shrink:0;position:relative}.r3-toggle span{display:block;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0002;transition:transform 140ms}.r3-toggle.on{background:var(--accent)}.r3-toggle.on span{transform:translateX(15px)}.r3-toggle.on:hover{background:var(--accent)!important}.r3-input-label{display:block;font-size:12px;color:var(--muted);margin-top:14px}.r3-input-label input{display:block;width:100%;margin-top:7px}
.r3-notice{padding:13px 16px;margin:0 0 20px!important;border-left:2px solid var(--signal);background:var(--signal-soft);font-size:12px;display:flex;gap:12px;align-items:center;justify-content:space-between}.r3-notice.warning{border-color:var(--accent);background:var(--accent-soft)}.r3-notice.error{border-color:var(--danger);color:var(--danger)}.r3-scope-note{border-top:1px solid var(--line);padding-top:16px}
.dshc-r3 .dshc-card{border-bottom:1px solid var(--line);padding:22px 0}.dshc-r3 .dshc-card h2{font-size:15px;margin-bottom:12px}.dshc-r3 .dshc-card p{font-size:12px;line-height:1.8}.dshc-r3 .dshc-note{color:var(--muted)}.dshc-r3 .dshc-card button,.dshc-r3 .dshc-card select,.dshc-r3 .dshc-card input{padding:8px 11px;border:1px solid var(--line);border-radius:6px;background:var(--surface);font-size:12px}.dshc-r3 .dshc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}.dshc-r3 .dshc-check{display:flex;gap:8px;align-items:center;margin:12px 0;font-size:12px}.dshc-r3 .dshc-card input[type=checkbox]{accent-color:var(--accent)}.dshc-r3 .dshc-fields{display:grid;grid-template-columns:120px 1fr;gap:10px}.dshc-r3 .dshc-file{position:relative;overflow:hidden}.dshc-r3 .dshc-file input{position:absolute;inset:0;opacity:0}.dshc-r3 .dshc-confirm{border-left:2px solid var(--accent);padding:12px;background:var(--accent-soft)}
@media(max-width:1100px){.dshc-r3{grid-template-columns:180px minmax(0,1fr)}.r3-settings-nav{padding:25px 10px}.r3-settings-nav h2{font-size:17px}.r3-settings-head{padding:22px 24px}.r3-settings-body{padding:22px 24px}.r3-settings-tabs{padding:10px 24px}.r3-setting-row{gap:15px}.r3-skin-banner{grid-template-columns:minmax(0,1fr) 125px}.r3-banner-pet{width:135px;height:135px;right:0}}
@media(max-width:760px){.dshc-r3{grid-template-columns:142px minmax(0,1fr)}.r3-settings-nav{padding:20px 7px}.r3-settings-nav h2{font-size:15px;margin:0 7px 20px}.r3-sideitem{font-size:11px!important;gap:7px;padding:9px 7px}.r3-settings-head{padding:18px}.r3-settings-head h1{font-size:25px}.r3-settings-head>.r3-pill{display:none}.r3-settings-body{padding:18px}.r3-settings-tabs{padding:8px 18px}.r3-settings-foot{padding:12px 16px;flex-wrap:wrap;gap:5px}.r3-setting-row{flex-wrap:wrap;gap:10px}.r3-setting-copy{min-width:100%}.r3-setting-control{width:100%;max-width:100%;justify-content:flex-start}.r3-setting-control textarea{width:100%}.r3-skin-banner{padding:17px;grid-template-columns:minmax(0,1fr) 65px;min-height:174px}.r3-skin-banner h2{font-size:22px}.r3-banner-pet{width:125px;height:125px;right:-12px}.r3-skin-banner p{max-width:230px}.r3-navfooter{font-size:10px;padding:7px}.r3-notice{flex-wrap:wrap}}
@media(max-width:530px){.dshc-r3{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.r3-settings-nav{border-right:0;border-bottom:1px solid var(--line);padding:8px;display:flex;flex-direction:row;flex-wrap:wrap;gap:2px}.r3-settings-nav h2,.r3-navfooter{display:none}.r3-sideitem{width:auto!important}.r3-settings-nav .r3-stop{margin-top:0}.r3-settings-head{padding:16px}.r3-settings-head h1{font-size:23px}.r3-settings-head .r3-caption{font-size:11px}.r3-settings-foot small{display:none}}

.r3-library-portrait.workspace-role img,.r3-banner-pet.workspace-role img{width:100%;height:100%;object-fit:contain;max-width:100%}
/* Library extends the existing R3 vocabulary; cards are actual installed content. */
.r3-market-grid{margin-bottom:32px}.r3-market-caption{margin:-4px 0 14px}.r3-remove-confirm{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:13px;line-height:1.7}.r3-clear-settings{display:flex;align-items:flex-start;gap:8px;margin:10px 0}.r3-clear-settings input{margin-top:5px;accent-color:var(--accent)}.r3-remove-confirm .r3-actions{margin-top:12px}.r3-library{max-width:1060px;margin:auto}.r3-library-current{background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:15px 18px;margin-bottom:22px}.r3-library-current-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.r3-current-modules{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--muted)}.r3-library-current h2{font:500 20px/1.5 var(--font-title);overflow-wrap:anywhere}.r3-library-current p{font-size:12px;color:var(--muted)}.r3-library-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.r3-library-heading h2{font-size:15px}.r3-library-heading h2 span{font-size:12px;font-weight:400;color:var(--muted);margin-left:12px}
/* Two cards share the canvas: 2 * minmax(0, 1fr) + one 18px gutter. */
.r3-cue-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:16px 0}.r3-cue-options select{width:100%;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}.r3-cue-setting>.r3-actions{margin-bottom:20px}@media(max-width:800px){.r3-cue-options{grid-template-columns:1fr}}.r3-pet-memory{margin:20px 0}.r3-pet-memory summary{cursor:pointer;padding:8px 0;font-weight:600}.r3-pet-memory ol{list-style:none;margin:0;padding:0;max-height:350px;overflow:auto}.r3-pet-memory li{padding:12px 0;border-bottom:1px solid var(--line)}.r3-pet-memory li>div{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.r3-pet-memory time{color:var(--muted);font-size:12px}.r3-pet-memory p{margin:6px 0;overflow-wrap:anywhere}.r3-focus-time{display:block;margin-top:6px;font-size:26px;font-weight:600;font-variant-numeric:tabular-nums}.r3-focus-duration{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit}.r3-library-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.r3-library-card{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface);text-align:left;padding:0;min-width:0}.r3-library-card[data-current=true]{border-color:var(--accent)}.r3-library-card:focus{outline:2px solid var(--accent);outline-offset:3px}.r3-library-cover{display:block;aspect-ratio:8/5;background:var(--paper);position:relative;overflow:hidden}.r3-imported-cover{display:block;width:100%;height:100%;object-fit:cover}.r3-library-cover-title{position:absolute;left:18px;bottom:24px;max-width:65%;font:500 26px/1.4 var(--font-title);overflow-wrap:anywhere}.r3-library-cover>.r3-icon{position:absolute;right:28px;bottom:28px;width:38px;height:38px;color:var(--muted)}.r3-library-portrait{position:absolute;right:4px;bottom:0;width:140px;height:140px;overflow:hidden}.r3-library-portrait img{display:block;width:200%;height:200%;max-width:none}.r3-library-card-body{display:flex;flex-direction:column;gap:12px;padding:16px 18px}.r3-library-card-title{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.r3-library-card-title h3{font-size:14px;font-weight:600;overflow-wrap:anywhere}.r3-library-card-title>span{font-size:12px;color:var(--muted);white-space:nowrap}.r3-library-modules{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted)}.r3-library-modules>span{background:var(--paper);padding:3px 7px;border-radius:4px}.r3-library-card-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid var(--line)}.r3-library-card-foot button{margin-left:auto}.r3-library-empty{grid-column:1/-1;border:1px solid var(--line);border-radius:9px;padding:35px 22px;text-align:center}.r3-library-empty h2{font:500 22px var(--font-title);margin-bottom:8px}.r3-library-empty p{color:var(--muted);font-size:13px;margin-bottom:16px}
.dshc-r3 .r3-settings-head{padding:20px 28px}.dshc-r3 .r3-settings-body{padding:20px 28px}.dshc-r3 .r3-settings-foot{padding:12px 24px}.dshc-r3 .r3-setting-section{margin:20px 0}.dshc-r3 .r3-setting-row{padding:13px 0}.dshc-r3 .r3-skin-banner{min-height:136px;padding:18px;margin-top:14px}.dshc-r3 .r3-skin-banner h2{font-size:23px}.dshc-r3 .r3-banner-pet{width:135px;height:135px}
@media(max-width:980px){.r3-library-cover-title{font-size:23px}.r3-library-portrait{width:120px;height:120px}.r3-library-card-body{padding:14px}.dshc-r3 .r3-settings-head,.dshc-r3 .r3-settings-body{padding:18px 22px}}
@media(max-width:700px){.r3-cue-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:16px 0}.r3-cue-options select{width:100%;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}.r3-cue-setting>.r3-actions{margin-bottom:20px}@media(max-width:800px){.r3-cue-options{grid-template-columns:1fr}}.r3-pet-memory{margin:20px 0}.r3-pet-memory summary{cursor:pointer;padding:8px 0;font-weight:600}.r3-pet-memory ol{list-style:none;margin:0;padding:0;max-height:350px;overflow:auto}.r3-pet-memory li{padding:12px 0;border-bottom:1px solid var(--line)}.r3-pet-memory li>div{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.r3-pet-memory time{color:var(--muted);font-size:12px}.r3-pet-memory p{margin:6px 0;overflow-wrap:anywhere}.r3-focus-time{display:block;margin-top:6px;font-size:26px;font-weight:600;font-variant-numeric:tabular-nums}.r3-focus-duration{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit}.r3-library-grid{grid-template-columns:1fr}.r3-library-heading{align-items:flex-start}.r3-library-current{gap:10px}.r3-library-card-title h3{font-size:14px}.dshc-r3 .r3-settings-head,.dshc-r3 .r3-settings-body{padding:16px}.r3-settings-head{flex-wrap:wrap}}
.r3-reply-style-editor{margin-top:10px;display:grid;gap:10px;max-width:36rem}.r3-reply-style-editor textarea{resize:vertical;width:100%;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:8px 10px}.r3-reply-style-editor .r3-actions{margin-top:0}.r3-setting-copy .r3-field-failure{color:var(--danger)}.r3-setting-control{flex-wrap:wrap}.r3-reset-confirm{flex:0 0 100%;display:flex;justify-content:space-between;align-items:center;gap:8px 16px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px}.r3-reset-confirm .r3-actions{margin-top:0}
.r3-library-switch{display:flex;gap:6px;border-bottom:1px solid var(--line);margin-bottom:18px}.r3-library-switch button{font:inherit;font-size:14px;color:var(--muted);background:none;border:0;border-bottom:2px solid transparent;padding:10px 16px;cursor:pointer}.r3-library-switch button[aria-selected=true]{color:var(--accent);border-color:var(--accent);font-weight:600}.r3-library-switch button span{margin-left:8px;font-variant-numeric:tabular-nums}.r3-library-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0}.r3-library-toolbar input[type=search]{flex:1;min-width:180px}.r3-library-toolbar :is(input,select){font:inherit;font-size:13px;padding:9px 10px;min-height:38px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}.r3-library-subtoolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 16px}.r3-library-subtoolbar label{display:flex;gap:7px;align-items:center;font-size:13px}.r3-library-subtoolbar input{accent-color:var(--accent)}.r3-cover-frame{display:block;width:100%;height:100%}.r3-library .r3-library-grid{grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:16px}.r3-library .r3-market-grid{margin-bottom:0}.r3-library-results>.r3-caption{margin:14px 0}.r3-library-pagination{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:22px 0 8px}.r3-library-pagination .r3-actions{margin:0}.r3-page-jump{display:flex;gap:6px;align-items:center}.r3-page-jump input{width:70px;min-height:36px;padding:6px 8px;font:inherit;font-size:13px;font-variant-numeric:tabular-nums;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:6px}.r3-library .r3-library-card-body{gap:10px;padding:14px}.r3-library .r3-library-card-foot button{margin-left:0}.r3-downloads{border-bottom:1px solid var(--line);padding:0 0 14px;margin-bottom:16px}.r3-downloads summary{font-size:13px;font-weight:600;cursor:pointer;padding:8px 0}.r3-downloads ul{list-style:none;margin:0;padding:0}.r3-downloads li{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)}.r3-download-copy{display:grid;gap:5px;flex:1;min-width:0}.r3-download-copy strong{font-size:13px;overflow-wrap:anywhere}.r3-downloads .r3-button{font-size:12px;padding:6px 10px}.r3-download-error{font-size:12px;color:var(--danger)}.r3-library progress{accent-color:var(--accent);display:block;width:100%;height:5px;border:0;border-radius:3px;overflow:hidden}.r3-library progress::-webkit-progress-bar{background:var(--paper)}.r3-library progress::-webkit-progress-value{background:var(--accent)}.r3-library-toolbar button:focus-visible,.r3-library-switch button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@media(max-width:700px){.r3-library .r3-library-grid{grid-template-columns:1fr}.r3-library-toolbar input[type=search]{flex-basis:calc(100% - 90px)}.r3-library-toolbar select{flex:1;min-width:130px}}

@media(prefers-reduced-motion:reduce){.dshc-r3 *{transition:none!important;scroll-behavior:auto!important}}
`;

// Existing prepared portrait is a whole PNG, not the old four-cell atlas.

export const commanderSettingsCss=".dshc-r3[data-skin-preset=commander-v1]{--paper:#e9eff4;--surface:#f7fafc;--surface-soft:#e0e9f0;--ink:#1d3147;--muted:#52697e;--line:#cbd7e2;--accent:#17627d;--accent-soft:#d7eaf1;--signal:#1b6683;--signal-soft:#dfedf3;--positive:#28675d;--danger:#9c3d36;--font-title:'Avenir Next','PingFang SC',sans-serif}\n.dshc-r3[data-skin-preset=commander-v1][data-theme=dark]{--paper:#091321;--surface:#101c2c;--surface-soft:#1b2b40;--ink:#e1ecf5;--muted:#9badc2;--line:#2b3c52;--accent:#83d5ec;--accent-soft:#193b4d;--signal:#8bd5eb;--signal-soft:#142e40;--positive:#9dd9c9;--danger:#ffb2ab}\n.dshc-r3[data-skin-preset=commander-v1] :is(.r3-library-card,.r3-skin-banner,.r3-library-current){border-radius:6px}\n.dshc-r3[data-skin-preset=commander-v1] .r3-settings-head h1{font-size:28px;font-weight:550}\n.dshc-r3[data-skin-preset=commander-v1] .r3-skin-banner{min-height:174px;padding:22px;background:var(--paper)}\n.dshc-r3[data-skin-preset=commander-v1] .r3-banner-pet.workspace-role{height:164px;width:146px}\n.r3-library-cover.commander{background:#091321}\n.r3-library-cover.commander>.commander-cover{display:block;width:100%;height:100%;object-fit:contain}\n.r3-library-cover.commander>:is(.r3-library-cover-title,.r3-library-portrait){display:none}\n.commander-legacy-tag{position:absolute;left:12px;top:10px;font-size:11px;color:var(--muted);z-index:1;background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:3px 6px}\n.r3-semantic-icon{display:inline-grid;pointer-events:none}.r3-semantic-icon>img{grid-area:1/1;width:100%;height:100%;object-fit:contain}.r3-icon-dark{display:none}[data-theme=dark] .r3-icon-light{display:none}[data-theme=dark] .r3-icon-dark{display:block}\n@media(max-width:980px){.dshc-r3[data-skin-preset=commander-v1] .r3-skin-banner{padding:18px;min-height:164px}.dshc-r3[data-skin-preset=commander-v1] .r3-banner-pet.workspace-role{width:125px;height:145px}}\n";
