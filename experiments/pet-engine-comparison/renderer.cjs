const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),lab=path.join(root,'.local/pet-engine-comparison-20261104'),info=JSON.parse(fs.readFileSync(path.join(lab,'runtime.json'))),candidate=process.argv.find(v=>v.startsWith('--engine='))?.split('=')[1]||'dsh';
if(!['dsh','phaser'].includes(candidate))throw new Error('UNKNOWN_CANDIDATE');
app.setPath('userData',path.join(lab,'renderer-'+candidate+(process.env.PET_ENGINE_COMPARE_PROFILE?'-'+process.env.PET_ENGINE_COMPARE_PROFILE:'')));app.setName(candidate==='dsh'?'DSHPet Comparison':'Phaser Comparison');
app.whenReady().then(async()=>{
 const errors=[],blocked=[];session.defaultSession.webRequest.onBeforeRequest((d,cb)=>{const u=new URL(d.url),ok=['127.0.0.1','localhost','[::1]'].includes(u.hostname)||['data:','blob:','file:'].includes(u.protocol);if(!ok)blocked.push(u.origin);cb({cancel:!ok});});
 const win=new BrowserWindow({show:true,width:1120,height:820,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});win.webContents.on('console-message',e=>{if(e.level==='error'||e.level===3)errors.push(e.message.slice(0,400));});await win.loadURL(info.urls[candidate]);
 const dir=path.join(lab,'commands-'+candidate);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(lab,'renderer-'+candidate+'.json'),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),candidate}));
 const poll=setInterval(async()=>{for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.request.json'))){const file=path.join(dir,name),input=JSON.parse(fs.readFileSync(file));fs.unlinkSync(file);try{
  let value;if(input.method==='snapshot')value=await win.webContents.executeJavaScript('window.__comparison?.snapshot()||null');
  else if(input.method==='metrics')value={candidate,metrics:app.getAppMetrics(),errors,blocked,resources:await win.webContents.executeJavaScript('performance.getEntriesByType("resource").map(r=>({name:new URL(r.name).pathname,bytes:r.decodedBodySize,ms:r.duration}))')};
  else if(input.method==='quit'){clearInterval(poll);win.destroy();app.quit();value={closed:true};}
  else throw new Error('READ_ONLY_MEASUREMENT');fs.writeFileSync(file.replace('.request.json','.response.json'),JSON.stringify({ok:true,value}));
 }catch(e){fs.writeFileSync(file.replace('.request.json','.response.json'),JSON.stringify({ok:false,error:e.message}));}}},100);
 for(let i=0;i<120;i++){if(await win.webContents.executeJavaScript('window.__comparison?.ready===true')){console.log(JSON.stringify({ready:true,candidate,pid:process.pid}));return;}await new Promise(r=>setTimeout(r,50));}console.log(JSON.stringify({ready:false,candidate,pid:process.pid,error:'COMPARISON_NOT_READY'}));
});app.on('window-all-closed',()=>app.quit());
