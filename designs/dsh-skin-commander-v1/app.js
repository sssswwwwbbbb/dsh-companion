/* Independent visual prototype. Local synthetic data only; no DSH or model APIs. */
(async function () {
  'use strict';
  var icons = await fetch('icons.json').then(function (r) { if (!r.ok) throw new Error('Icon source unavailable'); return r.json(); });
  var iconMap = Object.fromEntries(icons.map(function (item) { return [item.id, item]; }));
  var $ = function (selector) { return document.querySelector(selector); };
  var esc = function (value) { return String(value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };
  var icon = function (name, size) { var item = iconMap[name]; if (!item) throw new Error('Unknown icon ' + name); return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '>' + item.body + '</svg>'; };
  function hydrate(root) {
    root.querySelectorAll('[data-icon]').forEach(function (node) {
      var name = node.dataset.icon;
      if (node.tagName === 'BUTTON') { node.innerHTML = icon(name); return; }
      var template = document.createElement('template'); template.innerHTML = icon(name);
      var svg = template.content.firstChild;
      if (node.className) svg.setAttribute('class', 'icon ' + node.className);
      node.replaceWith(svg);
    });
  }
  var theme = 'dark', details = true, reduced = false;
  var uiMotion = true, petEcho = true, motion, sounds, sound = true;
  var collapsed = false, focusMode = false, sourceOpen = innerWidth>1020, sourceTab = 'files', sourceId = 'observation', sourceCited = false;
  var activeView = 'workspace', model = 'DeepSeek', pinnedOpen = true, currentId = 'working', localId = 0;
  var menuOpener, appearanceOpener, inspectorOpener;
  var conversations = [
    {id:'working',title:'桌宠行动方案',excerpt:'动作能力、素材与下一步',pinned:true,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'reading',title:'开场演出编排',excerpt:'结构归位、通电与报到',pinned:true,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'ideas',title:'灵感与备忘',excerpt:'留住新的想法',pinned:false,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'interface',title:'工作区交互细节',excerpt:'指令、执行与回执',pinned:false,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false}
  ];
  var documents = {
    observation:{name:'行动素材清单.md',icon:'file-text',size:'2.4 KB',type:'Markdown',title:'当前动作素材',intro:'本地设计示例，按当前素材准备情况整理。',excerpt:'真实走路透明循环已制出；轻回应可用。读书、喝茶缺少持物与使用动作，不能仅凭独立道具算完成。',heading:'能力与素材分开记录',text:'走路循环进入有限原生拟合；小跑和攀爬仍是关键姿势。动作是否能执行，还需要底座与真实桌面的验证。',cited:true},
    checklist:{name:'交互状态清单.md',icon:'file-text',size:'1.8 KB',type:'Markdown',title:'主题交互准则',intro:'用户是指挥官，机械姬在合适的时刻提供回应。',excerpt:'收到指令后明确执行状态；需要决策时保留原问题；停止即取消演出，已有内容和草稿保留。',heading:'反馈属于真实状态',text:'完成只在新结果产生时回应，回看历史不补播。声音、界面动态和角色呼应各自可控，减少动态仍保留完整状态。',cited:true},
    tokens:{name:'theme-tokens.json',icon:'file-code',size:'860 B',type:'JSON',title:'主题颜色职责',intro:'本页的设计令牌示例，不是运行配置字段。',excerpt:'深海蓝承载工作；银蓝标记链路和操作；琥珀表达待决策；红色表达失败。',heading:'颜色伴随明确语义',text:'文字与图标始终共同说明状态。冷色环境里给正文留出稳定阅读面，不以无关仪表或虚构数据填满空间。',cited:false}
  };
  function current() { return conversations.find(function (c) { return c.id === currentId; }); }
  function needsDecision(c) { return c.sample && (c.sampleState || c.state) === 'attention' && !c.resolved; }
  function announce(message) { $('#live-status').textContent = ''; requestAnimationFrame(function () { $('#live-status').textContent = message; }); }
  function withReadingAnchor(change) {
    var scroll = $('#conversation-scroll'), box = scroll.getBoundingClientRect();
    var anchor = Array.from(scroll.querySelectorAll('.user-message,.assistant-meta,.process,.message-body>*,.state-notice,.reply-bottom')).find(function (node) { return node.getBoundingClientRect().bottom > box.top + 8; });
    var before = anchor?.getBoundingClientRect().top;
    change();
    if (anchor?.isConnected && before !== undefined) scroll.scrollTop += anchor.getBoundingClientRect().top - before;
  }
  function updateLatest() {
    var view = $('#conversation-scroll'), c = current();
    if (!c) return;
    if (c.unreadReply && view.scrollHeight - view.scrollTop - view.clientHeight < 60) { c.unreadReply = false; renderNav(); }
    $('#jump-latest').hidden = !c.unreadReply;
  }
  function acknowledgeCompletion(id) {
    if (currentId !== id || current().state !== 'complete') return;
    motion?.cue('complete',Array.from(document.querySelectorAll('#thread .reply-receipt:not(.is-stopped)')).at(-1));
    motion?.respondOnce(); sounds?.play('complete');
  }
  function previewFeedback() {
    var state = current().state;
    if (state === 'complete') {
      Array.from(document.querySelectorAll('#thread .reply-receipt:not(.is-stopped)')).at(-1)?.scrollIntoView({block:'nearest'});
      acknowledgeCompletion(currentId);
    }
    else if (state === 'running') motion?.cue('working',$('#thread .running-line') || $('#thread .process'));
    else if (state === 'empty') motion?.cue('new',$('#thread .empty-page'));
    else motion?.cue('notice',$('#thread .state-notice'));
    announce('已预演当前情景；原状态保持');
  }
  function renderNav() {
    var q = $('#session-search').value.trim().toLowerCase();
    var visible = conversations.filter(function (c) { return c.title.toLowerCase().includes(q); });
    function row(c) {
      return '<div class="session-row' + (c.id === currentId ? ' selected' : '') + '"><button class="session-open" data-session="' + c.id + '" aria-label="打开会话：' + esc(c.title) + '"' + (c.id === currentId ? ' aria-current="page"' : '') + ' title="' + esc(c.title) + '">' + icon(c.pinned ? 'bookmark' : 'conversation') + '<span class="session-copy"><span class="session-title">' + esc(c.title) + '</span><span class="session-excerpt">' + esc(c.unreadReply ? '有新回复' : c.excerpt) + '</span></span>' + (c.unreadReply ? '<span class="conversation-unread" aria-label="有新回复"></span>' : '') + '</button><button class="icon-button session-more" data-menu-session="' + c.id + '" aria-label="会话「' + esc(c.title) + '」的更多操作" aria-haspopup="menu">' + icon('more') + '</button></div>';
    }
    $('#pinned-list').innerHTML = visible.filter(function (c) { return c.pinned; }).map(row).join('');
    $('#pinned-list').hidden = !pinnedOpen;
    $('#recent-list').innerHTML = visible.filter(function (c) { return !c.pinned; }).map(row).join('');
    $('.section-count').textContent = conversations.filter(function (c) { return c.pinned; }).length;
    $('#no-sessions').hidden = visible.length > 0;
  }
  function renderSources() {
    document.querySelectorAll('[data-source-tab]').forEach(function (button) { button.setAttribute('aria-selected', button.dataset.sourceTab === sourceTab); });
    $('#citation-count').textContent = current().sample ? '2' : '0';
    $('#source-list').innerHTML = Object.entries(documents).filter(function (entry) { return sourceTab === 'files' || (current().sample && entry[1].cited); }).map(function (entry) {
      var id = entry[0], doc = entry[1];
      return '<button class="source-file' + (id === sourceId ? ' selected' : '') + '" data-source="' + id + '" aria-pressed="' + (id === sourceId) + '">' + icon(doc.icon) + '<span>' + esc(doc.name) + '</span><small>' + (sourceTab === 'citations' ? (id === 'observation' ? '[1]' : '[2]') : esc(doc.size)) + '</small></button>';
    }).join('') || '<p class="no-sessions">这段会话还没有引用，可在文件页查看资料。</p>';
    var doc = documents[sourceId], isCited = current().sample && doc.cited;
    $('#source-content').innerHTML = '<div class="source-document-heading">' + icon(doc.icon) + '<span>' + esc(doc.type) + ' · ' + esc(doc.size) + '</span></div><h3>' + esc(doc.title) + '</h3><p>' + esc(doc.intro) + '</p><div class="source-excerpt' + (sourceCited && isCited ? ' is-cited' : '') + '"><div class="excerpt-label">' + icon('quote') + '<span>' + (sourceCited && isCited ? '对话中的引用位置' : '资料摘录') + '</span></div><p>' + esc(doc.excerpt) + '</p></div><h4>' + esc(doc.heading) + '</h4><p>' + esc(doc.text) + '</p>' + (sourceId === 'tokens' ? '<div class="code-block"><div class="code-header">JSON · 示例</div><pre>{\n  "accent": "#7bd4eb",\n  "signal": "#7bd4eb"\n}</pre></div>' : '') + '<dl class="source-facts"><div><dt>位置</dt><dd>指挥工作区</dd></div><div><dt>使用方式</dt><dd>' + (isCited ? '当前会话引用' : '文件预览') + '</dd></div></dl>';
    $('#source-panel').hidden = !sourceOpen;
    document.querySelectorAll('[data-action="files"][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', sourceOpen && !focusMode); });
  }
  function citation(id, number) { return '<button class="inline-citation" data-citation="' + id + '" aria-label="查看引用' + number + '：' + esc(documents[id].name) + '">' + number + '</button>'; }
  function processMarkup(c) {
    var running = c.state === 'running';
    return '<details class="process"' + (c.processOpen ? ' open' : '') + '><summary>' + icon('chevron-right') + '<span>工作过程</span><span>' + icon(running ? 'clock' : 'check') + (running ? '正在核对资料' : '2 个步骤 · 已完成') + '</span></summary><div class="process-steps"><div class="process-step">' + icon('check') + '<span>读取资料</span><button data-citation="observation">行动素材清单.md</button><small>只读</small></div><div class="process-step">' + icon(running ? 'clock' : 'check') + '<span>' + (running ? '核对引用与整理结构' : '整理结论与待确认项') + '</span></div></div></details>';
  }
  function sampleBody(c) {
    var opening = '<article class="message-body"><h2>行动方案已整理。</h2><p>指挥官，我已核对现有动作素材。<strong>可用素材、缺失动作与原生验收</strong>分别列出，方便你决定下一步。</p>';
    if (c.state === 'running') return '<article class="message-body"><h2>正在核对行动素材。</h2><p>按已收到的原片与清单整理，保留仍需验证的部分。</p></article><div class="running-line" role="status">' + icon('clock') + '<span>正在比对动作素材与执行条件…</span></div>';
    if (c.state === 'attention') return opening + '</article><div class="state-notice" role="status">' + icon('question') + '<div><h3>需要你的决策</h3><p>下一步先验证现有走路循环，还是优先补充拿取、使用道具的动作？</p><div class="notice-options"><button data-resolve="先验证走路循环">先验证走路</button><button data-resolve="先补充持物动作">先补充持物动作</button></div></div></div>';
    if (c.state === 'error') return '<article class="message-body"><h2>这轮核对尚未完成。</h2></article><div class="state-notice error" role="alert">' + icon('alert') + '<div><h3>示例连接中断</h3><p>已有记录与草稿已保留。你可以重试，也可以继续补充信息。</p><div class="notice-options"><button data-action="retry" data-retry-target="sample" aria-label="重试原任务回复"' + (c.messages.length ? ' disabled title="请在最新回复处重试"' : '') + '>重试原任务回复</button></div></div></div>';
    if (c.state === 'stopped') return '<article class="message-body"><h2>已按你的指令停止。</h2></article><div class="state-notice neutral">' + icon('stop') + '<div><h3>本轮已停止</h3><p>已有内容与草稿保留，声画演出已取消。可以继续补充。</p><div class="notice-options"><button data-action="retry" data-retry-target="sample" aria-label="重新生成原任务回复"' + (c.messages.length ? ' disabled title="请在最新回复处重新生成"' : '') + '>重新生成原任务回复</button></div></div></div>';
    return opening + '<h3>先把已有动作接稳</h3><p>走路原片已处理为真实交替步态的透明循环，轻呼吸与轻侧头也已有同源素材。它们仍需分别验证原生显示、移动与停止行为。' + citation('observation',1) + '</p><div class="table-wrap"><table><thead><tr><th>行动</th><th>素材情况</th><th>下一步</th></tr></thead><tbody><tr><td>走路</td><td>1.875秒透明循环</td><td>有限原生拟合</td></tr><tr><td>轻回应</td><td>同母版单次片段</td><td>核对触发与返回</td></tr><tr><td>读书 / 喝茶</td><td>只有独立道具</td><td>补齐握持与使用</td></tr></tbody></table></div><h3>让道具真正进入行动</h3><p>书与杯随拿取、使用、收起出现。没有对应动作时，先让她自然待命；把道具摆在脚边不能替代人物与物品的关系。</p><div class="reply-quote">' + icon('quote') + '收到指令 → 执行 → 结果回执；需要决定时，回到指挥官。 <button data-citation="checklist">查看交互准则</button></div><p>执行中允许随时停止。完成回应只属于本轮新结果，回看历史时保持安静。' + citation('checklist',2) + '</p></article>' + (c.resolved ? '<p class="resolved-note">' + icon('check',13) + ' 已确认：' + esc(c.resolved) + '</p>' : '') + '<div class="reply-bottom"><div class="message-actions"><button data-copy="reply" aria-label="复制回复">' + icon('copy') + '<span>复制</span></button><button data-action="retry" data-retry-target="sample" aria-label="重新生成原任务回复"' + (c.messages.length || c.state === 'running' ? ' disabled title="请在最新回复处重新生成"' : '') + '>' + icon('retry') + '<span>重新生成</span></button></div><span class="reply-receipt"><span class="receipt-seal">' + icon('check') + '</span>本轮回复完成</span></div>';
  }
  function emptyMarkup() {
    return '<section class="empty-page"><div class="empty-heading">' + icon('compose') + '<h2>待命，指挥官。</h2></div><p>告诉我目标，或带上一份资料。我会先梳理可执行的下一步。</p><button class="starter" data-prompt="帮我整理这份资料，保留结论、来源和待确认项。">' + icon('file-text') + '<span>整理一份资料<small>保留依据，把重点放在一起</small></span>' + icon('chevron-right') + '</button><button class="starter" data-prompt="帮我梳理这个想法，先列目标、约束和下一步。">' + icon('conversation') + '<span>梳理一个想法<small>从目标、约束和下一步开始</small></span>' + icon('chevron-right') + '</button><button class="starter" data-prompt="帮我阅读这段代码，说明它的逻辑和需要检查的地方。">' + icon('file-code') + '<span>读一段代码<small>说清逻辑与需要检查的地方</small></span>' + icon('chevron-right') + '</button></section>';
  }
  function renderThread() {
    var c = current(), baseContext = Object.assign({},c,{state:c.sampleState || c.state});
    if (c.state === 'empty' && !c.messages.length) $('#thread').innerHTML = emptyMarkup();
    else {
      var sample = c.sample ? '<div class="chat-date">本地示例 · 当前任务</div><div class="user-message"><div class="message-meta"><span>指挥官 · 你</span><span>刚刚</span></div><div class="user-note">核对现有桌宠动作，告诉我哪些素材可用、哪些还需要补充。</div><button class="message-attachment" data-file="observation">' + icon('file-text') + '<span>行动素材清单.md</span><small>2.4 KB</small></button></div><div class="assistant-meta"><span class="assistant-mark">' + icon('workspace') + '</span><strong>DSH · 素材核对</strong><span>依据 2 份资料</span></div>' + processMarkup(baseContext) + sampleBody(baseContext) : '';
      var messages = c.messages.map(function (message, index) {
        var receipt = message.stopped ? '本条回复已停止' : '本条回复完成';
        var retry = index === c.messages.length - 1 ? '<button data-action="retry" data-retry-target="latest" aria-label="重新生成最新回复"' + (c.state === 'running' ? ' disabled' : '') + '>' + icon('retry') + '<span>重新生成本条回复</span></button>' : '';
        return '<div class="user-message"><div class="message-meta">指挥官 · 你</div><div class="user-note">' + esc(message.question).replace(/\n/g, '<br>') + '</div>' + (message.attached ? '<button class="message-attachment" data-file="observation">' + icon('file-text') + '<span>行动素材清单.md</span><small>2.4 KB</small></button>' : '') + '</div><div class="assistant-meta"><span class="assistant-mark">' + icon('workspace') + '</span><strong>DSH</strong></div>' + (message.answer ? '<article class="message-body"><p>' + esc(message.answer) + '</p></article><div class="reply-bottom"><div class="message-actions">' + retry + '</div><span class="reply-receipt' + (message.stopped ? ' is-stopped' : '') + '"><span class="receipt-seal">' + icon(message.stopped ? 'stop' : 'check') + '</span>' + receipt + '</span></div>' : '<div class="running-line" role="status">' + icon('clock') + '正在整理这条补充…</div>');
      }).join('');
      $('#thread').innerHTML = sample + messages;
    }
    $('#conversation-title').textContent = c.title;
    $('#sample-state').value = c.state;
    var labels = {complete:'已回复',running:'执行中',attention:'需处理',error:'未完成',stopped:'已停止',empty:'新会话'};
    $('#header-status').dataset.status = c.state;
    $('#header-status').innerHTML = '<span class="status-dot"></span>' + labels[c.state];
    $('#companion-copy').textContent = ({complete:'指挥官，结果已就绪。',running:'收到，正在核对。',attention:'指挥官，有一项需要你决定。',error:'链路中断，记录已保留。',stopped:'已停止，等待你的下一步指令。',empty:'我已就位，等待你的指令。'})[c.state];
    $('#command-copy').textContent = $('#companion-copy').textContent; $('#companion-state').textContent = ({complete:'待命',running:'执行中',attention:'待决策',error:'连接中断',stopped:'已中止',empty:'待命'})[c.state]; document.body.dataset.state = c.state;
    syncComposer(); updateLatest();
  }
  function syncComposer() {
    var c = current();
    $('#draft').value = c.draft;
    $('#draft-attachments').hidden = !c.attached;
    var running = c.state === 'running';
    $('#send-button').disabled = !running && !c.draft.trim();
    $('#send-button').setAttribute('aria-label', running ? '停止本地示例生成' : '发送本地示例消息');
    $('#send-button').innerHTML = icon(running ? 'stop' : 'send');
  }
  function setState(value) {
    cancelTimer(); motion?.cancelVisuals(); motion?.cancelEcho();
    var c = current(); c.state = value; c.sampleState = value; c.resolved = null; c.unreadReply = false;
    c.responseTarget = null; c.responseMessage = null;
    c.messages = []; c.sample = value !== 'empty'; sourceCited = false;
    if (value === 'empty') sourceTab = 'files';
    renderThread(); renderNav(); renderSources();
    if(['attention','error','stopped'].includes(value)) $('#thread .state-notice')?.scrollIntoView({block:'nearest'});
    if (value === 'complete') acknowledgeCompletion(c.id);
    else if (value === 'running') motion?.cue('working',$('#thread .running-line') || $('#thread .process'));
    else motion?.cue('notice',$('#thread .state-notice'));
    if (value === 'attention' || value === 'error') sounds?.play(value);
    announce('本地情景：' + $('#sample-state').selectedOptions[0].textContent);
  }
  function selectConversation(id, transition) {
    if (id === currentId) { closeMenu(false); return; }
    var previous = current(); if (previous) previous.scrollTop = $('#conversation-scroll').scrollTop;
    closeMenu(false); motion?.cancelVisuals(); motion?.cancelEcho(); sounds?.cancel();
    currentId = id; sourceCited = false; if (!current().sample) sourceTab = 'files';
    renderNav(); renderThread(); renderSources(); $('#conversation-scroll').scrollTop = current().scrollTop || 0; updateLatest();
    if (transition !== false) { motion?.cue('switch',$('#thread')); motion?.cue('index',$('#sidebar .session-row.selected')); }
  }
  function cancelTimer(c) { c = c || current(); c.responseSerial = (c.responseSerial || 0) + 1; if (c.pendingTimer) clearTimeout(c.pendingTimer); c.pendingTimer = null; }
  function newConversation() {
    var c = {id:'local-' + (++localId),title:'新会话',excerpt:'等待你的下一步指令',pinned:false,state:'empty',draft:'',attached:false,messages:[],sample:false,processOpen:false};
    conversations.unshift(c); selectConversation(c.id,false); $('#session-search').value = ''; renderNav(); $('#draft').focus(); motion?.cue('new',$('#thread .empty-page')); announce('已新建本地示例会话');
  }
  function simulateResponse(retry, retryTarget) {
    var c = current(), text = c.draft.trim();
    if (!retry && !text) return;
    // This prototype retries the original reply before follow-ups, or the
    // latest follow-up in place. It does not silently rewrite older branches.
    if (retry && (c.state === 'running' ||
      (retryTarget === 'sample' && (!c.sample || c.messages.length)) ||
      (retryTarget === 'latest' && !c.messages.length) ||
      !['sample','latest'].includes(retryTarget))) return;
    if (c.sample && !c.sampleState) c.sampleState = c.state;
    cancelTimer(c); var serial = c.responseSerial, id = c.id;
    if (!retry) {
      c.messages.push({question:text,answer:null,attached:c.attached}); c.draft = ''; c.attached = false;
      if (c.title === '新会话') c.title = text.length > 16 ? text.slice(0, 16) + '…' : text;
      c.excerpt = '本页中的连续对话示例';
    }
    c.responseTarget = retry && retryTarget === 'sample' ? 'sample' : 'latest';
    c.responseMessage = c.responseTarget === 'latest' ? c.messages[c.messages.length - 1] : null;
    var reply = c.responseMessage, responseTarget = c.responseTarget;
    if (reply) { reply.answer = null; reply.stopped = false; }
    else c.sampleState = 'running';
    c.state = 'running'; motion?.cancelEcho(); sounds?.play('send'); renderThread(); renderNav();
    motion?.cue('send',Array.from(document.querySelectorAll('#thread .user-message')).at(-1));
    motion?.cue('working',$('#thread .running-line') || $('#thread .process'));
    requestAnimationFrame(function () { $('#conversation-scroll').scrollTop = $('#conversation-scroll').scrollHeight; });
    c.pendingTimer = setTimeout(function () {
      var target = conversations.find(function (item) { return item.id === id; });
      if (!target || serial !== target.responseSerial) return;
      if (responseTarget === 'sample') target.sampleState = 'complete';
      if (reply) {
        reply.answer = '收到这条补充。本地示例已完成；真实执行时会依据当前任务、已有资料与可用能力继续处理。';
        reply.stopped = false;
      }
      target.pendingTimer = null; target.responseTarget = null; target.responseMessage = null;
      target.state = needsDecision(target) ? 'attention' : 'complete';
      if (currentId === id) {
        var view = $('#conversation-scroll'), wasAtEnd = view.scrollHeight - view.scrollTop - view.clientHeight < 90, beforeTop = view.scrollTop;
        renderThread();
        if (wasAtEnd) view.scrollTop = view.scrollHeight; else view.scrollTop = beforeTop;
        target.unreadReply = !wasAtEnd; updateLatest();
        acknowledgeCompletion(id); announce(needsDecision(target) ? '补充回复完成，原问题仍待你的决策' : '本地示例回复完成');
      }
      if (currentId !== id) target.unreadReply = true;
      renderNav();
    }, 2300);
  }
  function stopResponse() {
    var c = current(), reply = c.responseMessage;
    cancelTimer(); motion?.cancelVisuals(); motion?.cancelEcho(); sounds?.cancel();
    if (c.responseTarget === 'sample' || (!c.messages.length && c.sample)) c.sampleState = 'stopped';
    if (reply && !reply.answer) { reply.answer = '这条回复已停止，已提交内容保留在本页。'; reply.stopped = true; }
    c.responseTarget = null; c.responseMessage = null;
    c.state = needsDecision(c) ? 'attention' : 'stopped';
    renderThread(); announce(needsDecision(c) ? '补充回复已停止，原问题与选择仍保留' : '本条回复已停止');
  }
  async function copyText(button, text) {
    var label = button.querySelector('span') || button;
    var original = label.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.classList.add('copied'); label.textContent = '已复制';
      var glyph = button.querySelector('svg'); if (glyph) glyph.outerHTML = icon('check', 15);
      announce('已复制');
      setTimeout(function () { if (!button.isConnected) return; button.classList.remove('copied'); label.textContent = original; var next = button.querySelector('svg'); if (next) next.outerHTML = icon('copy', 15); }, 1500);
    } catch (_) { announce('浏览器未允许复制，可以直接选择这段文本'); label.textContent = '请选择文本复制'; }
  }
  function showCitation(id, anchor, cited) {
    var origin = anchor?.getBoundingClientRect();
    var before = anchor?.closest('#thread') ? anchor.getBoundingClientRect().top : undefined;
    switchView('workspace'); focusMode = false; sourceOpen = true; sourceId = id; sourceCited = cited !== false; if (!sourceCited) sourceTab = 'files'; applyViewState(); renderSources();
    if (anchor?.isConnected && before !== undefined) $('#conversation-scroll').scrollTop += anchor.getBoundingClientRect().top - before;
    motion?.cue('source',$('#source-content')); if (origin && cited !== false) motion?.sourceTransfer(origin,$('#source-content .source-excerpt'),id === 'observation' ? '1' : '2'); announce('已打开资料：' + documents[id].name);
  }
  function applyViewState() {
    if (motion?.hasPerformance()) motion.cancelVisuals();
    withReadingAnchor(function () {
    document.body.dataset.collapsed = String(collapsed); document.body.dataset.focus = String(focusMode);
    document.querySelector('[data-action="focus"]').setAttribute('aria-pressed', focusMode);
    document.querySelector('[data-action="focus"]').setAttribute('aria-label', focusMode ? '退出专注阅读' : '开启专注阅读');
    document.querySelector('[data-action="focus"]').title = focusMode ? '退出专注阅读' : '专注阅读';
    document.querySelector('.sidebar-brand [data-action="collapse"]').setAttribute('aria-label', collapsed ? '展开导航' : '收起导航');
    renderSources();
    });
  }
  function setTheme(value) {
    if (motion?.hasPerformance()) motion.cancelVisuals();
    theme = value; document.body.dataset.theme = value;
    $('#theme-toggle').innerHTML = icon(value === 'light' ? 'moon' : 'sun');
    $('#theme-toggle').setAttribute('aria-label', value === 'light' ? '切换深海预览' : '切换明亮预览'); $('#theme-toggle').title = $('#theme-toggle').getAttribute('aria-label');
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.themeChoice === value); });
  }
  function setDetails(value) {
    details = value; document.body.dataset.details = String(value);
    $('#details-toggle').setAttribute('aria-pressed', value); $('#details-toggle').textContent = value ? '细节开启' : '基础呈现';
    $('#appearance-details').checked = value;
  }
  function switchView(value) {
    closeMenu(false); activeView = value;
    ['workspace','skin','icons','notes'].forEach(function (name) { $('#' + name + '-view').hidden = value !== name; });
    document.querySelectorAll('.review-tabs [data-view]').forEach(function (button) { button.classList.toggle('selected', button.dataset.view === value); if (button.dataset.view === value) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
    $('#icon-inspector').hidden = true; motion?.sync();
  }
  function closeMenu(restore) {
    $('#popover').hidden = true; if (menuOpener) menuOpener.setAttribute('aria-expanded','false');
    if (restore && menuOpener && menuOpener.isConnected) menuOpener.focus(); menuOpener = null;
  }
  function openMenu(opener, html) {
    closeMenu(false); menuOpener = opener; opener.setAttribute('aria-expanded','true');
    var pop = $('#popover'); pop.innerHTML = html; pop.hidden = false; pop.setAttribute('role','menu');
    var bounds = opener.getBoundingClientRect(), height = pop.offsetHeight, width = pop.offsetWidth;
    pop.style.left = Math.max(10, Math.min(bounds.left, innerWidth - width - 10)) + 'px';
    pop.style.top = (bounds.bottom + height + 8 < innerHeight ? bounds.bottom + 6 : Math.max(58, bounds.top - height - 6)) + 'px';
    pop.querySelector('button')?.focus({preventScroll:true});
  }
  function openAppearance(opener) { closeMenu(false); appearanceOpener = opener; $('#appearance-panel').hidden = false; $('#appearance-panel [data-action="close-appearance"]').focus({preventScroll:true}); }
  function closeAppearance(restore) { $('#appearance-panel').hidden = true; if (restore && appearanceOpener?.isConnected) appearanceOpener.focus(); }
  function renderIcons() {
    $('#icon-inspector').hidden = true;
    var q = $('#icon-search').value.trim().toLowerCase(), groups = ['导航','对话','文件','状态','设置','DSH功能'];
    var matching = icons.filter(function (item) { return (item.label + ' ' + item.id + ' ' + item.group).toLowerCase().includes(q); });
    $('#icon-collection').innerHTML = groups.map(function (group) {
      var items = matching.filter(function (item) { return item.group === group; });
      if (!items.length) return '';
      return '<section class="icon-group"><h2>' + group + '<small>' + items.length + ' 枚</small></h2><div class="icon-grid">' + items.map(function (item) { return '<button class="icon-specimen" data-inspect="' + item.id + '" aria-label="查看图标：' + item.label + '">' + icon(item.id) + '<span>' + item.label + '<small>' + item.id + '</small></span></button>'; }).join('') + '</div></section>';
    }).join('') || '<p class="no-sessions">没有匹配的图标。试试“文件”“复制”或“设置”。</p>';
  }
  function inspectIcon(id, opener) {
    inspectorOpener = opener; var item = iconMap[id], panel = $('#icon-inspector');
    panel.innerHTML = '<header><h2>' + item.label + '</h2><button class="icon-button" data-action="close-inspector" aria-label="关闭图标详情">' + icon('close') + '</button></header><div class="size-samples">' + [16,20,24].map(function (size) { return '<span>' + icon(id, size) + '<small>' + size + 'px</small></span>'; }).join('') + '</div><p>' + item.id + ' · ' + item.group + '<br>统一线宽，继承当前文字色；银蓝只用于辅助笔画。</p><a href="assets/icons/' + id + '.svg" download>下载 SVG 原稿</a>';
    panel.hidden = false; panel.querySelector('button').focus({preventScroll:true});
  }
  document.addEventListener('click', function (event) {
    var node = event.target.closest('button,[data-source],[data-citation]'); if (!node) { if (!$('#popover').contains(event.target)) closeMenu(false); return; }
    if (node.dataset.view) { switchView(node.dataset.view); return; }
    if (node.dataset.session) { selectConversation(node.dataset.session); return; }
    if (node.dataset.source) { sourceId = node.dataset.source; sourceCited = false; renderSources(); motion?.cue('source',$('#source-content')); return; }
    if (node.dataset.file) { showCitation(node.dataset.file,node,false); return; }
    if (node.dataset.citation) { showCitation(node.dataset.citation,node); return; }
    if (node.dataset.sourceTab) { sourceTab = node.dataset.sourceTab; renderSources(); return; }
    if (node.dataset.themeChoice) { setTheme(node.dataset.themeChoice); return; }
    if (node.dataset.inspect) { inspectIcon(node.dataset.inspect, node); return; }
    if (node.dataset.resolve) { var decision = current(); decision.resolved = node.dataset.resolve; decision.sampleState = 'complete'; decision.state = decision.pendingTimer ? 'running' : 'complete'; renderThread(); acknowledgeCompletion(currentId); announce('已确认：' + node.dataset.resolve); return; }
    if (node.dataset.prompt) { current().draft = node.dataset.prompt; syncComposer(); $('#draft').focus(); return; }
    if (node.dataset.menuSession) {
      var c = conversations.find(function (item) { return item.id === node.dataset.menuSession; });
      openMenu(node, '<div class="popover-header">' + esc(c.title) + '</div><button role="menuitem" data-pin-session="' + c.id + '">' + icon('pin') + (c.pinned ? '取消置顶' : '置顶会话') + '</button><button role="menuitem" data-copy-title="' + c.id + '">' + icon('copy') + '复制会话标题</button>'); return;
    }
    if (node.dataset.pinSession) { var target = conversations.find(function (item) { return item.id === node.dataset.pinSession; }); var before = motion?.rowPositions(); target.pinned = !target.pinned; closeMenu(false); renderNav(); if (before) motion?.settleRows(before); document.querySelector('[data-session="' + target.id + '"]')?.focus({preventScroll:true}); announce(target.pinned ? '已置顶本地会话' : '已取消置顶'); return; }
    if (node.dataset.copyTitle) { var title = conversations.find(function (item) { return item.id === node.dataset.copyTitle; }).title; copyText(node, title); return; }
    if (node.dataset.model) { model = node.dataset.model; $('#model-name').textContent = model; closeMenu(true); announce('本页模型显示已切换为' + model); return; }
    if (node.dataset.copy) { copyText(node, node.dataset.copy === 'code' ? '{\n  "reading": "stable",\n  "feedback": "quiet"\n}' : node.closest('#thread').querySelector('.message-body').innerText); return; }
    if (node.dataset.try) {
      switchView('workspace');
      if (node.dataset.try === 'navigation') { focusMode = false; collapsed = !collapsed; applyViewState(); }
      if (node.dataset.try === 'citation') showCitation('observation');
      if (node.dataset.try === 'composer') { current().attached = true; syncComposer(); $('#draft').focus(); }
      if (node.dataset.try === 'attention') setState('attention');
      return;
    }
    var action = node.dataset.action;
    if (action !== 'model' && action !== 'appearance' && !$('#popover').contains(node)) closeMenu(false);
    if (action === 'collapse') { if (focusMode) { focusMode = false; collapsed = false; } else collapsed = !collapsed; applyViewState(); }
    if (action === 'expand-search') { collapsed = false; applyViewState(); $('#session-search').focus(); }
    if (action === 'new') newConversation();
    if (action === 'files') { if (focusMode) { focusMode = false; sourceOpen = true; } else sourceOpen = !sourceOpen; applyViewState(); }
    if (action === 'focus') { focusMode = !focusMode; applyViewState(); }
    if (action === 'toggle-pinned') { pinnedOpen = !pinnedOpen; node.setAttribute('aria-expanded', pinnedOpen); renderNav(); }
    if (action === 'attach') { current().attached = !current().attached; syncComposer(); if (current().attached) motion?.cue('attachment',$('#draft-attachments')); }
    if (action === 'remove-attachment') { current().attached = false; syncComposer(); $('#draft').focus(); }
    if (action === 'retry') simulateResponse(true,node.dataset.retryTarget);
    if (action === 'preview-motion') previewFeedback();
    if (action === 'preview-theme') { switchView('workspace'); closeAppearance(false); motion?.previewTheme(); }
    if (action === 'latest') { $('#conversation-scroll').scrollTop = $('#conversation-scroll').scrollHeight; current().unreadReply = false; updateLatest(); renderNav(); $('#conversation-scroll').focus({preventScroll:true}); }
    if (action === 'model') openMenu(node, '<div class="popover-header">当前会话 · 本地模型示例</div>' + ['DeepSeek','示例模型 B'].map(function (name) { return '<button role="menuitemradio" aria-checked="' + (model === name) + '" data-model="' + name + '">' + icon(model === name ? 'check' : 'conversation') + name + (model === name ? '<small>当前</small>' : '') + '</button>'; }).join(''));
    if (action === 'appearance') openAppearance(node);
    if (action === 'close-appearance') closeAppearance(true);
    if (action === 'close-inspector') { $('#icon-inspector').hidden = true; if (inspectorOpener?.isConnected) inspectorOpener.focus(); }
  });
  $('#conversation-scroll').addEventListener('scroll', updateLatest);
  $('#session-search').addEventListener('input', renderNav);
  $('#icon-search').addEventListener('input', renderIcons);
  $('#sample-state').addEventListener('change', function (event) { setState(event.target.value); });
  $('#details-toggle').addEventListener('click', function () { setDetails(!details); });
  $('#theme-toggle').addEventListener('click', function () { setTheme(theme === 'light' ? 'dark' : 'light'); });
  $('#appearance-details').addEventListener('change', function (event) { setDetails(event.target.checked); });
  $('#appearance-reduced').addEventListener('change', function (event) { reduced = event.target.checked; document.body.dataset.reduced = String(reduced); motion?.sync(); });
  $('#appearance-motion').addEventListener('change', function (event) { uiMotion = event.target.checked; document.body.dataset.motion = String(uiMotion); motion?.sync(); });
  $('#appearance-echo').addEventListener('change', function (event) { petEcho = event.target.checked; motion?.sync(); });
  $('#draft').addEventListener('input', function (event) { current().draft = event.target.value; $('#send-button').disabled = current().state !== 'running' && !event.target.value.trim(); });
  $('#composer-form').addEventListener('submit', function (event) { event.preventDefault(); if (current().state === 'running') stopResponse(); else simulateResponse(false); });
  $('#thread').addEventListener('toggle', function (event) { if (event.target.matches('.process')) current().processOpen = event.target.open; }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (motion?.hasPerformance()) { event.preventDefault(); motion.cancelVisuals(true); sounds?.cancel(); announce('已跳过演出，原状态与输入保留'); return; }
      if (!$('#popover').hidden) { event.preventDefault(); closeMenu(true); }
      else if (!$('#appearance-panel').hidden) { event.preventDefault(); closeAppearance(true); }
      else if (!$('#icon-inspector').hidden) { $('#icon-inspector').hidden = true; inspectorOpener?.focus(); }
      else if (focusMode) { focusMode = false; applyViewState(); document.querySelector('[data-action="focus"]').focus(); }
    }
    if (!$('#popover').hidden && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault(); var options = Array.from($('#popover').querySelectorAll('button')), index = options.indexOf(document.activeElement), next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; options[next].focus();
    }
    if (event.target.matches('[data-source-tab]') && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); sourceTab = sourceTab === 'files' ? 'citations' : 'files'; renderSources(); document.querySelector('[data-source-tab="' + sourceTab + '"]').focus(); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); switchView('workspace'); collapsed = false; focusMode = false; applyViewState(); $('#session-search').focus(); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); switchView('workspace'); newConversation(); }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && event.target === $('#draft') && !event.isComposing) { event.preventDefault(); if (current().state === 'running') stopResponse(); else simulateResponse(false); }
  });
  addEventListener('resize', function () { closeMenu(false); });
  hydrate(document);
  motion = window.createCommanderMotion({preferences:function () { return {uiMotion:uiMotion,petEcho:petEcho,reduced:reduced,sound:sound}; },surface:$('#workspace-view'),idleVideo:$('#companion-idle'),reactVideo:$('#companion-react'),fallback:$('#companion-static'),icon:icon,announce:announce});
  sounds = window.createCommanderSounds({preferences:function(){return {sound:sound};},visible:function(){return !$('#workspace-view').hidden;}});
  renderNav(); renderThread(); renderSources(); renderIcons(); motion.sync(); setTheme('dark');
  function setSound(value) { sound=value; $('#appearance-sound').checked=value; $('#sound-toggle').setAttribute('aria-pressed',value); $('#sound-toggle').setAttribute('aria-label',value?'关闭演出与事件声音':'开启演出与事件声音'); $('#sound-toggle').innerHTML=icon(value?'volume':'mute')+'<span>'+(value?'声音开':'已静音')+'</span>'; if(!value)sounds.cancel(); motion.sync(); }
  $('#sound-toggle').addEventListener('click',function(){setSound(!sound);});
  $('#appearance-sound').addEventListener('change',function(e){setSound(e.target.checked);});
  document.addEventListener('visibilitychange',function(){if(document.hidden)sounds.cancel();});
  document.body.dataset.reduced = String(reduced); $('#appearance-reduced').checked = reduced;
  // Opening is explicitly triggered; entering the workspace never stacks a second intro.
})();
