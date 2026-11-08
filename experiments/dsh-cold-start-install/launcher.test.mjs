import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const stage=path.resolve(process.env.DSH_DEV22_TEST_STAGE||'.local/dsh-cold-start-dev22-build');
const {coldOpeningAllowed,openingWorkspaceReady}=await import(pathToFileURL(path.join(stage,'runtime-src/compatibility.mjs')));
const contentKey='cold',ownerPid=42,requestedAt=100;
const state={generation:7,selected:{contentKey,manifest:{modules:{startup:{config:{handoffSeconds:0.35}}}}},
 results:{startup:{status:'ready'}},stopped:false,disabled:{}};

test('an explicit launcher opening is independent of the general auto-start preference',()=>{
 const input={requested:true,settings:{autoStart:false,startupEnabled:true,launcherEnabled:true},state};
 assert.equal(coldOpeningAllowed(input),false);
 assert.equal(coldOpeningAllowed({...input,explicitLauncher:true}),true);
 assert.equal(coldOpeningAllowed({...input,explicitLauncher:true,hasStops:true}),false);
 assert.equal(coldOpeningAllowed({...input,explicitLauncher:true,settings:{...input.settings,launcherEnabled:false}}),false);
 assert.equal(coldOpeningAllowed({...input,explicitLauncher:true,settings:{...input.settings,startupEnabled:false}}),false);
});

test('a launcher request needs the committed workspace and newly visible bounds from its owner',()=>{
 const workspace={generation:7,contentKey};
 const hostWindow={ownerPid,updatedAt:101};
 const input={workspace,state,contentKey,ownerPid,requestedAt,hostWindow,now:101};
 assert.equal(openingWorkspaceReady(input),true);
 assert.equal(openingWorkspaceReady({...input,workspace:undefined}),false);
 assert.equal(openingWorkspaceReady({...input,workspace:{...workspace,generation:6}}),false);
 assert.equal(openingWorkspaceReady({...input,state:{...state,pending:{contentKey}}}),false);
 assert.equal(openingWorkspaceReady({...input,ownerPid:0}),false);
 assert.equal(openingWorkspaceReady({...input,hostWindow:{...hostWindow,ownerPid:41}}),false);
 assert.equal(openingWorkspaceReady({...input,hostWindow:{...hostWindow,updatedAt:99}}),false);
 assert.equal(openingWorkspaceReady({...input,now:5200}),false);
});
