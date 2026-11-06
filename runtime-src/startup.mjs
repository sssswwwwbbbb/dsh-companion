const video=document.querySelector('#character'),poster=document.querySelector('#poster'),greeting=document.querySelector('#greeting'),subtitle=document.querySelector('#subtitle'),progress=document.querySelector('#progress'),status=document.querySelector('#status'),skip=document.querySelector('#skip'),open=document.querySelector('#open');
const stage=document.querySelector('main'),motion=matchMedia('(prefers-reduced-motion: reduce)');
const openingLabel=document.querySelector('.eyebrow');
let currentToken=null,frame=null,mediaWatch=null,stopMotionListener=null;
const stallBudgetMs=5000;
function stopMediaWatch(){if(mediaWatch!==null){clearInterval(mediaWatch);mediaWatch=null;}}
function clearMedia(){
  stopMediaWatch();
  if(frame!==null){video.cancelVideoFrameCallback(frame);frame=null;}
  video.onplaying=video.onended=video.onloadeddata=video.onerror=null;poster.onload=poster.onerror=null;
  video.muted=true;video.pause();video.removeAttribute('src');video.load();poster.removeAttribute('src');video.hidden=true;poster.hidden=true;
  stage.style.removeProperty('--reveal');document.body.classList.remove('still');
}
function playCinematic(content,token){
  let still=false,started=false,handingOff=false;
  let lastMediaTime=0,lastAdvance=performance.now();
  function noteProgress(time){
    if(Number.isFinite(time)&&time>lastMediaTime){lastMediaTime=time;lastAdvance=performance.now();}
  }
  function showStill(reason){
    if(currentToken!==token||still)return;
    still=true;clearMedia();document.body.classList.add('still');
    const ready=media=>{if(currentToken===token)window.companion.introReady({token,media,fallback:reason,mediaTime:lastMediaTime,muted:true});};
    poster.onload=()=>{if(currentToken===token){poster.hidden=false;ready('poster');}};
    poster.onerror=()=>ready('poster-error');poster.src=content.poster;
  }
  if(content.reducedMotion||motion.matches){showStill('reduced-motion');return;}
  const reduce=event=>{if(event.matches)showStill('reduced-motion');};
  motion.addEventListener('change',reduce);stopMotionListener=()=>motion.removeEventListener('change',reduce);
  function reveal(time){
    const duration=video.duration;
    if(!Number.isFinite(duration)||duration<=0||time<duration-content.handoffSeconds)return;
    const p=Math.min(1,(time-(duration-content.handoffSeconds))/content.handoffSeconds);
    stage.style.setProperty('--reveal',(50*p*p*(3-2*p))+'%');
    if(!handingOff){handingOff=true;window.companion.introReady({token,handoff:true,mediaTime:time,mediaDuration:duration});}
  }
  function draw(_now,metadata){
    frame=null;if(currentToken!==token||still)return;
    noteProgress(metadata.mediaTime);
    reveal(metadata.mediaTime);frame=video.requestVideoFrameCallback(draw);
  }
  video.loop=false;video.muted=content.soundEnabled!==true;
  video.onloadeddata=()=>{
    if(currentToken!==token||still||new URL(video.currentSrc).pathname!==content.video)return;
    if(!Number.isFinite(video.duration)||Math.abs(video.duration-content.seconds)>.1){showStill('duration-mismatch');return;}
    video.play().catch(()=>showStill('video-error'));
  };
  video.onplaying=()=>{
    if(currentToken!==token||still||started)return;
    started=true;lastAdvance=performance.now();video.hidden=false;window.companion.introReady({token,media:'video',playing:true,muted:video.muted});
    frame=video.requestVideoFrameCallback(draw);
  };
  video.onended=()=>{
    if(currentToken!==token||still||!started)return;
    stopMediaWatch();
    if(frame!==null){video.cancelVideoFrameCallback(frame);frame=null;}
    reveal(video.duration);window.companion.introReady({token,media:'video',ended:true,mediaTime:video.currentTime});
  };
  video.onerror=()=>showStill('video-error');video.src=content.video;video.load();
  mediaWatch=setInterval(()=>{
    if(currentToken!==token||still||video.ended)return;
    noteProgress(video.currentTime);
    if(performance.now()-lastAdvance>=stallBudgetMs)showStill(started?'video-stalled':'video-start-timeout');
  },250);
}
function applyContent(content){
  stopMotionListener?.();stopMotionListener=null;currentToken=content.token;clearMedia();const token=currentToken;
  document.title='DSH 开场 · '+content.name;document.body.classList.toggle('night',content.theme==='night');document.body.classList.toggle('custom',content.custom===true);
  document.body.classList.toggle('cinematic',!!content.handoffSeconds);
  const showRole=!!(content.roleName&&content.roleModel);
  openingLabel.toggleAttribute('data-skin-role',showRole);
  openingLabel.textContent=showRole?[content.name,content.roleName,content.roleModel].join(' · '):'THEME BOX';
  for(const [property,name] of [['--intro-bg','--dsw-alias-bg-base'],['--intro-text','--dsw-alias-label-primary'],['--intro-accent','--dsw-alias-state-business-primary']]){
    const pair=content.tokens?.[name],scheme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    if(pair)document.body.style.setProperty(property,pair[scheme]);else document.body.style.removeProperty(property);
  }
  greeting.textContent=content.greeting;subtitle.textContent=content.subtitle;subtitle.hidden=!content.subtitle;
  if(content.handoffSeconds){playCinematic(content,token);return;}
  let posterReady=false;const report=media=>{if(currentToken===token)window.companion.introReady({token,media});};
  if(content.poster){
    poster.onload=()=>{if(currentToken===token){posterReady=true;if(video.hidden){poster.hidden=false;report('poster');}}};
    poster.onerror=()=>{if(video.hidden)report('poster-error');};poster.src=content.poster;
  }else report('legacy');
  video.loop=!content.custom;video.muted=true;
  if(content.video){
    video.onplaying=()=>{if(currentToken===token)window.companion.introReady({token,media:'video',playing:true});};
    video.onended=()=>{if(currentToken===token)window.companion.introReady({token,media:'video',ended:true});};
    const fallback=()=>{if(currentToken!==token)return;video.hidden=true;poster.hidden=!posterReady;report(posterReady?'poster':content.poster?'poster-loading':'legacy-error');};
    video.onloadeddata=()=>{if(currentToken!==token||new URL(video.currentSrc).pathname!==content.video)return;video.hidden=false;poster.hidden=true;report('video');video.play().catch(fallback);};
    video.onerror=fallback;
    video.src=content.video;video.load();
  }
}
window.companion.onIntroState(state=>{
  if(!state.playing||!state.content){if(currentToken){currentToken=null;stopMotionListener?.();stopMotionListener=null;clearMedia();}return;}
  if(state.content.token!==currentToken)applyContent(state.content);
  const videoClock=state.content.handoffSeconds&&!video.hidden&&Number.isFinite(video.duration)&&video.duration>0;
  const fraction=videoClock?video.currentTime/video.duration:state.elapsed/(state.duration||state.content.seconds);
  const percent=Math.min(state.hostReady?1:.94,fraction);progress.style.width=Math.round(percent*100)+'%';
  status.textContent=state.errorCode?'DSH 启动较慢，可以直接打开 DSH 查看。':state.hostReady?'DSH 已就绪。':'正在打开 DSH…';skip.disabled=!state.hostReady;skip.textContent=state.hostReady?(state.content.handoffSeconds?'进入工作区 · Esc':'进入 DSH'):'等待 DSH 就绪…';open.hidden=!state.errorCode;
});
skip.addEventListener('click',()=>window.companion.introControl({action:'skip',token:currentToken}));
open.addEventListener('click',()=>window.companion.introControl({action:'open-dsh',token:currentToken}));
window.companion.introReady({mounted:true});
