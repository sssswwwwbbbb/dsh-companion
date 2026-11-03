import test from 'node:test';
import assert from 'node:assert/strict';
import {hostIsStarting} from '../packages/dsh-companion/src/startup.mjs';

test('normal DSH startup and a plugin toggle are distinguished by appReady',()=>{
  let ready=false;const listeners=new Set();
  const service={onReady(listener){if(ready){listener();return()=>{};}listeners.add(listener);return()=>listeners.delete(listener);}};
  assert.equal(hostIsStarting(service),true,'startup still in progress permits the opening animation');
  assert.equal(listeners.size,0,'probing readiness leaves no listener behind');
  ready=true;
  assert.equal(hostIsStarting(service),false,'enabling after DSH is ready must stay quiet');
  assert.equal(hostIsStarting(undefined),false,'an unknown host does not force an animation');
});
