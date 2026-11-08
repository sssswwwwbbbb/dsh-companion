const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/scene-adapter.js','utf8');
function fixture(fetch){
 let seq=0;const timers=new Map();
 const element=()=>({style:{},dataset:{},children:[],appendChild(child){child.parent=this;this.children.push(child);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}});
 const context=vm.createContext({document:{createElement:element},fetch,AbortController,setTimeout(fn){const id=++seq;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},DSH_INTEGRATION_ENDPOINT:'http://127.0.0.1:1'});vm.runInContext(code,context);
 const stage=element(),sprite={sleeping:true,sleepPhase:'loop'};
 return{context,stage,sprite,timers,mount:()=>context.DshPetScene.mount(sprite,stage)};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('同一舞台挂两个独立道具，dispose 清节点、定时器与标记',async()=>{
 const f=fixture(async()=>({ok:true,json:async()=>({revision:1,enabled:true,skin:'whale',intent:'reading',work:false})})),handle=f.mount();await settle();
 assert.equal(f.stage.children.length,1);assert.equal(f.stage.children[0].children.length,2);assert.equal(f.timers.size,1);
 handle.dispose();handle.dispose();assert.equal(f.stage.children.length,0);assert.equal(f.timers.size,0);assert.equal(f.context.__integrationScene.disposed,1);assert.equal(f.stage.dataset.sceneIntent,undefined);
});
test('取消后迟到的场景响应不得复活道具或轮询',async()=>{
 let resolve,signal;const f=fixture((_,opts)=>{signal=opts.signal;return new Promise(r=>resolve=r);}),handle=f.mount();handle.dispose();
 assert.equal(signal.aborted,true);resolve({ok:true,json:async()=>({revision:1,enabled:true,skin:'whale',intent:'reading',work:false})});await settle();
 assert.equal(f.stage.children.length,0);assert.equal(f.timers.size,0);
});
