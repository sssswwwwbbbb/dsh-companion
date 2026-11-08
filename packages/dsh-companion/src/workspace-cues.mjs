import {fail} from '../skin-core/src/schema.mjs';
import {cuePresentation,cuePositions,cueEffects} from '../skin-core/src/workspace-cues.mjs';

import {isCommanderSkin} from '../skin-core/src/host-compatibility.mjs';
export const isCommanderSnapshot=skin=>isCommanderSkin(skin?.contentKey);
export function isWorkspacePresentationReady(skins,clientId){
  const {core,page}=skins,{state}=core,ready=page.lastReady;
  return ['ready','updating'].includes(core.phase)&&!state.stopped&&!state.disabled.theme&&page.active&&ready&&
    ready.clientId===clientId&&ready.generation===core.generation&&ready.contentKey===state.selected?.contentKey;
}
const commander={
  welcome:{text:'指挥官，欢迎回来。单元-07 待命。',default:false,seconds:4,position:'above-input',effect:'fade'},
  session:{text:'会话已切换。',default:false,seconds:2,position:'bottom-right',effect:'fade'},
  workspace:{text:'工作区已切换。',default:false,seconds:3,position:'top-right',effect:'slide'},
};

function declarations(skin){
  return skin?.manifest.workspaceCues??(isCommanderSnapshot(skin)?commander:null);
}

export class WorkspaceCues {
  constructor(skins){this.skins=skins;}

  status(){
    const {state}=this.skins.core,skin=state.selected,spec=declarations(skin);
    if(!spec)return null;
    const choices=state.overrides[skin.manifest.id]?.theme?.workspaceCues;
    const cues=Object.fromEntries(Object.entries(spec).map(([key,row])=>[
      key,{...row,...cuePresentation(row,typeof choices?.[key]==='object'?choices[key]:{}),defaults:cuePresentation(row),enabled:typeof choices?.[key]==='boolean'?choices[key]:choices?.[key]?.enabled??row.default},
    ]));
    return {contentKey:skin.contentKey,cues};
  }

  presentation(clientId){
    return isWorkspacePresentationReady(this.skins,clientId)?this.status():null;
  }

  async configure({contentKey,cue,enabled,field,value}){
    const {controller,core}=this.skins;
    controller.entitlement.require();
    await core.queue(()=>{
      const skin=core.state.selected,spec=declarations(skin);
      if(!skin||skin.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      if(!spec||!Object.hasOwn(spec,cue))fail('SKIN_SETTING_UNSUPPORTED','workspaceCues');
      if(field===undefined){field='enabled';value=enabled;}
      if(!(field==='enabled'&&typeof value==='boolean'||field==='seconds'&&typeof value==='number'&&Number.isFinite(value)&&value>=1&&value<=8||field==='position'&&cuePositions.includes(value)||field==='effect'&&cueEffects.includes(value)||field==='reset'&&value===null))fail('SKIN_SETTING_UNSUPPORTED','workspaceCues');
      const next=structuredClone(core.state);
      const theme=(next.overrides[skin.manifest.id]??={}).theme??={};
      const choices=theme.workspaceCues??={};
      if(field==='reset')delete choices[cue];
      else {const previous=choices[cue];choices[cue]={...(typeof previous==='boolean'?{enabled:previous}:previous),[field]:value};}
      core.store.write(next);
      core.state=next;
    });
    return controller.status();
  }
}
