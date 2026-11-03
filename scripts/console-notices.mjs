import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url)),sections=[],manifest=[];
for(const [kind,directory] of [['管理界面','designs/dsh-companion-admin'],['授权服务','licensing']]){
  const base=path.join(root,directory),lock=JSON.parse(fs.readFileSync(path.join(base,'package-lock.json')));
  for(const [relative,entry] of Object.entries(lock.packages)){
    if(!relative||entry.dev||!fs.existsSync(path.join(base,relative,'package.json')))continue;
    const folder=path.join(base,relative),pkg=JSON.parse(fs.readFileSync(path.join(folder,'package.json')));
    const files=fs.readdirSync(folder).filter(name=>/^(?:licen[cs]e|notice|copying)(?:\.[a-z0-9_-]+)?$/i.test(name)&&fs.statSync(path.join(folder,name)).isFile());
    const repository=typeof pkg.repository==='string'?pkg.repository:pkg.repository?.url||'';
    manifest.push({kind,name:pkg.name,version:pkg.version,license:pkg.license||entry.license||'See included license',repository});
    sections.push([`${kind}: ${pkg.name}@${pkg.version}`,`License: ${pkg.license||entry.license||'See included license'}`,`Source: ${repository}`, ...files.map(name=>`\n${name}\n${fs.readFileSync(path.join(folder,name),'utf8')}`)].join('\n'));
  }
}
const directory=path.join(root,'designs/dsh-companion-admin/public');fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'THIRD_PARTY_NOTICES.txt'),'DSH 陪伴分发管理使用的开源组件\n\n'+sections.join('\n\n'+'='.repeat(70)+'\n\n')+'\n');
fs.writeFileSync(path.join(root,'reports/console-open-source.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({packages:manifest.length,noticeBytes:fs.statSync(path.join(directory,'THIRD_PARTY_NOTICES.txt')).size}));
