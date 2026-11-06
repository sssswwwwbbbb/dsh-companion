import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadSkin,prepareResources,resolveSettings} from '../src/index.mjs';
const roots=process.argv.slice(2);if(!roots.length)roots.push(fileURLToPath(new URL('../examples/a/',import.meta.url)),fileURLToPath(new URL('../examples/b/',import.meta.url)));
for(const root of roots){const skin=loadSkin(root);prepareResources(skin);const config=resolveSettings(skin.manifest,{overrides:{},disabled:{}},{theme:true,pet:true});console.log(JSON.stringify({id:skin.manifest.id,contentKey:skin.contentKey,modules:Object.keys(config),assets:Object.keys(skin.manifest.assets).length,valid:true}));}
