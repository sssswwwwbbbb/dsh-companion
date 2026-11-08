// Apply the reviewed Cold Start delta after restoring the private dev.27 inputs.
// Source media stay in the private project; the author kit uses geometric samples.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSkin,prepareResources,digest} from '../packages/dsh-skin-core/src/resources.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'.local/accepted-inputs/skins/archive-workspace-r2-private');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'designs/dsh-skin-assets-v3/cold-start-0.7.1.json')));
const existing=loadSkin(source);prepareResources(existing);
const expected='20b4d4a3dc84ec5aa27fd61c0287cbf0d6c6a01e5b0811169e7f70c49fa30b53';
if(!['3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16',expected].includes(existing.contentKey))throw new Error('COLD_START_INPUT_ALREADY_UPGRADED_OR_CHANGED');
const icons=manifest.modules.theme.config.semanticIcons,alternates=new Map();
for(const [name,pair]of Object.entries(icons))for(const mode of ['light','dark'])alternates.set(pair[mode],path.join(root,'designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/png',mode,name+'.png'));
alternates.set(manifest.modules.startup.config.video,path.join(root,'designs/dsh-skin-assets-v3/review/cold-start-voice-integration-2026-11-06/entrance-cs07.mp4'));
const writes=[];
for(const [id,asset]of Object.entries(manifest.assets)){
 const file=path.join(source,asset.path);let bytes=fs.existsSync(file)?fs.readFileSync(file):null;
 if(!bytes||digest(bytes)!==asset.sha256){
  const replacement=alternates.get(id);if(!replacement)throw new Error('MISSING_ACCEPTED_BASE_ASSET: '+id);
  bytes=fs.readFileSync(replacement);
 }
 if(bytes.length!==asset.bytes||digest(bytes)!==asset.sha256)throw new Error('UPGRADE_ASSET_MISMATCH: '+id);
 writes.push([file,bytes]);
}
if(digest(JSON.stringify(manifest))!==expected)throw new Error('UPGRADE_MANIFEST_CHANGED');
for(const [file,bytes]of writes){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
fs.writeFileSync(path.join(source,'skin.json'),JSON.stringify(manifest));
const verified=loadSkin(source);prepareResources(verified);
console.log(JSON.stringify({version:verified.manifest.version,contentKey:verified.contentKey,assets:Object.keys(verified.manifest.assets).length}));
