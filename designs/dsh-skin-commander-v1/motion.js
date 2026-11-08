/* Local, interruptible motion for the design prototype. No runtime integration. */
window.createCommanderMotion = function (options) {
  'use strict';
  var running = new Set();
  var query = matchMedia('(prefers-reduced-motion: reduce)');
  var idle = options.idleVideo, react = options.reactVideo, fallback = options.fallback;
  var echoEpoch = 0, echoing = false, echoAnimation = null;
  var ease = 'cubic-bezier(0.16,1,0.3,1)';
  var scene = window.createCommanderPerformance({preferences:options.preferences,surface:options.surface,icon:options.icon,announce:options.announce,onLand:respondOnce});
  function reduced() { return options.preferences().reduced || query.matches; }
  function visible() { return document.visibilityState === 'visible' && !options.surface.hidden; }
  function allowed() { return options.preferences().uiMotion && !reduced() && visible(); }
  function animate(element, frames, settings, name) {
    if (!element || !allowed() || typeof element.animate !== 'function') return;
    var animation = element.animate(frames, Object.assign({duration:180,easing:ease},settings));
    animation.id = 'commander-' + name;
    running.add(animation);
    animation.finished.then(function () { running.delete(animation); }, function () { running.delete(animation); });
    return animation;
  }
  function cancelVisuals(restore) {
    cancelEcho();
    running.forEach(function (animation) { animation.cancel(); }); running.clear();
    scene.cancel(restore === true);
  }
  function cue(name, element) {
    if (!element || !allowed()) return;
    if (name === 'new') {
      animate(element,[{opacity:.7,transform:'translateY(10px)',clipPath:'inset(0 0 38% 0)'},{opacity:1,transform:'translateY(0)',clipPath:'inset(0 0 0 0)'}],{duration:520},name);
      return;
    }
    if (name === 'index') return animate(element,[{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:160},name);
    if (name === 'switch') return animate(element,[{opacity:.82,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:160},name);
    if (name === 'source') return animate(element,[{opacity:.8,transform:'translateX(7px)',clipPath:'inset(0 0 0 7px)'},{opacity:1,transform:'translateX(0)',clipPath:'inset(0 0 0 0)'}],{duration:220},name);
    if (name === 'attachment') return animate(element,[{clipPath:'inset(0 80% 0 0)',opacity:.8},{clipPath:'inset(0 0 0 0)',opacity:1}],{duration:160},name);
    if (name === 'send') return animate(element,[{opacity:.8,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180},name);
    if (name === 'notice') return animate(element,[{opacity:.78},{opacity:1}],{duration:160},name);
    if (name === 'complete') {
      scene.complete(element);
      var seal = element.querySelector('.receipt-seal');
      animate(seal,[{opacity:.4,transform:'scale(1.14)'},{opacity:1,transform:'scale(1)'}],{duration:260},'receipt');
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
  // The navigation portrait uses its authored crop. Full-body videos are not
  // cropped into this slot; their real motion stays in the desktop-pet module.
  function playIdle() { if(idle)idle.hidden=true; if(react)react.hidden=true; fallback.hidden=false; }
  function cancelEcho() {
    echoEpoch++; echoing=false;
    if (echoAnimation) { running.delete(echoAnimation); echoAnimation.cancel(); echoAnimation=null; }
    playIdle();
  }
  function respondOnce() {
    if (!options.preferences().petEcho || reduced() || !visible()) return;
    cancelEcho(); var epoch=echoEpoch;
    var ring=fallback.parentElement.querySelector('.portrait-registration');
    echoAnimation=animate(ring,[{opacity:.2,clipPath:'inset(0 48% 0 48%)'},{opacity:1,clipPath:'inset(0 0 0 0)'},{opacity:.4}],{duration:650},'companion-link');
    echoing=!!echoAnimation;
    if (echoAnimation) echoAnimation.finished.then(function(){if(epoch===echoEpoch){echoing=false;echoAnimation=null;}},function(){if(epoch===echoEpoch){echoing=false;echoAnimation=null;}});
  }
  function sync() {
    scene.sync();
    if (!allowed()) cancelVisuals();
    if (reduced() || !visible() || !options.preferences().petEcho) cancelEcho();
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
  function previewTheme(explicit) { cancelVisuals(); cancelEcho(); scene.preview(explicit !== false); }
  return {cue:cue,rowPositions:rowPositions,settleRows:settleRows,cancelVisuals:cancelVisuals,cancelEcho:cancelEcho,respondOnce:respondOnce,sync:sync,previewTheme:previewTheme,sourceTransfer:scene.transfer,hasPerformance:scene.isActive};
};
