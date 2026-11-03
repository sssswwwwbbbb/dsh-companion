import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeCoordinate, nativePosition } from '../runtime-src/geometry.mjs';
import { hostWindowBounds, introBounds } from '../packages/dsh-companion/src/host-window.mjs';

test('window positions crossing zero never pass negative zero to Electron', () => {
  assert.equal(Object.is(Math.round(-0.1), -0), true);
  for (const input of [-0, -0.49, -0.1, 0, 0.1, 0.49]) {
    const position = nativePosition(input, input);
    assert.deepEqual(position, { x: 0, y: 0 });
    assert.equal(Object.is(position.x, -0) || Object.is(position.y, -0), false);
  }
  assert.deepEqual(nativePosition(-1920.3, -1080.2), { x: -1920, y: -1080 });
});

test('startup animation follows DSH window geometry rather than covering the display',()=>{
  const area={x:0,y:25,width:1728,height:1050},display={x:0,y:0,width:1728,height:1117},dsh={x:150,y:90,width:1000,height:720};
  assert.deepEqual(introBounds(dsh,area,display),dsh);
  assert.deepEqual(introBounds(null,area,display),{x:224,y:140,width:1280,height:820});
  assert.deepEqual(introBounds(display,area,display),display,'a DSH full-screen window keeps its own size');
  assert.deepEqual(hostWindowBounds({x:-0.1,y:-1080.2,width:1000.1,height:720}),{x:0,y:-1080,width:1000,height:720});
  for(const bad of [{x:NaN,y:0,width:1000,height:700},{x:0,y:0,width:1,height:700},{x:0,y:0,width:1e9,height:700}])assert.equal(hostWindowBounds(bad),undefined);
  const left={x:-1920,y:0,width:1920,height:1080};assert.deepEqual(introBounds({x:-1700,y:100,width:1000,height:700},left),{x:-1700,y:100,width:1000,height:700});
  assert.deepEqual(introBounds({x:-4000,y:-4000,width:1000,height:700},area,display),{x:0,y:0,width:1000,height:700},'removed monitor coordinates return to a visible display');
});

test('invalid native coordinates are rejected without wrapping to another monitor', () => {
  for (const input of [NaN, Infinity, -Infinity, 2147483648, -2147483649, '12', null]) {
    assert.equal(nativeCoordinate(input), undefined);
    assert.equal(nativePosition(input, 20), undefined);
  }
  assert.equal(nativeCoordinate(2147483647), 2147483647);
  assert.equal(nativeCoordinate(-2147483648), -2147483648);
});
