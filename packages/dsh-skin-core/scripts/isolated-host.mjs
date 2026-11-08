// Run using the official DSH executable in Node mode. Everything writable lives under .local.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createLicenseService} from '../../../licensing/server.mjs';
import {isolateOpenPaths,startupFixtures} from './startup-fixtures.mjs';
import {atomicJson} from '../src/state.mjs';
import net from 'node:net';
import {syncBuiltinESMExports} from 'node:module';
const raceFixtures=process.argv.includes('--race-fixtures'),configFixtures=process.argv.includes('--config-fixtures');
const modelFixtures=process.argv.includes('--model-fixtures');
const immersionFixture=process.argv.includes('--immersion-fixture'),libraryFixture=process.argv.includes('--library-fixture'),infoFile=immersionFixture?'.local/skin-immersion-current.json':libraryFixture?'.local/skin-library-current.json':'.local/skin-foundation-current.json';
if(immersionFixture){const connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){let v=args[0];if(Array.isArray(v))v=v[0];const host=typeof v==='object'?v.host??v.hostname:typeof args[1]==='string'?args[1]:undefined;if(host&&!['localhost','127.0.0.1','::1','[::1]'].includes(host))throw new Error('ISOLATED_NETWORK_ONLY');return Reflect.apply(connect,this,args);};syncBuiltinESMExports();}
const resume=process.argv.includes('--resume'),skinDirs=process.argv.slice(2).filter(x=>!x.startsWith('--'));
const project=process.cwd(),sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh',official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const home=resume?JSON.parse(fs.readFileSync(path.join(project,infoFile))).home:path.join(project,'.local/skin-foundation-'+Date.now());
if(!home.startsWith(path.join(project,'.local/skin-foundation-')))throw new Error('ISOLATION_REQUIRED');
const profileDir=path.join(home,'profiles/skin'),stateDir=path.join(home,'companion',createHash('sha256').update(profileDir).digest('hex').slice(0,16));
fs.mkdirSync(home,{recursive:true,mode:0o700});fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
process.env.DSH_HOME=home;process.env.DSH_TELEMETRY_DISABLED='1';
const service=await createLicenseService({stateDir:path.join(home,'license-service')});
const config={serviceUrl:'http://127.0.0.1:'+service.port,publicKey:service.publicKey,supportedDsh:['0.2.1-rc.5']};
const staged=path.join(home,'plugin');fs.cpSync(path.join(project,'packages/dsh-companion'),staged,{recursive:true,filter:source=>!/[\\/](runtime|runtime-bundles|node_modules|bin)([\\/]|$)/.test(source)});
const native=path.join(staged,'runtime/darwin-arm64/DSHCompanion.app');fs.mkdirSync(path.dirname(native),{recursive:true});execFileSync('/usr/bin/ditto',[path.join(project,'packages/dsh-companion/runtime/darwin-arm64/DSHCompanion.app'),native]);
fs.writeFileSync(path.join(staged,'config/service.json'),JSON.stringify(config));fs.writeFileSync(path.join(native,'Contents/Resources/app/config/service.json'),JSON.stringify(config));
fs.mkdirSync(path.join(staged,'node_modules'),{recursive:true});
const copyAsar=(source,target)=>{if(fs.statSync(source).isDirectory()){fs.mkdirSync(target,{recursive:true});for(const name of fs.readdirSync(source))copyAsar(path.join(source,name),path.join(target,name));}else fs.writeFileSync(target,fs.readFileSync(source));};
copyAsar(sdk+'/node_modules/undici',path.join(staged,'node_modules/undici'));
copyAsar(sdk+'/node_modules/fflate',path.join(staged,'node_modules/fflate'));
const candidateVersion=process.argv.find(x=>x.startsWith('--candidate-version='))?.split('=')[1];
if(candidateVersion){
  if(!/^0\.1\.0-dev\.\d+$/.test(candidateVersion))throw new Error('CANDIDATE_VERSION_INVALID');
  for(const file of [path.join(staged,'package.json'),path.join(native,'Contents/Resources/app/package.json')]){const pkg=JSON.parse(fs.readFileSync(file));pkg.version=candidateVersion;fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');}
}
if(!fs.existsSync(path.join(staged,'node_modules/@deepseek-ai'))&&!fs.lstatSync(path.join(staged,'node_modules/@deepseek-ai'),{throwIfNoEntry:false}))fs.symlinkSync(sdk+'/node_modules/@deepseek-ai',path.join(staged,'node_modules/@deepseek-ai'));
for(const dir of skinDirs){const {loadSkin,prepareResources}=await import('../src/index.mjs');const skin=loadSkin(dir);prepareResources(skin);fs.cpSync(dir,path.join(staged,'skins',skin.manifest.id),{recursive:true});}
// Prevent fixture animation completion from opening the user's real DSH application.
const nativeMain=path.join(native,'Contents/Resources/app/main.mjs');let nativeSource=isolateOpenPaths(fs.readFileSync(nativeMain,'utf8'));
if(process.argv.includes('--startup-fixtures'))nativeSource=startupFixtures(nativeSource);
if(raceFixtures)nativeSource=nativeSource.replace('isReady:token=>ready&&packToken===token',"isReady:token=>ready&&packToken===token&&!existsSync(join(stateDir,'test-hold-ready'))").replace("    authorization();\n    if(route==='/skin/startup/apply')","    if(route==='/test/skin-stop'){skin.requestStop();return skin.status();}\n    authorization();\n    if(route==='/skin/startup/apply')");
if(configFixtures){
  nativeSource=nativeSource.replaceAll('screen.getCursorScreenPoint()','configFixtureCursor()').replace('halfWidth:92,petHeight:235});','halfWidth:92,petHeight:235,random:()=>0.1});');
  nativeSource += "\nfunction configFixtureCursor(){const value=readJson(join(stateDir,'test-cursor.json'),null);return value&&workArea?{x:workArea.x+value.x,y:workArea.y+value.y}:screen.getCursorScreenPoint();}\n";
  nativeSource=nativeSource.replace("    authorization();\n    if(route==='/skin/startup/apply')","    if(route==='/test/behavior')return {profile:model.profile,autonomous:model.autonomous,follow:model.follow,x:model.x,y:model.y,target:model.target,action:model.action,remaining:model.remaining,workArea,halfWidth:model.halfWidth,petHeight:model.petHeight};\n    authorization();\n    if(route==='/skin/startup/apply')");
  nativeSource=nativeSource.replace("    authorization();\n    if(route==='/skin/startup/apply')","    if(route==='/test/pet'){if(input.click)await window.webContents.executeJavaScript(\"window.companion.interact('react')\");if(input.capture){const shot=await window.webContents.capturePage(),size=shot.getSize(),bitmap=shot.toBitmap(),scale=size.width/window.getBounds().width;let left=size.width,top=size.height,right=-1,bottom=-1;for(let y=Math.ceil((50+(pack.canvasOffsetY||0)*settings.size/100)*scale);y<size.height;y++)for(let x=0;x<size.width;x++)if(bitmap[(y*size.width+x)*4+3]>128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}writeJson(join(stateDir,'pet-capture.json'),{png:shot.toPNG().toString('base64'),body:{scale,pixelBounds:{left,top,right,bottom},cssHeight:(bottom-top+1)/scale,cssWidth:(right-left+1)/scale,groundGap:workArea.y+model.y-window.getBounds().y-(bottom+1)/scale}});}return {bubble:await window.webContents.executeJavaScript(\"({ariaLabel:document.querySelector('#pet').getAttribute('aria-label'),title:document.title,text:document.querySelector('#bubble').textContent,shown:document.querySelector('#bubble').classList.contains('show'),action:document.querySelector('video.visible')?.dataset.action,videos:[...document.querySelectorAll('video')].map(v=>({id:v.dataset.action,width:v.videoWidth,height:v.videoHeight,currentTime:v.currentTime,paused:v.paused,fit:getComputedStyle(v).objectFit,source:new URL(v.src).pathname})),canvas:document.querySelector('#clips').getBoundingClientRect().toJSON()})\"),interaction:lastInteraction,menu:updateMenu().items.map(x=>({label:x.label,enabled:x.enabled}))};}\n    authorization();\n    if(route==='/skin/startup/apply')");
}
fs.writeFileSync(nativeMain,nativeSource);
const {loadProfileDirectory,loadLayeredEnv,initProfile,PROFILE_TEMPLATES}=await import(official('dsh-app-boot/lib/index.js'));
const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
if(!resume)initProfile(profileDir,[...PROFILE_TEMPLATES.web.bundles,'dsh-plugin-companion']);
const packageFile=path.join(profileDir,'package.json'),pkg=JSON.parse(fs.readFileSync(packageFile));pkg.dependencies['dsh-plugin-companion']='file:'+staged;fs.writeFileSync(packageFile,JSON.stringify(pkg));fs.mkdirSync(path.join(profileDir,'node_modules'),{recursive:true});if(!fs.existsSync(path.join(profileDir,'node_modules/dsh-plugin-companion')))fs.symlinkSync(staged,path.join(profileDir,'node_modules/dsh-plugin-companion'));
if(!resume)fs.writeFileSync(path.join(stateDir,'settings.json'),JSON.stringify({schemaVersion:1,settings:{autoStart:false,launcherEnabled:false,startupEnabled:false}}));
const log=fs.openSync(path.join(home,'host.log'),'a',0o600);process.stdout.write=(data)=>{fs.writeSync(log,data);return true;};process.stderr.write=process.stdout.write;
let application;const report={scope:'isolated official Host + official web client + staged native runtime',target:'0.2.1-rc.5',userProfileChanged:false,modelCalls:0,remoteDeployment:false,checks:{}};
try{
  const installAnchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json',profile=loadProfileDirectory('dsh',profileDir,installAnchor),environment=loadLayeredEnv('dsh');
  application=await runProfile({environment,profile:'skin',resolvedProfile:{profile,installAnchor},patchFiles:[],args:['--no-open','--host','127.0.0.1','--port','0'],packageManager:{command:process.execPath,args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath}}});
  const ctx=application.ctx;let companion;for(let i=0;i<100;i++){companion=ctx.get('dshCompanion');if(companion)break;await new Promise(r=>setTimeout(r,100));}if(!companion)throw new Error('COMPANION_NOT_LOADED');
  if(process.argv.includes('--example-fixtures'))for(const name of ['a','b']){const sample=companion.controller.skins.registerDirectory(path.join(project,'packages/dsh-skin-core/examples',name));companion.controller.skins.examples.add(sample.manifest.id);}
  if(modelFixtures){
    const baseline=await companion.petModels();
    fs.writeFileSync(path.join(home,'model-environment.json'),JSON.stringify({configuredModelCount:baseline.models.length,current:baseline.current,reason:baseline.reason,externalModelCalls:0}));
    const {LlmAdapter}=await import(official('dsh-llm/lib/index.js'));
    const requests=[];
    class FixtureAdapter extends LlmAdapter {
      listModels(){return Promise.resolve([{provider:'companion-fixture',id:'pet-test',name:'受控模型夹具'}]);}
      async *stream(options){
        const text=options.messages[0].content.find(x=>x.type==='text').text,input=JSON.parse(text.split('\n').at(-1));
        requests.push({input,provider:options.provider,model:options.model,sessionId:options.sessionId,at:Date.now()});
        fs.writeFileSync(path.join(home,'pet-model-requests.json'),JSON.stringify(requests,null,2));
        // Intentional late provider: the production caller must suppress it.
        while(fs.existsSync(path.join(stateDir,'test-model-hold')))await new Promise(resolve=>setTimeout(resolve,50));
        if(fs.existsSync(path.join(stateDir,'test-model-fail'))){yield {type:'finish',reason:{kind:'error',failure:{code:'AUTH',message:'controlled model failure'}}};return;}
        const previous=input.recent.at(-1)?.actual.action;
        const selected=input.capabilities.actions.find(x=>x.id===(previous==='react'?'stretch':'react'))?.id||input.capabilities.actions.find(x=>x.id!==previous)?.id||null;
        const quiet=input.user.includes('安静'),invalid=input.user.includes('无效');
        const decision={speech:quiet?null:input.capabilities.speech?(previous?'这次换个动作。':'我在这里，陪你慢慢来。'):null,action:invalid?'fly':quiet?null:selected};
        yield {type:'text-delta',index:0,text:JSON.stringify(decision)};
        yield {type:'finish',reason:{kind:'stop'}};
      }
    }
    ctx.llm.registerAdapter(['companion-fixture'],new FixtureAdapter());
    const selection=ctx.get('agentDefaultModel');if(selection)selection.currentSelection=()=>({provider:'companion-fixture',model:'pet-test'});
  }
  const issue=await fetch(config.serviceUrl+'/admin/issue',{method:'POST',headers:{authorization:'Bearer '+service.adminToken,'Content-Type':'application/json'},body:JSON.stringify({label:'isolated skin foundation',devices:1,days:1})}).then(r=>r.json());
  if(!companion.controller.entitlement.status().active)await companion.activate(issue.code);
  const immersion=immersionFixture?await (await import('./immersion-fixtures.mjs')).installImmersionFixtures({ctx,companion,official,home,candidate:JSON.parse(fs.readFileSync(path.join(project,'.local/skin-immersion-content-current.json'))).root}):null;
  if(raceFixtures){
    const originalSelect=companion.controller.skins.select.bind(companion.controller.skins);
    companion.controller.skins.select=async value=>{const result=await originalSelect(value);for(let i=0;i<300&&fs.existsSync(path.join(stateDir,'test-hold-select-response'));i++)await new Promise(r=>setTimeout(r,50));return result;};
  }
  const url=fs.readFileSync(path.join(home,'host.log'),'utf8').matchAll(/dsh web: (http:\/\/[^\s]+)/g);const hostUrls=[...url];const currentUrl=hostUrls.at(-1)?.[1];if(!currentUrl)throw new Error('HOST_URL_MISSING');
  const publicInfo={home,profileDir,stateDir,url:currentUrl,staged,pid:process.pid};
  fs.writeFileSync(path.join(project,infoFile),JSON.stringify(publicInfo));
  fs.writeSync(1,JSON.stringify({ready:true,home})+'\n');
  const commands=path.join(home,'commands');fs.mkdirSync(commands,{recursive:true});
  let quitting=false;
  while(!quitting){
    for(const file of fs.readdirSync(commands).filter(x=>x.endsWith('.request.json'))){
      const input=JSON.parse(fs.readFileSync(path.join(commands,file)));fs.unlinkSync(path.join(commands,file));
      try{
        let value;
        if(input.method==='status')value=await companion.status();
        else if(immersion&&input.method.startsWith('activity'))value=await immersion.command(input.method,input.value);
        else if(input.method==='installSkin')value=await companion.skinInstall();
        else if(input.method==='libraryFailNextTheme'&&libraryFixture){const adapter=companion.controller.skins.core.adapters.theme,prepare=adapter.prepare.bind(adapter);let pending=true;adapter.prepare=async c=>{if(pending&&c.contentKey===input.value){pending=false;throw new Error('SKIN_LIBRARY_PROBE_FAILURE');}return prepare(c);};value={armed:true};}
        else if(input.method==='select')value=await companion.skinSelect(input.value);
        else if(input.method==='stop')value=await companion.skinStop();
        else if(input.method==='configure')value=await companion.skinConfigure(input.value);
        else if(input.method==='disable')value=await companion.skinDisable(input.value);
        else if(input.method==='reset')value=await companion.skinReset();
        else if(input.method==='legacyConfigure')value=await companion.configure(input.value);
        else if(input.method==='register')value=companion.controller.skins.registerDirectory(input.value).manifest.id;
        else if(input.method==='native')value=await companion.controller.request('/diagnostics',{});
        else if(input.method==='petInteract')value=await companion.petInteract(input.value);
        else if(input.method==='petModels')value=await companion.petModels();
        else if(input.method==='workspaceSeed'){const {seedWorkspace}=await import('./workspace-fixture.mjs');value=await seedWorkspace({ctx,official});}
        else if(input.method==='pluginDisable')value=await ctx.get('pluginManager').setBundleEnabled('dsh-plugin-companion',false);
        else if(input.method==='pluginEnable'){value=await ctx.get('pluginManager').setBundleEnabled('dsh-plugin-companion',true);for(let i=0;i<100;i++){const next=ctx.get('dshCompanion');if(next){companion=next;break;}await new Promise(r=>setTimeout(r,100));}}
        else if(input.method==='quit'){quitting=true;value={quitting:true};}
        else throw new Error('UNKNOWN_TEST_COMMAND');
        // Reports/receipts contain no license, device, bridge token or conversation data.
        if(value?.license)value={skin:value.skin,desktopSkin:value.desktopSkin,petInteraction:value.petInteraction,ready:value.ready,running:value.running,startup:value.startup,settings:value.settings,desktopVersion:value.desktopVersion,window:value.window,interaction:value.interaction,availableActions:value.availableActions};
        atomicJson(path.join(commands,file.replace('.request.json','.response.json')),{ok:true,value});
      }catch(e){atomicJson(path.join(commands,file.replace('.request.json','.response.json')),{ok:false,error:e.code||e.message});}
    }
    await new Promise(r=>setTimeout(r,100));
  }
}catch(e){fs.writeSync(1,JSON.stringify({ready:false,error:e.message,home})+'\n');process.exitCode=1;}
finally{try{await application?.ctx.fiber.dispose();}catch{}await service.close();}
process.exit();
