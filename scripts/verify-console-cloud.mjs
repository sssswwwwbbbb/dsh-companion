import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
import {createDshFetch} from '../packages/dsh-companion/src/http.mjs';
import {remoteAdmin} from '../deploy/cloud-admin.mjs';

const login=JSON.parse(fs.readFileSync('.local/cloud/admin-login.json')),config=JSON.parse(fs.readFileSync('packages/dsh-companion/config/service.json'));
const metadata=JSON.parse(fs.readFileSync('packages/dsh-companion/package.json')),version=metadata.version,build=metadata.build??Number(version.match(/dev\.(\d+)/)?.[1]),artifact='dist/local-dsh-companion-'+version+'.tgz',permanent=process.argv.includes('--permanent');
const report={at:new Date().toISOString(),url:login.url,version,licenseMode:permanent?'permanent':'fixed-term',checks:{}},directory=path.resolve('.local/console-cloud-validation-'+Date.now());fs.mkdirSync(directory,{recursive:true,mode:0o700});
const jar=new Map(),issued=[];let csrf='',httpFetch,dispose;
const check=(value,name)=>{report.checks[name]=!!value;if(!value)throw new Error(name);};
function save(){fs.writeFileSync(permanent?'reports/permanent-validation.json':'reports/console-validation.json',JSON.stringify(report,null,2)+'\n');}
async function request(route,{method='GET',body,headers={},cookies=true,token=true}={}){
  const url=route.startsWith('/')?config.serviceUrl+route:login.url+'api/'+route;
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try{response=await httpFetch(url,{method,headers:{...(cookies&&jar.size?{cookie:[...jar.values()].join('; ')}:{}),...(method!=='GET'?{origin:new URL(login.url).origin,...(token?{'x-csrf-token':csrf}:{})}:{}),...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});break;}
    catch(error){if(method!=='GET'||attempt===2)throw error;(report.readRetries??=[]).push({route,attempt:attempt+1,code:error.cause?.code||error.name});}
  }
  if(cookies)for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],key=pair.slice(0,pair.indexOf('='));if(pair.endsWith('='))jar.delete(key);else jar.set(key,pair);}
  const bytes=Buffer.from(await response.arrayBuffer());let value;try{value=JSON.parse(bytes.toString());}catch{}
  return {status:response.status,headers:response.headers,bytes,value};
}
try{
  const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-http-proxy',policy=await import(pathToFileURL(sdk+'/lib/index.js')),require=createRequire(sdk+'/package.json');
  dispose=await policy.installProxyFromEnvironment(new Map(Object.entries(process.env).map(([key,value])=>[key,{value}])),()=>{});httpFetch=createDshFetch(require('undici').fetch,policy.proxyRouteFor);
  check((await request('/health')).value?.ok,'PUBLIC_HTTPS_HEALTH');check((await request('licenses')).status===401,'ANONYMOUS_CONSOLE_BLOCKED');
  csrf=(await request('csrf')).value.csrf;
  check((await request('login',{method:'POST',body:{username:login.username,password:'invalid-validation-password'}})).status===401,'WRONG_PASSWORD_BLOCKED');
  check((await request('login',{method:'POST',body:{username:login.username,password:login.password},headers:{origin:'https://untrusted.invalid'}})).status===403,'CROSS_ORIGIN_BLOCKED');
  check((await request('login',{method:'POST',body:{username:login.username,password:login.password},token:false})).status===403,'MISSING_CSRF_BLOCKED');
  const authenticated=await request('login',{method:'POST',body:{username:login.username,password:login.password}});check(authenticated.status===200,'ADMIN_LOGIN');csrf=authenticated.value.csrf;
  const cookie=authenticated.headers.getSetCookie().join(';');check(/Secure/.test(cookie)&&/HttpOnly/.test(cookie)&&/SameSite=Strict/.test(cookie)&&/Path=\/dsh-companion\/manage\//.test(cookie),'SECURE_PREFIXED_SESSION_COOKIE');
  check(/script-src 'self'/.test(authenticated.headers.get('content-security-policy')||''),'CSP_SELF_ONLY_SCRIPT');
  const options={requestId:randomUUID(),count:2,days:permanent?0:1,devices:1,label:permanent?'永久授权验收 · 临时':'管理页上线验收 · 临时'};
  const batch=await request('licenses/issue',{method:'POST',body:options});check(batch.status===200&&batch.value.licenses.length===2,'CONSOLE_BATCH_ISSUANCE');issued.push(...batch.value.licenses);
  if(permanent)check(issued.every(row=>row.permanent===true&&row.expiresAt===null),'ZERO_DAYS_ISSUES_PERMANENT_LICENSE');
  const replay=await request('licenses/issue',{method:'POST',body:options});check(replay.status===200&&replay.value.licenses[0].code===issued[0].code,'IDEMPOTENT_ISSUANCE');
  check((await request('licenses/issue',{method:'POST',body:{...options,days:2}})).status===409,'CHANGED_RETRY_BLOCKED');
  const csv=await request('licenses/export',{method:'POST',body:{ids:issued.map(row=>row.id)}});check(csv.status===200&&issued.every(row=>csv.bytes.includes(Buffer.from(row.code))),'AUTHENTICATED_CSV_EXPORT');
  if(permanent)check(csv.bytes.toString().includes('永久'),'PERMANENT_CSV_LABEL');
  const device=()=>createHash('sha256').update(randomUUID()).digest('hex');
  const first=new Entitlement({stateDir:path.join(directory,'first'),config,deviceId:device(),fetcher:httpFetch}),second=new Entitlement({stateDir:path.join(directory,'second'),config,deviceId:device(),fetcher:httpFetch});
  await first.activate(issued[0].code);check(first.status().active,'PLUGIN_ACTIVATES_CONSOLE_CODE');
  await second.activate(issued[0].code).then(()=>check(false,'PLUGIN_DEVICE_LIMIT'),error=>check(error.message==='DEVICE_LIMIT_REACHED','PLUGIN_DEVICE_LIMIT'));
  let detail=(await request('licenses/'+issued[0].id)).value.license;check(detail.devices.length===1,'BOUND_DEVICE_VISIBLE_IN_CONSOLE');
  if(permanent)check((await request('licenses/'+detail.id+'/update',{method:'POST',body:{revision:detail.revision,label:'永久授权验收',devices:1,extendDays:1}})).value?.error==='PERMANENT_LICENSE_NO_EXTENSION','PERMANENT_CANNOT_BECOME_FIXED_TERM_BY_EXTENSION');
  let changed=await request('licenses/'+detail.id+'/update',{method:'POST',body:{revision:detail.revision,label:'管理页上线验收 · 已调整',devices:1,extendDays:permanent?0:1}});check(changed.status===200&&(permanent?changed.value.license.permanent&&changed.value.license.expiresAt===null:changed.value.license.expiresAt===issued[0].expiresAt+86400000),permanent?'PERMANENT_METADATA_UPDATE':'EXTEND_EXISTING_AUTHORIZATION');
  check((await request('licenses/'+detail.id+'/update',{method:'POST',body:{revision:detail.revision,label:'stale',devices:1,extendDays:1}})).status===409,'STALE_ADMIN_EDIT_BLOCKED');detail=changed.value.license;
  check((await request('licenses/'+detail.id+'/release-device',{method:'POST',body:{revision:detail.revision,deviceId:first.deviceId}})).status===200,'ADMIN_UNBIND_DEVICE');
  check((await first.refresh(true)).errorCode==='LICENSE_DEVICE_RELEASED','PLUGIN_SEES_ADMIN_UNBIND');await second.activate(issued[0].code);check(second.status().active,'NEW_DEVICE_USES_RELEASED_SLOT');
  detail=(await request('licenses/'+detail.id)).value.license;check((await request('licenses/'+detail.id+'/status',{method:'POST',body:{revision:detail.revision,revoked:true}})).status===200,'ADMIN_REVOKE');check((await second.refresh(true)).errorCode==='LICENSE_REVOKED','PLUGIN_SEES_ADMIN_REVOCATION');
  detail=(await request('licenses/'+detail.id)).value.license;check((await request('licenses/'+detail.id+'/status',{method:'POST',body:{revision:detail.revision,revoked:false}})).status===200,'ADMIN_REENABLE');check((await second.refresh(true)).active,'PLUGIN_RENEWS_REENABLED_LICENSE');
  const releases=(await request('releases')).value.rows,latest=releases[0];check(latest.version===version&&latest.sha256===createHash('sha256').update(fs.readFileSync(artifact)).digest('hex'),'PUBLISHED_PLUGIN_PACKAGE_MATCHES_BUILD');
  check((await request('releases/'+latest.id+'/download',{cookies:false})).status===401,'ANONYMOUS_PACKAGE_BLOCKED');
  const controller=new AbortController(),response=await httpFetch(login.url+'api/releases/'+latest.id+'/download',{headers:{cookie:[...jar.values()].join('; ')},signal:controller.signal});
  check(response.status===200&&Number(response.headers.get('content-length'))===latest.size,'AUTHENTICATED_PACKAGE_DOWNLOAD');const reader=response.body.getReader(),chunk=(await reader.read()).value;
  const expected=Buffer.alloc(chunk.length),file=fs.openSync(artifact,'r');fs.readSync(file,expected);fs.closeSync(file);check(Buffer.from(chunk).equals(expected),'DOWNLOAD_PREFIX_MATCHES_LOCAL_PACKAGE');controller.abort();await reader.cancel().catch(()=>{});
  report.downloadVerification={mode:'headers-and-first-chunk',bytesCompared:chunk.length,packageBytes:latest.size,sha256:latest.sha256};
  check((await second.latest({dshVersion:'0.2.1-rc.5',build:build-1})).release.version===version,'PLUGIN_SIGNED_UPDATE_STILL_WORKS');
  check((await request('/admin/issue',{method:'POST',body:{}})).status===404,'LEGACY_SSH_ADMIN_REMAINS_PRIVATE');
  check((await request('/v1/activate',{method:'POST',body:{code:issued[0].code,deviceId:device()}})).status===403,'BROWSER_CANNOT_USE_PLUGIN_API');
  report.passed=true;
}catch(error){report.passed=false;report.failure=/^[A-Z_]+$/.test(error.message||'')?error.message:'CONSOLE_CLOUD_CHECK_FAILED';report.failureType=error.name;report.transportCode=error.cause?.code;}
finally{
  for(const row of issued){try{await remoteAdmin('revoke',{licenseId:row.id});}catch{report.cleanupFailed=true;report.passed=false;}}
  if(jar.size&&httpFetch&&!permanent)try{const cookie=[...jar.values()].join('; ');check((await request('logout',{method:'POST',body:{}})).status===200,'ADMIN_LOGOUT');check((await request('session',{cookies:false,headers:{cookie}})).status===401,'LOGOUT_INVALIDATES_REPLAYED_SESSION');}catch{report.passed=false;report.cleanupFailed=true;}
  if(permanent){jar.clear();report.managementSessionDiscarded=true;}
  await dispose?.();report.temporaryLicensesRevoked=!report.cleanupFailed;save();console.log(JSON.stringify({passed:report.passed,checks:Object.keys(report.checks).length,failure:report.failure,temporaryLicensesRevoked:report.temporaryLicensesRevoked}));process.exitCode=report.passed?0:1;
}
