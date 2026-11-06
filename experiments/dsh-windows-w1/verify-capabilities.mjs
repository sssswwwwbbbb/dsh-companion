// Run against extracted dev.28 and candidate packages and the extracted candidate
// resources/app directory. The DSH page and Electron window use local fixtures.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const [previousPackage, candidatePackage, runtime] = process.argv.slice(2);
assert.ok(previousPackage && candidatePackage && runtime);
const load = (dir, file) => import(pathToFileURL(path.resolve(dir, file)));
Object.defineProperty(process, 'platform', {value:'win32'});
Object.defineProperty(process, 'arch', {value:'x64'});

const root = mkdtempSync(path.join(tmpdir(), 'dsh-w1-capabilities-'));
const stateDir = path.join(root, 'state');
const dshVersion = '0.2.2-rc.1';
const newHost = async (directory) => {
  const {CompanionController} = await load(directory, 'src/controller.mjs');
  const host = new CompanionController({stateDir, profileDir:root, dshVersion, deviceId:'1'.repeat(64)});
  host.entitlement.require = () => {};
  return host;
};

function connectPage(skins) {
  const clientId = randomUUID();
  let ack;
  const tick = () => {
    const {command} = skins.poll({clientId, capable:true, ack, seenCommand:ack?.id});
    if (command) ack = {id:command.id, generation:command.generation, ok:true};
  };
  tick();
  return setInterval(tick, 15);
}

let pageTimer;
try {
  const oldHost = await newHost(previousPackage);
  pageTimer = connectPage(oldHost.skins);
  const selected = oldHost.skins.status().catalog.find(skin => skin.name === '冷启动');
  assert.ok(selected);
  const oldSkin = (await oldHost.skins.select({contentKey:selected.contentKey})).skin;
  assert.equal(oldSkin.results.theme.status, 'ready');
  for (const module of ['pet', 'startup']) {
    assert.equal(oldSkin.results[module].reason, 'SKIN_CAPABILITY_UNAVAILABLE');
  }
  clearInterval(pageTimer);

  const [{NativeSkinRuntime}, {NativeStartupRuntime}] = await Promise.all([
    load(runtime, 'skin.mjs'),
    load(runtime, 'startup-skin.mjs'),
  ]);
  const host = await newHost(candidatePackage);
  const startup = new NativeStartupRuntime({stateDir, dshVersion});
  let token, resized;
  const pet = new NativeSkinRuntime({
    stateDir,
    loadPack:id => host.packs.get(id),
    apply:({resources, token:readyToken}) => {
      assert.ok(Object.values(resources).some(asset => asset.mime === 'video/webm'));
      token = readyToken;
    },
    hide:() => { token = undefined; },
    isReady:expected => token === expected,
  });
  host.start = async (options) => { assert.deepEqual(options, {skinStandby:true}); };
  host.credentials = () => ({skinProtocol:1, startupProtocol:1});
  host.request = async (route, value) => {
    switch (route) {
      case '/status': return {running:true, ready:pet.visible, skin:pet.status(), startup:startup.status()};
      case '/skin/invalidate': return pet.invalidate(value.generation);
      case '/skin/exit': return pet.exit(value.generation);
      case '/skin/apply': return pet.activate(value);
      case '/skin/size': return pet.resize(value, size => { resized = size; });
      case '/skin/startup/invalidate': return startup.invalidate(value.generation);
      case '/skin/startup/exit': return startup.exit(value);
      case '/skin/startup/apply': return startup.activate(value);
      default: throw new Error('Unexpected bridge route ' + route);
    }
  };

  // A fresh DSH page must restore the previously selected skin automatically.
  pageTimer = connectPage(host.skins);
  for (let attempt = 0; attempt < 200 && host.skins.core.phase !== 'ready'; attempt++) await delay(20);
  const restored = host.skins.status();
  assert.equal(restored.selected.contentKey, selected.contentKey);
  for (const module of ['theme', 'pet', 'startup']) assert.equal(restored.results[module].status, 'ready', module);
  assert.equal(pet.status().visible, true);
  assert.equal(startup.playback().contentKey, selected.contentKey);

  const originalToken = token;
  await host.skins.configure({module:'pet', field:'size', value:85, contentKey:selected.contentKey});
  assert.equal(resized, 85);
  assert.equal(token, originalToken);
  assert.equal(host.skins.status().settings.pet.values.size, 85);

  await host.skins.stop();
  assert.equal(pet.status().visible, false);
  assert.equal(startup.canPlay(), false);
  console.log('Windows capability regression passed: dev.28 state restores all modules, size applies in place, and stop clears native registrations.');
} finally {
  clearInterval(pageTimer);
  rmSync(root, {recursive:true, force:true});
}
