// Targeted native subset check. Host: --model-fixtures --config-fixtures.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {control} from './control.mjs';import {loadSkin,prepareResources,digest} from '../src/resources.mjs';
const directory=process.argv[2]||'.local/m4-a1-fixture',skin=loadSkin(directory),info=JSON.parse(fs.readFileSync('.local/skin-foundation-current.json'));
const out=process.env.DSH_SKIN_REPORT_DIR||'reports/skin-foundation-m4-2026-11-03/a1-fixture';fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),scope:'isolated official DSH Host + actual native Electron media; model replies use official-service fixture',skin:{id:skin.manifest.id,version:skin.manifest.version,contentKey:skin.contentKey},realModelCalls:0,checks:[],frames:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms)),state=()=>control('host','status'),evaluate=s=>control('page','evaluate',s),save=()=>fs.writeFileSync(out+'/native.json',JSON.stringify(report,null,2)+'\n');
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await wait(100);}throw new Error('M4_STATE_TIMEOUT');}
async function native(route,input={}){const bridge=JSON.parse(fs.readFileSync(info.stateDir+'/bridge.json'));const response=await fetch('http://127.0.0.1:'+bridge.port+route,{method:'POST',headers:{authorization:'Bearer '+bridge.token,'content-type':'application/json'},body:JSON.stringify(input)});const value=await response.json();if(!response.ok)throw new Error(value.error);return value;}
async function ready(){await until(async()=>{const s=await state();return s.skin.phase==='ready'&&s.availableActions?.includes('idle')&&s.availableActions?.includes('react');});}
async function capture(label){const live=await native('/test/pet',{capture:true}),shot=JSON.parse(fs.readFileSync(info.stateDir+'/pet-capture.json'));const png=Buffer.from(shot.png,'base64');fs.writeFileSync(out+'/'+label+'.png',png);const frame={label,sha256:digest(png),body:shot.body,...live.bubble};report.frames.push(frame);save();return frame;}
async function check(name,fn){try{const detail=await fn();report.checks.push({name,passed:true,...(detail?{detail}:{})});}catch(e){report.checks.push({name,passed:false,error:e.message.slice(0,500)});throw e;}finally{save();}}
async function open(){await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='继续')?.click()");await evaluate("document.querySelector('[role=dialog] button[aria-label=关闭]')?.click()");if(!await evaluate("!!document.querySelector('.dshc-page')"))await evaluate("document.querySelector('button[aria-label=陪伴]').click()");await until(()=>evaluate("!!document.querySelector('.dshc-page')"));await evaluate("[...document.querySelectorAll('.dshc-page nav button')].find(e=>e.textContent==='皮肤').click()");}
try{
  prepareResources(skin);if(process.env.DSH_SKIN_EXPECTED_HASH)assert.equal(skin.contentKey,process.env.DSH_SKIN_EXPECTED_HASH);
  await control('host','register',directory);await open();await control('host','select',skin.manifest.id);await ready();
  await check('exact content, two actual decoded sources, fixed local flags and controls',async()=>{
    const s=await state();assert.equal(s.skin.selected.contentKey,skin.contentKey);assert.equal(s.skin.selected.version,skin.manifest.version);assert.deepEqual(s.availableActions.sort(),['idle','react']);assert.equal(s.skin.settings.pet.values.canvasHeight,195);assert.equal(s.skin.settings.pet.values.canvasOffsetY,12);assert.equal(s.settings.autonomous,false);assert.equal(s.settings.followMouse,false);
    const live=await native('/test/pet');assert.deepEqual(live.bubble.videos.map(v=>v.id).sort(),['idle','react']);for(const video of live.bubble.videos){assert.equal(video.width,362);assert.equal(video.height,362);assert.equal(video.fit,'contain');assert.ok(video.source.startsWith('/skin-resource/'+skin.contentKey+'/'));}
    assert.ok(!s.skin.settings.pet.controls.some(c=>['autonomous','followMouse'].includes(c.field)));
    return {controls:s.skin.settings.theme.controls.length+s.skin.settings.pet.controls.length,availableActions:s.availableActions,videos:live.bubble.videos};
  });
  await check('actual idle/react playback at about 180px, calibrated feet and return to idle',async()=>{
    await wait(300);const idle1=await capture('idle-1');await wait(800);const idle2=await capture('idle-2');assert.equal(idle1.action,'idle');assert.notEqual(idle1.sha256,idle2.sha256);
    await native('/action',{action:'react'});await wait(300);const react1=await capture('react-1');await wait(650);const react2=await capture('react-2');assert.equal(react1.action,'react');assert.equal(react2.action,'react');assert.notEqual(react1.sha256,react2.sha256);
    await until(async()=> (await native('/test/pet')).bubble.action==='idle');const returned=await capture('react-return-idle');assert.equal(returned.action,'idle');
    for(const frame of [idle1,idle2,react1,react2,returned]){assert.ok(frame.body.cssHeight>=165&&frame.body.cssHeight<=190,JSON.stringify(frame.body));assert.ok(frame.body.groundGap>=-1&&frame.body.groundGap<=3,JSON.stringify(frame.body));}
    return {heights:report.frames.map(x=>x.body.cssHeight),feetGaps:report.frames.map(x=>x.body.groundGap),reactSeconds:skin.manifest.modules.pet.config.animations.react.seconds};
  });
  await check('missing local actions rejected and omitted from native menu',async()=>{
    await assert.rejects(native('/action',{action:'stretch'}),/ACTION_UNAVAILABLE/);await assert.rejects(native('/action',{action:'eat'}),/ACTION_UNAVAILABLE/);
    const live=await native('/test/pet');assert.ok(live.menu.some(x=>x.label==='摸摸头'));assert.ok(!live.menu.some(x=>['喂白饭','撸猫时间','伸懒腰','睡一会儿','叫她起床'].includes(x.label)));return {menu:live.menu.map(x=>x.label).filter(Boolean)};
  });
  await check('two official fixture model requests see only actual new resources and previous result',async()=>{
    const first=await control('host','petInteract',{text:'你好，轻轻回应我'}),second=await control('host','petInteract',{text:'换个动作或安静陪我'});const requests=JSON.parse(fs.readFileSync(info.home+'/pet-model-requests.json')).slice(-2);
    for(const request of requests)assert.deepEqual(request.input.capabilities.actions.map(x=>x.id).sort(),['idle','react']);assert.deepEqual(requests[1].input.recent.at(-1).actual,first.actual);for(const receipt of [first,second])assert.ok(receipt.actual.action===null||['idle','react'].includes(receipt.actual.action));return {first:first.actual,second:second.actual,secondReceivedActual:requests[1].input.recent.at(-1).actual};
  });
  await check('switch to complete v1 and back has no old media in new role',async()=>{
    await control('host','select','sample-b');await until(async()=> (await state()).availableActions?.length===10);const old=await native('/test/pet');assert.equal(old.bubble.videos.length,12);assert.ok(old.bubble.videos.every(x=>x.source.startsWith('/assets/whale-maid/')));
    await control('host','select',skin.manifest.id);await ready();const current=await native('/test/pet');assert.equal(current.bubble.videos.length,2);assert.ok(current.bubble.videos.every(x=>x.source.startsWith('/skin-resource/'+skin.contentKey+'/')));return {oldClips:12,newClips:2};
  });
  await check('stop during provider wait releases new media; late reply suppressed; explicit resume restores subset',async()=>{
    await open();await until(()=>evaluate("!!document.querySelector('[data-pet-interaction] input[type=text]:not(:disabled)')"));const before=(await state()).interaction;fs.writeFileSync(info.stateDir+'/test-model-hold','fixture');
    await evaluate("(()=>{const e=document.querySelector('[data-pet-interaction] input[type=text]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'A1等待回复时停止');e.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(50);await evaluate("document.querySelector('[data-pet-interaction] form').requestSubmit()");await until(async()=> (await state()).petInteraction.pending);
    await control('host','stop');fs.rmSync(info.stateDir+'/test-model-hold');await wait(500);const stopped=await state();assert.equal(stopped.window.visible,false);assert.deepEqual(stopped.interaction,before);assert.equal((await native('/test/pet')).bubble.videos.length,0);
    await control('host','select',skin.manifest.id);await ready();assert.equal((await state()).window.visible,true);const resumed=await native('/test/pet');assert.deepEqual(resumed.bubble.videos.map(x=>x.id).sort(),['idle','react']);await control('host','stop');return {lateExecution:false,stoppedMediaCount:0,resumedClips:2};
  });
  report.passed=true;
}catch(e){report.passed=false;report.failure=e.message.slice(0,500);}
finally{fs.rmSync(info.stateDir+'/test-model-hold',{force:true});}
report.limits=['controlled provider responses, no real external model','actual native media/window only; no physical pointer, full multi-monitor or long-run performance acceptance','A1 art remains a local candidate; visible hair/edge/loop details separately reviewed'];save();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(x=>!x.passed).map(x=>x.name)}));if(!report.passed)process.exitCode=1;
