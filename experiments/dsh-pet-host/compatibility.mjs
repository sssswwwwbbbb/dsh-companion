// Small private compatibility policies; skin identity/resources still use the
// existing manifest and effective-settings validation.
export function coldOpeningAllowed({requested,settings,state,hasStops=false}){
 return requested===true&&settings.autoStart===true&&settings.startupEnabled===true&&!!state?.selected?.manifest?.modules?.startup&&!state.stopped&&!state.disabled?.startup&&!hasStops&&state.results?.startup?.status==='ready';
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
export async function chooseSkinFile({focus,showOpenDialog}){
 focus();const result=await showOpenDialog({title:'安装本地皮肤',buttonLabel:'选择 ZIP 皮肤包',properties:['openFile'],filters:[{name:'ZIP 皮肤包',extensions:['zip']}]});
 return result.canceled?{canceled:true}:{canceled:false,file:result.filePaths[0]};
}
