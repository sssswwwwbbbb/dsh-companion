import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSkin,prepareResources,resolveSettings,validateManifest} from '../../../packages/dsh-skin-core/src/index.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const skin=loadSkin(path.resolve(here,'../content/archive-warm-whale'));
const checks=[];
function check(name,condition,details){checks.push({name,passed:!!condition,...(details?{details}:{})});if(!condition)throw new Error(name);}
try{
  const assets=prepareResources(skin);
  check('manifest and every asset loaded by foundation',Object.keys(assets).length===1);
  const defaults=resolveSettings(skin.manifest,{overrides:{},disabled:{}},{theme:true,pet:true});
  check('every declared public setting has a legal default',defaults.theme.controls.length===1&&defaults.pet.controls.length===1&&defaults.pet.controls[0].value===100);
  check('unsupported prototype interactions absent',!('startup' in skin.manifest.modules)&&!('feedback' in skin.manifest.modules)&&!JSON.stringify(skin.manifest).includes('scan.mp4'));
  const unavailable=resolveSettings(skin.manifest,{},{theme:true,pet:false});
  check('optional device unavailable does not suppress theme',unavailable.pet.status==='unavailable'&&unavailable.theme.status==='enabled');
  const disabled=resolveSettings(skin.manifest,{disabled:{pet:true}},{theme:true,pet:true});
  check('user disabled is distinct and retains controls',disabled.pet.status==='disabled'&&disabled.pet.reason==='USER_DISABLED'&&disabled.pet.controls.length===1);
  const overridden=resolveSettings(skin.manifest,{overrides:{[skin.manifest.id]:{theme:{backgroundOpacity:0},pet:{size:120}}}},{theme:true,pet:true});
  check('zero background override and custom size retained',overridden.theme.values.backgroundOpacity===0&&overridden.pet.values.size===120&&overridden.pet.controls[0].overridden);
  const invalid=structuredClone(skin.manifest);delete invalid.modules.pet.settings.size.default;
  let code;try{validateManifest(invalid);}catch(e){code=e.code;}
  check('missing visible default rejected',code==='SKIN_DEFAULT_INVALID');
  const bad=structuredClone(skin.manifest);bad.assets['archive-grid'].path='../escape.png';
  code=null;try{validateManifest(bad);}catch(e){code=e.code;}
  check('out-of-package resource rejected',code==='SKIN_ASSET_INVALID');
  check('package contains only data and image',fs.readdirSync(skin.root).every(x=>['skin.json','README.md','assets'].includes(x)));
  fs.writeFileSync(path.join(root,'reports/first-skin/content-validation.json'),JSON.stringify({date:'2026-11-03',scope:'foundation loader/schema/resource/settings only; no DSH host',contentKey:skin.contentKey,tokenCount:Object.keys(skin.manifest.modules.theme.config.tokens).length,assetBytes:Object.values(assets).reduce((n,a)=>n+a.bytes,0),checks,passed:true,hostIntegration:false,realClientAcceptance:false},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:checks.length,contentKey:skin.contentKey}));
}catch(error){console.error(error);process.exitCode=1;}
