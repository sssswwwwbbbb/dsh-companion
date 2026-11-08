/* R4 design-only context and capability adapter. No network or DSH credentials. */
(function(root){
  const defaults={mode:"smart",persona:"你是温柔又有点俏皮的鲸鱼娘，陪伴用户工作。回应自然简短，结合刚才的互动选择合适的动作，也可以安静陪伴。",memoryRounds:10,allowSpeak:true,allowActions:true};
  const actions=[{id:"idle",label:"安静陪伴",description:"保持安静的站立姿态"},{id:"react",label:"侧头回应",description:"侧头，轻轻回应用户"},{id:"greet",label:"轻轻挥手",description:"友好地向用户打招呼"},{id:"stretch",label:"伸个懒腰",description:"放松身体，舒展一下"}];
  function cleanConfig(raw={}){return {mode:["local","smart"].includes(raw.mode)?raw.mode:defaults.mode,persona:typeof raw.persona==="string"&&raw.persona.trim()?raw.persona.slice(0,500):defaults.persona,memoryRounds:[0,3,5,10,20].includes(raw.memoryRounds)?raw.memoryRounds:10,allowSpeak:typeof raw.allowSpeak==="boolean"?raw.allowSpeak:true,allowActions:typeof raw.allowActions==="boolean"?raw.allowActions:true};}
  function context(config,turns,input,event="message",now=new Date().toISOString()){
    const history=config.memoryRounds===0?[]:turns.filter(t=>t.status==="done").slice(-config.memoryRounds).map(t=>({user:t.input,reply:t.say||"",performedAction:t.action||null,result:t.origin,time:t.time}));
    return {kind:"pet-decision-design",runtimeLoadable:false,persona:config.persona,model:{selection:"follow-current-dsh",adapter:"fixture-not-connected"},event:{kind:event,text:input,time:now},history,lastPerformedAction:history.length?history[history.length-1].performedAction:null,capabilities:{say:config.allowSpeak,actions:config.allowActions?actions.map(a=>({...a,resourceStatus:"R2 pose preview; not native frame animation"})):[],silence:true}};
  }
  function normalize(raw,capabilities){
    const notes=[];
    const say=capabilities.say&&typeof raw?.say==="string"?raw.say.trim().slice(0,140):"";
    const candidate=typeof raw?.action==="string"?raw.action:null;
    const action=candidate&&capabilities.actions.some(a=>a.id===candidate)?candidate:null;
    if(candidate&&!action)notes.push("忽略当前未提供的动作");
    return {say,action,silent:!say&&!action,notes};
  }
  function fixture(ctx,variant="normal"){
    if(variant==="failure")throw new Error("示例：模型服务暂不可用");
    if(variant==="quiet")return {say:"",action:"idle"};
    const text=ctx.event.text;
    if(/换|别重复/.test(text))return {say:"好呀，这次换个方式陪你。",action:ctx.lastPerformedAction==="greet"?"react":"greet"};
    if(/累|休息|难过/.test(text))return {say:"那就缓一缓，我安静陪你一会儿。",action:"idle"};
    if(ctx.event.kind==="touch")return {say:"我在呢，今天想先做哪件事？",action:"react"};
    return {say:"听到了，我陪你慢慢把事情做好。",action:"greet"};
  }
  const api={defaults,actions,cleanConfig,context,normalize,fixture};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PetSmartPreview=api;
})(typeof window!=="undefined"?window:globalThis);
