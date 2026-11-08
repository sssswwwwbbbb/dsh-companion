import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCompanionSnapshot} from '../packages/dsh-companion/src/client-requests.mjs';

test('late status and queue replies keep newer catalog, progress, terminal results and ordinary selection',async()=>{
 const {mergeCompanionSnapshot,mergeSkinDownloads}=await import('../packages/dsh-companion/src/client-requests.mjs');
 const previous={license:{licenseId:'A'},skin:{selected:{id:'chosen'},market:{revision:2,page:2}},skinDownloads:{epoch:100,revision:4,jobs:[{status:'completed'},{status:'downloading',bytes:32}]}},old={license:{licenseId:'A'},skin:{selected:{id:'new-choice'},market:{revision:1,page:1}},skinDownloads:{epoch:100,revision:1,jobs:[]}};
 const merged=mergeCompanionSnapshot(previous,old);assert.equal(merged.skin.selected.id,'new-choice');assert.equal(merged.skin.market.page,2);assert.equal(merged.skinDownloads.jobs.length,2);assert.equal(merged.skinDownloads.jobs[0].status,'completed');
 assert.equal(mergeSkinDownloads(previous.skinDownloads,old.skinDownloads).revision,4);
 const restarted={epoch:101,revision:0,jobs:[]};assert.equal(mergeSkinDownloads(previous.skinDownloads,restarted),restarted);
 const changed=mergeCompanionSnapshot(previous,{...old,license:{licenseId:'B'}});assert.equal(changed.skin.market.page,1);
});

test('a late status cannot refund a permanently acquired quota slot',()=>{
 const previous={license:{licenseId:'A'},skin:{market:{revision:3,page:2,quota:{used:1,limit:1,remaining:0,acquiredIds:['cold']}}}};
 const late={license:{licenseId:'A'},skin:{market:{revision:3,page:2,quota:{used:0,limit:1,remaining:1,acquiredIds:[]}}}};
 const result=mergeCompanionSnapshot(previous,late);assert.equal(result.skin.market.quota.used,1);assert.deepEqual(result.skin.market.quota.acquiredIds,['cold']);
 const nextPage={...late,skin:{market:{...late.skin.market,revision:4,page:3}}};assert.equal(mergeCompanionSnapshot(previous,nextPage).skin.market.page,3);assert.equal(mergeCompanionSnapshot(previous,nextPage).skin.market.quota.remaining,0);
 const updatedLimit={...late,skin:{market:{...late.skin.market,quota:{used:1,limit:3,remaining:2,acquiredIds:['cold']}}}};assert.equal(mergeCompanionSnapshot(previous,updatedLimit).skin.market.quota.limit,3);
 const oldPageNewQuota=mergeCompanionSnapshot({...late,skin:{market:{...late.skin.market,revision:4,page:3}}},previous);assert.equal(oldPageNewQuota.skin.market.page,3);assert.equal(oldPageNewQuota.skin.market.quota.used,1);
});
