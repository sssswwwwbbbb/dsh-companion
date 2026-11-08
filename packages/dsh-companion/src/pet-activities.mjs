import {randomUUID} from 'node:crypto';
import {fail} from '../skin-core/src/schema.mjs';
import {petActivitySettings} from '../skin-core/src/pet-activities.mjs';

export class PetActivities {
  constructor(skins,{now=Date.now}={}){this.skins=skins;this.now=now;this.nextAt=null;}
  settings(){
    const {state}=this.skins.core,skin=state.selected;
    return skin?petActivitySettings(skin.manifest,skin.contentKey,state):null;
  }
  status(){
    const settings=this.settings();if(!settings)return null;
    return {...settings,canDecide:this.allowed(true),pending:!!this.pending,last:this.last?.skinId===this.skins.core.state.selected?.manifest.id?this.last:null};
  }
  async configure({contentKey,field,value}){
    const {core,controller}=this.skins;
    await core.queue(()=>{
      controller.entitlement.require();
      if(core.state.selected?.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const settings=this.settings();if(!settings)fail('SKIN_SETTING_UNSUPPORTED');
      const valid=field==='enabled'&&typeof value==='boolean'||field==='intervalMinutes'&&[3,5,10].includes(value)||
        field==='actions'&&value&&Object.keys(value).length===2&&typeof value.enabled==='boolean'&&settings.actions.some(row=>row.id===value.action)||field==='reset'&&value===null;
      if(!valid)fail('SKIN_SETTING_UNSUPPORTED','pet.activities');
      const next=structuredClone(core.state),id=core.state.selected.manifest.id;
      const pet=(next.overrides[id]??={}).pet??={};
      if(field==='reset')delete pet.activities;
      else if(field==='actions')((pet.activities??={}).actions??={})[value.action]=value.enabled;
      else (pet.activities??={})[field]=value;
      core.store.write(next);core.state=next;
      this.cancel();this.nextAt=this.now()+this.settings().intervalMinutes*60_000;
      if(field==='reset')this.last=null;
    });
    return controller.status();
  }
  allowed(explicit=false){
    const {core,controller,work}=this.skins,settings=this.settings(),packet=work.accepted;
    const config=core.view();
    return !!(settings?.enabled&&settings.actions.some(row=>row.enabled)&&config.pet?.status==='enabled'&&config.pet.values.allowActions&&(controller.replyStyle?.petPersona()||config.pet.values.persona)&&
      config.theme?.status==='enabled'&&config.theme.values.workFeedbackEnabled&&!controller.focus?.quiet&&
      packet&&(explicit||packet.observing!==false)&&!packet.reducedMotion&&['idle','completed'].includes(packet.observedState??packet.state)&&work.ready(packet)&&
      !work.decision&&!controller.interactions?.pending);
  }
  cancel(){
    this.pending?.abort();this.pending=null;
    const owned=this.owned;this.owned=null;
    if(owned&&this.skins.controller.credentials?.())void this.skins.controller.request('/skin/activity/cancel',owned).catch(()=>{});
    this.nextAt=null;
  }
  async maintain(live){
    if(!this.allowed()){this.cancel();return;}
    if(this.pending)return;
    const interval=this.settings().intervalMinutes*60_000;
    this.nextAt??=this.now()+interval;
    if(this.now()>=this.nextAt)await this.decide(live);
  }
  async preview({contentKey}){
    if(contentKey!==this.skins.core.state.selected?.contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    if(!this.allowed(true))fail('PET_ACTIVITY_NOT_READY');
    if(this.pending)fail('PET_INTERACTION_BUSY');
    await this.decide(await this.skins.controller.nativeStatus(),true);
    return this.skins.controller.status();
  }
  async decide(live,explicit=false){
    const {core,controller,work}=this.skins;
    if(this.pending||!this.allowed(explicit))return;
    this.nextAt=this.now()+this.settings().intervalMinutes*60_000;
    if(!live.workReactionAvailable||!controller.interactions?.model)return;
    const selected=core.state.selected,generation=core.generation,packet=work.accepted;
    const choices=this.settings().actions.filter(row=>row.enabled&&(live.activityActions??live.availableActions)?.includes(row.id));
    if(!choices.length)return;
    const abort=new AbortController();this.pending=abort;
    const current=()=>this.pending===abort&&!abort.signal.aborted&&core.generation===generation&&core.state.selected?.contentKey===selected.contentKey&&work.accepted===packet&&this.allowed(explicit);
    const timer=setTimeout(()=>abort.abort(),8000);
    try{
      controller.entitlement.require();
      const action=await controller.interactions.chooseActivity({choices,workState:packet.observedState??packet.state,last:this.last?.skinId===selected.manifest.id?this.last.action:null,signal:abort.signal});
      if(!current())return;
      let actual=null;
      if(action){
        const latest=await controller.nativeStatus();
        if(!current())return;
        // A drag, resize or manual action during the model call takes priority.
        if(!latest.workReactionAvailable||JSON.stringify(live.window?.bounds)!==JSON.stringify(latest.window?.bounds)){
          this.last={skinId:selected.manifest.id,action:null,result:'quiet',at:this.now()};return;
        }
        const owner=randomUUID();this.owned={generation,contentKey:selected.contentKey,owner};
        const receipt=await controller.request('/skin/activity',{...this.owned,action});
        if(!current())return;
        actual=receipt?.action??null;
      }
      this.last={skinId:selected.manifest.id,action:actual,result:actual?'performed':'quiet',at:this.now()};
      if(actual)controller.interactions.memory?.remember({contentKey:selected.contentKey,generation},{source:'activity',actual:{action:actual,speech:''}});
    }catch{
      if(this.pending===abort&&core.generation===generation&&core.state.selected?.contentKey===selected.contentKey)this.last={skinId:selected.manifest.id,action:null,result:'unavailable',at:this.now()};
    }finally{
      clearTimeout(timer);
      if(this.pending===abort)this.pending=null;
    }
  }
}
