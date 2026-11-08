import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {control} from './control.mjs';import {digest} from '../src/resources.mjs';
const info=JSON.parse(fs.readFileSync('.local/skin-foundation-current.json')),report={at:new Date().toISOString(),scope:'final staged source, UI ownership guards and unexpected native exit',checks:[]},wait=ms=>new Promise(r=>setTimeout(r,ms)),file='reports/skin-foundation/postflight.json';
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await wait(150);}throw new Error('POSTFLIGHT_TIMEOUT');}
async function check(name,fn){try{const detail=await fn();report.checks.push({name,passed:true,...(detail?{detail}:{})});save();}catch(e){report.checks.push({name,passed:false,error:e.message});save();throw e;}}
async function shutdownNative(){const b=JSON.parse(fs.readFileSync(path.join(info.stateDir,'bridge.json')));await fetch('http://127.0.0.1:'+b.port+'/shutdown',{method:'POST',headers:{authorization:'Bearer '+b.token,'content-type':'application/json'},body:'{}'});}
try{
 await check('tested plugin and native code match final local sources',async()=>{
  const files=['index.js','client.js','src/controller.mjs','src/skins.mjs','skin-core/src/coordinator.mjs','skin-core/adapters/page-client.mjs'];
  for(const f of files)assert.equal(digest(fs.readFileSync(path.join('packages/dsh-companion',f))),digest(fs.readFileSync(path.join(info.staged,f))));
  const native=path.join(info.staged,'runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app');
  assert.equal(fs.readFileSync(path.join(native,'main.mjs'),'utf8'),fs.readFileSync('runtime-src/main.mjs','utf8').replaceAll("void shell.openExternal('dsh://open')",'void Promise.resolve()'));
  for(const f of ['skin.mjs','pet.mjs'])assert.equal(digest(fs.readFileSync('runtime-src/'+f)),digest(fs.readFileSync(path.join(native,f))));return {pluginFiles:files.length,nativeFiles:3,onlyFixtureChange:'disable external application foregrounding'};
 });
 await until(()=>control('page','evaluate',"!!document.querySelector('button[aria-label=陪伴]')"));
 await control('host','select','archive-warm-whale');
 await check('legacy conflicting controls disabled while skin owns pet',async()=>{
  await control('page','evaluate',"document.querySelector('button[aria-label=陪伴]').click()");await wait(200);
  assert.equal(await control('page','evaluate',"document.querySelector('#dshc-pack').disabled"),true);
  await control('page','evaluate',"[...document.querySelectorAll('.dshc-page nav button')].find(x=>x.textContent==='桌宠控制').click()");await wait(200);
  assert.equal(await control('page','evaluate',"document.querySelector('#dshc-profile').disabled&&document.querySelector('#dshc-size').disabled"),true);
  assert.ok(await control('page','evaluate',"document.querySelector('.dshc-page').innerText.includes('当前桌宠由皮肤管理')"));
 });
 await check('all 46 first-skin tokens read back in official conversation',async()=>{
  await control('page','evaluate',"document.querySelector('button[aria-label=新建会话]').click()");await wait(200);
  const tokens=JSON.parse(fs.readFileSync('designs/dsh-skin-v1/content/archive-warm-whale/skin.json')).modules.theme.config.tokens;
  const result=await control('page','evaluate',`Object.entries(${JSON.stringify(tokens)}).filter(([name,modes])=>getComputedStyle(document.body).getPropertyValue(name).trim().toLowerCase()!==modes.light.toLowerCase()).map(([name])=>name)`);assert.deepEqual(result,[]);return {count:Object.keys(tokens).length};
 });
 await check('lost optional pet reports unavailable and keeps theme active',async()=>{await shutdownNative();await until(async()=>{const s=await control('host','status');return s.skin.settings.pet?.status==='unavailable';});const s=await control('host','status');assert.equal(s.skin.stopped,false);assert.equal(s.skin.settings.pet.reason,'SKIN_NATIVE_LOST');assert.equal(await control('page','evaluate',"getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim()"),'#f4f1e9');});
 await check('lost required pet stops all effects and reports a recoverable fault',async()=>{await control('host','select','sample-b');await shutdownNative();await until(async()=>{const s=await control('host','status');return s.skin.phase==='fault';});const s=await control('host','status');assert.equal(s.skin.stopped,true);assert.equal(s.skin.error.code,'SKIN_NATIVE_LOST');assert.equal(await control('page','evaluate',"getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim()"),'#fff');});
 await check('explicit recovery after native loss succeeds',async()=>{await control('host','select','archive-warm-whale');const s=await control('host','status');assert.equal(s.skin.phase,'ready');assert.equal(s.skin.error,null);assert.equal(s.window.visible,true);});
 await control('host','stop');report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;}
save();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));process.exit(report.passed?0:1);
