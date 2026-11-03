import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from './storage.mjs';
const assetNames=['idle','look','walk','run','stretch','eat','play','greet','react','sleep-in','sleep','wake'];
const validId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(value);
const number=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function validatePack(input) {
  if(!input||input.schemaVersion!==1||!validId(input.id)||typeof input.name!=='string'||input.name.length<1||input.name.length>60)throw new Error('PACK_INVALID');
  const value=JSON.parse(JSON.stringify(input));
  if(Buffer.byteLength(JSON.stringify(value))>65536)throw new Error('PACK_TOO_LARGE');
  if(value.description!==undefined&&(typeof value.description!=='string'||value.description.length>240))throw new Error('PACK_INVALID');
  if(!value.animations||Object.keys(value.animations).some(key=>!assetNames.includes(key)))throw new Error('PACK_ASSET_INVALID');
  if(!value.profiles||Object.keys(value.profiles).some(key=>!['free','gentle','lively'].includes(key)))throw new Error('PACK_BEHAVIOR_INVALID');
  for(const id of assetNames){const clip=value.animations?.[id];if(!clip||!assetNames.some(name=>clip.file==='assets/whale-maid/'+name+'.webm')||!number(clip.seconds,.1,60)||clip.loop!==undefined&&typeof clip.loop!=='boolean'||clip.label!==undefined&&(typeof clip.label!=='string'||clip.label.length>60))throw new Error('PACK_ASSET_INVALID');}
  for(const id of ['free','gentle','lively']){const profile=value.profiles?.[id];if(!profile||typeof profile.label!=='string'||profile.label.length<1||profile.label.length>60||!number(profile.speed,1,300)||!Array.isArray(profile.restSeconds)||profile.restSeconds.length!==2||!profile.restSeconds.every(n=>number(n,.1,120))||profile.restSeconds[1]<profile.restSeconds[0]||!number(profile.walkChance,0,1)||!number(profile.playChance,0,1)||profile.walkChance+profile.playChance>1)throw new Error('PACK_BEHAVIOR_INVALID');}
  const intro=value.startup;
  if(!intro||!number(intro.seconds,1,15)||typeof intro.greeting!=='string'||intro.greeting.length>100||typeof intro.subtitle!=='string'||intro.subtitle.length>180||!['day','night'].includes(intro.theme)||!assetNames.includes(intro.animation))throw new Error('PACK_STARTUP_INVALID');
  value.defaults??={profile:'free',size:100,autonomous:true,followMouse:false};
  if(Object.keys(value.defaults).some(key=>!['profile','size','autonomous','followMouse'].includes(key))||!['free','gentle','lively'].includes(value.defaults.profile)||!number(value.defaults.size,70,140)||typeof value.defaults.autonomous!=='boolean'||typeof value.defaults.followMouse!=='boolean')throw new Error('PACK_DEFAULTS_INVALID');
  value.appearance??={hue:0,saturation:1};
  if(!number(value.appearance.hue,0,360)||!number(value.appearance.saturation,.5,1.5))throw new Error('PACK_APPEARANCE_INVALID');
  return value;
}
export class PackStore {
  constructor(builtinDir,stateDir){this.builtinDir=builtinDir;this.customDir=path.join(stateDir,'packs');}
  list(){
    const rows=new Map();
    for(const [directory,builtin] of [[this.builtinDir,true],[this.customDir,false]]){
      if(!fs.existsSync(directory))continue;
      for(const name of fs.readdirSync(directory).filter(n=>n.endsWith('.json'))){
        try{const file=path.join(directory,name);if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())continue;const pack=validatePack(readJson(file));if(!rows.has(pack.id))rows.set(pack.id,{...pack,builtin});}catch{}
      }
    }
    return [...rows.values()];
  }
  get(id){if(!validId(id))throw new Error('PACK_INVALID');const pack=this.list().find(row=>row.id===id);if(!pack)throw new Error('PACK_NOT_FOUND');return pack;}
  summaries(){return this.list().map(({id,name,description,builtin,startup})=>({id,name,description:description||'',builtin,theme:startup.theme}));}
  import(value){const pack=validatePack(value);if(this.list().some(row=>row.id===pack.id&&row.builtin))throw new Error('PACK_ID_RESERVED');writeJson(path.join(this.customDir,pack.id+'.json'),pack);return pack;}
  export(id){const {builtin,...pack}=this.get(id);return {filename:pack.id+'.dshpack.json',json:JSON.stringify(pack,null,2)+'\n'};}
}
