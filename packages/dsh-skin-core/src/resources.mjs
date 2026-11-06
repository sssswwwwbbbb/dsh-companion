import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateManifest,fail} from './schema.mjs';
export const digest = data => createHash('sha256').update(data).digest('hex');
export function readAsset(root,asset) {
  const base=fs.realpathSync(root);let file=base;
  for(const part of asset.path.split('/')){file=path.join(file,part);let s;try{s=fs.lstatSync(file);}catch{fail('SKIN_RESOURCE_MISSING',asset.path);}if(s.isSymbolicLink())fail('SKIN_RESOURCE_SYMLINK');}
  const stat=fs.statSync(file);if(!stat.isFile()||stat.size!==asset.bytes)fail('SKIN_RESOURCE_SIZE');
  const data=fs.readFileSync(file);if(data.length!==asset.bytes||digest(data)!==asset.sha256)fail('SKIN_RESOURCE_HASH');
  if(asset.mime==='video/mp4'){
    const valid=data.length>=16&&data.toString('ascii',4,8)==='ftyp'&&data.readUInt32BE(0)>=16&&data.readUInt32BE(0)<=data.length;
    if(!valid)fail('SKIN_RESOURCE_TYPE');
    return data;
  }
  const valid=asset.mime==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):asset.mime==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:asset.mime==='image/webp'?data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP':data.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  if(!valid)fail('SKIN_RESOURCE_TYPE');return data;
}
export function loadSkin(root) {
  const file=path.join(root,'skin.json');if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>65536)fail('SKIN_MANIFEST_INVALID');
  const manifest=validateManifest(JSON.parse(fs.readFileSync(file,'utf8')));
  return {manifest,root:fs.realpathSync(root),contentKey:digest(JSON.stringify(manifest))};
}
export function prepareResources(skin) {
  if(digest(JSON.stringify(skin.manifest))!==skin.contentKey)fail('SKIN_CONTENT_CHANGED');
  const assets={};for(const [id,a] of Object.entries(skin.manifest.assets))assets[id]={...a,data:readAsset(skin.root,a)};return assets;
}
export function materializeResources(assets,dir) {
  fs.mkdirSync(dir,{recursive:true,mode:0o700});const index={};
  for(const [id,a] of Object.entries(assets)){
    const file=a.sha256;const destination=path.join(dir,file);
    if(fs.existsSync(destination)){if(fs.lstatSync(destination).isSymbolicLink()||digest(fs.readFileSync(destination))!==a.sha256)fail('SKIN_CACHE_INVALID');}
    else fs.writeFileSync(destination,a.data,{mode:0o600,flag:'wx'});
    index[id]={...a,path:file};delete index[id].data;
  }
  return index;
}
// Keep a verified, immutable content snapshot so author edits cannot break rollback.
export function cacheSkin(skin,stateDir) {
  const resources=prepareResources(skin),directory=path.join(stateDir,'skin-packages',skin.contentKey);
  if(fs.existsSync(directory)){const cached=loadSkin(directory);prepareResources(cached);if(cached.contentKey!==skin.contentKey)fail('SKIN_CACHE_INVALID');return cached;}
  const parent=path.dirname(directory);fs.mkdirSync(parent,{recursive:true,mode:0o700});const temporary=fs.mkdtempSync(path.join(parent,'.prepare-'));
  try{
    for(const a of Object.values(resources)){const target=path.join(temporary,a.path);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,a.data,{mode:0o600});}
    fs.writeFileSync(path.join(temporary,'skin.json'),(skin.manifest.modules.theme?.configVersion===3?JSON.stringify(skin.manifest):JSON.stringify(skin.manifest,null,2))+'\n',{mode:0o600});fs.renameSync(temporary,directory);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
  return loadSkin(directory);
}
