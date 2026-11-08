import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import {root,lab,stage,report} from './setup.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex'),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const core=path.join(stage,'packages/dsh-skin-core'),plugin=path.join(stage,'packages/dsh-companion');
const schema=path.join(core,'src/schema.mjs');let text=fs.readFileSync(schema,'utf8');
text=text.replace("valid:x=>x==='archive-warm-r2'","valid:x=>['archive-warm-r2','commander-v1'].includes(x)").replace("m.config.workspacePreset!=='archive-warm-r2'","!['archive-warm-r2','commander-v1'].includes(m.config.workspacePreset)");fs.writeFileSync(schema,text);
const base=path.join(plugin,'skins/archive-workspace-r2-private'),content=path.join(lab,'content/commander-workspace-private');fs.mkdirSync(path.dirname(content),{recursive:true});if(!fs.existsSync(content))fs.cpSync(base,content,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(content,'skin.json')));
Object.assign(manifest,{id:'commander-workspace-private',name:'机械姬 × 指挥官',version:'0.1.0',description:'机械姬待命、执行、汇报与请求决策；真实DSH主题与桌面陪伴私有接入。当前只声明工作区与桌宠，新过场与声音待素材，不自动播放旧片。'});
delete manifest.modules.startup;
manifest.modules.pet.settings.persona.default='你是与指挥官协作的机械姬，只回应本套桌宠的专属互动。称用户为指挥官，简短、冷静地待命、回应与汇报，不接管其他DSH Agent的身份或任务。';
const theme=manifest.modules.theme;theme.config.workspacePreset='commander-v1';delete theme.config.background;delete theme.settings.backgroundOpacity;
const css=fs.readFileSync(path.join(root,'designs/dsh-skin-commander-v1/tokens.css'),'utf8');
const parse=s=>Object.fromEntries([...s.matchAll(/--([\w-]+):([^;]+);/g)].map(m=>{const value=m[2].trim();return [m[1],/^#[a-f0-9]{3}$/i.test(value)?'#'+[...value.slice(1)].map(x=>x+x).join(''):value];}));
const colors={dark:parse(css.split('[data-theme="light"]')[0]),light:parse(css.split('[data-theme="light"]')[1])};
const mapping={
 '--dsw-alias-bg-base':'paper','--dsw-alias-bg-document-preview':'surface','--dsw-alias-bg-document-selection':'accent-soft',
 '--dsw-alias-bg-layer-1':'surface','--dsw-alias-bg-layer-2':'paper','--dsw-alias-bg-layer-3':'surface-raised','--dsw-alias-bg-overlay':'surface-raised','--dsw-alias-bg-multi-select':'accent-soft','--dsw-alias-bg-skeleton':'surface-soft',
 '--dsw-alias-border-l1':'surface-soft','--dsw-alias-border-l2':'line','--dsw-alias-border-l3':'line-strong','--dsw-alias-border-l4':'muted',
 '--dsw-alias-label-primary':'ink','--dsw-alias-label-primary-bluish':'accent','--dsw-alias-label-primary-dimmed':'muted','--dsw-alias-label-primary-inverted':'surface','--dsw-alias-label-secondary':'muted','--dsw-alias-label-tertiary':'muted','--dsw-alias-label-caption':'muted','--dsw-alias-label-document-preview':'ink',
 '--dsw-alias-menu-group-header-fill':'surface-soft','--dsw-alias-menu-icon':'muted',
 '--dsw-alias-state-business-primary':'accent','--dsw-alias-state-business-tertiary':'accent-soft',
 '--dsw-alias-state-error-primary':'danger','--dsw-alias-state-error-secondary':'danger-soft',
 '--dsw-alias-state-success-primary':'positive','--dsw-alias-state-success-secondary':'signal-soft',
 '--dsw-alias-state-warn-primary':'attention','--dsw-alias-state-warn-label':'attention','--dsw-alias-state-warn-secondary':'attention-soft',
 '--dsw-alias-scrollbar-bg-l1':'line','--dsw-alias-scrollbar-bg-l2':'line','--dsw-alias-scrollbar-hover-l1':'line-strong','--dsw-alias-scrollbar-hover-l2':'line-strong',
 '--dsw-alias-toast-bg':'surface-raised','--dsw-alias-toast-label':'ink','--dsw-alias-tooltip-bg':'surface-raised','--dsw-alias-tooltip-label':'ink',
 '--dsw-specific-sidebar-fill':'paper','--dsw-specific-sidebar-nav-item-active':'accent-soft','--dsw-specific-sidebar-nav-item-active-accent':'accent','--dsw-specific-sidebar-nav-item-hover':'surface-soft'
};
const allowed=new Set(JSON.parse(fs.readFileSync(path.join(core,'src/theme-tokens.json'))));
theme.config.tokens=Object.fromEntries(Object.entries(mapping).filter(([name])=>allowed.has(name)).map(([name,key])=>[name,{light:colors.light[key],dark:colors.dark[key]}]));
const add=(id,source,destination,width,height,origin)=>{const bytes=fs.readFileSync(source),target=path.join(content,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);manifest.assets[id]={path:destination,mime:'image/png',sha256:sha(bytes),bytes:bytes.length,width,height,alpha:true,source:origin,license:'Private project use only.'};};
const prepared=JSON.parse(fs.readFileSync(path.join(report,'prepared-assets.json')));
for(const item of prepared.icons)add('i-'+item.id+'-'+item.mode[0],path.join(root,item.file),'assets/icons/'+item.mode+'/'+item.id+'.png',96,96,'Commander vector: '+item.id+'; '+item.mode+'.');
add('workspace-cover',path.join(root,prepared.cover.file),'assets/commander-cover.png',960,600,'Existing authored commander-cover.svg rasterized unchanged with macOS sips');
// Existing character media/geometry and the finite explicit walk remain unchanged.
fs.writeFileSync(path.join(content,'skin.json'),JSON.stringify(manifest)+'\n');
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(core,'src/resources.mjs')));const skin=loadSkin(content);prepareResources(skin);
const registry=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json'))),oldKey=Object.keys(registry.contents).find(k=>registry.contents[k].group==='master');const entry=registry.contents[oldKey];delete registry.contents[oldKey];registry.contents[skin.contentKey]={...entry,name:manifest.name};registry.provenance.commander={fromAcceptedWalk:'cf3039e001e969cd02e9d86608e73953f1c39be31ff5bd88379016acd57fe9d5',themeOnlyPresentationChanged:true,explicitFiniteWalkRetained:true,newStartupAudio:false};
write(path.join(lab,'backend-template/runtime-candidates.json'),registry);write(path.join(plugin,'config/pet-backend-map.json'),registry);fs.cpSync(content,base,{recursive:true});
const reviewPath='reports/coordination/commander-workspace-v1-primary/rereview/review.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath)));
if(!review.state.startsWith('accepted-'))throw new Error('COMMANDER_DESIGN_NOT_REVIEWED');
const retain=relative=>{const from=path.join(root,'designs/dsh-skin-commander-v1',relative),to=path.join(lab,'design-source',relative);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);return path.relative(root,to);};
const approved=review.approvedWorkspaceSourceFiles.map(item=>{const file='designs/dsh-skin-commander-v1/'+item.file,actual=sha(fs.readFileSync(path.join(root,file)));if(actual!==item.sha256)throw new Error('COMMANDER_APPROVED_SOURCE_CHANGED: '+item.file);return {path:file,sha256:actual,frozenPath:retain(item.file)};});
const readmeSha=sha(fs.readFileSync(path.join(root,'designs/dsh-skin-commander-v1/README.md')));if(readmeSha!==review.documentationFollowup.readmeSha256)throw new Error('COMMANDER_README_CHANGED');
for(const item of new Set(prepared.icons.map(x=>x.shapeSource.replace('designs/dsh-skin-commander-v1/',''))))retain(item);retain('icons-manifest.json');
fs.copyFileSync(path.join(root,reviewPath),path.join(report,'design-primary-review.json'));
write(path.join(report,'design-source-binding.json'),{status:'bound-to-primary-reviewed-corrected-workspace-design',source:'designs/dsh-skin-commander-v1',primaryReview:reviewPath,primaryReviewSha256:sha(fs.readFileSync(path.join(root,reviewPath))),retainedPrimaryReview:'design-primary-review.json',approvedWorkspaceSourceFiles:approved,readme:{path:'designs/dsh-skin-commander-v1/README.md',sha256:readmeSha,frozenPath:retain('README.md')},verification:{path:'designs/dsh-skin-commander-v1/review/verification.json',sha256:sha(fs.readFileSync(path.join(root,'designs/dsh-skin-commander-v1/review/verification.json'))),frozenPath:retain('review/verification.json')},excludedExecutableInputs:['app.js','performance.js','motion.js'],note:'Immutable design references retained privately; scripts are interaction references only, never executed by DSH. No simulated sessions, completion timers, startup/audio or global model persona copied'});
write(path.join(report,'candidate.json'),{contentKey:skin.contentKey,id:manifest.id,version:manifest.version,name:manifest.name,assets:Object.keys(manifest.assets).length,modules:Object.keys(manifest.modules),tokens:Object.keys(theme.config.tokens).length,iconPairs:56,geometryAndPetMediaChanged:false,oldStartupComparisonKey:'4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b',themeConfigVersion:theme.configVersion,sourceBinding:'design-source-binding.json'});
console.log(JSON.stringify({contentKey:skin.contentKey,modules:Object.keys(manifest.modules),assets:Object.keys(manifest.assets).length,tokens:Object.keys(theme.config.tokens).length}));
