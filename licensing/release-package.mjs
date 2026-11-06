import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execute=promisify(execFile);

export async function readReleasePackage(file,version) {
  const {stdout}=await execute('tar',['-xOf',file,'package/package.json'],{maxBuffer:64*1024});
  const metadata=JSON.parse(stdout);
  if(!['@local/dsh-companion','dsh-plugin-companion'].includes(metadata.name)||metadata.version!==version||!metadata.dsh?.bundle)throw new Error('PACKAGE_VERSION_MISMATCH');
  const platform=[metadata.os,metadata.cpu].map(values=>Array.isArray(values)&&values.length===1?values[0]:null).join('-');
  if(!['darwin-arm64','win32-x64'].includes(platform))throw new Error('PACKAGE_PLATFORM_UNSUPPORTED');
  const supportedDsh=(metadata.engines?.dsh||'').split('||').map(version=>version.trim());
  if(!supportedDsh.every(version=>/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)))throw new Error('PACKAGE_DSH_VERSIONS_REQUIRED');
  return {platform,supportedDsh};
}
