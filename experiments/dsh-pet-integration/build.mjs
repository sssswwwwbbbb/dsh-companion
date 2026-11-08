import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),lab=path.join(root,'.local/dsh-pet-integration-20261104'),source=path.join(root,'experiments/dsh-pet-integration'),out=path.join(lab,'web');fs.mkdirSync(out,{recursive:true});
const dependencies=path.join(root,'.local/pet-engine-comparison-20261104/env/node_modules'),{build}=await import(pathToFileURL(path.join(dependencies,'esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(source,'console.mjs')],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:path.join(out,'console.js'),metafile:true,nodePaths:[dependencies]});
for(const name of ['index.html','style.css','book.svg','cup.svg'])fs.copyFileSync(path.join(source,name),path.join(out,name));
fs.copyFileSync(path.join(source,'scene-adapter.js'),path.join(lab,'package/runtime/electron-helper/scene-adapter.js'));
fs.writeFileSync(path.join(lab,'console-metafile.json'),JSON.stringify(result.metafile,null,2));console.log(JSON.stringify({built:true,desktopConsoleOnly:true}));
