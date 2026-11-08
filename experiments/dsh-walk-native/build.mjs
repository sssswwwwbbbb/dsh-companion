import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {root,lab,stage,report} from './setup.mjs';
for(const f of ['backend.mjs','candidate-map.mjs'])fs.copyFileSync(path.join(root,'experiments/dsh-walk-native',f),path.join(stage,'runtime-src',f));
for(const f of ['backend-entry.cjs','atomic-snapshot.cjs'])fs.copyFileSync(path.join(root,'experiments/dsh-walk-native',f),path.join(lab,f));
for(const script of ['build-client.mjs','build-mac.mjs'])execFileSync(process.execPath,[path.join(stage,'scripts',script)],{cwd:stage,stdio:'pipe'});
fs.writeFileSync(path.join(report,'build.json'),JSON.stringify({at:new Date().toISOString(),privateStage:stage,builders:['build-client','build-mac'],derivedFrom:'R2 primary accepted frozen stage',canonicalChanged:false,previousPetHostsChanged:false})+'\n');console.log(JSON.stringify({built:true,stage}));
