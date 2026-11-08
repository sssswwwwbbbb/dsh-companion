import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lab,stage,report} from './setup.mjs';

for(const script of ['build-client.mjs','build-mac.mjs'])execFileSync(process.execPath,[path.join(stage,'scripts',script)],{cwd:stage,stdio:'pipe'});
const backend=path.join(lab,'DshHostPetBackend.app');
execFileSync('/usr/libexec/PlistBuddy',['-c','Set :CFBundleIdentifier local.dsh.commander.startup.voiceb.backend',path.join(backend,'Contents/Info.plist')]);
execFileSync('/usr/bin/codesign',['--force','--sign','-','--timestamp=none',backend],{stdio:'pipe'});
const dir=path.join(stage,'packages/dsh-companion'),app=path.join(dir,'runtime/darwin-arm64/DSHCompanion.app');
for(const file of [app,backend])execFileSync('/usr/bin/codesign',['--verify',file],{stdio:'pipe'});
const files=['client.js','runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/main.mjs','runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/startup.mjs','runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/startup.css','runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/startup-skin.mjs'];
fs.writeFileSync(path.join(report,'build.json'),JSON.stringify({built:true,platform:process.platform+'-'+process.arch,pluginVersion:JSON.parse(fs.readFileSync(path.join(dir,'package.json'))).version,
 files:files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')})),stageOnly:true},null,2)+'\n');
console.log('Built the isolated B voice candidate.');
