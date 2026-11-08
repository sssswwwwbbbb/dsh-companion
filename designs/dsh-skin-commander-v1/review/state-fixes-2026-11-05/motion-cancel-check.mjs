import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real motion controller with an Animation that cannot finish
// until the test says so. This makes immediate cancellation observable.
const animations=[];
const events=new Map();
const node=()=>({hidden:false,addEventListener(){},pause(){},readyState:0});
const ring={animate(){
  let resolve,reject;
  const a={cancelCount:0,playState:'running',finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),
    cancel(){this.cancelCount++;this.playState='idle';reject(new Error('cancelled'));},
    finish(){this.playState='finished';resolve();}};
  animations.push(a);return a;
}};
const fallback=node();fallback.parentElement={querySelector(){return ring;}};
const prefs={uiMotion:true,petEcho:true,reduced:false};
const media={matches:false,addEventListener(){}};
const doc={visibilityState:'visible',querySelectorAll(){return [];},
  addEventListener(name,fn){events.set(name,fn);}};
const scene={sync(){},cancel(){},preview(){},complete(){},transfer(){},isActive(){return false;}};
const context={window:{createCommanderPerformance(){return scene;}},matchMedia(){return media;},document:doc};
vm.runInNewContext(await readFile(new URL('../../motion.js',import.meta.url),'utf8'),context);
const motion=context.window.createCommanderMotion({preferences:()=>prefs,surface:{hidden:false},
  idleVideo:node(),reactVideo:node(),fallback,icon(){return '';},announce(){}});

motion.respondOnce();assert.equal(animations.length,1);
prefs.petEcho=false;motion.sync();
assert.equal(animations[0].cancelCount,1,'disabling pet echo cancels its active response immediately');
prefs.petEcho=true;motion.sync();
assert.equal(animations.length,1,'re-enabling does not replay an old response');
motion.respondOnce();motion.cancelEcho();
assert.equal(animations[1].cancelCount,1,'stop uses the same echo cancellation owner');
motion.cancelVisuals();
assert.equal(animations[1].cancelCount,1,'a cancelled echo is removed from the other animation set');
motion.respondOnce();doc.visibilityState='hidden';events.get('visibilitychange')();
assert.equal(animations[2].cancelCount,1,'hidden page cancels its active response');
doc.visibilityState='visible';motion.sync();motion.respondOnce();
prefs.reduced=true;motion.sync();
assert.equal(animations[3].cancelCount,1,'reduce motion cancels an active response');
await Promise.resolve();
console.log(JSON.stringify({result:'passed',checks:6,scope:'real motion controller; controlled Animation timing; no browser, model or native host'}));
