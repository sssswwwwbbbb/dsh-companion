// Run with the installed DSH executable in Node mode. This owns an isolated
// profile and uses the real package, licensing service, SDK and native app.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {remoteAdmin} from '../deploy/cloud-admin.mjs';
import {createDshFetch} from '../packages/dsh-companion/src/http.mjs';
const root=process.cwd(),metadata=JSON.parse(fs.readFileSync('packages/dsh-companion/package.json')),version=metadata.version,packageName=metadata.name,artifact=path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'dist/'+packageName.replace(/^@/,'').replaceAll('/','-')+'-'+version+'.tgz');
const prepared=process.argv.includes('--prepared'),installSpec=process.argv.find(arg=>arg.startsWith('--install-spec='))?.slice('--install-spec='.length)||artifact,upgradeFrom=process.argv.find(arg=>arg.startsWith('--upgrade-from='))?.slice('--upgrade-from='.length);
const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh',official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const home=path.join(root,'.local/workflow-host-'+Date.now()),profileDir=path.join(home,'profiles/companion');
const stateDir=path.join(home,'companion',createHash('sha256').update(profileDir).digest('hex').slice(0,16));
process.env.DSH_HOME=home;process.env.DSH_TELEMETRY_DISABLED='1';
const cloud=process.argv.includes('--cloud');
const permanent=process.argv.includes('--permanent'),licenseDays=permanent?0:30;
const serviceState=path.join(root,'.local/license-service'),serviceConfig=JSON.parse(fs.readFileSync(cloud?'packages/dsh-companion/config/service.json':path.join(serviceState,'service.json'))),adminToken=cloud?null:fs.readFileSync(path.join(serviceState,'admin.token'),'utf8');
const report={at:new Date().toISOString(),version,artifactSha256:createHash('sha256').update(fs.readFileSync(artifact)).digest('hex'),scope:'isolated-official-Host-with-packaged-native-workflow',node:process.version,existingProxyEnabled:process.env.NODE_USE_ENV_PROXY==='1',modelCalls:0,userProfileChanged:false,checks:{},steps:[]};
const reportFile=path.join(root,process.argv.includes('--regression')?'reports/dev'+version.match(/dev\.(\d+)/)[1]+'-host.json':prepared?'reports/online-install-host.json':permanent?'reports/permanent-host.json':cloud?'reports/cloud-host.json':'reports/workflow-host.json');
report.licenseMode=permanent?'permanent':'fixed-term';
report.packageName=packageName;report.installSource=installSpec===artifact?'local-artifact':installSpec;report.privateDownloadSkipped=prepared;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
function checkpoint(step){report.steps.push(step);fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');}
function check(value,name){report.checks[name]=!!value;if(!value)throw new Error(name);}
const issuedIds=[];
let management;
async function managementClient(fetcher){
  const credentials=JSON.parse(fs.readFileSync('.local/cloud/admin-login.json')),jar=new Map();let csrf='';
  async function request(route,body){
    let response;for(let attempt=0;attempt<3;attempt++){
      try{response=await fetcher(credentials.url+'api/'+route,{method:body?'POST':'GET',headers:{...(jar.size?{cookie:[...jar.values()].join('; ')}:{}),...(body?{origin:new URL(credentials.url).origin,'content-type':'application/json','x-csrf-token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});break;}
      catch(error){if((body&&route!=='licenses/issue')||attempt===2)throw error;}
    }
    for(const header of response.headers.getSetCookie()){const pair=header.split(';')[0],name=pair.slice(0,pair.indexOf('='));if(pair.endsWith('='))jar.delete(name);else jar.set(name,pair);}
    const value=await response.json();if(!response.ok)throw new Error(value.error||'CONSOLE_REQUEST_FAILED');return value;
  }
  csrf=(await request('csrf')).csrf;csrf=(await request('login',{username:credentials.username,password:credentials.password})).csrf;
  return request;
}
async function admin(route,input){
  let value;
  if(cloud){
    if(route==='/admin/issue'){const result=await management('licenses/issue',{...input,count:1,requestId:randomUUID()});const row=result.licenses[0];value={...row,licenseId:row.id};}
    else if(route==='/admin/revoke'){const row=(await management('licenses/'+input.licenseId)).license;if(row.status!=='revoked')await management('licenses/'+row.id+'/status',{revision:row.revision,revoked:true});value={ok:true};}
    else throw new Error('UNSUPPORTED_TEST_ADMIN_ROUTE');
  }
  else{const response=await fetch(serviceConfig.serviceUrl+route,{method:'POST',headers:{authorization:'Bearer '+adminToken,'content-type':'application/json'},body:JSON.stringify(input)});value=await response.json();if(!response.ok)throw new Error(value.error);}
  if(route==='/admin/issue'){issuedIds.push(value.licenseId);report.temporaryLicenseIds=[...issuedIds];}return value;
}
let application,ctx,petPid,disposeNetwork;
process.stdout.write=()=>true;process.stderr.write=()=>true;
const service=()=>ctx.get('dshCompanion');
async function waitFor(predicate,code='DESKTOP_NOT_READY'){
  for(let i=0;i<140;i++){const value=service();if(value){const state=await value.status();report.lastState={phase:state.phase,ready:state.ready,errorCode:state.errorCode||null};if(predicate(state))return {service:value,state};}await delay(150);}throw new Error(code);
}
try{
  const {loadProfileDirectory,loadLayeredEnv,initProfile,PROFILE_TEMPLATES}=await import(official('dsh-app-boot/lib/index.js'));
  const {installProxyFromEnvironment,proxyRouteFor}=await import(official('dsh-http-proxy/lib/index.js'));
  const environment=loadLayeredEnv('dsh');disposeNetwork=await installProxyFromEnvironment(environment,()=>{});
  report.transport='DSH official undici and proxy route';report.dshProxyConfigured=proxyRouteFor(new URL(serviceConfig.serviceUrl)).proxied;
  if(cloud){const proxyPackage=sdk+'/node_modules/@deepseek-ai/dsh-http-proxy/package.json';management=await managementClient(createDshFetch(createRequire(proxyPackage)('undici').fetch,proxyRouteFor));}
  const issued=await admin('/admin/issue',{label:'isolated SDK full workflow',devices:1,days:licenseDays});
  fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(stateDir,'settings.json'),JSON.stringify({schemaVersion:1,settings:{profile:'free',size:100,autonomous:true,followMouse:false,visible:true},position:{x:266.25}}),{mode:0o600});
  const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
  const {remoteMethods}=await import(official('dsh-typert-protocol/lib/index.js'));
  const installAnchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json';initProfile(profileDir,PROFILE_TEMPLATES.web.bundles);
  const profile=loadProfileDirectory('dsh',profileDir,installAnchor);
  application=await runProfile({environment,profile:'companion',resolvedProfile:{profile,installAnchor},patchFiles:[],args:['--no-open','--host','127.0.0.1','--port','0'],packageManager:{command:process.execPath,args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath}}});
  ctx=application.ctx;const manager=ctx.get('pluginManager');checkpoint('official-host-started');
  let migration;
  if(upgradeFrom){
    const oldName='@local/dsh-companion',old=await manager.installBundle(path.resolve(upgradeFrom),{enabled:true});check(old.application==='applied'&&!old.error,'LEGACY_INSTALL_APPLIED');
    let legacy=await waitFor(state=>state.license?.state==='unactivated');await legacy.service.activate(issued.code);legacy=await waitFor(state=>state.ready&&state.phase==='ready');
    await legacy.service.selectPack('whale-maid-night');await legacy.service.configure({size:85,autonomous:false});legacy=await waitFor(state=>state.ready&&state.settings.size===85);
    migration={licenseId:legacy.state.license.licenseId,packId:legacy.state.settings.packId,pid:legacy.state.pid};
    await manager.setBundleEnabled(oldName,false);const removed=await manager.removeBundle(oldName);check(removed.application==='applied'&&!alive(migration.pid),'LEGACY_REMOVED_BEFORE_PUBLIC_PACKAGE');
  }
  const installOptions={enabled:true};if(process.argv.includes('--mirror'))installOptions.registry='https://registry.npmmirror.com/';
  if(installSpec!==artifact)checkpoint('fetching-online-install-package');
  const installed=await manager.installBundle(installSpec,installOptions);check(installed.application==='applied'&&!installed.error,'INSTALL_APPLIED');
  if(installSpec!==artifact){
    const manifest=JSON.parse(fs.readFileSync(path.join(profileDir,'package.json'))),recorded=manifest.dependencies?.[packageName];check(typeof recorded==='string'&&recorded.split('#')[0]===installSpec,'ONLINE_URL_RECORDED_BY_OFFICIAL_INSTALLER');
    const installedClient=fs.readFileSync(path.join(profileDir,'node_modules',packageName,'client.js'));check(installedClient.equals(fs.readFileSync('packages/dsh-companion/client.js')),'ONLINE_PACKAGE_CLIENT_MATCHES_BUILD');report.registries=installed.registries;
  }
  if(migration){const upgraded=await waitFor(state=>state.ready&&state.version===version);check(upgraded.state.license.licenseId===migration.licenseId&&upgraded.state.license.permanent===true,'RENAMED_PACKAGE_PRESERVES_LICENSE');check(upgraded.state.settings.packId===migration.packId&&upgraded.state.settings.size===85&&!upgraded.state.settings.autonomous,'RENAMED_PACKAGE_PRESERVES_SETTINGS');await upgraded.service.deactivate();checkpoint('legacy-to-public-migration-passed');}
  let current=await waitFor(state=>state.license?.state==='unactivated');check(!current.state.running,'UNACTIVATED_HAS_NO_PET');check(current.state.compatibility.supported,'DSH_VERSION_RECOGNIZED');
  const names=remoteMethods(current.service).map(row=>row.method);check(names.length===19,'REMOTE_METHODS_BOUND');
  const peer={ctx,principal:{kind:'owner'},signal:new AbortController().signal,interactions:'answer'},gateway=ctx.get('typertGateway');
  const wire=(method,args={})=>gateway.invokeRpc('dshCompanion/'+method,{args},undefined,peer);
  check(!(await wire('start')).ok,'UNACTIVATED_REMOTE_START_BLOCKED');checkpoint('unactivated-branch-passed');
  const expectedIntro={x:120,y:80,width:900,height:680};check((await wire('syncHostWindow',{value:expectedIntro})).ok,'HOST_WINDOW_SYNC_BEFORE_ACTIVATION');
  await current.service.activate(issued.code);
  current=await waitFor(state=>state.ready&&state.phase==='ready'&&state.launcher.installed,'INITIAL_ENTRY_NOT_READY');petPid=current.state.pid;
  check(current.state.version===version&&current.state.desktopVersion===version,'EXPECTED_PACKAGE_AND_NATIVE_VERSION_RUNNING');
  check(current.state.license.active,'ACTIVATED');check(current.state.startup.completions>=1&&current.state.window.visible,'INTRO_TO_PET_HANDOFF');check(current.state.launcher.installed,'LAUNCHER_CREATED');
  check(JSON.stringify(current.state.startup.bounds)===JSON.stringify(expectedIntro),'INTRO_MATCHES_DSH_WINDOW');
  if(permanent)check(current.state.license.permanent===true&&current.state.license.expiresAt===null,'PERMANENT_LICENSE_NATIVE_RUNNING');
  await current.service.removeLauncher();let entryState=await service().status();check(!entryState.launcher.installed&&entryState.running&&entryState.license.active,'REMOVE_ENTRY_KEEPS_PLUGIN_AND_PET_ACTIVE');
  await service().installLauncher();entryState=await service().status();check(entryState.launcher.installed&&entryState.settings.launcherEnabled,'RESTORE_REMOVED_ENTRY_WITHOUT_REINSTALL');
  const diagnostic=await current.service.controller.request('/diagnostics',{});report.geometry=diagnostic.geometry;check(diagnostic.geometry.rejectedPositions===0,'NO_INVALID_NATIVE_COORDINATES');
  check(diagnostic.transitions.some(row=>row.type==='intro-start')&&diagnostic.transitions.some(row=>row.type==='intro-complete'),'NATIVE_STARTUP_EVENTS');checkpoint('activation-intro-launcher-passed');
  check((await wire('selectPack',{value:'whale-maid-night'})).ok,'PACK_SWITCH_WIRE');
  current=await waitFor(state=>state.ready&&state.pack.id==='whale-maid-night');check(current.state.settings.size===85&&current.state.settings.profile==='gentle','PACK_DEFAULTS_APPLIED');
  const exported=await wire('exportPack',{value:'whale-maid-night'});check(exported.ok,'PACK_EXPORT_WIRE');
  const custom=JSON.parse(exported.value.json);custom.id='workflow-custom-night';custom.name='流程验证 · 自定义夜色';
  check((await wire('importPack',{value:custom})).ok,'PACK_IMPORT_WIRE');check((await wire('selectPack',{value:custom.id})).ok,'CUSTOM_PACK_SELECTED');
  current=await waitFor(state=>state.ready&&state.pack.id===custom.id);check(current.state.packs.length===3,'CUSTOM_PACK_LISTED');
  check((await wire('action',{value:'eat'})).value?.action==='eat','ACTION_WIRE');
  await current.service.configure({size:85,autonomous:false});
  await current.service.replayIntro();
  const movedIntro={x:180,y:100,width:1000,height:700};await current.service.syncHostWindow(movedIntro);current={service:service(),state:await service().status()};check(JSON.stringify(current.state.startup.bounds)===JSON.stringify(movedIntro),'PLAYING_INTRO_FOLLOWS_DSH_RESIZE');
  await current.service.configure({startupEnabled:false});check(!(await service().status()).startup.playing,'DISABLING_STARTUP_CLOSES_PLAYING_INTRO');await service().configure({startupEnabled:true});
  await service().replayIntro();current=await waitFor(state=>state.ready&&state.phase==='ready'&&state.startup.completions>=2);check(true,'REPLAY_INTRO_COMPLETED');checkpoint('packs-actions-replay-passed');
  let privateDownload={file:artifact};
  if(!prepared){await current.service.checkUpdate();await current.service.downloadUpdate();current={service:service(),state:await service().status()};check(current.state.download?.verified,'PRIVATE_PACKAGE_DOWNLOADED');privateDownload=JSON.parse(fs.readFileSync(path.join(stateDir,'download.json')));check(fs.existsSync(privateDownload.file),'PRIVATE_DOWNLOAD_EXISTS');checkpoint('private-distribution-passed');}
  await current.service.replayIntro();check((await service().status()).startup.playing,'DISABLE_WHILE_ANIMATION_PLAYING');
  const disabled=await manager.setBundleEnabled(packageName,false);await delay(500);check(disabled.application==='applied'&&!alive(petPid),'DISABLE_STOPS_PET');check(!fs.existsSync(current.state.launcher.path),'DISABLE_REMOVES_LAUNCHER');
  check(!JSON.parse(fs.readFileSync(path.join(profileDir,'package.json'))).dsh.profile.bundles.includes(packageName),'DSH_PLUGIN_LIST_FLAG_DISABLED');
  await manager.setBundleEnabled(packageName,true);current=await waitFor(state=>state.ready&&state.phase==='ready'&&state.launcher.installed,'REENABLE_ENTRY_NOT_READY');petPid=current.state.pid;
  check(!current.state.startup.playing&&current.state.startup.completions===0,'REENABLE_DOES_NOT_FORCE_INTRO');
  check(!(await current.service.controller.request('/diagnostics',{})).transitions.some(row=>row.type==='intro-start'),'REENABLE_HAS_NO_INTRO_EVENT');
  check(current.state.settings.packId===custom.id&&current.state.settings.size===85&&!current.state.settings.autonomous,'REENABLE_PRESERVES_CONFIG');check(current.state.license.active&&current.state.launcher.installed,'REENABLE_RESTORES_AUTH_AND_ENTRY');checkpoint('disable-reenable-passed');
  await current.service.deactivate();check(!(await service().status()).license.active&&!alive(petPid),'UNBIND_STOPS_AND_RELEASES');
  await current.service.activate(issued.code);current=await waitFor(state=>state.ready&&state.phase==='ready');petPid=current.state.pid;
  await admin('/admin/revoke',{licenseId:issued.licenseId});await current.service.refreshLicense();check(!(await service().status()).license.active&&!alive(petPid),'REVOKE_STOPS_PET');checkpoint('unbind-revoke-passed');
  const restoredLicense=await admin('/admin/issue',{label:'isolated reinstall recovery',devices:1,days:licenseDays});
  await service().activate(restoredLicense.code);current=await waitFor(state=>state.ready&&state.phase==='ready');petPid=current.state.pid;
  await manager.setBundleEnabled(packageName,false);const removed=await manager.removeBundle(packageName);check(removed.application==='applied'&&!alive(petPid),'UNINSTALL_APPLIED');
  const reinstalled=await manager.installBundle(privateDownload.file,{enabled:true});check(reinstalled.application==='applied'&&!reinstalled.error,prepared?'PREPARED_PACKAGE_REINSTALL_APPLIED':'PRIVATE_DOWNLOAD_REINSTALL_APPLIED');
  current=await waitFor(state=>state.ready&&state.phase==='ready'&&state.launcher.installed,'REINSTALL_ENTRY_NOT_READY');petPid=current.state.pid;
  check(current.state.license.active&&current.state.settings.packId===custom.id&&current.state.settings.size===85,'REINSTALL_PRESERVES_LICENSE_AND_PACK');checkpoint('reinstall-recovery-passed');
  check(current.state.version===version&&current.state.desktopVersion===version,'REINSTALL_USES_EXPECTED_PUBLIC_PACKAGE');
  if(permanent)check(current.state.license.permanent===true&&current.state.license.expiresAt===null,'REINSTALL_PRESERVES_PERMANENT_LICENSE');
  const launcherPath=current.state.launcher.path;
  await ctx.fiber.dispose();application=undefined;await delay(500);check(!alive(petPid),'HOST_EXIT_STOPS_PET');check(fs.existsSync(launcherPath),'HOST_EXIT_KEEPS_NEXT_LAUNCH_ENTRY');
  if(process.argv.includes('--cold-start')){
    report.coldStarts=[];
    for(const [mode,after,key] of [['on-toggle','keep','COLD_START_AND_WARM_TOGGLE_DISTINGUISHED'],['on','off','NEXT_DSH_START_PLAYS_ONCE'],['off','on','COLD_START_RESPECTS_DISABLED_ANIMATION']]){
      let output;
      try{output=(await promisify(execFile)(process.execPath,['scripts/verify-cold-profile.mjs',home,profileDir,mode,after],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},timeout:60000,maxBuffer:2*1024*1024})).stdout;}
      catch(error){output=error.stdout||'';}
      let result;try{result=JSON.parse(output);}catch{result={passed:false,failure:'COLD_PROCESS_FAILED'};}
      report.coldStarts.push(result);check(result.passed,key);
    }
    checkpoint('cold-start-and-toggle-passed');
  }
  report.passed=Object.values(report.checks).every(Boolean);
}catch(error){report.passed=false;report.failure={type:error?.constructor?.name||'Error',code:/^[A-Z_]+$/.test(error.message||'')?error.message:'WORKFLOW_FAILED',transportCode:error.cause?.cause?.code||error.cause?.code};checkpoint('failed');try{await application?.ctx.fiber.dispose();}catch{}}
if(cloud){report.endpoint=serviceConfig.serviceUrl;report.temporaryLicensesRevoked=true;for(const licenseId of issuedIds){try{await admin('/admin/revoke',{licenseId});}catch{try{await remoteAdmin('revoke',{licenseId});}catch{report.temporaryLicensesRevoked=false;report.passed=false;}}}}
await disposeNetwork?.();
checkpoint('finished');fs.writeSync(1,JSON.stringify(report,null,2)+'\n');process.exit(report.passed?0:1);
