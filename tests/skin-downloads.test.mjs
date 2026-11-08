import test from 'node:test';import assert from 'node:assert/strict';import {SkinDownloads} from '../packages/dsh-companion/src/skin-downloads.mjs';
const release=i=>'skin_00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const calls=[],pending=new Map();let inFlight=0,max=0;
 const controller={entitlement:{require(){return {licenseId:'A'};}},downloadSkin({releaseId,signal,onProgress}){calls.push(releaseId);inFlight++;max=Math.max(max,inFlight);onProgress({bytes:10,total:100});return new Promise((resolve,reject)=>{
  const finish=fn=>value=>{inFlight--;pending.delete(releaseId);fn(value);};
  pending.set(releaseId,{resolve:finish(resolve),reject:finish(reject),progress:onProgress});signal.addEventListener('abort',()=>pending.get(releaseId)?.reject(signal.reason),{once:true});
 });}};
 return {queue:new SkinDownloads(controller),calls,pending,get max(){return max;}};
}
test('two concurrent downloads permit further enqueues, deduplicate clicks and isolate failure/progress',async()=>{
 const f=fixture();for(let i=1;i<=3;i++)f.queue.add({releaseId:release(i),id:'skin-'+i,title:'皮肤 '+i,size:100});
 assert.equal(f.calls.length,2);assert.equal(f.queue.status().jobs.filter(j=>j.status==='queued').length,1);
 f.queue.add({releaseId:release(1),id:'skin-1'});assert.equal(f.queue.status().jobs.length,3);
 f.pending.get(release(1)).progress({bytes:67,total:100});assert.equal(f.queue.status().jobs.find(j=>j.releaseId===release(1)).bytes,67);assert.equal(f.queue.status().jobs.find(j=>j.releaseId===release(2)).bytes,10);
 f.pending.get(release(1)).reject(new Error('DOWNLOAD_HASH_INVALID'));await tick();assert.equal(f.calls.length,3);assert.equal(f.queue.status().jobs.find(j=>j.releaseId===release(1)).status,'failed');assert.equal(f.queue.status().jobs.find(j=>j.releaseId===release(2)).status,'downloading');
 for(const [id,job]of [...f.pending])job.resolve({skinImport:{contentKey:id}});await tick();assert.equal(f.max,2);assert.equal(f.queue.status().jobs.filter(j=>j.status==='completed').length,2);await f.queue.dispose();
});
test('queued cancellation starts no request; active cancellation releases a slot and failed jobs can retry',async()=>{
 const f=fixture();for(let i=1;i<=4;i++)f.queue.add({releaseId:release(i),id:'skin-'+i,title:'皮肤 '+i,size:100});
 const queued=f.queue.status().jobs.find(j=>j.releaseId===release(3));f.queue.cancel({id:queued.id});assert.equal(f.queue.status().jobs.find(j=>j.id===queued.id).status,'cancelled');assert.equal(f.calls.includes(release(3)),false);
 const active=f.queue.status().jobs.find(j=>j.releaseId===release(1));f.queue.cancel({id:active.id});await tick();assert.equal(f.queue.status().jobs.find(j=>j.id===active.id).status,'cancelled');assert.ok(f.calls.includes(release(4)));
 f.queue.add({releaseId:release(1),id:'skin-1',title:'重试'});assert.equal(f.queue.status().jobs.filter(j=>j.releaseId===release(1)).length,2);
 await f.queue.dispose();assert.equal(f.queue.status().jobs.some(j=>['queued','downloading','cancelling'].includes(j.status)),false);assert.equal(f.calls.filter(id=>id===release(1)).length,1,'disposing does not start queued retry');
});
test('queueing never applies a skin and retained completed history is bounded',async()=>{
 const f=fixture();for(let i=1;i<=25;i++){f.queue.add({releaseId:release(i),id:'skin-'+i,title:'皮肤 '+i});f.pending.get(release(i)).resolve({skinImport:{contentKey:'cached-'+i}});await tick();}
 assert.equal(f.queue.status().jobs.length,20);assert.equal(f.queue.status().jobs[0].contentKey,'cached-25');await f.queue.dispose();
});

test('queued jobs retain their original license; changing license does not spend the new one',async()=>{
 let licenseId='A';const f=fixture();f.queue.controller.entitlement.require=()=>({licenseId});for(let i=1;i<=3;i++)f.queue.add({releaseId:release(i),id:'skin-'+i});
 licenseId='B';f.pending.get(release(1)).resolve({skinImport:{contentKey:'one'}});await tick();
 assert.equal(f.calls.includes(release(3)),false);assert.equal(f.queue.status().jobs.find(j=>j.releaseId===release(3)).error,'SKIN_DOWNLOAD_LICENSE_CHANGED');await f.queue.dispose();
});
