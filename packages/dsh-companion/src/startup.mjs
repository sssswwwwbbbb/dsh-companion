// DSH's public appReady service calls the listener synchronously once startup
// has committed. Capture this before the asynchronous activation work starts.
export function hostIsStarting(appReady) {
  if(typeof appReady?.onReady!=='function')return false;
  let committed=false;
  const unsubscribe=appReady.onReady(()=>{committed=true;});
  if(typeof unsubscribe==='function')unsubscribe();
  return !committed;
}
