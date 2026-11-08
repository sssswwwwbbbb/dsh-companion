import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {root,lab,stage,report} from './setup.mjs';

const sha=data=>createHash('sha256').update(data).digest('hex');
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value)+'\n');
const core=path.join(stage,'packages/dsh-skin-core');
const plugin=path.join(stage,'packages/dsh-companion');
const schema=path.join(core,'src/schema.mjs');
let text=fs.readFileSync(schema,'utf8');
if(!text.includes('const workspaceIcons=')){
 text=text.replace('export const definitions = {',`const workspaceIcons=x=>object(x)&&Object.keys(x).length>0&&Object.keys(x).length<=64&&Object.entries(x).every(([key,pair])=>id(key)&&entryMarks(pair));
const workspaceRole=x=>object(x)&&Object.keys(x).length===5&&['poster','portrait','avatar','idle','react'].every(k=>id(x[k]));
const workspaceFields=['semanticIcons','workspacePreset','workspaceDetailsEnabled','workspaceMotionEnabled','workspaceRole'];
export const definitions = {`);
 text=text.replace('configVersions:[1,2], fields: {','configVersions:[1,2,3], fields: {');
 text=text.replace("    entryMarks:{fixed:true,valid:entryMarks},",`    semanticIcons:{fixed:true,valid:workspaceIcons},
    workspacePreset:{fixed:true,valid:x=>x==='archive-warm-r2'},
    workspaceDetailsEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    workspaceMotionEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    workspaceRole:{fixed:true,valid:workspaceRole},
    entryMarks:{fixed:true,valid:entryMarks},`);
 text=text.replace('Object.keys(input.assets).length>32','Object.keys(input.assets).length>128');
 text=text.replace("      const declares=field=>own(m.config,field)||own(m.settings,field);",`      const declares=field=>own(m.config,field)||own(m.settings,field);
      if(m.configVersion<3&&workspaceFields.some(declares))fail('SKIN_SETTING_UNSUPPORTED','theme.workspace');
      if(workspaceFields.some(declares)){
        if(m.config.workspacePreset!=='archive-warm-r2'||!m.config.semanticIcons||!declares('workspaceDetailsEnabled'))fail('SKIN_CONFIG_MISSING','theme.workspace');
        for(const pair of Object.values(m.config.semanticIcons))for(const asset of Object.values(pair))if(input.assets[asset]?.mime!=='image/png')fail('SKIN_RESOURCE_MISSING','theme.semanticIcons');
        if(m.config.workspaceRole){
          for(const key of ['poster','portrait','avatar'])if(input.assets[m.config.workspaceRole[key]]?.mime!=='image/png')fail('SKIN_RESOURCE_MISSING','theme.workspaceRole');
          for(const key of ['idle','react'])if(input.assets[m.config.workspaceRole[key]]?.mime!=='video/webm')fail('SKIN_RESOURCE_MISSING','theme.workspaceRole');
        }
      }`);
 fs.writeFileSync(schema,text);
}
const original=path.join(plugin,'skins/archive-master04-private');
const candidate=path.join(lab,'content/archive-workspace-r2-private');
fs.mkdirSync(path.dirname(candidate),{recursive:true});
if(!fs.existsSync(candidate))fs.cpSync(original,candidate,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(candidate,'skin.json')));
manifest.id='archive-workspace-r2-private';manifest.name='档案暖白 · 工作区 R2';
manifest.description='私有真实 DSH 候选：成套图标、纸面工作区、开卷与归档演出；母版04工作区角色与原生桌宠共用已审素材。';
const add=(id,source,destination,mime,width,height)=>{
 const bytes=fs.readFileSync(source),target=path.join(candidate,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
 manifest.assets[id]={path:destination,mime,sha256:sha(bytes),bytes:bytes.length,width,height,alpha:true,source:'Approved project assets; private integration',license:'Existing private-use scope; no new distribution grant'};
 return id;
};
const icons=JSON.parse(fs.readFileSync(path.join(root,'designs/dsh-skin-workspace-v2/icons-manifest.json')));
const semanticIcons={};
for(const item of icons.items){semanticIcons[item.id]={};for(const mode of ['light','dark']){
 const asset=item.png[mode],source=path.join(root,'designs/dsh-skin-workspace-v2',asset.path);
 if(sha(fs.readFileSync(source))!==asset.sha256)throw new Error('APPROVED_ICON_CHANGED');
 semanticIcons[item.id][mode]=add('i-'+item.id+'-'+mode[0],source,'assets/icons/'+mode+'/'+item.id+'.png','image/png',96,96);
}}
const art=path.join(root,'designs/dsh-skin-assets-v3/assets');
const role={};
for(const [key,source,width,height,mime] of [['poster','prepared/master-04.png',499,1024,'image/png'],['portrait','prepared/portrait.png',384,432,'image/png'],['avatar','prepared/avatar.png',256,256,'image/png'],['idle','motion/idle-breathe.webm',499,1024,'video/webm'],['react','motion/react-tilt.webm',499,1024,'video/webm']])role[key]=add('workspace-role-'+key,path.join(art,source),'assets/role/'+path.basename(source),mime,width,height);
const theme=manifest.modules.theme;theme.configVersion=3;
Object.assign(theme.config,{semanticIcons,workspacePreset:'archive-warm-r2',workspaceRole:role});
Object.assign(theme.settings,{workspaceDetailsEnabled:{label:'工作区细节',default:true},workspaceMotionEnabled:{label:'界面动效',default:true,showWhen:{field:'workspaceDetailsEnabled',equals:true}}});
write(path.join(candidate,'skin.json'),manifest);
const {loadSkin,prepareResources}=await import(pathToFileURL(path.join(core,'src/resources.mjs')));
const skin=loadSkin(candidate);prepareResources(skin);
const registry=JSON.parse(fs.readFileSync(path.join(lab,'backend-template/runtime-candidates.json')));
const previousKey=Object.keys(registry.contents).find(k=>registry.contents[k].group==='master');
const entry=registry.contents[previousKey];delete registry.contents[previousKey];registry.contents[skin.contentKey]={...entry,name:manifest.name};
registry.provenance.workspaceR2={previousKey,contentKey:skin.contentKey,themeConfigVersion:3,geometryUnchanged:true};
write(path.join(lab,'backend-template/runtime-candidates.json'),registry);write(path.join(plugin,'config/pet-backend-map.json'),registry);
const target=path.join(plugin,'skins',manifest.id);fs.rmSync(target,{recursive:true,force:true});fs.cpSync(candidate,target,{recursive:true});
// This is the new isolated copy only; the reviewed master04 package is retained in the old lab.
fs.rmSync(original,{recursive:true,force:true});
const assets=Object.values(manifest.assets);
write(path.join(report,'candidate.json'),{contentKey:skin.contentKey,previousMasterKey:previousKey,assets:assets.length,iconPairs:icons.items.length,manifestBytes:fs.statSync(path.join(candidate,'skin.json')).size,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),themeConfigVersion:3,legacyConfigVersions:[1,2],geometryChanged:false,roleSources:role,source:root+'/designs/dsh-skin-assets-v3/README.md'});
console.log(JSON.stringify({contentKey:skin.contentKey,assets:assets.length,manifestBytes:fs.statSync(path.join(candidate,'skin.json')).size}));
