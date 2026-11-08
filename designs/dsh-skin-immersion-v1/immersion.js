/* All input is explicit design simulation. No host APIs, models or external requests. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('sample-root');
  const media = $('pet-video');
  media.autoplay = false;
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const initial = () => ({phase:'idle',mode:'standard',feedback:true,motion:'system',petEcho:true,modeDetails:true});
  let state = initial(), reactHandled = false, mediaKey = '', mediaGeneration = 0, toastTimer;
  const phases = {
    idle: {label:'待机',note:'纸面安静，信息在原处。',work:'准备好后，我会先核对资料，再把结论与待确认项分开整理。',pet:'这页先放稳，我在这里。'},
    running: {label:'执行中',note:'仅状态位有轻微动静。',work:'正在整理这份演示摘要。依据与未确认项会分开列出，正文保持稳定。',pet:'你忙你的，我安静陪着。'},
    done: {label:'已完成',note:'一次确认，随后归于安静。',work:'这份演示摘要已整理好。已确认内容与后续建议分别保留在这一页。',pet:'这一页收好了。'},
    attention: {label:'需你处理',note:'等待明确解除，不自动消失。',work:'这份演示摘要还缺少时间范围。请先确认范围，再继续整理。',pet:'有一项需要你看看，我先等着。'}
  };
  const modes = {
    standard:{label:'标准',description:'标准：稳定纸面，保留完整状态。'},
    ptc:{label:'PTC',description:'PTC：以细括号与短刻度强调过程边界。'},
    minimal:{label:'极简',description:'极简：去掉纸面装饰，保留状态与操作。'},
    creative:{label:'创造',description:'创造：银蓝页角与环记，留住同一身份。'}
  };
  const reduced = () => state.motion === 'reduced' || systemReduced.matches;
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }
  function syncPet() {
    const frozen = state.phase === 'attention' || reduced();
    if (!state.petEcho || frozen) reactHandled = state.phase === 'done' || reactHandled;
    const action = state.phase === 'done' && !reactHandled && !frozen ? 'react' : 'idle';
    const nextKey = state.petEcho ? action + ':' + frozen : 'off';
    $('pet-disabled').hidden = state.petEcho;
    $('pet-bubble').hidden = !state.petEcho;
    if (nextKey === mediaKey) return;
    mediaKey = nextKey;
    const generation = ++mediaGeneration;
    media.pause();
    $('pet-reference').hidden = true;
    media.hidden = !state.petEcho;
    if (!state.petEcho) { $('pet-resource').textContent = '呼应关闭 · 页面状态保留'; return; }
    const ready = () => {
      if (generation !== mediaGeneration) return;
      media.hidden = false;
      if (frozen) { media.currentTime = 0; media.pause(); }
      else void media.play().catch(fallback);
    };
    const fallback = () => {
      if (generation !== mediaGeneration) return;
      media.hidden = true; $('pet-reference').hidden = false;
      $('pet-resource').textContent = '静态形象参考 · 媒体暂不可预览';
    };
    media.loop = action === 'idle' && !frozen;
    media.muted = true;
    media.setAttribute('aria-label', action === 'react' ? '鲸鱼娘既有回应资源' : frozen ? '鲸鱼娘静态待机' : '鲸鱼娘既有待机资源');
    media.onloadeddata = ready;
    media.onerror = fallback;
    media.onended = () => {
      if (generation === mediaGeneration && action === 'react') { reactHandled = true; syncPet(); }
    };
    const source = 'assets/' + (action === 'react' ? 'react-a2.webm' : 'idle-a2.webm');
    if (media.getAttribute('src') !== source) { media.src = source; media.load(); }
    else if (media.readyState >= 2) ready();
    else media.load();
    $('pet-resource').textContent = frozen ? '既有 idle · 静态保留' : action === 'react' ? '既有 react · 一次回应' : '既有 idle · 待机';
  }
  function render() {
    const phase = phases[state.phase], mode = modes[state.mode];
    root.dataset.phase = state.phase; root.dataset.mode = state.mode;
    root.classList.toggle('feedback-off', !state.feedback);
    root.classList.toggle('motion-reduced', reduced());
    root.classList.toggle('mode-details-off', !state.modeDetails);
    $('state-label').textContent = phase.label;
    $('state-side-note').textContent = phase.note;
    $('assistant-copy').textContent = phase.work;
    $('pet-bubble').textContent = phase.pet;
    $('mode-name').textContent = mode.label;
    $('mode-description').textContent = state.modeDetails ? mode.description : mode.label + '：模式装饰已关闭，原状态保留。';
    $('motion-description').textContent = reduced() ? '减少动态 · 静态保留' : '轻动效跟随系统';
    $('attention-notice').hidden = state.phase !== 'attention';
    $('state-hint').textContent = state.phase === 'attention' ? '先在预览区“模拟已处理”，再继续。' : '手动输入，不代表真实任务结果。';
    document.querySelectorAll('[data-phase].button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.phase === state.phase));
      button.disabled = state.phase === 'attention' && button.dataset.phase !== 'attention';
    });
    document.querySelectorAll('.mode-controls [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    for (const [id,property] of [['feedback-switch','feedback'],['echo-switch','petEcho'],['mode-switch','modeDetails']]) {
      $(id).setAttribute('aria-checked', String(state[property])); $(id).classList.toggle('on', state[property]);
    }
    $('motion-select').value = state.motion;
    syncPet();
  }
  function setPhase(phase) {
    if (state.phase === 'attention' && phase !== 'idle') return;
    if (state.phase !== phase) { state.phase = phase; reactHandled = false; }
    render();
  }
  document.querySelectorAll('[data-phase].button').forEach(button => button.addEventListener('click', () => setPhase(button.dataset.phase)));
  document.querySelectorAll('.mode-controls [data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; render(); }));
  $('resolve-attention').addEventListener('click', () => { setPhase('idle'); toast('模拟事项已解除，页面与桌宠回到待机。'); });
  for (const [id,property] of [['feedback-switch','feedback'],['echo-switch','petEcho'],['mode-switch','modeDetails']]) $(id).addEventListener('click', () => { state[property] = !state[property]; render(); });
  $('motion-select').addEventListener('change', event => { state.motion = event.target.value; render(); });
  $('theme-entry').addEventListener('click', () => { $('workspace-preview').focus({preventScroll:true}); toast('已定位本套工作页预览。入口图标不替换 DSH 官方品牌。'); });
  $('reset-demo').addEventListener('click', () => { state = initial(); reactHandled = false; render(); toast('小样已重置；真实 DSH 与当前皮肤设置未改。'); });
  systemReduced.addEventListener('change', render);
  render();
})();
