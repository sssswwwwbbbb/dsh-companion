/* Existing preview/lifecycle seam, re-authored for the command-link theme. */
window.createCommanderSounds = function (options) {
  'use strict';var context,nodes=new Set();
  function cancel(){nodes.forEach(function(n){try{n.stop();}catch(_){}});nodes.clear();}
  function play(kind){
    if(!options.preferences().sound||document.hidden||(options.visible&&!options.visible()))return;
    var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    context=context||new Audio();context.resume().catch(function(){});
    var tones={send:[[660,0,.07]],complete:[[660,0,.07],[880,.10,.12]],attention:[[520,0,.12],[520,.20,.09]],error:[[310,0,.13],[240,.16,.15]]}[kind];if(!tones)return;
    tones.forEach(function(t){var o=context.createOscillator(),g=context.createGain(),at=context.currentTime+t[1];o.type='sine';o.frequency.value=t[0];g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.035,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+t[2]);o.connect(g);g.connect(context.destination);nodes.add(o);o.onended=function(){nodes.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+t[2]+.01);});
  }
  return {play:play,cancel:cancel};
};
window.createCommanderPerformance = function (options) {
  'use strict';
  var query=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set(),active=false,handingOff=false,opener;
  var base='../dsh-skin-assets-v3/review/startup-entrance-01-2026-11-05/';
  var stage=document.createElement('section');stage.className='commander-awakening';stage.hidden=true;stage.setAttribute('aria-label','机械姬苏醒演出');
  stage.innerHTML='<div class="commander-stage-controls"><span>过场与登场 · 有声候选</span><button type="button" class="commander-stage-skip">进入工作区 <kbd>Esc</kbd></button></div><video playsinline preload="none" src="'+base+'startup-entrance-01-with-sound.mp4" aria-label="科研设施过场、开舱登场、眼部唤醒与短报到"></video><div class="commander-still" hidden><img src="../dsh-skin-assets-v3/assets/prepared/portrait.png" alt="同一机械姬角色"><div><h2>指挥官，<br>我已就位。</h2><p>动态已减少，<br>工作区与输入已准备好。</p><button type="button" class="commander-report">播放报到语音</button></div></div>';
  document.body.append(stage);
  var film=stage.querySelector('video'),still=stage.querySelector('.commander-still'),voice=new Audio('../dsh-skin-assets-v3/review/machine-voice-2026-11-05/machine-report.mp3');voice.preload='none';
  function visible(){return !document.hidden&&!options.surface.hidden;}
  function reduced(){return options.preferences().reduced||query.matches;}
  function allowed(){return options.preferences().uiMotion&&!reduced()&&visible();}
  function reset(media){media.pause();if(media.readyState>=2)media.currentTime=0;}
  function cancel(restore){active=false;handingOff=false;reset(film);reset(voice);stage.hidden=true;animations.forEach(function(a){a.cancel();});animations.clear();document.querySelectorAll('.commander-transfer').forEach(function(n){n.remove();});if(restore&&opener?.isConnected)opener.focus({preventScroll:true});}
  function land(){if(!active)return;cancel(true);options.onLand?.();options.announce('机械姬已就位，进入当前实时工作区');}
  function showStill(){reset(film);film.hidden=true;still.hidden=false;}
  function preview(explicit){
    cancel();if(!explicit||!visible())return;opener=document.activeElement;stage.hidden=false;active=true;stage.querySelector('.commander-stage-skip').focus({preventScroll:true});
    film.hidden=!allowed();still.hidden=allowed();film.muted=!options.preferences().sound;film.volume=.72;
    if(allowed())film.play().catch(function(){if(active){showStill();options.announce('开场播放不可用，已回退同角色静态画面');}});
    options.announce(allowed()?'机械姬苏醒演出，可按Esc进入工作区':'已显示减少动态版本，可播放报到语音或进入工作区');
  }
  function complete(receipt){
    if(!receipt||!allowed()||active)return false;
    var a=receipt.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:340,easing:'cubic-bezier(.16,1,.3,1)'});animations.add(a);a.finished.finally(function(){animations.delete(a);}).catch(function(){});return true;
  }
  function transfer(from,to,label){
    if(!allowed()||!from||!to)return;var r=to.getBoundingClientRect(),tag=document.createElement('span');tag.className='commander-transfer';tag.textContent=label||'1';tag.setAttribute('aria-hidden','true');var x=from.left+from.width/2-12,y=from.top+from.height/2-12;tag.style.left=x+'px';tag.style.top=y+'px';document.body.append(tag);
    var a=tag.animate([{transform:'translate(0,0) scale(.8)',opacity:.8},{transform:'translate('+(r.left+10-x)+'px,'+(r.top+10-y)+'px) scale(.8)',opacity:0}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'});animations.add(a);a.finished.then(function(){tag.remove();animations.delete(a);},function(){tag.remove();});
  }
  function sync(){film.muted=!options.preferences().sound;voice.muted=!options.preferences().sound;if(!visible()){cancel();return;}if(active&&!allowed())showStill();}
  stage.querySelector('.commander-stage-skip').addEventListener('click',function(){cancel(true);options.onLand?.();options.announce('已进入工作区，原状态与输入保留');});
  stage.querySelector('.commander-report').addEventListener('click',function(){reset(voice);voice.muted=!options.preferences().sound;voice.volume=.72;voice.play().catch(function(){options.announce('报到语音无法播放');});});
  film.addEventListener('timeupdate',function(){
    if(!active||handingOff||!allowed()||film.currentTime<11.65)return;
    handingOff=true;
    // Close the scene as two opaque shutters. Live UI is revealed behind it;
    // the character is never left as a translucent ghost over the workspace.
    var a=stage.animate([{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 50% 0 50%)'}],{duration:Math.max(60,Math.min(350,(film.duration-film.currentTime)*1000)),easing:'cubic-bezier(.65,0,.2,1)',fill:'both'});
    a.id='commander-workspace-handoff';animations.add(a);a.finished.then(land,function(){});
  });
  film.addEventListener('ended',land);film.addEventListener('error',function(){if(active)showStill();});
  query.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);document.querySelector('#draft').addEventListener('focus',function(){if(active)cancel();});addEventListener('resize',function(){if(active)cancel(true);});
  return {preview:preview,complete:complete,transfer:transfer,cancel:cancel,sync:sync,isActive:function(){return active;}};
};
