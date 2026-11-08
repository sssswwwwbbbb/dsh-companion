import fs from 'node:fs';
import {join} from 'node:path';
import {petMemorySettings} from '../skin-core/src/pet-memory.mjs';
import {fail} from '../skin-core/src/schema.mjs';
import {readJson,writeJson} from './storage.mjs';

// The existing dedicated pet history, bounded to twenty actual receipts.
// Each skin owns its file and the current model/executor remain unchanged.
export class PetMemory {
  constructor(controller,interaction){this.controller=controller;this.interaction=interaction;}
  settings(){const {state}=this.controller.skins.core,skin=state.selected;return skin?petMemorySettings(skin.manifest,skin.contentKey,state):null;}
  file(id){return join(this.controller.stateDir,'pet-memory',id+'.json');}
  records(id=this.controller.skins.core.state.selected?.manifest.id){return readJson(this.file(id),{records:[]}).records;}
  status(){const settings=this.settings();return settings?{...settings,records:settings.enabled?this.records():[]}:null;}
  recent(context){return this.settings()?.enabled?this.records(context.skinId).filter(row=>row.source==='interaction'):this.interaction.history.get(context.skinId)||[];}
  input(input){
    const settings=this.settings();
    return settings?.enabled?{...input,memory:{preference:settings.preference,recentActions:this.records().filter(row=>row.actual.action).map(({source,actual,at})=>({source,action:actual.action,at}))}}:input;
  }
  forget(id){fs.rmSync(this.file(id),{force:true});this.interaction.history.delete(id);if(this.interaction.last?.skinId===id)this.interaction.last=null;}
  remember(context,round){
    const {core}=this.controller.skins,skin=core.state.selected;
    if(!this.settings()?.enabled||core.state.stopped||skin?.contentKey!==context.contentKey||core.generation!==context.generation)return;
    const record={source:round.source,at:round.at??Date.now(),actual:{speech:round.actual.speech||'',action:round.actual.action??null}};
    if(round.source==='interaction')Object.assign(record,{user:round.user,trigger:round.trigger});
    writeJson(this.file(skin.manifest.id),{formatVersion:1,records:[...this.records(skin.manifest.id),record].slice(-20)});
  }
  async configure({contentKey,field,value}){
    const {core}=this.controller.skins;
    await core.queue(()=>{
      this.controller.entitlement.require();
      if(core.state.selected?.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const settings=this.settings();
      if(!settings)fail('SKIN_SETTING_UNSUPPORTED','pet.interactionMemory');
      if(!(field==='enabled'&&typeof value==='boolean'||field==='preference'&&typeof value==='string'&&value.length<=400||['clear','reset'].includes(field)&&value===null))fail('SKIN_SETTING_UNSUPPORTED','pet.interactionMemory');
      this.interaction.cancel();
      const id=core.state.selected.manifest.id,next=structuredClone(core.state);
      const pet=(next.overrides[id]??={}).pet??={};
      if(field==='reset')delete pet.interactionMemory;
      else if(field!=='clear')(pet.interactionMemory??={})[field]=typeof value==='string'?value.trim():value;
      core.store.write(next);core.state=next;
      if(field==='clear'||field==='reset'||field==='enabled'&&!value)this.forget(id);
      // Opting in starts with already acknowledged interactions from this run.
      if(field==='enabled'&&value&&!settings.enabled){
        fs.rmSync(this.file(id),{force:true});
        for(const round of this.interaction.history.get(id)||[])this.remember({contentKey,generation:core.generation},{...round,source:'interaction'});
      }
    });
    return this.controller.status();
  }
}
