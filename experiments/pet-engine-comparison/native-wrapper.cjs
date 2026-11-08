// No upstream business patch: private paths + read-only native-window telemetry.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),lab=path.join(root,'.local/pet-engine-comparison-20261104');
fs.mkdirSync(path.join(lab,'native-appdata'),{recursive:true});fs.mkdirSync(path.join(lab,'native-profile'),{recursive:true});app.setPath('appData',path.join(lab,'native-appdata'));app.setPath('userData',path.join(lab,'native-profile'));process.env.DSH_HOME=path.join(lab,'native-home');
const ignores=new Map(),events=[],original=BrowserWindow.prototype.setIgnoreMouseEvents;
BrowserWindow.prototype.setIgnoreMouseEvents=function(ignore,...rest){ignores.set(this.id,ignore);events.push({at:Date.now(),window:this.id,ignore});if(events.length>300)events.shift();return original.call(this,ignore,...rest);};
const errors=[];app.on('web-contents-created',(_,contents)=>contents.on('console-message',e=>{if(e.level==='error'||e.level===3)errors.push(e.message.slice(0,300));}));
app.whenReady().then(()=>{
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>{const u=new URL(d.url),ok=['127.0.0.1','localhost','[::1]'].includes(u.hostname)||['data:','blob:','file:','dsh-pet-bridge:'].includes(u.protocol);cb({cancel:!ok});});
 const dir=path.join(lab,'commands-native');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(lab,'renderer-native.json'),JSON.stringify({pid:process.pid}));
 setInterval(async()=>{for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.request.json'))){const file=path.join(dir,name),input=JSON.parse(fs.readFileSync(file));fs.unlinkSync(file);try{let value;
  if(input.method==='snapshot'){
   const windows=[];for(const w of BrowserWindow.getAllWindows())windows.push({id:w.id,bounds:w.getBounds(),visible:w.isVisible(),alwaysOnTop:w.isAlwaysOnTop(),focusable:w.isFocusable(),ignoreMouseEvents:ignores.get(w.id),renderer:await w.webContents.executeJavaScript('({title:document.title,videos:[...document.querySelectorAll("video")].map(v=>({src:v.currentSrc.split("/").at(-1),width:v.videoWidth,height:v.videoHeight,time:v.currentTime,paused:v.paused})),text:document.body.innerText.slice(0,200)})')});
   value={candidate:'native',windows,ignoreEvents:events,errors,userData:app.getPath('userData')};
  }else if(input.method==='metrics')value={metrics:app.getAppMetrics(),errors};else if(input.method==='quit'){value={closed:true};setTimeout(()=>app.quit(),50);}else throw new Error('READ_ONLY_MEASUREMENT');
  fs.writeFileSync(file.replace('.request.json','.response.json'),JSON.stringify({ok:true,value}));
 }catch(e){fs.writeFileSync(file.replace('.request.json','.response.json'),JSON.stringify({ok:false,error:e.message}));}}},100);
});
// Official in-process app entry installs its own routes, file-origin auth and
// native helper. Recreating those around the CLI would duplicate upstream work.
import(require('node:url').pathToFileURL(path.join(lab,'env/node_modules/dsh-pet/lib/app.js')).href).catch(e=>{process.stderr.write(String(e)+'\n');app.exit(1);});
