const {app,BrowserWindow,nativeTheme}=require('electron');const fs=require('node:fs');const path=require('node:path');
const project=process.cwd(),info=JSON.parse(fs.readFileSync(path.join(project,process.argv.find(x=>x.startsWith('--info='))?.slice(7)||'.local/skin-foundation-current.json')));
app.setPath('userData',path.join(info.home,'renderer-profile'));app.setName('DSH Skin Isolated Check');let win;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const respond=(file,value)=>{const target=file.replace('.request.json','.response.json'),temporary=target+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value));fs.renameSync(temporary,target);};
app.whenReady().then(async()=>{
  win=new BrowserWindow({width:1180,height:820,show:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  if(process.argv.some(x=>x.includes('skin-immersion-current'))){win.on('page-title-updated',e=>{e.preventDefault();win.setTitle('DSH 沉浸候选 · dev.20');});win.setTitle('DSH 沉浸候选 · dev.20');}
  const log=fs.openSync(path.join(info.home,'renderer.log'),'a',0o600);
  win.webContents.on('console-message',event=>{fs.writeSync(log,JSON.stringify({level:event.level,message:event.message})+'\n');});
  await win.loadURL(info.url);await delay(4000);
  const commands=path.join(info.home,'renderer-commands');fs.mkdirSync(commands,{recursive:true});
  fs.writeFileSync(path.join(info.home,'renderer-ready.json'),JSON.stringify({pid:process.pid,ready:true}));
  let quitting=false;
  while(!quitting){
    for(const file of fs.readdirSync(commands).filter(x=>x.endsWith('.request.json'))){
      const input=JSON.parse(fs.readFileSync(path.join(commands,file)));fs.unlinkSync(path.join(commands,file));
      try{
        let value;
        if(input.method==='evaluate')value=await win.webContents.executeJavaScript(input.value,true);
        else if(input.method==='click'){
          const box=await win.webContents.executeJavaScript(`(()=>{const input=${JSON.stringify(input.value)};const e=input.selector?document.querySelector(input.selector):[...document.querySelectorAll('button')].find(e=>input.exact?e.textContent===input.text:e.textContent.includes(input.text));if(!e)return {error:'TEST_BUTTON_MISSING'};if(e.disabled)return {error:'TEST_BUTTON_DISABLED'};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
          if(box.error)throw new Error(box.error);win.show();win.focus();win.webContents.focus();await delay(100);
          win.webContents.sendInputEvent({type:'mouseMove',...box});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...box});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...box});await delay(150);value={clicked:true};
        }
        else if(input.method==='screenshot'){const image=await win.webContents.capturePage();fs.writeFileSync(input.value,image.toPNG());value={saved:true};}
        else if(input.method==='theme'){nativeTheme.themeSource=input.value;await delay(200);value={theme:input.value};}
        else if(input.method==='input'){await win.webContents.executeJavaScript("document.querySelector('[data-composer-input]').focus()");await win.webContents.insertText(input.value);value={inserted:true};}
        else if(input.method==='resize'){win.setSize(input.value.width,input.value.height);value={resized:true};}
        else if(input.method==='reload'){win.reload();await delay(3000);value={reloaded:true};}
        else if(input.method==='quit'){quitting=true;value={quitting:true};}
        else throw new Error('UNKNOWN_COMMAND');
        respond(path.join(commands,file),{ok:true,value});
      }catch(e){respond(path.join(commands,file),{ok:false,error:e.message});}
    }
    await delay(100);
  }
  app.quit();
}).catch(e=>{console.error(e.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
