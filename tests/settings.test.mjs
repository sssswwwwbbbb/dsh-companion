import test from 'node:test';
import assert from 'node:assert/strict';
import { validatedSettings } from '../runtime-src/settings.mjs';
import { createBridge } from '../runtime-src/bridge.mjs';
import { childEnvironment } from '../packages/dsh-companion/src/controller.mjs';

test('settings reject arbitrary keys, invalid sizes and invalid types', () => {
  for (const value of [{ size: 1000 }, { profile: '../something' }, { autonomous: 'true' }, { executable: '/tmp/arbitrary' }]) assert.throws(() => validatedSettings(value));
  assert.equal(validatedSettings({ size: 105, profile: 'gentle' }).size, 105);
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
