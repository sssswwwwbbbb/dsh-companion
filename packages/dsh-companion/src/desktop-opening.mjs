import {supportsSkinHost} from '../skin-core/src/host-compatibility.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {atomicJson} from '../skin-core/src/state.mjs';
import {resolveSettings} from '../skin-core/src/schema.mjs';
import {readAsset} from '../skin-core/src/resources.mjs';
import {readJson} from './storage.mjs';

function desktopLaunchId(controller) {
  // The official Mac Desktop shell forks this Host and sets DSH_CLIENT_VERSION.
  if(process.platform!=='darwin'||process.arch!=='arm64'||!controller.config.supportedDsh.includes(controller.dshVersion)||
     !process.connected||!process.env.DSH_CLIENT_VERSION||path.basename(controller.profileDir)!=='desktop')return null;
  const pid=process.ppid;
  const born=execFileSync('/bin/ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8',timeout:400}).trim();
  return born?`${pid} ${born}`:null;
}

function eligible(controller) {
  const {state,store}=controller.skins.core;
  const snapshot=controller.skins.snapshots.get(state.selected?.contentKey);
  if(!controller.settings().startupEnabled||!controller.entitlement.status().active||state.stopped||state.pending||
     state.disabled.startup||store.hasStops()||state.results.startup?.status!=='ready'||
     !snapshot?.manifest.modules.startup?.config.handoffSeconds)return null;
  if(!supportsSkinHost(snapshot.manifest,snapshot.contentKey,controller.dshVersion))return null;
  const {values}=resolveSettings(snapshot.manifest,state,{startup:true},{strictRequired:false}).startup;
  return {snapshot,values};
}

export function registerDesktopOpening(ctx,controller,hostStarting) {
  try {
    const id=desktopLaunchId(controller);
    if(!id)return;
    const seen=path.join(controller.stateDir,'desktop-launch.json');
    if(readJson(seen,null)?.id===id)return;
    atomicJson(seen,{id});
    const offer=hostStarting&&eligible(controller);
    if(!offer)return;
    ctx.inject(['webServer'],web=>{
      const ticket=randomUUID(),base='/dsh-companion-opening/'+ticket;
      const hold=path.join(controller.stateDir,'desktop-opening-hold.json');
      let assets=null,released=false;
      const release=()=>{
        if(released)return;
        released=true;assets=null;
        try{if(readJson(hold,null)?.ticket===ticket)fs.rmSync(hold,{force:true});}catch{}
        if(controller.credentials())void controller.request('/intro/desktop-release',{}).catch(()=>{});
      };
      const expiresAt=Date.now()+60000;
      atomicJson(hold,{ticket,hostPid:process.pid,expiresAt});
      const timer=setTimeout(release,expiresAt-Date.now());timer.unref();
      web.on('dispose',()=>{clearTimeout(timer);release();});
      const route=(name,handler)=>web.effect(()=>web.webServer.register({kind:'exact',path:base+'/'+name,handler}));
      route('claim',(request,response)=>{
        if(request.method!=='POST'||released||assets){response.writeHead(404).end();return;}
        try {
          const current=eligible(controller);
          if(current?.snapshot.contentKey!==offer.snapshot.contentKey)throw Error('OPENING_NO_LONGER_AVAILABLE');
          const {snapshot,values}=current;
          assets={};
          for(const [kind,key] of [['video',values.video],['poster',values.poster]]){
            const resource=snapshot.manifest.assets[key];
            assets[kind]={mime:resource.mime,data:readAsset(snapshot.root,resource)};
          }
          response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(values));
        } catch {release();response.writeHead(404).end();}
      });
      route('done',(request,response)=>{
        if(request.method!=='POST'){response.writeHead(405).end();return;}
        release();response.writeHead(204).end();
      });
      for(const name of ['video','poster'])route(name,(request,response)=>{
        const asset=assets?.[name];
        if(!asset||!['GET','HEAD'].includes(request.method)){response.writeHead(404).end();return;}
        // The approved fast-start video is small. A complete 200 response also
        // handles the initial range request in the official protocol forwarder.
        response.writeHead(200,{'Content-Type':asset.mime,'Content-Length':asset.data.length,'Cache-Control':'no-store'});
        response.end(request.method==='HEAD'?undefined:asset.data);
      });
      const text=`(${runOpening.toString()})(${JSON.stringify(base)})`;
      web.on('webserver/index-inject',table=>table.push({kind:'script',placement:'head',text}));
    });
  } catch {
    // This optional opening cannot block official Desktop startup.
  }
}

async function runOpening(base) {
  if(location.protocol!=='dsh-app:'||location.hostname!=='app'||!globalThis.dshDesktopBoot)return;
  const observed='dsh-companion-desktop-opening-observed';
  try{
    if(sessionStorage.getItem(observed)===base)return;
    sessionStorage.setItem(observed,base);
  }catch{}
  const root=document.getElementById('root');
  if(!root)return;
  const controller=new AbortController(),{signal}=controller;
  const layer=document.createElement('div');
  layer.dataset.dshCompanionDesktopOpening='preparing';
  layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','DSH 开场');
  layer.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#070c14;isolation:isolate';
  const video=document.createElement('video'),poster=document.createElement('img'),skip=document.createElement('button');
  const plate='position:absolute;inset:0;width:100%;height:100%;object-fit:contain';
  video.style.cssText=poster.style.cssText=plate;video.hidden=true;poster.hidden=true;video.playsInline=true;poster.alt='';
  skip.type='button';skip.textContent='进入工作区 · Esc';
  skip.style.cssText='position:absolute;top:16px;right:16px;padding:7px 13px;border:1px solid #8192ab;border-radius:18px;background:#0b1320;color:#eef3ff;font:12px system-ui;cursor:pointer';
  layer.append(poster,video,skip);
  const previouslyInert=root.inert;
  root.inert=true;
  document.body.append(layer);
  let timer=null,frame=null,still=false,playing=false;
  const finish=()=>{
    if(signal.aborted)return;
    controller.abort();clearTimeout(timer);
    if(frame!==null)video.cancelVideoFrameCallback(frame);
    video.muted=true;video.pause();video.removeAttribute('src');video.load();
    layer.remove();root.inert=previouslyInert;
    void fetch(base+'/done',{method:'POST',keepalive:true}).catch(()=>{});
  };
  const on=(target,event,listener,options={})=>target.addEventListener(event,listener,{...options,signal});
  on(window,'keydown',event=>{
    if(event.key!=='Escape')return;
    event.preventDefault();event.stopImmediatePropagation();finish();
  },{capture:true});
  on(window,'pagehide',finish,{once:true});
  on(skip,'click',finish,{once:true});
  timer=setTimeout(finish,2500);
  try {
    const response=await fetch(base+'/claim',{method:'POST',signal});
    if(!response.ok){finish();return;}
    const config=await response.json();
    if(signal.aborted)return;
    clearTimeout(timer);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const showStill=()=>{
      if(signal.aborted||still)return;
      still=true;clearTimeout(timer);
      if(frame!==null){video.cancelVideoFrameCallback(frame);frame=null;}
      layer.style.clipPath='';
      video.muted=true;video.pause();video.removeAttribute('src');video.load();video.hidden=true;
      on(poster,'load',()=>{poster.hidden=false;layer.dataset.dshCompanionDesktopOpening='still';
        clearTimeout(timer);timer=setTimeout(finish,config.stillSeconds*1000);},{once:true});
      on(poster,'error',finish,{once:true});
      timer=setTimeout(finish,2500);poster.src=base+'/poster';
    };
    const start=()=>{
      if(signal.aborted||still||playing||!document.hasFocus())return;
      playing=true;clearTimeout(timer);
      skip.focus({preventScroll:true});
      if(config.reducedMotion||motion.matches){showStill();return;}
      let lastTime=0,lastAdvance=performance.now();
      const reveal=time=>{
        const fraction=Math.min(1,Math.max(0,(time-(config.seconds-config.handoffSeconds))/config.handoffSeconds));
        if(fraction>0)layer.style.clipPath=`inset(0 ${50*fraction*fraction*(3-2*fraction)}% 0)`;
      };
      const watch=()=>{
        if(signal.aborted||still)return;
        if(video.currentTime>lastTime){lastTime=video.currentTime;lastAdvance=performance.now();}
        if(performance.now()-lastAdvance>=5000){showStill();return;}
        timer=setTimeout(watch,250);
      };
      const draw=(_now,data)=>{
        if(signal.aborted||still)return;
        reveal(data.mediaTime);frame=video.requestVideoFrameCallback(draw);
      };
      on(video,'loadedmetadata',()=>{
        if(!Number.isFinite(video.duration)||Math.abs(video.duration-config.seconds)>.1)showStill();
      },{once:true});
      on(video,'playing',()=>{
        if(still)return;
        video.hidden=false;layer.dataset.dshCompanionDesktopOpening='playing';
        frame=video.requestVideoFrameCallback(draw);
      },{once:true});
      on(video,'ended',()=>{if(!still)finish();},{once:true});
      on(video,'error',showStill,{once:true});
      on(motion,'change',event=>{if(event.matches)showStill();});
      video.muted=config.soundEnabled!==true;video.src=base+'/video';
      void video.play().catch(showStill);timer=setTimeout(watch,250);
    };
    on(window,'focus',start);
    timer=setTimeout(finish,7000);
    start();
  } catch {finish();}
}
