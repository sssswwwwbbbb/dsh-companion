import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {control} from './control.mjs';
const root=process.cwd(),official='/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness',electron=path.join(root,'.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron'),info=()=>JSON.parse(fs.readFileSync('.local/skin-foundation-current.json')),wait=ms=>new Promise(r=>setTimeout(r,ms));
const report={at:new Date().toISOString(),scope:'fresh isolated official Host processes over same local licensed profile',modelCalls:0,userProfileChanged:false,realApplicationForegroundHandoff:false,checks:[]},file=path.join(process.env.DSH_SKIN_REPORT_DIR||'reports/skin-foundation','cold-regression.json');
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
async function check(name,fn){try{const detail=await fn();report.checks.push({name,passed:true,detail});save();}catch(e){report.checks.push({name,passed:false,error:e.message});save();throw e;}}
async function until(fn){for(let i=0;i<160;i++){if(await fn())return;await wait(150);}throw new Error('COLD_TIMEOUT');}
async function stop(){await control('host','quit');await control('page','quit');await wait(700);}
async function start(){
 const host=spawn(official,['packages/dsh-skin-core/scripts/isolated-host.mjs','--resume'],{cwd:root,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('HOST_BOOT_TIMEOUT')),25000);host.stdout.on('data',data=>{try{const x=JSON.parse(String(data));if(x.ready){clearTimeout(timer);resolve();}else if(x.ready===false){clearTimeout(timer);reject(new Error(x.error));}}catch{}});host.on('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('HOST_BOOT_FAILED'));});host.on('error',reject);});
 const home=info().home;fs.rmSync(path.join(home,'renderer-ready.json'),{force:true});
 const renderer=spawn(electron,['packages/dsh-skin-core/scripts/isolated-renderer.cjs'],{cwd:root,stdio:'ignore'});
 await until(async()=>fs.existsSync(path.join(home,'renderer-ready.json')));return {hostPid:host.pid,rendererPid:renderer.pid};
}
try{
 await control('host','legacyConfigure',{autoStart:true,startupEnabled:false,launcherEnabled:false});await stop();
 await check('explicit stop survives fresh Host and its autostart path',async()=>{const pids=await start();await until(async()=>{const s=await control('host','status');return s.ready;});const s=await control('host','status');assert.equal(s.skin.stopped,true);assert.equal(s.window.visible,false);assert.equal(s.startup.completions,0);return pids;});
 await control('host','select','archive-warm-whale');await control('host','legacyConfigure',{startupEnabled:true});await stop();
 await check('first normal cold start plays once and restores selected skin',async()=>{const pids=await start();await until(async()=>{const s=await control('host','status');return s.startup?.completions===1&&s.skin.phase==='ready';});const d=await control('host','native');assert.equal(d.transitions.filter(x=>x.type==='intro-start').length,1);return {...pids,completions:d.startup.completions};});
 await check('same-process plugin toggle restores pet without replay',async()=>{await control('host','pluginDisable');await control('host','pluginEnable');await until(async()=>{const s=await control('host','status');return s.skin.phase==='ready'&&s.window?.visible;});const d=await control('host','native');assert.equal(d.startup.completions,0);assert.equal(d.transitions.filter(x=>x.type==='intro-start').length,0);return {completions:0};});
 await stop();
 await check('second normal cold start independently plays once',async()=>{const pids=await start();await until(async()=>{const s=await control('host','status');return s.startup?.completions===1&&s.skin.phase==='ready';});const d=await control('host','native');assert.equal(d.transitions.filter(x=>x.type==='intro-start').length,1);return {...pids,completions:d.startup.completions};});
 await control('host','legacyConfigure',{startupEnabled:false});await stop();
 await check('disabled opening stays off on another fresh Host',async()=>{const pids=await start();await until(async()=>{const s=await control('host','status');return s.skin.phase==='ready'&&s.window?.visible;});const d=await control('host','native');assert.equal(d.startup.completions,0);assert.equal(d.transitions.filter(x=>x.type==='intro-start').length,0);return {...pids,completions:0};});
 await control('host','stop');await stop();report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;try{await stop();}catch{}}
save();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(x=>!x.passed).map(x=>x.name)}));process.exit(report.passed?0:1);
