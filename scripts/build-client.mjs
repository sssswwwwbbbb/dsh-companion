import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const base = new URL('../packages/dsh-companion/', import.meta.url);
copyFileSync(new URL('../runtime-src/settings.mjs',import.meta.url),new URL('src/settings.mjs',base));
const locales = Object.fromEntries(['zh','en'].map(locale => [locale,JSON.parse(readFileSync(new URL(`locale/${locale}.json`,base),'utf8'))]));
writeFileSync(new URL('client.js',base),readFileSync(new URL('src/client.template.js',base),'utf8').replace('__LOCALES__',JSON.stringify(locales)));
