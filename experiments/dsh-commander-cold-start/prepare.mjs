import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {root,accepted,acceptedReport,lab,stage,report,acceptedKey,comparisonKey} from './setup.mjs';

const read=file=>JSON.parse(fs.readFileSync(file));
const sha=data=>createHash('sha256').update(data).digest('hex');
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
fs.mkdirSync(report,{recursive:true});
const priorReview=path.join(acceptedReport,'primary-review/review.json');
const review=read(priorReview);
if(review.contentKey!==acceptedKey||!review.decision.startsWith('accepted-local-isolated-native-audio-playback'))throw new Error('COLD_START_BASELINE_NOT_ACCEPTED');
const priorBuild=read(path.join(acceptedReport,'build.json'));
for(const item of priorBuild.files){
 const file=path.join(accepted,'staging/packages/dsh-companion',item.file);
 if(sha(fs.readFileSync(file))!==item.sha256)throw new Error('COLD_START_BASELINE_CHANGED: '+item.file);
}
if(!fs.existsSync(stage)){
 for(const name of ['staging','backend-template','dsh-pet','DshHostPetBackend.app','backend-entry.cjs','atomic-snapshot.cjs']){
  fs.cpSync(path.join(accepted,name),path.join(lab,name),{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
 }
 execFileSync('/usr/bin/patch',['-s','-p1','-i',fileURLToPath(new URL('cold-start.patch',import.meta.url))],{cwd:stage});
 execFileSync('/usr/bin/patch',['-s','-p1','-i',fileURLToPath(new URL('walk-turn.patch',import.meta.url))],{cwd:lab});
}else if(!process.argv.includes('--staged'))throw new Error('COLD_START_STAGE_EXISTS');

const identityFile=path.join(root,'designs/dsh-skin-commander-v1/review/cold-start-identity.json');
const identity=read(identityFile);
if(identity.opening.sha256!==review.originalSourceSha256)throw new Error('COLD_START_SOUND_MISMATCH');
const plugin=path.join(stage,'packages/dsh-companion');
const skinDir=path.join(plugin,'skins/archive-workspace-r2-private');
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(stage,'packages/dsh-skin-core/src/resources.mjs')));
const baseline=loadSkin(path.join(accepted,'staging/packages/dsh-companion/skins/archive-workspace-r2-private'));
if(baseline.contentKey!==acceptedKey)throw new Error('COLD_START_BASELINE_CONTENT_CHANGED');
if(identity.skin_id_for_native_handoff!==baseline.manifest.id)throw new Error('COLD_START_ID_MISMATCH');
const manifest=structuredClone(baseline.manifest);
manifest.version='0.4.0';
manifest.name=identity.theme_name;
manifest.description=identity.character_name+' · '+identity.model+'。与指挥官协作的工作区、桌宠及 B 声线开场。';
const role=manifest.modules.theme.config.workspaceRole;
role.name=identity.character_name;
role.model=identity.model;
const startup=manifest.modules.startup;
startup.config.greeting=identity.character_name+' 已就位';
startup.config.subtitle=identity.model+' · 工作区已就绪。';
const persona=manifest.modules.pet.settings.persona;
persona.default=persona.default.replace('协作的机械姬','协作的'+identity.character_name+'（'+identity.model+'）');
const opening=manifest.assets[startup.config.video];
if(opening.sha256!==identity.opening.sha256||startup.config.seconds!==identity.opening.duration_seconds)throw new Error('COLD_START_SOUND_MISMATCH');

const coverFile=path.join(root,'designs/dsh-skin-commander-v1/assets/cold-start-cover.svg');
const cover=manifest.assets['workspace-cover'];
const coverTarget=path.join(skinDir,cover.path);
execFileSync('/usr/bin/sips',['-s','format','png',coverFile,'--out',coverTarget],{stdio:'pipe'});
const coverBytes=fs.readFileSync(coverTarget);
Object.assign(cover,{sha256:sha(coverBytes),bytes:coverBytes.length,source:'冷启动设计封面'});

const registry=read(path.join(accepted,'backend-template/runtime-candidates.json'));
const entry={...registry.contents[acceptedKey],name:identity.character_name};
const turnDir=path.join(root,'designs/dsh-skin-assets-v3/review/pet-left-stop-2026-11-05');
const turnReceiptFile=path.join(turnDir,'transition-receipt.json');
const transition=read(turnReceiptFile),turn=transition.asset;
const turnName='master-turn-front';
const turnFile=turnName+'.webm';
const turnSha='30093949d3049327d86df2f1417b21896fda2c5e2612edeead80de623e8c38c4';
const walkDir='.local/dsh-walk-native-20261105/backend-template/';
if(turn.file!=='master04-left-stop-turn-idle.webm'||turn.sha256!==turnSha||turn.bytes!==960631||
 turn.width!==1920||turn.height!==1080||turn.frames!==15||turn.fps!==24||turn.seconds!==0.625||turn.audio!==false||
 transition.ground_logical.join()!==entry.geometry.ground.join()||transition.root_delta_logical.join()!=='0,0'||
 transition.timeline.natural_walk_end_seconds!==entry.walk.seconds||
 transition.inputs[walkDir+entry.media.walk.file]!==entry.media.walk.sha256||
 transition.inputs[walkDir+entry.media.idle.file]!==entry.media.idle.sha256)throw new Error('COLD_START_TURN_RECEIPT_MISMATCH');
const turnBytes=fs.readFileSync(path.join(turnDir,turn.file));
if(sha(turnBytes)!==turnSha||turnBytes.length!==turn.bytes)throw new Error('COLD_START_TURN_HASH_MISMATCH');
// The private manifest is at its asset limit. The old unused clip remains in the comparison skin.
const replaced='archive-startup-video';
if(JSON.stringify(manifest.modules).includes('"'+replaced+'"')||Object.hasOwn(entry.requiredAssets,replaced))throw new Error('COLD_START_TURN_ASSET_IN_USE');
delete manifest.assets[replaced];
manifest.assets[turnName]={path:'assets/'+turnFile,mime:'video/webm',sha256:turnSha,bytes:turn.bytes,width:turn.width,height:turn.height,
 alpha:true,source:'Reviewed master 04 left stop, turn and idle transition',license:'Private isolated fitting only; no new redistribution rights granted.'};
fs.writeFileSync(path.join(skinDir,manifest.assets[turnName].path),turnBytes);
fs.writeFileSync(path.join(lab,'backend-template',turnFile),turnBytes);
entry.media.turnFront={file:turnFile,sha256:turnSha,seconds:turn.seconds};
entry.requiredAssets[turnName]=turnSha;

fs.writeFileSync(path.join(skinDir,'skin.json'),JSON.stringify(manifest)+'\n');
const skin=loadSkin(skinDir),assets=prepareResources(skin);
if(loadSkin(path.join(plugin,'skins/archive-warm-whale')).contentKey!==comparisonKey)throw new Error('COMPARISON_CHANGED');

registry.contents[skin.contentKey]=entry;
delete registry.contents[acceptedKey];
const turnReceiptSha256=sha(fs.readFileSync(turnReceiptFile));
registry.provenance.coldStart={baseline:acceptedKey,skin:skin.contentKey,identity:sha(fs.readFileSync(identityFile)),cover:sha(fs.readFileSync(coverFile)),turnReceiptSha256};
const {validateCandidateMap}=await import(pathToFileURL(path.join(stage,'runtime-src/candidate-map.mjs')));
validateCandidateMap(registry);
write(path.join(lab,'backend-template/runtime-candidates.json'),registry);
write(path.join(plugin,'config/pet-backend-map.json'),registry);
write(path.join(report,'candidate.json'),{
 baseline:acceptedKey,baselinePrimaryReviewSha256:sha(fs.readFileSync(priorReview)),
 skinId:manifest.id,version:manifest.version,contentKey:skin.contentKey,assets:Object.keys(assets).length,
 name:manifest.name,character:role.name,model:role.model,voiceSha256:opening.sha256,
 coverSha256:cover.sha256,walk:{finiteLeft:true,sha256:entry.media.walk.sha256,turnFront:entry.media.turnFront,turnReceiptSha256},
});
console.log(JSON.stringify({contentKey:skin.contentKey,name:manifest.name,character:role.name,model:role.model}));
