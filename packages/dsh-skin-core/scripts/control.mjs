import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {atomicJson} from '../src/state.mjs';
export async function control(target,method,value){
  const info=JSON.parse(fs.readFileSync('.local/skin-foundation-current.json')),dir=path.join(info.home,target==='page'?'renderer-commands':'commands'),id=randomUUID();
  const file=path.join(dir,id+'.request.json');atomicJson(file,{method,value});
  for(let i=0;i<500;i++){const response=file.replace('.request.json','.response.json');if(fs.existsSync(response)){const result=JSON.parse(fs.readFileSync(response));fs.unlinkSync(response);if(!result.ok)throw new Error(result.error);return result.value;}await new Promise(r=>setTimeout(r,100));}throw new Error('CONTROL_TIMEOUT');
}
if(process.argv[1]?.endsWith('/control.mjs'))console.log(JSON.stringify(await control(process.argv[2],process.argv[3],process.argv[4]?JSON.parse(process.argv[4]):undefined)));
