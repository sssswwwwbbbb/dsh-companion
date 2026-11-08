const {app,BrowserWindow,ipcMain,session,Menu}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {fileURLToPath,pathToFileURL}=require('node:url');

const dir=process.env.DSH_COMPANION_PET_STATE||'';
const parent=Number(process.env.DSH_COMPANION_PET_PARENT);
const generation=Number(process.env.DSH_COMPANION_PET_GENERATION);
const origin=new URL(process.env.DSH_COMPANION_PET_ORIGIN);
const token=process.env.DSH_COMPANION_PET_TOKEN;
if(!path.isAbsolute(dir)||parent!==process.ppid||!Number.isSafeInteger(generation)||generation<1||
 origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||!/^[a-f0-9]{64}$/.test(token||''))throw new Error('PET_WORKER_PARENT_INVALID');

const vendor=path.join(__dirname,'dsh-pet');
const page=path.join(vendor,'runtime/electron-helper/index.html');
const {contentKey}=require('./skin.json');
const windows=new Map();
let held=process.env.DSH_COMPANION_PET_HOLD==='1',lastSnapshot='',connectionReady=false;
fs.mkdirSync(path.join(dir,'appdata'),{recursive:true,mode:0o700});
app.setPath('appData',path.join(dir,'appdata'));
app.setPath('userData',path.join(dir,'profile'));

function write(name,data){
 const file=path.join(dir,name),temp=file+'.tmp';
 fs.writeFileSync(temp,data,{mode:0o600});
 fs.renameSync(temp,file);
}

app.on('browser-window-created',(_,win)=>{
 const show=win.show.bind(win),showInactive=win.showInactive.bind(win);
 windows.set(win.id,{win,showInactive,renderer:null,inputRegions:0});
 win.show=(...args)=>{if(!held)return show(...args);};
 win.showInactive=(...args)=>{if(!held)return showInactive(...args);};
 win.on('closed',()=>windows.delete(win.id));
});
function owner(event){
 const win=BrowserWindow.fromWebContents(event.sender);
 if(!win||event.senderFrame!==event.sender.mainFrame)return null;
 try{return fileURLToPath(event.senderFrame.url)===page?windows.get(win.id):null;}
 catch{return null;}
}
ipcMain.on('pet:input-regions',(event,input)=>{const item=owner(event);if(item)item.inputRegions=input?.bodyRects?.length||0;});
ipcMain.on('companion:pet-state',(event,value)=>{const item=owner(event);if(item)item.renderer=value;});
ipcMain.on('companion:pet-input',event=>{
 if(!owner(event))return;
 void fetch(new URL('/backend/input',origin),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({contentKey,generation,trigger:'click'}),signal:AbortSignal.timeout(3000)}).catch(()=>{});
});
app.whenReady().then(()=>{
 Menu.setApplicationMenu(null);
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
  const url=new URL(details.url);
  callback({cancel:!(['file:','blob:','data:','dsh-pet-bridge:'].includes(url.protocol)||url.hostname==='127.0.0.1')});
 });
 setInterval(()=>{
  if(process.ppid!==parent){app.quit();return;}
  if(held&&fs.existsSync(path.join(dir,'reveal.json'))){
   held=false;
   for(const item of windows.values())item.showInactive();
  }
  if(!connectionReady&&process.env.DSH_PET_SITE_URL){
   const url=new URL(process.env.DSH_PET_SITE_URL);
   write('connection.json',JSON.stringify({origin:url.origin,token:new URLSearchParams(url.hash.slice(1)).get('token')}));
   connectionReady=true;
  }
  const all=[...windows.values()];
  const snapshot=JSON.stringify({
   windows:all.map(({win,renderer})=>({id:win.id,bounds:win.getBounds(),visible:win.isVisible(),renderer})),
   bodyInputs:all.map(({win,inputRegions})=>({window:win.id,rects:inputRegions})),
  });
  if(snapshot!==lastSnapshot){write('snapshot.json',snapshot);lastSnapshot=snapshot;}
 },75).unref();
});
process.on('SIGTERM',()=>app.quit());
void import(pathToFileURL(path.join(vendor,'lib/app.js')).href).catch(()=>app.exit(1));
