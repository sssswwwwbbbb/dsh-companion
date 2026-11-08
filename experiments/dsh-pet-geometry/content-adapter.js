/* Data-driven geometry on the upstream native stage; no new behavior engine. */
'use strict';
globalThis.DshContent={
 preparePlayback(sprite,name,once,playbackId){
  const spec=globalThis.DshContentProfiles.animations[name];
  if(!spec)return once;
  // This fixture excludes unreviewed mirror output; original artwork stays facing as supplied.
  if(globalThis.DshContentProfiles.profiles[spec.group].mirrorAllowed===false)sprite.facing='left';
  return spec.loop&&!playbackId?false:once;
 },
 mount(sprite,stage){
  const data=globalThis.DshContentProfiles,spec=data.animations[sprite.anim];if(!spec)return null;
  const profile=data.profiles[spec.group],bounds=profile.hitBounds,unit=sprite.size/640;
  sprite.contentProfile=profile;
  sprite.hitRect={x:bounds[0]*unit,y:sprite.bottomPad+bounds[1]*unit,w:(bounds[2]-bounds[0])*unit,h:(bounds[3]-bounds[1])*unit};
  sprite.sideAllow=Math.min(bounds[0],640-bounds[2])*unit;window.__dshPetDebug.hitRect=sprite.hitRect;
  // Share the same silhouette with the main-process pointer fallback via the
  // existing input-regions channel. Merge identical spans vertically.
  const merged=[];let previous=new Map();
  profile.hitRows.forEach((row,y)=>{const current=new Map();for(let i=0;i<row.length;i+=2){const key=row[i]+':'+row[i+1];let r=previous.get(key);if(r&&r.y+r.height===y)r.height++;else{r={x:row[i],y,width:row[i+1]-row[i],height:1};merged.push(r);}current.set(key,r);}previous=current;});
  sprite.contentBodyRects=merged.map(r=>({x:sprite.margin.l+r.x*unit,y:sprite.margin.t+sprite.bottomPad+r.y*unit,width:r.width*unit,height:r.height*unit}));
  Object.assign(sprite.hit.style,{left:bounds[0]/640*100+'%',top:bounds[1]/360*100+'%',width:(bounds[2]-bounds[0])/640*100+'%',height:(bounds[3]-bounds[1])/360*100+'%'});
  sprite.contentHitTest=(x,y)=>{
   const px=Math.floor(x/unit),py=Math.floor((y-sprite.bottomPad)/unit),row=profile.hitRows[py];if(!row)return false;
   for(let i=0;i<row.length;i+=2)if(px>=row[i]&&px<row[i+1])return true;return false;
  };
  stage.dataset.contentProfile=spec.group;
  // Read-only input evidence for native drag/click-through verification.
  const traceAbort=new AbortController();let traceMoves=0;
  const trace=e=>{if(e.target!==sprite.hit&&!sprite.dragState?.active)return;if((e.type==='pointermove'||e.type==='mousemove')&&traceMoves++>24)return;console.log('[geometry-input] '+JSON.stringify({at:Date.now(),type:e.type,screenX:e.screenX,screenY:e.screenY,clientX:e.clientX,clientY:e.clientY,buttons:e.buttons,button:e.button,pointerId:e.pointerId,trusted:e.isTrusted,active:sprite.dragState?.active,dragging:sprite.dragState?.dragging}));};
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','mousemove'])window.addEventListener?.(type,trace,{capture:true,signal:traceAbort.signal});
  let disposed=false,timer=null,controller=null,layer=null;
  const debug=globalThis.__geometryDebug??={mounted:0,disposed:0,fetchErrors:[],profiles:[]};debug.mounted++;debug.profiles.push(spec.group);
  function clear(){layer?.remove();layer=null;}
  function render(state){
   stage.dataset.propsEnabled=String(state.props);
   if(!state.enabled||state.profile!==spec.group||!state.props||!profile.props){clear();return;}
   if(layer)return;layer=document.createElement('div');layer.className='geometry-props';Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'2'});
   const factor=sprite.size/profile.defaultSize,groundX=profile.ground[0]*unit,groundY=profile.ground[1]*unit;
   for(const item of profile.props){
    const asset=data.props[item.id],s=item.referenceHeight*factor/asset.prepared_size[1],anchor=asset.anchors.ground,img=document.createElement('img');img.dataset.prop=item.id;img.alt=item.id==='book'?'独立书本':'独立杯子';img.src=globalThis.DSH_GEOMETRY_ENDPOINT+'/assets/'+item.id+'.png';
    Object.assign(img.style,{position:'absolute',left:groundX+item.groundOffset[0]*factor-anchor[0]*s+'px',top:groundY+item.groundOffset[1]*factor-anchor[1]*s+'px',width:asset.prepared_size[0]*s+'px',height:asset.prepared_size[1]*s+'px',pointerEvents:'none'});layer.appendChild(img);
   }
   stage.appendChild(layer);
  }
  async function poll(){if(disposed)return;controller=new AbortController();try{const r=await fetch(globalThis.DSH_GEOMETRY_ENDPOINT+'/scene.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('scene '+r.status);const state=await r.json();if(!disposed)render(state);}catch(e){if(!disposed){clear();debug.fetchErrors.push(String(e));}}finally{controller=null;if(!disposed)timer=setTimeout(poll,200);}}
  void poll();return{dispose(){if(disposed)return;disposed=true;clearTimeout(timer);controller?.abort();traceAbort.abort();clear();delete sprite.contentHitTest;delete sprite.contentBodyRects;delete sprite.contentProfile;delete stage.dataset.contentProfile;debug.disposed++;}};
 }
};
