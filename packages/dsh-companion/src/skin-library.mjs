import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {unzipSync} from 'fflate';
import {loadSkin,prepareResources,cacheSkin,validateManifest,fail,atomicJson} from '../skin-core/src/index.mjs';
import {readJson} from './storage.mjs';

const MiB=1024*1024,contentKey=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function unavailableSkin(error,key,skin){
  const reason=error.code?.startsWith?.('SKIN_')?error.code:error.code==='ENOENT'?'SKIN_RESOURCE_MISSING':'SKIN_INSTALLED_INVALID';
  return {contentKey:key||null,id:skin?.manifest.id||null,name:skin?.manifest.name||'不可用的已安装皮肤',version:skin?.manifest.version||'',modules:Object.keys(skin?.manifest.modules||{}),status:'unavailable',reason};
}
export class SkinLibrary {
  constructor(stateDir){this.stateDir=stateDir;this.file=path.join(stateDir,'skin-library.json');this.unavailable=[];}
  keys(){
    const value=readJson(this.file,{formatVersion:1,contentKeys:[]});
    if(value.formatVersion!==1||!Array.isArray(value.contentKeys)||value.contentKeys.length>256||!value.contentKeys.every(contentKey))fail('SKIN_LIBRARY_INVALID');
    return [...new Set(value.contentKeys)];
  }
  installed(){
    this.unavailable=[];let keys;
    try{keys=this.keys();}catch(error){this.unavailable.push({...unavailableSkin(error),name:'本地皮肤库索引'});return [];}
    const healthy=[];
    for(const key of keys){let skin;try{skin=loadSkin(path.join(this.stateDir,'skin-packages',key));prepareResources(skin);if(skin.contentKey!==key)fail('SKIN_CACHE_INVALID');healthy.push(skin);}catch(error){this.unavailable.push(unavailableSkin(error,key,skin));}}
    // Keep the index and all user state intact. A broken snapshot is reported,
    // never silently removed and never allowed to abort unrelated snapshots.
    return healthy;
  }
  install(file){
    if(typeof file!=='string'||!file.toLowerCase().endsWith('.zip'))fail('SKIN_ZIP_REQUIRED');
    const stat=fs.statSync(file);if(!stat.isFile()||stat.size<22||stat.size>129*MiB)fail('SKIN_TOO_LARGE');
    const seen=new Set();let bytes=0,files;
    try{
      files=unzipSync(fs.readFileSync(file),{filter:entry=>{
        const name=entry.name,parts=name.replace(/\/$/,'').split('/');
        if(!name||name.length>240||name.startsWith('/')||/[\\:\0]/.test(name)||parts.some(p=>!p||['.','..','__proto__','constructor','prototype'].includes(p))||seen.has(name))fail('SKIN_ZIP_PATH_INVALID');
        seen.add(name);bytes+=entry.originalSize;
        if(seen.size>256||entry.originalSize>16*MiB||bytes>128*MiB+65536)fail('SKIN_TOO_LARGE');
        return !name.endsWith('/');
      }});
    }catch(error){if(error.code?.startsWith?.('SKIN_'))throw error;fail('SKIN_ZIP_INVALID');}
    if(!Object.hasOwn(files,'skin.json')||files['skin.json'].length>65536)fail('SKIN_MANIFEST_INVALID');
    let manifest;try{manifest=validateManifest(JSON.parse(Buffer.from(files['skin.json']).toString('utf8')));}catch(error){if(error.code?.startsWith?.('SKIN_'))throw error;fail('SKIN_MANIFEST_INVALID');}
    const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-import-'));
    try{
      fs.writeFileSync(path.join(temporary,'skin.json'),files['skin.json'],{mode:0o600});
      // Write declared resource bytes as ordinary files. ZIP permissions, links,
      // extra scripts and metadata never enter the immutable content snapshot.
      for(const asset of Object.values(manifest.assets)){
        if(!Object.hasOwn(files,asset.path))fail('SKIN_RESOURCE_MISSING');
        const target=path.join(temporary,asset.path);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,files[asset.path],{mode:0o600});
      }
      const input=loadSkin(temporary);prepareResources(input);
      const keys=this.keys(),skin=cacheSkin(input,this.stateDir),duplicate=keys.includes(skin.contentKey);
      if(!duplicate){if(keys.length>=256)fail('SKIN_LIBRARY_FULL');atomicJson(this.file,{formatVersion:1,contentKeys:[...keys,skin.contentKey]});}
      return {skin,duplicate};
    }finally{fs.rmSync(temporary,{recursive:true,force:true});}
  }
}
