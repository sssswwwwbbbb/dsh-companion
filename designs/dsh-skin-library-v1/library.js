/* Prototype-local state only. No DSH bridge, requests, package parsing or model calls. */
(() => {
  'use strict';
  const STORAGE_KEY = 'dsh-skin-library-v1-demo';
  const skinId = 'archive-warm-whale';
  const defaults = {
    backgroundOpacity: 0.04, size: 100, smartEnabled: true,
    persona: '你是温柔又有点俏皮的鲸鱼娘，陪伴用户工作。回应自然简短，结合刚才的互动选择合适的动作，也可以安静陪伴。',
    modelSelection: {mode: 'current'}, historyRounds: 10, allowSpeech: true, allowActions: true
  };
  const initial = () => ({installed: true, selected: null, stopped: false, view: 'library', section: 'common', prefs: {...defaults}});
  let state = initial();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved.installed === 'boolean') {
      state = {...initial(), ...saved, prefs: {...defaults, ...saved.prefs}};
      if (!state.installed) state.selected = null;
      if (state.selected !== skinId) state.selected = null;
      if (!state.selected) state.view = 'library';
    }
  } catch { /* The current in-memory preview still works. */ }
  const $ = id => document.getElementById(id);
  let toastTimer;
  function notify(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2800);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* In-memory only. */ }
  }
  function update() { save(); render(); }
  const isChanged = key => JSON.stringify(state.prefs[key]) !== JSON.stringify(defaults[key]);
  function render() {
    const selected = state.selected === skinId;
    const settings = state.view === 'settings' && selected;
    $('library-view').hidden = settings;
    $('settings-view').hidden = !settings;
    $('settings-tabs').hidden = !settings;
    $('install-local').hidden = settings;
    $('settings-state').hidden = !settings;
    $('reset-preferences').hidden = !settings;
    $('page-eyebrow').textContent = settings ? 'APPEARANCE / CURRENT SKIN' : 'LIBRARY / LOCAL SKINS';
    $('page-title').textContent = settings ? '按你的习惯，刚刚好。' : '本地皮肤库';
    $('page-subtitle').textContent = settings ? '档案暖白 · 鲸鱼娘。只调整这套已提供的偏好。' : '装好一套，点一下就换上。偏好按每套皮肤保留。';
    $('nav-library').classList.toggle('selected', !settings);
    $('nav-settings').classList.toggle('selected', settings);
    $('nav-library').toggleAttribute('aria-current', !settings);
    $('nav-settings').toggleAttribute('aria-current', settings);
    if (!settings) $('nav-library').setAttribute('aria-current', 'page');
    else $('nav-settings').setAttribute('aria-current', 'page');
    $('nav-settings').disabled = !selected;
    $('nav-settings').title = selected ? '调整当前这套皮肤的参数' : '先选择一套已安装皮肤';
    $('open-current-settings').disabled = !selected;
    $('stop-effects').disabled = !selected;
    $('stop-label').textContent = state.stopped ? '恢复效果' : '停止效果';
    $('stop-effects').querySelector('path').setAttribute('d', state.stopped ? 'm8 4 12 8-12 8Z' : 'M8 5v14M16 5v14');
    $('current-thumb').classList.toggle('has-pet', selected);
    $('current-name').textContent = selected ? '档案暖白 · 鲸鱼娘' : 'DSH 默认外观';
    $('current-description').textContent = selected ? (state.stopped ? '效果已停止，选择与本套参数仍保留。' : '主题 · 桌宠 · 开场，正在使用同一套日常。') : '从已安装的皮肤中，选一套作为你的日常。';
    $('current-status').textContent = selected ? (state.stopped ? '效果已停止' : '正在使用 · 0.7.1') : '尚未选择皮肤';
    $('current-status').classList.toggle('orange', selected);
    $('installed-count').textContent = state.installed ? '1 套' : '0 套';
    $('archive-card').hidden = !state.installed;
    $('empty-library').hidden = state.installed;
    $('archive-card').setAttribute('aria-pressed', String(selected));
    $('archive-card').setAttribute('aria-label', selected && !state.stopped ? '档案暖白·鲸鱼娘，当前使用' : '使用档案暖白·鲸鱼娘');
    $('card-current').hidden = !selected;
    $('card-current').innerHTML = '<span aria-hidden="true">✓</span> ' + (state.stopped ? '当前选择 · 已停止' : '当前使用');
    $('card-action').textContent = selected ? (state.stopped ? '点击恢复 ↗' : '使用中 ✓') : '点击使用 ↗';
    const customized = Object.keys(defaults).some(isChanged);
    $('settings-state').textContent = customized ? '已自定义' : '本套默认';
    $('settings-state').classList.toggle('orange', customized);
    $('tab-common').setAttribute('aria-selected', String(state.section === 'common'));
    $('tab-more').setAttribute('aria-selected', String(state.section === 'more'));
    $('common-panel').hidden = state.section !== 'common';
    $('more-panel').hidden = state.section !== 'more';
    document.querySelectorAll('[data-tag]').forEach(tag => {
      const changed = isChanged(tag.dataset.tag);
      tag.textContent = changed ? '已自定义' : '默认';
      tag.classList.toggle('orange', changed);
    });
    document.querySelectorAll('[data-field]').forEach(control => {
      const value = state.prefs[control.dataset.field];
      if (control.getAttribute('role') === 'switch') {
        control.setAttribute('aria-checked', String(value));
        control.classList.toggle('on', value);
      } else if (document.activeElement !== control) control.value = value;
    });
    document.querySelectorAll('[data-output]').forEach(output => {
      const key = output.dataset.output;
      output.textContent = key === 'backgroundOpacity' ? Math.round(state.prefs[key] * 100) + '%' : key === 'size' ? state.prefs[key] + '%' : state.prefs[key];
    });
    $('footer-summary').textContent = settings ? '档案暖白 · 鲸鱼娘 · 0.7.1 · ' + (customized ? '已自定义' : '本套默认') : (state.installed ? '1 套已安装' : '0 套已安装') + ' · ' + (selected ? '当前：档案暖白 · 鲸鱼娘' : '尚未选择皮肤');
    $('footer-note').textContent = settings ? '覆写按本套保留；重置恢复本套默认。' : '选择在皮肤库，参数在本套设置。';
  }
  function navigate(view) {
    if (view === 'settings' && !state.selected) return;
    state.view = view;
    update();
    $('page-scroll').scrollTop = 0;
  }
  $('archive-card').addEventListener('click', () => {
    if (!state.installed) return;
    const already = state.selected === skinId && !state.stopped;
    state.selected = skinId;
    state.stopped = false;
    update();
    notify(already ? '当前正在使用这套皮肤，可进入本套设置调整偏好。' : '已切换为档案暖白 · 鲸鱼娘。');
  });
  $('nav-library').addEventListener('click', () => navigate('library'));
  $('back-library').addEventListener('click', () => navigate('library'));
  $('nav-settings').addEventListener('click', () => navigate('settings'));
  $('open-current-settings').addEventListener('click', () => navigate('settings'));
  ['common', 'more'].forEach(section => $('tab-' + section).addEventListener('click', () => {
    state.section = section;
    update();
    $('page-scroll').scrollTop = 0;
  }));
  document.querySelectorAll('[data-field]').forEach(control => {
    const field = control.dataset.field;
    if (control.getAttribute('role') === 'switch') control.addEventListener('click', () => { state.prefs[field] = !state.prefs[field]; update(); });
    else control.addEventListener(control.tagName === 'TEXTAREA' ? 'change' : 'input', () => { state.prefs[field] = control.type === 'range' ? Number(control.value) : control.value; update(); });
  });
  $('reset-preferences').addEventListener('click', () => {
    state.prefs = {...defaults};
    document.activeElement.blur();
    update();
    notify('已恢复本套默认，当前选择与停止意图保留。');
  });
  $('stop-effects').addEventListener('click', () => { state.stopped = !state.stopped; update(); notify(state.stopped ? '效果已停止，本套选择与参数已保留。' : '已恢复当前皮肤。'); });
  const openInstaller = () => {
    $('package-preview').hidden = true;
    $('confirm-install').disabled = true;
    $('local-file').value = '';
    $('install-dialog').showModal();
  };
  $('install-local').addEventListener('click', openInstaller);
  $('empty-install').addEventListener('click', openInstaller);
  function fillPackage(filename) {
    $('package-filename').textContent = filename;
    $('package-preview').hidden = false;
    $('confirm-install').disabled = false;
  }
  $('fill-demo').addEventListener('click', () => fillPackage('档案暖白 · 本地演示包'));
  $('local-file').addEventListener('change', event => {
    if (event.target.files[0]) fillPackage(event.target.files[0].name + '（仅用演示信息预演，不读取包内容）');
  });
  $('confirm-install').addEventListener('click', () => {
    const duplicate = state.installed;
    state.installed = true;
    state.view = 'library';
    update();
    $('install-dialog').close();
    notify(duplicate ? '已存在同一版本，原选择与本套参数保留。' : '皮肤已加入库，点击卡片即可使用。');
  });
  $('nav-license').addEventListener('click', () => $('license-dialog').showModal());
  $('demo-reset').addEventListener('click', () => {
    state = initial(); update(); $('page-scroll').scrollTop = 0;
    notify('演示已重置：一套已安装，尚未选择使用。');
  });
  $('demo-install').addEventListener('click', () => {
    state = initial(); state.installed = false; update();
    $('page-scroll').scrollTop = 0; openInstaller(); fillPackage('档案暖白 · 本地演示包');
  });
  render();
})();
