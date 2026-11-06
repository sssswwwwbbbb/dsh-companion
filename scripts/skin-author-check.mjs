import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {SkinLibrary} from '../packages/dsh-companion/src/skin-library.mjs';
import {loadSkin,prepareResources,resolveSettings,fail} from '../packages/dsh-companion/skin-core/src/index.mjs';
import {supportsSkinHost} from '../packages/dsh-companion/skin-core/src/host-compatibility.mjs';
import plugin from '../packages/dsh-companion/package.json' with {type:'json'};

const usage='node scripts/skin-author-check.mjs <目录或皮肤 ZIP> --dsh-version 0.2.2-rc.1 --platform darwin-arm64|win32-x64';
let temporary;
try{
  const {values,positionals}=parseArgs({allowPositionals:true,options:{'dsh-version':{type:'string'},platform:{type:'string'},help:{type:'boolean'}}});
  if(values.help){
    console.log(usage);
  }else{
    const version=values['dsh-version'],platform=values.platform;
    if(positionals.length!==1||!version||!['darwin-arm64','win32-x64'].includes(platform))fail('SKIN_CHECK_USAGE',usage);
    if(!plugin.engines.dsh.split('||').map(value=>value.trim()).includes(version))fail('PLUGIN_HOST_UNSUPPORTED',version);
    const input=path.resolve(positionals[0]);
    let skin;
    if(fs.statSync(input).isDirectory()){
      skin=loadSkin(input);
      prepareResources(skin);
    }else{
      temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-author-check-'));
      skin=new SkinLibrary(temporary).install(input).skin;
    }
    if(!supportsSkinHost(skin.manifest,skin.contentKey,version))fail('SKIN_HOST_UNSUPPORTED',version);
    const modules=resolveSettings(skin.manifest,{overrides:{},disabled:{}},{theme:true,startup:true,pet:true});
    console.log(JSON.stringify({valid:true,plugin:plugin.version,dshVersion:version,platform,id:skin.manifest.id,version:skin.manifest.version,
      contentKey:skin.contentKey,assets:Object.keys(skin.manifest.assets).length,
      modules:Object.fromEntries(Object.entries(modules).map(([name,module])=>[name,{status:module.status,reason:module.reason||null}]))},null,2));
  }
}catch(error){
  console.error(JSON.stringify({valid:false,code:error.code||'SKIN_CHECK_FAILED',message:error.message},null,2));
  process.exitCode=1;
}finally{
  if(temporary)fs.rmSync(temporary,{recursive:true,force:true});
}
