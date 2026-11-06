import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
for (const dir of ['packages/dsh-skin-core/src','packages/dsh-skin-core/adapters','packages/dsh-skin-core/scripts','runtime-src','packages/dsh-companion','packages/dsh-companion/src','scripts','licensing','deploy']) {
  for (const name of readdirSync(dir)) if (/\.(?:mjs|cjs|js)$/.test(name)&&!name.endsWith('.template.js')) execFileSync(process.execPath,['--check',join(dir,name)]);
}
for (const file of ['package.json','packages/dsh-companion/package.json','packages/dsh-companion/locale/zh.json','packages/dsh-companion/locale/en.json']) JSON.parse(readFileSync(file,'utf8'));
console.log('JavaScript and JSON checks passed.');
