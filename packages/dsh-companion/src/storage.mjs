import fs from 'node:fs';
import path from 'node:path';
export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(error) { if(error.code==='ENOENT')return fallback;throw new Error('LOCAL_STATE_INVALID'); }
}
export function writeJson(file,value) {
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const temporary=file+'.'+process.pid+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,file);fs.chmodSync(file,0o600);
}
