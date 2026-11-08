import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { CompanionController } from './src/controller.mjs';
import {proxyRouteFor} from '@deepseek-ai/dsh-http-proxy';
import {fetch as httpFetch} from 'undici';
import {createDshFetch} from './src/http.mjs';
import {hostIsStarting} from './src/startup.mjs';
import {registerDesktopOpening} from './src/desktop-opening.mjs';
import {PetInteraction} from './src/pet-interaction.mjs';
import {ReplyStyle} from './src/reply-style.mjs';
import {DshPetModel} from './src/pet-model.mjs';

export class CompanionService extends TypertRemoteService {
  constructor(ctx, controller) { super(ctx, 'dshCompanion');this.controller = controller; }
  status() { return this.controller.status(); }
  characterSave(value) { return this.controller.replyStyle.saveCharacter(value); }
  characterPet(value) { return this.controller.replyStyle.characterPet(value); }
  characterSession(value) { return this.controller.replyStyle.characterSession(value); }
  replyStyleSession(value) { return this.controller.replyStyle?.session(value)??null; }
  replyStyleSave(value) { this.controller.replyStyle.save(value);return this.controller.status(); }
  skinSelect(value) { return this.controller.skins.select(value); }
  petActivityConfigure(value) { return this.controller.skins.activities.configure(value); }
  petActivityDecide(value) { return this.controller.skins.activities.preview(value); }
  workAutonomyConfigure(value) { return this.controller.skins.work.configure(value); }
  skinConfigure(value) { return this.controller.skins.configure(value); }
  skinDisable(value) { return this.controller.skins.disable(value); }
  skinReset(value) { return this.controller.skins.reset(value); }
  skinStop() { return this.controller.skins.stop(); }
  skinPage(value) { return {...this.controller.skins.poll(value),focus:this.controller.focus.snapshot()}; }
  focusAction(value) { return this.controller.focusAction(value); }
  workspaceCueConfigure(value) { return this.controller.skins.workspaceCues.configure(value); }
  sceneConfigure(value) { return this.controller.skins.workspaceScenes.configure(value); }
  sceneArt(value) { return this.controller.skins.workspaceScenes.art(value); }
  skinCover(value) { return this.controller.skins.cover(value); }
  skinInstall() { return this.controller.installSkin(); }
  start() { return this.controller.start(); }
  stop() { return this.controller.stop(); }
  configure(value) { return this.controller.configure(value); }
  action(value) { return this.controller.action(value); }
  petInteract(value) { return this.controller.interactions.interact(value); }
  petMemoryConfigure(value) { return this.controller.interactions.memory.configure(value); }
  petModels() { return this.controller.interactions.models(); }
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
for (const name of ['petMemoryConfigure','characterSave','characterPet','characterSession','petActivityConfigure','petActivityDecide','workAutonomyConfigure','replyStyleSession','replyStyleSave','petInteract','petModels','skinSelect','skinConfigure','skinDisable','skinReset','skinStop','skinPage','focusAction','workspaceCueConfigure','sceneConfigure','sceneArt','skinCover','skinInstall','status','start','stop','configure','action','activate','refreshLicense','deactivate','selectPack','importPack','exportPack','replayIntro','syncHostWindow','installLauncher','removeLauncher','revealLauncher','checkUpdate','downloadUpdate','revealDownload']) {
  const initializers = [];
  Remote(CompanionService.prototype[name], { kind: 'method', name, static: false, private: false, addInitializer: fn => initializers.push(fn) });
  for (const initialize of initializers) initialize.call(Object.create(CompanionService.prototype));
}

export function apply(ctx) {
  const playIntroOnBoot=hostIsStarting(ctx.get('appReady'));
  const controller = new CompanionController({ profileDir: ctx.get('profileContext')?.dir || process.cwd(), dshVersion:ctx.get('clientModules')?.graph()?.release?.version || 'unknown',fetcher:createDshFetch(httpFetch,proxyRouteFor) });
  controller.interactions=new PetInteraction(controller,new DshPetModel(ctx));
  new CompanionService(ctx, controller);
  ctx.inject(['systemPrompt','sessions'],styleCtx=>{
    const style=new ReplyStyle(controller,styleCtx.sessions);
    controller.replyStyle=style;
    styleCtx.effect(()=>style.register(styleCtx.systemPrompt));
  });
  registerDesktopOpening(ctx,controller,playIntroOnBoot);
  ctx.effect(() => {
    void controller.boot({playIntro:playIntroOnBoot}).catch(() => {});
    return () => controller.dispose();
  });
}
