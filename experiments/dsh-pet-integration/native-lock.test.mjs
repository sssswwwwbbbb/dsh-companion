import {test} from 'node:test';import assert from 'node:assert/strict';
import {createNativeLock} from './native-lock.mjs';
test('uses server expiry; at the exact boundary gets a new ID with unchanged 60s TTL',async()=>{
 let now=1000;const calls=[],released=[];
 const lock=createNativeLock({now:()=>now,acquire:async ttl=>{calls.push(ttl);return{lockId:'lock-'+calls.length,expiresAt:now+ttl};},release:async id=>released.push(id)});
 assert.equal(await lock.ensure(),'lock-1');now=60999;assert.equal(await lock.ensure(),'lock-1');
 now=61000;assert.equal(await lock.ensure(),'lock-2');assert.deepEqual(calls,[60000,60000]);
 await lock.release();assert.deepEqual(released,['lock-2']);assert.equal(await lock.ensure(15000),'lock-3');assert.deepEqual(calls,[60000,60000,15000]);
});
test('concurrent requests after expiry share exactly one acquisition',async()=>{
 let now=0,calls=0,resolve;const lock=createNativeLock({now:()=>now,acquire:ttl=>{calls++;return new Promise(r=>resolve=()=>r({lockId:'lock-'+calls,expiresAt:now+ttl}));},release:async()=>{}});
 const first=lock.ensure();resolve();assert.equal(await first,'lock-1');now=60001;
 const requests=[lock.ensure(),lock.ensure(),lock.ensure()];assert.equal(calls,2);resolve();assert.deepEqual(await Promise.all(requests),['lock-2','lock-2','lock-2']);
});
test('release during acquisition cleans the late lock instead of resurrecting it',async()=>{
 let resolve,calls=0;const released=[];const lock=createNativeLock({now:()=>0,acquire:ttl=>{calls++;return new Promise(r=>resolve=()=>r({lockId:'lock-'+calls,expiresAt:ttl}));},release:async id=>released.push(id)});
 const request=lock.ensure();const cancelled=assert.rejects(request,/LOCK_ACQUIRE_CANCELLED/);const drop=lock.release();resolve();await Promise.all([cancelled,drop]);assert.deepEqual(released,['lock-1']);
 const next=lock.ensure();resolve();assert.equal(await next,'lock-2');
});
test('a failed acquisition clears the pending slot and is not retried automatically',async()=>{
 let calls=0;const lock=createNativeLock({now:()=>0,acquire:async ttl=>{if(++calls===1)throw new Error('transport failure');return{lockId:'next',expiresAt:ttl};},release:async()=>{}});
 await assert.rejects(lock.ensure(),/transport failure/);assert.equal(calls,1);assert.equal(await lock.ensure(),'next');assert.equal(calls,2);
});
