import fs from 'node:fs';
import path from 'node:path';
import {accepted,lab,report} from './setup.mjs';
const from=JSON.parse(fs.readFileSync(path.join(accepted,'host-runtime.json')));
const ui=JSON.parse(fs.readFileSync(path.join(accepted,'host-ui-ready.json')));
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
if(!from.officialHost||!Number.isSafeInteger(from.pid)||!Number.isSafeInteger(ui.pid)||alive(from.pid)||alive(ui.pid))throw new Error('ACCEPTED_PRIVATE_INSTANCE_MUST_BE_CLOSED');
const url=new URL(from.url);
if(url.hostname!=='127.0.0.1'||!Number.isSafeInteger(Number(url.port))||Number(url.port)<1024)throw new Error('PRIVATE_LOOPBACK_REQUIRED');
for(const rel of ['host-home/sessions','host-home/storages','host-ui-profile/Local Storage']){
 const target=path.join(lab,rel);
 if(fs.existsSync(target))throw new Error('STARTUP_PRIVATE_DATA_ALREADY_EXISTS');
 fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
 fs.cpSync(path.join(accepted,rel),target,{recursive:true,filter:file=>!['LOCK','session.lock'].includes(path.basename(file))});
}
fs.writeFileSync(path.join(lab,'host-port.json'),JSON.stringify({port:Number(url.port)})+'\n',{mode:0o600});
fs.writeFileSync(path.join(report,'session-transfer.json'),JSON.stringify({sameLoopbackOrigin:true,privateSessionSnapshots:true,localDraftStorage:true,oldProfileUnmodifiedByCopy:true,copiedCredentials:false,copiedSettings:false,originalPrivateHostClosed:true},null,2)+'\n');
console.log('Copied the original private DSH Session and draft storage.');
