import fs from 'node:fs';import vm from 'node:vm';import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),lab=new URL('.local/dsh-pet-geometry-20261104/',root),map=JSON.parse(fs.readFileSync(new URL('assets/content-map.json',lab)));
function fixture(name='master-idle',size=685){
 const element=()=>({style:{},dataset:{},children:[],appendChild(child){child.parent=this;this.children.push(child);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}});
 const timers=new Map();let timer=0,signal;
 const c=vm.createContext({window:{__dshPetDebug:{}},document:{createElement:element},AbortController,fetch:(_,o)=>{signal=o.signal;return new Promise(()=>{});},setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout(id){timers.delete(id);},DSH_GEOMETRY_ENDPOINT:'http://127.0.0.1:1'});
 vm.runInContext(fs.readFileSync(new URL('package/runtime/electron-helper/content-profiles.js',lab),'utf8'),c);vm.runInContext(fs.readFileSync(new URL('content-adapter.js',import.meta.url),'utf8'),c);
 const sprite={anim:name,size,bottomPad:size*30/640,margin:{l:size/2,t:size/2},hit:{style:{}},facing:'left'},stage=element();return{c,sprite,stage,timers,signal:()=>signal,mount:()=>c.DshContent.mount(sprite,stage)};
}
test('both source aspect ratios use one uniform affine scale, keep the whole image and land the foot anchor at 330',()=>{
 for(const p of Object.values(map.profiles)){const [gx,gy]=p.sourceGround,[tx,ty]=p.translation;assert.ok(Math.abs(gx*p.scale+tx-320)<1e-8);assert.ok(Math.abs(gy*p.scale+ty-330)<1e-8);assert.ok(tx>=8-1e-7&&ty>=8-1e-7);assert.ok(tx+p.sourceSize[0]*p.scale<=632+1e-7&&ty+p.sourceSize[1]*p.scale<=352+1e-7);}
 assert.deepEqual(map.profiles.legacy071.sourceSize,[362,362]);assert.deepEqual(map.profiles.master04.sourceSize,[499,1024]);assert.equal(map.profiles.legacy071.referenceImageHeight,195);
});
test('implicit idle loops; a response or explicit playback ID keeps its finite lifecycle; unknown metadata is unchanged',()=>{
 const {c}=fixture(),s={facing:'right'};assert.equal(c.DshContent.preparePlayback(s,'master-idle',true,null),false);assert.equal(s.facing,'left');assert.equal(c.DshContent.preparePlayback(s,'master-react',true,null),true);assert.equal(c.DshContent.preparePlayback(s,'master-idle',true,'pb-explicit'),true);assert.equal(c.DshContent.preparePlayback(s,'unknown',false,null),false);
});
test('content alpha excludes a transparent point INSIDE the bounding rectangle at either display size',()=>{
 for(const [name,id] of [['master-idle','master04'],['legacy-idle','legacy071']])for(const scale of [1,.8]){
  const p=map.profiles[id],f=fixture(name,Math.round(p.defaultSize*scale)),handle=f.mount(),unit=f.sprite.size/640,[x,y]=p.transparentProbe,r=f.sprite.hitRect;
  assert.ok(x*unit>r.x&&x*unit<r.x+r.w);assert.ok(f.sprite.bottomPad+y*unit>r.y&&f.sprite.bottomPad+y*unit<r.y+r.h);
  assert.equal(f.sprite.contentHitTest(x*unit,f.sprite.bottomPad+y*unit),false);assert.equal(f.sprite.contentHitTest(320*unit,f.sprite.bottomPad+170*unit),true);handle.dispose();
 }
});
test('dispose aborts in-flight scene read and removes the content input hook and profile',()=>{
 const f=fixture(),handle=f.mount();assert.ok(f.sprite.contentHitTest);handle.dispose();handle.dispose();assert.equal(f.signal().aborted,true);assert.equal(f.sprite.contentHitTest,undefined);assert.equal(f.sprite.contentBodyRects,undefined);assert.equal(f.sprite.contentProfile,undefined);assert.equal(f.c.__geometryDebug.disposed,1);assert.equal(f.timers.size,0);
});
test('main fallback and renderer agree at new head and transparent points; old fallback remains unchanged without metadata',()=>{
 const {pointerZone,decideWindowIgnore}=createRequire(import.meta.url)(fileURLToPath(new URL('package/runtime/electron-helper/pointer-target.js',lab)));
 for(const [name,id] of [['master-idle','master04'],['legacy-idle','legacy071']])for(const scale of [1,.8]){
 const p=map.profiles[id],f=fixture(name,Math.round(p.defaultSize*scale)),handle=f.mount(),s=f.sprite,u=s.size/640,bounds={x:100,y:50,width:s.size*2,height:s.size*2};
 const y=24,row=p.hitRows[y],x=(row[0]+row[1])/2,head={x:bounds.x+s.margin.l+x*u,y:bounds.y+s.margin.t+s.bottomPad+y*u};
 assert.equal(pointerZone(bounds,head,s.margin),'margin');assert.equal(pointerZone(bounds,head,s.margin,s.contentBodyRects),'body');
 const [tx,ty]=p.transparentProbe,clear={x:bounds.x+s.margin.l+tx*u,y:bounds.y+s.margin.t+s.bottomPad+ty*u};
 assert.equal(pointerZone(bounds,clear,s.margin),'body');assert.equal(pointerZone(bounds,clear,s.margin,s.contentBodyRects),'margin');
 assert.equal(decideWindowIgnore(bounds,clear,true,false,500,{rects:[],bodyRects:s.contentBodyRects},s.margin),true);
 assert.equal(decideWindowIgnore(bounds,{x:-100,y:-100},true,true,0,{dragging:true,rects:[],bodyRects:s.contentBodyRects},s.margin),false);
 assert.equal(decideWindowIgnore(bounds,{x:115,y:65},true,true,0,{dragging:false,rects:[{x:10,y:10,width:20,height:20}],bodyRects:s.contentBodyRects},s.margin),false);handle.dispose();
 }
});
