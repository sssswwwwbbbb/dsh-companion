import {join} from 'node:path';
import {readJson,writeJson} from './storage.mjs';

const durations={focus:[15,25,45],break:[5,10]};
const invalid=()=>{throw new Error('INVALID_SETTINGS');};

export class FocusTimer {
  constructor(stateDir,{now=Date.now}={}){
    this.file=join(stateDir,'focus.json');
    this.now=now;
    this.state=readJson(this.file,{quiet:false,timer:null});
  }

  get quiet(){return this.state.quiet;}

  snapshot(now=this.now()){
    const {quiet,timer}=this.state;
    if(!timer)return {quiet,phase:'idle',kind:null,seconds:0};
    const remaining=timer.pausedMs??Math.max(0,timer.endsAt-now);
    const phase=timer.pausedMs!==null?'paused':remaining>0?'running':'done';
    return {quiet,phase,kind:timer.kind,seconds:Math.ceil(remaining/1000)};
  }

  change({action,kind,minutes,enabled}={}){
    const now=this.now(),{phase}=this.snapshot(now);
    const next={...this.state};
    switch(action){
      case 'start':
        if(!Object.hasOwn(durations,kind)||!durations[kind].includes(minutes))invalid();
        if(phase==='running'||phase==='paused')return;
        next.timer={kind,endsAt:now+minutes*60000,pausedMs:null};
        break;
      case 'pause':
        if(phase!=='running')return;
        next.timer={...next.timer,pausedMs:next.timer.endsAt-now};
        break;
      case 'resume':
        if(phase!=='paused')return;
        next.timer={...next.timer,endsAt:now+next.timer.pausedMs,pausedMs:null};
        break;
      case 'clear':
        if(phase==='idle')return;
        next.timer=null;
        break;
      case 'quiet':
        if(typeof enabled!=='boolean')invalid();
        if(next.quiet===enabled)return;
        next.quiet=enabled;
        break;
      default:
        invalid();
    }
    writeJson(this.file,next);
    this.state=next;
  }
}
