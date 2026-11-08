// Read-only representative snapshots; not a long-running benchmark.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const root=process.cwd(),lab=path.join(root,'.local/pet-engine-comparison-20261104'),report=path.join(root,'reports/pet-engine-comparison-2026-11-04'),label=process.argv[2]||'idle';
async function read(candidate,method){const dir=path.join(lab,'commands-'+candidate),file=path.join(dir,randomUUID()+'.request.json'),response=file.replace('.request.json','.response.json');fs.writeFileSync(file,JSON.stringify({method}));for(let i=0;i<100;i++){if(fs.existsSync(response)){const value=JSON.parse(fs.readFileSync(response));if(!value.ok)throw new Error(value.error);return value.value;}await new Promise(r=>setTimeout(r,50));}throw new Error('METRICS_TIMEOUT');}
const rows=[];for(let i=0;i<6;i++){
 const candidates=await Promise.all(['dsh','phaser'].map(async candidate=>({candidate,snapshot:await read(candidate,'snapshot'),...(await read(candidate,'metrics'))})));
 const info=JSON.parse(fs.readFileSync(path.join(lab,'runtime.json'))),host=execFileSync('ps',['-p',[info.pid,info.upstreamPid].join(','),'-o','pid=,rss=,%cpu=,etime='],{encoding:'utf8'}).trim();
 rows.push({at:new Date().toISOString(),candidates,host});if(i<5)await new Promise(r=>setTimeout(r,1000));
}
const value={label,commonElectron:'45.2.1',note:'Six representative read snapshots at ~1 second intervals. Initial CPU reading is a warm-up. RSS sums include shared pages; not a unique-memory or peak measurement.',rows};fs.writeFileSync(path.join(report,'metrics-'+label+'.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({label,samples:rows.length,candidates:rows.at(-1).candidates.map(v=>({candidate:v.candidate,phase:v.snapshot.phase,startupMs:v.snapshot.startupMs,rssKB:v.metrics.reduce((n,m)=>n+m.memory.workingSetSize,0),errors:v.errors}))}));
