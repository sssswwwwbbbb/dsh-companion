// Shared experiment journey and measurements, deliberately identical policy for
// both candidates. No production coordinator or PetBehavior is underneath it.
const candidate=new URLSearchParams(location.search).get('engine')==='phaser'?'phaser':'dsh';
const started=performance.now();if(candidate==='phaser')await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/phaser.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
const manifest=await fetch('/manifest.json').then(r=>r.json()),{Engine}=await import('/'+candidate+'-engine.js');
const state={candidate,phase:'loading',generation:0,sequence:0,commandRevision:0,commandGuard:true,intent:'idle',returnIntent:'idle',prop:null,events:[],samples:[],errors:[],startupMs:null};
const $=id=>document.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
function log(type,detail={}){const event={type,ms:Math.round(performance.now()-started),generation:state.generation,...detail};state.events.push(event);if(state.events.length>500)state.events.shift();$('events').innerHTML=state.events.slice(-5).map(e=>'<li>'+e.ms+'ms · '+e.type+(e.name?' · '+e.name:'')+'</li>').join('');void fetch('/evidence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidate,event})});}
const engine=new Engine(manifest,log);$('engine-name').textContent=(candidate==='dsh'?'dsh-pet 0.4.1':'Phaser 4.2.1')+' · 场景陪伴';document.title=$('engine-name').textContent;
function setPhase(phase){state.phase=phase;$('status').textContent='状态：'+phase+' · 代次 '+state.generation;$('work-note').textContent=phase==='work'?'正在处理工作（本地注入）':phase==='sit'?'坐姿占位 · 书可独立组合':phase==='stopped'?'场景效果已清理':'空闲陪伴';}
function prop(name){state.prop=name;if(candidate==='phaser')engine.showProp(name,!!name);else{$('composed-prop').src='/'+(name||'book')+'.svg';$('composed-prop').hidden=!name;}}
async function apply(){const command=state.commandRevision;state.sequence++;await engine.apply();if(command!==state.commandRevision)return;state.generation++;state.intent='idle';prop(null);setPhase('idle');if(state.startupMs===null)state.startupMs=Math.round(performance.now()-started);log('applied',{startupMs:state.startupMs});}
async function move(fast){prop(null);state.intent=fast?'run':'walk';setPhase(state.intent);const result=await engine.walk(fast);log('movement-start',{name:state.intent,receipt:result});}
async function sit(){const sequence=state.sequence;state.intent='sit';prop(null);setPhase('sit-start');await engine.sit();if(candidate==='dsh')await wait(manifest.actions['sit-start'].seconds*1000+200);if(!engine.enabled||sequence!==state.sequence)return;setPhase('sit');prop('book');log('independent-prop-shown',{prop:'book'});}
async function restore(intent,sequence=state.sequence){if(!engine.enabled||sequence!==state.sequence)return;if(intent==='sit')await sit();else if(intent==='walk'||intent==='run')await move(intent==='run');else{state.intent='idle';await engine.idle();if(sequence===state.sequence)setPhase('idle');}}
async function work(active){
 if(active){state.returnIntent=state.intent;prop(null);setPhase('work');await engine.work(true);log('work-interrupted',{returnIntent:state.returnIntent});}
 else{const sequence=state.sequence;await engine.work(false);log('work-finished');await restore(state.returnIntent,sequence);}
}
async function interact(){const sequence=state.sequence,intent=state.intent;prop(null);setPhase('interaction');await engine.interact();log('user-interrupted',{returnIntent:intent});await wait(manifest.actions.react.seconds*1000+100);if(sequence===state.sequence&&engine.enabled){await restore(intent);log('intent-restored',{intent});}}
async function stop(){const command=state.commandRevision;state.sequence++;prop(null);await engine.stop();if(command!==state.commandRevision)return;setPhase('stopped');log('cleanup',{sample:engine.sample()});}
async function switchTheme(){await stop();document.body.dataset.theme=document.body.dataset.theme==='blue'?'warm':'blue';await apply();log('theme-switched',{theme:document.body.dataset.theme});}
async function extend(){const command=state.commandRevision;await engine.extend();if(command!==state.commandRevision)return;await engine.look();if(command!==state.commandRevision)return;setPhase('look');prop('cup');log('extension-in-use',{action:'look',prop:'cup'});}
async function journey(){
 await apply();const sequence=state.sequence;const check=()=>{if(sequence!==state.sequence)throw new Error('JOURNEY_SUPERSEDED');};
 await engine.position(.3,.62);await wait(300);await move(false);await wait(manifest.actions.walk.seconds*1000+250);check();await move(true);await wait(manifest.actions.run.seconds*1000+250);check();
 await sit();await wait(1000);check();await work(true);await wait(1800);check();await work(false);await wait(700);check();await interact();check();await extend();await wait(2200);check();await switchTheme();log('journey-complete');
 // Capture immediately; later manual inputs cannot overwrite this run's facts.
 await fetch('/evidence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidate,event:{type:'completed-run-snapshot',snapshot:window.__comparison.snapshot()}})});
}
async function command(name){const ticket=++state.commandRevision;engine.beginCommand?.();try{if(name!=='journey')state.sequence++;const actions={journey,walk:()=>move(false),run:()=>move(true),sit,work:()=>work(true),finish:()=>work(false),interact,extend,switch:switchTheme,stop,apply};await actions[name]();}catch(e){if(['JOURNEY_SUPERSEDED','COMMAND_SUPERSEDED'].includes(e.message)||ticket!==state.commandRevision)log('command-superseded',{command:name});else{state.errors.push(e.message);log('error',{message:e.message});$('status').textContent='错误：'+e.message;}}}
for(const id of ['journey','walk','run','sit','work','finish','interact','extend','switch','stop','apply'])$(id).addEventListener('click',()=>void command(id));
window.addEventListener('scene-user-interaction',()=>void command('interact'));
// Publicly observable video events and pose reads are experiment telemetry;
// no core renderer state, movement or animation is replaced here.
const seen=new WeakSet();setInterval(()=>{
 const sample={ms:Math.round(performance.now()-started),phase:state.phase,generation:state.generation,prop:state.prop,...engine.sample()};state.samples.push(sample);if(state.samples.length>1800)state.samples.shift();
 if(candidate==='dsh'&&state.prop&&sample.x!==null){$('composed-prop').style.left=(sample.x+45)+'px';$('composed-prop').style.top=(sample.y+68)+'px';}
 for(const video of document.querySelectorAll('.dsh-pet-video'))if(!seen.has(video)){seen.add(video);for(const name of ['playing','ended','pause','error'])video.addEventListener(name,()=>log('upstream-video-'+name,{name:video.currentSrc.split('/').at(-1),time:video.currentTime}));}
},150);
window.__comparison={state,snapshot:()=>structuredClone({...state,latest:engine.sample(),canvasCount:document.querySelectorAll('canvas').length,videoCount:document.querySelectorAll('video').length,propsVisible:!$('composed-prop').hidden})};
await apply();window.__comparison.ready=true;
