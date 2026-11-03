import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';
import { randomBytes, randomUUID, generateKeyPairSync, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {pipeline} from 'node:stream';
import {createManagementConsole} from './console.mjs';
import { signedEnvelope, verifyLicense, productId, isPermanentLicense } from '../packages/dsh-companion/src/license-core.mjs';

const day = 86400000;
const failure = code => { throw new Error(code); };
function atomic(file, value) {
  const temporary = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value,null,2)+'\n', { mode:0o600 });fs.renameSync(temporary,file);fs.chmodSync(file,0o600);
}
export async function createLicenseService({ stateDir, port=0, now=Date.now, graceMs=7*day, trustProxy=false, consoleEnabled=false, consoleOrigin, consolePublicPath='/manage/', consoleStaticDir, consoleEnvironment='private', requestLogger=()=>{} }) {
  fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
  const privateFile=path.join(stateDir,'signing-private.pem'), publicFile=path.join(stateDir,'signing-public.pem'), adminFile=path.join(stateDir,'admin.token'), database=path.join(stateDir,'database.json');
  if (!fs.existsSync(privateFile)) {
    const keys=generateKeyPairSync('ed25519');
    fs.writeFileSync(privateFile,keys.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
    fs.writeFileSync(publicFile,keys.publicKey.export({type:'spki',format:'pem'}),{mode:0o600});
  }
  if(!fs.existsSync(adminFile))fs.writeFileSync(adminFile,randomBytes(32).toString('hex'),{mode:0o600});
  if(!fs.existsSync(database))atomic(database,{schemaVersion:1,licenses:[],releases:[],audit:[]});
  const privateKey=fs.readFileSync(privateFile,'utf8'), publicKey=fs.readFileSync(publicFile,'utf8'), adminToken=fs.readFileSync(adminFile,'utf8');
  let queue=Promise.resolve();
  const transaction=(fn,write=true)=>{
    const operation=queue.then(async()=>{const db=JSON.parse(fs.readFileSync(database,'utf8'));const result=await fn(db);if(write)atomic(database,db);return result;});
    queue=operation.catch(()=>{});return operation;
  };
  const normalizedCode=code=>String(code||'').trim().toUpperCase();
  const hashCode=code=>createHash('sha256').update(normalizedCode(code)).digest('hex');
  let management,publicDownloads=0;
  const issueLicense=async(db,{devices,days,label,source='ssh'})=>{
    const code='DSHC-'+randomBytes(18).toString('hex').toUpperCase().match(/.{1,6}/g).join('-');
    const license={id:'lic_'+randomUUID(),codeHash:hashCode(code),label:String(label||'private').slice(0,80),createdAt:now(),expiresAt:days===0?null:now()+days*day,...(days===0?{permanent:true}:{}),maxDevices:devices,revoked:false,devices:[],source};
    if(management)Object.assign(license,await management.protectCode(license.id,code));
    db.licenses.push(license);db.audit.push({at:now(),type:'issued',licenseId:license.id});return {license,code};
  };
  const admin=request=>{
    const expected=Buffer.from('Bearer '+adminToken), actual=Buffer.from(String(request.headers.authorization||''));
    return actual.length===expected.length&&timingSafeEqual(actual,expected);
  };
  const receipt=(license,deviceId)=>{const permanent=isPermanentLicense(license);return signedEnvelope({format:permanent?2:1,product:productId,licenseId:license.id,deviceId,issuedAt:now(),expiresAt:license.expiresAt,...(permanent?{permanent:true}:{}),offlineUntil:permanent?now()+graceMs:Math.min(license.expiresAt,now()+graceMs),renewAfter:now()+Math.min(day,graceMs/2),entitlements:['companion','startup','configuration','private-updates']},privateKey);};
  function licensed(db,envelope,deviceId) {
    const claims=verifyLicense(envelope,{publicKey,deviceId,now:now(),allowExpired:true});
    const license=db.licenses.find(row=>row.id===claims.licenseId);
    if(!license||license.revoked)failure('LICENSE_REVOKED');
    if(!isPermanentLicense(license)&&now()>license.expiresAt)failure('LICENSE_EXPIRED');
    if(!license.devices.some(row=>row.id===deviceId))failure('LICENSE_DEVICE_RELEASED');
    return {license,claims};
  }
  const invalidAttempts=new Map();
  function clientAddress(request) {
    const peer=request.socket.remoteAddress||'local',forwarded=request.headers['x-real-ip'];
    const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer);
    return trustProxy&&loopback&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:peer;
  }
  function rememberFailure(client,recent) {
    invalidAttempts.delete(client);invalidAttempts.set(client,[...recent,now()]);
    if(invalidAttempts.size>4096)invalidAttempts.delete(invalidAttempts.keys().next().value);
  }
  if(consoleEnabled){
    if(trustProxy&&!consoleOrigin)throw new Error('CONSOLE_ORIGIN_REQUIRED');
    management=await createManagementConsole({stateDir,now,transaction,issueLicense,clientAddress,origin:consoleOrigin,publicPath:consolePublicPath,environment:consoleEnvironment,staticDir:consoleStaticDir||fileURLToPath(new URL('../designs/dsh-companion-admin/build/',import.meta.url))});
  }
  const server=http.createServer(async(request,response)=>{
    response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
    let businessError=null;
    const requestPath=(()=>{try{return new URL(request.url,'http://127.0.0.1').pathname;}catch{return '';}})();
    if(['/v1/activate','/v1/renew','/v1/deactivate','/v1/releases/latest','/v1/releases/download'].includes(requestPath)){
      const requestId=randomUUID(),started=performance.now();let logged=false;response.setHeader('X-Request-ID',requestId);
      const record=()=>{if(logged)return;logged=true;try{requestLogger({at:new Date().toISOString(),requestId,method:request.method,path:requestPath,status:response.writableFinished?response.statusCode:499,durationMs:Math.round((performance.now()-started)*1000)/1000,errorCode:response.writableFinished?businessError:'CLIENT_DISCONNECTED'});}catch{}};
      response.once('finish',record);response.once('close',record);
    }
    const json=(value,status=200)=>{if(status>=400&&/^[A-Z_]+$/.test(value?.error||''))businessError=value.error;response.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});response.end(JSON.stringify(value));};
    try {
      const url=new URL(request.url,'http://127.0.0.1');
      if(management&&(url.pathname==='/manage'||url.pathname.startsWith('/manage/'))){await management.handle(request,response,url);return;}
      if(url.pathname.startsWith('/install/')){
        if(!['GET','HEAD'].includes(request.method)){json({error:'METHOD_NOT_ALLOWED'},405);return;}
        const filename=url.pathname.slice('/install/'.length);
        if(!/^dsh-companion-[0-9A-Za-z.+-]+\.tgz$/.test(filename)){json({error:'NOT_FOUND'},404);return;}
        const release=await transaction(db=>db.releases.find(row=>row.publicInstall===true&&row.filename===filename),false);
        if(!release){json({error:'NOT_FOUND'},404);return;}
        const file=path.join(stateDir,'releases',release.sha256+'.tgz');if(!fs.existsSync(file)){json({error:'NOT_FOUND'},404);return;}
        const etag='"'+release.sha256+'"';response.setHeader('ETag',etag);response.setHeader('Cache-Control','public, max-age=31536000, immutable');
        if(request.headers['if-none-match']===etag){response.writeHead(304);response.end();return;}
        if(request.method==='GET'&&publicDownloads>=2){response.setHeader('Cache-Control','no-store');json({error:'DOWNLOAD_RATE_LIMIT'},429);return;}
        response.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':release.size,'Content-Disposition':'attachment; filename="'+filename+'"'});
        if(request.method==='HEAD'){response.end();return;}
        publicDownloads++;response.once('close',()=>{publicDownloads--;});pipeline(fs.createReadStream(file),response,()=>{});return;
      }
      if(request.headers.origin){json({error:'FORBIDDEN'},403);return;}
      if(request.method==='GET'&&url.pathname==='/health'){json({ok:true,product:productId,mode:trustProxy?'private-https-service':'private-local-service'});return;}
      if(url.pathname.startsWith('/admin/')&&!admin(request)){json({error:'FORBIDDEN'},403);return;}
      let body='';
      for await(const chunk of request){body+=chunk;if(Buffer.byteLength(body)>32768)failure('REQUEST_TOO_LARGE');}
      const input=body?JSON.parse(body):{};
      if(request.method==='POST'&&url.pathname==='/admin/issue'){
        const devices=input.devices??1, days=input.days??30;
        if(!Number.isInteger(devices)||devices<1||devices>50||!Number.isInteger(days)||days<0||days>3650)failure('INVALID_LICENSE_LIMITS');
        const result=await transaction(async db=>{const {license,code}=await issueLicense(db,{devices,days,label:input.label});return {licenseId:license.id,expiresAt:license.expiresAt,permanent:isPermanentLicense(license),code};});
        json(result);return;
      }
      if(request.method==='POST'&&url.pathname==='/admin/revoke'){
        await transaction(db=>{const license=db.licenses.find(row=>row.id===input.licenseId);if(!license)failure('LICENSE_NOT_FOUND');license.revoked=true;db.audit.push({at:now(),type:'revoked',licenseId:license.id});});json({ok:true});return;
      }
      if(request.method==='POST'&&url.pathname==='/admin/releases'){
        if(!path.isAbsolute(input.artifact||'')||!String(input.artifact).endsWith('.tgz')||!Number.isSafeInteger(input.build)||input.build<1||!Array.isArray(input.supportedDsh)||input.supportedDsh.length<1||!input.supportedDsh.every(s=>typeof s==='string'&&s.length<50)||!/^[0-9A-Za-z.+-]{1,80}$/.test(input.version||''))failure('INVALID_RELEASE');
        if(input.publicInstall!==undefined&&typeof input.publicInstall!=='boolean')failure('INVALID_RELEASE');
        const bytes=fs.readFileSync(input.artifact), sha256=createHash('sha256').update(bytes).digest('hex');
        const artifactDir=path.join(stateDir,'releases');fs.mkdirSync(artifactDir,{recursive:true,mode:0o700});fs.writeFileSync(path.join(artifactDir,sha256+'.tgz'),bytes,{mode:0o600});
        const release={id:'rel_'+randomUUID(),product:productId,version:input.version,build:input.build,platform:'darwin-arm64',channel:'private',supportedDsh:input.supportedDsh,sha256,size:bytes.length,filename:'dsh-companion-'+input.version+'.tgz',publishedAt:now(),publicInstall:input.publicInstall===true};
        const published=await transaction(db=>{
          const existing=db.releases.find(row=>row.platform===release.platform&&(row.version===release.version||row.build===release.build));
          if(existing){if(existing.version!==release.version||existing.build!==release.build||existing.sha256!==sha256)failure('RELEASE_CONFLICT');if(release.publicInstall&&!existing.publicInstall)failure('RELEASE_VISIBILITY_CONFLICT');return existing;}
          db.releases.push(release);db.audit.push({at:now(),type:'release-published',releaseId:release.id});return release;
        });json({releaseId:published.id,sha256,size:bytes.length});return;
      }
      if(request.method==='POST'&&url.pathname==='/v1/activate'){
        if(!/^[a-f0-9]{64}$/.test(input.deviceId||''))failure('INVALID_DEVICE');
        const client=clientAddress(request), attempts=invalidAttempts.get(client)||[];
        const recent=attempts.filter(at=>at>now()-60000);if(recent.length>=20)failure('ACTIVATION_RATE_LIMIT');
        const result=await transaction(db=>{const license=db.licenses.find(row=>row.codeHash===hashCode(input.code));if(!license){rememberFailure(client,recent);failure('ACTIVATION_CODE_INVALID');}if(license.revoked)failure('LICENSE_REVOKED');if(isPermanentLicense(license)){if(!Array.isArray(input.licenseFormats)||!input.licenseFormats.includes(2))failure('CLIENT_UPDATE_REQUIRED');}else if(now()>license.expiresAt)failure('LICENSE_EXPIRED');if(!license.devices.some(row=>row.id===input.deviceId)){if(license.devices.length>=license.maxDevices)failure('DEVICE_LIMIT_REACHED');license.devices.push({id:input.deviceId,boundAt:now()});}db.audit.push({at:now(),type:'activated',licenseId:license.id});return {receipt:receipt(license,input.deviceId)};});json(result);return;
      }
      if(request.method==='POST'&&['/v1/renew','/v1/deactivate','/v1/releases/latest','/v1/releases/download'].includes(url.pathname)){
        const result=await transaction(db=>{
          const {license}=licensed(db,input.receipt,input.deviceId);
          if(url.pathname==='/v1/renew')return {receipt:receipt(license,input.deviceId)};
          if(url.pathname==='/v1/deactivate'){license.devices=license.devices.filter(row=>row.id!==input.deviceId);db.audit.push({at:now(),type:'deactivated',licenseId:license.id});return {ok:true};}
          const releases=db.releases.filter(row=>row.platform===input.platform&&row.channel==='private'&&row.supportedDsh.includes(input.dshVersion)).sort((a,b)=>b.build-a.build||b.publishedAt-a.publishedAt);
          const release=url.pathname.endsWith('/download')?releases.find(row=>row.id===input.releaseId):releases[0];
          if(!release)failure('NO_COMPATIBLE_RELEASE');
          return {release};
        },url.pathname==='/v1/deactivate');
        if(url.pathname==='/v1/releases/latest'){json({manifest:signedEnvelope(result.release,privateKey)});return;}
        if(url.pathname==='/v1/releases/download'){
          const file=path.join(stateDir,'releases',result.release.sha256+'.tgz');
          response.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':result.release.size,'Content-Disposition':'attachment; filename="'+result.release.filename+'"'});
          pipeline(fs.createReadStream(file),response,()=>{});return;
        }
        json(result);return;
      }
      json({error:'NOT_FOUND'},404);
    }catch(error){if(!response.headersSent)json({error:/^[A-Z_]+$/.test(error.message||'')?error.message:'REQUEST_FAILED'},400);else response.destroy();}
  });
  server.requestTimeout=30000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const actualPort=server.address().port;
  atomic(path.join(stateDir,'service.json'),{pid:process.pid,port:actualPort,serviceUrl:'http://127.0.0.1:'+actualPort,productId,publicKey});
  const close=async()=>{await new Promise(resolve=>server.close(resolve));await management?.close();};
  return {server,port:actualPort,publicKey,adminToken,close};
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
  const stateDir=path.resolve(process.argv[2]||'.local/license-service'), port=Number(process.argv[3]||4312);
  const service=await createLicenseService({stateDir,port,trustProxy:process.env.DSH_LICENSE_TRUST_PROXY==='1',consoleEnabled:process.env.DSH_CONSOLE_ENABLED==='1',consoleOrigin:process.env.DSH_CONSOLE_ORIGIN,consolePublicPath:process.env.DSH_CONSOLE_PUBLIC_PATH||'/manage/',requestLogger:entry=>process.stdout.write(JSON.stringify(entry)+'\n')});
  process.on('SIGTERM',()=>service.close().then(()=>process.exit(0)));
  process.on('SIGINT',()=>service.close().then(()=>process.exit(0)));
}
