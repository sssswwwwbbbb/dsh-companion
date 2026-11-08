import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {root,accepted,acceptedReport,lab,stage,report,acceptedKey,comparisonKey} from './setup.mjs';

const read=file=>JSON.parse(fs.readFileSync(file));
const sha=data=>createHash('sha256').update(data).digest('hex');
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const primary=path.join(acceptedReport,'primary-review/review.json');
const review=read(primary);
if(review.decision!=='accepted-local-isolated-native-silent-opening-and-handoff'||review.contentKey!==acceptedKey)throw new Error('VOICE_BASELINE_NOT_ACCEPTED');
const frozen=read(path.join(acceptedReport,'review-index.json'));
for(const group of Object.values(frozen)){
 for(const entry of group.files){
  const data=fs.readFileSync(path.join(root,entry.path));
  if(data.length!==entry.bytes||sha(data)!==entry.sha256)throw new Error('VOICE_BASELINE_CHANGED: '+entry.path);
 }
}
if(!fs.existsSync(stage)){
 for(const name of ['staging','backend-template','dsh-pet','DshHostPetBackend.app','backend-entry.cjs','atomic-snapshot.cjs']){
  fs.cpSync(path.join(accepted,name),path.join(lab,name),{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
 }
 execFileSync('/usr/bin/patch',['-s','-p1','-i',fileURLToPath(new URL('opening-voice.patch',import.meta.url))],{cwd:stage});
}else if(!process.argv.includes('--staged'))throw new Error('VOICE_STAGE_EXISTS');

const media=read(path.join(report,'media.json'));
const source=path.join(root,media.file),sourceBytes=fs.readFileSync(source);
if(sha(sourceBytes)!==media.sourceSha256||sourceBytes.length!==media.bytes||!media.fullDecode)throw new Error('VOICE_SOURCE_CHANGED');
const plugin=path.join(stage,'packages/dsh-companion');
const skinDir=path.join(plugin,'skins/archive-workspace-r2-private');
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(stage,'packages/dsh-skin-core/src/resources.mjs')));
const baseline=loadSkin(skinDir);
if(baseline.contentKey!==acceptedKey)throw new Error('VOICE_BASELINE_CONTENT_CHANGED');
const manifest=structuredClone(baseline.manifest);
manifest.version='0.3.0';
manifest.description='机械姬与指挥官的工作区、桌宠及 B 声线开场。';
const startup=manifest.modules.startup,videoId=startup.config.video;
startup.configVersion=3;
startup.config.seconds=media.durationSeconds;
startup.config.handoffSeconds=Number((media.durationSeconds-media.handoffAtSeconds).toFixed(3));
startup.settings.soundEnabled={label:'开场声音',default:false};
const oldAsset=manifest.assets[videoId];
const assetPath='assets/startup/entrance-voice-b.mp4';
manifest.assets[videoId]={...oldAsset,path:assetPath,mime:'video/mp4',sha256:media.sourceSha256,bytes:media.bytes,source:'B 声线开场源片，原字节复制'};
fs.copyFileSync(source,path.join(skinDir,assetPath));
fs.writeFileSync(path.join(skinDir,'skin.json'),JSON.stringify(manifest)+'\n');
const skin=loadSkin(skinDir),assets=prepareResources(skin);
if(loadSkin(path.join(plugin,'skins/archive-warm-whale')).contentKey!==comparisonKey)throw new Error('COMPARISON_CHANGED');
fs.unlinkSync(path.join(skinDir,oldAsset.path));

const registry=read(path.join(accepted,'backend-template/runtime-candidates.json'));
registry.contents[skin.contentKey]=registry.contents[acceptedKey];
delete registry.contents[acceptedKey];
registry.provenance.voiceB={baseline:acceptedKey,skin:skin.contentKey,video:media.sourceSha256,private:true};
write(path.join(lab,'backend-template/runtime-candidates.json'),registry);
write(path.join(plugin,'config/pet-backend-map.json'),registry);
write(path.join(report,'candidate.json'),{
 baseline:acceptedKey,baselinePrimaryReviewSha256:sha(fs.readFileSync(primary)),
 skinId:manifest.id,version:manifest.version,contentKey:skin.contentKey,assets:Object.keys(assets).length,
 presentation:read(path.join(acceptedReport,'candidate.json')).presentation,
 soundDefault:false,handoffAtSeconds:media.handoffAtSeconds,durationSeconds:media.durationSeconds,
 unchangedTheme:JSON.stringify(manifest.modules.theme)===JSON.stringify(baseline.manifest.modules.theme),
 unchangedPet:JSON.stringify(manifest.modules.pet)===JSON.stringify(baseline.manifest.modules.pet),
 originalMp4:sha(assets[videoId].data)===media.sourceSha256,
});
console.log(JSON.stringify({contentKey:skin.contentKey,assets:Object.keys(assets).length,originalMp4:true}));
