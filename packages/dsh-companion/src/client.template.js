window.__ModuleLoader__.load({
  id:'dsh-plugin-companion',
  factory(require){
    __SKIN_CLIENT__
    __CLIENT_REQUESTS__
    __SKIN_SETTINGS_UI__
    const React=require('react'),z=require('zod').z,h=React.createElement,ns='dsh-plugin-companion',locales=__LOCALES__;
    const skinUi=createSkinSettingsUi(React,__SKIN_SETTINGS_ASSETS__);
    const methods=['replyStyleSession','replyStyleSave','petInteract','petModels','skinSelect','skinConfigure','skinDisable','skinReset','skinStop','skinPage','skinCover','skinInstall','status','start','stop','configure','action','activate','refreshLicense','deactivate','selectPack','importPack','exportPack','replayIntro','syncHostWindow','installLauncher','removeLauncher','revealLauncher','checkUpdate','downloadUpdate','revealDownload'];
    const supplied=new Set(['replyStyleSession','replyStyleSave','skinReset','petInteract','skinSelect','skinConfigure','skinDisable','skinPage','skinCover','configure','action','activate','selectPack','importPack','exportPack','syncHostWindow']);
    const codec=name=>({mode:'strict',typeSymbol:ns+'#'+name,create:()=>z.json()});
    const contribution={package:ns,descriptors:methods.map(method=>({id:ns+'#dshCompanion/'+method,service:'dshCompanion',namespace:'dshCompanion',method,invocation:{kind:'direct'},parameters:supplied.has(method)?[{name:'value',wire:'value',source:'json',codec:codec(method+':value')}]:[],result:codec(method+':result')}))};
    return {inject:['locale'],apply(ctx){
      ctx.effect(()=>ctx.locale.register(ns,locales));const t=ctx.locale.bind(ns);
      ctx.inject(['slots','remote','layout','theme'],async ctx=>{
        await ctx.remote.$mount(contribution);
        ctx.inject(['remote.dshCompanion','remote.pluginManager'],ctx=>{
          let entryMark=null;const markListeners=new Set(),markSource={getSnapshot:()=>entryMark,subscribe:fn=>{markListeners.add(fn);return()=>markListeners.delete(fn);}};
          const setEntryMark=value=>{if(JSON.stringify(value)===JSON.stringify(entryMark))return;entryMark=value;for(const fn of markListeners)fn();};
          const errorKey=error=>Object.keys(locales.zh).find(key=>/^[A-Z_]+$/.test(key)&&String(error?.message||'').includes(key))||'failed';
          async function call(method,value){const result=await ctx.remote.dshCompanion[method](...(supplied.has(method)?[value]:[]));if(!result.ok)throw new Error(result.error?.message||'REQUEST_FAILED');return result.value;}
          const loadCover=contentKey=>call('skinCover',{contentKey});
          ctx.effect(()=>installSkinPage({ctx,React,call,setEntryMark}));
          let lastWindow='',lastWindowSync=0,syncingWindow;
          async function syncWindow(){
            if(syncingWindow)await syncingWindow;
            const bounds={x:window.screenX,y:window.screenY,width:window.outerWidth,height:window.outerHeight,
              workspaceVisible:ctx.layout.panelInfo.getSnapshot().activePanelId===null};
            if(bounds.width<320||bounds.height<240||document.visibilityState==='hidden')return;
            const key=JSON.stringify(bounds);if(key===lastWindow&&Date.now()-lastWindowSync<2500)return;
            syncingWindow=call('syncHostWindow',bounds).then(()=>{lastWindow=key;lastWindowSync=Date.now();}).finally(()=>{syncingWindow=undefined;});
            await syncingWindow;
          }
          ctx.effect(()=>{
            const sync=()=>void syncWindow().catch(()=>{});
            const offPanel=ctx.layout.panelInfo.subscribe(sync);
            sync();window.addEventListener('resize',sync);document.addEventListener('visibilitychange',sync);
            const timer=setInterval(sync,750);
            return()=>{offPanel();window.removeEventListener('resize',sync);document.removeEventListener('visibilitychange',sync);clearInterval(timer);};
          });
          function download(filename,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
          function Page(){
            const [state,setState]=React.useState(null),[tab,setTab]=React.useState('library'),[skinView,setSkinView]=React.useState('common'),[busy,setBusy]=React.useState(false),[stopping,setStopping]=React.useState(false),[error,setError]=React.useState(''),[notice,setNotice]=React.useState(''),[code,setCode]=React.useState(''),[confirmUnbind,setConfirmUnbind]=React.useState(false),[petText,setPetText]=React.useState(''),[petReply,setPetReply]=React.useState(null),[modelDirectory,setModelDirectory]=React.useState({current:null,models:[]}),[selection,setSelection]=React.useState(null);
            const [importedKey,setImportedKey]=React.useState(null);
            React.useEffect(()=>{setPetReply(null);},[state?.skin?.selected?.contentKey]);
            React.useEffect(()=>{let active=true;void call('petModels').then(value=>{if(active)setModelDirectory(value);}).catch(()=>{});return()=>{active=false;};},[]);
            const gateRef=React.useRef(null);if(!gateRef.current)gateRef.current=createClientRequestGate();const gate=gateRef.current;
            React.useEffect(()=>{
              let active=true;
              const refresh=()=>{const stamp=gate.stamp();if(stamp===null)return Promise.resolve();return call('status').then(value=>{if(active&&gate.refreshCurrent(stamp))setState(value);}).catch(()=>{if(active&&gate.refreshCurrent(stamp))setError('failed');});};
              void refresh();const timer=setInterval(refresh,1500);return()=>{active=false;clearInterval(timer);};
            },[]);
            // Field edits share the ordinary request gate, but a slow save must
            // not block the next gesture. Keep only the latest unsent value per field.
            const fieldBatch=React.useRef(null);
            const [fieldDrafts,setFieldDrafts]=React.useState({});
            const [fieldFailures,setFieldFailures]=React.useState({});
            const selectedKey=state?.skin?.selected?.contentKey;
            React.useEffect(()=>{setFieldFailures({});},[selectedKey]);
            function discardFieldEdits(){fieldBatch.current=null;setFieldDrafts({});}
            function saveField(module,field,value,retry=false){
              let batch=fieldBatch.current;
              if(!batch){
                const ticket=gate.beginNormal();if(!ticket)return;
                batch={ticket,contentKey:selectedKey,queue:new Map()};fieldBatch.current=batch;setBusy(true);setError('');setNotice('');
              }
              const key=module+'.'+field;
              batch.queue.set(key,{edit:{module,field,value,contentKey:batch.contentKey},retry});
              setFieldDrafts(previous=>({...previous,[key]:value}));
              if(!batch.saving)void flushFields(batch);
            }
            async function flushFields(batch){
              batch.saving=true;
              try{
                while(batch.queue.size&&gate.current(batch.ticket)){
                  const [key,{edit,retry}]=batch.queue.entries().next().value;
                  batch.queue.delete(key);
                  let failed=false;
                  try{
                    let saved=false;
                    if(retry){
                      const current=await call('status');if(!gate.current(batch.ticket))return;
                      setState(current);
                      if(current.skin?.selected?.contentKey!==edit.contentKey)return;
                      const value=current.skin.settings?.[edit.module]?.controls?.find(row=>row.field===edit.field)?.value;
                      saved=value===edit.value||!!(value?.mode&&value.mode===edit.value?.mode&&value.provider===edit.value.provider&&value.model===edit.value.model);
                    }
                    if(!saved){
                      const result=await call('skinConfigure',edit);
                      if(!gate.current(batch.ticket))return;
                      setState(result);
                    }
                  }catch(failure){
                    if(!gate.current(batch.ticket)||gate.cancelled(failure))return;
                    failed=true;
                  }
                  if(!batch.queue.has(key)){
                    setFieldDrafts(previous=>{
                      const next={...previous};delete next[key];return next;
                    });
                    setFieldFailures(previous=>{
                      const next={...previous};
                      if(failed)next[key]=edit;
                      else delete next[key];
                      return next;
                    });
                  }
                }
              }finally{
                if(fieldBatch.current===batch)discardFieldEdits();
                if(gate.finish(batch.ticket))setBusy(gate.busy);
              }
            }
            async function work(method,value){
              const ticket=gate.beginNormal();if(!ticket)return;setBusy(true);setError('');setNotice('');
              const returnPanel=method==='replayIntro'&&state?.startup?.workspaceHandoff?ctx.layout.panelInfo.getSnapshot().activePanelId:null;
              if(method==='skinInstall')setImportedKey(null);
              if(method==='skinSelect')setSelection({contentKey:value.contentKey,status:'applying'});
              try{
                if(['activate','start','replayIntro'].includes(method))await syncWindow();
                if(!gate.current(ticket))return null;
                const result=await call(method,value);if(!gate.current(ticket))return null;
                if(returnPanel!==null&&result.startup?.playing&&ctx.layout.panelInfo.getSnapshot().activePanelId===returnPanel)ctx.layout.selectPanel(null);
                if(method==='exportPack'){download(result.filename,result.json);setNotice('exported');}else setState(result);
                if(method==='skinSelect')setSelection(null);
                if(method==='skinReset'){setFieldFailures({});setNotice('skinResetComplete');}
                if(method==='replyStyleSave')setNotice('replyStyleSaved');
                if(method==='skinInstall'){
                  const imported=result.skinImport;
                  setImportedKey(imported?.contentKey??null);
                  setNotice(imported?.canceled?'skinInstallCancelled':imported?.duplicate?'skinAlreadyInstalled':'skinInstalled');
                }
                if(method==='activate'){setCode('');setNotice('activationSuccess');}if(method==='deactivate'){setCode('');setConfirmUnbind(false);setTab('setup');}if(method==='downloadUpdate')setNotice('downloadVerified');return result;
              }catch(failure){
                if(gate.current(ticket)&&!gate.cancelled(failure)){
                  const key=errorKey(failure);
                  setError(method==='skinSelect'&&key==='SKIN_RESOURCE_MISSING'?'skinApplyMissingFiles':method==='skinInstall'&&key==='failed'?'skinInstallFailed':key);
                  if(method==='skinSelect'){
                    setSelection({contentKey:value.contentKey,status:'failed'});
                    const current=await call('status').catch(()=>null);if(current&&gate.current(ticket))setState(current);
                  }
                }
                return null;
              }
              finally{if(gate.finish(ticket))setBusy(gate.busy);}
            }
            async function sendPet(trigger='input'){
              const ticket=gate.beginNormal();if(!ticket)return;setBusy(true);setError('');setPetReply(null);
              try{const reply=await call('petInteract',{text:trigger==='click'?'':petText,trigger});if(!gate.current(ticket))return;setPetReply(reply);setPetText('');const next=await call('status');if(gate.current(ticket))setState(next);}
              catch(failure){if(gate.current(ticket)&&!gate.cancelled(failure))setError(errorKey(failure));}
              finally{if(gate.finish(ticket))setBusy(gate.busy);}
            }
            async function stopSkin(){
              const ticket=gate.beginStop();if(!ticket)return;discardFieldEdits();setSelection(null);setBusy(true);setStopping(true);setError('');setNotice('');setPetReply(null);
              setState(previous=>previous?.skin?{...previous,skin:{...previous.skin,phase:'stopping'}}:previous);
              try{const result=await call('skinStop');if(gate.current(ticket))setState(result);return result;}
              catch(failure){if(gate.current(ticket))setError(errorKey(failure));return null;}
              finally{if(gate.finish(ticket)){setStopping(false);setBusy(gate.busy);}}
            }
            async function disablePlugin(){
              const ticket=gate.beginNormal();if(!ticket)return;setBusy(true);setError('');
              const manager=ctx.remote.pluginManager,navigation=ctx.get('pluginNavigation');
              try{
                const result=await manager.setBundleEnabled(ns,false);if(!gate.current(ticket))return;
                if(!result.ok||result.value.error||!['applied','restart-required'].includes(result.value.application))throw new Error('PLUGIN_DISABLE_FAILED');if(navigation)navigation.openBundle(ns);else ctx.layout.selectPanel('plugins');
              }catch(failure){if(gate.current(ticket))setError(errorKey(failure));}
              finally{if(gate.finish(ticket))setBusy(gate.busy);}
            }
            const settings=state?.settings||{},license=state?.license||{},active=license.active===true,running=state?.running&&state?.ready,skinManaged=!!state?.skin?.selected;
            const button=(label,method,value,disabled=false)=>h('button',{type:'button',disabled:busy||disabled,onClick:()=>void work(method,value)},t(label));
            const check=(label,key,disabled=false)=>h('label',{className:'dshc-check'},h('input',{type:'checkbox','aria-label':t(label),checked:settings[key]===true,disabled:busy||disabled||(skinManaged&&['autonomous','followMouse','visible'].includes(key)),onChange:event=>void work('configure',{[key]:event.target.checked})}),t(label));
            const date=value=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
            const expiry=license.permanent===true?t('permanentLicense'):date(license.expiresAt);
            const status=!active?'needsActivation':state.phase==='intro'?'introPlaying':running?'connected':'stopped';
            const currentPack=state?.packs?.find(pack=>pack.id===settings.packId);
            const channel=state?.update,canDownloadUpdate=['newer','same'].includes(channel?.relation),updateMessage={older:'channelOlder',same:'channelSame',newer:'updateAvailable'}[channel?.relation]||'checkUpdateFirst';
            const skin=state?.skin,skinState={ready:'已应用',preparing:'正在准备',applying:'正在应用',exiting:'正在切换',stopped:'效果已停止',fault:'需要恢复',idle:'尚未应用',cancelled:'操作已取消',stopping:'正在停止'};
            function setSection(value,view){setTab(value);if(view)setSkinView(view);setError('');setNotice('');}
            const goSkin=()=>h('button',{type:'button',onClick:()=>setSection(skin?.selected?'skin':'library','common')},skin?.selected?'本套设置':'前往皮肤库');
            function selectSkin(row){if(skin?.selected?.contentKey===row.contentKey&&!skin.stopped&&skin.phase==='ready')return;void work('skinSelect',{contentKey:row.contentKey});}
            const startupReady=skin?.settings?.startup?.status==='enabled'&&skin?.results?.startup?.status==='ready'&&!skin?.stopped;
            const managedSummary=()=>h('div',{className:'dshc-card','data-skin-summary':true},h('h2',null,'当前使用整套皮肤'),h('p',null,skin.selected.name+' · '+skin.selected.version),h('p',{className:'dshc-note'},'主题、桌宠与开场统一在皮肤页管理。停止后可恢复本套，保留已调整参数和模块开关。'),goSkin());
            const skinContent=h(skinUi.Settings,{key:skin?.selected?.contentKey,state,skin,view:skinView,active,busy,fieldBusy:busy&&!fieldBatch.current,fieldDrafts,fieldFailures,saveField,stopping,work,stopSkin,modelDirectory,petText,setPetText,sendPet,petReply,setSection});
            const content=tab==='library'?h(skinUi.Library,{skin,active,busy,selection,importedKey,setSection,select:selectSkin,work,stopSkin,loadCover}):tab==='skin'?skinContent:tab==='setup'?h(React.Fragment,null,
              h('div',{className:'dshc-card'},h('h2',null,t('licenseTitle')),active?h(React.Fragment,null,h('p',null,t(license.state==='offline'?'offlineActive':'deviceActive')),h('p',{className:'dshc-note'},t('expiresAt')+' '+expiry)):h(React.Fragment,null,h('p',{className:'dshc-note'},t('activationIntro')),h('label',{htmlFor:'dshc-code'},t('activationCode')),h('div',{className:'dshc-row'},h('input',{id:'dshc-code',type:'password',autoComplete:'off',value:code,placeholder:t('codePlaceholder'),onChange:event=>setCode(event.target.value),'aria-label':t('activationCode')}),button('activate','activate',code,!code.trim())),h('p',{className:'dshc-note'},t('unactivatedNote')))),
              skinManaged?managedSummary():h(React.Fragment,null,(skin?.catalog||[]).some(row=>!row.example)&&h('div',{className:'dshc-card'},h('h2',null,'试用整套皮肤'),h('p',null,'主题、桌宠与开场可一起应用，再按需关闭各个模块。'),goSkin()),h('div',{className:'dshc-card'},h('h2',null,t('choosePack')),h('p',{className:'dshc-note'},t('packIntro')),h('label',{htmlFor:'dshc-pack'},t('configurationPack')),h('select',{id:'dshc-pack',value:settings.packId||'whale-maid-demo',disabled:busy||!active,onChange:event=>void work('selectPack',event.target.value)},...(state?.packs||[]).map(pack=>h('option',{key:pack.id,value:pack.id},pack.name))),h('p',{className:'dshc-note'},currentPack?.description||''),h('div',{className:'dshc-row'},button('exportPack','exportPack',settings.packId,!active),h('label',{className:'dshc-file'},t('importPack'),h('input',{type:'file',accept:'.json',disabled:busy||!active,'aria-label':t('importPack'),onChange:async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;if(file.size>65536){setError('PACK_TOO_LARGE');return;}try{const imported=await work('importPack',JSON.parse(await file.text()));if(imported)setNotice('packImported');}catch{setError('PACK_INVALID');}}}))),h('p',{className:'dshc-note'},t('packMaterialNote')))),
              h('div',{className:'dshc-card'},h('h2',null,t('startupTitle')),check('startupEnabled','startupEnabled',!active),check('autoStart','autoStart',!active),h('p',{className:'dshc-note'},t('desktopOpeningIntro')),h('div',{className:'dshc-row'},button('replayIntro','replayIntro',undefined,!active||skinManaged&&!startupReady)),h('div',{className:'dshc-row'},skinManaged?goSkin():h(React.Fragment,null,button('start','start',undefined,!active||running),h('button',{type:'button',onClick:()=>setTab('control')},t('controlTab')))))
            ):tab==='control'&&skinManaged?managedSummary():tab==='control'?h(React.Fragment,null,
              h('div',{className:'dshc-card'},h('h2',null,t('desktopControls')),h('div',{className:'dshc-row'},button('start','start',undefined,!active||running),button('stop','stop',undefined,!state?.running),button(settings.visible===false?'show':'hide','configure',{visible:settings.visible===false},!running),button('replayIntro','replayIntro',undefined,!active))),
              h('div',{className:'dshc-card'},h('h2',null,t('profile')),h('div',{className:'dshc-fields'},h('label',{htmlFor:'dshc-profile'},t('profile')),h('select',{id:'dshc-profile',value:settings.profile||'free',disabled:busy||!active||skinManaged,onChange:event=>void work('configure',{profile:event.target.value})},...['free','gentle','lively'].map(value=>h('option',{key:value,value},t(value)))),h('label',{htmlFor:'dshc-size'},t('size')),h('select',{id:'dshc-size',value:settings.size||100,disabled:busy||!active||skinManaged,onChange:event=>void work('configure',{size:Number(event.target.value)})},...[70,85,100,115,130,140].map(value=>h('option',{key:value,value},value+'%')))),check('autonomous','autonomous',!active),check('follow','followMouse',!active)),
              h('div',{className:'dshc-card'},h('h2',null,t('actions')),h('div',{className:'dshc-row'},...['react','eat','play','stretch','sleep-in','wake'].filter(action=>state?.availableActions?.includes(action)).map(action=>button(action,'action',action,!running))),h('p',{className:'dshc-note'},t('note')))
            ):h(React.Fragment,null,
              h('div',{className:'dshc-card'},h('h2',null,t('licenseTitle')),h('p',null,t(active?(license.state==='offline'?'offlineActive':'deviceActive'):'needsActivation')),active&&h('p',{className:'dshc-note'},t('expiresAt')+' '+expiry+' · '+t('offlineUntil')+' '+date(license.offlineUntil)),license.errorCode&&h('p',{className:'dshc-note'},t(license.errorCode)),h('div',{className:'dshc-row'},button('refreshLicense','refreshLicense',undefined,!active&&license.state==='unactivated'),h('button',{type:'button',disabled:busy||!active,onClick:()=>setConfirmUnbind(true)},t('unbind'))),confirmUnbind&&h('div',{className:'dshc-confirm'},h('p',null,t('unbindWarning')),button('confirmUnbind','deactivate'),h('button',{type:'button',onClick:()=>setConfirmUnbind(false)},t('cancel')))),
              h('div',{className:'dshc-card','data-update-panel':true},h('h2',null,t('privateUpdates')),h('p',{'data-installed-version':true},t('currentVersion')+' '+(state?.version||'…')),h('p',{className:'dshc-note'},'DSH '+(state?.compatibility?.dshVersion||'…')+' · '+t(state?.compatibility?.supported?'compatible':'incompatible')),channel&&h('p',{'data-channel-version':true},t('channelVersion')+' '+channel.version),h('p',{className:'dshc-note',role:'status','data-update-relation':channel?.relation||'unchecked'},t(updateMessage)),h('div',{className:'dshc-row','data-update-actions':true},button('checkUpdate','checkUpdate',undefined,!active),canDownloadUpdate&&button(channel.relation==='same'?'reinstallSameVersion':'downloadUpdate','downloadUpdate',undefined,!active)),canDownloadUpdate&&h('p',{className:'dshc-note'},t('updateInstructions'))),
              state?.download&&h('div',{className:'dshc-card','data-download-history':true},h('h2',null,t('downloadHistory')),h('p',null,t('downloadedVersion')+' '+state.download.version),h('p',{className:'dshc-note'},state.download.filename),h('p',{className:'dshc-note'},t('downloadHistoryNote')),h('div',{className:'dshc-row'},button('revealDownload','revealDownload'))),
              h('div',{className:'dshc-card'},h('h2',null,t('recoveryTitle')),h('p',{className:'dshc-note'},t('recoveryIntro')),h('div',{className:'dshc-row'},h('span',null,t('pluginLabel')),h('button',{type:'button',disabled:busy,'aria-label':t('disablePluginAction'),onClick:()=>void disablePlugin()},t('disablePlugin'))),state?.launcher?.installed&&h(React.Fragment,null,h('div',{className:'dshc-row'},h('span',null,t('launcherLabel')),button('removeLauncher','removeLauncher')),h('p',{className:'dshc-note'},t('launcherRemovalNote'))))
            );
            const displaySkin=skin?.selected||(skin?.catalog||[]).find(row=>!row.example);
            const footer=tab==='skin'&&displaySkin?displaySkin.name+' · '+displaySkin.version+' · 素材来源与使用范围见本套随附说明。':skinManaged?skin.selected.name+' · '+skin.selected.version:t('source');
            return h(skinUi.Shell,{tab,view:skinView,setSection,skin,busy,stopping,active,status:fieldBatch.current?'正在保存…':busy?t('busy'):skinManaged?(skinState[skin?.phase]||'加载中'):t(status),error:error?t(error):'',notice:notice?t(notice):'',footer,replyStyle:state?.replyStyle,scheme:ctx.get('theme')?.getTheme()?.active?.colorScheme,work,stopSkin},content);
          }
          function SessionReplyStyle({sessionId}){
            const [style,setStyle]=React.useState(null),[saving,setSaving]=React.useState(false),[failed,setFailed]=React.useState(false);
            const gateRef=React.useRef(null);if(!gateRef.current)gateRef.current=createClientRequestGate();const gate=gateRef.current;
            const mounted=React.useRef(false);
            React.useEffect(()=>{
              mounted.current=true;
              async function refresh(){
                const stamp=gate.stamp();if(stamp===null)return;
                const result=await call('replyStyleSession',{sessionId}).catch(()=>null);
                if(mounted.current&&gate.refreshCurrent(stamp))setStyle(result);
              }
              void refresh();const timer=setInterval(refresh,1500);
              return()=>{mounted.current=false;clearInterval(timer);};
            },[sessionId]);
            async function toggle(){
              const ticket=gate.beginNormal();if(!ticket)return;
              setSaving(true);setFailed(false);
              try{
                const value=await call('replyStyleSession',{sessionId,contentKey:style.contentKey,enabled:!style.enabled});
                if(mounted.current)setStyle(value);
              }catch{
                if(mounted.current)setFailed(true);
              }finally{
                gate.finish(ticket);
                if(mounted.current)setSaving(false);
              }
            }
            if(!style)return null;
            return h('span',{className:'dshc-reply-style'},
              h('style',null,'.dshc-reply-style{display:inline-flex;gap:6px;align-items:center}.dshc-reply-style button{background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid currentColor;border-radius:5px;padding:2px 7px;font:inherit;font-size:12px;white-space:nowrap;cursor:pointer}.dshc-reply-style button[aria-pressed=true]{color:var(--dsw-alias-label-primary)}.dshc-reply-style button:disabled{opacity:.55}.dshc-reply-style small{font-size:12px}'),
              h('button',{type:'button','aria-label':'当前会话回复风格','aria-pressed':style.enabled,disabled:saving,onClick:()=>void toggle(),title:style.tone},style.enabled?'回复风格 · 已开':'回复风格'),
              failed&&h('small',{role:'status'},'未更新，可重试'));
          }
          const ReplyStyleSlot=({sessionId})=>sessionId?h(SessionReplyStyle,{key:sessionId,sessionId}):null;
          ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({name:'conversation.session.header.utilities',id:'dsh-companion-reply-style',order:45},ReplyStyleSlot));
          function Icon({size=20}){
            const mark=React.useSyncExternalStore(markSource.subscribe,markSource.getSnapshot);
            if(mark)return h('span',{'aria-hidden':true,style:{width:24,height:24,display:'inline-grid'}},
              h('style',null,'.dsh-skin-entry-light,.dsh-skin-entry-dark{grid-area:1/1;width:24px;height:24px}.dsh-skin-entry-dark{display:none}[data-ds-dark-theme] .dsh-skin-entry-light{display:none}[data-ds-dark-theme] .dsh-skin-entry-dark{display:block}'),
              h('img',{className:'dsh-skin-entry-light',src:mark.light,alt:''}),h('img',{className:'dsh-skin-entry-dark',src:mark.dark,alt:''}));
            return h('svg',{viewBox:'0 0 24 24',width:size,height:size,'aria-hidden':true},h('path',{d:'M7 4h4c7 0 10 3 10 8s-3 8-10 8H7z',fill:'none',stroke:'currentColor',strokeWidth:2.2}),h('circle',{cx:3.5,cy:18,r:1.7,fill:'currentColor'}));
          }
          ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'dsh-companion',locale:ns},Page));
          ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'dsh-companion',order:9,label:()=>t('panel'),locale:ns},Icon));
        });
      });
    }};
  }
});
