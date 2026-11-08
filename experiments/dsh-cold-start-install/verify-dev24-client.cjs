// Actual official DSH client in an isolated hidden desktop window.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

const dir=path.resolve(process.argv[2]);
const {url,owner}=JSON.parse(fs.readFileSync(path.join(dir,'client-connection.json')));
if(new URL(url).hostname!=='127.0.0.1')throw new Error('LOOPBACK_REQUIRED');
app.setPath('userData',path.join(dir,'hidden-client'));
app.whenReady().then(async()=>{
 app.dock?.hide();
 const win=new BrowserWindow({show:false,width:1180,height:820,webPreferences:{
  offscreen:true,backgroundThrottling:false,sandbox:true,
 }});
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
  const location=new URL(details.url);
  callback({cancel:!(['blob:','data:','file:'].includes(location.protocol)||location.hostname==='127.0.0.1')});
 });
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 await win.loadURL(url);
 const output=path.join(dir,'client-state.json');
 while(true){
  try{process.kill(owner,0);}catch{break;}
  const view=await win.webContents.executeJavaScript(`(()=>{
   const card=document.querySelector('[data-commander-companion]');
   return {theme:document.body.classList.contains('dsh-workspace-commander'),
    cardHeight:card?.getBoundingClientRect().height??null,name:card?.querySelector('strong')?.textContent??null,
    status:card?.querySelector('.commander-companion-status')?.textContent??null};
  })()`);
  fs.writeFileSync(output+'.tmp',JSON.stringify({...view,pid:process.pid,windowVisible:win.isVisible()}),{mode:0o600});
  fs.renameSync(output+'.tmp',output);
  await delay(200);
 }
 app.quit();
}).catch(()=>app.exit(1));
process.on('SIGTERM',()=>app.quit());
