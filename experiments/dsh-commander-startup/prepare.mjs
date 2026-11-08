import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {root,accepted,acceptedReport,lab,stage,report,acceptedKey,comparisonKey} from './setup.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const sha=data=>createHash('sha256').update(data).digest('hex');
const primary=path.join(acceptedReport,'primary-review/review.json');
const review=read(primary);
if(review.themePetNodeAccepted!==true||review.contentKeyReviewed!==acceptedKey)throw new Error('STARTUP_BASELINE_NOT_ACCEPTED');
const media=read(path.join(report,'media.json'));
for(const dir of [lab,report])fs.mkdirSync(dir,{recursive:true,mode:0o700});
const copy=(from,to)=>fs.cpSync(from,to,{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
if(!fs.existsSync(stage)){
 for(const name of ['staging','backend-template','dsh-pet','DshHostPetBackend.app','backend-entry.cjs','atomic-snapshot.cjs'])copy(path.join(accepted,name),path.join(lab,name));
 execFileSync('/usr/bin/patch',['-p1','-i',fileURLToPath(new URL('native-handoff.patch',import.meta.url))],{cwd:stage,stdio:'pipe'});
}else if(!process.argv.includes('--staged'))throw new Error('STARTUP_STAGE_EXISTS');
const plugin=path.join(stage,'packages/dsh-companion'),content=path.join(plugin,'skins/archive-workspace-r2-private');
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(stage,'packages/dsh-skin-core/src/resources.mjs')));
const before=loadSkin(content);
if(before.contentKey!==acceptedKey)throw new Error('STARTUP_BASELINE_CONTENT_CHANGED');
const manifest=structuredClone(before.manifest);
Object.assign(manifest,{version:'0.2.0',description:'机械姬与指挥官的工作区、桌宠及静音登场开场。'});
function add(id,filename,mime,metadata){
 const bytes=fs.readFileSync(path.join(lab,'media',filename));
 if(sha(bytes)!==metadata.sha256||bytes.length!==metadata.bytes)throw new Error('STARTUP_MEDIA_CHANGED');
 const target='assets/startup/'+filename;
 fs.mkdirSync(path.dirname(path.join(content,target)),{recursive:true});
 fs.writeFileSync(path.join(content,target),bytes);
 manifest.assets[id]={path:target,mime,sha256:metadata.sha256,bytes:metadata.bytes,width:media.size[0],height:media.size[1],alpha:false,source:'Derived from the supplied entrance film.',license:'Private project use only.'};
}
add('entrance-still','entrance-still.png','image/png',media.poster);
add('entrance-film','entrance.webm','video/webm',media.video);
manifest.modules.startup={interfaceVersion:1,configVersion:2,required:false,
 config:{poster:'entrance-still',video:'entrance-film',seconds:media.seconds,handoffSeconds:media.handoffSeconds,stillSeconds:media.stillSeconds,greeting:'机械姬已就位',subtitle:'工作区已就绪。'},
 settings:{reducedMotion:{label:'减少开场动态',default:false}}};
const manifestText=JSON.stringify(manifest)+'\n';
fs.writeFileSync(path.join(content,'skin.json'),manifestText);
const skin=loadSkin(content),assets=prepareResources(skin);
if(loadSkin(path.join(plugin,'skins/archive-warm-whale')).contentKey!==comparisonKey)throw new Error('OLD_COMPARISON_CHANGED');
const baseRegistry=read(path.join(accepted,'backend-template/runtime-candidates.json'));
const registry=structuredClone(baseRegistry);
registry.contents[skin.contentKey]=registry.contents[acceptedKey];
delete registry.contents[acceptedKey];
registry.provenance.startup={baseline:acceptedKey,skin:skin.contentKey,video:media.video.sha256,privateVisualOnly:true};
write(path.join(lab,'backend-template/runtime-candidates.json'),registry);
write(path.join(plugin,'config/pet-backend-map.json'),registry);
write(path.join(report,'candidate.json'),{baseline:acceptedKey,baselinePrimaryReviewSha256:sha(fs.readFileSync(primary)),skinId:manifest.id,version:manifest.version,contentKey:skin.contentKey,
 manifestBytes:Buffer.byteLength(manifestText),assets:Object.keys(assets).length,modules:Object.keys(manifest.modules),
 unchangedTheme:JSON.stringify(manifest.modules.theme)===JSON.stringify(before.manifest.modules.theme),
 unchangedPet:JSON.stringify(manifest.modules.pet)===JSON.stringify(before.manifest.modules.pet),
 unchangedBaselineAssets:Object.entries(before.manifest.assets).every(([k,v])=>JSON.stringify(manifest.assets[k])===JSON.stringify(v)),
 oldComparison:comparisonKey,automaticDefaults:{autoStart:false,startupEnabled:false},audioStreams:0,presentation:review.presentationShaReviewed});
console.log(JSON.stringify({contentKey:skin.contentKey,assets:Object.keys(assets).length,manifestBytes:Buffer.byteLength(manifestText)}));
