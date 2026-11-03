import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createLicenseService} from '../licensing/server.mjs';
import {verifyLicense} from '../packages/dsh-companion/src/license-core.mjs';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
const device=name=>createHash('sha256').update(name).digest('hex');

test('activation diagnostics correlate failures without recording codes, receipts or device IDs',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-diagnostics-')),logs=[];
  const service=await createLicenseService({stateDir:path.join(directory,'service'),requestLogger:event=>logs.push(event)}),url='http://127.0.0.1:'+service.port;
  const privateCode='DSHC-PRIVATE-DIAGNOSTIC-FIXTURE',privateDevice=device('private-diagnostic-device');
  const client=new Entitlement({stateDir:path.join(directory,'client'),config:{serviceUrl:url,publicKey:service.publicKey},deviceId:privateDevice});
  try{
    await assert.rejects(client.activate(privateCode),/ACTIVATION_CODE_INVALID/);
    const diagnostic=JSON.parse(fs.readFileSync(path.join(directory,'client/license-diagnostics.json'))).events[0];
    assert.equal(logs.length,1);assert.equal(logs[0].errorCode,'ACTIVATION_CODE_INVALID');assert.equal(logs[0].status,400);assert.equal(diagnostic.requestId,logs[0].requestId);assert.ok(logs[0].durationMs>=0);
    const text=JSON.stringify({logs,diagnostic});for(const secret of [privateCode,privateDevice,'receipt','authorization'])assert.equal(text.includes(secret),false);
    const offline=new Entitlement({stateDir:path.join(directory,'offline'),config:{serviceUrl:url,publicKey:service.publicKey},deviceId:privateDevice,fetcher:async()=>{throw new TypeError('failed for '+privateCode,{cause:Object.assign(new Error('secret diagnostic'),{code:'UND_ERR_CONNECT_TIMEOUT'})})}});
    await assert.rejects(offline.activate(privateCode),/LICENSE_SERVICE_UNAVAILABLE/);
    const saved=fs.readFileSync(path.join(directory,'offline/license-diagnostics.json'),'utf8');assert.equal(JSON.parse(saved).events[0].transportCode,'UND_ERR_CONNECT_TIMEOUT');assert.equal(saved.includes(privateCode),false);
    assert.equal(fs.statSync(path.join(directory,'offline/license-diagnostics.json')).mode&0o777,0o600);
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test('service CLI starts through the deployment current symlink',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-cli-'));
  const entry=path.join(directory,'current.mjs'),state=path.join(directory,'state');
  fs.symlinkSync(fileURLToPath(new URL('../licensing/server.mjs',import.meta.url)),entry);
  const child=spawn(process.execPath,[entry,state,'0'],{stdio:'ignore'});
  const closed=new Promise(resolve=>child.on('exit',resolve));
  try{
    for(let i=0;i<100&&!fs.existsSync(path.join(state,'service.json'));i++){
      if(child.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(fs.existsSync(path.join(state,'service.json')),true,'symlinked CLI must initialize its service');
    const service=JSON.parse(fs.readFileSync(path.join(state,'service.json')));
    const response=await fetch(service.serviceUrl+'/health');assert.equal((await response.json()).product,'dsh-companion');
  }finally{child.kill('SIGTERM');await closed;fs.rmSync(directory,{recursive:true,force:true});}
});

test('private activation, signed offline access, device limits, download and revocation form one flow',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-flow-'));let clock=Date.now();
  const service=await createLicenseService({stateDir:path.join(directory,'server'),now:()=>clock});
  const config={serviceUrl:'http://127.0.0.1:'+service.port,publicKey:service.publicKey};
  const post=async(route,input,admin=false)=>{const response=await fetch(config.serviceUrl+route,{method:'POST',headers:{'content-type':'application/json',...(admin?{authorization:'Bearer '+service.adminToken}:{})},body:JSON.stringify(input)});return {status:response.status,value:await response.json()};};
  try{
    assert.equal((await post('/admin/issue',{})).status,403);
    const issued=(await post('/admin/issue',{devices:1,days:30},true)).value;
    const first=new Entitlement({stateDir:path.join(directory,'a'),config,deviceId:device('a'),now:()=>clock});
    assert.equal(first.status().active,false);
    await assert.rejects(first.activate('not-a-real-code'),/ACTIVATION_CODE_INVALID/);
    await first.activate(issued.code);assert.equal(first.status().active,true);
    assert.equal(fs.readFileSync(path.join(directory,'server/database.json'),'utf8').includes(issued.code),false);
    const receipt=first.record().receipt;
    assert.throws(()=>verifyLicense(receipt,{publicKey:service.publicKey,deviceId:device('b'),now:clock}),/LICENSE_DEVICE_MISMATCH/);
    const altered={...receipt,payload:Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(receipt.payload,'base64url')),expiresAt:clock+10000000000})).toString('base64url')};
    assert.throws(()=>verifyLicense(altered,{publicKey:service.publicKey,deviceId:device('a'),now:clock}),/LICENSE_INVALID/);
    const second=new Entitlement({stateDir:path.join(directory,'b'),config,deviceId:device('b'),now:()=>clock});
    await assert.rejects(second.activate(issued.code),/DEVICE_LIMIT_REACHED/);
    const originalPost=first.post.bind(first);first.post=async()=>{throw new Error('LICENSE_SERVICE_UNAVAILABLE');};
    clock+=86400000;assert.equal((await first.refresh(true)).state,'offline');assert.equal(first.status().active,true);
    clock+=7*86400000;assert.equal(first.status().active,false);
    first.post=originalPost;assert.equal((await first.refresh(true)).active,true);
    await first.deactivate();assert.equal(first.status().active,false);
    assert.equal((await post('/v1/renew',{receipt,deviceId:device('a')})).value.error,'LICENSE_DEVICE_RELEASED');
    await second.activate(issued.code);assert.equal(second.status().active,true);
    const artifact=path.join(directory,'private.tgz');fs.writeFileSync(artifact,Buffer.from('private-package-test-content'));
    const publication=(await post('/admin/releases',{artifact,version:'0.1.0-dev.3',build:3,supportedDsh:['0.2.1-rc.5']},true)).value;
    const repeated=(await post('/admin/releases',{artifact,version:'0.1.0-dev.3',build:3,supportedDsh:['0.2.1-rc.5']},true)).value;
    assert.equal(repeated.releaseId,publication.releaseId);
    fs.writeFileSync(artifact,'different package with the same version');
    assert.equal((await post('/admin/releases',{artifact,version:'0.1.0-dev.3',build:3,supportedDsh:['0.2.1-rc.5']},true)).value.error,'RELEASE_CONFLICT');
    const database=path.join(directory,'server/database.json');
    fs.utimesSync(database,new Date(0),new Date(0));
    assert.equal((await post('/v1/releases/latest',{platform:'darwin-arm64',dshVersion:'0.2.1-rc.5'})).status,400);
    assert.equal((await second.latest({dshVersion:'0.2.1-rc.5',build:2})).available,true);
    await assert.rejects(second.latest({dshVersion:'unsupported',build:2}),/NO_COMPATIBLE_RELEASE/);
    assert.equal((await second.download({dshVersion:'0.2.1-rc.5',build:2})).verified,true);
    assert.equal(fs.statSync(database).mtimeMs,0,'renewal/update reads must not rewrite the authorization database');
    const source=path.join(directory,'server/releases',publication.sha256+'.tgz');const bytes=fs.readFileSync(source);bytes[0]^=1;fs.writeFileSync(source,bytes);
    await assert.rejects(second.download({dshVersion:'0.2.1-rc.5',build:2}),/DOWNLOAD_HASH_INVALID/);
    await post('/admin/revoke',{licenseId:issued.licenseId},true);assert.equal((await second.refresh(true)).active,false);assert.equal(second.status().errorCode,'LICENSE_REVOKED');
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test('reverse proxy activation limits isolate clients and ignore untrusted forwarded addresses',async()=>{
  for(const trustProxy of [false,true]){
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-proxy-'));
    const service=await createLicenseService({stateDir:directory,trustProxy});
    const base='http://127.0.0.1:'+service.port;
    const post=async(route,input,headers={})=>{
      const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(input)});
      return response.json();
    };
    try{
      const issued=await post('/admin/issue',{devices:1},{authorization:'Bearer '+service.adminToken});
      for(let i=0;i<20;i++)assert.equal((await post('/v1/activate',{deviceId:device('proxy-a'),code:'invalid'},{'x-real-ip':'192.0.2.10'})).error,'ACTIVATION_CODE_INVALID');
      assert.equal((await post('/v1/activate',{deviceId:device('proxy-a'),code:issued.code},{'x-real-ip':'192.0.2.10'})).error,'ACTIVATION_RATE_LIMIT');
      const other=await post('/v1/activate',{deviceId:device('proxy-b'),code:issued.code},{'x-real-ip':'192.0.2.11'});
      assert.equal(Boolean(other.receipt),trustProxy);
      if(!trustProxy)assert.equal(other.error,'ACTIVATION_RATE_LIMIT');
    }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
  }
});

test('simultaneous activation cannot overbook a one-device code',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-capacity-'));
  const service=await createLicenseService({stateDir:directory});const base='http://127.0.0.1:'+service.port;
  try{
    const issue=await fetch(base+'/admin/issue',{method:'POST',headers:{authorization:'Bearer '+service.adminToken,'content-type':'application/json'},body:JSON.stringify({devices:1})});const issued=await issue.json();
    const results=await Promise.all(Array.from({length:6},(_,i)=>fetch(base+'/v1/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:issued.code,deviceId:device('simultaneous-'+i)})}).then(r=>r.status)));
    assert.equal(results.filter(status=>status===200).length,1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'database.json'))).licenses[0].devices.length,1);
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test('authorization and package downloads both use the supplied host network transport',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-license-transport-'));
  const service=await createLicenseService({stateDir:path.join(directory,'server')});
  const actual='http://127.0.0.1:'+service.port,origin='https://license.invalid',requests=[];
  const fetcher=(url,options)=>{assert.ok(url.startsWith(origin+'/'));requests.push(new URL(url).pathname);return fetch(actual+url.slice(origin.length),options);};
  const admin=async(route,input)=>{const response=await fetch(actual+route,{method:'POST',headers:{authorization:'Bearer '+service.adminToken,'content-type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,200);return response.json();};
  try{
    const issued=await admin('/admin/issue',{devices:1,days:30});
    const entitlement=new Entitlement({stateDir:path.join(directory,'device'),config:{serviceUrl:origin,publicKey:service.publicKey},deviceId:device('transport'),fetcher});
    await entitlement.activate(issued.code);await entitlement.refresh(true);
    const artifact=path.join(directory,'package.tgz');fs.writeFileSync(artifact,'transport-test');
    await admin('/admin/releases',{artifact,version:'0.1.0-dev.6',build:6,supportedDsh:['0.2.1-rc.5']});
    assert.equal((await entitlement.download({dshVersion:'0.2.1-rc.5',build:5})).verified,true);
    await assert.rejects(entitlement.download({dshVersion:'0.2.1-rc.5',build:7}),/NO_COMPATIBLE_RELEASE/);
    await entitlement.deactivate();assert.equal(entitlement.status().active,false);
    for(const route of ['/v1/activate','/v1/renew','/v1/deactivate','/v1/releases/latest','/v1/releases/download'])assert.ok(requests.includes(route));
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test('explicit public installation links work before activation and never expose private releases',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-public-install-')),stateDir=path.join(directory,'state'),service=await createLicenseService({stateDir}),base='http://127.0.0.1:'+service.port;
  const admin=async input=>{const response=await fetch(base+'/admin/releases',{method:'POST',headers:{authorization:'Bearer '+service.adminToken,'content-type':'application/json'},body:JSON.stringify(input)});return {status:response.status,value:await response.json()};};
  try{
    const artifact=path.join(directory,'package.tgz'),bytes=Buffer.from('public-install-archive-fixture');fs.writeFileSync(artifact,bytes);
    const common={artifact,supportedDsh:['0.2.1-rc.5']};
    assert.equal((await admin({...common,version:'0.1.0-dev.7',build:7})).status,200);
    assert.equal((await fetch(base+'/install/dsh-companion-0.1.0-dev.7.tgz')).status,404);
    assert.equal((await admin({...common,version:'0.1.0-dev.7',build:7,publicInstall:true})).value.error,'RELEASE_VISIBILITY_CONFLICT');
    assert.equal((await admin({...common,version:'0.1.0-dev.8',build:8,publicInstall:'yes'})).status,400);
    assert.equal((await admin({...common,version:'0.1.0-dev.8',build:8,publicInstall:true})).status,200);
    const database=path.join(stateDir,'database.json');fs.utimesSync(database,new Date(0),new Date(0));
    const url=base+'/install/dsh-companion-0.1.0-dev.8.tgz',response=await fetch(url);assert.equal(response.status,200);assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes));assert.equal(Number(response.headers.get('content-length')),bytes.length);assert.match(response.headers.get('cache-control'),/public.*immutable/);
    const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
    assert.equal((await fetch(url,{headers:{'if-none-match':response.headers.get('etag')}})).status,304);
    const browser=await fetch(url,{headers:{origin:'https://example.invalid'}});assert.equal(browser.status,200);await browser.body.cancel();
    assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,405);
    for(const suffix of ['../admin.token','..%2fadmin.token','unknown.tgz','dsh-companion-0.1.0-dev.8.tgz/extra'])assert.equal((await fetch(base+'/install/'+suffix)).status,404);
    assert.equal(fs.statSync(database).mtimeMs,0,'anonymous installation must not mutate authorization state');
    assert.equal(JSON.parse(fs.readFileSync(database)).licenses.length,0,'downloading before activation must not issue or bind a license');
    assert.equal((await fetch(base+'/v1/releases/download',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,400);
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
