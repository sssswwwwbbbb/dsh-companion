// Populate an empty, isolated official Session with standard message/tool events.
// Nothing is fetched, no model or tool runs, and no real user chat is read.
export async function seedWorkspace({ctx,official}){
  const {BlockAssembler,AssistantStreamAccumulator,createUserMessage,createToolResultMessage}=await import(official('dsh-llm/lib/index.js'));
  const session=ctx.sessions.list().filter(s=>ctx.agents.get(s.id)).at(-1);
  if(!session)throw new Error('OPEN_ISOLATED_WORKSPACE_FIRST');
  const markdown=[
    '# 档案工作区 · 合成阅读样本',
    '',
    '这是一份仅用于隔离界面核对的合成材料，不包含真实业务数据。我们把长中文说明、行内代码 `contentKey`、列表和表格放在同一条消息，观察档案暖白背景下的正文层次、段落换行及输入区位置。',
    '',
    '本次工作记录需要同时表达“已经实现”“受控验证”和“仍待确认”。请先阅读计划，再比对实际回执；重复出现的字段不表示多次提交，状态颜色也不应成为唯一判断依据。较长的中文句子需要自然换行，窗口缩小时仍应保留完整内容，不应挤入侧栏或遮住输入框。',
    '',
    '> 范围说明：下面的代码、表格和工具结果都是合成样例。真实模型、客户验收、发布和部署分别记录。',
    '',
    '## 配置片段',
    '```typescript',
    'type PetReply = { speech: string | null; action: "idle" | "react" | null };',
    'const settings = { historyRounds: 10, modelSelection: { mode: "current" }, allowSpeech: true };',
    'function remember(reply: PetReply) {',
    '  // 只记录已经执行的结果；拒绝的动作保持 null。',
    '  return { ...reply, savedAt: "2026-11-03", source: "isolated-fixture" };',
    '}',
    '```',
    '',
    '## 进度对照',
    '| 项目 | 当前状态 | 说明 |',
    '| --- | --- | --- |',
    '| 主题正文 | 合成检查 | 核对长中文与层次 |',
    '| 代码与行内标记 | 合成检查 | 等宽字体和横向滚动 |',
    '| 表格与工具结果 | 合成检查 | 边界与结果可展开 |',
    '| 原生两状态 | 已受控验证 | idle / react，缺动作不混播 |',
    '| 真实外部模型 | 待验证 | 本样例没有调用 |',
    '| 发布与部署 | 未执行 | 本地隔离范围 |',
    '',
    '- 正常信息应可直接阅读。',
    '- **重点字段**与[本地文档示例](https://example.invalid/fixture)仅用于呈现。',
    '- 未确认事项保持明确文字说明，不只靠颜色。',
  ].join('\n');
  const appendAssistant=(turn,step,text,tool)=>{
    const assembler=new BlockAssembler(),stream=new AssistantStreamAccumulator(),chunks=[{type:'text-delta',index:0,text}];
    if(tool)chunks.push({type:'tool-call-delta',index:1,id:tool.id,name:tool.name,argumentsDelta:tool.arguments});
    chunks.push({type:'finish',reason:{kind:tool?'tool-calls':'stop'}});
    for(const chunk of chunks){assembler.push(chunk);stream.push({time:Date.now(),chunk});}
    return session.append('assistant/message',{turn,step,message:assembler.message({provider:'companion-fixture',model:'pet-test'}),stream:stream.snapshot()},{surfaceOp:'append'});
  };
  session.append('turn/start',{turn:1});session.append('step/start',{turn:1,step:1});
  session.append('user/message',createUserMessage({content:[{type:'text',text:'请把合成的工作计划整理成可阅读的中文说明、代码与进度表，并展示一项合成工具结果。这里只检查界面，不执行真实模型、文件操作或业务提交。'}],source:{kind:'user'}}),{surfaceOp:'append'});
  const tool={id:'m5-synthetic-read',name:'m5_readonly_snapshot',arguments:JSON.stringify({section:'隔离工作区合成快照',limit:6})};
  appendAssistant(1,1,markdown,tool);
  const call=session.append('tool/call',{turn:1,step:1,callId:tool.id,name:tool.name,arguments:tool.arguments});
  session.append('tool/result',{turn:1,step:1,message:createToolResultMessage({callId:tool.id,isError:false,content:[{type:'text',text:JSON.stringify({fixture:true,recordCount:6,result:'合成读取成功，无真实工具执行',rows:[{name:'正文',status:'待核对'},{name:'代码',status:'待核对'},{name:'表格',status:'待核对'}]},null,2)}]})},{surfaceOp:'append',sourceEventSeqs:[call.seq]});
  session.append('step/end',{turn:1,step:1});session.append('step/start',{turn:1,step:2});
  appendAssistant(1,2,'合成工具卡片已列出。接下来请核对输入框、模型菜单、焦点与选中样式；切换深色和窄窗口后仍应能够读完内容。\n\n**保留事项：** 这份记录只证明界面可以呈现合成内容，不能替代真实模型和用户业务验收。');
  session.append('step/end',{turn:1,step:2});session.append('turn/end',{turn:1,reason:{kind:'completed'}});
  return {sessionId:session.id,synthetic:true,externalModelCalls:0,realToolExecutions:0,standardEvents:session.seq,content:{longChinese:true,codeBlock:true,table:true,toolCard:true}};
}
