import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Transform, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { verifyLicense, verifiedEnvelope, deviceIdentity, isPermanentLicense } from './license-core.mjs';
import { readJson, writeJson } from './storage.mjs';
import {supportsSkinHost} from '../skin-core/src/host-compatibility.mjs';
import { updateInfo } from './update-info.mjs';

function catalogValue(envelope,publicKey){
  const value=verifiedEnvelope(envelope,publicKey,{maxPayloadLength:2*1024*1024}),hash=x=>/^[a-f0-9]{64}$/.test(x||'');
  if(value.product!=='dsh-skins'||value.formatVersion!==1||!Array.isArray(value.skins)||value.skins.length>256)throw new Error('SKIN_CATALOG_INVALID');
  for(const row of value.skins)if(!/^skin_[a-f0-9-]{36}$/.test(row.releaseId||'')||!hash(row.sha256)||!hash(row.contentKey)||!Number.isSafeInteger(row.size)||row.size<22||row.size>129*1024*1024||!Array.isArray(row.supportedDsh)||!row.supportedDsh.every(v=>typeof v==='string')||!Array.isArray(row.modules)||!row.modules.every(v=>['theme','pet','startup'].includes(v))||!['id','title','name','version'].every(k=>typeof row[k]==='string'&&row[k].length>0&&row[k].length<=100))throw new Error('SKIN_CATALOG_INVALID');
  const q=value.quota;
  if(!q||!Number.isInteger(q.limit)||q.limit<0||!Array.isArray(q.acquiredIds)||q.used!==q.acquiredIds.length)throw new Error('SKIN_CATALOG_INVALID');
  const defaults={page:1,pageSize:24,q:'',module:'all',sort:'newest',owned:false},pagination=['page','pageSize','total','pages','query'];
  if(pagination.some(key=>key in value)){
    const query=value.query;
    if(!Number.isSafeInteger(value.page)||value.page<1||!Number.isSafeInteger(value.pageSize)||value.pageSize<1||value.pageSize>48||!Number.isSafeInteger(value.total)||value.total<0||!Number.isSafeInteger(value.pages)||value.pages!==Math.max(1,Math.ceil(value.total/value.pageSize))||value.page>value.pages||value.skins.length>value.pageSize||value.skins.length!==Math.max(0,Math.min(value.pageSize,value.total-(value.page-1)*value.pageSize))||!query||query.page!==value.page||query.pageSize!==value.pageSize||typeof query.q!=='string'||query.q.length>80||!['all','pet','no-pet','theme','startup'].includes(query.module)||!['newest','name'].includes(query.sort)||typeof query.owned!=='boolean')throw new Error('SKIN_CATALOG_INVALID');
    return {skins:value.skins,quota:q,...Object.fromEntries(pagination.map(key=>[key,value[key]]))};
  }
  // Existing signed caches and exact release details predate pagination fields.
  return {skins:value.skins,quota:q,page:1,pageSize:Math.max(24,value.skins.length),total:value.skins.length,pages:1,query:{...defaults,pageSize:Math.max(24,value.skins.length)}};
}
async function receiveDownload(response,file,release,{signal,onProgress}={}){
  const temporary=file+'.'+randomUUID()+'.part',hash=createHash('sha256');let bytes=0;
  try{
    signal?.throwIfAborted();onProgress?.({bytes,total:release.size});
    await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>release.size){callback(new Error('DOWNLOAD_SIZE_INVALID'));return;}hash.update(chunk);try{onProgress?.({bytes,total:release.size});callback(null,chunk);}catch(error){callback(error);}}}),fs.createWriteStream(temporary,{flags:'wx',mode:0o600}),...(signal?[{signal}]:[]));
    if(bytes!==release.size||hash.digest('hex')!==release.sha256)throw new Error('DOWNLOAD_HASH_INVALID');
    signal?.throwIfAborted();
    fs.renameSync(temporary,file);return bytes;
  }catch(error){fs.rmSync(temporary,{force:true});throw error;}
}

export class Entitlement {
  constructor({stateDir,config,deviceId=deviceIdentity(),now=Date.now,fetcher=globalThis.fetch,releasePlatform=process.platform==='win32'?'win32-x64':'darwin-arm64'}) {
    this.community=config?.channel==='community';
    this.stateDir=stateDir;this.config=config;this.deviceId=deviceId;this.now=now;this.fetcher=fetcher;this.releasePlatform=releasePlatform;this.file=path.join(stateDir,'license.json');this.pending=undefined;this.catalogRequest=0;try{const revision=readJson(path.join(stateDir,'skin-catalog.json'),{}).revision;if(Number.isSafeInteger(revision)&&revision>=0)this.catalogRequest=revision;}catch{}
    const url=new URL(config.serviceUrl);
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('LICENSE_ENDPOINT_INVALID');
  }
  record(){return readJson(this.file,null);}
  status(){
    if(this.community)return {active:true,state:'community',channel:'community',licenseId:'community-local',permanent:true,expiresAt:null,offlineUntil:null,lastCheckedAt:null,errorCode:null};
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
  async communityNoop(){if(!this.community)throw new Error('LICENSE_REQUIRED');return this.status();}
  diagnostic(route,errorCode,{requestId,transportCode}={}){
    try{
      const file=path.join(this.stateDir,'license-diagnostics.json'),previous=readJson(file,{events:[]});
      const event={at:this.now(),route,errorCode,...(/^[a-f0-9-]{36}$/.test(requestId||'')?{requestId}:{}),...(/^[A-Z][A-Z0-9_]{0,79}$/.test(transportCode||'')?{transportCode}:{})};
      writeJson(file,{events:[...(Array.isArray(previous.events)?previous.events:[]).slice(-9),event]});
    }catch{}
  }
  async post(route,input,timeout=7000,{signal}={}){
    let response;
    try{response=await this.fetcher(this.config.serviceUrl+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});}catch(cause){if(signal?.aborted)throw signal.reason;this.diagnostic(route,'LICENSE_SERVICE_UNAVAILABLE',{transportCode:cause.cause?.code||cause.code||(cause.name==='TimeoutError'?'TIMEOUT':undefined)});throw new Error('LICENSE_SERVICE_UNAVAILABLE',{cause});}
    const value=await response.json().catch(()=>({error:'LICENSE_SERVICE_INVALID'}));
    if(!response.ok){const code=/^[A-Z_]+$/.test(value.error||'')?value.error:'LICENSE_SERVICE_INVALID';this.diagnostic(route,code,{requestId:response.headers?.get('x-request-id')});throw new Error(code);}return value;
  }
  clearSkinCatalog(){this.catalogRequest++;this.quotaRequest=(this.quotaRequest||0)+1;this.quotaSavedRequest=this.quotaRequest;for(const name of ['skin-catalog.json','skin-quota.json'])fs.rmSync(path.join(this.stateDir,name),{force:true});}
  save(receipt){const claims=verifyLicense(receipt,{publicKey:this.config.publicKey,deviceId:this.deviceId,now:this.now()});let previousId;try{previousId=verifiedEnvelope(this.record()?.receipt,this.config.publicKey).licenseId;}catch{}if(previousId!==claims.licenseId)this.clearSkinCatalog();writeJson(this.file,{receipt,checkedAt:this.now(),lastSeenAt:this.now(),lastError:null});}
  async activate(code){if(this.community)return this.communityNoop();if(typeof code!=='string'||code.length>150)throw new Error('ACTIVATION_CODE_INVALID');const result=await this.post('/v1/activate',{code,deviceId:this.deviceId,licenseFormats:[1,2]});this.save(result.receipt);return this.status();}
  async refresh(force=false){
    if(this.community)return this.status();
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
  async deactivate(){if(this.community)return this.status();const record=this.record();if(record)await this.post('/v1/deactivate',{receipt:record.receipt,deviceId:this.deviceId});if(fs.existsSync(this.file))fs.unlinkSync(this.file);this.clearSkinCatalog();return this.status();}
  skinCatalog(){
    try{
      const saved=readJson(path.join(this.stateDir,'skin-catalog.json'),null);if(!saved)return null;
      const value={...catalogValue(saved.catalog,this.config.publicKey),checkedAt:saved.checkedAt,revision:saved.revision||0};
      try{
        const savedQuota=readJson(path.join(this.stateDir,'skin-quota.json'),null);
        if(savedQuota&&savedQuota.licenseId===this.status().licenseId){
          const quota=catalogValue(savedQuota.catalog,this.config.publicKey).quota;
          // Acquisitions are permanent: a browsing response taken before a concurrent download cannot lower usage.
          if(savedQuota.checkedAt>=saved.checkedAt||quota.used>value.quota.used)value.quota=quota;
        }
      }catch{}
      return value;
    }catch{return null;}
  }
  async refreshSkinCatalog(query={}){if(this.community)throw new Error('COMMUNITY_MARKET_DISABLED');
    this.require();const requestId=this.catalogRequest=(this.catalogRequest||0)+1;
    const result=await this.post('/v1/skins/catalog',{...query,receipt:this.record().receipt,deviceId:this.deviceId}),value=catalogValue(result.catalog,this.config.publicKey),checkedAt=this.now();
    if(requestId!==this.catalogRequest)return {...value,checkedAt};
    writeJson(path.join(this.stateDir,'skin-catalog.json'),{catalog:result.catalog,checkedAt,revision:requestId});return this.skinCatalog();
  }
  async skinDetail(releaseId,{signal}={}){
    this.require();signal?.throwIfAborted();
    const result=await this.post('/v1/skins/catalog',{receipt:this.record().receipt,deviceId:this.deviceId,releaseId},7000,{signal});
    const value=catalogValue(result.catalog,this.config.publicKey);
    if(value.skins.length!==1||value.skins[0].releaseId!==releaseId)throw new Error('SKIN_CATALOG_INVALID');
    return {skin:value.skins[0],quota:value.quota};
  }
  async refreshSkinQuota(){
    const licenseId=this.require().licenseId,requestId=this.quotaRequest=(this.quotaRequest||0)+1;
    const result=await this.post('/v1/skins/catalog',{receipt:this.record().receipt,deviceId:this.deviceId,pageSize:1});
    const {quota}=catalogValue(result.catalog,this.config.publicKey);
    if(requestId>(this.quotaSavedRequest||0)){writeJson(path.join(this.stateDir,'skin-quota.json'),{catalog:result.catalog,licenseId,checkedAt:this.now()});this.quotaSavedRequest=requestId;}return quota;
  }
  async skinCover(releaseId){
    this.require();const result=await this.post('/v1/skins/cover',{receipt:this.record().receipt,deviceId:this.deviceId,releaseId});
    if(result.image!==null&&(typeof result.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(result.image)))throw new Error('SKIN_CATALOG_INVALID');
    return result.image;
  }
  async downloadSkin({releaseId,dshVersion,signal,onProgress}){if(this.community)throw new Error('COMMUNITY_MARKET_DISABLED');
    const licenseId=this.require().licenseId,receipt=this.record().receipt;const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(5*60*1000)]):AbortSignal.timeout(5*60*1000);
    const {skin:entry}=await this.skinDetail(releaseId,{signal:requestSignal});
    if(this.require().licenseId!==licenseId)throw new Error('SKIN_DOWNLOAD_LICENSE_CHANGED');
    if(!supportsSkinHost({dshVersions:entry.supportedDsh},entry.contentKey,dshVersion))throw new Error('SKIN_DSH_UNSUPPORTED');
    const directory=path.join(this.stateDir,'skin-downloads');fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const file=path.join(directory,entry.sha256+'.zip');
    try{
      const response=await this.fetcher(this.config.serviceUrl+'/v1/skins/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({receipt,deviceId:this.deviceId,releaseId,dshVersion}),signal:requestSignal});
      if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'DOWNLOAD_FAILED');
      await receiveDownload(response,file,entry,{signal:requestSignal,onProgress});return {file,entry};
    }finally{await this.refreshSkinQuota().catch(()=>{});}
  }
  async latest({dshVersion,build}){
    this.require();const result=await this.post('/v1/releases/latest',{receipt:this.record().receipt,deviceId:this.deviceId,platform:this.releasePlatform,dshVersion});
    const release=verifiedEnvelope(result.manifest,this.config.publicKey);
    if(release.product!=='dsh-companion'||release.platform!==this.releasePlatform||release.channel!=='private'||!release.supportedDsh?.includes(dshVersion)||!Number.isSafeInteger(release.build)||!/^[a-f0-9]{64}$/.test(release.sha256||'')||!Number.isSafeInteger(release.size)||release.size<1||release.size>1073741824||!/^[a-zA-Z0-9.+-]+\.tgz$/.test(release.filename||''))throw new Error('RELEASE_INVALID');
    return {manifest:result.manifest,release,...updateInfo(release,build)};
  }
  async download({dshVersion,build}){
    const update=await this.latest({dshVersion,build});const {release}=update;
    if(release.build<build)throw new Error('UPDATE_DOWNGRADE_BLOCKED');
    const directory=path.join(this.stateDir,'downloads');fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const file=path.join(directory,release.filename);
    let response;
    try{response=await this.fetcher(this.config.serviceUrl+'/v1/releases/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({receipt:this.record().receipt,deviceId:this.deviceId,platform:this.releasePlatform,dshVersion,releaseId:release.id}),signal:AbortSignal.timeout(30*60*1000)});}catch(cause){throw new Error('DOWNLOAD_FAILED',{cause});}
    if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'DOWNLOAD_FAILED');
    const bytes=await receiveDownload(response,file,release);
    writeJson(path.join(this.stateDir,'download.json'),{file,version:release.version,sha256:release.sha256,downloadedAt:this.now()});
    return {version:release.version,filename:release.filename,size:bytes,verified:true};
  }
}
