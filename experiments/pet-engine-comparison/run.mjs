import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),lab=path.join(root,'.local/pet-engine-comparison-20261104'),home=path.join(lab,'dsh-home'),report=path.join(root,'reports/pet-engine-comparison-2026-11-04');fs.mkdirSync(report,{recursive:true});
const log=fs.openSync(path.join(lab,'upstream-host.log'),'a');
const upstreamStart=performance.now(),upstream=spawn(process.execPath,['--import',path.join(root,'experiments/pet-engine-comparison/loopback-only.mjs'),path.join(lab,'env/node_modules/dsh-pet/lib/standalone.js'),'--port','56270'],{cwd:lab,env:{...process.env,DSH_HOME:home},stdio:['ignore',log,log]});
const runtimeFile=path.join(home,'dsh-pet/standalone-runtime.json');let upstreamInfo;
for(let i=0;i<150;i++){try{const info=JSON.parse(fs.readFileSync(runtimeFile));if(info.pid===upstream.pid){upstreamInfo=info;break;}}catch{}if(upstream.exitCode!==null)throw new Error('UPSTREAM_HOST_FAILED_CHECK_LOCAL_LOG');await new Promise(r=>setTimeout(r,100));}
if(!upstreamInfo)throw new Error('UPSTREAM_HOST_START_TIMEOUT');
let configReady=false;for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:'+upstreamInfo.port+'/dsh-pet-7340/config');const v=await r.json();if(v.main){configReady=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}if(!configReady)throw new Error('UPSTREAM_CONFIG_NOT_READY');const backendSpawnToConfigMs=Math.round(performance.now()-upstreamStart);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webm':'video/webm','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname.startsWith('/dsh-pet-7340/')){
   const proxy=http.request({hostname:'127.0.0.1',port:upstreamInfo.port,path:req.url,method:req.method,headers:{'content-type':req.headers['content-type']||'application/json','x-dsh-pet-token':upstreamInfo.token}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});proxy.on('error',()=>{res.writeHead(502);res.end('upstream unavailable');});req.pipe(proxy);return;
  }
  if(url.pathname==='/evidence'&&req.method==='POST'){
   let text='';for await(const chunk of req){text+=chunk;if(text.length>500000)throw new Error('RECEIPT_TOO_LARGE');}const value=JSON.parse(text);if(!['dsh','phaser'].includes(value.candidate))throw new Error('UNKNOWN_CANDIDATE');fs.appendFileSync(path.join(report,value.candidate+'-events.jsonl'),JSON.stringify({at:new Date().toISOString(),...value})+'\n');res.end('{}');return;
  }
  if(url.pathname==='/experiment/extend'&&req.method==='POST'){
   const file=path.join(home,'dsh-pet/main-config.jsonc'),config=JSON.parse(fs.readFileSync(file));if(!config.animations.categories[0].actions.includes('look'))config.animations.categories[0].actions.push('look');fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');res.end('{}');return;
  }
  let file;
  if(url.pathname.startsWith('/assets/'))file=path.join(lab,'assets',path.basename(url.pathname));
  else file=path.join(lab,'web',url.pathname==='/'?'index.html':path.basename(url.pathname));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return;}
  const stat=fs.statSync(file),headers={'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':url.pathname.startsWith('/assets/')?'public, max-age=3600':'no-store','accept-ranges':'bytes'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;if(start> end){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'content-range':`bytes ${start}-${end}/${stat.size}`,'content-length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,'content-length':stat.size});fs.createReadStream(file).pipe(res);}
 }catch(e){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const info={at:new Date().toISOString(),pid:process.pid,upstreamPid:upstream.pid,backendSpawnToConfigMs,port:server.address().port,upstreamPort:upstreamInfo.port,home,urls:{dsh:'http://127.0.0.1:'+server.address().port+'/?engine=dsh',phaser:'http://127.0.0.1:'+server.address().port+'/?engine=phaser'}};
fs.writeFileSync(path.join(report,'backend-launch.json'),JSON.stringify({at:info.at,backendSpawnToConfigMs,upstreamPid:upstream.pid,note:'Upstream standalone backend only; browser launch reported separately.'},null,2));
fs.writeFileSync(path.join(lab,'runtime.json'),JSON.stringify(info,null,2));console.log(JSON.stringify(info));
let ending=false;async function stop(){if(ending)return;ending=true;try{await fetch('http://127.0.0.1:'+upstreamInfo.port+'/shutdown',{method:'POST',headers:{'x-dsh-pet-token':upstreamInfo.token}});}catch{}upstream.kill('SIGTERM');server.close();fs.closeSync(log);process.exit();}process.on('SIGINT',stop);process.on('SIGTERM',stop);
