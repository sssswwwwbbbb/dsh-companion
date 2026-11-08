import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PackStore,validatePack} from '../packages/dsh-companion/src/packs.mjs';

test('configuration export/import preserves clips and behavior while rejecting executable or external asset paths',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-pack-flow-'));
  try{
    const store=new PackStore('packages/dsh-companion/packs',directory);assert.equal(store.summaries().length,1);
    const pack=JSON.parse(store.export('companion-default').json);pack.id='my-custom-pack';store.import(pack);
    assert.equal(store.get('my-custom-pack').startup.theme,'day');assert.equal(store.get('my-custom-pack').defaults.size,100);
    for(const file of ['../../secret','https://example.com/a.webm','file:///tmp/a.webm','assets/companion/../secret']){
      const bad=structuredClone(pack);bad.animations.idle.file=file;assert.throws(()=>validatePack(bad),/PACK_ASSET_INVALID/);
    }
    const bad=structuredClone(pack);bad.profiles.free.speed=Infinity;assert.throws(()=>validatePack(bad),/PACK_BEHAVIOR_INVALID/);
    assert.throws(()=>store.import(JSON.parse(store.export('companion-default').json)),/PACK_ID_RESERVED/);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('imported packs reject metadata and unknown actions that native menus and media cannot render',()=>{
  const pack=JSON.parse(fs.readFileSync('packages/dsh-companion/packs/companion-default.json'));
  for(const mutate of [value=>{value.description={text:'bad'};},value=>{value.profiles.free.label={text:'bad'};},value=>{value.profiles.unknown={...value.profiles.free};},value=>{value.animations.extra={...value.animations.idle};},value=>{value.defaults.launcherEnabled=false;}]){
    const value=structuredClone(pack);mutate(value);assert.throws(()=>validatePack(value),/PACK_/);
  }
});
