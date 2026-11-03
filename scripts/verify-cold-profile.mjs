// A fresh official Host process over an already installed, licensed test
// profile. It never installs a plugin or invokes activation/model calls.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [home,profileDir,mode,after='keep']=process.argv.slice(2),root=process.cwd();
if(!home||!path.resolve(home).startsWith(path.join(root,'.local')+path.sep)||!path.basename(home).startsWith('workflow-host-')||path.dirname(profileDir)!==path.join(home,'profiles')||!['on','on-toggle','off'].includes(mode)||!['keep','on','off'].includes(after))throw new Error('ISOLATED_PROFILE_REQUIRED');
process.env.DSH_HOME=home;process.env.DSH_TELEMETRY_DISABLED='1';
const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const report={at:new Date().toISOString(),freshHostProcess:true,modelCalls:0,activationCalls:0,mode,checks:{}};
process.stdout.write=()=>true;process.stderr.write=()=>true;
const check=(value,name)=>{report.checks[name]=!!value;if(!value)throw new Error(name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,150));
let app,ctx;
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
async function waitFor(predicate){
  for(let i=0;i<180;i++){
    const service=ctx.get('dshCompanion');
    if(service){const state=await service.status();if(predicate(state))return {service,state};}
    await delay();
  }
  throw new Error('COLD_PROFILE_NOT_READY');
}
try{
  const {loadProfileDirectory,loadLayeredEnv}=await import(official('dsh-app-boot/lib/index.js'));
  const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
  const installAnchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json';
  const profile=loadProfileDirectory('dsh',profileDir,installAnchor);
  app=await runProfile({environment:loadLayeredEnv('dsh'),profile:'companion',resolvedProfile:{profile,installAnchor},patchFiles:[],args:['--no-open','--host','127.0.0.1','--port','0'],packageManager:{command:process.execPath,args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath}}});
  ctx=app.ctx;
  let current=await waitFor(s=>s.ready&&s.phase==='ready'&&s.launcher.installed);
  let diagnostic=await current.service.controller.request('/diagnostics',{});
  const starts=diagnostic.transitions.filter(e=>e.type==='intro-start').length;
  check(current.state.license.active,'EXISTING_LICENSE_USED_WITHOUT_ACTIVATION');
  check(mode==='off'?starts===0&&current.state.startup.completions===0:starts===1&&current.state.startup.completions===1,'COLD_BOOT_OBEYS_ANIMATION_SETTING');
  report.startup={completions:current.state.startup.completions,starts,enabled:current.state.settings.startupEnabled,bounds:current.state.startup.bounds};
  if(mode==='on-toggle'){
    const previousPid=current.state.pid,manager=ctx.get('pluginManager');
    const disabled=await manager.setBundleEnabled('dsh-plugin-companion',false);
    check(disabled.application==='applied'&&!alive(previousPid),'COLD_HOST_PLUGIN_DISABLED');
    await manager.setBundleEnabled('dsh-plugin-companion',true);
    current=await waitFor(s=>s.ready&&s.phase==='ready'&&s.launcher.installed);
    diagnostic=await current.service.controller.request('/diagnostics',{});
    check(current.state.startup.completions===0&&!diagnostic.transitions.some(e=>e.type==='intro-start'),'SAME_HOST_REENABLE_STAYS_QUIET');
  }
  if(after!=='keep')await current.service.configure({startupEnabled:after==='on'});
  report.passed=true;
}catch(error){report.passed=false;report.failure=/^[A-Z_]+$/.test(error.message||'')?error.message:'COLD_PROFILE_FAILED';}
finally{try{await app?.ctx.fiber.dispose();}catch{report.passed=false;report.cleanupFailed=true;}}
fs.writeSync(1,JSON.stringify(report)+'\n');process.exit(report.passed?0:1);
