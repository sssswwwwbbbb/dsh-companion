import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [dev29, dev31, runtime] = process.argv.slice(2);
assert.ok(dev29 && dev31 && runtime, 'Provide extracted dev.29, dev.31 and runtime resources/app directories');
const load = (directory, file) => import(pathToFileURL(path.resolve(directory, file)));
const [{NativeSkinRuntime}, {NativeStartupRuntime}, {signedEnvelope}] = await Promise.all([
  load(runtime, 'skin.mjs'),
  load(runtime, 'startup-skin.mjs'),
  load(dev29, 'src/license-core.mjs'),
]);
const work = fileURLToPath(new URL('../../.local/dsh-windows-w3/', import.meta.url));
mkdirSync(work, {recursive:true});
const home = mkdtempSync(path.join(work, 'fixture-'));
process.env.DSH_HOME = home;
Object.defineProperty(process, 'platform', {value:'win32'});
Object.defineProperty(process, 'arch', {value:'x64'});

const versions = ['0.2.1-rc.5', '0.2.2-rc.1'];
const {publicKey, privateKey} = generateKeyPairSync('ed25519');
const config = {publicKey, serviceUrl:'http://127.0.0.1:1', supportedDsh:versions};
const deviceId = '1'.repeat(64);
const now = Date.now();
const receipt = signedEnvelope({
  format:2, product:'dsh-companion', licenseId:'w3-signed-fixture', deviceId,
  issuedAt:now, expiresAt:null, permanent:true, offlineUntil:now+600_000,
  renewAfter:now+300_000, entitlements:['companion','startup','configuration'],
}, privateKey);

async function inHost(directory, dshVersion, profileDir, action) {
  const {CompanionController} = await load(directory, 'src/controller.mjs');
  const host = new CompanionController({
    profileDir, dshVersion, config, deviceId,
    fetcher:async () => assert.fail('Fresh signed receipt should require no network request'),
  });
  let token, running = false;
  const {stateDir} = host;
  const pet = new NativeSkinRuntime({
    stateDir, loadPack:id => host.packs.get(id),
    apply:({token:readyToken}) => { token = readyToken; },
    hide:() => { token = undefined; },
    isReady:expected => token === expected,
  });
  const startup = new NativeStartupRuntime({stateDir, dshVersion});
  host.start = async options => {
    assert.deepEqual(options, {skinStandby:true});
    running = true;
  };
  host.credentials = () => running ? {skinProtocol:1, startupProtocol:1} : undefined;
  host.request = async (route, value) => {
    switch (route) {
      case '/status': return {running, ready:pet.visible, skin:pet.status(), startup:startup.status()};
      case '/skin/invalidate': return pet.invalidate(value.generation);
      case '/skin/exit': return pet.exit(value.generation);
      case '/skin/apply': return pet.activate(value);
      case '/skin/size': return pet.resize(value, () => {});
      case '/skin/startup/invalidate': return startup.invalidate(value.generation);
      case '/skin/startup/exit': return startup.exit(value);
      case '/skin/startup/apply': return startup.activate(value);
      case '/shutdown': running = false; return {};
      default: throw new Error('Unexpected bridge route ' + route);
    }
  };
  const clientId = randomUUID();
  let ack;
  const timer = setInterval(() => {
    const {command} = host.skins.poll({clientId, capable:true, ack, seenCommand:ack?.id});
    if (command) ack = {id:command.id, generation:command.generation, ok:true};
  }, 15);
  try {
    return await action(host);
  } finally {
    try { await host.dispose(); } finally { clearInterval(timer); }
  }
}

const status = async host => {
  for (let attempt=0; attempt<200 && host.skins.core.phase!=='ready'; attempt++) await delay(20);
  const snapshot = await host.status();
  assert.equal(snapshot.skin.phase, 'ready');
  for (const module of ['theme','pet','startup']) assert.equal(snapshot.skin.results[module].status, 'ready', module);
  assert.equal(snapshot.license.active, true);
  assert.equal(snapshot.license.permanent, true);
  assert.equal(snapshot.license.licenseId, 'w3-signed-fixture');
  return snapshot;
};

try {
  for (const dshVersion of versions) {
    const profile = path.join(home, dshVersion, 'profiles', 'desktop');
    const baseline = await inHost(dev29, dshVersion, profile, async host => {
      host.entitlement.save(receipt);
      await host.configure({autoStart:false, startupEnabled:false});
      await host.boot();
      const skin = host.skins.status().catalog.find(item => item.name==='冷启动');
      await delay(25);
      await host.skins.select({contentKey:skin.contentKey});
      await host.skins.configure({module:'pet', field:'size', value:85, contentKey:skin.contentKey});
      await host.skins.configure({module:'startup', field:'soundEnabled', value:true, contentKey:skin.contentKey});
      const snapshot = await status(host);
      assert.equal(snapshot.version, '0.1.0-dev.29');
      return {stateDir:host.stateDir, selected:snapshot.skin.selected, receiptFile:readFileSync(host.entitlement.file)};
    });
    const verify = async host => {
      await host.boot();
      const snapshot = await status(host);
      assert.equal(snapshot.version, '0.1.0-dev.31');
      assert.equal(snapshot.compatibility.supported, true);
      assert.equal(host.stateDir, baseline.stateDir);
      assert.deepEqual(readFileSync(host.entitlement.file), baseline.receiptFile);
      assert.deepEqual(snapshot.skin.selected, baseline.selected);
      assert.equal(snapshot.skin.settings.pet.values.size, 85);
      assert.equal(snapshot.skin.settings.startup.values.soundEnabled, true);
      assert.equal(snapshot.settings.startupEnabled, false);
      assert.equal(snapshot.settings.autoStart, false);
    };
    await inHost(dev31, dshVersion, profile, verify);
    console.log('PASS plugin dev.29 → dev.31 under Host version fixture ' + dshVersion);
    if (dshVersion===versions[0]) {
      await inHost(dev31, versions[1], profile, verify);
      console.log('PASS dev.31 state recovery after Host version fixture ' + versions.join(' → '));
    }
  }
} finally {
  rmSync(home, {recursive:true, force:true});
}
