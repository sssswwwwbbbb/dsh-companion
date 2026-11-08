import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
const [surface,method='snapshot',label]=process.argv.slice(2);if(!['console','native'].includes(surface))throw new Error('UNKNOWN_SURFACE');
const dir=path.resolve('.local/dsh-pet-integration-20261104/commands-'+surface),file=path.join(dir,randomUUID()+'.request.json'),response=file.replace('.request.json','.response.json');fs.writeFileSync(file,JSON.stringify({method}));
let result;for(let i=0;i<100;i++){if(fs.existsSync(response)){result=JSON.parse(fs.readFileSync(response));break;}await new Promise(r=>setTimeout(r,100));}if(!result?.ok)throw new Error(result?.error||'PROBE_TIMEOUT');
if(label)fs.writeFileSync(path.resolve('reports/dsh-pet-integration-2026-11-04',label+'.json'),JSON.stringify(result.value,null,2)+'\n');
console.log(JSON.stringify(surface==='native'?result.value:{events:result.value.events?.slice(-5),latest:result.value.samples?.at(-1),errors:result.value.errors,blocked:result.value.blocked}));
