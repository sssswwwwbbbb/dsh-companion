// Run with the verified Electron runtime. The test owns one hidden window;
// it neither automates nor captures any other application.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setName('DSH Companion Geometry Verification');
app.whenReady().then(async () => {
  app.dock?.hide();
  const { nativePosition } = await import(pathToFileURL(path.resolve('runtime-src/geometry.mjs')));
  const window = new BrowserWindow({ show:false, frame:false, width:160, height:120 });
  const report = { at:new Date().toISOString(), electron:process.versions.electron, platform:process.platform, hiddenWindowOnly:true, baselineNegativeZeroRejected:false, correctedCalls:0, negativeZerosCorrected:0, failures:[] };
  try { window.setPosition(Math.round(-0.1), 100, false); } catch(error) { report.baselineNegativeZeroRejected = error.message.includes('argument at index 0'); }
  for (let index=-240; index<=240; index++) {
    const x=index/20, y=100+index/40;
    const position=nativePosition(x,y);
    if(Object.is(Math.round(x),-0)||Object.is(Math.round(y),-0))report.negativeZerosCorrected++;
    try { window.setPosition(position.x,position.y,false);report.correctedCalls++; }
    catch(error) { report.failures.push({x,y,error:error.message}); }
  }
  for(const [x,y] of [[-1920.3,-1080.2],[NaN,100],[Infinity,100],[2147483648,100]]){
    const position=nativePosition(x,y);if(!position)continue;
    try { window.setPosition(position.x,position.y,false);report.correctedCalls++; }catch(error){report.failures.push({error:error.message});}
  }
  report.passed=report.baselineNegativeZeroRejected&&report.negativeZerosCorrected>0&&report.failures.length===0;
  fs.writeFileSync('reports/native-geometry-regression.json',JSON.stringify(report,null,2)+'\n');
  window.destroy();app.exit(report.passed?0:1);
}).catch(()=>app.exit(1));
