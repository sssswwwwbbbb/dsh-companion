/* Local, interruptible motion for the design prototype. No runtime integration. */
window.createArchiveMotion = function (options) {
  'use strict';
  var running = new Set();
  var query = matchMedia('(prefers-reduced-motion: reduce)');
  var idle = options.idleVideo, react = options.reactVideo, fallback = options.fallback;
  var echoEpoch = 0, echoing = false;
  var ease = 'cubic-bezier(0.16,1,0.3,1)';
  function reduced() { return options.preferences().reduced || query.matches; }
  function visible() { return document.visibilityState === 'visible' && !options.surface.hidden; }
  function allowed() { return options.preferences().uiMotion && !reduced() && visible(); }
  function animate(element, frames, settings, name) {
    if (!element || !allowed() || typeof element.animate !== 'function') return;
    var animation = element.animate(frames, Object.assign({duration:180,easing:ease},settings));
    animation.id = 'archive-' + name;
    running.add(animation);
    animation.finished.then(function () { running.delete(animation); }, function () { running.delete(animation); });
    return animation;
  }
  function cancelVisuals() {
    running.forEach(function (animation) { animation.cancel(); }); running.clear();
  }
  function cue(name, element) {
    if (!element || !allowed()) return;
    if (name === 'new') return animate(element,[{opacity:.78,transform:'translateY(6px)',clipPath:'inset(0 0 9px 0)'},{opacity:1,transform:'translateY(0)',clipPath:'inset(0 0 0 0)'}],{duration:220},name);
    if (name === 'index') return animate(element,[{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:160},name);
    if (name === 'switch') return animate(element,[{opacity:.82,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:160},name);
    if (name === 'source') return animate(element,[{opacity:.8,transform:'translateX(7px)',clipPath:'inset(0 0 0 7px)'},{opacity:1,transform:'translateX(0)',clipPath:'inset(0 0 0 0)'}],{duration:220},name);
    if (name === 'attachment') return animate(element,[{clipPath:'inset(0 80% 0 0)',opacity:.8},{clipPath:'inset(0 0 0 0)',opacity:1}],{duration:160},name);
    if (name === 'send') return animate(element,[{opacity:.8,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180},name);
    if (name === 'notice') return animate(element,[{opacity:.78},{opacity:1}],{duration:160},name);
    if (name === 'complete') {
      var seal = element.querySelector('.receipt-seal');
      animate(seal,[{opacity:.4,transform:'scale(1.14) rotate(-7deg)'},{opacity:1,transform:'scale(1) rotate(0deg)'}],{duration:260},'receipt');
      var path = seal?.querySelector('path');
      animate(path,[{strokeDasharray:'24',strokeDashoffset:24},{strokeDasharray:'24',strokeDashoffset:0}],{duration:240},'receipt-ink');
      return;
    }
    if (name === 'working') {
      var old = element.querySelector('.ink-pass'); if (old) old.remove();
      var ink = document.createElement('span'); ink.className = 'ink-pass'; ink.setAttribute('aria-hidden','true'); element.append(ink);
      var pass = animate(ink,[{transform:'translateX(-100%)',opacity:.4},{transform:'translateX(100%)',opacity:.6}],{duration:950,iterations:2,easing:'linear'},'ink-pass');
      if (pass) pass.finished.then(function () { ink.remove(); },function () { ink.remove(); }); else ink.remove();
    }
  }
  function rowPositions() {
    return new Map(Array.from(document.querySelectorAll('#sidebar .session-row')).map(function (row) { return [row.querySelector('[data-session]').dataset.session,row.getBoundingClientRect().top]; }));
  }
  function settleRows(before) {
    if (!allowed()) return;
    document.querySelectorAll('#sidebar .session-row').forEach(function (row) {
      var id = row.querySelector('[data-session]').dataset.session, top = before.get(id);
      if (top === undefined) return;
      var delta = top - row.getBoundingClientRect().top;
      if (Math.abs(delta) > .5 && Math.abs(delta) < 400) animate(row,[{transform:'translateY(' + delta + 'px)'},{transform:'translateY(0)'}],{duration:180},'index-settle');
    });
  }
  function showIdleFrame() {
    react.hidden = true; idle.hidden = idle.readyState < 2; fallback.hidden = !idle.hidden;
  }
  function playIdle() {
    if (echoing) return;
    showIdleFrame(); idle.loop = true;
    if (reduced() || !visible()) { idle.pause(); if (idle.readyState >= 2) idle.currentTime = 0; return; }
    var epoch = echoEpoch;
    idle.play().catch(function () { if (epoch === echoEpoch) { idle.hidden = true; fallback.hidden = false; } });
  }
  function cancelEcho() {
    echoEpoch++; echoing = false; react.pause(); react.hidden = true;
    if (react.readyState >= 2) react.currentTime = 0;
    playIdle();
  }
  function respondOnce() {
    if (!options.preferences().petEcho || reduced() || !visible()) return;
    echoEpoch++; var epoch = echoEpoch; echoing = true;
    react.loop = false; react.currentTime = 0;
    react.play().then(function () {
      if (epoch !== echoEpoch) return;
      idle.pause(); idle.hidden = true; fallback.hidden = true; react.hidden = false;
    }).catch(function () { if (epoch === echoEpoch) cancelEcho(); });
    react.onended = function () { if (epoch === echoEpoch) cancelEcho(); };
  }
  function sync() {
    if (!allowed()) cancelVisuals();
    if (reduced() || !visible() || (!options.preferences().petEcho && echoing)) cancelEcho();
    else if (!echoing) playIdle();
  }
  idle.muted = true; react.muted = true;
  idle.addEventListener('loadeddata',function () { if (!echoing) playIdle(); });
  idle.addEventListener('error',function () { idle.hidden = true; fallback.hidden = false; });
  react.addEventListener('error',cancelEcho);
  query.addEventListener('change',sync);
  document.addEventListener('visibilitychange',function () {
    if (!visible()) { cancelVisuals(); cancelEcho(); } else sync();
  });
  return {cue:cue,rowPositions:rowPositions,settleRows:settleRows,cancelVisuals:cancelVisuals,cancelEcho:cancelEcho,respondOnce:respondOnce,sync:sync};
};
