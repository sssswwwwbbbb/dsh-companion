import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pipeline} from 'node:stream';
import {unzipSync} from 'fflate';
import {withSkinArchive} from '../packages/dsh-skin-core/src/archive.mjs';
import {readAsset} from '../packages/dsh-skin-core/src/resources.mjs';
import {supportsSkinHost} from '../packages/dsh-skin-core/src/host-compatibility.mjs';
import {skinQuota,grantSkin} from './skin-quota.mjs';
import {signedEnvelope} from '../packages/dsh-companion/src/license-core.mjs';

const fail=code=>{throw new Error(code);};
function catalogQuery(input){
  const query={page:input.page??1,pageSize:input.pageSize??24,q:input.q??'',module:input.module??'all',sort:input.sort??'newest',owned:input.owned??false};
  for(const key of Object.keys(query))if(input[key]===null)fail('SKIN_CATALOG_QUERY_INVALID');
  if(!Number.isSafeInteger(query.page)||query.page<1||!Number.isSafeInteger(query.pageSize)||query.pageSize<1||query.pageSize>48||typeof query.q!=='string'||query.q.length>80||!['all','pet','no-pet','theme','startup'].includes(query.module)||!['newest','name'].includes(query.sort)||typeof query.owned!=='boolean')fail('SKIN_CATALOG_QUERY_INVALID');
  query.q=query.q.trim();return query;
}
function catalogPage(rows,license,input){
  const query=catalogQuery(input),latest=new Map(),quota=skinQuota(license),owned=new Set(quota.acquiredIds),search=query.q.toLocaleLowerCase();
  // Select one release per skin before searching or paging; never scan all prior rows per skin.
  for(const row of rows){const previous=latest.get(row.id);if(!previous||row.publishedAt>=previous.publishedAt)latest.set(row.id,row);}
  const skins=[...latest.values()].filter(row=>(!query.owned||owned.has(row.id))&&(query.module==='all'||(query.module==='no-pet'?!row.modules.includes('pet'):row.modules.includes(query.module)))&&(!search||[row.id,row.title,row.name,row.description].some(value=>String(value||'').toLocaleLowerCase().includes(search))));
  skins.sort(query.sort==='name'?(a,b)=>(a.title||a.name).localeCompare(b.title||b.name,'zh-CN',{numeric:true})||a.id.localeCompare(b.id):(a,b)=>b.publishedAt-a.publishedAt);
  const total=skins.length,pages=Math.max(1,Math.ceil(total/query.pageSize)),page=Math.min(query.page,pages);query.page=page;
  return {skins:skins.slice((page-1)*query.pageSize,page*query.pageSize),quota,page,pageSize:query.pageSize,total,pages,query};
}
export function readSkinPackage(file){
  return withSkinArchive(file,unzipSync,skin=>{
    const m=skin.manifest,bytes=fs.readFileSync(file),cover=m.cover?m.assets[m.cover]:null;
    return {metadata:{id:m.id,name:m.name,description:m.description||'',version:m.version,contentKey:skin.contentKey,supportedDsh:m.dshVersions,modules:Object.keys(m.modules),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),hasCover:!!cover},bytes,cover:cover?{mime:cover.mime,data:readAsset(skin.root,cover).toString('base64')}:null};
  });
}
export function createSkinCatalog({stateDir,transaction,licensed,privateKey,now}){
  return async(request,response,url,input,json)=>{
    if(request.method!=='POST')return false;
    if(url.pathname==='/admin/skins'){
      if(!path.isAbsolute(input.artifact||'')||input.title!==undefined&&(typeof input.title!=='string'||!input.title.trim()||input.title.length>80))fail('SKIN_PACKAGE_INVALID');
      const pkg=readSkinPackage(input.artifact),directory=path.join(stateDir,'skins');
      const row={...pkg.metadata,releaseId:'skin_'+randomUUID(),title:input.title?.trim()||pkg.metadata.name,publishedAt:now()};
      const published=await transaction(db=>{
        const rows=db.skins??=[];const existing=rows.find(r=>r.id===row.id&&r.version===row.version);
        if(existing&&existing.sha256!==row.sha256)fail('SKIN_VERSION_CONFLICT');
        fs.mkdirSync(directory,{recursive:true,mode:0o700});
        fs.writeFileSync(path.join(directory,row.sha256+'.zip'),pkg.bytes,{mode:0o600});
        if(pkg.cover)fs.writeFileSync(path.join(directory,row.sha256+'.cover.json'),JSON.stringify(pkg.cover),{mode:0o600});
        if(existing)return existing;
        rows.push(row);db.audit.push({at:now(),type:'skin-published',skinId:row.id,version:row.version});return row;
      });json({skin:published});return true;
    }
    if(!['/v1/skins/catalog','/v1/skins/download','/v1/skins/cover'].includes(url.pathname))return false;
    const result=await transaction(db=>{
      const {license}=licensed(db,input.receipt,input.deviceId);
      const rows=db.skins||[];
      if(url.pathname.endsWith('/catalog')&&input.releaseId===undefined)return catalogPage(rows,license,input);
      const row=rows.find(r=>r.releaseId===input.releaseId);if(!row)fail('SKIN_NOT_FOUND');
      if(url.pathname.endsWith('/catalog'))return {skins:[row],quota:skinQuota(license)};
      if(url.pathname.endsWith('/download')&&!supportsSkinHost({dshVersions:row.supportedDsh},row.contentKey,input.dshVersion))fail('SKIN_DSH_UNSUPPORTED');
      if(url.pathname.endsWith('/download')){
        if(!fs.existsSync(path.join(stateDir,'skins',row.sha256+'.zip')))fail('SKIN_RESOURCE_MISSING');
        if(grantSkin(license,row.id))db.audit.push({at:now(),type:'skin-acquired',licenseId:license.id,skinId:row.id});
      }
      return row;
    },url.pathname.endsWith('/download'));
    if(url.pathname.endsWith('/catalog'))json({catalog:signedEnvelope({product:'dsh-skins',formatVersion:1,...result},privateKey)});
    else if(url.pathname.endsWith('/cover')){
      const cover=result.hasCover?JSON.parse(fs.readFileSync(path.join(stateDir,'skins',result.sha256+'.cover.json'),'utf8')):null;
      json({image:cover?'data:'+cover.mime+';base64,'+cover.data:null});
    }else{
      const file=path.join(stateDir,'skins',result.sha256+'.zip');if(!fs.existsSync(file))fail('SKIN_RESOURCE_MISSING');
      response.writeHead(200,{'Content-Type':'application/zip','Content-Length':result.size,'Content-Disposition':'attachment; filename="'+result.id+'-'+result.version+'.zip"'});
      pipeline(fs.createReadStream(file),response,()=>{});
    }
    return true;
  };
}
