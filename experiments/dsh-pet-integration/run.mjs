import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';
import {createNativeLock} from './native-lock.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),lab=path.join(root,'.local/dsh-pet-integration-20261104'),report=path.join(root,'reports/dsh-pet-integration-2026-11-04');
const delay=ms=>new Promise(r=>setTimeout(r,ms)),log=(type,data={})=>fs.appendFileSync(path.join(report,'host-events.jsonl'),JSON.stringify({at:Date.now(),type,...data})+'\n');
const state={revision:0,enabled:true,skin:'whale',intent:'free',work:false};
const nativeLock=createNativeLock({acquire:ttl=>api('lock?pet=main',{ttl}),release:lockId=>api('lock/release?pet=main',{lockId})});
function latest(){try{return JSON.parse(fs.readFileSync(path.join(lab,'native-latest.json')));}catch{return{windows:[]};}}
function pet(){return latest().windows?.[0]?.renderer?.sprites?.[0];}
async function waitNative(check,why){for(let i=0;i<120;i++){if(check(pet(),latest()))return;await delay(100);}throw new Error('NATIVE_WAIT_'+why);}
async function api(route,body,method=body===undefined?'GET':'POST'){
 const n=JSON.parse(fs.readFileSync(path.join(lab,'native-runtime.json')));if(!n.token)throw new Error('NATIVE_AUTH_NOT_READY');
 const r=await fetch(n.origin+'/dsh-pet-7340/'+route+(route.includes('?')?'&':'?')+'surface=desktop',{method,headers:{'content-type':'application/json','x-dsh-pet-token':n.token},...(body===undefined?{}:{body:JSON.stringify(body)})}),v=r.status===204?{}:await r.json();
 if(!r.ok||v.ok===false)throw new Error(route+': '+JSON.stringify(v));log('native-api',{route,method,...(body===undefined?{}:{body}),result:v});return v;
}
async function release(){await nativeLock.release();}
async function wake(){await api('wake?pet=main',{});await waitNative(s=>s&&!s.sleeping,'WAKE');}
async function reading(){await api('sleep?pet=main',{});await waitNative(s=>s?.sleepPhase==='loop','READING');}
async function watchPlayback(id,name){let last='';for(let i=0;i<200;i++){const p=await api('playback/'+id);if(p.status!==last){last=p.status;log('native-playback',{name,...p});}if(['ended','cancelled','failed'].includes(p.status))return;await delay(50);}log('error',{message:'PLAYBACK_TIMEOUT',id,name});}
async function action(name){
 const revision=++state.revision;log('native-user-command',{action:name,revision});
 const current=()=>{if(state.revision!==revision)throw new Error('ACTION_SUPERSEDED');};
 if(['walk','run','replace','place'].includes(name)){
  state.intent='free';state.work=false;await api('work-status',undefined,'DELETE');await wake();current();
  const lockId=await nativeLock.ensure();
  await waitNative(s=>s?.frozen,'LOCK');current();
  if(name==='place')await api('position?pet=main&lock='+encodeURIComponent(lockId),{x:.35,y:.70,mode:'instant'});
  else{const anim=name==='replace'?'react':name,v=await api('anim?pet=main&lock='+encodeURIComponent(lockId),{name:anim,facing:name==='run'?'left':'right'});void watchPlayback(v.playbackId,anim).catch(e=>log('error',{message:String(e)}));}
 }else if(name==='move-scene'){
  await api('position?pet=main',{x:pet().pos.x<900?.42:.25,y:.70,mode:'line',duration:900});
 }else if(name==='autonomy'){
  state.enabled=true;state.intent='free';state.work=false;await api('work-status',undefined,'DELETE');await wake();await release();
 }else if(name==='reading'){
  state.intent='reading';state.work=false;await release();await api('work-status',undefined,'DELETE');await waitNative(s=>s&&!s.workState,'WORK_CLEAR');current();await reading();
 }else if(name==='work'){
  state.work=true;await release();await wake();current();await api('work-status',{state:'working',task:'本地注入工作，未调用模型'});await waitNative(s=>s?.workState==='working','WORK');
 }else if(name==='clear-work'){
  state.work=false;await api('work-status',undefined,'DELETE');await waitNative(s=>s&&!s.workState,'WORK_CLEAR');current();if(state.intent==='reading')await reading();
 }else if(name==='interact'){
  await wake();current();const lockId=await nativeLock.ensure(15000);
  const v=await api('anim?pet=main&lock='+encodeURIComponent(lockId),{name:'react'});
  for(let i=0;i<160;i++){const p=await api('playback/'+v.playbackId);if(['ended','cancelled','failed'].includes(p.status)){if(p.status!=='ended')throw new Error('INTERACTION_'+p.status);break;}await delay(50);}
  current();await release();if(state.intent==='reading'&&!state.work)await reading();
 }else if(['scale','switch','restore','enable'].includes(name)){
  if(name==='enable')state.enabled=true;
  if(name==='switch')state.skin='plain';if(name==='restore')state.skin='whale';
  const cfg=JSON.parse(fs.readFileSync(path.join(lab,'native-home/dsh-pet/main-config.jsonc'))),oldId=latest().windows?.[0]?.id;
  cfg.pets[0].display='desktop';if(name==='scale')cfg.pets[0].size=cfg.pets[0].size===420?560:420;
  cfg.pets[0].name=state.skin==='whale'?'隔离适配 · 旧机制素材':'素净机制皮肤 · 同一旧素材';
  await api('config',cfg,'PUT');await waitNative((s,v)=>s&&v.windows[0].id!==oldId,'REBUILD');current();
  if(state.intent==='reading'&&state.enabled&&!state.work)await reading();
 }else if(name==='disable'){
  state.enabled=false;await release();await api('pet-display',{id:'main',display:'none'});await waitNative((s,v)=>v.windows.length===0,'DISABLE');
 }else throw new Error('UNKNOWN_ACTION');
 current();log('native-action-completed',{action:name,state:{...state}});return{action:name,state:{...state}};
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 res.setHeader('cache-control','no-store');
 if(u.pathname==='/scene.json'){res.setHeader('access-control-allow-origin','*');res.setHeader('content-type','application/json');res.end(JSON.stringify(state));return;}
 if(u.pathname==='/native/action'&&req.method==='POST'){let b='';for await(const c of req)b+=c;const v=await action(JSON.parse(b).action);res.setHeader('content-type','application/json');res.end(JSON.stringify(v));return;}
 if(u.pathname==='/evidence'&&req.method==='POST'){let b='';for await(const c of req)b+=c;log('console-evidence',JSON.parse(b));res.end('{}');return;}
 const f=path.join(lab,'web',u.pathname==='/'?'index.html':path.basename(u.pathname));if(!fs.existsSync(f)){res.writeHead(404);res.end();return;}
 res.setHeader('access-control-allow-origin','*');res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
 }catch(e){log('error',{message:String(e)});res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:String(e)}));}});
await new Promise(r=>server.listen(Number(process.env.DSH_INTEGRATION_PORT||0),'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
fs.writeFileSync(path.join(lab,'runtime.json'),JSON.stringify({pid:process.pid,origin,at:new Date().toISOString()},null,2));
fs.writeFileSync(path.join(lab,'package/runtime/electron-helper/integration-endpoint.js'),'globalThis.DSH_INTEGRATION_ENDPOINT='+JSON.stringify(origin)+';\n');
console.log(JSON.stringify({ready:true,origin,pid:process.pid,desktopOnly:true}));
process.on('SIGTERM',()=>{server.close();process.exit();});process.on('SIGINT',()=>{server.close();process.exit();});
