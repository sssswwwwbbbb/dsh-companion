import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Use the official macOS executable in Node mode to exercise the actual plugin manager.
const artifact = path.resolve(process.argv[2]);
const home = path.resolve(process.argv[3]);
const profileDir = path.join(home, 'profiles', 'desktop');
const resources = '/Applications/DeepSeek Harness.app/Contents/Resources';
const sdk = resources + '/app.asar/dsh/node_modules/@deepseek-ai';
const official = module => pathToFileURL(sdk + '/' + module).href;
const anchor = sdk + '/dsh/package.json';
const pkg = 'dsh-plugin-companion-windows-check';
process.env.DSH_HOME = home;
process.env.DSH_TELEMETRY_DISABLED = '1';
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...args) => write(String(chunk).replace(/([?&#]token=)[^\s&"']+/g, '$1[redacted]'), ...args);

const {loadProfileDirectory, loadLayeredEnv, initProfile, PROFILE_TEMPLATES} =
  await import(official('dsh-app-boot/lib/index.js'));
const {runProfile} = await import(official('dsh/lib/profile-boot.js'));
initProfile(profileDir, PROFILE_TEMPLATES?.web?.bundles ?? ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']);
const profile = loadProfileDirectory('dsh', profileDir, anchor);
const app = await runProfile({
  environment: loadLayeredEnv('dsh'),
  profile: 'desktop',
  resolvedProfile: {profile, installAnchor: anchor},
  patchFiles: [],
  args: ['--no-open', '--host', '127.0.0.1', '--port', '0'],
  packageManager: {
    command: process.execPath,
    args: ['--expose-internals', resources + '/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs'],
    env: {ELECTRON_RUN_AS_NODE: '1', DSH_DESKTOP_NODE_EXECUTABLE: process.execPath, npm_config_offline: 'true'},
  },
});
try {
  const result = await app.ctx.get('pluginManager').installBundle(artifact, {enabled: true});
  assert.equal(result.application, 'applied');
  assert.ok(!result.error);
  const service = app.ctx.get('companionWindowsCheck');
  assert.ok(service);
  const status = service.status();
  assert.deepEqual(status, {platform: 'darwin', arch: process.arch, supported: false});
  assert.deepEqual(service.run(), {passed: false, error: 'WINDOWS_X64_REQUIRED'});
  const installed = JSON.parse(fs.readFileSync(path.join(profileDir, 'node_modules', pkg, 'package.json')));
  assert.equal(installed.version, '0.1.0-w0.1');
  const report = {
    passed: true, installedVersion: installed.version, hostVersion: JSON.parse(fs.readFileSync(anchor)).version,
    install: result.application, status, home,
  };
  fs.writeFileSync(path.join(home, 'w0-plugin-install.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await app.ctx.fiber.dispose();
}
