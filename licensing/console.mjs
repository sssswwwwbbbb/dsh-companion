import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Fastify from 'fastify';
import secureSession from '@fastify/secure-session';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import {stringify} from 'csv-stringify/sync';
import {ConsoleError,ConsoleAuth,provisionConsole,openCodeVault,consoleKey} from './console-auth.mjs';
import {isPermanentLicense} from '../packages/dsh-companion/src/license-core.mjs';

const day=86400000,licenseId=/^lic_[a-f0-9-]{36}$/;
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
export async function createManagementConsole({stateDir,staticDir,transaction,issueLicense,clientAddress,now=Date.now,origin,publicPath='/manage/',environment='private'}){
  if(!/^\/[a-zA-Z0-9/_-]+\/$/.test(publicPath))throw new ConsoleError('CONSOLE_PATH_INVALID',500);
  if(origin&&(!['http:','https:'].includes(new URL(origin).protocol)||new URL(origin).origin!==origin))throw new ConsoleError('CONSOLE_ORIGIN_INVALID',500);
  await provisionConsole(stateDir,{now});
  const vault=openCodeVault(stateDir,await transaction(db=>db,false)),auth=new ConsoleAuth({stateDir,now});
  const app=Fastify({logger:false,bodyLimit:32768,requestTimeout:30000});
  await app.register(secureSession,{key:consoleKey(stateDir,'console-session-key.bin'),cookieName:'dsh_companion_admin',expiry:12*3600,cookie:{path:publicPath,httpOnly:true,secure:origin?.startsWith('https:')===true,sameSite:'strict',maxAge:12*3600}});
  await app.register(csrfProtection,{sessionPlugin:'@fastify/secure-session',getToken:request=>request.headers['x-csrf-token']});
  await app.register(rateLimit,{global:false,keyGenerator:request=>clientAddress(request.raw)});
  await app.register(helmet,{referrerPolicy:{policy:'no-referrer'},frameguard:{action:'deny'},hsts:origin?.startsWith('https:')?{maxAge:86400}:false,contentSecurityPolicy:{directives:{defaultSrc:["'none'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],fontSrc:["'self'"],baseUri:["'self'"],formAction:["'self'"],frameAncestors:["'none'"],objectSrc:["'none'"],upgradeInsecureRequests:null}}});
  app.addHook('onSend',async(request,reply,payload)=>{reply.header('Cache-Control','no-store');return payload;});
  app.addHook('onRequest',(request,reply,done)=>{
    try{
      if(!request.url.startsWith('/manage/api/')){done();return;}
      const mutation=!['GET','HEAD'].includes(request.method),supplied=request.headers.origin;
      const host=new URL('http://'+request.headers.host);
      if(!origin&&(host.username||host.password||!['127.0.0.1','localhost','[::1]'].includes(host.hostname)))throw new ConsoleError('ORIGIN_FORBIDDEN',403);
      if((mutation&&!supplied)||(supplied&&supplied!==(origin||host.origin))||request.headers['sec-fetch-site']==='cross-site')throw new ConsoleError('ORIGIN_FORBIDDEN',403);
      if(mutation){app.csrfProtection(request,reply,done);return;}done();
    }catch(error){done(error);}
  });
  app.setErrorHandler((error,request,reply)=>{
    const csrf=String(error.code||'').startsWith('FST_CSRF');
    const status=error instanceof ConsoleError?error.status:csrf?403:error.statusCode===429?429:error.statusCode===413?413:error.statusCode>=400&&error.statusCode<500?error.statusCode:500;
    const code=error instanceof ConsoleError?error.message:csrf?'CSRF_FAILED':status===429?'LOGIN_RATE_LIMIT':status===413?'REQUEST_TOO_LARGE':status<500?'INVALID_REQUEST':'CONSOLE_REQUEST_FAILED';
    if(code==='AUTH_REQUIRED')request.session?.delete();reply.code(status).send({error:code});
  });
  app.setNotFoundHandler((request,reply)=>reply.code(404).send({error:'NOT_FOUND'}));
  const input=request=>{if(!/^application\/json(?:;|$)/i.test(request.headers['content-type']||''))throw new ConsoleError('JSON_REQUIRED',415);if(!request.body||typeof request.body!=='object'||Array.isArray(request.body))throw new ConsoleError('INVALID_JSON');return request.body;};
  const audit=(db,type,values={})=>db.audit.push({at:now(),type,actor:'console',...values});
  const usedIds=db=>new Set(db.audit.filter(row=>row.type==='activated').map(row=>row.licenseId));
  const summary=(row,used)=>({id:row.id,label:row.label,codeHint:row.codeHint||null,codeRecoverable:!!row.codeBox,createdAt:row.createdAt,expiresAt:row.expiresAt,permanent:isPermanentLicense(row),maxDevices:row.maxDevices,revision:row.revision||0,devices:row.devices.map(device=>({id:device.id,boundAt:device.boundAt})),status:row.revoked?'revoked':!isPermanentLicense(row)&&row.expiresAt<=now()?'expired':row.devices.length?'active':used.has(row.id)?'unbound':'unused'});
  const find=(db,id)=>{const row=db.licenses.find(value=>value.id===id);if(!row)throw new ConsoleError('LICENSE_NOT_FOUND',404);return row;};
  const principal=request=>auth.authenticate(request.session);
  const sessionResult=async(request,reply)=>{const user=principal(request);return {username:user.username,csrf:await reply.generateCsrf(),expiresAt:user.expiresAt,environment,serverTime:now()};};
  app.get('/manage',async(request,reply)=>reply.redirect(publicPath));
  app.get('/manage/api/csrf',async(request,reply)=>({csrf:await reply.generateCsrf()}));
  app.post('/manage/api/login',{config:{rateLimit:{max:8,timeWindow:15*60000}}},async(request,reply)=>{
    const value=input(request),user=await auth.login(value.username,value.password);request.session.regenerate();request.session.set('admin',user);
    await transaction(db=>audit(db,'console-login'));return sessionResult(request,reply);
  });
  app.get('/manage/api/session',sessionResult);
  app.post('/manage/api/logout',async(request)=>{principal(request);auth.logoutAll();request.session.delete();return {ok:true};});
  app.post('/manage/api/password',async(request)=>{
    principal(request);const value=input(request);await auth.changePassword(value.oldPassword,value.newPassword);request.session.delete();
    fs.rmSync(path.join(stateDir,'console-initial.json'),{force:true});await transaction(db=>audit(db,'console-password-changed'));return {ok:true};
  });
  app.get('/manage/api/licenses',async request=>{
    principal(request);const url=new URL(request.url,'http://127.0.0.1');
    return transaction(db=>{
      const used=usedIds(db),all=db.licenses.map(row=>summary(row,used)),valid=all.filter(row=>!['expired','revoked'].includes(row.status));
      const totals={total:all.length,valid:valid.length,devices:valid.reduce((n,row)=>n+row.devices.length,0),unbound:valid.filter(row=>!row.devices.length).length,expiring:valid.filter(row=>!row.permanent&&row.expiresAt<=now()+7*day).length};
      const filter=url.searchParams.get('status')||'valid',query=(url.searchParams.get('q')||'').trim().slice(0,100).toLowerCase();
      const rows=all.filter(row=>(filter==='all'||filter==='valid'&&!['expired','revoked'].includes(row.status)||row.status===filter)&&(!query||[row.id,row.label,row.codeHint||''].some(value=>String(value).toLowerCase().includes(query)))).sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
      const page=Math.max(1,Math.min(100000,Math.floor(Number(url.searchParams.get('page'))||1))),pageSize=20;
      return {totals,rows:rows.slice((page-1)*pageSize,page*pageSize),total:rows.length,page,pageSize,serverTime:now()};
    },false);
  });
  app.post('/manage/api/licenses/issue',async request=>{
    principal(request);const {count=1,days=30,devices=1,label='',requestId:id}=input(request);
    if(!integer(count,1,100)||!integer(days,0,3650)||!integer(devices,1,50)||typeof label!=='string'||label.length>80||typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new ConsoleError('INVALID_ISSUE_OPTIONS');
    const spec=createHash('sha256').update(JSON.stringify({count,days,devices,label:label.trim()})).digest('hex');
    return transaction(async db=>{
      const previous=db.licenses.filter(row=>row.batchId===id);
      if(previous.length){if(previous.length!==count||previous.some(row=>row.batchSpec!==spec))throw new ConsoleError('ISSUE_REQUEST_CONFLICT',409);return {batchId:id,licenses:await Promise.all(previous.map(async row=>({id:row.id,code:await vault.reveal(row),label:row.label,expiresAt:row.expiresAt,permanent:isPermanentLicense(row),maxDevices:row.maxDevices})))};}
      const licenses=[];for(let i=0;i<count;i++){const {license,code}=await issueLicense(db,{devices,days,label:label.trim()||'私有授权',source:'console'});license.batchId=id;license.batchSpec=spec;licenses.push({id:license.id,code,label:license.label,expiresAt:license.expiresAt,permanent:isPermanentLicense(license),maxDevices:license.maxDevices});}
      audit(db,'console-batch-issued',{count,batchId:id});return {batchId:id,licenses};
    });
  });
  app.post('/manage/api/licenses/export',async(request,reply)=>{
    principal(request);const value=input(request);
    if(!Array.isArray(value.ids)||!value.ids.length||value.ids.length>100||new Set(value.ids).size!==value.ids.length||!value.ids.every(id=>typeof id==='string'&&licenseId.test(id)))throw new ConsoleError('INVALID_SELECTION');
    const records=await transaction(async db=>{
      const rows=value.ids.map(id=>find(db,id));if(rows.some(row=>!row.codeBox))throw new ConsoleError('CODE_NOT_RETAINED',409);
      audit(db,'console-codes-exported',{licenseIds:value.ids,count:rows.length});
      return Promise.all(rows.map(async row=>({code:await vault.reveal(row),label:row.label,expiresAt:isPermanentLicense(row)?'永久':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium'}).format(row.expiresAt),devices:row.maxDevices})));
    });
    return reply.type('text/csv; charset=utf-8').header('Content-Disposition','attachment; filename="dsh-activation-codes.csv"').send(stringify(records,{header:true,bom:true,escape_formulas:true,columns:[{key:'code',header:'激活码'},{key:'label',header:'备注'},{key:'expiresAt',header:'到期时间（北京时间）'},{key:'devices',header:'设备数量'}]}));
  });
  app.get('/manage/api/licenses/:id',async request=>{principal(request);return transaction(db=>({license:summary(find(db,request.params.id),usedIds(db)),audit:db.audit.filter(event=>event.licenseId===request.params.id||event.licenseIds?.includes(request.params.id)).slice(-20).reverse()}),false);});
  app.post('/manage/api/licenses/:id/:action',async request=>{
    principal(request);const {id,action}=request.params,value=input(request);
    return transaction(async db=>{
      const row=find(db,id);
      if(action==='code'){const code=await vault.reveal(row);audit(db,'console-code-viewed',{licenseId:id});return {code};}
      if(value.revision!==(row.revision||0))throw new ConsoleError('LICENSE_CHANGED',409);
      if(action==='update'){
        if(typeof value.label!=='string'||value.label.length>80||!integer(value.devices,1,50)||!integer(value.extendDays??0,0,3650))throw new ConsoleError('INVALID_LICENSE_OPTIONS');
        if(value.devices<row.devices.length)throw new ConsoleError('DEVICE_LIMIT_BELOW_BOUND',409);
        if(isPermanentLicense(row)&&value.extendDays)throw new ConsoleError('PERMANENT_LICENSE_NO_EXTENSION',409);
        row.label=value.label.trim()||'私有授权';row.maxDevices=value.devices;if(value.extendDays)row.expiresAt=Math.max(now(),row.expiresAt)+value.extendDays*day;
        audit(db,'console-license-updated',{licenseId:id,extendDays:value.extendDays||0,maxDevices:value.devices});
      }else if(action==='status'){
        if(typeof value.revoked!=='boolean')throw new ConsoleError('INVALID_LICENSE_OPTIONS');if(!value.revoked&&!isPermanentLicense(row)&&row.expiresAt<=now())throw new ConsoleError('LICENSE_EXPIRED');
        row.revoked=value.revoked;audit(db,row.revoked?'revoked':'console-license-enabled',{licenseId:id});
      }else if(action==='release-device'){
        if(value.all!==true&&!/^[a-f0-9]{64}$/.test(value.deviceId||''))throw new ConsoleError('INVALID_DEVICE');
        const before=row.devices.length;row.devices=value.all===true?[]:row.devices.filter(device=>device.id!==value.deviceId);if(before===row.devices.length)throw new ConsoleError('DEVICE_NOT_FOUND',404);
        audit(db,'console-device-released',{licenseId:id,count:before-row.devices.length});
      }else throw new ConsoleError('NOT_FOUND',404);
      row.revision=(row.revision||0)+1;row.updatedAt=now();return {license:summary(row,usedIds(db))};
    });
  });
  app.get('/manage/api/releases',async request=>{principal(request);return transaction(db=>({rows:[...db.releases].sort((a,b)=>b.build-a.build).map(row=>({id:row.id,version:row.version,build:row.build,platform:row.platform,supportedDsh:row.supportedDsh,size:row.size,sha256:row.sha256,publishedAt:row.publishedAt,filename:row.filename,publicInstall:row.publicInstall===true,installPath:row.publicInstall?publicPath.replace(/manage\/$/,'install/')+row.filename:null}))}),false);});
  let downloads=0;
  app.get('/manage/api/releases/:id/download',async(request,reply)=>{
    principal(request);if(downloads>=2)throw new ConsoleError('DOWNLOAD_RATE_LIMIT',429);
    const row=await transaction(db=>{const row=db.releases.find(value=>value.id===request.params.id);if(!row)throw new ConsoleError('RELEASE_NOT_FOUND',404);audit(db,'console-package-downloaded',{releaseId:row.id});return row;});
    const file=path.join(stateDir,'releases',row.sha256+'.tgz');if(!fs.existsSync(file))throw new ConsoleError('RELEASE_NOT_FOUND',404);
    downloads++;reply.raw.once('close',()=>{downloads--;});return reply.type('application/octet-stream').header('Content-Length',row.size).header('Content-Disposition','attachment; filename="'+row.filename+'"').send(fs.createReadStream(file));
  });
  await app.register(staticFiles,{root:path.resolve(staticDir),prefix:'/manage/',cacheControl:false,etag:false,index:'index.html'});
  await app.ready();
  return {protectCode:(id,code)=>vault.protect(id,code),handle:(request,response)=>app.routing(request,response),close:()=>app.close()};
}
