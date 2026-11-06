// Faithful runtime port of the R3 settings vocabulary. State and actions stay in Page.
// Sources: designs/dsh-skin-v1/{tokens.css,styles.css,screens.js,components.js}.
export function createSkinSettingsUi(React,assets){
  const h=React.createElement;
  const paths={library:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',install:'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',settings:'M4 6h16M4 12h16M4 18h16',more:'M5 12h.01M12 12h.01M19 12h.01',shield:'m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6Z',pause:'M8 5v14M16 5v14',play:'m8 4 12 8-12 8Z',reset:'M4 9a8 8 0 1 1 0 7M4 3v6h6',arrow:'M5 12h14m-5-5 5 5-5 5'};
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
  function Shell({tab,view,setSection,skin,busy,stopping,active,status,error,notice,footer,scheme,work,stopSkin,replyStyle,children}){
    const selected=skin?.selected,canRestore=!!(skin?.stopped&&selected),body=React.useRef(null),hasMore=!!skin?.settings?.pet;
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
    return h('section',{className:'dshc-page dshc-r3','data-theme':scheme,'data-screen-label':'主题盒子','data-skin-preset':skin?.selected?.contentKey===assets.workspace?.contentKey?assets.workspace.preset:undefined},h('style',null,skinSettingsCss+commanderSettingsCss),
      h('aside',{className:'r3-settings-nav','aria-label':'主题盒子导航'},h('h2',null,'主题盒子'),
        nav('皮肤库','library','library'),nav('本套设置','skin','settings',!selected),nav('开始使用','setup','arrow'),!selected&&nav('桌宠控制','control','play'),nav('授权与更新','account','shield'),
        (tab!=='library'||!selected&&active)&&h('button',{type:'button',className:'r3-sideitem r3-stop','aria-label':canRestore?'恢复本套皮肤':'停止全部皮肤效果',disabled:stopping||canRestore&&(busy||!active)||skin?.stopped&&!selected,onClick:()=>canRestore?void work('skinSelect',{contentKey:selected.contentKey}):void stopSkin()},h(Icon,{name:canRestore?'play':'pause'}),canRestore?'恢复效果':'停止效果'),
        h('p',{className:'r3-navfooter'},active?'插件已激活':'插件尚未激活',h('br'),'本地皮肤共用插件授权')),
      h('div',{className:'r3-settings-main'},h('header',{className:'r3-settings-head'},h('div',null,
        h('h1',null,tab==='library'?'本地皮肤库':tab==='skin'?'按你的习惯，刚刚好。':tab==='account'?'授权与更新':tab==='control'?'桌面陪伴':'开始使用'),
        h('p',{className:'r3-caption'},tab==='library'?'管理工作区主题、桌宠和开场。':tab==='skin'?(selected?.name||'本套设置')+' · 只调整这套已提供的偏好。':'从同一处管理你的皮肤与陪伴。')),
        tab==='library'?h(Button,{icon:'install',disabled:busy||!active,onClick:()=>void work('skinInstall')},'导入本地 ZIP'):h(Pill,{tone:skin?.stopped?'orange':''},status)),
        tab==='skin'&&hasMore&&h('div',{className:'r3-settings-tabs',role:'tablist','aria-label':'本套设置层级'},...['common','more'].map(value=>h('button',{key:value,type:'button',role:'tab','aria-selected':view===value,onClick:()=>setSection('skin',value)},value==='common'?'常用':'更多'))),
        h('div',{className:'r3-settings-body',ref:body},error&&h('p',{className:'r3-notice error',role:'alert'},error),notice&&h('p',{className:'r3-notice',role:'status'},notice),children),
        tab!=='library'&&h('footer',{className:'r3-settings-foot'},h('div',null,h('p',null,footer),h('small',null,skin?.stopped?'效果已停止，参数与关闭选择已保留。':'工作区与左侧导航使用本套配色。')),
          h('div',{className:'r3-actions'},tab==='skin'&&h(Button,{buttonRef:resetButton,icon:'reset',disabled:busy||!active||!selected,'aria-expanded':confirmingReset,onClick:()=>confirmingReset?closeReset():setResetKey(selectedKey)},'重置本套'),canRestore&&h(Button,{kind:'primary',icon:'play',disabled:busy||!active,onClick:()=>void work('skinSelect',{contentKey:selected.contentKey})},'恢复本套皮肤')),
          confirmingReset&&h('div',{className:'r3-reset-confirm',role:'group','aria-label':'确认重置本套设置',onKeyDown:event=>{if(event.key==='Escape'&&!busy){event.stopPropagation();closeReset();}}},
            h('p',null,replyStyle?'将主题、桌宠与开场参数恢复为默认值。模块开关、自动播放与回复风格照旧。':'将本套自定义参数恢复为默认值。模块开关与启动时自动播放设置照旧。'),
            h('div',{className:'r3-actions'},
              h(Button,{buttonRef:cancelReset,disabled:busy,onClick:closeReset},'取消'),
              h(Button,{kind:'primary',disabled:busy||!active,onClick:()=>void reset()},'确认重置'))))));

  }
  function ImportedCover({contentKey,loadCover,children}){
    const [src,setSrc]=React.useState(null);
    React.useEffect(()=>{
      let current=true;
      void loadCover(contentKey).then(url=>{if(current)setSrc(url);}).catch(()=>{});
      return()=>{current=false;};
    },[contentKey,loadCover]);
    return src?h('img',{className:'r3-imported-cover',src,alt:'',draggable:false,onError:()=>setSrc(null)}):children;
  }
  function Library({skin,active,busy,selection,importedKey,setSection,select,work,stopSkin,loadCover}){
    const importedCard=React.useRef(null),currentHeading=React.useRef(null),focusAfterApply=React.useRef(null);
    const selectedKey=skin?.selected?.contentKey;
    const applied=skin?.phase==='ready'&&!skin.stopped;
    React.useEffect(()=>{
      if(!applied||!selectedKey||focusAfterApply.current!==selectedKey)return;
      focusAfterApply.current=null;
      currentHeading.current?.focus();
    },[applied,selectedKey]);
    React.useEffect(()=>{
      if(!importedKey||!importedCard.current)return;
      importedCard.current.scrollIntoView({block:'nearest'});
      importedCard.current.focus({preventScroll:true});
    },[importedKey]);
    if(!skin)return h('p',{className:'r3-caption',role:'status'},'正在读取已安装皮肤…');

    const rows=skin.catalog.filter(row=>!row.example);
    const selected=skin.selected;
    const current=rows.find(row=>row.contentKey===selected?.contentKey);
    const unavailable=current?.status==='unavailable';
    const switching=selection?.status==='applying';
    const ready=skin.phase==='ready'&&!skin.stopped&&active&&!unavailable;
    const canPreview=ready&&skin.settings?.startup?.status==='enabled'&&skin.results?.startup?.status==='ready';
    const status=skin.phase==='stopping'?'正在停止':switching?'正在切换':unavailable?'文件不可用':!active?'等待激活':skin.phase==='fault'?'需要恢复':skin.stopped?'效果已停止':ready?'已应用':'等待生效';
    const modules={theme:'工作区主题',pet:'桌宠',startup:'开场'};
    function apply(row){
      focusAfterApply.current=row.contentKey;
      select(row);
    }
    function moduleStatus(module){
      if(skin.disabled?.[module])return '已关闭';
      if(skin.settings?.[module]?.status==='unavailable'||skin.results?.[module]?.status==='unavailable')return '不可用';
      if(!ready)return '未运行';
      return skin.results?.[module]?.status==='ready'?'已启用':'未运行';
    }

    return h('section',{className:'r3-library','data-skin-library':true},
      !active&&h('div',{className:'r3-notice'},'激活主题盒子后即可导入和应用皮肤。',h(Button,{onClick:()=>setSection('setup')},'前往激活')),
      h('div',{className:'r3-library-current'},
        h('div',{className:'r3-library-current-title'},
          h('h2',{ref:currentHeading,tabIndex:-1},selected?.name||'DSH 默认外观'),
          selected&&h(Pill,{tone:ready&&!switching?'blue':''},h('span',{role:'status'},status))),
        h('p',null,!selected?(rows.length?'从下方选择一套皮肤。':'导入后即可在这里切换皮肤。'):unavailable?'部分皮肤文件不可用，可切换到其他皮肤。':skin.stopped?'本套皮肤的设置已保留。':'当前选择 · '+selected.version),
        selected&&current?.modules.length>0&&h('ul',{className:'r3-current-modules','aria-label':'本套模块状态'},
          ...current.modules.map(module=>h('li',{key:module},modules[module]+' · '+moduleStatus(module)))),
        selected&&h('div',{className:'r3-actions'},
          !unavailable&&(skin.stopped||skin.phase==='fault')&&h(Button,{kind:'primary',icon:'play',disabled:busy||!active,onClick:()=>apply(selected)},'恢复本套'),
          h(Button,{disabled:busy,onClick:()=>setSection('skin','common')},'本套设置'),
          canPreview&&h(Button,{icon:'play',disabled:busy,onClick:()=>void work('replayIntro')},'预览开场'),
          (!skin.stopped||switching)&&h(Button,{disabled:skin.phase==='stopping',onClick:()=>void stopSkin()},'停止本套效果'))),
      h('div',{className:'r3-library-heading'},h('h2',null,'已安装',h('span',null,rows.length+' 套'))),
      h('div',{className:'r3-library-grid'},...rows.map(row=>{
        const isCurrent=selected?.contentKey===row.contentKey;
        const isTarget=selection?.contentKey===row.contentKey;
        const pending=isTarget&&switching;
        const failed=isTarget&&selection.status==='failed';
        const imported=importedKey===row.contentKey;
        const available=row.status!=='unavailable';
        const r2=row.contentKey===assets.workspace?.contentKey;
        const whale=row.contentKey===assets.contentKey||r2;
        const commander=r2&&assets.workspace.preset==='commander-v1';
        const sameLabel=rows.some(other=>other!==row&&other.id===row.id&&other.version===row.version);
        const label=!available?'文件不可用':pending?'应用中':failed?'应用失败':isCurrent?status:imported?'已入库':'';
        const action=!available||isCurrent&&!failed?null:pending?'正在应用…':failed?'重试应用':'应用皮肤';
        const fallbackCover=h(React.Fragment,null,
          commander&&h('img',{className:'commander-cover',src:assets.workspace.cover,alt:''}),
          row.contentKey===assets.contentKey&&h('span',{className:'commander-legacy-tag'},'旧版对照'),
          h('span',{className:'r3-library-cover-title'},whale&&!commander?'档案暖白':row.name),
          whale?h('span',{className:'r3-library-portrait'+(r2?' workspace-role':'')},h('img',{src:r2?assets.workspace.portrait:assets.portrait,alt:'',draggable:false})):h(Icon,{name:'library'}));
        return h('article',{key:row.contentKey||'unavailable-library',className:'r3-library-card','data-current':isCurrent,'data-skin-key':row.contentKey,ref:imported?importedCard:null,tabIndex:imported?-1:undefined},
          h('div',{className:'r3-library-cover'+(commander?' commander':whale?' whale':''),'aria-hidden':true,style:whale?{'--library-grid':'url("'+assets.background+'")'}:undefined},
            active&&row.hasCover?h(ImportedCover,{contentKey:row.contentKey,loadCover},fallbackCover):fallbackCover),
          h('div',{className:'r3-library-card-body'},
            h('div',{className:'r3-library-card-title'},h('h3',null,row.name),h('span',null,row.version)),
            sameLabel&&row.contentKey&&h('p',{className:'r3-caption'},'内容快照 '+row.contentKey.slice(0,8)),
            h('div',{className:'r3-library-modules'},...row.modules.map(module=>h('span',{key:module},modules[module]||module))),
            !available&&h('p',{className:'r3-caption'},row.reason==='SKIN_RESOURCE_MISSING'?'部分文件缺失。':'文件校验未通过。'),
            (label||action)&&h('div',{className:'r3-library-card-foot'},
              label&&h('span',{className:'r3-caption',role:pending||failed?'status':undefined},label),
              action&&h(Button,{kind:imported?'primary':'',disabled:busy||!active,onClick:()=>apply(row),'aria-label':action+' · '+row.name},action))));
      }),!rows.length&&h('div',{className:'r3-library-empty'},h('h2',null,'还没有安装皮肤'),h('p',null,'导入包含 skin.json 的 ZIP 文件，皮肤会出现在这里。'))));
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
      h('p',{className:'r3-caption'},'称呼和语气按皮肤保存。在会话标题旁开启后，下一次模型请求会使用这里的设置。'),
      h('form',{className:'r3-reply-style-editor',onSubmit:event=>{event.preventDefault();void save();}},
        h('label',{className:'r3-input-label'},'称呼',
          h('input',{value:value.address,maxLength:32,disabled:busy||!active,placeholder:'留空时不指定称呼',onChange:event=>setDraft({...value,address:event.target.value})})),
        h('label',{className:'r3-input-label'},'语气',
          h('textarea',{value:value.tone,maxLength:280,rows:3,disabled:busy||!active,onChange:event=>setDraft({...value,tone:event.target.value})})),
        h('div',{className:'r3-actions'},
          h(Button,{type:'submit',kind:'primary',disabled:busy||!active||!changed||!value.tone.trim()},'保存回复风格'),
          h(Button,{disabled:busy||!active||value.address===style.defaults.address&&value.tone===style.defaults.tone,onClick:()=>setDraft(style.defaults)},'填入默认风格'))));
  }
  function Settings({state,skin,view,active,busy,fieldBusy,fieldDrafts,fieldFailures,saveField,work,stopSkin,stopping,modelDirectory,petText,setPetText,sendPet,petReply,setSection}){
    const selected=skin?.selected,candidate=selected,modules=skin?.settings||{},r2=candidate?.contentKey===assets.workspace?.contentKey,commander=r2&&assets.workspace.preset==='commander-v1';
    const candidateArt=r2?assets.workspace.portrait:candidate?.contentKey===assets.contentKey?assets.portrait:null;
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
      h('p',{className:'r3-caption'},state.petInteraction.smartEnabled?'用本套近期互动回应；待机动作在本地运行。':'智能互动已关闭，仍可使用本套的本地回应。'),modelDirectory.reason&&state.petInteraction.smartEnabled&&h('p',{className:'r3-caption'},'尚无可用模型，当前使用本地回应。'),
      h('form',{onSubmit:e=>{e.preventDefault();void sendPet();}},h('label',{className:'r3-input-label'},'桌宠专属输入',h('input',{type:'text',value:petText,maxLength:1000,disabled:busy,onChange:e=>setPetText(e.target.value),placeholder:'例如：换个动作陪我一下'})),h('div',{className:'r3-actions'},h(Button,{type:'submit',kind:'primary',disabled:busy||!petText.trim()},busy?'正在回应…':'发送'),h(Button,{disabled:busy,onClick:()=>void sendPet('click')},'轻点一下'))),
      (petReply||state.petInteraction.last)&&h('p',{'data-pet-reply':true,role:'status'},(()=>{const reply=petReply||state.petInteraction.last;return (reply.actual.speech||'安静陪着你')+(reply.actual.action?' · '+reply.actual.action:'')+(reply.mode==='fallback'?'（本地回应）':'');})())):h('p',{className:'r3-caption'},skin?.stopped?'恢复本套后可互动。':skin?.disabled?.pet?'桌宠已关闭，参数已保留。':'本套尚未提供可用的桌宠互动。')));
    return h(React.Fragment,null,h(Button,{onClick:()=>setSection('library')},'返回皮肤库'),stateNotice,skin?.error&&h('div',{className:'r3-notice error',role:'alert'},'恢复信息：'+skin.error.code),!active&&h('div',{className:'r3-notice'},'完成本机授权后即可应用皮肤。',h(Button,{onClick:()=>setSection('setup')},'前往开始使用')),
      legacyExample&&h('div',{className:'r3-notice warning'},'当前保留的是历史技术样例。可返回皮肤库选择已安装的整套皮肤。'),
      view==='common'?h(React.Fragment,null,h('div',{className:'r3-skin-banner'},h('div',null,h('div',{className:'r3-eyebrow'},candidate?.contentKey===assets.contentKey?'ARCHIVE WARM / COMPANION':'本套皮肤'),h('h2',null,candidate?.name||'选择你的日常'),h('p',null,roleLabel||'这是当前皮肤的参数。换一套时，保留这一套的偏好。'),h('div',{className:'r3-actions'},h(Pill,null,candidate?.version||'本套偏好'),h(Pill,{tone:'blue'},skin.stopped?'当前选择 · 已停止':'当前选择'))),candidateArt&&h('span',{className:'r3-banner-pet'+(r2?' workspace-role':''),role:'img','aria-label':roleLabel||(commander?'机械姬 · 母版04':'鲸鱼娘 · 安静待机')},h('img',{src:candidateArt,alt:'',draggable:false}))),
        
        state?.replyStyle&&h(ReplyStyleEditor,{style:state.replyStyle,active,busy,work}),
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
        modules.pet&&h(Section,{title:'桌面陪伴'},moduleRow('pet','桌宠','关闭时保留参数，随时可以重新开启。'),supported('pet')&&h(React.Fragment,null,fieldRow('pet',control('pet','size'),'角色大小','按百分比调整角色，保持原有比例。'),fieldRow('pet',control('pet','smartEnabled'),'智能互动','明确点击或专属输入时回应；待机仍在本地执行。'))),
        modules.startup&&h(Section,{title:'开场与进入'},moduleRow('startup','本套开场内容',startupSound?'开场后回到当前工作区。':'静音影片与静态回退独立于桌宠。'),supported('startup')&&h(React.Fragment,null,
          h(Row,{title:autoPlayLabel,description:'完全退出后，从 DeepSeek Harness 图标重新打开时播放。'},h(Pill,null,'全局偏好'),h(Toggle,{label:autoPlayLabel,value:state?.settings?.startupEnabled,disabled:busy||!active,onChange:value=>work('configure',{startupEnabled:value})})),
          fieldRow('startup',control('startup','reducedMotion'),'减少开场动态','显示同角色静态画面。macOS 的减少动态效果同样生效。'),
          fieldRow('startup',startupSound,'开场声音','关闭后仍会播放开场画面。'),
          h(Row,{title:'预览开场',description:skin?.stopped?'恢复本套后可预览。':state?.startup?.workspaceHandoff?'播放后返回当前会话，保留草稿。':'手动预览不会修改自动播放偏好。'},h(Pill,{tone:startupReady?'green':''},state?.startup?.playing?'正在播放':startupReady?'内容就绪':'尚未就绪'),h(Button,{icon:'play',disabled:busy||!active||!startupReady,onClick:()=>void work('replayIntro')},'预览开场'))))
      ):h(React.Fragment,null,modules.pet&&h(Section,{title:'互动与近期记忆',tag:h(Pill,null,'本套偏好')},supported('pet')?modules.pet.controls.filter(c=>!['size','smartEnabled'].includes(c.field)).map(c=>fieldRow('pet',c,null,c.field==='historyRounds'?'仅本次运行的近期互动，重启后清空。':c.field==='persona'?'用于本套桌宠的简短回应与陪伴。':null)):h('p',{className:'r3-caption'},modules.pet.status==='unavailable'?'桌宠能力当前不可用，原有设置继续保留。':'桌宠已关闭，原有设置继续保留。')),modules.pet&&interaction),
      h('p',{className:'r3-caption r3-scope-note'},'只显示本套已提供的能力。'+(candidate?.contentKey===assets.contentKey?'当前角色仅有待机与回应动作。':'')));
  }
  return {Shell,Settings,Library};
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
.r3-library{max-width:1060px;margin:auto}.r3-library-current{background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:15px 18px;margin-bottom:22px}.r3-library-current-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.r3-current-modules{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--muted)}.r3-library-current h2{font:500 20px/1.5 var(--font-title);overflow-wrap:anywhere}.r3-library-current p{font-size:12px;color:var(--muted)}.r3-library-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.r3-library-heading h2{font-size:15px}.r3-library-heading h2 span{font-size:12px;font-weight:400;color:var(--muted);margin-left:12px}
/* Two cards share the canvas: 2 * minmax(0, 1fr) + one 18px gutter. */
.r3-library-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.r3-library-card{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface);text-align:left;padding:0;min-width:0}.r3-library-card[data-current=true]{border-color:var(--accent)}.r3-library-card:focus{outline:2px solid var(--accent);outline-offset:3px}.r3-library-cover{display:block;aspect-ratio:8/5;background:var(--paper);position:relative;overflow:hidden}.r3-imported-cover{display:block;width:100%;height:100%;object-fit:cover}.r3-library-cover.whale:before{content:'';position:absolute;inset:0;background-image:var(--library-grid);background-size:cover;background-position:center;opacity:.12}.r3-library-cover-title{position:absolute;left:18px;bottom:24px;max-width:65%;font:500 26px/1.4 var(--font-title);overflow-wrap:anywhere}.r3-library-cover>.r3-icon{position:absolute;right:28px;bottom:28px;width:38px;height:38px;color:var(--muted)}.r3-library-portrait{position:absolute;right:4px;bottom:0;width:140px;height:140px;overflow:hidden}.r3-library-portrait img{display:block;width:200%;height:200%;max-width:none}.r3-library-card-body{display:flex;flex-direction:column;gap:12px;padding:16px 18px}.r3-library-card-title{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.r3-library-card-title h3{font-size:14px;font-weight:600;overflow-wrap:anywhere}.r3-library-card-title>span{font-size:12px;color:var(--muted);white-space:nowrap}.r3-library-modules{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted)}.r3-library-modules>span{background:var(--paper);padding:3px 7px;border-radius:4px}.r3-library-card-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid var(--line)}.r3-library-card-foot button{margin-left:auto}.r3-library-empty{grid-column:1/-1;border:1px solid var(--line);border-radius:9px;padding:35px 22px;text-align:center}.r3-library-empty h2{font:500 22px var(--font-title);margin-bottom:8px}.r3-library-empty p{color:var(--muted);font-size:13px;margin-bottom:16px}
.dshc-r3 .r3-settings-head{padding:20px 28px}.dshc-r3 .r3-settings-body{padding:20px 28px}.dshc-r3 .r3-settings-foot{padding:12px 24px}.dshc-r3 .r3-setting-section{margin:20px 0}.dshc-r3 .r3-setting-row{padding:13px 0}.dshc-r3 .r3-skin-banner{min-height:136px;padding:18px;margin-top:14px}.dshc-r3 .r3-skin-banner h2{font-size:23px}.dshc-r3 .r3-banner-pet{width:135px;height:135px}
@media(max-width:980px){.r3-library-cover-title{font-size:23px}.r3-library-portrait{width:120px;height:120px}.r3-library-card-body{padding:14px}.dshc-r3 .r3-settings-head,.dshc-r3 .r3-settings-body{padding:18px 22px}}
@media(max-width:700px){.r3-library-grid{grid-template-columns:1fr}.r3-library-heading{align-items:flex-start}.r3-library-current{gap:10px}.r3-library-card-title h3{font-size:14px}.dshc-r3 .r3-settings-head,.dshc-r3 .r3-settings-body{padding:16px}.r3-settings-head{flex-wrap:wrap}}
.r3-reply-style-editor{margin-top:10px;display:grid;gap:10px;max-width:36rem}.r3-reply-style-editor textarea{resize:vertical;width:100%;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:8px 10px}.r3-reply-style-editor .r3-actions{margin-top:0}.r3-setting-copy .r3-field-failure{color:var(--danger)}.r3-setting-control{flex-wrap:wrap}.r3-reset-confirm{flex:0 0 100%;display:flex;justify-content:space-between;align-items:center;gap:8px 16px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:10px}.r3-reset-confirm .r3-actions{margin-top:0}
@media(prefers-reduced-motion:reduce){.dshc-r3 *{transition:none!important;scroll-behavior:auto!important}}
`;

// Existing prepared portrait is a whole PNG, not the old four-cell atlas.

export const commanderSettingsCss=".dshc-r3[data-skin-preset=commander-v1]{--paper:#e9eff4;--surface:#f7fafc;--surface-soft:#e0e9f0;--ink:#1d3147;--muted:#52697e;--line:#cbd7e2;--accent:#17627d;--accent-soft:#d7eaf1;--signal:#1b6683;--signal-soft:#dfedf3;--positive:#28675d;--danger:#9c3d36;--font-title:'Avenir Next','PingFang SC',sans-serif}\n.dshc-r3[data-skin-preset=commander-v1][data-theme=dark]{--paper:#091321;--surface:#101c2c;--surface-soft:#1b2b40;--ink:#e1ecf5;--muted:#9badc2;--line:#2b3c52;--accent:#83d5ec;--accent-soft:#193b4d;--signal:#8bd5eb;--signal-soft:#142e40;--positive:#9dd9c9;--danger:#ffb2ab}\n.dshc-r3[data-skin-preset=commander-v1] :is(.r3-library-card,.r3-skin-banner,.r3-library-current){border-radius:6px}\n.dshc-r3[data-skin-preset=commander-v1] .r3-settings-head h1{font-size:28px;font-weight:550}\n.dshc-r3[data-skin-preset=commander-v1] .r3-skin-banner{min-height:174px;padding:22px;background:var(--paper)}\n.dshc-r3[data-skin-preset=commander-v1] .r3-banner-pet.workspace-role{height:164px;width:146px}\n.r3-library-cover.commander{background:#091321}\n.r3-library-cover.commander>.commander-cover{display:block;width:100%;height:100%;object-fit:contain}\n.r3-library-cover.commander>:is(.r3-library-cover-title,.r3-library-portrait){display:none}\n.commander-legacy-tag{position:absolute;left:12px;top:10px;font-size:11px;color:var(--muted);z-index:1;background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:3px 6px}\n.r3-semantic-icon{display:inline-grid;pointer-events:none}.r3-semantic-icon>img{grid-area:1/1;width:100%;height:100%;object-fit:contain}.r3-icon-dark{display:none}[data-theme=dark] .r3-icon-light{display:none}[data-theme=dark] .r3-icon-dark{display:block}\n@media(max-width:980px){.dshc-r3[data-skin-preset=commander-v1] .r3-skin-banner{padding:18px;min-height:164px}.dshc-r3[data-skin-preset=commander-v1] .r3-banner-pet.workspace-role{width:125px;height:145px}}\n";
