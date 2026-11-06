import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {Remote, TypertRemoteService} from '@deepseek-ai/dsh-typert-protocol';

const exec = promisify(execFile);
const archive = fileURLToPath(new URL('./runtime.zip', import.meta.url));
const expectedDigest = '5b093f8c993488e9d4956b58f225019ce347826b00ea871e0e6b84b19943177a';
const supported = process.platform === 'win32' && process.arch === 'x64';

async function verifyArchive() {
  const digest = createHash('sha256');
  for await (const bytes of createReadStream(archive)) digest.update(bytes);
  if (digest.digest('hex') !== expectedDigest) throw new Error('RUNTIME_DIGEST_MISMATCH');
}

async function runProbe(signal) {
  const windows = process.env.SystemRoot || process.env.WINDIR;
  if (!windows) return {passed: false, error: 'WINDOWS_SYSTEM_DIRECTORY_MISSING'};
  const keep = new Set(['path', 'systemroot', 'windir', 'home', 'userprofile', 'appdata', 'localappdata', 'temp', 'tmp']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => keep.has(name.toLowerCase())));
  let dir;
  let stage = 'VERIFY_RUNTIME';
  try {
    await verifyArchive();
    signal.throwIfAborted();
    dir = await mkdtemp(path.join(tmpdir(), 'dsh-windows-check-'));
    stage = 'EXTRACT_RUNTIME';
    await exec(path.join(windows, 'System32', 'tar.exe'), ['-xf', archive, '-C', dir], {
      env, signal, windowsHide: true, timeout: 90000,
    });
    stage = 'RUN_DESKTOP_PET';
    let processError;
    try {
      await exec(path.join(dir, 'electron.exe'), [], {env, cwd: dir, signal, windowsHide: true, timeout: 55000});
    } catch (error) {
      processError = error;
    }
    try {
      return JSON.parse(await readFile(path.join(dir, 'DSH-W0-result.json'), 'utf8'));
    } catch (error) {
      if (processError) throw processError;
      throw error;
    }
  } catch (error) {
    return {passed: false, stage, error: signal.aborted ? 'CHECK_CANCELLED' : error.code || error.message};
  } finally {
    if (dir) await rm(dir, {recursive: true, force: true, maxRetries: 2}).catch(() => {});
  }
}

class WindowsCheck extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'companionWindowsCheck');
    ctx.on('dispose', () => this.controller?.abort());
  }

  status() {
    return {platform: process.platform, arch: process.arch, supported};
  }

  run() {
    if (!supported) return {passed: false, error: 'WINDOWS_X64_REQUIRED'};
    if (this.pending) return this.pending;
    this.controller = new AbortController();
    this.pending = runProbe(this.controller.signal).finally(() => {
      this.controller = undefined;
      this.pending = undefined;
    });
    return this.pending;
  }
}

for (const name of ['status', 'run']) {
  const initializers = [];
  Remote(WindowsCheck.prototype[name], {
    kind: 'method', name, static: false, private: false, addInitializer: fn => initializers.push(fn),
  });
  for (const init of initializers) init.call(Object.create(WindowsCheck.prototype));
}

export function apply(ctx) {
  new WindowsCheck(ctx);
}
