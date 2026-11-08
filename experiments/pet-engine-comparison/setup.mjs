import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),source=path.join(root,'experiments/pet-engine-comparison'),lab=path.join(root,'.local/pet-engine-comparison-20261104'),upstream=path.join(lab,'upstreams'),lock=JSON.parse(fs.readFileSync(path.join(source,'upstream-lock.json')));
fs.mkdirSync(upstream,{recursive:true});const run=(exe,args,cwd=root)=>execFileSync(exe,args,{cwd,stdio:'inherit'});
const repo=path.join(upstream,'dsh-pet');
if(!fs.existsSync(repo)){run('git',['clone','--filter=blob:none','--no-checkout',lock.dshPet.repository+'.git',repo]);run('git',['-C',repo,'sparse-checkout','set','dsh-pet/src','dsh-pet/runtime','dsh-pet/scripts','tools']);}
run('git',['-C',repo,'fetch','--depth=1','origin',lock.dshPet.commit]);run('git',['-C',repo,'checkout','--detach',lock.dshPet.commit]);
const env=path.join(lab,'env');fs.mkdirSync(env,{recursive:true});const dependencyLock=JSON.parse(fs.readFileSync(path.join(source,'dependency-lock.json')));
fs.writeFileSync(path.join(env,'package.json'),JSON.stringify({dependencies:dependencyLock.packages[''].dependencies},null,2));fs.copyFileSync(path.join(source,'dependency-lock.json'),path.join(env,'package-lock.json'));
if(!fs.existsSync(path.join(env,'node_modules/dsh-pet/lib/standalone.js')))run('npm',['ci','--prefix',env,'--ignore-scripts','--legacy-peer-deps','--no-audit','--no-fund']);
const tgz=path.join(upstream,'phaser-4.2.1.tgz');if(!fs.existsSync(tgz)){const response=await fetch('https://registry.npmjs.org/phaser/-/phaser-4.2.1.tgz');if(!response.ok)throw new Error('PHASER_DOWNLOAD_FAILED');fs.writeFileSync(tgz,Buffer.from(await response.arrayBuffer()));}
if('sha512-'+createHash('sha512').update(fs.readFileSync(tgz)).digest('base64')!==lock.phaser.npmIntegrity)throw new Error('PHASER_INTEGRITY_MISMATCH');
const phaser=path.join(upstream,'phaser');fs.mkdirSync(phaser,{recursive:true});if(!fs.existsSync(path.join(phaser,'package/dist/phaser.min.js')))run('tar',['-xzf',tgz,'-C',phaser]);
const venv=path.join(lab,'media-venv');if(!fs.existsSync(path.join(venv,'bin/python'))){run('python3',['-m','venv',venv]);run(path.join(venv,'bin/pip'),['install','--disable-pip-version-check','Pillow==11.3.0','imageio-ffmpeg==0.6.0']);}
if(!fs.existsSync(path.join(lab,'assets/manifest.json')))run(path.join(venv,'bin/python'),[path.join(source,'prepare_assets.py')]);
run(process.execPath,[path.join(source,'build.mjs')]);run('python3',[path.join(source,'prepare_apps.py')]);
console.log('Ready. Start node experiments/pet-engine-comparison/run.mjs, then the two private apps with renderer.cjs --engine=dsh|phaser.');
