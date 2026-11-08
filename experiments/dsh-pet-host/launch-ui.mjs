import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {root,lab} from './setup.mjs';
const target=path.join(lab,'DshPetHost.app');if(!fs.existsSync(target))execFileSync('/usr/bin/ditto',[path.join(root,'.cache/electron/45.2.1/darwin-arm64/Electron.app'),target]);
for(const [key,value]of [['CFBundleIdentifier','local.dsh.pet-host.ui'],['CFBundleName','DshPetHost'],['CFBundleDisplayName','DSH 隔离接入']])execFileSync('/usr/libexec/PlistBuddy',['-c','Set :'+key+' '+value,path.join(target,'Contents/Info.plist')]);
fs.rmSync(path.join(lab,'host-ui-quit.json'),{force:true});const env={...process.env,DSH_HOST_PET_LAB:lab};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(target,'Contents/MacOS/Electron'),[path.join(root,'experiments/dsh-pet-host/host-ui.cjs')],{cwd:root,env,stdio:'ignore'});console.log(JSON.stringify({pid:child.pid,bundleId:'local.dsh.pet-host.ui',officialHostClient:true}));
child.on('exit',code=>process.exit(code||0));
