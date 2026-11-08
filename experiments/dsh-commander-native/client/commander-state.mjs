// Presentation only. Never changes Session events or the native work protocol.
export function commanderState(packet,detail={}){
 const state=packet.state;
 if(state==='attention')return {state:'attention',label:'等待决策',copy:'指挥官，有事项需要你决策。'};
 if(state==='running')return {state:'running',label:'执行中',copy:'指挥官，正在执行。'};
 if(state==='completed')return {state:'completed',label:'已回复',copy:'指挥官，结果已就绪。'};
 if(detail.reason&&detail.reason!=='completed')return {state:'interrupted',label:'已中断',copy:'本轮已中断，记录已保留。'};
 return {state:'idle',label:'待命',copy:'指挥官，我在这里待命。'};
}
