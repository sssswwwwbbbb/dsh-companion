import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const stage=path.resolve(process.env.DSH_DEV22_TEST_STAGE||'.local/dsh-cold-start-dev23-final');
const {attachedLauncherAction,currentHostWindow}=await import(pathToFileURL(path.join(stage,'runtime-src/compatibility.mjs')));
const hostWindow={ownerPid:42,updatedAt:100,workspaceVisible:true};
const input={busy:false,eligible:true,ownerPid:42,hostWindow,now:100};

test('an attached launcher may queue only with a recent visible workspace',()=>{
 assert.equal(attachedLauncherAction(input),'queue');
 assert.equal(attachedLauncherAction({...input,eligible:false}),'focus');
 assert.equal(attachedLauncherAction({...input,hostWindow:{...hostWindow,workspaceVisible:false}}),'focus');
 assert.equal(attachedLauncherAction({...input,hostWindow:{...hostWindow,workspaceVisible:undefined}}),'focus');
 assert.equal(attachedLauncherAction({...input,ownerPid:3}),'focus');
 assert.equal(attachedLauncherAction({...input,now:5100}),'focus');
});

test('a repeat launch is ignored while the intro is queued or playing',()=>{
 assert.equal(attachedLauncherAction({...input,busy:true}),'ignore');
 assert.equal(attachedLauncherAction({...input,busy:true,eligible:false,hostWindow:null}),'ignore');
 assert.equal(currentHostWindow(hostWindow,42,101,102),false);
 assert.equal(currentHostWindow({...hostWindow,updatedAt:101},42,101,102),true);
});
