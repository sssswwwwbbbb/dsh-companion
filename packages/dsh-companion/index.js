import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { CompanionController } from './src/controller.mjs';
import {proxyRouteFor} from '@deepseek-ai/dsh-http-proxy';
import {fetch as httpFetch} from 'undici';
import {createDshFetch} from './src/http.mjs';
import {hostIsStarting} from './src/startup.mjs';

export class CompanionService extends TypertRemoteService {
  constructor(ctx, controller) { super(ctx, 'dshCompanion');this.controller = controller; }
  status() { return this.controller.status(); }
  start() { return this.controller.start(); }
  stop() { return this.controller.stop(); }
  configure(value) { return this.controller.configure(value); }
  action(value) { return this.controller.action(value); }
  activate(value) { return this.controller.activate(value); }
  refreshLicense() { return this.controller.refreshLicense(); }
  deactivate() { return this.controller.deactivate(); }
  selectPack(value) { return this.controller.selectPack(value); }
  importPack(value) { return this.controller.importPack(value); }
  exportPack(value) { return this.controller.exportPack(value); }
  replayIntro() { return this.controller.replayIntro(); }
  syncHostWindow(value) { return this.controller.syncHostWindow(value); }
  installLauncher() { return this.controller.installLauncher(); }
  removeLauncher() { return this.controller.removeLauncher(); }
  revealLauncher() { return this.controller.revealLauncher(); }
  checkUpdate() { return this.controller.checkUpdate(); }
  downloadUpdate() { return this.controller.downloadUpdate(); }
  revealDownload() { return this.controller.revealDownload(); }
}
// Apply the public Remote decorator in plain JS, without requiring a compiler.
for (const name of ['status','start','stop','configure','action','activate','refreshLicense','deactivate','selectPack','importPack','exportPack','replayIntro','syncHostWindow','installLauncher','removeLauncher','revealLauncher','checkUpdate','downloadUpdate','revealDownload']) {
  const initializers = [];
  Remote(CompanionService.prototype[name], { kind: 'method', name, static: false, private: false, addInitializer: fn => initializers.push(fn) });
  for (const initialize of initializers) initialize.call(Object.create(CompanionService.prototype));
}

export function apply(ctx) {
  const playIntroOnBoot=hostIsStarting(ctx.get('appReady'));
  const controller = new CompanionController({ profileDir: ctx.get('profileContext')?.dir || process.cwd(), dshVersion:ctx.get('clientModules')?.graph()?.release?.version || 'unknown',fetcher:createDshFetch(httpFetch,proxyRouteFor) });
  new CompanionService(ctx, controller);
  ctx.effect(() => {
    void controller.boot({playIntro:playIntroOnBoot}).catch(() => {});
    return () => controller.dispose();
  });
}
