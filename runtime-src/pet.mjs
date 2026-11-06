const root = document.querySelector('#pet');
const clips = document.querySelector('#clips');
const bubble = document.querySelector('#bubble');
let pack = await fetch('/selected-pack.json').then(r => r.json());
let packToken = pack.runtimeToken, loadingToken, mediaGeneration = 0;
const media = new Map(), decodedMedia = new Set();
const sample = document.createElement('canvas');
sample.width = 160; sample.height = 90;
const pixels = sample.getContext('2d', { willReadFrequently: true });
let desired = 'idle', shown, state, pointer, previousFalling = false, bubbleTimer, clickTimer, dragStarted = false, press;
let reportedReady = false, lastSpeechSequence = 0, mediaSuspended = false;

function speak(text) {
  if (!text) return;
  clearTimeout(bubbleTimer);bubble.textContent=text;bubble.classList.add('show');
  bubbleTimer=setTimeout(()=>bubble.classList.remove('show'),3000);
}
function updateAccessibility(){
  const hints=[];if(decodedMedia.has('react'))hints.push('点击回应');if(decodedMedia.has('eat'))hints.push('双击喂饭');hints.push('拖动移动','右键打开菜单');
  root.setAttribute('aria-label',pack.name+'：'+hints.join('，'));document.title='主题盒子 · '+pack.name;
}
function reportReady(){updateAccessibility();window.companion.ready({packId:pack.id,packToken,availableActions:[...decodedMedia]});}
function selectClip(id) {
  desired=media.has(id)?id:'idle';
  const video=media.get(desired);
  if (!video || video.readyState<2 || shown===desired) return;
  for (const [key,v] of media) { v.classList.toggle('visible',key===desired);if(key!==desired)v.pause(); }
  video.currentTime=0;shown=desired;video.play().catch(()=>{});
  if (!reportedReady) { reportedReady=true;reportReady(); }
}
function loadMedia() {
  mediaGeneration++;const generation=mediaGeneration;
  for(const video of media.values()){video.pause();video.removeAttribute('src');video.load();video.remove();}
  media.clear();decodedMedia.clear();shown=undefined;reportedReady=false;updateAccessibility();
  for (const [id,animation] of Object.entries(pack.animations)) {
    const video=document.createElement('video');video.src='/'+animation.file;video.preload='auto';video.muted=true;video.loop=animation.loop===true;video.playsInline=true;video.dataset.action=id;
    video.addEventListener('loadeddata',()=>{if(generation!==mediaGeneration)return;decodedMedia.add(id);if(id===desired)selectClip(id);if(reportedReady)reportReady();});
    video.addEventListener('error',()=>{if(generation!==mediaGeneration)return;decodedMedia.delete(id);if(id===desired&&id!=='idle')selectClip('idle');if(reportedReady)reportReady();});
    media.set(id,video);clips.append(video);
  }
  selectClip(desired);
}
async function reloadPack(token) {
  if(loadingToken===token)return;loadingToken=token;
  const next=await fetch('/selected-pack.json').then(r=>r.json());
  if(loadingToken!==token||mediaSuspended)return;if(next.runtimeToken!==token){loadingToken=undefined;return;}pack=next;packToken=token;loadMedia();loadingToken=undefined;
}
loadMedia();
window.companion.onState(next=>{
  if(next.skinSuspended){
    if(!mediaSuspended){mediaGeneration++;loadingToken=undefined;for(const video of media.values()){video.pause();video.removeAttribute('src');video.load();video.remove();}media.clear();decodedMedia.clear();shown=undefined;reportedReady=false;mediaSuspended=true;clearTimeout(bubbleTimer);bubble.classList.remove('show');}
    state=next;return;
  }
  if(mediaSuspended){mediaSuspended=false;void reloadPack(next.packToken);}
  if(packToken===null&&pack.id===next.packId)packToken=next.packToken;
  else if(packToken!==next.packToken)void reloadPack(next.packToken);
  if(next.appearance)document.querySelector('#art').style.filter='hue-rotate('+next.appearance.hue+'deg) saturate('+next.appearance.saturation+')';
  state=next;selectClip(next.dragging||next.falling?'idle':next.action);
  clips.style.setProperty('--skin-offset-y',String((pack.canvasOffsetY||0)*(next.settings.size/100))+'px');
  root.classList.toggle('dragging',next.dragging);
  clips.style.setProperty('--facing',String(next.action==='walk'?next.facing:1));
  if(next.speechSequence!==lastSpeechSequence){lastSpeechSequence=next.speechSequence;if(next.speech)speak(next.speech);else{clearTimeout(bubbleTimer);bubble.classList.remove('show');}}
  if(previousFalling&&!next.falling){root.classList.remove('landing');void root.offsetWidth;root.classList.add('landing');setTimeout(()=>root.classList.remove('landing'),400);}
  previousFalling=next.falling;
});

function alphaHit(x,y) {
  const video=media.get(shown);
  if(!video||video.readyState<2)return false;
  const rect=clips.getBoundingClientRect();
  if(x<rect.x||y<rect.y||x>=rect.right||y>=rect.bottom)return false;
  try {
    pixels.clearRect(0,0,160,90);const scale=Math.min(160/video.videoWidth,90/video.videoHeight);pixels.drawImage(video,(160-video.videoWidth*scale)/2,(90-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);
    let sx=Math.floor((x-rect.x)/rect.width*160);const sy=Math.floor((y-rect.y)/rect.height*90);
    if(state?.action==='walk'&&state.facing<0)sx=159-sx;
    return pixels.getImageData(sx,sy,1,1).data[3]>35;
  } catch { return x>rect.width*.32&&x<rect.width*.7&&y>rect.top+rect.height*.2; }
}
window.addEventListener('mousemove',event=>{pointer={x:event.clientX,y:event.clientY};if(!dragStarted)window.companion.hit(alphaHit(pointer.x,pointer.y));});
window.addEventListener('mouseleave',()=>{if(!dragStarted)window.companion.hit(false);});
setInterval(()=>{if(pointer&&!dragStarted)window.companion.hit(alphaHit(pointer.x,pointer.y));},70);
root.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;press={x:event.screenX,y:event.screenY,id:event.pointerId};root.setPointerCapture(event.pointerId);
});
root.addEventListener('pointermove',event=>{
  if(!press||dragStarted||Math.hypot(event.screenX-press.x,event.screenY-press.y)<5)return;
  dragStarted=true;window.companion.drag('begin');bubble.classList.remove('show');
});
function release(event){if(!press)return;press=undefined;if(root.hasPointerCapture(event.pointerId))root.releasePointerCapture(event.pointerId);if(dragStarted){window.companion.drag('end');dragStarted=false;root.dataset.dragged=String(performance.now());}}
root.addEventListener('pointerup',release);root.addEventListener('pointercancel',release);
root.addEventListener('click',()=>{if(performance.now()-Number(root.dataset.dragged||'-1000')<400)return;clearTimeout(clickTimer);clickTimer=setTimeout(()=>window.companion.interact('react'),230);});
root.addEventListener('dblclick',()=>{clearTimeout(clickTimer);if(performance.now()-Number(root.dataset.dragged||'-1000')>=400)window.companion.interact('eat');});
root.addEventListener('contextmenu',event=>{event.preventDefault();window.companion.menu();});
root.addEventListener('keydown',event=>{if(['Enter',' ','f','F'].includes(event.key)){event.preventDefault();window.companion.interact(event.key.toLowerCase()==='f'?'eat':'react');}});
