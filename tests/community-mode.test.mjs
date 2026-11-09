import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Entitlement } from '../packages/dsh-companion/src/entitlement.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'dsh-community-'));
const config={serviceUrl:'https://license-host.invalid/dsh-companion',publicKey:'unused',channel:'community'};

test('community builds report an active local license without a server round trip',async t=>{
  const dir=temp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  let calls=0;
  const entitlement=new Entitlement({stateDir:dir,config,deviceId:'device-a',fetcher:async()=>{calls++;throw new Error('must not call');}});
  const status=entitlement.status();
  assert.equal(status.active,true);
  assert.equal(status.state,'community');
  assert.equal(status.channel,'community');
  assert.equal(entitlement.require().licenseId,'community-local');
  await entitlement.refresh(true);
  assert.equal(calls,0);
});

test('community builds disable online market downloads but keep local skins usable',async t=>{
  const dir=temp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const entitlement=new Entitlement({stateDir:dir,config,deviceId:'device-a',fetcher:async()=>{throw new Error('must not call');}});
  await assert.rejects(entitlement.refreshSkinCatalog({}),/COMMUNITY_MARKET_DISABLED/);
  await assert.rejects(entitlement.downloadSkin({releaseId:'skin_00000000-0000-0000-0000-000000000000',dshVersion:'0.2.2-rc.1'}),/COMMUNITY_MARKET_DISABLED/);
});
