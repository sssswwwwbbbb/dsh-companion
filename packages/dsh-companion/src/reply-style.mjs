import {join} from 'node:path';
import bundled from '../config/reply-styles.json' with {type:'json'};
import {fail,validateReplyStyle} from '../skin-core/src/schema.mjs';
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
    return {...style,enabled:get(this.data.sessions,sessionId)===style.contentKey};
  }

  session({sessionId,contentKey,enabled}){
    const style=this.sessionStatus(sessionId);
    if(enabled===undefined)return style;
    this.controller.entitlement.require();
    if(typeof sessionId!=='string'||!sessionId||sessionId.length>200||!this.sessions.get(sessionId))fail('REPLY_STYLE_SESSION_MISSING');
    if(!style||style.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    if(typeof enabled!=='boolean')fail('REPLY_STYLE_INVALID');
    const sessions={...this.data.sessions};
    if(enabled)this.commit({...this.data,sessions:{...sessions,[sessionId]:contentKey}});
    else if(style.enabled){delete sessions[sessionId];this.commit({...this.data,sessions});}
    return {...style,enabled};
  }

  save({contentKey,address,tone}){
    this.controller.entitlement.require();
    const style=this.status();
    if(!style||style.contentKey!==contentKey)fail('SKIN_OPERATION_SUPERSEDED');
    const id=this.controller.skins.core.state.selected.manifest.id;
    const preference=validateReplyStyle({address,tone});
    this.commit({...this.data,preferences:{...this.data.preferences,[id]:preference}});
  }

  commit(next){
    writeJson(this.file,next);
    this.data=next;
  }

  prompt(sessionId){
    if(!sessionId||!get(this.data.sessions,sessionId))return '';
    const style=this.sessionStatus(sessionId);
    if(!style?.enabled)return '';
    return '工作区回复风格。仅影响表达方式。用户当前要求、事实、工作指令和工具规则优先。根据以下称呼和语气自然表达，不必每次重复称呼。\n'
      +JSON.stringify({称呼:style.address,语气:style.tone});
  }
}
