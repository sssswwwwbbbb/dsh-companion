import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)), stateDir=path.join(root,'.local/license-service');
fs.mkdirSync(stateDir,{recursive:true,mode:0o700});
const serviceFile=path.join(stateDir,'service.json');
let service;
try{const old=JSON.parse(fs.readFileSync(serviceFile));const response=await fetch(old.serviceUrl+'/health',{signal:AbortSignal.timeout(1000)});if((await response.json()).product==='dsh-companion')service=old;}catch{}
if(!service){
 const log=fs.openSync(path.join(stateDir,'service.log'),'a',0o600);
 const child=spawn(process.execPath,[path.join(root,'licensing/server.mjs'),stateDir,'43127'],{detached:true,stdio:['ignore',log,log],env:{PATH:process.env.PATH,HOME:process.env.HOME}});child.unref();fs.closeSync(log);
 for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,100));try{const row=JSON.parse(fs.readFileSync(serviceFile));const response=await fetch(row.serviceUrl+'/health',{signal:AbortSignal.timeout(1000)});if((await response.json()).ok){service=row;break;}}catch{}}
}
if(!service)throw new Error('LICENSE_SERVICE_START_FAILED');
const config={format:1,productId:'dsh-companion',serviceUrl:service.serviceUrl,publicKey:service.publicKey,channel:'private',supportedDsh:["0.2.1-rc.4","0.2.1-rc.5","0.2.2-rc.1"],mode:'local-validation'};
const directory=path.join(root,'packages/dsh-companion/config');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'service.json'),JSON.stringify(config,null,2)+'\n');
console.log('Private local service ready; only the public verification key and endpoint were copied into the plugin.');
