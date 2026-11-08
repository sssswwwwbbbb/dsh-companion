import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {root,lab,stage,report} from './setup.mjs';
const home=path.join(lab,'host-home'),profileDir=path.join(home,'profiles/pet'),plugin=path.join(stage,'packages/dsh-companion');
const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const stateDir=path.join(home,'companion',createHash('sha256').update(profileDir).digest('hex').slice(0,16));
process.env.DSH_HOME=home;process.env.DSH_TELEMETRY_DISABLED='1';process.env.DSH_HOST_PET_LAB=lab;
const log=(type,data={})=>fs.appendFileSync(path.join(report,'host-events.jsonl'),JSON.stringify({at:Date.now(),type,...data})+'\n');
const write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n',{mode:0o600});
const link=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});if(!fs.existsSync(to))try{fs.symlinkSync(from,to);}catch(e){if(e.code!=='EEXIST')throw e;}};
link(sdk+'/node_modules/@deepseek-ai',path.join(plugin,'node_modules/@deepseek-ai'));
link(path.join(root,'.local/pet-engine-comparison-20261104/env/node_modules/undici'),path.join(plugin,'node_modules/undici'));
link(path.join(root,'packages/dsh-companion/node_modules/fflate'),path.join(plugin,'node_modules/fflate'));
const {loadProfileDirectory,loadLayeredEnv,initProfile,PROFILE_TEMPLATES}=await import(official('dsh-app-boot/lib/index.js'));
const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
const anchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json';
if(!fs.existsSync(path.join(profileDir,'package.json'))){
 initProfile(profileDir,PROFILE_TEMPLATES.web.bundles);
 const meta=JSON.parse(fs.readFileSync(path.join(profileDir,'package.json')));meta.dependencies={'dsh-plugin-companion':'file:'+plugin};meta.dsh.profile.bundles.push('dsh-plugin-companion');write(path.join(profileDir,'package.json'),meta);
 link(plugin,path.join(profileDir,'node_modules/dsh-plugin-companion'));
 fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
 const receiptSource=path.join(root,'.local/workflow-host-1793611280724/companion/5cf9bb1b5e4bef9d/license.json');
 fs.copyFileSync(receiptSource,path.join(stateDir,'license.json'));
 write(path.join(stateDir,'settings.json'),{schemaVersion:1,settings:{autoStart:false,startupEnabled:false,launcherEnabled:false,autonomous:false,followMouse:false,visible:true,size:100}});
 write(path.join(report,'profile-setup.json'),{at:new Date().toISOString(),privateProfile:profileDir,stagedPlugin:plugin,licenseSource:'existing non-cloud workflow test receipt, copied unchanged',authority:'existing local license service config',issueCalls:0,activationCalls:0,modelCalls:0,productionProfileChanged:false});
}
let boundUIUrl=null;const stdout=process.stdout.write.bind(process.stdout);const capture=chunk=>{const raw=String(chunk),match=raw.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/);if(match)boundUIUrl=match[1];const text=raw.replace(/([?&#]token=)[^\s&"']+/g,'$1[redacted]');fs.appendFileSync(path.join(lab,'host-start.log'),text);return true;};process.stdout.write=capture;process.stderr.write=capture;
const coldMode=process.argv.find(x=>x.startsWith('--compat-cold='))?.split('=')[1]||null;
if(coldMode&&!['enabled','startup-off','stopped','module-off'].includes(coldMode))throw new Error('UNKNOWN_COLD_CASE');
let application,ctx,stopping=false,coldSampler=null;const coldTrace=coldMode?path.join(report,'compatibility','cold-trace-'+coldMode+'-'+process.pid+'.jsonl'):null;
try{
 const profile=loadProfileDirectory('dsh',profileDir,anchor);
 application=await runProfile({environment:loadLayeredEnv('dsh'),profile:'pet',resolvedProfile:{profile,installAnchor:anchor},patchFiles:[],args:['--no-open','--host','127.0.0.1','--port','0'],packageManager:{command:process.execPath,args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath}}});
 ctx=application.ctx;let service;
 for(let i=0;i<160;i++){service=ctx.get('dshCompanion');if(service)break;await new Promise(r=>setTimeout(r,100));}
 if(!service)throw new Error('OFFICIAL_HOST_PLUGIN_UNAVAILABLE');
 if(coldTrace){let measuring=false;fs.mkdirSync(path.dirname(coldTrace),{recursive:true});coldSampler=setInterval(async()=>{if(measuring)return;measuring=true;try{const n=await ctx.get('dshCompanion').controller.nativeStatus();fs.appendFileSync(coldTrace,JSON.stringify({at:Date.now(),hostPid:process.pid,nativeRunning:n.running,startup:n.startup,backend:n.backend?{pid:n.backend.pid,ready:n.backend.ready,suspended:n.backend.suspended,held:n.backend.visibilityHeld,windows:n.backend.windows.map(w=>({id:w.id,visible:w.visible,bounds:w.bounds}))}:null})+'\n');}finally{measuring=false;}},60);}
 const status=await service.status();if(!status.license.active)throw new Error('EXISTING_TEST_LICENSE_UNAVAILABLE');
 const host=ctx.get('httpServer'),url=boundUIUrl||host?.url||host?.baseUrl||application.url||null;
 write(path.join(lab,'host-runtime.json'),{pid:process.pid,home,profileDir,stateDir,plugin,url,officialHost:true,coldMode,coldTrace});
 log('official-host-ready',{pid:process.pid,licenseActive:true,modelCalls:0});
 stdout(JSON.stringify({ready:true,pid:process.pid,officialHost:true,privateProfile:profileDir})+'\n');
 const dir=path.join(lab,'commands');fs.mkdirSync(dir,{recursive:true});let busy=false;
 setInterval(async()=>{if(busy||stopping)return;busy=true;try{
  for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.request.json'))){
   const f=path.join(dir,name),input=JSON.parse(fs.readFileSync(f));fs.unlinkSync(f);let value;
   try{
    if(input.method==='status')value=await ctx.get('dshCompanion').status();
    else if(input.method==='client-status'){const service=ctx.get('dshCompanion'),page=service.controller.skins.page;value={pageAvailable:page.available(),client:page.client,lastReady:page.lastReady,native:await service.status()};}
    else if(input.method==='verify'){const {verify}=await import('./verify-host.mjs');value=await verify({ctx,lab,report,log});}
    else if(input.method==='verify-startup'){const {verifyStartup}=await import('./verify-startup.mjs?run='+Date.now());value=await verifyStartup({ctx,lab,report,log});}
    else if(input.method==='verify-compat'){const {verifyCompat}=await import('./verify-compat.mjs?run='+Date.now());value=await verifyCompat({ctx,lab,report,log});}
    else if(input.method==='cold-check'){const {verifyCold}=await import('./verify-cold-compat.mjs?run='+Date.now());value=await verifyCold({ctx,lab,report,mode:coldMode,trace:coldTrace});clearInterval(coldSampler);}
    else if(input.method==='prepare-cold'){const {prepareCold}=await import('./verify-cold-compat.mjs?run='+Date.now());value=await prepareCold({ctx,lab,mode:input.mode});}
    else if(input.method==='quit'){stopping=true;clearInterval(coldSampler);await application.ctx.fiber.dispose();value={cleared:true};setTimeout(()=>process.exit(0),100);}
    else throw new Error('UNKNOWN_HOST_COMMAND');
    write(f.replace('.request.json','.response.json'),{ok:true,value});
   }catch(error){log('host-command-failed',{method:input.method,code:error.code||error.message});write(f.replace('.request.json','.response.json'),{ok:false,error:error.code||error.message});}
  }
 }finally{busy=false;}},100);
}catch(error){const failure={at:new Date().toISOString(),name:error.name,message:error.message,stack:error.stack?.split('\n').slice(0,8)};write(path.join(report,'host-start-failure.json'),failure);fs.appendFileSync(path.join(report,'host-start-failures.jsonl'),JSON.stringify(failure)+'\n');stdout(JSON.stringify({ready:false,error:error.message})+'\n');try{await application?.ctx.fiber.dispose();}catch{}process.exit(1);}
process.on('SIGTERM',()=>{if(stopping)return;stopping=true;void application?.ctx.fiber.dispose().finally(()=>process.exit(0));});
