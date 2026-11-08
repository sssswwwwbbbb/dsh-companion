import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';import {lab} from './setup.mjs';
const method=process.argv[2]||'status',dir=path.join(lab,'commands');fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,randomUUID()+'.request.json');
const tmp=f+'.tmp',out=f.replace('.request.json','.response.json');
fs.writeFileSync(tmp,JSON.stringify({method}),{mode:0o600});
fs.renameSync(tmp,f);
for(let i=0;i<1800;i++){
 if(fs.existsSync(out)){
  let value;
  try{value=JSON.parse(fs.readFileSync(out));}
  catch(error){if(!(error instanceof SyntaxError))throw error;}
  if(value){fs.rmSync(out);console.log(JSON.stringify(value));process.exit(value.ok?0:1);}
 }
 await new Promise(resolve=>setTimeout(resolve,100));
}
throw new Error('HOST_COMMAND_TIMEOUT');
