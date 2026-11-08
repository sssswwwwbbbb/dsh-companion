/* Product scene intent only. Upstream owns videos, selector, motion and input. */
'use strict';
globalThis.DshPetScene={mount(sprite,stage){
 const endpoint=globalThis.DSH_INTEGRATION_ENDPOINT;
 let disposed=false,timer=null,controller=null,layer=null,lastRevision=-1;
 const debug=globalThis.__integrationScene??={mounted:0,disposed:0,polls:0,errors:[]};debug.mounted++;
 function clear(){layer?.remove();layer=null;}
 function apply(state){
  stage.dataset.sceneRevision=String(state.revision);stage.dataset.sceneIntent=state.intent;
  const visible=state.enabled&&state.skin==='whale'&&state.intent==='reading'&&!state.work&&sprite.sleeping&&sprite.sleepPhase!=='end';
  if(!visible){clear();return;}
  if(layer)return;
  layer=document.createElement('div');layer.className='integration-scene-props';layer.dataset.skin=state.skin;
  Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'2'});
  for(const [name,box] of [['book',[.46,.65,.22,.30]],['cup',[.67,.72,.095,.22]]]){
   const prop=document.createElement('img');prop.alt=name==='book'?'独立书本':'独立杯子';prop.dataset.prop=name;
   prop.src=endpoint+'/'+name+'.svg';Object.assign(prop.style,{position:'absolute',left:box[0]*100+'%',top:box[1]*100+'%',width:box[2]*100+'%',height:box[3]*100+'%',objectFit:'contain',pointerEvents:'none'});
   layer.appendChild(prop);
  }
  stage.appendChild(layer);
 }
 async function poll(){
  if(disposed)return;controller=new AbortController();
  try{const r=await fetch(endpoint+'/scene.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('scene '+r.status);const state=await r.json();debug.polls++;if(!disposed){lastRevision=state.revision;apply(state);}}
  catch(e){if(!disposed){clear();debug.errors.push(String(e));if(debug.errors.length>20)debug.errors.shift();}}
  finally{controller=null;if(!disposed)timer=setTimeout(poll,200);}
 }
 void poll();
 return{dispose(){if(disposed)return;disposed=true;clearTimeout(timer);controller?.abort();clear();delete stage.dataset.sceneRevision;delete stage.dataset.sceneIntent;debug.disposed++;},revision:()=>lastRevision};
}};
