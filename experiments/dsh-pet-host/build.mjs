import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {root,lab,stage,report} from './setup.mjs';
import {validateCandidateMap} from './candidate-map.mjs';
const source=path.join(root,'experiments/dsh-pet-host'),plugin=path.join(stage,'packages/dsh-companion'),runtime=path.join(stage,'runtime-src');
// Reuse an existing local test authority and signed receipt; no issue/activate
// calls and no production licensing configuration changes.
const originalService=JSON.parse(fs.readFileSync(path.join(root,'packages/dsh-companion/config/service.json'))),testAuthority=JSON.parse(fs.readFileSync(path.join(root,'.local/license-service/service.json')));
fs.writeFileSync(path.join(plugin,'config/service.json'),JSON.stringify({...originalService,serviceUrl:testAuthority.serviceUrl,publicKey:testAuthority.publicKey,mode:'private-local-existing-authority'},null,2)+'\n');
const sha=data=>createHash('sha256').update(data).digest('hex'),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const map=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/source-geometry.json')));
const original=JSON.parse(fs.readFileSync(path.join(root,'designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready/skin.json')));
const candidate=structuredClone(original);Object.assign(candidate,{id:'archive-master04-private',version:'0.1.0',name:'母版04 · 隔离桌面接入',description:'私有运行候选：原生呼吸与侧头、独立书杯，复用现有档案主题和开场；未包含新步态。'});
const candidateDir=path.join(lab,'content/archive-master04-private');fs.mkdirSync(path.join(candidateDir,'assets'),{recursive:true});
for(const [id,a]of Object.entries(candidate.assets)){
 if(id.startsWith('whale-'))delete candidate.assets[id];
 else fs.copyFileSync(path.join(root,'designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready',a.path),path.join(candidateDir,a.path));
}
for(const [id,file,width,height,mime]of [['master-idle','master-idle.webm',640,360,'video/webm'],['master-react','master-react.webm',640,360,'video/webm'],['book-prop','book.png',512,481,'image/png'],['cup-prop','cup.png',512,397,'image/png']]){
 const data=fs.readFileSync(path.join(lab,'backend-template',file));fs.writeFileSync(path.join(candidateDir,'assets',file),data);
 candidate.assets[id]={path:'assets/'+file,mime,sha256:sha(data),bytes:data.length,width,height,alpha:true,source:'Derived from fixed geometry node; full source and prepared PNG hashes retained in runtime-candidates.json provenance',license:'Private isolated candidate only; no new public distribution or commercial rights grant.'};
}
candidate.modules.theme.configVersion=2;Object.assign(candidate.modules.theme.settings,{workFeedbackEnabled:{label:'工作反馈',default:true},petEchoEnabled:{label:'桌宠回应',default:true,showWhen:{field:'workFeedbackEnabled',equals:true}}});
Object.assign(candidate.modules.pet.config,{canvasHeight:350,canvasOffsetY:0,animations:{idle:{asset:'master-idle',seconds:2.5,loop:true},react:{asset:'master-react',seconds:1.5,loop:false}},actionDescriptions:{idle:'安静站立并轻轻呼吸',react:'轻轻侧头回应'},localReply:''});
candidate.modules.pet.settings.smartEnabled.default=false;candidate.modules.pet.settings.allowSpeech.default=false;
write(path.join(candidateDir,'skin.json'),candidate);
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(stage,'packages/dsh-skin-core/src/resources.mjs')));
const loaded=loadSkin(candidateDir);prepareResources(loaded);const candidateKey=loaded.contentKey;
const legacy=loadSkin(path.join(root,'designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready'));prepareResources(legacy);
if(legacy.contentKey!=='4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b')throw new Error('LEGACY_CONTENT_CHANGED');
const media=group=>Object.fromEntries(['idle','react'].map(action=>{const file=group+'-'+action+'.webm';return [action,{file,sha256:sha(fs.readFileSync(path.join(lab,'backend-template',file)))}];}));
const contents={
 [legacy.contentKey]:{name:legacy.manifest.name,group:'legacy',geometry:map.profiles.legacy071,media:media('legacy'),requiredAssets:Object.fromEntries(Object.values(legacy.manifest.modules.pet.config.animations).map(a=>[a.asset,legacy.manifest.assets[a.asset].sha256])),props:[]},
 [candidateKey]:{name:candidate.name,group:'master',geometry:map.profiles.master04,media:media('master'),requiredAssets:Object.fromEntries(['master-idle','master-react','book-prop','cup-prop'].map(id=>[id,candidate.assets[id].sha256])),props:[{id:'book',asset:'book-prop',referenceHeight:83,groundOffset:[-177,0],geometry:map.props.book},{id:'cup',asset:'cup-prop',referenceHeight:41,groundOffset:[-90,0],geometry:map.props.cup}]},
};
const registry={format:1,privateOnly:true,runtimeCandidate:true,fixtureContractAdoptedAsRuntime:false,skinSchemaExtensions:[],adapterOwnedFields:['contentKey binding','derived media hash','fixed geometry/hitRows','validated prop asset IDs and ground anchors'],provenance:{geometryMetadataSha256:sha(fs.readFileSync(path.join(lab,'backend-template/source-geometry.json'))),legacyKey:legacy.contentKey,newKey:candidateKey,manifestSnapshotSha256:sha(fs.readFileSync(path.join(root,'.local/dsh-pet-geometry-20261104/input-asset-manifest.json'))),layoutSnapshotSha256:sha(fs.readFileSync(path.join(root,'.local/dsh-pet-geometry-20261104/input-scene-layout.json')))},contents};
validateCandidateMap(registry);write(path.join(lab,'backend-template/runtime-candidates.json'),registry);write(path.join(plugin,'config/pet-backend-map.json'),registry);
fs.cpSync(candidateDir,path.join(plugin,'skins/archive-master04-private'),{recursive:true});
fs.copyFileSync(path.join(root,'experiments/dsh-pet-integration/native-lock.mjs'),path.join(source,'native-lock.mjs'));
for(const f of ['backend.mjs','native-lock.mjs','work-feedback.mjs','candidate-map.mjs','compatibility.mjs'])fs.copyFileSync(path.join(source,f),path.join(runtime,f));
fs.copyFileSync(path.join(source,'backend-entry.cjs'),path.join(lab,'backend-entry.cjs'));
// Preserve the existing startup renderer and state machine. Only its pet-window
// visibility calls and daily-app return are redirected to this private owner.
const oldMain=fs.readFileSync(path.join(root,'runtime-src/main.mjs'),'utf8');
let intro=oldMain.slice(oldMain.indexOf('async function showIntro()'),oldMain.indexOf('function attach('));
intro=intro.replace('window?.hide();','await backend.suspend();').replace("function finishIntro(trigger='automatic')","async function finishIntro(trigger='automatic')").replace('if(showPet()&&wantsPet)window.showInactive();','await releaseOpeningPet();').replace("void shell.openExternal('dsh://open').catch(()=>openDsh(false));","openDsh();").replace('!activeIntro.custom&&!ready','!activeIntro.custom&&!backend.ready');
intro=intro.replace('function cancelIntro(reason){\n  if(!introPlaying)return;',"function cancelIntro(reason){\n  if(['skin-stop','startup-disabled'].includes(reason))coldIntroPending=false;\n  if(!introPlaying){void releaseOpeningPet().catch(()=>{});return;}");
intro=intro.replace("event('intro-cancelled',{reason});sendState();","event('intro-cancelled',{reason});if(reason!=='skin-stop')void releaseOpeningPet().catch(()=>{});sendState();");
let main=fs.readFileSync(path.join(source,'runtime-main.mjs'),'utf8').replace('__INTRO_FUNCTIONS__',intro).replace("const showPet=()",'const wantsPet=true;\nconst showPet=()');
fs.writeFileSync(path.join(runtime,'main.mjs'),main);
let skin=fs.readFileSync(path.join(root,'runtime-src/skin.mjs'),'utf8');
skin=skin.replace('  invalidate(generation){','  async invalidate(generation){').replace('this.work.invalidate(generation);this.generation=generation;','this.generation=generation;await this.work.invalidate(generation);');
skin=skin.replace('  exit(generation){this.invalidate(generation);this.localRevision++;this.owned=true;this.visible=false;this.contentKey=null;this.resources={};this.pausedMedia=true;this.hide();return {generation,cleared:true};}',
 '  async exit(generation){this.localRevision++;this.owned=true;this.visible=false;this.contentKey=null;this.resources={};this.pausedMedia=true;await this.invalidate(generation);await this.hide();return {generation,cleared:true};}');
skin=skin.replace('    this.invalidate(generation);this.owned=true;this.visible=false;this.hide();','    await this.invalidate(generation);this.owned=true;this.visible=false;await this.hide();');
skin=skin.replace('this.manifest=manifest;this.apply({pack,config,token});','this.manifest=manifest;await this.apply({pack,config,token,resources,contentKey,generation,assertCurrent});').replace('if(this.isReady(token))','if(await this.isReady(token))');
skin=skin.replace('  requestStop(){','  async requestStop(){').replace('    this.work.cancel();','    void this.work.cancel().catch(()=>{});').replace('finally{this.hide({stop:true});}','finally{await this.hide({stop:true});}');
fs.writeFileSync(path.join(runtime,'skin.mjs'),skin);
let adapter=fs.readFileSync(path.join(root,'packages/dsh-skin-core/adapters/native.mjs'),'utf8');
adapter=adapter.replace('    this.controller.packs.get(config.builtinPack);',"    this.controller.packs.get(config.builtinPack);\n    const registry=JSON.parse(fs.readFileSync(path.join(this.controller.configRoot,'pet-backend-map.json')));if(!registry.contents[skin.contentKey])fail('BACKEND_CONTENT_NOT_REGISTERED');");
fs.writeFileSync(path.join(stage,'packages/dsh-skin-core/adapters/native.mjs'),adapter);
let controller=fs.readFileSync(path.join(root,'packages/dsh-companion/src/controller.mjs'),'utf8');
controller=controller.replace("    this.config=config||readJson(join(packageRoot,'config/service.json'));","    this.configRoot=join(packageRoot,'config');\n    this.config=config||readJson(join(packageRoot,'config/service.json'));");
controller=controller.replace('skinStandby=false','skinStandby=true').replace("DSH_COMPANION_MODE:'managed'","DSH_HOST_PET_LAB:process.env.DSH_HOST_PET_LAB,DSH_COMPANION_MODE:'managed'").replace("this.request('/shutdown',{})","this.request('/shutdown',{},12000)");
controller=controller.replace('  async boot({playIntro=false}={}){','  async boot({playIntro=false}={}){\n    this.bootIntroRequested=playIntro&&this.settings().autoStart&&this.settings().startupEnabled;');
controller=controller.replace("DSH_COMPANION_PLAY_INTRO:playIntro?'1':'0'","DSH_COMPANION_PLAY_INTRO:playIntro||this.bootIntroRequested?'1':'0'").replace('this.child=child;','this.child=child;this.bootIntroRequested=false;');
fs.writeFileSync(path.join(plugin,'src/controller.mjs'),controller);
// On cold start the video clock begins after decoding. The old remaining-time
// estimate was taken before that reset and could invalidate a still-playing
// opening. Keep the existing completion/identity loop within its stage budget.
let skins=fs.readFileSync(path.join(root,'packages/dsh-companion/src/skins.mjs'),'utf8');
skins=skins.replace("const deadline=Date.now()+Math.min(15000,Math.max(0,(live.startup?.durationSeconds||0)-(live.startup?.elapsedSeconds||0))*1000)+1000;","const deadline=Date.now()+this.core.timeout;");
fs.writeFileSync(path.join(plugin,'src/skins.mjs'),skins);
// No scene polling service or experimental control UI: props and click intent
// live on the one selected native stage, with one narrowly scoped preload IPC.
const helper=path.join(lab,'dsh-pet/runtime/electron-helper');
let content=fs.readFileSync(path.join(root,'experiments/dsh-pet-geometry/content-adapter.js'),'utf8').split('  let disposed=false')[0].replaceAll('[geometry-input]','[pet-host-input]');
content+=`  const factor=sprite.size/profile.defaultSize,groundX=profile.ground[0]*unit,groundY=profile.ground[1]*unit;
  const layer=document.createElement('div');layer.dataset.companionProps='true';Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'2'});
  for(const item of profile.props||[]){const a=data.props[item.id],s=item.referenceHeight*factor/a.prepared_size[1],anchor=a.anchors.ground,img=document.createElement('img');img.dataset.prop=item.id;img.alt=item.id==='book'?'独立书本':'独立杯子';img.src='./content-assets/'+item.id+'.png';Object.assign(img.style,{position:'absolute',left:groundX+item.groundOffset[0]*factor-anchor[0]*s+'px',top:groundY+item.groundOffset[1]*factor-anchor[1]*s+'px',width:a.prepared_size[0]*s+'px',height:a.prepared_size[1]*s+'px',pointerEvents:'none'});layer.appendChild(img);}stage.appendChild(layer);
  sprite.hit.addEventListener('click',e=>{if(e.isTrusted&&!sprite.justDragged)window.petBridge.companionInteract();},{signal:traceAbort.signal});
  return {dispose(){traceAbort.abort();layer.remove();delete sprite.contentHitTest;delete sprite.contentBodyRects;delete sprite.contentProfile;delete stage.dataset.contentProfile;}};
 }
};\n`;
fs.writeFileSync(path.join(helper,'content-adapter.js'),content);
let html=fs.readFileSync(path.join(helper,'index.html'),'utf8').replace('./geometry-endpoint.js','./content-context.js');fs.writeFileSync(path.join(helper,'index.html'),html);
let preload=fs.readFileSync(path.join(helper,'preload.js'),'utf8');if(!preload.includes('companionInteract()'))preload=preload.replace("contextBridge.exposeInMainWorld('petBridge', {","contextBridge.exposeInMainWorld('petBridge', {\n  companionInteract() { ipcRenderer.send('companion:pet-input'); },");fs.writeFileSync(path.join(helper,'preload.js'),preload);
let menu=fs.readFileSync(path.join(helper,'sprite/menu.js'),'utf8');if(!menu.includes('DshCompanionContent?.managedHost'))menu=menu.replace('  onContextMenu(e) {','  onContextMenu(e) {\n    if(globalThis.DshCompanionContent?.managedHost){e.preventDefault();return;}');fs.writeFileSync(path.join(helper,'sprite/menu.js'),menu);
let builder=fs.readFileSync(path.join(root,'scripts/build-mac.mjs'),'utf8').replace('local.dsh.companion.development','local.dsh.pet-host.supervisor');fs.writeFileSync(path.join(stage,'scripts/build-mac.mjs'),builder);
// The top-level link is not used for writes or installs; Electron's official
// Host resolves peer packages below the staged plugin at launch time.
const topModules=path.join(stage,'node_modules');try{if(fs.lstatSync(topModules).isSymbolicLink()&&!fs.existsSync(topModules))fs.unlinkSync(topModules);}catch(e){if(e.code!=='ENOENT')throw e;}
for(const script of ['build-client.mjs','build-mac.mjs'])execFileSync(process.execPath,[path.join(stage,'scripts',script)],{cwd:stage,stdio:'pipe'});
write(path.join(report,'build.json'),{at:new Date().toISOString(),privateOnly:true,rootBuildOutputsChanged:false,standardBuildersRunIn:stage,candidateKey,legacyKey:legacy.contentKey,skinSchemaExtensions:[],adapterMapping:'config/pet-backend-map.json, exactly two validated content identities',oldPetBranchImported:false});
console.log(JSON.stringify({built:true,candidateKey,legacyKey:legacy.contentKey,privateOnly:true}));
