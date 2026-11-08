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
  var theme = 'light', details = true, reduced = false;
  var uiMotion = true, petEcho = true, motion;
  var collapsed = false, focusMode = false, sourceOpen = true, sourceTab = 'files', sourceId = 'observation', sourceCited = false;
  var activeView = 'workspace', model = 'DeepSeek', pinnedOpen = true, currentId = 'working', localId = 0;
  var menuOpener, appearanceOpener, inspectorOpener;
  var conversations = [
    {id:'working',title:'整理工作区观察',excerpt:'阅读、反馈与下一步',pinned:true,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'reading',title:'一份清晰的阅读记录',excerpt:'把依据和结论放在一起',pinned:true,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'ideas',title:'今天的灵感',excerpt:'留住还没成形的想法',pinned:false,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false},
    {id:'interface',title:'界面与互动想法',excerpt:'安静、清楚、有一点个性',pinned:false,state:'complete',draft:'',attached:false,messages:[],sample:true,processOpen:false}
  ];
  var documents = {
    observation:{name:'观察记录.md',icon:'file-text',size:'2.4 KB',type:'Markdown',title:'工作区观察记录',intro:'把日常操作里的观察记下来，方便下次沿着依据继续。',excerpt:'装饰留在两侧，正文始终有一个稳定的阅读表面。过程记录可以收起，原始依据仍然保留。',heading:'阅读与资料',text:'正文、引用和工具结果优先保持清楚。查看资料后回到原来的阅读位置，不打断刚刚建立的上下文。',cited:true},
    checklist:{name:'界面改进清单.md',icon:'file-text',size:'1.8 KB',type:'Markdown',title:'界面改进清单',intro:'把可以改进的地方，变成一份有先后顺序的清单。',excerpt:'完成反馈应当说明本轮结果；需要确认时，给出清楚的原始问题和处理入口。',heading:'操作与反馈',text:'把恢复入口留在原来的位置。复制后在按钮上给一个简短确认；遇到中断时保留输入，再让用户选择重试。',cited:true},
    tokens:{name:'theme-tokens.json',icon:'file-code',size:'860 B',type:'JSON',title:'主题颜色记录',intro:'此文件是用于检查代码与文件预览的本地示例。',excerpt:'操作使用铜橙，角色与资料线索使用银蓝；正文保持稳定的纸面。',heading:'颜色职责',text:'颜色辅助辨认，不单独承担状态含义。文字、图标与清楚的选中关系共同表达当前状态。',cited:false}
  };
  function current() { return conversations.find(function (c) { return c.id === currentId; }); }
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
    motion?.respondOnce();
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
    $('#source-content').innerHTML = '<div class="source-document-heading">' + icon(doc.icon) + '<span>' + esc(doc.type) + ' · ' + esc(doc.size) + '</span></div><h3>' + esc(doc.title) + '</h3><p>' + esc(doc.intro) + '</p><div class="source-excerpt' + (sourceCited && isCited ? ' is-cited' : '') + '"><div class="excerpt-label">' + icon('quote') + '<span>' + (sourceCited && isCited ? '对话中的引用位置' : '资料摘录') + '</span></div><p>' + esc(doc.excerpt) + '</p></div><h4>' + esc(doc.heading) + '</h4><p>' + esc(doc.text) + '</p>' + (sourceId === 'tokens' ? '<div class="code-block"><div class="code-header">JSON · 示例</div><pre>{\n  "accent": "#a54c19",\n  "signal": "#35677e"\n}</pre></div>' : '') + '<dl class="source-facts"><div><dt>位置</dt><dd>我的工作台</dd></div><div><dt>使用方式</dt><dd>' + (isCited ? '当前会话引用' : '文件预览') + '</dd></div></dl>';
    $('#source-panel').hidden = !sourceOpen;
    document.querySelectorAll('[data-action="files"][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', sourceOpen && !focusMode); });
  }
  function citation(id, number) { return '<button class="inline-citation" data-citation="' + id + '" aria-label="查看引用' + number + '：' + esc(documents[id].name) + '">' + number + '</button>'; }
  function processMarkup(c) {
    var running = c.state === 'running';
    return '<details class="process"' + (c.processOpen ? ' open' : '') + '><summary>' + icon('chevron-right') + '<span>工作过程</span><span>' + icon(running ? 'clock' : 'check') + (running ? '正在核对资料' : '2 个步骤 · 已完成') + '</span></summary><div class="process-steps"><div class="process-step">' + icon('check') + '<span>读取资料</span><button data-citation="observation">观察记录.md</button><small>只读</small></div><div class="process-step">' + icon(running ? 'clock' : 'check') + '<span>' + (running ? '核对引用与整理结构' : '整理结论与待确认项') + '</span></div></div></details>';
  }
  function sampleBody(c) {
    var opening = '<article class="message-body"><h2>把零散线索，放回清晰的秩序。</h2><p>我把观察分成了<strong>阅读体验、操作反馈和待确认项</strong>。先保留结论，再把依据和下一步放在一起。</p>';
    if (c.state === 'running') return opening + '</article><div class="running-line" role="status">' + icon('clock') + '<span>正在核对资料的引用位置…</span></div>';
    if (c.state === 'attention') return opening + '</article><div class="state-notice" role="status">' + icon('alert') + '<div><h3>需要确认整理范围</h3><p>这次先整理本地资料，还是也包含可以公开查阅的资料？</p><div class="notice-options"><button data-resolve="仅本地资料">仅本地资料</button><button data-resolve="包含公开资料">包含公开资料</button></div></div></div>';
    if (c.state === 'error') return opening + '</article><div class="state-notice error" role="alert">' + icon('alert') + '<div><h3>这轮回复没有完成</h3><p>示例连接中断，输入内容已保留。可以重试，或继续编辑补充。</p><div class="notice-options"><button data-action="retry">重试本地示例</button></div></div></div>';
    if (c.state === 'stopped') return opening + '</article><div class="state-notice neutral">' + icon('stop') + '<div><h3>本轮已停止</h3><p>已有内容与草稿保留，可以继续补充。</p></div></div>';
    return opening + '<h3>先保护阅读，再加入细节</h3><p>正文、引用与工具结果放在稳定的表面。导航和资料退到两侧，让注意力回到正在读的这一段。' + citation('observation', 1) + '</p><div class="reply-quote">' + icon('quote') + '“装饰留在两侧，正文始终有一个稳定的阅读表面。” <button data-citation="observation" aria-label="打开观察记录中的原文">查看原文</button></div><div class="table-wrap"><table><thead><tr><th>观察位置</th><th>整理后的处理</th><th>下一步</th></tr></thead><tbody><tr><td>长回复与引用</td><td>稳定纸面，资料就近打开</td><td>继续核对阅读</td></tr><tr><td>导航与会话</td><td>区分层级，保留当前位置</td><td>检查收起状态</td></tr><tr><td>操作与反馈</td><td>完成、需处理分别表达</td><td>按情景检查</td></tr></tbody></table></div><h3>给下一步留一个清楚的位置</h3><p>需要确认的内容留在原来的会话里，不用重新寻找。复制、引用和重新生成等操作在回复末尾保持固定顺序。' + citation('checklist', 2) + '</p><ul><li>先确认本轮范围，再继续补资料。</li><li>保留关闭与恢复入口，减少重复操作。</li></ul><div class="code-block"><div class="code-header"><span>JSON · 排版示例</span><button data-copy="code" aria-label="复制代码示例">' + icon('copy') + '<span>复制</span></button></div><pre><code>{\n  <span class="code-key">"reading"</span>: <span class="code-value">"stable"</span>,\n  <span class="code-key">"feedback"</span>: <span class="code-value">"quiet"</span>\n}</code></pre></div><p>结论与依据放在一起，后续就能沿着这页继续。</p></article>' + (c.resolved ? '<p class="resolved-note">' + icon('check', 13) + ' 已确认：' + esc(c.resolved) + '</p>' : '') + '<div class="reply-bottom"><div class="message-actions"><button data-copy="reply" aria-label="复制回复">' + icon('copy') + '<span>复制</span></button><button data-action="retry" aria-label="重新生成本地示例">' + icon('retry') + '<span>重新生成</span></button></div><span class="reply-receipt"><span class="receipt-seal">' + icon('check') + '</span>本轮回复完成</span></div>';
  }
  function emptyMarkup() {
    return '<section class="empty-page"><div class="empty-heading">' + icon('compose') + '<h2>新的一页，从这里开始。</h2></div><p>把资料、问题或还没成形的想法放在这里，我们一项项整理。</p><button class="starter" data-prompt="帮我整理这份资料，保留结论、来源和待确认项。">' + icon('file-text') + '<span>整理一份资料<small>保留依据，把重点放在一起</small></span>' + icon('chevron-right') + '</button><button class="starter" data-prompt="帮我梳理这个想法，先列目标、约束和下一步。">' + icon('conversation') + '<span>梳理一个想法<small>从目标、约束和下一步开始</small></span>' + icon('chevron-right') + '</button><button class="starter" data-prompt="帮我阅读这段代码，说明它的逻辑和需要检查的地方。">' + icon('file-code') + '<span>读一段代码<small>说清逻辑与需要检查的地方</small></span>' + icon('chevron-right') + '</button></section>';
  }
  function renderThread() {
    var c = current(), baseContext = c.messages.length ? Object.assign({},c,{state:'complete'}) : c;
    if (c.state === 'empty' && !c.messages.length) $('#thread').innerHTML = emptyMarkup();
    else {
      var sample = c.sample ? '<div class="chat-date">今天 · 11 月 4 日</div><div class="user-message"><div class="message-meta"><span>你</span><span>刚刚</span></div><div class="user-note">把这份观察整理成一份清晰的实施记录，保留结论、依据和还需要确认的部分。</div><button class="message-attachment" data-file="observation">' + icon('file-text') + '<span>观察记录.md</span><small>2.4 KB</small></button></div><div class="assistant-meta"><span class="assistant-mark">' + icon('workspace') + '</span><strong>DSH</strong><span>依据 2 份资料</span></div>' + processMarkup(baseContext) + sampleBody(baseContext) : '';
      var messages = c.messages.map(function (message) { return '<div class="user-message"><div class="message-meta">你</div><div class="user-note">' + esc(message.question).replace(/\n/g, '<br>') + '</div>' + (message.attached ? '<button class="message-attachment" data-file="observation">' + icon('file-text') + '<span>观察记录.md</span><small>2.4 KB</small></button>' : '') + '</div><div class="assistant-meta"><span class="assistant-mark">' + icon('workspace') + '</span><strong>DSH</strong></div>' + (message.answer ? '<article class="message-body"><p>' + esc(message.answer) + '</p></article><div class="reply-bottom"><span></span><span class="reply-receipt' + (message.stopped ? ' is-stopped' : '') + '"><span class="receipt-seal">' + icon(message.stopped ? 'stop' : 'check') + '</span>' + (message.stopped ? '本轮已停止' : '本轮回复完成') + '</span></div>' : '<div class="running-line" role="status">' + icon('clock') + '正在整理这条补充…</div>'); }).join('');
      $('#thread').innerHTML = sample + messages;
    }
    $('#conversation-title').textContent = c.title;
    $('#sample-state').value = c.state;
    var labels = {complete:'已回复',running:'执行中',attention:'需处理',error:'未完成',stopped:'已停止',empty:'新会话'};
    $('#header-status').dataset.status = c.state;
    $('#header-status').innerHTML = '<span class="status-dot"></span>' + labels[c.state];
    $('#companion-copy').textContent = ({complete:'这页先放稳，我在这里。',running:'我在这里，等这一页整理好。',attention:'有一项需要你确认。',error:'先留住这页，再慢慢来。',stopped:'这轮先放在这里。',empty:'新的一页，慢慢写。'})[c.state];
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
    var c = current(); c.state = value; c.resolved = null; c.unreadReply = false;
    c.messages = []; c.sample = value !== 'empty'; sourceCited = false;
    if (value === 'empty') sourceTab = 'files';
    renderThread(); renderNav(); renderSources();
    if (value === 'complete') acknowledgeCompletion(c.id);
    else if (value === 'running') motion?.cue('working',$('#thread .running-line') || $('#thread .process'));
    else motion?.cue('notice',$('#thread .state-notice'));
    announce('本地情景：' + $('#sample-state').selectedOptions[0].textContent);
  }
  function selectConversation(id, transition) {
    if (id === currentId) { closeMenu(false); return; }
    var previous = current(); if (previous) previous.scrollTop = $('#conversation-scroll').scrollTop;
    closeMenu(false); motion?.cancelVisuals(); motion?.cancelEcho();
    currentId = id; sourceCited = false; if (!current().sample) sourceTab = 'files';
    renderNav(); renderThread(); renderSources(); $('#conversation-scroll').scrollTop = current().scrollTop || 0; updateLatest();
    if (transition !== false) { motion?.cue('switch',$('#thread')); motion?.cue('index',$('#sidebar .session-row.selected')); }
  }
  function cancelTimer(c) { c = c || current(); c.responseSerial = (c.responseSerial || 0) + 1; if (c.pendingTimer) clearTimeout(c.pendingTimer); c.pendingTimer = null; }
  function newConversation() {
    var c = {id:'local-' + (++localId),title:'新会话',excerpt:'从这里开始一份新记录',pinned:false,state:'empty',draft:'',attached:false,messages:[],sample:false,processOpen:false};
    conversations.unshift(c); selectConversation(c.id,false); $('#session-search').value = ''; renderNav(); $('#draft').focus(); motion?.cue('new',$('#thread .empty-page')); announce('已新建本地示例会话');
  }
  function simulateResponse(retry) {
    var c = current(), text = c.draft.trim();
    if (!retry && !text) return;
    cancelTimer(c); var serial = c.responseSerial, id = c.id;
    if (!retry) {
      c.messages.push({question:text,answer:null,attached:c.attached}); c.draft = ''; c.attached = false;
      if (c.title === '新会话') c.title = text.length > 16 ? text.slice(0, 16) + '…' : text;
      c.excerpt = '本页中的连续对话示例';
    }
    c.state = 'running'; motion?.cancelEcho(); renderThread(); renderNav();
    motion?.cue('send',Array.from(document.querySelectorAll('#thread .user-message')).at(-1));
    motion?.cue('working',$('#thread .running-line') || $('#thread .process'));
    requestAnimationFrame(function () { $('#conversation-scroll').scrollTop = $('#conversation-scroll').scrollHeight; });
    c.pendingTimer = setTimeout(function () {
      var target = conversations.find(function (item) { return item.id === id; });
      if (!target || serial !== target.responseSerial) return;
      target.state = 'complete';
      var last = target.messages[target.messages.length - 1];
      if (last && !last.answer) last.answer = '我把这条补充接在这页后面。接下来先确认资料来源，再把结论和仍需要确认的部分分开整理。';
      if (currentId === id) {
        var view = $('#conversation-scroll'), wasAtEnd = view.scrollHeight - view.scrollTop - view.clientHeight < 90, beforeTop = view.scrollTop;
        renderThread();
        if (wasAtEnd) view.scrollTop = view.scrollHeight; else view.scrollTop = beforeTop;
        target.unreadReply = !wasAtEnd; updateLatest();
        acknowledgeCompletion(id); announce('本地示例回复完成');
      }
      if (currentId !== id) target.unreadReply = true;
      renderNav(); target.pendingTimer = null;
    }, 900);
  }
  function stopResponse() {
    cancelTimer(); motion?.cancelVisuals(); motion?.cancelEcho(); var c = current(); c.state = 'stopped';
    var last = c.messages[c.messages.length - 1]; if (last && !last.answer) { last.answer = '这轮本地示例已停止，输入记录保留在本页。'; last.stopped = true; }
    renderThread(); announce('本轮示例已停止');
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
    $('#theme-toggle').setAttribute('aria-label', value === 'light' ? '切换夜间预览' : '切换暖白预览'); $('#theme-toggle').title = $('#theme-toggle').getAttribute('aria-label');
    document.querySelectorAll('[data-theme-choice]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.themeChoice === value); });
  }
  function setDetails(value) {
    details = value; document.body.dataset.details = String(value);
    $('#details-toggle').setAttribute('aria-pressed', value); $('#details-toggle').textContent = value ? '细节开启' : '基础呈现';
    $('#appearance-details').checked = value;
  }
  function switchView(value) {
    closeMenu(false); activeView = value;
    ['workspace','icons','notes'].forEach(function (name) { $('#' + name + '-view').hidden = value !== name; });
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
    if (node.dataset.resolve) { current().resolved = node.dataset.resolve; current().state = 'complete'; renderThread(); announce('已确认：' + node.dataset.resolve); return; }
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
    if (action === 'retry') simulateResponse(true);
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
      if (motion?.hasPerformance()) { event.preventDefault(); motion.cancelVisuals(); announce('已跳过演出，原状态与输入保留'); return; }
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
  motion = window.createArchiveMotion({preferences:function () { return {uiMotion:uiMotion,petEcho:petEcho,reduced:reduced}; },surface:$('#workspace-view'),idleVideo:$('#companion-idle'),reactVideo:$('#companion-react'),fallback:$('#companion-static'),icon:icon,announce:announce});
  renderNav(); renderThread(); renderSources(); renderIcons(); motion.sync();
  document.body.dataset.reduced = String(reduced); $('#appearance-reduced').checked = reduced;
  requestAnimationFrame(function () { motion.previewTheme(false); });
})();
