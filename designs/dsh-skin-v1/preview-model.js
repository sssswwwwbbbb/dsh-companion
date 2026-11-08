/* Local design model. No DSH bridge, external requests, or executable rules. */
(function(root){
  const copy=value=>JSON.parse(JSON.stringify(value));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const modelIds=["*","example-deepseek","example-other"];
  const actions=["idle","react","greet","stretch"];
  function validRules(value){
    return Array.isArray(value)&&value.length<=8&&new Set(value.map(x=>x?.id)).size===value.length&&new Set(value.filter(x=>x?.enabled).map(x=>x.model+":"+x.event)).size===value.filter(x=>x?.enabled).length&&value.every(r=>r&&Object.keys(r).every(k=>["id","enabled","model","event","action","text"].includes(k))&&/^[a-z][a-z0-9-]{1,40}$/.test(r.id)&&typeof r.enabled==="boolean"&&modelIds.includes(r.model)&&["completed","needs-user"].includes(r.event)&&actions.includes(r.action)&&(r.event!=="needs-user"||r.action==="idle")&&typeof r.text==="string"&&r.text.length<=60);
  }
  function valid(control,value){
    if(control.type==="boolean")return typeof value==="boolean";
    if(control.type==="enum")return control.values.includes(value);
    if(control.type==="number")return Number.isFinite(value)&&value>=control.min&&value<=control.max&&Math.abs((value-control.min)/control.step-Math.round((value-control.min)/control.step))<0.00001;
    if(control.type==="text")return typeof value==="string"&&value.length<=control.maxLength;
    if(control.type==="rules")return validRules(value);
    return false;
  }
  function resolve(design,overrides={}){
    const values=copy(design.defaults);
    for(const [key,control] of Object.entries(design.controls))if(valid(control,overrides[key]))values[key]=copy(overrides[key]);
    return values;
  }
  function overrides(design,values){
    return Object.fromEntries(Object.entries(design.controls).filter(([key,c])=>valid(c,values[key])&&!same(values[key],design.defaults[key])).map(([key])=>[key,copy(values[key])]));
  }
  function effective(config,scenario,stopped,feedbackKind){
    const petStatus=stopped?"stopped":scenario==="unavailable"?"unavailable":!config.pet?"disabled":"enabled";
    const reason={stopped:"效果已停止",unavailable:"桌面角色能力不可用",disabled:"桌宠已关闭",enabled:"桌宠可用"}[petStatus];
    return {petStatus,reason,capabilityAvailable:scenario!=="unavailable",userEnabled:config.pet,petRunning:petStatus==="enabled",feedbackDeclared:scenario!=="unsupported",feedbackEnabled:petStatus==="enabled"&&scenario!=="unsupported"&&config.completion,attention:feedbackKind==="needs-user",freezePose:feedbackKind==="needs-user"};
  }
  function eventRule(config,event,model){
    const base={action:event==="needs-user"?"idle":config.completionAction,text:event==="needs-user"?config.needsText:config.completionText,source:"本套默认"};
    if(!config.mappingEnabled)return base;
    const rules=config.eventRules.filter(r=>r.enabled&&r.event===event);
    const match=rules.find(r=>r.model===model)||rules.find(r=>r.model==="*");
    return match?{action:event==="needs-user"?"idle":match.action,text:match.text,source:"专属规则 · "+match.id}:base;
  }
  function plan(config,state,event,model){
    if(!state.petRunning)return {allowed:false,reason:state.reason};
    if((event==="completed"||event==="needs-user")&&!state.feedbackDeclared)return {allowed:false,reason:"本套未声明工作反馈"};
    if(event!=="needs-user"&&state.attention)return {allowed:false,reason:"待处理状态优先，已合并低优先级反馈"};
    if(event==="click")return config.clickResponse?{allowed:true,action:config.clickAction,text:config.clickText,priority:2,kind:"click"}:{allowed:false,reason:"点击回应已关闭"};
    if(event==="completed"&&!config.completion)return {allowed:false,reason:"任务完成反馈已关闭"};
    if(event==="needs-user"&&!config.needsFeedback)return {allowed:false,reason:"桌宠处理提示已关闭；原会话状态保留"};
    return {allowed:true,...eventRule(config,event,model),priority:event==="needs-user"?4:3,kind:event};
  }
  const api={copy,same,valid,validRules,resolve,overrides,effective,eventRule,plan};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.SkinPreview=api;
})(typeof window!=="undefined"?window:globalThis);
