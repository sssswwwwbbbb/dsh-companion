import fs from 'node:fs';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {loadSkin,prepareResources,cacheSkin,fail,atomicJson} from '../skin-core/src/index.mjs';
import {withSkinArchive} from '../skin-core/src/archive.mjs';
import {readJson} from './storage.mjs';

const contentKey=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
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
  install(file,{expected}={}){
    return withSkinArchive(file,unzipSync,input=>{
      if(expected&&(input.contentKey!==expected.contentKey||input.manifest.id!==expected.id||input.manifest.version!==expected.version))fail('SKIN_PACKAGE_MISMATCH');
      const keys=this.keys(),skin=cacheSkin(input,this.stateDir),duplicate=keys.includes(skin.contentKey);
      if(!duplicate){if(keys.length>=256)fail('SKIN_LIBRARY_FULL');atomicJson(this.file,{formatVersion:1,contentKeys:[...keys,skin.contentKey]});}
      return {skin,duplicate};
    });
  }
  retain(skin){const keys=this.keys();if(!keys.includes(skin.contentKey))atomicJson(this.file,{formatVersion:1,contentKeys:[...keys,skin.contentKey]});}
  remove(key){
    if(!contentKey(key))fail('SKIN_NOT_FOUND');
    // Only engine-owned snapshots and materialized runtime assets are removed.
    // The original imported ZIP and artist source files are never touched.
    for(const directory of ['skin-assets','skin-packages'])fs.rmSync(path.join(this.stateDir,directory,key),{recursive:true,force:true});
    atomicJson(this.file,{formatVersion:1,contentKeys:this.keys().filter(value=>value!==key)});
  }

}
