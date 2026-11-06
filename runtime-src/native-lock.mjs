/** Local diagnostic ownership only; expiry comes from the upstream receipt. */
export function createNativeLock({acquire,release,now=Date.now}) {
 let lease=null,pending=null,generation=0;
 async function ensure(ttl=60000) {
  if(lease&&now()<lease.expiresAt)return lease.lockId;
  lease=null;
  if(pending){
   if(pending.generation===generation)return pending.promise;
   // A release invalidated that acquisition; let it clean up before a new one.
   await pending.promise.catch(()=>{});return ensure(ttl);
  }
  const operation={generation,promise:null};
  operation.promise=(async()=>{
   const value=await acquire(ttl);
   if(operation.generation!==generation){
    await release(value.lockId);throw new Error('LOCK_ACQUIRE_CANCELLED');
   }
   if(!value.lockId||!Number.isFinite(value.expiresAt)||value.expiresAt<=now()){
    if(value.lockId)await release(value.lockId);
    throw new Error('LOCK_RECEIPT_EXPIRED');
   }
   lease={lockId:value.lockId,expiresAt:value.expiresAt};return value.lockId;
  })();
  pending=operation;
  try{return await operation.promise;}finally{if(pending===operation)pending=null;}
 }
 async function drop() {
  generation++;const old=lease,inflight=pending;lease=null;
  try{if(old)await release(old.lockId);}
  finally{if(inflight)await inflight.promise.catch(()=>{});}
 }
 return{ensure,release:drop};
}
