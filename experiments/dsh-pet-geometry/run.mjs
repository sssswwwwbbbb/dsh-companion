import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),lab=path.join(root,'.local/dsh-pet-geometry-20261104'),report=path.join(root,'reports/dsh-pet-geometry-2026-11-04'),data=JSON.parse(fs.readFileSync(path.join(lab,'assets/content-map.json')));
const delay=ms=>new Promise(r=>setTimeout(r,ms)),log=(type,detail={})=>fs.appendFileSync(path.join(report,'host-events.jsonl'),JSON.stringify({at:Date.now(),type,...detail})+'\n'),state={profile:'master04',enabled:true,props:true,scale:1,revision:0};
function latest(){try{return JSON.parse(fs.readFileSync(path.join(lab,'native-latest.json')));}catch{return{windows:[]};}}
async function waitNative(check,reason){for(let i=0;i<150;i++){const n=latest();if(check(n))return n;await delay(100);}throw new Error('NATIVE_WAIT_'+reason);}
async function api(route,body,method=body===undefined?'GET':'POST'){
 const info=JSON.parse(fs.readFileSync(path.join(lab,'native-runtime.json'))),r=await fetch(info.origin+'/dsh-pet-7340/'+route+(route.includes('?')?'&':'?')+'surface=desktop',{method,headers:{'content-type':'application/json','x-dsh-pet-token':info.token},...(body===undefined?{}:{body:JSON.stringify(body)})}),v=r.status===204?{}:await r.json();if(!r.ok||v.ok===false)throw new Error(route+': '+JSON.stringify(v));log('native-api',{route,method,...(body===undefined?{}:{body}),result:v});return v;
}
async function configure(){
 const cfg=JSON.parse(fs.readFileSync(path.join(lab,'fixture-base.json'))),prefix=state.profile==='master04'?'master':'legacy',old=latest().windows[0]?.id;
 cfg.pets[0].display=state.enabled?'desktop':'none';cfg.pets[0].size=Math.round(data.profiles[state.profile].defaultSize*state.scale);cfg.pets[0].name=state.profile==='master04'?'母版04 · 原生拟合':'准确0.7.1 · 原生拟合';
 cfg.animations.idle=[prefix+'-idle'];cfg.animations.drag=[prefix+'-react'];cfg.animations.clicks=[prefix+'-react'];cfg.animations.events={balance:[prefix+'-react'],whisper:[prefix+'-react'],workStatus:Array(6).fill(prefix+'-react')};
 fs.writeFileSync(path.join(lab,'native-home/dsh-pet/main-config.jsonc'),JSON.stringify(cfg,null,2)+'\n');await api('reload',{});
 return waitNative(n=>state.enabled?n.windows[0]?.id!==old&&n.windows[0]?.renderer.stages?.[0]?.profile===state.profile:n.windows.length===0,'CONFIGURE');
}
async function waitPlayback(id){for(let i=0;i<150;i++){const v=await api('playback/'+id);if(['ended','failed','cancelled'].includes(v.status)){log('playback-terminal',v);if(v.status!=='ended')throw new Error('PLAYBACK_'+v.status);return v;}await delay(40);}throw new Error('PLAYBACK_TIMEOUT');}
async function action(name){
 const revision=++state.revision;log('user-command',{action:name,revision});
 if(name==='master'||name==='legacy'){state.profile=name==='master'?'master04':'legacy071';state.scale=1;await configure();}
 else if(name==='react'){const prefix=state.profile==='master04'?'master':'legacy',v=await api('anim?pet=main',{name:prefix+'-react',facing:'left'});await waitPlayback(v.playbackId);}
 else if(name==='move'){const n=latest(),s=n.windows[0].renderer.sprites[0],view=n.windows[0].renderer.viewport;await api('position?pet=main',{x:s.pos.x<900?.42:.24,y:.68,mode:'line',duration:900});}
 else if(name==='scale'){state.scale=state.scale===1?.8:1;await configure();}
 else if(name==='props')state.props=!state.props;
 else if(name==='disable'){state.enabled=false;await api('pet-display',{id:'main',display:'none'});await waitNative(n=>n.windows.length===0,'DISABLE');}
 else if(name==='enable'){state.enabled=true;await configure();}
 else if(name==='align'){
  const c=JSON.parse(fs.readFileSync(path.join(lab,'console-window.json'))).contentBounds,n=latest(),w=n.windows[0],r=w.renderer,s=r.sprites[0],stage=r.stages[0].box,view=r.viewport;
  const probe=data.profiles[state.profile].transparentProbe,target={x:c.x+790,y:c.y+595},point={x:w.bounds.x+stage.x+s.size*probe[0]/640,y:w.bounds.y+stage.y+s.size*probe[1]/640};
  const cx=s.pos.x+s.size/2+target.x-point.x,cy=s.pos.y+s.size*9/32+target.y-point.y;
  await api('position?pet=main',{x:cx/view.w,y:cy/view.h,mode:'instant'});log('through-test-aligned',{target,normalizedContentPoint:probe,insideHitBounds:true,profile:state.profile});
 }else throw new Error('UNKNOWN_ACTION');
 if(revision!==state.revision)throw new Error('ACTION_SUPERSEDED');log('action-completed',{action:name,state:{...state}});return{action:name,state:{...state}};
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');res.setHeader('cache-control','no-store');
 if(u.pathname==='/scene.json'){res.setHeader('access-control-allow-origin','*');res.setHeader('content-type','application/json');res.end(JSON.stringify(state));return;}
 if(u.pathname==='/action'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;res.setHeader('content-type','application/json');res.end(JSON.stringify(await action(JSON.parse(body).action)));return;}
 if(u.pathname==='/evidence'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;log('console-evidence',JSON.parse(body));res.end('{}');return;}
 const file=u.pathname.startsWith('/assets/')?path.join(lab,'assets',path.basename(u.pathname)):path.join(lab,'console',u.pathname==='/'?'index.html':path.basename(u.pathname));if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('access-control-allow-origin','*');res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch(e){log('error',{message:String(e)});res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:String(e)}));}});
await new Promise(r=>server.listen(Number(process.env.DSH_GEOMETRY_PORT||0),'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;fs.writeFileSync(path.join(lab,'runtime.json'),JSON.stringify({pid:process.pid,origin,at:new Date().toISOString()},null,2));fs.writeFileSync(path.join(lab,'package/runtime/electron-helper/geometry-endpoint.js'),'globalThis.DSH_GEOMETRY_ENDPOINT='+JSON.stringify(origin)+';\n');console.log(JSON.stringify({ready:true,pid:process.pid,origin}));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close();process.exit();});
