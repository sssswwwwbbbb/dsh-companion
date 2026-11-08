import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';

const root=fileURLToPath(new URL('../',import.meta.url));
const artifact=process.argv[2];
if(!artifact)throw new Error('Usage: node scripts/package-skin-author-kit.mjs <主题盒子 .tgz>');

function files(directory){
  const entries={};
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){
      for(const [name,bytes] of Object.entries(files(file)))entries[entry.name+'/'+name]=bytes;
    }else if(entry.isFile()&&entry.name!=='.DS_Store'){
      entries[entry.name]=fs.readFileSync(file);
    }
  }
  return entries;
}

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-skin-author-kit-'));
try{
  execFileSync('tar',['-xf',path.resolve(artifact),'-C',temporary,'package/package.json','package/skin-core/src','package/src/skin-library.mjs','package/src/storage.mjs']);
  const pluginDir=path.join(temporary,'package');
  const plugin=JSON.parse(fs.readFileSync(path.join(pluginDir,'package.json'),'utf8'));
  if(plugin.name!=='dsh-plugin-companion')throw new Error('Expected a Theme Box package');
  const library=path.join(root,'node_modules/fflate');
  const dependency=JSON.parse(fs.readFileSync(path.join(library,'package.json'),'utf8'));
  if(dependency.version!==plugin.dependencies.fflate)throw new Error('fflate version differs from Theme Box package');

  const read=file=>fs.readFileSync(path.join(root,file));
  const sample=files(path.join(root,'packages/dsh-skin-core/examples/author-no-pet-v3'));
  const sampleZip=zipSync(sample,{level:6});
  const entries={
    'SKIN-AUTHOR-REFERENCE.md':read('docs/skin-author-reference.md'),
    'SKIN-SELF-DELIVERY.md':read('docs/skin-self-delivery.md'),
    'skin-self-delivery.md':read('docs/skin-self-delivery.md'),
    'theme-tokens.json':fs.readFileSync(path.join(pluginDir,'skin-core/src/theme-tokens.json')),
    'no-pet-v3.zip':sampleZip,
    'scripts/skin-author-check.mjs':read('scripts/skin-author-check.mjs'),
    'node_modules/fflate/package.json':fs.readFileSync(path.join(library,'package.json')),
    'node_modules/fflate/esm/index.mjs':fs.readFileSync(path.join(library,'esm/index.mjs')),
    'node_modules/fflate/LICENSE':fs.readFileSync(path.join(library,'LICENSE'))
  };
  for(const [name,bytes] of Object.entries(files(path.join(root,'docs/skin-kit-v1'))))entries['skin-kit-v1/'+name]=bytes;
  for(const [name,bytes] of Object.entries(sample))entries['sample/'+name]=bytes;
  for(const [name,bytes] of Object.entries(files(pluginDir)))entries['packages/dsh-companion/'+name]=bytes;
  const dist=path.join(root,'dist');
  fs.mkdirSync(dist,{recursive:true});
  const name='dsh-skin-author-kit-'+plugin.version+'.zip';
  fs.writeFileSync(path.join(dist,'dsh-no-pet-v3.zip'),sampleZip);
  fs.writeFileSync(path.join(dist,name),zipSync(entries,{level:6}));
  console.log(path.join(dist,name));
}finally{
  fs.rmSync(temporary,{recursive:true,force:true});
}
