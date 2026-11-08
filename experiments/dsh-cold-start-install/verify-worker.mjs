// Run via the extracted package's Electron in Node mode. The worker window stays held.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

const source=JSON.parse(fs.readFileSync(process.argv[2]));
assert.equal(source.passed,true);
assert.equal(process.execPath,source.executable);
const report=path.resolve(process.argv[3]);
const app=path.resolve(path.dirname(source.executable),'../Resources/app');
const {WholePetBackend}=await import(pathToFileURL(path.join(app,'backend.mjs')));
const {createBridge}=await import(pathToFileURL(path.join(app,'bridge.mjs')));
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(app,'skin-core/src/resources.mjs')));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-dev22-native-check-'));
const skin=loadSkin(path.join(source.installed,'skins/archive-workspace-r2-private'));
const events=[];
const bridge=await createBridge({dispatch:()=>({accepted:false})});
const backend=new WholePetBackend({stateDir:dir,host:{origin:'http://127.0.0.1:'+bridge.port,token:bridge.token},
 event:(type,data)=>events.push({type,...data})});
const result={artifactSha256:source.sha256,contentKey:skin.contentKey,executable:source.executable,stateDir:dir,events};
const record=()=>{
 const w=backend.status().windows[0];
 const s=w?.renderer?.sprites[0],v=w?.renderer?.videos[0];
 return {at:Date.now(),visible:w?.visible??false,id:w?.id,center:s?.center,moving:s?.moving,playback:s?.playback,
  source:v?.source,time:v?.time,paused:v?.paused,loop:v?.loop};
};
try{
 await backend.apply({config:{size:100},token:'worker-check',resources:prepareResources(skin),
  contentKey:skin.contentKey,generation:1,assertCurrent(){},holdVisibility:true});
 const live=backend.status();
 assert.ok(live.ready&&live.visibilityHeld&&live.windows.length===1&&!live.windows[0].visible);
 assert.equal(backend.supports('4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b'),false);
 result.initial={pid:live.pid,...record()};
 const media=path.join(dir,'whole-pet/home/dsh-pet/main-animation/webm');
 const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 for(const file of fs.readdirSync(media)){
  assert.equal(sha(path.join(media,file)),skin.manifest.assets[path.basename(file,'.webm')].sha256);
 }
 await backend.act('walk');
 const samples=[];
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  samples.push(record());
  if(backend.lastAction?.status==='ended'&&samples.at(-1).source==='master-idle.webm'&&!samples.at(-1).paused)break;
  await delay(75);
 }
 result.samples=samples;
 const turn=samples.filter(row=>row.source==='master-turn-front.webm');
 const playingTurn=turn.filter(row=>!row.paused);
 const last=samples.at(-1);
 assert.equal(backend.lastAction?.status,'ended');
 assert.equal(last.source,'master-idle.webm');
 assert.ok(playingTurn.length>=3&&playingTurn.every(row=>row.playback===backend.lastAction.playbackId));
 assert.ok(turn.every(row=>!row.moving&&row.center.x===last.center.x&&row.center.y===last.center.y));
 assert.ok(samples.every(row=>row.visible===false&&row.id===result.initial.id));
 assert.ok(result.initial.center.x-last.center.x>0);
 result.final=last;
 const prior=live.pid;
 await backend.stop();
 assert.equal(backend.status().windows.length,0);
 assert.throws(()=>process.kill(prior,0),{code:'ESRCH'});
 result.passed=true;
}catch(error){
 result.passed=false;result.error=error.message;process.exitCode=1;
}finally{
 await backend.stop();
 await bridge.close();
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,error:result.error,samples:result.samples?.length,report}));
}
