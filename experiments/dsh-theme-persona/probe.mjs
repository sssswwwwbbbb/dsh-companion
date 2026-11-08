import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Run with the official Desktop executable and ELECTRON_RUN_AS_NODE=1.
const resources = path.join(process.argv[2] ?? '/Applications/DeepSeek Harness.app', 'Contents', 'Resources');
const sdk = resources + '/app.asar/dsh/node_modules/@deepseek-ai';
const official = module => pathToFileURL(sdk + '/' + module).href;
const anchor = sdk + '/dsh/package.json';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-theme-persona-'));
const profileDir = path.join(home, 'profiles', 'desktop');
process.env.DSH_HOME = home;
process.env.DSH_TELEMETRY_DISABLED = '1';
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...args) => write(String(chunk).replace(/([?&#]token=)[^\s&"']+/g, '$1[redacted]'), ...args);

const result = {
  hostVersion: JSON.parse(fs.readFileSync(anchor)).version,
  scope: 'official Host prompt assembly in two isolated sessions',
  modelRequests: 0,
  checks: {},
};
const {loadProfileDirectory, loadLayeredEnv, initProfile, PROFILE_TEMPLATES} =
  await import(official('dsh-app-boot/lib/index.js'));
const {runProfile} = await import(official('dsh/lib/profile-boot.js'));
const {renderPrompt} = await import(official('dsh-system-prompt/lib/index.js'));
const {assembleContextFor} = await import(official('dsh-agent/lib/index.js'));
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
  const ctx = app.ctx;
  const modelSelection = {provider: 'local-probe', model: 'prompt-fixture'};
  const alpha = await ctx.agentLoop.create(randomUUID(), modelSelection);
  const beta = await ctx.agentLoop.create(randomUUID(), modelSelection);
  const key = 'dsh-companion:theme-reply-style';
  const read = agent => ctx.systemPrompt.assemble({
    ...assembleContextFor(agent),
    modelSelection,
  });
  const signatures = assembly => assembly.sections.filter(section => section.name !== key).map(section => section.name);
  const baseline = await read(alpha);
  let activeStyle;
  const installed = ctx.systemPrompt.section({
    name: key,
    order: 10300,
    interpolate: false,
    text: ({agent}) => agent?.session.id === alpha.session.id ? activeStyle ?? '' : '',
  });
  activeStyle = '称用户为指挥官，先给结论。';
  const enabled = await read(alpha);
  assert.ok(renderPrompt(enabled).includes(activeStyle));
  assert.ok(!renderPrompt(await read(beta)).includes(activeStyle));
  result.checks.enabledOnlyInSelectedSession = true;
  assert.deepEqual(signatures(enabled), signatures(baseline));
  assert.deepEqual(enabled.tools, baseline.tools);
  result.checks.retainedOtherSectionsAndTools = true;
  activeStyle = '改称搭档，先回答问题。字面示例 {{保留}}。';
  assert.ok(renderPrompt(await read(alpha)).includes(activeStyle));
  assert.ok(!renderPrompt(await read(alpha)).includes('称用户为指挥官'));
  result.checks.overrideOnNextAssembly = true;
  activeStyle = undefined;
  assert.equal(renderPrompt(await read(alpha)), renderPrompt(baseline));
  result.checks.offRestoresBaseline = true;
  activeStyle = '第二套的轻量风格。';
  assert.ok(renderPrompt(await read(alpha)).includes(activeStyle));
  await installed();
  assert.ok(!(await read(alpha)).sections.some(section => section.name === key));
  result.checks.disposeRemovesSection = true;
  result.passed = true;
} finally {
  await app.ctx.fiber.dispose();
}
console.log(JSON.stringify(result, null, 2));
