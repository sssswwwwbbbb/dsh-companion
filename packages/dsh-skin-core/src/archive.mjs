import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {loadSkin,prepareResources} from './resources.mjs';
import {validateManifest,fail} from './schema.mjs';
const MiB=1024*1024;
// The caller supplies its existing ZIP decoder; both publication and import
// validate the same resource contract before retaining any package bytes.
export function withSkinArchive(file,unzip,visit){
    if(typeof file!=='string'||!file.toLowerCase().endsWith('.zip'))fail('SKIN_ZIP_REQUIRED');
    const stat=fs.statSync(file);if(!stat.isFile()||stat.size<22||stat.size>129*MiB)fail('SKIN_TOO_LARGE');
    const seen=new Set();let bytes=0,files;
    try{
      files=unzip(fs.readFileSync(file),{filter:entry=>{
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
      return visit(input);
    }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
