import {fail,id,sceneModelKey} from '../skin-core/src/schema.mjs';
import {readAsset} from '../skin-core/src/resources.mjs';
import {isCommanderSnapshot,isWorkspacePresentationReady} from './workspace-cues.mjs';

const commanderScenes={
  model:{
    'unit-portrait':{label:'单元-07 立绘',portrait:'workspace-role-portrait',notice:'单元-07，已同步当前模型。'},
    'unit-badge':{label:'单元-07 徽记',badge:'workspace-role-avatar',notice:'识别信号已切换。'},
  },
  workspace:{
    'amber-ops':{label:'琥珀值班',accent:{light:'#A45622',dark:'#E2A56E'},notice:'已进入值班工作区。'},
    'violet-lab':{label:'紫光实验室',accent:{light:'#6756A0',dark:'#BAA9F0'},notice:'实验室已就绪。'},
  },
};

function declarations(skin){
  return skin?.manifest.scenePresets??(isCommanderSnapshot(skin)?commanderScenes:null);
}

export class WorkspaceScenes {
  constructor(skins){this.skins=skins;}

  status(){
    const {state}=this.skins.core,skin=state.selected,presets=declarations(skin);
    if(!presets)return null;
    const bindings=state.overrides[skin.manifest.id]?.theme?.sceneBindings??{};
    return {contentKey:skin.contentKey,presets,bindings};
  }

  presentation(clientId){
    return isWorkspacePresentationReady(this.skins,clientId)?this.status():null;
  }

  async configure({contentKey,kind,target,preset}){
    const {controller,core}=this.skins;
    await core.queue(()=>{
      controller.entitlement.require();
      const skin=core.state.selected;
      if(!skin||skin.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const presets=declarations(skin);
      const directory=kind==='model'?presets?.model:kind==='workspace'?presets?.workspace:null;
      const key=kind==='model'?sceneModelKey(target):
        typeof target==='string'&&target.length>0&&target.length<=200?JSON.stringify(target):null;
      if(!directory||!key||preset!==null&&(!id(preset)||!Object.hasOwn(directory,preset)))fail('SKIN_SETTING_UNSUPPORTED','scenePresets');
      const next=structuredClone(core.state);
      const theme=(next.overrides[skin.manifest.id]??={}).theme??={};
      const rows=(theme.sceneBindings??={})[kind]??={};
      if(preset===null)delete rows[key];
      else {
        if(!Object.hasOwn(rows,key)&&Object.keys(rows).length>=64)fail('SKIN_SETTING_UNSUPPORTED','scenePresets');
        rows[key]=preset;
      }
      core.store.write(next);
      core.state=next;
    });
    return controller.status();
  }

  art({contentKey,preset}){
    const {core,controller}=this.skins;
    controller.entitlement.require();
    const skin=core.state.selected,models=declarations(skin)?.model;
    if(!skin||skin.contentKey!==contentKey||core.state.stopped||!models||!Object.hasOwn(models,preset))return null;
    const row=models[preset];
    return Object.fromEntries(['portrait','badge'].filter(key=>row[key]).map(key=>{
      const asset=skin.manifest.assets[row[key]];
      return [key,'data:'+asset.mime+';base64,'+readAsset(skin.root,asset).toString('base64')];
    }));
  }
}
