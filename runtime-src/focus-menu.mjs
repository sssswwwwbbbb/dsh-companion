// The Host owns the timer and preference file. The tray only reflects its
// latest snapshot and sends user commands back over the existing bridge.
export function focusMenuItems(state,enqueue){
  if(!state)return [];
  const item=(label,action,params={})=>({label,click:()=>enqueue({action,...params})});
  const active=state.phase==='running'||state.phase==='paused';
  const options=active?[
    state.phase==='paused'?item('继续计时','resume'):item('暂停计时','pause'),
    item('结束计时','clear'),
  ]:[
    item('专注 25 分钟','start',{kind:'focus',minutes:25}),
    item('休息 5 分钟','start',{kind:'break',minutes:5}),
  ];
  if(state.phase==='done')options.push(item('清除到期提示','clear'));
  return [
    {label:'专注与休息',submenu:options},
    {label:'陪伴勿扰',type:'checkbox',checked:state.quiet,click:menu=>enqueue({action:'quiet',enabled:menu.checked})},
  ];
}
