import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
import {FocusTimer} from '../packages/dsh-companion/src/focus.mjs';
import {CompanionController} from '../packages/dsh-companion/src/controller.mjs';
import {signedEnvelope} from '../packages/dsh-companion/src/license-core.mjs';
import {writeJson} from '../packages/dsh-companion/src/storage.mjs';

const keys=generateKeyPairSync('ed25519'),dshVersion='0.2.1-rc.5';
const clientSource=fs.readFileSync(new URL('../packages/dsh-companion/client.js',import.meta.url),'utf8');
const locale=JSON.parse(fs.readFileSync(new URL('../packages/dsh-companion/locale/zh.json',import.meta.url)));

// Execute the generated Page with controlled hooks. This verifies the actual
// account markup and RPC handlers, without a browser, user profile or native app.
async function accountPage(state,invoke=async()=>state){
  let definition,Page,cursor=0;const pending=[],calls=[];
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),Fragment:'fragment',useEffect(){},useRef:current=>({current}),useState:initial=>[cursor++===0?state:cursor===2?'account':initial,()=>{}]};
  vm.runInNewContext(clientSource,{window:{__ModuleLoader__:{load:value=>{definition=value;}}}});
  const theme={getTheme:()=>({active:{colorScheme:'light'}})};
  const ctx={locale:{bind:()=>key=>locale[key]||key},get:key=>key==='theme'?theme:null,effect(){},inject:(_,callback)=>callback(ctx),remote:{$mount:async()=>{},dshCompanion:new Proxy({},{get:(_,method)=>value=>{
    calls.push(method);const result=Promise.resolve().then(()=>invoke(method,value)).then(value=>({ok:true,value}),error=>({ok:false,error:{message:error.message}}));pending.push(result);return result;
  }})},slots:{inject:(_,callback)=>callback(),register:(meta,component)=>{if(meta.name==='main')Page=component;}}};
  definition.factory(name=>name==='react'?React:{z:{json(){}}}).apply(ctx);
  await new Promise(resolve=>setImmediate(resolve));assert.ok(Page);
  const tree=Page(),all=[];
  function walk(node){if(node==null||node===false)return;if(Array.isArray(node)){node.forEach(walk);return;}if(typeof node==='object'){all.push(node);node.children?.forEach(walk);}}
  walk(tree);
  const text=node=>Array.isArray(node)?node.map(text).join(''):typeof node==='object'&&node?text(node.children):node===false||node==null?'':String(node);
  return {all,text,tree,calls,async settled(){await Promise.all(pending);await new Promise(resolve=>setImmediate(resolve));}};
}

for(const [build,relation,label] of [[10,'older',null],[18,'same','下载同版以重装'],[19,'newer','下载更新']])test(`installed18/channel${build}/history4: display and Host download agree`,async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-update-targeted-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const artifact=Buffer.from('controlled package '+build),deviceId=createHash('sha256').update('update-test-device').digest('hex'),now=Date.now();
  const release={id:'fixture-'+build,product:'dsh-companion',platform:'darwin-arm64',channel:'private',version:'0.1.0-dev.'+build,build,supportedDsh:[dshVersion],filename:'dsh-companion-0.1.0-dev.'+build+'.tgz',sha256:createHash('sha256').update(artifact).digest('hex'),size:artifact.length};
  const network=[];
  const entitlement=new Entitlement({stateDir:dir,deviceId,config:{serviceUrl:'https://fixture.invalid',publicKey:keys.publicKey},fetcher:async url=>{
    const route=new URL(url).pathname;network.push(route);
    if(route==='/v1/releases/latest')return Response.json({manifest:signedEnvelope(release,keys.privateKey)});
    if(route==='/v1/releases/download')return new Response(artifact);
    throw new Error('unexpected route');
  }});
  entitlement.save(signedEnvelope({format:2,product:'dsh-companion',licenseId:'fixture-license',deviceId,entitlements:['companion'],issuedAt:now,offlineUntil:now+86400000,renewAfter:now+3600000,permanent:true,expiresAt:null},keys.privateKey));
  const licenseBefore=fs.readFileSync(entitlement.file);
  const historicalFile=path.join(dir,'downloads/dev4.tgz');fs.mkdirSync(path.dirname(historicalFile));fs.writeFileSync(historicalFile,'historical package');
  writeJson(path.join(dir,'download.json'),{version:'0.1.0-dev.4',file:historicalFile,verified:true});const historyBefore=fs.readFileSync(path.join(dir,'download.json'));
  const host={stateDir:dir,focus:new FocusTimer(dir),build:18,dshVersion,entitlement,config:{supportedDsh:[dshVersion]},nativeStatus:async()=>({running:false,settings:{}}),skins:{status:()=>({})},packs:{summaries:()=>[]},integration:{status:()=>({})},status(){return CompanionController.prototype.status.call(this);}};
  const status=await CompanionController.prototype.checkUpdate.call(host);
  assert.equal(status.update.relation,relation);assert.equal(status.update.available,build>18);assert.equal(status.download.version,'0.1.0-dev.4');
  // Source metadata deliberately stays dev.11; the installed18 label is fixture
  // input, while the real controller and entitlement execute with build18.
  const page=await accountPage({...status,version:'0.1.0-dev.18'},method=>method==='downloadUpdate'?CompanionController.prototype.downloadUpdate.call(host):status);
  const update=page.all.find(node=>node.props['data-update-panel']),history=page.all.find(node=>node.props['data-download-history']);
  assert.ok(page.text(update).includes('已安装版本： 0.1.0-dev.18'));assert.ok(page.text(update).includes('服务通道提供版本： 0.1.0-dev.'+build));
  assert.equal(page.text(update).includes('当前适配版本'),false);assert.equal(page.text(update).includes('dev.4'),false);assert.ok(page.text(history).includes('历史文件版本： 0.1.0-dev.4'));
  assert.ok(page.text(history).includes('不代表当前可用更新'));const reveal=page.all.find(node=>node.type==='button'&&page.text(node)==='查看历史文件');assert.ok(reveal);reveal.props.onClick();await page.settled();assert.equal(page.calls.at(-1),'revealDownload');
  const packageButton=page.all.find(node=>node.type==='button'&&['下载更新','下载同版以重装'].includes(page.text(node)));
  if(build<18){
    assert.equal(packageButton,undefined);assert.ok(page.text(update).includes('版本较旧，无需更新'));
    await assert.rejects(CompanionController.prototype.downloadUpdate.call(host),/UPDATE_DOWNGRADE_BLOCKED/);
    assert.equal(network.includes('/v1/releases/download'),false);assert.deepEqual(fs.readFileSync(path.join(dir,'download.json')),historyBefore);
  }else{
    assert.equal(page.text(packageButton),label);assert.equal(packageButton.props.disabled,false);
    packageButton.props.onClick();await page.settled();assert.equal(page.calls.at(-1),'downloadUpdate');assert.equal(network.filter(route=>route==='/v1/releases/download').length,1);
    const record=JSON.parse(fs.readFileSync(path.join(dir,'download.json')));assert.equal(record.version,release.version);assert.deepEqual(fs.readFileSync(record.file),artifact);
  }
  assert.deepEqual(fs.readFileSync(entitlement.file),licenseBefore);assert.equal(fs.readFileSync(historicalFile,'utf8'),'historical package');
});

test('unchecked channel offers checking, retains history and makes no download recommendation',async()=>{
  const page=await accountPage({version:'0.1.0-dev.18',license:{active:true},download:{version:'0.1.0-dev.4',filename:'dev4.tgz'}});
  const buttons=page.all.filter(node=>node.type==='button').map(node=>page.text(node));
  assert.ok(buttons.includes('检查更新'));assert.ok(buttons.includes('查看历史文件'));assert.equal(buttons.includes('下载更新'),false);assert.equal(buttons.includes('下载同版以重装'),false);
});

test('the 1.0 build treats accepted development releases as older updates',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-stable-version-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const controller=new CompanionController({stateDir:dir,profileDir:dir,dshVersion,deviceId:'a'.repeat(64),config:{serviceUrl:'https://fixture.invalid',publicKey:keys.publicKey,supportedDsh:[dshVersion]}});
  controller.nativeStatus=async()=>({running:false,settings:{}});
  controller.entitlement.latest=async()=>({release:{version:'0.1.0-dev.47',build:47}});
  assert.ok(controller.build>48);
  const status=await controller.checkUpdate();assert.equal(status.update.relation,'older');assert.equal(status.update.available,false);
});
