import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createLicenseService} from '../licensing/server.mjs';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
import {releaseFixture} from './fixtures/release-package.mjs';

const device=name=>createHash('sha256').update(name).digest('hex');
async function setup(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-console-')),stateDir=path.join(directory,'state'),staticDir=path.join(directory,'ui');fs.mkdirSync(staticDir);
  fs.writeFileSync(path.join(staticDir,'index.html'),'<!doctype html><title>Console fixture</title>');
  let clock=Date.now();const service=await createLicenseService({stateDir,consoleEnabled:true,consoleStaticDir:staticDir,now:()=>clock});
  const base='http://127.0.0.1:'+service.port,jar=new Map();let csrf='';
  const credentials=JSON.parse(fs.readFileSync(path.join(stateDir,'console-initial.json')));
  async function request(route,{method='GET',body,headers={},cookies=true,token=true}={}){
    const cookie=[...jar.values()].join('; ');
    const response=await fetch(base+route,{method,headers:{...(cookies&&cookie?{cookie}:{}),...(method!=='GET'?{origin:base,...(token?{'x-csrf-token':csrf}:{})}:{}),...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    if(cookies)for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],key=pair.slice(0,pair.indexOf('='));if(pair.endsWith('='))jar.delete(key);else jar.set(key,pair);}
    const bytes=Buffer.from(await response.arrayBuffer());let value;try{value=JSON.parse(bytes.toString());}catch{}
    return {status:response.status,value,bytes,headers:response.headers};
  }
  const freshCsrf=async()=>{const response=await request('/manage/api/csrf');assert.equal(response.status,200);csrf=response.value.csrf;};
  const login=async(password=credentials.password)=>{await freshCsrf();const response=await request('/manage/api/login',{method:'POST',body:{username:'admin',password}});if(response.status===200)csrf=response.value.csrf;return response;};
  return {directory,stateDir,staticDir,base,service,credentials,jar,request,freshCsrf,login,now:()=>clock,advance:ms=>clock+=ms,close:async()=>{await service.close();fs.rmSync(directory,{recursive:true,force:true});}};
}

test('console uses protected library sessions, same-origin CSRF and password reset invalidation',async()=>{
  const env=await setup();
  try{
    assert.equal((await env.request('/manage/')).status,200);
    assert.equal((await env.request('/manage/api/licenses')).status,401);
    await env.freshCsrf();
    assert.equal((await env.request('/manage/api/login',{method:'POST',body:env.credentials,headers:{origin:'https://untrusted.invalid'}})).status,403);
    assert.equal((await env.request('/manage/api/login',{method:'POST',body:env.credentials,token:false})).status,403);
    const login=await env.login();assert.equal(login.status,200);
    const setCookie=login.headers.getSetCookie().join(';');assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/SameSite=Strict/i);assert.match(setCookie,/Path=\/manage\//);
    assert.match(login.headers.get('content-security-policy'),/script-src 'self'/);assert.equal(login.headers.get('cache-control'),'no-store');
    const previousCookie=[...env.jar.values()].join('; ');
    assert.equal((await env.request('/manage/api/logout',{method:'POST',body:{}})).status,200);
    assert.equal((await env.request('/manage/api/session',{cookies:false,headers:{cookie:previousCookie}})).status,401);
    assert.equal((await env.login()).status,200);
    const password=randomBytes(24).toString('base64url');
    const changed=await env.request('/manage/api/password',{method:'POST',body:{oldPassword:env.credentials.password,newPassword:password}});assert.equal(changed.status,200);
    assert.equal((await env.login(env.credentials.password)).status,401);assert.equal((await env.login(password)).status,200);
    assert.match(JSON.parse(fs.readFileSync(path.join(env.stateDir,'console-auth.json'))).hash,/^\$argon2id\$/);
    assert.equal(fs.existsSync(path.join(env.stateDir,'console-initial.json')),false);
    env.advance(13*3600000);assert.equal((await env.request('/manage/api/session')).status,401);
  }finally{await env.close();}
});

test('console issuance, encrypted export and device controls connect to the real plugin authorization API',async()=>{
  const env=await setup();
  try{
    assert.equal((await env.login()).status,200);
    const options={requestId:randomUUID(),count:2,days:30,devices:2,label:'内测 · 第一批'};
    const issued=await env.request('/manage/api/licenses/issue',{method:'POST',body:options});assert.equal(issued.status,200);assert.equal(issued.value.licenses.length,2);
    const repeated=await env.request('/manage/api/licenses/issue',{method:'POST',body:options});assert.equal(repeated.status,200);
    assert.ok(repeated.value.licenses[0].code===issued.value.licenses[0].code,'retrying one issue request must return the same codes');
    const database=JSON.parse(fs.readFileSync(path.join(env.stateDir,'database.json')));assert.equal(database.licenses.length,2);assert.equal(database.licenses[0].codeBox.split('.').length,5);
    assert.ok(issued.value.licenses.every(row=>!fs.readFileSync(path.join(env.stateDir,'database.json'),'utf8').includes(row.code)),'plaintext activation codes must not be written to the database');
    const config={serviceUrl:env.base,publicKey:env.service.publicKey};
    const clients=['a','b','c'].map(name=>new Entitlement({stateDir:path.join(env.directory,'client-'+name),config,deviceId:device('console-'+name)}));
    const first=issued.value.licenses[0];await clients[0].activate(first.code);await clients[1].activate(first.code);await assert.rejects(clients[2].activate(first.code),/DEVICE_LIMIT_REACHED/);
    let detail=(await env.request('/manage/api/licenses/'+first.id)).value;assert.equal(detail.license.devices.length,2);
    const tooSmall=await env.request('/manage/api/licenses/'+first.id+'/update',{method:'POST',body:{label:'updated',devices:1,extendDays:7,revision:detail.license.revision}});assert.equal(tooSmall.status,409);
    const updated=await env.request('/manage/api/licenses/'+first.id+'/update',{method:'POST',body:{label:'=test-formula',devices:2,extendDays:7,revision:detail.license.revision}});assert.equal(updated.status,200);assert.equal(updated.value.license.expiresAt,first.expiresAt+7*86400000);
    detail=updated.value;
    const released=await env.request('/manage/api/licenses/'+first.id+'/release-device',{method:'POST',body:{deviceId:clients[0].deviceId,revision:detail.license.revision}});assert.equal(released.status,200);
    assert.equal((await clients[0].refresh(true)).errorCode,'LICENSE_DEVICE_RELEASED');await clients[2].activate(first.code);
    detail=(await env.request('/manage/api/licenses/'+first.id)).value;
    assert.equal((await env.request('/manage/api/licenses/'+first.id+'/status',{method:'POST',body:{revision:detail.license.revision,revoked:true}})).status,200);
    assert.equal((await clients[1].refresh(true)).errorCode,'LICENSE_REVOKED');
    detail=(await env.request('/manage/api/licenses/'+first.id)).value;
    assert.equal((await env.request('/manage/api/licenses/'+first.id+'/status',{method:'POST',body:{revision:detail.license.revision,revoked:false}})).status,200);
    assert.equal((await clients[1].refresh(true)).active,true);
    const revealed=await env.request('/manage/api/licenses/'+first.id+'/code',{method:'POST',body:{}});assert.equal(revealed.status,200);assert.ok(revealed.value.code===first.code);
    const exported=await env.request('/manage/api/licenses/export',{method:'POST',body:{ids:issued.value.licenses.map(row=>row.id)}});assert.equal(exported.status,200);assert.match(exported.headers.get('content-type'),/text\/csv/);assert.ok(exported.bytes.includes(Buffer.from(first.code)));assert.ok(exported.bytes.toString().includes("'=test-formula"));
    assert.equal((await env.request('/manage/api/licenses',{cookies:false})).status,401);
    assert.equal((await env.request('/v1/activate',{method:'POST',body:{code:first.code,deviceId:device('browser')}})).status,403);
    const artifact=releaseFixture(env.directory,'0.1.0-dev.6');
    const publication=await env.request('/admin/releases',{method:'POST',body:{artifact,version:'0.1.0-dev.6',build:6,supportedDsh:['0.2.1-rc.5']},headers:{origin:'',authorization:'Bearer '+env.service.adminToken}});assert.equal(publication.status,200);
    const releases=(await env.request('/manage/api/releases')).value.rows;assert.equal(releases.length,1);
    const download=await env.request('/manage/api/releases/'+releases[0].id+'/download');assert.equal(download.status,200);assert.deepEqual(download.bytes,fs.readFileSync(artifact));
    assert.equal((await env.request('/manage/api/releases/'+releases[0].id+'/download',{cookies:false})).status,401);
  }finally{await env.close();}
});

test('console login limits repeated failures without issuing a session',async()=>{
  const env=await setup();
  try{await env.freshCsrf();for(let i=0;i<8;i++)assert.equal((await env.request('/manage/api/login',{method:'POST',body:{username:'admin',password:'invalid-login-password'}})).status,401);assert.equal((await env.request('/manage/api/login',{method:'POST',body:env.credentials})).status,429);}
  finally{await env.close();}
});

test('zero days issues truly permanent licenses while keeping device controls and bounded offline access',async()=>{
  const env=await setup();
  try{
    assert.equal((await env.login()).status,200);
    const options={requestId:randomUUID(),count:2,days:0,devices:1,label:'永久 · 自用'};
    for(const days of [-1,0.5,'0'])assert.equal((await env.request('/manage/api/licenses/issue',{method:'POST',body:{...options,days}})).status,400);
    const issued=await env.request('/manage/api/licenses/issue',{method:'POST',body:options});assert.equal(issued.status,200);
    assert.ok(issued.value.licenses.every(row=>row.permanent===true&&row.expiresAt===null));
    const repeated=await env.request('/manage/api/licenses/issue',{method:'POST',body:options});assert.ok(repeated.value.licenses[0].code===issued.value.licenses[0].code);
    const row=issued.value.licenses[0];
    const legacy=await env.request('/v1/activate',{method:'POST',headers:{origin:''},body:{code:row.code,deviceId:device('legacy-permanent')}});assert.equal(legacy.value.error,'CLIENT_UPDATE_REQUIRED');
    let detail=(await env.request('/manage/api/licenses/'+row.id)).value.license;assert.equal(detail.devices.length,0);
    const config={serviceUrl:env.base,publicKey:env.service.publicKey};
    const first=new Entitlement({stateDir:path.join(env.directory,'permanent-first'),config,deviceId:device('permanent-first'),now:env.now}),second=new Entitlement({stateDir:path.join(env.directory,'permanent-second'),config,deviceId:device('permanent-second'),now:env.now});
    const activated=await first.activate(row.code);assert.equal(activated.active,true);assert.equal(activated.permanent,true);assert.equal(activated.expiresAt,null);assert.equal(activated.offlineUntil,env.now()+7*86400000);
    await assert.rejects(second.activate(row.code),/DEVICE_LIMIT_REACHED/);
    const list=(await env.request('/manage/api/licenses')).value;assert.equal(list.totals.valid,2);assert.equal(list.totals.expiring,0);assert.ok(list.rows.every(row=>row.permanent&&row.status!=='expired'));
    const csv=await env.request('/manage/api/licenses/export',{method:'POST',body:{ids:[row.id]}});assert.equal(csv.status,200);assert.match(csv.bytes.toString(),/永久/);assert.ok(!csv.bytes.toString().includes('1970'));
    detail=(await env.request('/manage/api/licenses/'+row.id)).value.license;
    const extended=await env.request('/manage/api/licenses/'+row.id+'/update',{method:'POST',body:{revision:detail.revision,label:row.label,devices:1,extendDays:30}});assert.equal(extended.status,409);assert.equal(extended.value.error,'PERMANENT_LICENSE_NO_EXTENSION');
    const original=first.post.bind(first);first.post=async()=>{throw new Error('LICENSE_SERVICE_UNAVAILABLE');};env.advance(8*86400000);assert.equal((await first.refresh(true)).errorCode,'LICENSE_RENEW_REQUIRED');first.post=original;
    env.advance(200*365*86400000);const renewed=await first.refresh(true);assert.equal(renewed.active,true);assert.equal(renewed.permanent,true);assert.equal(renewed.expiresAt,null);
    const {verifyLicense,signedEnvelope}=await import('../packages/dsh-companion/src/license-core.mjs'),claims=JSON.parse(Buffer.from(first.record().receipt.payload,'base64url')),privateKey=fs.readFileSync(path.join(env.stateDir,'signing-private.pem'));
    for(const change of [{format:1},{permanent:false},{expiresAt:0},{expiresAt:undefined},{offlineUntil:null},{renewAfter:claims.offlineUntil+1}]){
      const malformed=signedEnvelope({...claims,...change},privateKey);assert.throws(()=>verifyLicense(malformed,{publicKey:env.service.publicKey,deviceId:first.deviceId,now:env.now()}),/LICENSE_INVALID/);
    }
    assert.equal((await env.login()).status,200);
    detail=(await env.request('/manage/api/licenses/'+row.id)).value.license;
    assert.equal((await env.request('/manage/api/licenses/'+row.id+'/status',{method:'POST',body:{revision:detail.revision,revoked:true}})).status,200);assert.equal((await first.refresh(true)).errorCode,'LICENSE_REVOKED');
    detail=(await env.request('/manage/api/licenses/'+row.id)).value.license;
    assert.equal((await env.request('/manage/api/licenses/'+row.id+'/status',{method:'POST',body:{revision:detail.revision,revoked:false}})).status,200);assert.equal((await first.refresh(true)).active,true);
    detail=(await env.request('/manage/api/licenses/'+row.id)).value.license;
    assert.equal((await env.request('/manage/api/licenses/'+row.id+'/release-device',{method:'POST',body:{revision:detail.revision,all:true}})).status,200);assert.equal((await first.refresh(true)).errorCode,'LICENSE_DEVICE_RELEASED');assert.equal((await second.activate(row.code)).permanent,true);
    const cli=await env.request('/admin/issue',{method:'POST',headers:{origin:'',authorization:'Bearer '+env.service.adminToken},body:{days:0,devices:1,label:'SSH permanent'}});assert.equal(cli.status,200);assert.equal(cli.value.permanent,true);assert.equal(cli.value.expiresAt,null);
  }finally{await env.close();}
});

test('enabling the console preserves pre-existing codes and signing keys across restarts',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-console-upgrade-')),stateDir=path.join(directory,'state'),staticDir=path.join(directory,'ui');fs.mkdirSync(staticDir);fs.writeFileSync(path.join(staticDir,'index.html'),'fixture');
  let service=await createLicenseService({stateDir});
  try{
    let base='http://127.0.0.1:'+service.port;
    const issued=await fetch(base+'/admin/issue',{method:'POST',headers:{authorization:'Bearer '+service.adminToken,'content-type':'application/json'},body:JSON.stringify({days:30,devices:1,label:'existing owner'})}).then(response=>response.json());
    const key=service.publicKey,token=service.adminToken;
    await service.close();service=await createLicenseService({stateDir,consoleEnabled:true,consoleStaticDir:staticDir});base='http://127.0.0.1:'+service.port;
    assert.ok(service.publicKey===key&&service.adminToken===token,'the console upgrade must retain the existing service identity');
    const client=new Entitlement({stateDir:path.join(directory,'client'),config:{serviceUrl:base,publicKey:key},deviceId:device('legacy-upgrade')});await client.activate(issued.code);assert.equal((await client.refresh(true)).active,true);
    let db=JSON.parse(fs.readFileSync(path.join(stateDir,'database.json')));assert.equal(db.licenses.length,1);assert.equal(db.licenses[0].codeBox,undefined);
    const {openCodeVault}=await import('../licensing/console-auth.mjs');await assert.rejects(openCodeVault(stateDir,db).reveal(db.licenses[0]),/CODE_NOT_RETAINED/);
    const newIssue=await fetch(base+'/admin/issue',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({label:'new issue'})}).then(response=>response.json());
    await service.close();service=await createLicenseService({stateDir,consoleEnabled:true,consoleStaticDir:staticDir});db=JSON.parse(fs.readFileSync(path.join(stateDir,'database.json')));
    const row=db.licenses.find(value=>value.id===newIssue.licenseId),recovered=await openCodeVault(stateDir,db).reveal(row);assert.ok(recovered===newIssue.code,'new encrypted codes must remain recoverable after restart');
    const vault=openCodeVault(stateDir,db);await assert.rejects(vault.reveal({...row,id:issued.licenseId}),/CODE_STORAGE_INVALID/);
    fs.rmSync(path.join(stateDir,'issuance-key.bin'));assert.throws(()=>openCodeVault(stateDir,db),/ISSUANCE_KEY_MISSING/);
  }finally{await service.close();fs.rmSync(directory,{recursive:true,force:true});}
});
