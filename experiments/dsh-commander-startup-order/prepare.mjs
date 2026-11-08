import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,accepted,acceptedReport,lab,stage,report} from './setup.mjs';
import {createHash} from 'node:crypto';

if(fs.existsSync(stage))throw new Error('ORDER_STAGE_ALREADY_EXISTS');
const old=JSON.parse(fs.readFileSync(path.join(acceptedReport,'review-index.json')));
for(const group of Object.values(old))for(const entry of group.files){
 const file=fs.readFileSync(path.join(root,entry.path));
 if(file.length!==entry.bytes||createHash('sha256').update(file).digest('hex')!==entry.sha256)throw new Error('ORDER_BASELINE_CHANGED: '+entry.path);
}
for(const dir of [lab,report])fs.mkdirSync(dir,{recursive:true,mode:0o700});
for(const name of ['staging','backend-template','dsh-pet','DshHostPetBackend.app','backend-entry.cjs','atomic-snapshot.cjs']){
 fs.cpSync(path.join(accepted,name),path.join(lab,name),{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
}
execFileSync('/usr/bin/patch',['-s','-p1','-i',fileURLToPath(new URL('cold-ready-order.patch',import.meta.url))],{cwd:stage});
fs.copyFileSync(path.join(acceptedReport,'candidate.json'),path.join(report,'candidate.json'));
