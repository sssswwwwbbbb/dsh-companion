/* Data-driven geometry on the upstream native stage; no new behavior engine. */
'use strict';
globalThis.DshContent={
 preparePlayback(sprite,name,once,playbackId){
  sprite.contentWalkEnd=null;
  const spec=globalThis.DshContentProfiles.animations[name];
  if(!spec)return once;
  if(sprite.contentMoveActive&&!spec.movement)sprite.stopMove();
  sprite.contentMoveActive=spec.movement===true;
  // This fixture excludes unreviewed mirror output; original artwork stays facing as supplied.
  if(globalThis.DshContentProfiles.profiles[spec.group].mirrorAllowed===false)sprite.facing='left';
  return spec.loop&&!playbackId?false:once;
 },
 trackWalk(sprite,video,settle){
  const next=globalThis.DshContentProfiles.animations[sprite.anim]?.turnFront;
  if(next&&sprite.playback)sprite.contentWalkEnd={video,settle,next,playbackId:sprite.playback};
 },
 continueWalk(sprite,video){
  const walk=sprite.contentWalkEnd;
  if(walk?.video!==video)return false;
  sprite.contentWalkEnd=null;
  if(sprite.playback!==walk.playbackId||sprite.pending||sprite.dragState.active||!walk.settle())return false;
  // Keep the original action receipt open until the one-shot turn ends.
  sprite.playOnce(walk.next,walk.playbackId);
  return true;
 },
 mount(sprite,stage){
  const data=globalThis.DshContentProfiles,spec=data.animations[sprite.anim];if(!spec)return null;
  const profile=data.profiles[spec.group],bounds=profile.hitBounds;
  sprite.contentProfile=profile;
  // Share the same silhouette with the main-process pointer fallback via the
  // existing input-regions channel. Merge identical spans vertically.
  const merged=[];let previous=new Map();
  profile.hitRows.forEach((row,y)=>{const current=new Map();for(let i=0;i<row.length;i+=2){const key=row[i]+':'+row[i+1];let r=previous.get(key);if(r&&r.y+r.height===y)r.height++;else{r={x:row[i],y,width:row[i+1]-row[i],height:1};merged.push(r);}current.set(key,r);}previous=current;});
  Object.assign(sprite.hit.style,{left:bounds[0]/640*100+'%',top:bounds[1]/360*100+'%',width:(bounds[2]-bounds[0])/640*100+'%',height:(bounds[3]-bounds[1])/360*100+'%'});
  sprite.contentHitTest=(x,y)=>{
   const unit=sprite.size/640;
   const px=Math.floor(x/unit),py=Math.floor((y-sprite.bottomPad)/unit),row=profile.hitRows[py];if(!row)return false;
   for(let i=0;i<row.length;i+=2)if(px>=row[i]&&px<row[i+1])return true;return false;
  };
  stage.dataset.contentProfile=spec.group;
  const events=new AbortController();
  const layer=document.createElement('div');layer.dataset.companionProps='true';Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'2'});
  const props=(profile.props||[]).map(item=>{
   const img=document.createElement('img');img.dataset.prop=item.id;img.alt=item.id==='book'?'独立书本':'独立杯子';
   img.src='./content-assets/'+item.id+'.png';img.style.position='absolute';img.style.pointerEvents='none';layer.appendChild(img);
   return {item,asset:data.props[item.id],img};
  });
  stage.appendChild(layer);
  const refresh=()=>{
   const unit=sprite.size/640,factor=sprite.size/profile.defaultSize;
   sprite.hitRect={x:bounds[0]*unit,y:sprite.bottomPad+bounds[1]*unit,w:(bounds[2]-bounds[0])*unit,h:(bounds[3]-bounds[1])*unit};
   sprite.sideAllow=Math.min(bounds[0],640-bounds[2])*unit;window.__dshPetDebug.hitRect=sprite.hitRect;
   sprite.contentBodyRects=merged.map(r=>({x:sprite.margin.l+r.x*unit,y:sprite.margin.t+sprite.bottomPad+r.y*unit,width:r.width*unit,height:r.height*unit}));
   for(const {item,asset,img} of props){
    const scale=item.referenceHeight*factor/asset.prepared_size[1],anchor=asset.anchors.ground;
    Object.assign(img.style,{
     left:profile.ground[0]*unit+item.groundOffset[0]*factor-anchor[0]*scale+'px',
     top:profile.ground[1]*unit+item.groundOffset[1]*factor-anchor[1]*scale+'px',
     width:asset.prepared_size[0]*scale+'px',height:asset.prepared_size[1]*scale+'px',
    });
   }
  };
  refresh();
  sprite.hit.addEventListener('click',e=>{if(e.isTrusted&&!sprite.justDragged)window.petBridge.companionInteract();},{signal:events.signal});
  return {refresh,dispose(){events.abort();layer.remove();delete sprite.contentHitTest;delete sprite.contentBodyRects;delete sprite.contentProfile;delete stage.dataset.contentProfile;}};
 }
};
