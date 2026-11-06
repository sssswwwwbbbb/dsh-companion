// Exercises the candidate's exact boot injection and media routes with a
// simulated Windows process query. Run with the extracted plugin directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

const plugin = path.resolve(process.argv[2]);
const load = file => import(pathToFileURL(path.join(plugin, file)));
const {registerDesktopOpening} = await load('src/desktop-opening.mjs');
const {hostIsStarting} = await load('src/startup.mjs');
const {loadSkin} = await load('skin-core/src/resources.mjs');
const skin = loadSkin(path.join(plugin, 'skins/archive-workspace-r2-private'));

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-w2-'));
const tools = path.join(sandbox, 'System32', 'WindowsPowerShell', 'v1.0');
fs.mkdirSync(tools, {recursive:true});
fs.writeFileSync(path.join(tools, 'powershell.exe'), `#!/bin/sh
[ "$1 $2 $3 $4" = '-NoLogo -NoProfile -NonInteractive -Command' ] || exit 2
[ "$5" = '(Get-Process -Id ${process.ppid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks' ] || exit 3
printf '%s\\r\\n' "$DSH_W2_BIRTH"
`, {mode:0o700});
process.env.SystemRoot = sandbox;
process.env.DSH_CLIENT_VERSION = 'fixture';
Object.defineProperty(process, 'connected', {value:true, writable:true});
const cold = hostIsStarting({onReady() { return () => {}; }});
const hot = hostIsStarting({onReady(listener) { listener(); return () => {}; }});
assert.equal(cold, true);
assert.equal(hot, false);

function boot(controller, starting = cold) {
  const routes = new Map(), injections = [], disposal = [];
  const web = {
    webServer:{register({kind, path, handler}) { assert.equal(kind, 'exact'); routes.set(path, handler); }},
    on(event, callback) {
      if (event === 'webserver/index-inject') callback(injections);
      else if (event === 'dispose') disposal.push(callback);
    },
    effect(callback) { callback(); },
  };
  registerDesktopOpening({inject(services, callback) {
    assert.deepEqual(services, ['webServer']);
    callback(web);
  }}, controller, starting);
  return {routes, injections, dispose:() => disposal.forEach(callback => callback())};
}
function invoke(handler, method) {
  let status, headers, body;
  const response = {
    writeHead(code, values) { status=code; headers=values; return response; },
    end(value) { body=value; },
  };
  handler({method}, response);
  return {status, headers, body};
}

try {
  for (const dshVersion of ['0.2.1-rc.5', '0.2.2-rc.1']) {
    const stateDir = path.join(sandbox, dshVersion);
    fs.mkdirSync(stateDir);
    const state = {selected:skin, overrides:{}, disabled:{}, results:{startup:{status:'ready'}}};
    let startupEnabled=true, releases=0;
    const controller = {
      dshVersion, stateDir, profileDir:path.join(sandbox, 'desktop'),
      supportsNativeRuntime:() => true,
      settings:() => ({startupEnabled}), entitlement:{status:() => ({active:true})},
      skins:{core:{state, store:{hasStops:() => false}}, snapshots:new Map([[skin.contentKey, skin]])},
      credentials:() => true,
      async request(route) { assert.equal(route, '/intro/desktop-release'); releases++; },
    };
    process.env.DSH_W2_BIRTH = '639000000000000001';
    const opening = boot(controller);
    assert.equal(opening.injections.length, 1);
    assert.equal(opening.injections[0].placement, 'head');
    assert.match(opening.injections[0].text, /video,'ended'/);
    assert.match(opening.injections[0].text, /event.key!=='Escape'/);
    const find = route => [...opening.routes].find(([url]) => url.endsWith('/'+route))[1];
    assert.equal(invoke(find('video'), 'GET').status, 404);
    const claim = invoke(find('claim'), 'POST');
    assert.equal(claim.status, 200);
    assert.equal(JSON.parse(claim.body).seconds, skin.manifest.modules.startup.config.seconds);
    assert.equal(invoke(find('claim'), 'POST').status, 404);
    assert.equal(invoke(find('video'), 'GET').body.length, Number(invoke(find('video'), 'HEAD').headers['Content-Length']));
    assert.ok(invoke(find('poster'), 'GET').body.length > 0);
    assert.equal(boot(controller).injections.length, 0, 'replacement Host in the same shell');
    assert.equal(boot(controller, hot).injections.length, 0, 'warm plugin mount');
    assert.equal(invoke(find('done'), 'POST').status, 204);
    assert.equal(releases, 1);
    assert.equal(fs.existsSync(path.join(stateDir, 'desktop-opening-hold.json')), false);
    opening.dispose();

    process.env.DSH_W2_BIRTH = '639000000000000002';
    startupEnabled=false;
    assert.equal(boot(controller).injections.length, 0, 'automatic playback turned off');
    startupEnabled=true;
    assert.equal(boot(controller, hot).injections.length, 0, 'changing the setting does not play');

    process.env.DSH_W2_BIRTH = '639000000000000003';
    process.connected=false;
    assert.equal(boot(controller).injections.length, 0, 'standalone Web Host');
    process.connected=true;
    const next = boot(controller);
    assert.equal(next.injections.length, 1, 'a new shell can play even when the PID is reused');
    next.dispose();
  }
  console.log('Both supported host versions passed: native boot injection, one-shot claim, media, release, warm silence, toggle and next launch.');
} finally {
  fs.rmSync(sandbox, {recursive:true, force:true});
}
