import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function releaseFixture(directory,version,{platform='darwin-arm64',supportedDsh=['0.2.1-rc.5'],description='Release fixture'}={}) {
  const root=fs.mkdtempSync(path.join(directory,'artifact-'));
  const manifest=path.join(root,'package');
  fs.mkdirSync(manifest);
  const [os,cpu]=platform.split('-');
  fs.writeFileSync(path.join(manifest,'package.json'),JSON.stringify({
    name:'dsh-plugin-companion',version,description,os:[os],cpu:[cpu],
    engines:{dsh:supportedDsh.join(' || ')},dsh:{bundle:{patch:'./cordis.patch.yml'}},
  }));
  const artifact=path.join(root,'fixture.tgz');
  execFileSync('tar',['-czf',artifact,'-C',root,'package']);
  return artifact;
}
