import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fail,object,validateManifest} from './schema.mjs';
export const initialState=()=>({formatVersion:1,generation:0,selected:null,overrides:{},disabled:{},stopped:false,pending:null,results:{},error:null});
export function stopRequests(dir){const folder=path.join(dir,'skin-stop-requests');return fs.existsSync(folder)?fs.readdirSync(folder).filter(x=>/^[a-f0-9-]{36}\.json$/.test(x)):[];}
export function atomicJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}}
export class StateStore {
  constructor(dir){this.dir=dir;this.file=path.join(dir,'skin-state.json');this.requestDir=path.join(dir,'skin-stop-requests');}
  read(){
    if(!fs.existsSync(this.file))return initialState();
    let s;try{if(fs.statSync(this.file).size>512*1024)throw 0;s=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{fail('SKIN_STATE_INVALID');}
    if(!object(s)||s.formatVersion!==1||!Number.isSafeInteger(s.generation)||!object(s.overrides)||!object(s.disabled)||typeof s.stopped!=='boolean')fail('SKIN_STATE_INVALID');
    if(s.selected){validateManifest(s.selected.manifest);if(typeof s.selected.root!=='string'||!/^[a-f0-9]{64}$/.test(s.selected.contentKey))fail('SKIN_STATE_INVALID');}
    return s;
  }
  write(s){atomicJson(this.file,s);}
  hasStops(){return stopRequests(this.dir).length>0;}
  consumeStops(s,{recoverPending=true}={}){
    const requests=stopRequests(this.dir);
    if((recoverPending&&s.pending)||requests.length){s.stopped=true;s.pending=null;s.error={code:'SKIN_RECOVERY_REQUIRED'};this.write(s);for(const name of requests)fs.rmSync(path.join(this.requestDir,name),{force:true});return true;}return false;
  }
}
export function requestStop(dir){const requestId=randomUUID();atomicJson(path.join(dir,'skin-stop-requests',requestId+'.json'),{requestId,at:Date.now()});return requestId;}
// Explicit, pure v1 migration. Source remains untouched and every ambiguous value is retained.
export function migrateLegacySettings(settings,skinId){
  const fields=['size','profile','autonomous','followMouse'];
  return {overrides:{[skinId]:{pet:Object.fromEntries(fields.filter(k=>Object.hasOwn(settings,k)).map(k=>[k,settings[k]]))}},disabled:settings.visible===false?{pet:true}:{},provenance:{schemaVersion:1,fields:fields.filter(k=>Object.hasOwn(settings,k)),policy:'preserve all known values; defaults cannot be distinguished'},legacy:structuredClone(settings)};
}
