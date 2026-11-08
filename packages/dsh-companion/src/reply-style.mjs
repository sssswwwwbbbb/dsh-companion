import {join} from 'node:path';
import bundled from '../config/reply-styles.json' with {type:'json'};
import {characterDefaults} from '../skin-core/src/character.mjs';
import {fail,validateCharacter,validateReplyStyle} from '../skin-core/src/schema.mjs';
import {readJson,writeJson} from './storage.mjs';

const sectionName='dsh-companion:theme-reply-style';
const get=(rows,key)=>Object.hasOwn(rows,key)?rows[key]:undefined;

export class ReplyStyle {
  constructor(controller,sessions){
    this.controller=controller;
    this.sessions=sessions;
    this.file=join(controller.stateDir,'reply-style.json');
    this.data={preferences:{},sessions:{}};
    try{
      const saved=readJson(this.file,null);
      if(saved?.preferences&&saved.sessions)this.data=saved;
    }catch{}
  }

  register(registry){
    const unregister=registry.section({
      name:sectionName,order:10300,interpolate:false,
      text:({agent})=>this.prompt(agent?.session.id),
    });
    this.registered=true;
    return ()=>{this.registered=false;return unregister();};
  }

  status(){
    const skin=this.controller.skins.core.state.selected;
    if(!skin||!this.registered)return null;
    const defaults=skin.manifest.replyStyle??bundled[skin.contentKey];
    if(!defaults)return null;
    const style=get(this.data.preferences,skin.manifest.id)??defaults;
    return {contentKey:skin.contentKey,...style,defaults};
  }

  sessionStatus(sessionId){
    const {phase,state}=this.controller.skins.core;
    if(typeof sessionId!=='string'||!sessionId||sessionId.length>200||this.controller.disposed||state.stopped||!['ready','updating'].includes(phase))return null;
    const style=this.status();
    if(!style||!this.controller.entitlement.status().active)return null;
    const choice=get(this.data.sessions,sessionId),id=this.controller.skins.core.state.selected.manifest.id;
    const enabled=typeof choice==='string'&&choice===style.contentKey?true:
      choice?.contentKey===style.contentKey?choice.enabled:get(this.data.enabledBySkin??{},id)??true;
    return {...style,enabled};
  }

  session({sessionId,contentKey,enabled}){
    const style=this.sessionStatus(sessionId);
    if(enabled===undefined)return style;
    this.controller.entitlement.require();
    if(typeof sessionId!=='string'||!sessionId||sessionId.length>200||!this.sessions.get(sessionId))fail('REPLY_STYLE_SESSION_MISSING');
    if(!style||style.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    if(typeof enabled!=='boolean')fail('REPLY_STYLE_INVALID');
    const id=this.controller.skins.core.state.selected.manifest.id;
    this.commit({...this.data,
      sessions:{...this.data.sessions,[sessionId]:{contentKey,enabled}},
      enabledBySkin:{...this.data.enabledBySkin,[id]:enabled},
    });
    return {...style,enabled};
  }

  save({contentKey,address,tone}){
    this.controller.entitlement.require();
    const style=this.status();
    if(!style||style.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    const id=this.controller.skins.core.state.selected.manifest.id;
    const preference=validateReplyStyle({address,tone});
    this.commit({...this.data,preferences:{...this.data.preferences,[id]:preference}});
    if(this.characterStatus()?.petEnabled)this.controller.interactions?.cancel();
  }

  characterStatus(){
    const {state}=this.controller.skins.core,skin=state.selected,defaults=characterDefaults(skin);
    if(!defaults||!this.registered)return null;
    const {petEnabledDefault=false,...fields}=defaults;
    const saved=state.overrides?.[skin.manifest.id]?.character??{};
    return {contentKey:skin.contentKey,...fields,...saved,petEnabled:saved.petEnabled??petEnabledDefault,defaults:{...fields,petEnabled:petEnabledDefault}};
  }

  async saveCharacter({contentKey,...fields}){
    const {core}=this.controller.skins;
    await core.queue(()=>{
      this.controller.entitlement.require();
      const character=this.characterStatus();
      if(!character||character.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      const allowed=['name','identity',...['workContext','petContext'].filter(key=>Object.hasOwn(character,key))];
      if(Object.keys(fields).some(key=>!allowed.includes(key)))fail('SKIN_FIELDS_INVALID','character');
      const previous=Object.fromEntries(allowed.map(key=>[key,character[key]]));
      const preference=validateCharacter({...previous,...fields});
      const next=structuredClone(core.state),id=core.state.selected.manifest.id;
      (next.overrides[id]??={}).character={...next.overrides[id]?.character,...preference};
      core.store.write(next);core.state=next;
      this.controller.interactions?.cancel();
    });
    return this.controller.status();
  }

  async characterPet({contentKey,enabled}){
    const {core}=this.controller.skins;
    await core.queue(()=>{
      this.controller.entitlement.require();
      const character=this.characterStatus();
      if(!character||character.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
      if(!Object.hasOwn(character,'petContext')||typeof enabled!=='boolean')fail('SKIN_SETTING_UNSUPPORTED','character.pet');
      const next=structuredClone(core.state),id=core.state.selected.manifest.id;
      ((next.overrides[id]??={}).character??={}).petEnabled=enabled;
      core.store.write(next);core.state=next;
      this.controller.interactions?.cancel();
    });
    return this.controller.status();
  }

  characterSessionStatus(sessionId){
    const {phase,state}=this.controller.skins.core;
    if(typeof sessionId!=='string'||!sessionId||sessionId.length>200||this.controller.disposed||state.stopped||!['ready','updating'].includes(phase))return null;
    const character=this.characterStatus();
    if(!character||!Object.hasOwn(character,'workContext')||!this.controller.entitlement.status().active)return null;
    return {...character,enabled:get(this.data.characterSessions??{},sessionId)===character.contentKey};
  }

  characterSession({sessionId,contentKey,enabled}){
    const character=this.characterSessionStatus(sessionId);
    if(enabled===undefined)return character;
    this.controller.entitlement.require();
    if(typeof sessionId!=='string'||!sessionId||sessionId.length>200||!this.sessions.get(sessionId))fail('REPLY_STYLE_SESSION_MISSING');
    if(!character||character.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    if(typeof enabled!=='boolean')fail('REPLY_STYLE_INVALID');
    const sessions={...this.data.characterSessions};
    if(enabled)sessions[sessionId]=contentKey;
    else if(character.enabled)delete sessions[sessionId];
    this.commit({...this.data,characterSessions:sessions});
    return {...character,enabled};
  }

  petPersona(){
    const character=this.characterStatus();
    if(!character?.petEnabled||!Object.hasOwn(character,'petContext'))return null;
    const style=this.status();
    return '请根据本套主题角色与桌宠场景表达。当前互动请求和可用能力约束优先。\n'+JSON.stringify({角色名:character.name,角色设定:character.identity,场景补充:character.petContext,...(style?{称呼:style.address,语气:style.tone}:{})});
  }

  commit(next){
    writeJson(this.file,next);
    this.data=next;
  }

  prompt(sessionId){
    const parts=[],style=this.sessionStatus(sessionId),character=this.characterSessionStatus(sessionId);
    if(style?.enabled)parts.push('工作区回复风格。仅影响表达方式。用户当前要求、事实、工作指令和工具规则优先。根据以下称呼和语气自然表达，不必每次重复称呼。\n'
      +JSON.stringify({称呼:style.address,语气:style.tone}));
    if(character?.enabled)parts.push('工作区主题角色。请在自称与角色表达中采用以下设定。用户当前要求、事实、工作指令和工具规则优先。\n'
      +JSON.stringify({角色名:character.name,角色设定:character.identity,场景补充:character.workContext}));
    return parts.join('\n\n');
  }
}
