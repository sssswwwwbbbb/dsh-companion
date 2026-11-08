import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),lab=path.join(root,'.local/pet-engine-comparison-20261104'),source=path.join(root,'experiments/pet-engine-comparison'),out=path.join(lab,'web');fs.mkdirSync(out,{recursive:true});
const upstream=path.join(lab,'upstreams/dsh-pet'),pkg=path.join(lab,'env/node_modules/dsh-pet'),lock=JSON.parse(fs.readFileSync(path.join(source,'upstream-lock.json')));
if(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==lock.dshPet.commit)throw new Error('UPSTREAM_COMMIT_MISMATCH');
if(JSON.parse(fs.readFileSync(path.join(pkg,'package.json'))).version!==lock.dshPet.version)throw new Error('UPSTREAM_PACKAGE_MISMATCH');
const {readJsonc}=await import(pathToFileURL(path.join(upstream,'dsh-pet/src/host/config/jsonc.ts'))),config=readJsonc(path.join(pkg,'assets/config.jsonc'));if(!config)throw new Error('DEFAULT_CONFIG_MISSING');
Object.assign(config,{notificationsEnabled:false,clickSoundEnabled:false,voiceEnabled:false,trayEnabled:false,font:{family:'system',size:21,followPet:true},animationWeights:{idle:100,turn:0,move:0}});
config.pets=[{...config.pets[0],id:'main',name:'机制测试 · 暖白鲸',size:420,maxBodyWidthPct:100,display:'web',balanceEnabled:false,whisperEnabled:false,workStatusEnabled:true,fixedEnabled:false,position:{corner:'bottom-left',marginX:126,marginY:180}}];
config.animations={idle:['idle'],turn:['react'],drag:['react'],clicks:['react'],moves:{default:{minDist:280,maxDist:280,margin:18,leadSec:.2,tailSec:.2},actions:[{name:'walk'},{name:'run',params:{minDist:400,maxDist:400}}]},categories:[{id:'scene',weight:0,actions:['sit-start','sit-loop','sit-end']}],events:{balance:['react'],whisper:['react'],workStatus:['react','react','idle','react','react','react']},sleep:[{start:['sit-start'],loop:['sit-loop'],end:['sit-end']}]};
// Extension adds look to the explicit upstream action menu at runtime.
const home=path.join(lab,'dsh-home/dsh-pet'),videos=path.join(home,'main-animation/webm');fs.mkdirSync(videos,{recursive:true});
fs.writeFileSync(path.join(home,'main-config.jsonc'),JSON.stringify(config,null,2)+'\n');
for(const name of fs.readdirSync(path.join(lab,'assets')).filter(x=>x.endsWith('.webm')))fs.copyFileSync(path.join(lab,'assets',name),path.join(videos,name));
const nativeHome=path.join(lab,'native-home/dsh-pet'),nativeConfig=structuredClone(config);nativeConfig.pets[0].display='desktop';nativeConfig.pets[0].position={corner:'bottom-right',marginX:70,marginY:70};fs.mkdirSync(path.join(nativeHome,'main-animation/webm'),{recursive:true});fs.writeFileSync(path.join(nativeHome,'main-config.jsonc'),JSON.stringify(nativeConfig,null,2)+'\n');for(const name of fs.readdirSync(path.join(lab,'assets')).filter(x=>x.endsWith('.webm')))fs.copyFileSync(path.join(lab,'assets',name),path.join(nativeHome,'main-animation/webm',name));
for(const name of ['book.svg','cup.svg','index.html','scene.css'])fs.copyFileSync(path.join(source,name),path.join(out,name));
fs.copyFileSync(path.join(lab,'assets/manifest.json'),path.join(out,'manifest.json'));
fs.copyFileSync(path.join(lab,'upstreams/phaser/package/dist/phaser.min.js'),path.join(out,'phaser.min.js'));
const {build}=await import(pathToFileURL(path.join(lab,'env/node_modules/esbuild/lib/main.js')));
for(const engine of ['dsh','phaser']){
 const result=await build({entryPoints:[path.join(source,engine+'-engine.mjs')],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false,outfile:path.join(out,engine+'-engine.js'),metafile:true,nodePaths:[path.join(lab,'env/node_modules')],define:{'process.env.NODE_ENV':'"production"'}});
 fs.writeFileSync(path.join(lab,engine+'-metafile.json'),JSON.stringify(result.metafile,null,2));
}
fs.copyFileSync(path.join(source,'ui.mjs'),path.join(out,'ui.mjs'));
console.log(JSON.stringify({result:'built',web:out,dshVersion:lock.dshPet.version,phaserVersion:lock.phaser.version,rootDependenciesChanged:false}));
