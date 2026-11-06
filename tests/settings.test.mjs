import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FocusTimer } from '../packages/dsh-companion/src/focus.mjs';
import { validatedSettings } from '../runtime-src/settings.mjs';
import { createBridge } from '../runtime-src/bridge.mjs';
import { childEnvironment } from '../packages/dsh-companion/src/controller.mjs';

test('settings reject arbitrary keys, invalid sizes and invalid types', () => {
  for (const value of [{ size: 1000 }, { profile: '../something' }, { autonomous: 'true' }, { executable: '/tmp/arbitrary' }]) assert.throws(() => validatedSettings(value));
  assert.equal(validatedSettings({ size: 105, profile: 'gentle' }).size, 105);
});
test('focus timer keeps paused time and quiet preference across reloads and reports elapsed deadlines', t => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'theme-box-focus-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  let time=0;
  const now=()=>time;
  let timer=new FocusTimer(directory,{now});
  assert.deepEqual(timer.snapshot(),{quiet:false,phase:'idle',kind:null,seconds:0});
  assert.throws(()=>timer.change({action:'start',kind:'focus',minutes:5}),/INVALID_SETTINGS/);
  timer.change({action:'start',kind:'focus',minutes:15});
  time+=2000;
  timer.change({action:'pause'});
  timer.change({action:'quiet',enabled:true});
  time+=30000;
  timer=new FocusTimer(directory,{now});
  assert.deepEqual(timer.snapshot(),{quiet:true,phase:'paused',kind:'focus',seconds:898});
  timer.change({action:'start',kind:'break',minutes:5});
  assert.equal(timer.snapshot().kind,'focus');
  timer.change({action:'resume'});
  time+=898000;
  timer=new FocusTimer(directory,{now});
  assert.deepEqual(timer.snapshot(),{quiet:true,phase:'done',kind:'focus',seconds:0});
  timer.change({action:'start',kind:'break',minutes:5});
  assert.deepEqual(timer.snapshot(),{quiet:true,phase:'running',kind:'break',seconds:300});
  timer.change({action:'clear'});
  assert.deepEqual(timer.snapshot(),{quiet:true,phase:'idle',kind:null,seconds:0});
});
test('desktop process does not inherit provider credentials or Electron Node mode', () => {
  assert.deepEqual(childEnvironment({ HOME: '/test', PATH: '/bin', OPENAI_API_KEY: 'private', ELECTRON_RUN_AS_NODE: '1' }, { DSH_COMPANION_OWNER_PID: '123' }), { HOME: '/test', PATH: '/bin', DSH_COMPANION_OWNER_PID: '123' });
});
test('local bridge rejects unauthenticated calls and browser-origin requests', async () => {
  const bridge = await createBridge({ dispatch: async () => ({ ok: true }) });
  const url = `http://127.0.0.1:${bridge.port}/status`;
  try {
    assert.equal((await fetch(url)).status, 403);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${bridge.token}`, Origin: 'https://example.com' } })).status, 403);
    assert.deepEqual(await (await fetch(url, { headers: { Authorization: `Bearer ${bridge.token}` } })).json(), { ok: true });
  } finally { await bridge.close(); }
});
