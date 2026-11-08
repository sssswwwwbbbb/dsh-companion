const {app,BrowserWindow,ipcMain,session,Menu}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const lab=process.env.DSH_HOST_PET_LAB,dir=process.env.DSH_HOST_PET_STATE;
app.setPath('appData',path.join(dir,'appdata'));app.setPath('userData',path.join(dir,'profile'));
const errors=[],bodyInputs=new Map(),heldWindows=new Map();let busy=false,visibilityHeld=process.env.DSH_HOST_PET_HOLD==='1';
ipcMain.on('pet:input-regions',(e,input)=>{const w=BrowserWindow.fromWebContents(e.sender);if(w)bodyInputs.set(w.id,{rects:input.bodyRects?.length||0});});
ipcMain.on('companion:pet-input',e=>{
 const w=BrowserWindow.fromWebContents(e.sender);
 if(!w||e.senderFrame!==w.webContents.mainFrame||!e.sender.getURL().startsWith('file://'))return;
 void fetch(process.env.DSH_HOST_PET_HOST_ORIGIN+'/backend/input',{method:'POST',headers:{authorization:'Bearer '+process.env.DSH_HOST_PET_HOST_TOKEN,'content-type':'application/json'},body:JSON.stringify({contentKey:process.env.DSH_HOST_PET_CONTENT_KEY,generation:Number(process.env.DSH_HOST_PET_GENERATION),trigger:'click'})}).catch(()=>{});
});
app.on('browser-window-created',(_,w)=>{
 const show=w.show.bind(w),showInactive=w.showInactive.bind(w);heldWindows.set(w.id,{w,show,showInactive});
 w.show=(...args)=>{if(!visibilityHeld)return show(...args);};w.showInactive=(...args)=>{if(!visibilityHeld)return showInactive(...args);};
 w.on('closed',()=>{bodyInputs.delete(w.id);heldWindows.delete(w.id);});
});
app.on('web-contents-created',(_,wc)=>wc.on('console-message',e=>{if(e.level==='error'||e.level===3)errors.push(e.message.slice(0,200));}));
const expression=`({stages:document.querySelectorAll('.pet-stage').length,props:[...document.querySelectorAll('[data-prop]')].map(p=>({id:p.dataset.prop,complete:p.complete,box:p.getBoundingClientRect().toJSON()})),sprites:typeof sprites==='undefined'?[]:sprites.map(s=>({anim:s.anim,size:s.size,pos:{...s.pos},dragging:s.dragState?.dragging,playback:s.playback,workState:s.workState})),videos:[...document.querySelectorAll('video')].map(v=>({front:v.classList.contains('is-front'),source:v.currentSrc.split('/').pop(),time:v.currentTime,loop:v.loop,paused:v.paused,width:v.videoWidth,height:v.videoHeight,box:v.getBoundingClientRect().toJSON(),dpr:devicePixelRatio}))})`;
async function snapshot(){const windows=[];for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())windows.push({id:w.id,bounds:w.getBounds(),visible:w.isVisible(),renderer:await w.webContents.executeJavaScript(expression)});return {at:Date.now(),windows,visibilityHeld,applicationMenuPresent:!!Menu.getApplicationMenu(),bodyInputs:[...bodyInputs].map(([window,v])=>({window,...v})),errors};}
app.whenReady().then(()=>{
 Menu.setApplicationMenu(null);
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>{const u=new URL(d.url);cb({cancel:!(['file:','blob:','data:','dsh-pet-bridge:'].includes(u.protocol)||['127.0.0.1','localhost','[::1]'].includes(u.hostname))});});
 setInterval(async()=>{if(busy)return;busy=true;try{if(visibilityHeld&&fs.existsSync(path.join(dir,'reveal.json'))){visibilityHeld=false;for(const item of heldWindows.values())if(!item.w.isDestroyed())item.showInactive();}const s=await snapshot();fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify(s));fs.appendFileSync(path.join(dir,'telemetry.jsonl'),JSON.stringify(s)+'\n');if(fs.existsSync(path.join(dir,'quit.json')))app.quit();try{process.kill(Number(process.env.DSH_HOST_PET_PARENT),0);}catch{app.quit();}}catch(e){errors.push(e.message);}finally{busy=false;}},100);
});
process.on('SIGTERM',()=>app.quit());
import(require('node:url').pathToFileURL(path.join(lab,'dsh-pet/lib/app.js')).href).catch(()=>app.exit(1));
const connection=setInterval(()=>{if(process.env.DSH_PET_SITE_URL){const u=new URL(process.env.DSH_PET_SITE_URL);fs.writeFileSync(path.join(dir,'connection.json'),JSON.stringify({origin:u.origin,token:new URLSearchParams(u.hash.slice(1)).get('token')}),{mode:0o600});clearInterval(connection);}},30);
