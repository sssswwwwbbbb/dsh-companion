// Native lifecycle policies. Skin identity and resources still use the
// existing manifest and effective-settings validation.
export function coldOpeningAllowed({requested,explicitLauncher=false,hostAvailable=false,settings,state,hasStops=false}){
 return requested===true&&explicitLauncher===true&&!hostAvailable&&settings.launcherEnabled===true&&
  settings.startupEnabled===true&&!!state?.selected?.manifest?.modules?.startup&&!state.stopped&&!state.disabled?.startup&&!hasStops&&state.results?.startup?.status==='ready';
}
export function openingWorkspaceReady({workspace,state,contentKey,ownerPid,hostWindow,requestedAt,now=Date.now()}){
 return !!workspace&&!state.pending&&workspace.contentKey===contentKey&&workspace.generation===state.generation&&
  currentHostWindow(hostWindow,ownerPid,requestedAt,now);
}
export function currentHostWindow(hostWindow,ownerPid,requestedAt=0,now=Date.now()){
 return ownerPid>0&&hostWindow?.ownerPid===ownerPid&&hostWindow.updatedAt>=requestedAt&&
  hostWindow.updatedAt<=now&&now-hostWindow.updatedAt<5000;
}
export function hasRunningHost(hostWindow,isAlive){
 const owner=hostWindow?.ownerPid;
 return Number.isSafeInteger(owner)&&owner>0&&isAlive(owner);
}
export function attachedLauncherAction({busy}){
 return busy?'ignore':'focus';
}
export function openingTimerTrigger({cinematic,fallback,elapsed,duration,legacyVideoPending}){
 if(elapsed<duration)return null;
 if(cinematic)return fallback?(fallback==='reduced-motion'?'automatic':'static-fallback'):null;
 return legacyVideoPending&&elapsed<duration+1000?null:'automatic';
}
export function backendReadiness({registered,alive,suspended,held,snapshot}){
 if(!registered||!alive)return false;
 if(suspended)return true; // Explicit startup suspension is owned by Host.
 const w=snapshot?.windows?.[0];
 // Initial apply separately waits for actual playback, props and body regions.
 // Once registered, a finite clip may pause briefly while the next clip takes
 // over. That is not a lifecycle loss of the owned native window.
 return snapshot?.windows?.length===1&&Array.isArray(w?.renderer?.props)&&w.renderer.props.every(p=>p.complete)&&(held||w.visible===true);
}
