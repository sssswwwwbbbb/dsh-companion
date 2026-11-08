import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {zipSync} from 'fflate';
import {createLicenseService} from '../licensing/server.mjs';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
import {SkinLibrary} from '../packages/dsh-companion/src/skin-library.mjs';
import {signedEnvelope,verifiedEnvelope,verifyLicense} from '../packages/dsh-companion/src/license-core.mjs';
const manifest=(version='1.0.0')=>({formatVersion:2,id:'market-test',name:'测试皮肤',version,dshVersions:['0.2.2-rc.1'],assets:{},modules:{theme:{interfaceVersion:1,configVersion:1,required:true,settings:{},config:{tokens:{'--dsw-alias-bg-base':{light:'#ffffff',dark:'#111111'}}}}}});
test('licensed catalog → verified download → install; tamper, incompatible host and revocation are rejected',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-market-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const server=await createLicenseService({stateDir:path.join(dir,'service')});t.after(()=>server.close());
  const serviceUrl='http://127.0.0.1:'+server.port;
  const request=async(route,input,admin=false)=>fetch(serviceUrl+route,{method:'POST',headers:{'content-type':'application/json',...(admin?{authorization:'Bearer '+server.adminToken}:{})},body:JSON.stringify(input)});
  const published=[];
  for(const version of ['1.0.0','1.1.0']){
    const artifact=path.join(dir,version+'.zip');fs.writeFileSync(artifact,zipSync({'skin.json':Buffer.from(JSON.stringify(manifest(version)))}));
    const response=await request('/admin/skins',{artifact,title:'正式测试皮肤'},true);assert.equal(response.status,200);published.push((await response.json()).skin);
    assert.equal(published.at(-1).sha256,createHash('sha256').update(fs.readFileSync(artifact)).digest('hex'));
  }
  const conflict=path.join(dir,'conflict.zip');fs.writeFileSync(conflict,zipSync({'skin.json':Buffer.from(JSON.stringify({...manifest('1.1.0'),name:'更改内容'}))}));
  assert.equal((await (await request('/admin/skins',{artifact:conflict},true)).json()).error,'SKIN_VERSION_CONFLICT');
  assert.equal((await request('/admin/skins',{artifact:conflict})).status,403);
  const unauth=await request('/v1/skins/catalog',{});assert.notEqual(unauth.status,200);
  const code=await (await request('/admin/issue',{days:0,devices:1},true)).json();
  const client=new Entitlement({stateDir:path.join(dir,'profile'),config:{serviceUrl,publicKey:server.publicKey},deviceId:'a'.repeat(64)});fs.mkdirSync(client.stateDir);
  await client.activate(code.code);
  const market=await client.refreshSkinCatalog();assert.equal(market.skins.length,1);assert.equal(market.skins[0].version,'1.1.0');
  assert.deepEqual(client.skinCatalog(),market);
  const releaseId=market.skins[0].releaseId;
  assert.equal(await client.skinCover(releaseId),null);
  await assert.rejects(client.downloadSkin({releaseId,dshVersion:'0.2.1-rc.5'}),/SKIN_DSH_UNSUPPORTED/);
  const downloaded=await client.downloadSkin({releaseId,dshVersion:'0.2.2-rc.1'});
  const library=new SkinLibrary(client.stateDir),imported=library.install(downloaded.file,{expected:downloaded.entry});
  assert.equal(imported.skin.contentKey,market.skins[0].contentKey);assert.equal(library.installed().length,1);
  assert.throws(()=>library.install(downloaded.file,{expected:{...downloaded.entry,contentKey:'b'.repeat(64)}}),/SKIN_PACKAGE_MISMATCH/);
  const skinFile=path.join(dir,'service/skins',market.skins[0].sha256+'.zip');const original=fs.readFileSync(skinFile),bad=Buffer.from(original);bad[bad.length-1]^=1;fs.writeFileSync(skinFile,bad);
  await assert.rejects(client.downloadSkin({releaseId,dshVersion:'0.2.2-rc.1'}),/DOWNLOAD_HASH_INVALID/);
  assert.equal(fs.readdirSync(path.join(client.stateDir,'skin-downloads')).some(name=>name.endsWith('.part')),false);
  fs.writeFileSync(skinFile,original);
  const cached=JSON.parse(fs.readFileSync(path.join(client.stateDir,'skin-catalog.json')));cached.catalog.signature='bad';fs.writeFileSync(path.join(client.stateDir,'skin-catalog.json'),JSON.stringify(cached));assert.equal(client.skinCatalog(),null);
  await request('/admin/revoke',{licenseId:code.licenseId},true);await assert.rejects(client.refreshSkinCatalog(),/LICENSE_REVOKED/);
});

async function marketFixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-catalog-pages-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const service=await createLicenseService({stateDir:path.join(dir,'service')});t.after(()=>service.close());
  const serviceUrl='http://127.0.0.1:'+service.port;
  const request=async(route,input,admin=false)=>fetch(serviceUrl+route,{method:'POST',headers:{'content-type':'application/json',...(admin?{authorization:'Bearer '+service.adminToken}:{})},body:JSON.stringify(input)});
  const artifact=path.join(dir,'skin.zip');fs.writeFileSync(artifact,zipSync({'skin.json':Buffer.from(JSON.stringify(manifest()))}));
  const published=await (await request('/admin/skins',{artifact},true)).json();
  const code=await (await request('/admin/issue',{days:0,skinLimit:0},true)).json();
  const client=new Entitlement({stateDir:path.join(dir,'profile'),deviceId:'d'.repeat(64),config:{serviceUrl,publicKey:service.publicKey}});
  await client.activate(code.code);
  const auth={receipt:client.record().receipt,deviceId:client.deviceId};
  return {dir,service,client,request,auth,published:published.skin,code};
}

test('2105 skin IDs deduplicate before filtering and paging; query validation, ownership, modules and sorting are signed',async t=>{
  const {dir,client,request,auth,published,code}=await marketFixture(t),database=path.join(dir,'service/database.json');
  const db=JSON.parse(fs.readFileSync(database));db.skins=[];
  for(let i=0;i<2105;i++){
    const id='bulk-'+String(i).padStart(4,'0'),row={...published,id,name:'名称 '+id,title:'主题 '+String(i).padStart(4,'0'),description:'description '+id,modules:i%2?['theme','pet']:['theme','startup']};
    db.skins.push({...row,releaseId:'skin_'+randomUUID(),version:'0.9.0',publishedAt:i===0?10000:i,description:'old-only-search',modules:['pet']});
    db.skins.push({...row,releaseId:'skin_'+randomUUID(),version:'1.0.0',publishedAt:10000+i});
  }
  db.licenses.find(row=>row.id===code.licenseId).skinIds=['bulk-0001','bulk-0002'];fs.writeFileSync(database,JSON.stringify(db));
  let page=await client.refreshSkinCatalog();assert.equal(page.total,2105);assert.equal(page.pageSize,24);assert.equal(page.pages,88);assert.equal(page.skins[0].id,'bulk-2104');
  const seen=new Set();
  for(let n=1;n<=44;n++){
    page=await client.refreshSkinCatalog({page:n,pageSize:48});assert.equal(page.page,n);assert.equal(page.pages,44);
    if(n===1)assert.ok(JSON.parse(fs.readFileSync(path.join(client.stateDir,'skin-catalog.json'))).catalog.payload.length>16384);
    for(const row of page.skins){assert.equal(row.version,'1.0.0');assert.equal(seen.has(row.id),false);seen.add(row.id);}
  }
  assert.equal(seen.size,2105);
  page=await client.refreshSkinCatalog({page:999,pageSize:48});assert.equal(page.page,44);assert.equal(page.query.page,44);assert.equal(page.skins.length,41);
  page=await client.refreshSkinCatalog({q:'old-only-search'});assert.equal(page.total,0);assert.equal(page.pages,1);assert.equal(page.page,1);
  for(const q of ['BULK-0007','名称 bulk-0007','description bulk-0007']){page=await client.refreshSkinCatalog({q});assert.equal(page.total,1);assert.equal(page.skins[0].id,'bulk-0007');}
  page=await client.refreshSkinCatalog({q:'主题 0000'});assert.equal(page.skins[0].id,'bulk-0000');
  page=await client.refreshSkinCatalog({owned:true,sort:'name'});assert.deepEqual(page.skins.map(row=>row.id),['bulk-0001','bulk-0002']);assert.equal(page.quota.used,2);
  page=await client.refreshSkinCatalog({owned:true,module:'pet'});assert.deepEqual(page.skins.map(row=>row.id),['bulk-0001']);
  for(const module of ['no-pet','startup']){page=await client.refreshSkinCatalog({owned:true,module});assert.deepEqual(page.skins.map(row=>row.id),['bulk-0002']);}
  page=await client.refreshSkinCatalog({module:'theme'});assert.equal(page.total,2105);
  page=await client.refreshSkinCatalog({sort:'name'});assert.equal(page.skins[0].id,'bulk-0000');assert.equal(page.skins[1].id,'bulk-0001');
  for(const query of [{page:0},{page:1.5},{page:'2'},{page:null},{pageSize:0},{pageSize:49},{q:'x'.repeat(81)},{q:3},{module:'unknown'},{sort:'oldest'},{owned:1},{owned:null}]){
    const response=await request('/v1/skins/catalog',{...auth,...query});assert.equal(response.status,400);assert.equal((await response.json()).error,'SKIN_CATALOG_QUERY_INVALID');
  }
  assert.deepEqual((await client.refreshSkinCatalog({owned:true})).quota.acquiredIds,['bulk-0001','bulk-0002']);
});

test('exact release details preserve old versions and downloads preserve the current signed browsing page and query',async t=>{
  const {dir,client,request,published}=await marketFixture(t);
  const artifact=path.join(dir,'newer.zip');fs.writeFileSync(artifact,zipSync({'skin.json':Buffer.from(JSON.stringify(manifest('2.0.0')))}));
  await request('/admin/skins',{artifact},true);
  // A second distinct skin makes the selected browser page independent from the downloaded release.
  fs.writeFileSync(artifact,zipSync({'skin.json':Buffer.from(JSON.stringify({...manifest(),id:'another-skin'}))}));await request('/admin/skins',{artifact},true);
  const browsing=await client.refreshSkinCatalog({page:2,pageSize:1,q:'',sort:'name',module:'theme'}),cache=fs.readFileSync(path.join(client.stateDir,'skin-catalog.json'),'utf8');
  const detail=await client.skinDetail(published.releaseId);assert.equal(detail.skin.version,'1.0.0');assert.equal(detail.quota.used,0);
  await assert.rejects(client.skinDetail('skin_'+randomUUID()),/SKIN_NOT_FOUND/);assert.equal(client.skinCatalog().quota.used,0);
  const progress=[],download=await client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1',onProgress:value=>progress.push(value)});
  assert.equal(download.entry.version,'1.0.0');assert.equal(progress[0].bytes,0);assert.equal(progress.at(-1).bytes,published.size);assert.ok(progress.every(value=>value.total===published.size));
  assert.equal(fs.readFileSync(path.join(client.stateDir,'skin-catalog.json'),'utf8'),cache);
  const after=client.skinCatalog();assert.equal(after.quota.used,1);assert.equal(after.page,2);assert.deepEqual(after.query,browsing.query);assert.deepEqual(after.skins,browsing.skins);
  const privateKey=fs.readFileSync(path.join(dir,'service/signing-private.pem'),'utf8');
  const claims=verifiedEnvelope(client.record().receipt,client.config.publicKey),oversizedLicense=signedEnvelope({...claims,padding:'x'.repeat(17000)},privateKey);
  assert.throws(()=>verifyLicense(oversizedLicense,{publicKey:client.config.publicKey,deviceId:client.deviceId}),/LICENSE_INVALID/);
  const legacy=signedEnvelope({product:'dsh-skins',formatVersion:1,skins:[published],quota:after.quota},privateKey);
  fs.writeFileSync(path.join(client.stateDir,'skin-catalog.json'),JSON.stringify({catalog:legacy,checkedAt:Date.now()}));
  assert.equal(client.skinCatalog().skins[0].releaseId,published.releaseId);assert.equal(client.skinCatalog().page,1);
  const malformed=signedEnvelope({product:'dsh-skins',formatVersion:1,skins:[published],quota:after.quota,page:1,pageSize:1,total:2,pages:1,query:{page:1,pageSize:1,q:'',module:'all',sort:'newest',owned:false}},privateKey);
  fs.writeFileSync(path.join(client.stateDir,'skin-catalog.json'),JSON.stringify({catalog:malformed}));assert.equal(client.skinCatalog(),null);
});

test('late browser requests cannot replace the current search and quota refresh errors preserve a download cancellation',async t=>{
  const {client,published}=await marketFixture(t),realFetch=client.fetcher;
  let releaseFirst,firstStarted;
  const started=new Promise(resolve=>{firstStarted=resolve;}),hold=new Promise(resolve=>{releaseFirst=resolve;});
  client.fetcher=async(url,options)=>{
    const response=await realFetch(url,options),input=JSON.parse(options.body);
    if(url.endsWith('/v1/skins/catalog')&&input.q===''){firstStarted();await hold;}
    return response;
  };
  const first=client.refreshSkinCatalog({q:''});await started;
  await client.refreshSkinCatalog({q:'no matching skin'});releaseFirst();assert.equal((await first).skins.length,1);
  assert.equal(client.skinCatalog().query.q,'no matching skin');assert.equal(client.skinCatalog().total,0);
  const controller=new AbortController();let quotaReads=0;
  client.fetcher=async(url,options)=>{
    if(url.endsWith('/v1/skins/catalog')&&JSON.parse(options.body).pageSize===1){quotaReads++;return new Response(JSON.stringify({error:'SERVICE_FAILURE'}),{status:503});}
    return realFetch(url,options);
  };
  await assert.rejects(client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1',signal:controller.signal,onProgress:({bytes})=>{if(bytes)controller.abort();}}),error=>error.name==='AbortError');
  assert.equal(quotaReads,1);assert.equal(client.skinCatalog().query.q,'no matching skin');
  client.fetcher=realFetch;assert.equal((await client.refreshSkinQuota()).used,1);assert.equal(client.skinCatalog().quota.used,1);
  assert.equal(fs.readdirSync(path.join(client.stateDir,'skin-downloads')).some(name=>name.endsWith('.part')),false);
});

test('skin download aborts clean partial files, preserve a complete file and leave concurrent downloads running',async t=>{
  const {client,published}=await marketFixture(t),realFetch=client.fetcher;
  const original=await client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1'}),bytes=fs.readFileSync(original.file),controller=new AbortController();
  let count=0,cancelled=false;
  client.fetcher=async(url,options)=>{
    if(!url.endsWith('/v1/skins/download')||++count!==1)return realFetch(url,options);
    return new Response(new ReadableStream({start(stream){stream.enqueue(bytes.subarray(0,32));},cancel(){cancelled=true;}}));
  };
  const aborted=client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1',signal:controller.signal,onProgress:({bytes})=>{if(bytes)controller.abort();}});
  const concurrent=client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1'});
  await assert.rejects(aborted,error=>error.name==='AbortError');await concurrent;
  assert.equal(cancelled,true);assert.deepEqual(fs.readFileSync(original.file),bytes);
  assert.equal(fs.readdirSync(path.dirname(original.file)).some(name=>name.endsWith('.part')),false);
  const before=count,alreadyAborted=new AbortController();alreadyAborted.abort();await assert.rejects(client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1',signal:alreadyAborted.signal}),error=>error.name==='AbortError');assert.equal(count,before);
});

test('late quota and browser responses cannot hide a second acquired skin',async t=>{
  const {dir,client,request,published}=await marketFixture(t),artifact=path.join(dir,'second.zip');
  fs.writeFileSync(artifact,zipSync({'skin.json':Buffer.from(JSON.stringify({...manifest(),id:'second-download'}))}));
  const second=(await (await request('/admin/skins',{artifact},true)).json()).skin;
  const browsing=await client.refreshSkinCatalog({pageSize:1,page:2}),realFetch=client.fetcher;
  let releaseFirst,firstStarted,releaseBrowser,browserStarted,count=0;
  const started=new Promise(resolve=>{firstStarted=resolve;}),hold=new Promise(resolve=>{releaseFirst=resolve;});
  const browsingStarted=new Promise(resolve=>{browserStarted=resolve;}),holdBrowser=new Promise(resolve=>{releaseBrowser=resolve;});
  client.fetcher=async(url,options)=>{
    const response=await realFetch(url,options),input=JSON.parse(options.body);
    if(input.q==='pending-search'){browserStarted();await holdBrowser;return response;}
    if(url.endsWith('/v1/skins/catalog')&&JSON.parse(options.body).pageSize===1&&++count===1){firstStarted();await hold;}
    return response;
  };
  const first=client.downloadSkin({releaseId:published.releaseId,dshVersion:'0.2.2-rc.1'});await started;
  const pendingBrowser=client.refreshSkinCatalog({...browsing.query,q:'pending-search'});await browsingStarted;
  await client.downloadSkin({releaseId:second.releaseId,dshVersion:'0.2.2-rc.1'});assert.equal(client.skinCatalog().quota.used,2);
  releaseBrowser();const page=await pendingBrowser;assert.equal(page.quota.used,2);
  releaseFirst();await first;assert.equal(client.skinCatalog().quota.used,2);assert.deepEqual(client.skinCatalog().query,page.query);
});

test('download quota is per license and distinct skin ID, survives uninstall, supports future updates and zero is unlimited',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-quota-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const service=await createLicenseService({stateDir:path.join(dir,'service')});t.after(()=>service.close());
 const serviceUrl='http://127.0.0.1:'+service.port;
 const admin=async(route,body)=>{const r=await fetch(serviceUrl+route,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+service.adminToken},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 const publish=async(id,version='1.0.0')=>{const file=path.join(dir,id+'-'+version+'.zip');fs.writeFileSync(file,zipSync({'skin.json':Buffer.from(JSON.stringify({...manifest(version),id}))}));const value=await admin('/admin/skins',{artifact:file});assert.equal(value.status,200);return value.skin;};
 const a=await publish('skin-a'),b=await publish('skin-b');
 const code=await admin('/admin/issue',{days:0,devices:2,skinLimit:1});
 const makeClient=async(device)=>{const stateDir=path.join(dir,device);fs.mkdirSync(stateDir);const client=new Entitlement({stateDir,deviceId:device.repeat(64),config:{serviceUrl,publicKey:service.publicKey}});await client.activate(code.code);return client;};
 const one=await makeClient('a'),two=await makeClient('b');
 const results=await Promise.allSettled([one.downloadSkin({releaseId:a.releaseId,dshVersion:'0.2.2-rc.1'}),two.downloadSkin({releaseId:b.releaseId,dshVersion:'0.2.2-rc.1'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/SKIN_DOWNLOAD_LIMIT_REACHED/);
 const quota=(await one.refreshSkinCatalog()).quota;assert.equal(quota.used,1);assert.equal(quota.remaining,0);
 const acquired=quota.acquiredIds[0],allowed=[a,b].find(row=>row.id===acquired),blocked=[a,b].find(row=>row.id!==acquired);
 const download=await two.downloadSkin({releaseId:allowed.releaseId,dshVersion:'0.2.2-rc.1'}),library=new SkinLibrary(two.stateDir);
 const local=library.install(download.file,{expected:download.entry});library.remove(local.skin.contentKey);
 await assert.rejects(one.downloadSkin({releaseId:blocked.releaseId,dshVersion:'0.2.2-rc.1'}),/SKIN_DOWNLOAD_LIMIT_REACHED/);
 await one.downloadSkin({releaseId:allowed.releaseId,dshVersion:'0.2.2-rc.1'});
 const update=await publish(acquired,'2.0.0');await two.downloadSkin({releaseId:update.releaseId,dshVersion:'0.2.2-rc.1'});assert.equal((await two.refreshSkinCatalog()).quota.used,1);
 const unlimited=await admin('/admin/issue',{days:0,skinLimit:0}),stateDir=path.join(dir,'unlimited');fs.mkdirSync(stateDir);
 const all=new Entitlement({stateDir,deviceId:'c'.repeat(64),config:{serviceUrl,publicKey:service.publicKey}});await all.activate(unlimited.code);
 for(const row of (await all.refreshSkinCatalog()).skins)await all.downloadSkin({releaseId:row.releaseId,dshVersion:'0.2.2-rc.1'});
 const future=await publish('skin-future');await all.downloadSkin({releaseId:future.releaseId,dshVersion:'0.2.2-rc.1'});assert.equal((await all.refreshSkinCatalog()).quota.limit,0);assert.equal(all.skinCatalog().quota.used,3);
 for(const skinLimit of [-1,1.5,'1'])assert.equal((await admin('/admin/issue',{skinLimit})).error,'INVALID_LICENSE_LIMITS');
});
