// Full official Host client, using the established isolated-renderer mechanism.
// No bespoke controls, injected UI actions, or evaluate command surface.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const lab=process.env.DSH_HOST_PET_LAB,info=JSON.parse(fs.readFileSync(path.join(lab,'host-runtime.json')));
if(!info.url||new URL(info.url).hostname!=='127.0.0.1')throw new Error('PRIVATE_HOST_URL_REQUIRED');
app.setPath('userData',path.join(lab,'host-ui-profile'));app.setName('DSH Workspace R2 Private');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1180,height:820,show:true,title:'DSH 工作区 R2 · 私有集成',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.on('page-title-updated',e=>{e.preventDefault();win.setTitle('DSH 工作区 R2 · 私有集成');});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>{const u=new URL(d.url);cb({cancel:!(['blob:','data:','file:'].includes(u.protocol)||['127.0.0.1','localhost','[::1]'].includes(u.hostname))});});
 win.webContents.on('console-message',e=>{if(e.message.startsWith('WORKSPACE_R2 '))fs.appendFileSync(path.join(lab,'workspace-r2-client-events.jsonl'),e.message.slice('WORKSPACE_R2 '.length)+'\n');if(e.level==='error'||e.level===3)fs.appendFileSync(path.join(lab,'host-ui-errors.jsonl'),JSON.stringify({at:Date.now(),message:e.message.slice(0,500)})+'\n');});
 await win.loadURL(info.url);fs.writeFileSync(path.join(lab,'host-ui-ready.json'),JSON.stringify({pid:process.pid,officialHostClientLoaded:true,bundleId:'local.dsh.workspace.r2.ui',humanGUIAccepted:false}));
 setInterval(()=>{if(fs.existsSync(path.join(lab,'host-ui-quit.json')))app.quit();try{process.kill(info.pid,0);}catch{app.quit();}},500);
});
app.on('window-all-closed',()=>app.quit());
