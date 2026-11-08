import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Entitlement} from '../packages/dsh-companion/src/entitlement.mjs';
import {remoteAdmin} from '../deploy/cloud-admin.mjs';
import {createDshFetch} from '../packages/dsh-companion/src/http.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const root=process.cwd(),config=JSON.parse(fs.readFileSync('packages/dsh-companion/config/service.json'));
const metadata=JSON.parse(fs.readFileSync('packages/dsh-companion/package.json')),version=metadata.version;
const build=metadata.build??Number(version.match(/dev\.(\d+)/)?.[1]);let httpFetch=globalThis.fetch,disposeNetwork;
const directory=path.join(root,'.local/cloud-validation-'+Date.now());fs.mkdirSync(directory,{recursive:true,mode:0o700});
const report={at:new Date().toISOString(),endpoint:config.serviceUrl,version,tlsVerification:true,node:process.version,existingProxyEnabled:process.env.NODE_USE_ENV_PROXY==='1',checks:{},steps:[]};
const reportFile=path.join(root,'reports/cloud-validation.json');
function checkpoint(step){report.steps.push(step);fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(step);}
function check(value,name){report.checks[name]=Boolean(value);if(!value)throw new Error(name);}
async function request(route,method='GET',input,headers={}){
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try{response=await httpFetch(config.serviceUrl+route,{method,headers:{...(input?{'content-type':'application/json'}:{}),...headers},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(15000)});break;}
    catch(error){
      if(method!=='GET'||attempt===2)throw error;
      (report.transportRetries??=[]).push({route,attempt:attempt+1,code:error.cause?.code||error.name});
    }
  }
  const value=await response.json().catch(()=>({}));return {status:response.status,value};
}
let issued;
try{
  const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-http-proxy';
  const policy=await import(pathToFileURL(sdk+'/lib/index.js'));
  const require=createRequire(sdk+'/package.json');
  disposeNetwork=await policy.installProxyFromEnvironment(new Map(Object.entries(process.env).map(([key,value])=>[key,{value}])),()=>{});
  httpFetch=createDshFetch(require('undici').fetch,policy.proxyRouteFor);
  report.transport='DSH official undici and proxy route';report.dshProxyConfigured=policy.proxyRouteFor(new URL(config.serviceUrl)).proxied;
  const health=await request('/health');check(health.status===200&&health.value.mode==='private-https-service','HTTPS_HEALTH');
  for(const route of ['/admin/issue','/%61dmin/issue','/admin/releases'])check((await request(route,'POST',{})).status===404,'PUBLIC_ADMIN_BLOCKED_'+route.replace(/\W+/g,'_'));
  check((await request('/v1/releases/latest','POST',{platform:'darwin-arm64',dshVersion:'0.2.1-rc.5'})).status===400,'ANONYMOUS_MANIFEST_BLOCKED');
  check((await request('/v1/releases/download','POST',{})).status===400,'ANONYMOUS_DOWNLOAD_BLOCKED');
  checkpoint('https-and-private-boundaries-passed');
  issued=await remoteAdmin('issue',{label:'cloud acceptance temporary',devices:1,days:30});
  const device=name=>createHash('sha256').update(randomUUID()+name).digest('hex');
  const first=new Entitlement({stateDir:path.join(directory,'first'),config,deviceId:device('a'),fetcher:httpFetch});
  const second=new Entitlement({stateDir:path.join(directory,'second'),config,deviceId:device('b'),fetcher:httpFetch});
  check((await request('/v1/activate','POST',{code:issued.code,deviceId:first.deviceId},{origin:'https://example.test'})).status===403,'BROWSER_ORIGIN_BLOCKED');
  await first.activate(issued.code);check(first.status().active,'HTTPS_ACTIVATION');
  await second.activate(issued.code).then(()=>check(false,'DEVICE_LIMIT'),error=>check(error.message==='DEVICE_LIMIT_REACHED','DEVICE_LIMIT'));
  await first.deactivate();check(!first.status().active,'HTTPS_UNBIND');
  await second.activate(issued.code);check(second.status().active,'DEVICE_SLOT_RELEASED');
  check((await second.refresh(true)).active,'HTTPS_RENEWAL');
  checkpoint('activation-binding-unbinding-renewal-passed');
  const update=await second.latest({dshVersion:'0.2.1-rc.5',build:build-1});
  check(update.available&&update.release.version===version&&update.release.build===build,'SIGNED_COMPATIBLE_MANIFEST');
  await second.latest({dshVersion:'unsupported',build:build-1}).then(()=>check(false,'UNKNOWN_DSH_BLOCKED'),error=>check(error.message==='NO_COMPATIBLE_RELEASE','UNKNOWN_DSH_BLOCKED'));
  check((await request('/releases/'+update.release.sha256+'.tgz')).status===404,'DIRECT_ARTIFACT_URL_BLOCKED');
  checkpoint('downloading-real-cloud-package');
  const started=Date.now();const download=await second.download({dshVersion:'0.2.1-rc.5',build:build-1});
  report.download={size:download.size,elapsedMs:Date.now()-started,sha256:update.release.sha256};
  check(download.verified,'PUBLIC_DOWNLOAD_HASH_VERIFIED');
  const record=JSON.parse(fs.readFileSync(path.join(directory,'second/download.json')));
  const localHash=createHash('sha256').update(fs.readFileSync(path.join(root,'dist/local-dsh-companion-'+version+'.tgz'))).digest('hex');
  check(record.sha256===localHash,'DOWNLOADED_PACKAGE_MATCHES_BUILD');
  checkpoint('real-package-download-passed');
  let clock=Date.now()+86400000;
  const offline=new Entitlement({stateDir:path.join(directory,'offline'),config,deviceId:second.deviceId,now:()=>clock});
  fs.mkdirSync(offline.stateDir,{recursive:true,mode:0o700});fs.copyFileSync(second.file,offline.file);fs.chmodSync(offline.file,0o600);
  offline.post=async()=>{throw new Error('LICENSE_SERVICE_UNAVAILABLE');};
  check((await offline.refresh(true)).state==='offline'&&offline.status().active,'OFFLINE_GRACE');
  clock+=7*86400000;check(!offline.status().active,'OFFLINE_GRACE_FINITE');
  await remoteAdmin('revoke',{licenseId:issued.licenseId});
  check(!(await second.refresh(true)).active&&second.status().errorCode==='LICENSE_REVOKED','CLOUD_REVOCATION');
  report.passed=true;
}catch(error){report.passed=false;report.failure=/^[A-Z_]+$/.test(error.message||'')?error.message:'CLOUD_VALIDATION_FAILED';report.failureType=error.name;report.transportCode=error.cause?.code;}
finally{
  if(issued){try{await remoteAdmin('revoke',{licenseId:issued.licenseId});report.temporaryLicenseRevoked=true;}catch{report.temporaryLicenseRevoked=false;report.passed=false;}}
  await disposeNetwork?.();
  checkpoint('finished');
}
console.log(JSON.stringify({passed:report.passed,checks:Object.keys(report.checks).length,failure:report.failure}));process.exitCode=report.passed?0:1;
