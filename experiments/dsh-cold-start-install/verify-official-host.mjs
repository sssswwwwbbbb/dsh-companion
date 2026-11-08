// Use the installed DSH executable in Node mode. All writes are in a new test profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const artifact=path.resolve(process.argv[2]);
const version=path.basename(artifact).match(/^dsh-plugin-companion-(0\.1\.0-dev\.(22|23|24|25|26|27))\.tgz$/);
assert.ok(version,'Expected a local installation candidate package');
const expectedKeys=[
 '3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16',
 '4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b',
].sort();
const report=path.resolve(process.argv[3]);
const home=fs.mkdtempSync(path.join(root,'.local/dev'+version[2]+'-official-host-'));
const profileName=Number(version[2])>=26?'desktop':'package-check';
const profileDir=path.join(home,'profiles',profileName);
const sdk='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const official=name=>pathToFileURL(sdk+'/node_modules/@deepseek-ai/'+name).href;
const anchor=sdk+'/node_modules/@deepseek-ai/dsh/package.json';
const hostVersion=JSON.parse(fs.readFileSync(anchor)).version;
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
process.env.DSH_HOME=home;
process.env.DSH_TELEMETRY_DISABLED='1';
const stdout=process.stdout.write.bind(process.stdout);
process.stdout.write=(chunk,...args)=>stdout(String(chunk).replace(/([?&#]token=)[^\s&"']+/g,'$1[redacted]'),...args);
const result={artifact,sha256:sha(artifact),scope:'official manager local tgz install and package load in new Mac profile',home,profileDir};
let application;
try{
 const {loadProfileDirectory,loadLayeredEnv,initProfile,PROFILE_TEMPLATES}=await import(official('dsh-app-boot/lib/index.js'));
 const {runProfile}=await import(official('dsh/lib/profile-boot.js'));
 initProfile(profileDir,PROFILE_TEMPLATES?.web?.bundles ?? ['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']);
 const profile=loadProfileDirectory('dsh',profileDir,anchor);
 application=await runProfile({
  environment:loadLayeredEnv('dsh'),profile:profileName,resolvedProfile:{profile,installAnchor:anchor},
  patchFiles:[],args:['--no-open','--host','127.0.0.1','--port','0'],
  packageManager:{command:process.execPath,
   args:['--expose-internals','/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],
   env:{ELECTRON_RUN_AS_NODE:'1',DSH_DESKTOP_NODE_EXECUTABLE:process.execPath,npm_config_offline:'true'}},
 });
 const ctx=application.ctx;
 const install=await ctx.get('pluginManager').installBundle(artifact,{enabled:true});
 result.install={application:install.application,error:install.error||null};
 assert.ok(install.application==='applied'&&!install.error,'Official plugin manager did not apply local package');
 const service=ctx.get('dshCompanion');
 assert.ok(service,'Installed package did not register its official service');
 const status=await service.status();
 assert.equal(status.version,version[1]);
 assert.equal(status.compatibility.dshVersion,hostVersion);
 assert.equal(status.license.state,'unactivated');
 assert.equal(status.running,false);
 assert.equal(status.skin.selected,null);
 assert.deepEqual(status.skin.catalog.map(row=>row.contentKey).sort(),expectedKeys);
 const installed=fs.realpathSync(path.join(profileDir,'node_modules/dsh-plugin-companion'));
 const executable=await service.controller.executable();
 const packageVersion=JSON.parse(fs.readFileSync(path.join(installed,'package.json'))).version;
 assert.equal(packageVersion,status.version);
 result.status={version:status.version,dshVersion:status.compatibility.dshVersion,
  activation:status.license.state,catalog:status.skin.catalog,selected:status.skin.selected,engineStarted:status.running};
 result.installed=installed;
 result.executable=executable;
 result.passed=true;
}catch(error){
 result.passed=false;result.error=error.message;process.exitCode=1;
}finally{
 await application?.ctx.fiber.dispose();
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:result.passed,error:result.error,sha256:result.sha256,report}));
}
