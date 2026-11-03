import { PetBehavior, clamp } from './behavior.mjs';

const $ = (selector) => document.querySelector(selector);
const world = $('#world');
const pet = $('#pet');
const stack = $('#video-stack');
const bubble = $('#pet-bubble');
const storageKey = 'dsh-companion-role-preview-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pack = await fetch('packs/whale-maid.json').then(response => {
  if (!response.ok) throw new Error('角色配置暂时无法读取');
  return response.json();
});

let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* Storage is optional for a preview. */ }
if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
let profileId = Object.hasOwn(pack.profiles, saved.profileId) ? saved.profileId : 'free';
let scale = clamp(Number(saved.scale) || 100, 70, 140) / 100;
const model = new PetBehavior({ width: world.clientWidth, height: world.clientHeight - 7 });
model.profile = { ...pack.profiles[profileId] };
model.autonomous = saved.autonomous !== false;
model.follow = saved.follow === true;
let shownClip;
let requestedClip;
let dragging;
let draggedAt = -1000;
let clickTimer;
let bubbleTimer;
let toastTimer;
let interactionCount = 0;
let lastAction;
let lastEvent;
let lastLanding = false;
let lastUiUpdate = 0;
let introRunning = false;
let introTimer;
let introHideTimer;
let pausedBeforeIntro = false;
let pointer = null;
let lastFollow = 0;
const videos = new Map();
const failedClips = new Set();
const actionMessages = {
  react: '欸，头发要被你摸乱啦。',
  eat: '白饭！我才不是一直在等这个。',
  play: '小猫也想和我们一起玩呢。',
  stretch: '伸个懒腰，你也记得活动一下。',
  'sleep-in': '我先眯一小会儿，就一会儿。',
  wake: '唔……我醒啦，今天做点什么？',
  greet: '欢迎回来，今天也请多关照。',
};

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ profileId, scale: Math.round(scale * 100), autonomous: model.autonomous, follow: model.follow })); } catch { /* Keep usable when storage is blocked. */ }
}

function toast(text) {
  clearTimeout(toastTimer);
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800);
}

function say(text, seconds = 3.3) {
  clearTimeout(bubbleTimer);
  bubble.textContent = text;
  bubble.classList.add('show');
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), seconds * 1000);
}

function safePlay(video) {
  if (document.hidden || model.paused || introRunning) return;
  const promise = video.play();
  promise?.catch(() => { /* A later user gesture retries playback. */ });
}

function showClip(id) {
  const video = videos.get(id);
  if (!video || failedClips.has(id)) return;
  requestedClip = id;
  if (shownClip === id) { safePlay(video); return; }
  if (video.readyState < 2) return; // Hold the previous frame until this clip is ready.
  for (const [key, other] of videos) {
    if (key === id) continue;
    other.classList.remove('is-visible');
    other.pause();
  }
  video.currentTime = 0;
  video.classList.add('is-visible');
  shownClip = id;
  pet.dataset.clip = id;
  safePlay(video);
}

for (const [id, animation] of Object.entries(pack.animations)) {
  const video = document.createElement('video');
  video.src = animation.file;
  video.preload = 'auto';
  video.muted = true;
  video.loop = animation.loop === true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.dataset.clip = id;
  video.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(video.duration) && video.duration > 0) animation.seconds = video.duration;
  });
  video.addEventListener('loadeddata', () => {
    if (id === requestedClip || (!shownClip && id === 'idle')) showClip(id);
  });
  video.addEventListener('error', () => {
    failedClips.add(id);
    if (requestedClip === id) { showClip('idle'); toast(`“${animation.label}”素材未能加载，可以刷新重试。`); }
  });
  stack.append(video);
  videos.set(id, video);
}
showClip('idle');

function syncPause() {
  $('#pause-button').textContent = model.paused ? '▷ 继续活动' : 'Ⅱ 暂停活动';
  $('#pause-button').setAttribute('aria-pressed', String(model.paused));
  pet.dataset.paused = String(model.paused);
  if (model.paused) for (const video of videos.values()) video.pause();
  else if (shownClip) safePlay(videos.get(shownClip));
}

function perform(action) {
  if (introRunning) finishIntro();
  if (model.paused) { model.paused = false; syncPause(); }
  if (failedClips.has(action)) { toast('这个动作的素材还没有准备好。'); return; }
  const seconds = pack.animations[action]?.seconds || 5;
  if (!model.perform(action, action === 'sleep' ? Infinity : seconds, actionMessages[action])) return;
  interactionCount++;
  if (actionMessages[action]) say(actionMessages[action]);
  if (action === 'react') {
    pet.classList.remove('is-petted');
    void pet.offsetWidth;
    pet.classList.add('is-petted');
    setTimeout(() => pet.classList.remove('is-petted'), 1000);
  }
  updateUi();
  persist();
}

function resize() {
  model.setBounds(world.clientWidth, world.clientHeight - 7, 65 * scale, 220 * scale);
  pet.style.setProperty('--pet-scale', String(scale));
  pet.style.width = `${150 * scale}px`;
  pet.style.height = `${230 * scale}px`;
  renderPet();
}

function renderPet() {
  pet.style.transform = `translate3d(${model.x - 75 * scale}px, ${model.y - 230 * scale}px, 0)`;
  pet.style.setProperty('--facing', String(model.action === 'walk' ? model.facing : 1));
  pet.classList.toggle('is-dragging', model.dragging);
  pet.classList.toggle('is-falling', model.falling);
  pet.dataset.state = model.dragging ? 'dragging' : model.falling ? 'falling' : model.action;
  pet.dataset.x = model.x.toFixed(1);
  pet.dataset.y = model.y.toFixed(1);
  const clip = (model.dragging || model.falling) ? 'idle' : model.action;
  if (clip !== lastAction) {
    lastAction = clip;
    if (!['walk', 'idle', 'sleep'].includes(clip) && Number.isFinite(model.remaining)) {
      model.remaining = pack.animations[clip]?.seconds || model.remaining;
    }
    showClip(clip);
  }
  if (requestedClip !== shownClip) showClip(requestedClip);
  if (lastLanding && !model.falling) {
    pet.classList.add('is-landing');
    say('站稳了！下次轻一点嘛。');
    setTimeout(() => pet.classList.remove('is-landing'), 500);
  }
  lastLanding = model.falling;
}

function updateUi() {
  const label = model.dragging ? '被你拎起来了' : model.falling ? '准备落地' : pack.animations[model.action]?.label || '安静陪伴';
  $('#now-playing').textContent = label;
  $('#status-label').textContent = model.action === 'sleep' ? '小憩中' : model.paused ? '休息一下' : '在你身边';
  $('#now-mode').textContent = model.paused ? '已暂停' : model.follow ? '跟随鼠标中' : model.autonomous ? '自主活动中' : '等待你的互动';
  $('#energy-value').textContent = String(Math.round(model.energy));
  $('#affection-value').textContent = String(Math.round(model.affection));
  $('#decision-text').textContent = model.events[0]?.text || '';
  for (const button of document.querySelectorAll('[data-action]')) button.classList.toggle('is-active', button.dataset.action === model.action);
  const entry = model.events[0];
  if (entry && entry !== lastEvent) {
    lastEvent = entry;
    if (model.elapsed > 3 && !model.dragging && !model.falling) say(entry.text, 2.5);
  }
  document.documentElement.dataset.ready = 'true';
  document.documentElement.dataset.interactions = String(interactionCount);
}

$('#profile-select').value = profileId;
$('#profile-description').textContent = pack.profiles[profileId].description;
$('#size-range').value = String(Math.round(scale * 100));
$('#size-output').textContent = `${Math.round(scale * 100)}%`;
$('#autonomous-toggle').checked = model.autonomous;
$('#follow-toggle').checked = model.follow;
$('#profile-select').addEventListener('change', (event) => {
  profileId = event.target.value;
  model.setProfile(pack.profiles[profileId]);
  $('#profile-description').textContent = pack.profiles[profileId].description;
  persist();
});
$('#autonomous-toggle').addEventListener('change', event => {
  model.autonomous = event.target.checked;
  if (!model.autonomous && model.action === 'walk') model.perform('idle', 3);
  model.note(model.autonomous ? '我自己找点事情做，你先忙。' : '那我待在这里，等你叫我。');
  persist();
  updateUi();
});
$('#follow-toggle').addEventListener('change', event => {
  model.follow = event.target.checked;
  model.note(model.follow ? '鼠标去哪儿，我就跟到哪儿。' : '好啦，我继续自己逛逛。');
  if (!model.follow) pointer = null;
  persist();
  updateUi();
});
$('#size-range').addEventListener('input', event => {
  scale = Number(event.target.value) / 100;
  $('#size-output').textContent = `${Math.round(scale * 100)}%`;
  resize();
  persist();
});
for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', () => perform(button.dataset.action));
$('#pause-button').addEventListener('click', () => {
  if (introRunning) finishIntro();
  model.paused = !model.paused;
  syncPause();
  updateUi();
});
$('#reset-button').addEventListener('click', () => {
  model.dragging = false;
  model.falling = false;
  dragging = undefined;
  model.x = world.clientWidth * 0.66;
  model.y = model.height;
  model.perform('idle', 5, '回到熟悉的位置啦。');
  resize();
  say('回到这里，继续陪你。');
});
$('#fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('.desktop-frame').requestFullscreen();
  } catch { toast('当前浏览器没有提供全屏功能。'); }
});
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
$('#about-dialog').addEventListener('click', event => { if (event.target === $('#about-dialog')) $('#about-dialog').close(); });

$('#export-button').addEventListener('click', () => {
  const config = { schemaVersion: 1, rolePack: pack.id, profile: profileId, size: Math.round(scale * 100), autonomous: model.autonomous, followMouse: model.follow, sourceRevision: pack.revision };
  const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dsh-whale-maid-${profileId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('当前角色与相处配置已导出。');
});

world.addEventListener('pointermove', event => {
  if (!model.follow || model.dragging) return;
  const rect = world.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
});
world.addEventListener('pointerleave', () => { pointer = null; });
pet.addEventListener('pointerdown', event => {
  if (event.button !== 0 || introRunning) return;
  const rect = world.getBoundingClientRect();
  dragging = { id: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left - model.x, offsetY: event.clientY - rect.top - model.y, moved: false, samples: [{ x: event.clientX, y: event.clientY, at: event.timeStamp }] };
  pet.setPointerCapture(event.pointerId);
});
pet.addEventListener('pointermove', event => {
  if (!dragging || dragging.id !== event.pointerId) return;
  if (!dragging.moved && Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) > 6) {
    dragging.moved = true;
    model.paused = false;
    syncPause();
    model.startDrag();
    bubble.classList.remove('show');
  }
  if (!dragging.moved) return;
  const rect = world.getBoundingClientRect();
  model.dragTo(event.clientX - rect.left - dragging.offsetX, event.clientY - rect.top - dragging.offsetY);
  const last = dragging.samples.at(-1);
  pet.style.setProperty('--drag-angle', `${clamp((event.clientX - last.x) * -0.7, -13, 13)}deg`);
  dragging.samples.push({ x: event.clientX, y: event.clientY, at: event.timeStamp });
  dragging.samples = dragging.samples.filter(sample => event.timeStamp - sample.at < 100);
  renderPet();
});
function releasePointer(event, cancelled = false) {
  if (!dragging || dragging.id !== event.pointerId) return;
  const record = dragging;
  dragging = undefined;
  if (pet.hasPointerCapture(event.pointerId)) pet.releasePointerCapture(event.pointerId);
  if (!record.moved) return;
  const first = record.samples[0];
  const last = record.samples.at(-1);
  const elapsed = Math.max(0.035, (last.at - first.at) / 1000);
  const recentlyMoving = event.timeStamp - last.at < 100;
  model.release(!cancelled && recentlyMoving ? (last.x - first.x) / elapsed : 0, !cancelled && recentlyMoving ? (last.y - first.y) / elapsed : 0);
  draggedAt = performance.now();
  interactionCount++;
}
pet.addEventListener('pointerup', event => releasePointer(event));
pet.addEventListener('pointercancel', event => releasePointer(event, true));
pet.addEventListener('lostpointercapture', event => { if (dragging) releasePointer(event, true); });
pet.addEventListener('click', () => {
  if (performance.now() - draggedAt < 400) return;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => perform('react'), 230);
});
pet.addEventListener('dblclick', event => {
  event.preventDefault();
  clearTimeout(clickTimer);
  if (performance.now() - draggedAt >= 400) perform('eat');
});
pet.addEventListener('keydown', event => {
  if ([' ', 'Enter', 'f', 'F'].includes(event.key)) {
    event.preventDefault();
    perform(event.key.toLowerCase() === 'f' ? 'eat' : 'react');
  }
});

function startIntro() {
  clearTimeout(introTimer);
  clearTimeout(introHideTimer);
  const intro = $('#intro');
  if (!introRunning) pausedBeforeIntro = model.paused;
  introRunning = true;
  model.paused = true;
  for (const video of videos.values()) video.pause();
  intro.hidden = false;
  intro.classList.remove('is-leaving');
  // Reinsert the animation class so replay starts from its first frame.
  intro.style.animation = 'none';
  for (const child of intro.querySelectorAll('*')) child.style.animation = 'none';
  void intro.offsetWidth;
  intro.style.animation = '';
  for (const child of intro.querySelectorAll('*')) child.style.animation = '';
  const video = $('#intro-video');
  video.currentTime = 0;
  video.play().catch(() => { /* Static cover remains visible if autoplay is unavailable. */ });
  $('#intro-button').disabled = true;
  document.documentElement.dataset.intro = 'playing';
  introTimer = setTimeout(finishIntro, reducedMotion ? 900 : pack.startup.seconds * 1000);
}

function finishIntro() {
  if (!introRunning) return;
  clearTimeout(introTimer);
  $('#intro').classList.add('is-leaving');
  $('#intro-button').disabled = false;
  introHideTimer = setTimeout(() => {
    $('#intro').hidden = true;
    $('#intro-video').pause();
    introRunning = false;
    model.paused = pausedBeforeIntro;
    syncPause();
    document.documentElement.dataset.intro = 'finished';
    say('嗯？你叫我？');
  }, reducedMotion ? 20 : 570);
}
$('#intro-button').addEventListener('click', startIntro);
$('#skip-intro').addEventListener('click', finishIntro);
document.addEventListener('keydown', event => { if (event.key === 'Escape') finishIntro(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    for (const video of videos.values()) video.pause();
    $('#intro-video').pause();
  } else if (introRunning) $('#intro-video').play().catch(() => {});
  else if (shownClip) safePlay(videos.get(shownClip));
});

new ResizeObserver(resize).observe(world);
resize();
syncPause();
updateUi();
say('嗯？你叫我？');
const clockFormatter = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
function updateClock() { $('#desktop-clock').textContent = clockFormatter.format(new Date()); }
updateClock();
setInterval(updateClock, 30000);

let previous = performance.now();
function frame(now) {
  const dt = (now - previous) / 1000;
  previous = now;
  if (!document.hidden && !introRunning) {
    if (model.follow && pointer && now - lastFollow > 600 && !model.dragging && !model.falling && Math.abs(pointer.x - model.x) > 70) {
      model.walkTo(pointer.x, '跟着你的鼠标，慢慢走。');
      lastFollow = now;
    }
    model.step(dt);
    renderPet();
    if (now - lastUiUpdate > 180) { updateUi(); lastUiUpdate = now; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the initial page interactive; the user can explicitly replay the intro.
document.documentElement.dataset.intro = 'ready';
