import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Transform, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { verifyLicense, verifiedEnvelope, deviceIdentity, isPermanentLicense } from './license-core.mjs';
import { readJson, writeJson } from './storage.mjs';

export class Entitlement {
  constructor({stateDir,config,deviceId=deviceIdentity(),now=Date.now,fetcher=globalThis.fetch}) {
    this.stateDir=stateDir;this.config=config;this.deviceId=deviceId;this.now=now;this.fetcher=fetcher;this.file=path.join(stateDir,'license.json');this.pending=undefined;
    const url=new URL(config.serviceUrl);
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('LICENSE_ENDPOINT_INVALID');
  }
  record(){return readJson(this.file,null);}
  status(){
    const record=this.record();
    if(!record)return {active:false,state:'unactivated'};
    if(record.blocked)return {active:false,state:'blocked',errorCode:record.blocked};
    try {
      if(record.lastSeenAt>this.now()+300000)throw new Error('LICENSE_CLOCK_INVALID');
      const claims=verifyLicense(record.receipt,{publicKey:this.config.publicKey,deviceId:this.deviceId,now:this.now()});
      return {active:true,state:record.lastError?'offline':'active',licenseId:claims.licenseId,permanent:isPermanentLicense(claims),expiresAt:claims.expiresAt,offlineUntil:claims.offlineUntil,lastCheckedAt:record.checkedAt||claims.issuedAt,errorCode:record.lastError||null};
    }catch(error){return {active:false,state:'renew-required',errorCode:error.message};}
  }
  require(){const state=this.status();if(!state.active)throw new Error(state.errorCode||'LICENSE_REQUIRED');return state;}
  diagnostic(route,errorCode,{requestId,transportCode}={}){
    try{
      const file=path.join(this.stateDir,'license-diagnostics.json'),previous=readJson(file,{events:[]});
      const event={at:this.now(),route,errorCode,...(/^[a-f0-9-]{36}$/.test(requestId||'')?{requestId}:{}),...(/^[A-Z][A-Z0-9_]{0,79}$/.test(transportCode||'')?{transportCode}:{})};
      writeJson(file,{events:[...(Array.isArray(previous.events)?previous.events:[]).slice(-9),event]});
    }catch{}
  }
  async post(route,input,timeout=7000){
    let response;
    try{response=await this.fetcher(this.config.serviceUrl+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(timeout)});}catch(cause){this.diagnostic(route,'LICENSE_SERVICE_UNAVAILABLE',{transportCode:cause.cause?.code||cause.code||(cause.name==='TimeoutError'?'TIMEOUT':undefined)});throw new Error('LICENSE_SERVICE_UNAVAILABLE',{cause});}
    const value=await response.json().catch(()=>({error:'LICENSE_SERVICE_INVALID'}));
    if(!response.ok){const code=/^[A-Z_]+$/.test(value.error||'')?value.error:'LICENSE_SERVICE_INVALID';this.diagnostic(route,code,{requestId:response.headers?.get('x-request-id')});throw new Error(code);}return value;
  }
  save(receipt){verifyLicense(receipt,{publicKey:this.config.publicKey,deviceId:this.deviceId,now:this.now()});writeJson(this.file,{receipt,checkedAt:this.now(),lastSeenAt:this.now(),lastError:null});}
  async activate(code){if(typeof code!=='string'||code.length>150)throw new Error('ACTIVATION_CODE_INVALID');const result=await this.post('/v1/activate',{code,deviceId:this.deviceId,licenseFormats:[1,2]});this.save(result.receipt);return this.status();}
  async refresh(force=false){
    const record=this.record();if(!record)return this.status();
    if(!force&&record.checkedAt>this.now()-300000)return this.status();
    if(this.pending)return this.pending;
    this.pending=(async()=>{
      try{const value=await this.post('/v1/renew',{receipt:record.receipt,deviceId:this.deviceId});this.save(value.receipt);}
      catch(error){
        const blocked=['LICENSE_REVOKED','LICENSE_EXPIRED','LICENSE_DEVICE_RELEASED','LICENSE_INVALID','LICENSE_DEVICE_MISMATCH'].includes(error.message)?error.message:null;
        writeJson(this.file,{...record,blocked,checkedAt:this.now(),lastSeenAt:Math.max(record.lastSeenAt||0,this.now()),lastError:error.message});
      }
      return this.status();
    })().finally(()=>{this.pending=undefined;});return this.pending;
  }
  async deactivate(){const record=this.record();if(record)await this.post('/v1/deactivate',{receipt:record.receipt,deviceId:this.deviceId});if(fs.existsSync(this.file))fs.unlinkSync(this.file);return this.status();}
  async latest({dshVersion,build}){
    this.require();const result=await this.post('/v1/releases/latest',{receipt:this.record().receipt,deviceId:this.deviceId,platform:'darwin-arm64',dshVersion});
    const release=verifiedEnvelope(result.manifest,this.config.publicKey);
    if(release.product!=='dsh-companion'||release.platform!=='darwin-arm64'||release.channel!=='private'||!release.supportedDsh?.includes(dshVersion)||!Number.isSafeInteger(release.build)||!/^[a-f0-9]{64}$/.test(release.sha256||'')||!Number.isSafeInteger(release.size)||release.size<1||release.size>1073741824||!/^[a-zA-Z0-9.+-]+\.tgz$/.test(release.filename||''))throw new Error('RELEASE_INVALID');
    return {manifest:result.manifest,release,available:release.build>build};
  }
  async download({dshVersion,build}){
    const update=await this.latest({dshVersion,build});const {release}=update;
    if(release.build<build)throw new Error('NO_COMPATIBLE_RELEASE');
    const directory=path.join(this.stateDir,'downloads');fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const file=path.join(directory,release.filename), temporary=file+'.'+randomUUID()+'.part';
    let response;
    try{response=await this.fetcher(this.config.serviceUrl+'/v1/releases/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({receipt:this.record().receipt,deviceId:this.deviceId,platform:'darwin-arm64',dshVersion,releaseId:release.id}),signal:AbortSignal.timeout(30*60*1000)});}catch(cause){throw new Error('DOWNLOAD_FAILED',{cause});}
    if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'DOWNLOAD_FAILED');
    const hash=createHash('sha256');let bytes=0;
    try{
      await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>release.size){callback(new Error('DOWNLOAD_SIZE_INVALID'));return;}hash.update(chunk);callback(null,chunk);}}),fs.createWriteStream(temporary,{flags:'wx',mode:0o600}));
      if(bytes!==release.size||hash.digest('hex')!==release.sha256)throw new Error('DOWNLOAD_HASH_INVALID');
      fs.renameSync(temporary,file);writeJson(path.join(this.stateDir,'download.json'),{file,version:release.version,sha256:release.sha256,downloadedAt:this.now()});
      return {version:release.version,filename:release.filename,size:bytes,verified:true};
    }catch(error){fs.rmSync(temporary,{force:true});throw error;}
  }
}
