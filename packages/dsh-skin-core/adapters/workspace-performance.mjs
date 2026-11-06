/* An authored theme-apply preview, not a second startup or a task simulator. */
export function createArchivePerformance(options) {
  'use strict';
  var query = matchMedia('(prefers-reduced-motion: reduce)');
  var animations = new Set(), timers = new Set(), epoch = 0;
  var ease = 'cubic-bezier(0.16,1,0.3,1)', active = false, resultScrollTop = 0;
  var stage = document.createElement('section');
  stage.id = 'archive-stage'; stage.className = 'archive-stage dsh-r2-scene'; stage.hidden = true;
  stage.setAttribute('aria-label','档案暖白主题演出');
  stage.innerHTML = '<button class="stage-skip" type="button">跳过演出 <kbd>Esc</kbd></button><div class="stage-sheets" aria-hidden="true"><div class="stage-backleaf"></div><div class="stage-midleaf"></div><div class="archive-book"><div class="book-spine"></div><div class="inner-lettering"><h2>把灵感，\n收进这一页。</h2><p>资料、想法和下一步，<br>在这里慢慢整理。</p><p class="inner-voice">这页先放稳，我在这里。</p><div class="inner-index"><span>灵感</span><span>资料</span><span>下一步</span></div></div><div class="stage-role"><div class="stage-static"><img src="' + options.assets.poster + '" alt=""></div><video muted playsinline preload="auto" src="' + options.assets.react + '" hidden></video></div><div class="archive-seal">已开卷</div><div class="stage-scan"></div><div class="book-footer"><span>档案暖白 · 鲸鱼娘</span>' + options.icon('companion') + '</div></div><div class="archive-cover"><div class="book-spine"></div><span class="cover-tab"></span><div class="cover-lettering"><h2>档案暖白</h2><div class="cover-rule"></div><p>一起，翻开新的一页。</p>' + options.icon('companion') + '</div><div class="cover-bottom"><span>鲸鱼娘 · 工作与陪伴</span><span>开卷</span></div></div></div>';
  var result = document.createElement('section');
  result.id = 'archive-result'; result.className = 'archive-result dsh-r2-scene'; result.hidden = true;
  result.setAttribute('aria-label','本轮新回复完成反馈');
  result.innerHTML = '<div class="result-paper"><h3>这一页，整理好了。</h3><p>本轮回复完成 · 可以继续往下写</p></div><img class="result-static" alt="" src="' + options.assets.poster + '"><video class="result-role" muted playsinline preload="auto" src="' + options.assets.react + '" aria-hidden="true" hidden></video><span class="result-seal" aria-hidden="true">' + options.icon('check') + '</span><button class="result-skip" type="button" aria-label="跳过本轮完成演出">' + options.icon('close') + '</button>';
  document.body.append(stage,result);
  var resultStatic=result.querySelector('.result-static'),abort=new AbortController();
  var role = stage.querySelector('video'), staticRole = stage.querySelector('.stage-static'), resultRole = result.querySelector('video');
  function visible() { return options.isVisible(); }
  function reduced() { return options.preferences().reduced || query.matches; }
  function allowed() { return options.preferences().uiMotion && !reduced() && visible(); }
  function animate(element, frames, settings, id) {
    if (!element || !allowed()) return;
    var a = element.animate(frames,Object.assign({duration:450,easing:ease,fill:'both'},settings));
    a.id = 'archive-performance-' + id; animations.add(a);
    // Finished fill effects are retained until the scene is canceled, then removed together.
    a.finished.then(function () {},function () { animations.delete(a); });
    return a;
  }
  function later(fn, delay) { var serial = epoch, t = setTimeout(function () { timers.delete(t); if (serial === epoch) fn(); },delay); timers.add(t); }
  function resetVideo(video) { video.pause(); video.hidden = true; if (video.readyState >= 2) video.currentTime = 0; }
  function cancel() {
    epoch++; active = false; timers.forEach(clearTimeout); timers.clear();
    animations.forEach(function (a) { a.cancel(); }); animations.clear();
    stage.hidden = true; result.hidden = true; stage.classList.remove('is-static');
    resetVideo(role); resetVideo(resultRole); staticRole.hidden = false; resultStatic.hidden=false;
    document.querySelectorAll('.archive-transfer').forEach(function (n) { n.remove(); });
  }
  function playRole(video, fallback) {
    if (!options.preferences().petEcho || reduced() || !visible()) return;
    var serial = epoch; video.currentTime = 0; video.loop = false; video.muted = true;
    video.play().then(function () { if (serial !== epoch) { resetVideo(video); return; } video.hidden = false; if (fallback) fallback.hidden = true; options.observe?.('role-playing',{scene:video===role?'opening':'completion',width:video.videoWidth,height:video.videoHeight,box:video.getBoundingClientRect().toJSON(),dpr:devicePixelRatio}); }).catch(function () { if (fallback) fallback.hidden = false; });
  }
  function bounds() { return options.viewport().getBoundingClientRect(); }
  function place() { var r = bounds(); Object.assign(stage.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}); }
  function preview(explicit) {
    cancel(); if (!visible()) return;
    if (!allowed() && !explicit) return;
    place(); stage.hidden = false; active = true;
    if (!allowed()) { stage.classList.add('is-static'); stage.querySelector('.archive-seal').textContent = '动态已减少'; options.announce('主题静态预览；动态已按设置减少，输入和原状态保留'); return; }
    stage.querySelector('.archive-seal').textContent = '已开卷';
    var sheets = stage.querySelector('.stage-sheets'), cover = stage.querySelector('.archive-cover');
    animate(sheets,[{transform:'translateY(30px) rotate(-3deg) scale(.94)',opacity:0},{transform:'translateY(0) rotate(0) scale(1)',opacity:1}],{duration:560},'arrive');
    animate(cover,[{transform:'rotateY(0deg)',filter:'brightness(1)'},{transform:'rotateY(-116deg)',filter:'brightness(.86)'}],{delay:520,duration:1000,easing:'cubic-bezier(.65,0,.18,1)'},'open-cover');
    animate(stage.querySelector('.stage-backleaf'),[{transform:'rotate(0) translate(0,0)'},{transform:'rotate(3deg) translate(7px,7px)'}],{delay:520,duration:850},'fan-back');
    animate(stage.querySelector('.stage-midleaf'),[{transform:'rotate(0) translate(0,0)'},{transform:'rotate(-2deg) translate(-5px,3px)'}],{delay:640,duration:850},'fan-mid');
    animate(stage.querySelector('.inner-lettering'),[{clipPath:'inset(0 100% 0 0)',transform:'translateX(-13px)'},{clipPath:'inset(0 0 0 0)',transform:'translateX(0)'}],{delay:1050,duration:720},'ink-lettering');
    animate(stage.querySelector('.stage-role'),[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{delay:1070,duration:650},'character');
    later(function () { playRole(role,staticRole); },1150);
    animate(stage.querySelector('.stage-scan'),[{transform:'translateY(0)',opacity:0},{transform:'translateY(20px)',opacity:.8,offset:.12},{transform:'translateY(292px)',opacity:.8,offset:.88},{transform:'translateY(316px)',opacity:0}],{delay:1660,duration:850,easing:'linear'},'silver-scan');
    animate(stage.querySelector('.archive-seal'),[{opacity:0,transform:'translateY(-17px) rotate(-15deg) scale(1.3)'},{opacity:1,transform:'translateY(0) rotate(-7deg) scale(1)'}],{delay:2460,duration:400,easing:'cubic-bezier(.22,.8,.3,1)'},'opening-seal');
    later(function () {
      var r = sheets.getBoundingClientRect(), target = (options.anchor()||options.viewport()).getBoundingClientRect();
      var dx = target.left + target.width/2 - r.left - r.width/2, dy = target.top + target.height/2 - r.top - r.height/2;
      var landing = animate(sheets,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(.075)',opacity:0}],{duration:720,easing:'cubic-bezier(.7,0,.2,1)'},'return-to-companion');
      if (landing) landing.finished.then(function () { if (stage.hidden) return; cancel(); options.onLand?.(); options.announce('开卷演出结束，鲸鱼娘回到导航陪伴位'); },function () {});
    },3180);
  }
  function complete(receipt) {
    if (!receipt || !allowed() || !stage.hidden) return false;
    var area = bounds(), r = receipt.getBoundingClientRect();
    // Reading an older reply must never be dragged to the new result.
    if (r.top < area.top || r.bottom > area.bottom + 1) return false;
    cancel(); active = true;
    resultScrollTop = options.viewport().scrollTop;
    var width = Math.min(368,area.width-30);
    Object.assign(result.style,{width:width+'px',left:(area.right-width-15)+'px',top:Math.max(area.top+10,area.bottom-169)+'px'});
    result.hidden = false;
    animate(result.querySelector('.result-paper'),[{clipPath:'inset(0 0 100% 0)',transform:'translateY(15px)'},{clipPath:'inset(0 0 0 0)',transform:'translateY(0)'}],{duration:510},'result-unfold');
    animate(resultRole,[{transform:'translateY(15px)',opacity:0},{transform:'translateY(0)',opacity:1}],{delay:130,duration:420},'result-character');
    playRole(resultRole,resultStatic);
    animate(result.querySelector('.result-seal'),[{transform:'scale(1.8) rotate(-22deg)',opacity:0},{transform:'scale(1) rotate(-7deg)',opacity:1}],{delay:620,duration:360},'result-seal');
    later(function () { var a = animate(result,[{transform:'translateY(0)',opacity:1},{transform:'translateY(8px)',opacity:0}],{duration:380},'result-settle'); if (a) a.finished.then(cancel,function () {}); },2000);
    return true;
  }
  function transfer(from, to, label) {
    if (!allowed() || !from || !to) return;
    var target = to.getBoundingClientRect();
    var tag = document.createElement('span'); tag.className = 'archive-transfer'; tag.setAttribute('aria-hidden','true'); tag.textContent = label || '引';
    tag.style.left=(from.left+from.width/2-15)+'px'; tag.style.top=(from.top+from.height/2-18)+'px'; document.body.append(tag);
    var dx=target.left+18-from.left-from.width/2,dy=target.top+16-from.top-from.height/2;
    var a=animate(tag,[{transform:'translate(0,0) rotate(-8deg) scale(.6)',opacity:.9},{transform:'translate('+(dx*.58)+'px,'+(dy*.58-24)+'px) rotate(2deg) scale(1)',opacity:1,offset:.58},{transform:'translate('+dx+'px,'+dy+'px) rotate(0) scale(.6)',opacity:0}],{duration:620},'citation-transfer');
    if(a)a.finished.then(function(){tag.remove();animations.delete(a);a.cancel();},function(){tag.remove();});else tag.remove();
  }
  function sync() { if (!allowed() || !options.preferences().petEcho) { if (!allowed()) cancel(); else { resetVideo(role); resetVideo(resultRole); staticRole.hidden=false; resultStatic.hidden=false; } } }
  stage.querySelector('button').addEventListener('click',function () { cancel(); options.announce('已跳过演出，原状态与输入保留'); });
  result.querySelector('button').addEventListener('click',cancel);
  [role,resultRole].forEach(function (video) { video.addEventListener('error',function () { video.hidden=true; if(video===role)staticRole.hidden=false; else resultStatic.hidden=false; }); });
  query.addEventListener('change',sync,{signal:abort.signal});
  document.addEventListener('visibilitychange',function(){if(!visible())cancel();},{signal:abort.signal});
  document.addEventListener('focusin',function(e){if(e.target.closest('[data-composer-input]')&&active)cancel();},{signal:abort.signal});
  document.addEventListener('pointerdown',function(e){if(e.target.closest('[data-composer-input]')&&active)cancel();},{signal:abort.signal});
  document.addEventListener('wheel',function(e){if(active&&options.viewport()?.contains(e.target))cancel();},{capture:true,passive:true,signal:abort.signal});
  document.addEventListener('scroll',function(e){if(!result.hidden&&e.target===options.viewport()&&Math.abs(e.target.scrollTop-resultScrollTop)>1)cancel();},{capture:true,passive:true,signal:abort.signal});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&active){cancel();options.announce('已跳过演出，原状态与输入保留');}},{signal:abort.signal});
  addEventListener('resize',cancel,{signal:abort.signal});
  return {preview,complete,transfer,cancel,sync,isActive:()=>active,dispose(){cancel();abort.abort();stage.remove();result.remove();}};
}
