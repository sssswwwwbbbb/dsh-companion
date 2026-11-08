import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const stage=path.resolve(process.env.DSH_DEV24_TEST_STAGE||'.local/dsh-cold-start-dev24-final');
const {attachedLauncherAction,coldOpeningAllowed,hasRunningHost,openingTimerTrigger}=await import(pathToFileURL(path.join(stage,'runtime-src/compatibility.mjs')));
const state={selected:{manifest:{modules:{startup:{}}}},results:{startup:{status:'ready'}}};
const settings={startupEnabled:true,autoStart:true,launcherEnabled:true};

test('ordinary startup never queues the cinematic, even with both old preferences on',()=>{
 assert.equal(coldOpeningAllowed({requested:true,settings,state}),false);
});

test('a fresh explicit launcher can play once; a live host is focus-only',()=>{
 const launch={requested:true,explicitLauncher:true,state,settings:{...settings,autoStart:false}};
 assert.equal(coldOpeningAllowed(launch),true);
 assert.equal(coldOpeningAllowed({...launch,hostAvailable:true}),false);
 assert.equal(coldOpeningAllowed({...launch,hasStops:true}),false);
 assert.equal(coldOpeningAllowed({...launch,settings:{...settings,launcherEnabled:false}}),false);
 assert.equal(attachedLauncherAction({busy:false}),'focus');
 assert.equal(attachedLauncherAction({busy:true}),'ignore');
});

test('a minimized or hidden existing Host is open even after its last geometry became stale',()=>{
 const hostWindow={ownerPid:42,updatedAt:1,workspaceVisible:false};
 const input={requested:true,explicitLauncher:true,state,settings};
 assert.equal(coldOpeningAllowed({...input,hostAvailable:hasRunningHost(hostWindow,pid=>pid===42)}),false);
 assert.equal(coldOpeningAllowed({...input,hostAvailable:hasRunningHost(hostWindow,()=>false)}),true);
 assert.equal(hasRunningHost({ownerPid:-1},()=>true),false);
});

test('the cinematic wall clock can only finish a confirmed still fallback',()=>{
 const movie={cinematic:true,fallback:null,duration:12500,legacyVideoPending:true};
 for(const elapsed of [12500,13500,22000,90000])assert.equal(openingTimerTrigger({...movie,elapsed}),null);
 assert.equal(openingTimerTrigger({...movie,fallback:'video-stalled',duration:1200,elapsed:1199}),null);
 assert.equal(openingTimerTrigger({...movie,fallback:'video-stalled',duration:1200,elapsed:1200}),'static-fallback');
 assert.equal(openingTimerTrigger({...movie,fallback:'reduced-motion',duration:1200,elapsed:1200}),'automatic');
});

test('the short legacy opening keeps its existing completion timing',()=>{
 const legacy={cinematic:false,fallback:null,duration:5000,legacyVideoPending:true};
 assert.equal(openingTimerTrigger({...legacy,elapsed:5000}),null);
 assert.equal(openingTimerTrigger({...legacy,elapsed:5999}),null);
 assert.equal(openingTimerTrigger({...legacy,elapsed:6000}),'automatic');
 assert.equal(openingTimerTrigger({...legacy,legacyVideoPending:false,elapsed:5000}),'automatic');
});
