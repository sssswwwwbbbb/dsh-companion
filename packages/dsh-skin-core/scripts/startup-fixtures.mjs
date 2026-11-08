// Patches only the private staged native app. Never shipped in the runtime.
export function isolateOpenPaths(source){
  const start=source.indexOf('function openDsh(background=true){'),end=source.indexOf('\nasync function showIntro()',start);
  if(start<0||end<0)throw new Error('OPEN_FIXTURE_ANCHOR_CHANGED');
  return (source.slice(0,start)+"function openDsh(background=true){void fixtureOpenDsh('application',background);}"+source.slice(end))
    .replaceAll("void shell.openExternal('dsh://open')","void fixtureOpenDsh('protocol')")+
    "\nfunction fixtureOpenDsh(kind,background){const file=join(stateDir,'test-open-receipts.json');const receipts=readJson(file,[]);receipts.push({kind,background:background??null,at:Date.now()});writeJson(file,receipts);return Promise.resolve();}\n";
}
export function startupFixtures(source){
  const anchor="    authorization();\n    if(route==='/skin/startup/apply')";
  if(!source.includes(anchor))throw new Error('STARTUP_FIXTURE_ANCHOR_CHANGED');
  return source.replace("ipcMain.on('companion:ready',(event,value)=>{","ipcMain.on('companion:ready',(event,value)=>{if(existsSync(join(stateDir,'test-hold-pet-ready')))return;")
    .replace("if(!introCurrent(value?.token))return;","if(!introCurrent(value?.token)||existsSync(join(stateDir,'test-hold-intro-ready')))return;")
    .replace(anchor,`    if(route==='/test/intro'){
      if(input.ownerPid!==undefined)ownerPid=input.ownerPid;
      if(input.petReady!==undefined)ready=input.petReady;
      if(input.advanceSeconds)introStartedAt-=input.advanceSeconds*1000;
      if(input.ready)await introWindow.webContents.executeJavaScript('window.companion.introReady('+JSON.stringify(input.ready)+')');
      if(input.control)await introWindow.webContents.executeJavaScript('window.companion.introControl('+JSON.stringify(input.control)+')');
      if(input.click)await introWindow.webContents.executeJavaScript('document.querySelector('+JSON.stringify(input.click)+').click()');
      let renderer=null;
      if(introWindow&&!introWindow.isDestroyed()){
        renderer=await introWindow.webContents.executeJavaScript("(()=>{const p=document.querySelector('#poster'),v=document.querySelector('#character'),b=document.body;return {title:document.title,greeting:document.querySelector('#greeting').textContent,subtitle:document.querySelector('#subtitle').textContent,background:getComputedStyle(b).backgroundColor,textColor:getComputedStyle(b).color,poster:{hidden:p.hidden,complete:p.complete,width:p.naturalWidth,height:p.naturalHeight,source:p.getAttribute('src')},video:{hidden:v.hidden,width:v.videoWidth,height:v.videoHeight,duration:Number.isFinite(v.duration)?v.duration:null,currentTime:v.currentTime,paused:v.paused,ended:v.ended,muted:v.muted,loop:v.loop,error:v.error?.code||null,source:v.getAttribute('src')},skipDisabled:document.querySelector('#skip').disabled,openHidden:document.querySelector('#open').hidden};})()");
        if(input.capture){const shot=await introWindow.webContents.capturePage();writeJson(join(stateDir,'startup-capture.json'),{png:shot.toPNG().toString('base64')});}
      }
      const petRenderer=await window.webContents.executeJavaScript("({videos:document.querySelectorAll('video').length,playing:[...document.querySelectorAll('video')].filter(v=>!v.paused).length})");
      return {startup:status().startup,pet:skin.status(),petRenderer,token:activeIntro?.token,content:activeIntro,renderer,openReceipts:readJson(join(stateDir,'test-open-receipts.json'),[]),events:transitions.filter(x=>x.type.startsWith('intro-'))};
    }
`+anchor);
}
