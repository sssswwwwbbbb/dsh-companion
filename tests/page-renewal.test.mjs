import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function page(t){
  let now=0,interval,layer=false,clears=0,nextCommand,fail=false,hold,disposed;
  const tokens={'--dsw-alias-bg-base':{light:'#eaf2f4',dark:'#10202a'}};
  const command={id:'apply-1',kind:'apply',generation:1,contentKey:'a'.repeat(64),payload:{tokens}};
  nextCommand=command;
  const context={crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},Date:{now:()=>now},setTimeout,clearTimeout,
    setInterval(fn){interval=fn;return 1;},clearInterval(){},document:{body:{style:{getPropertyValue:()=>layer?tokens['--dsw-alias-bg-base'].light:''}}},
    installSessionFeedback(){throw Error('No work feedback in fixture');},installWorkspaceR2(){},installWorkspaceCommander(){}};
  vm.createContext(context);
  const source=fs.readFileSync(new URL('../packages/dsh-skin-core/adapters/page-client.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function installSkinPage','function installSkinPage');
  vm.runInContext(source+'\nthis.install=installSkinPage;',context);
  const theme={getTheme:()=>({active:{colorScheme:'light'}}),overrideTokens(){layer=true;return()=>{layer=false;clears++;};}};
  const dispose=context.install({React:{},ctx:{get:()=>theme,layout:{panelInfo:{subscribe:()=>()=>{},getSnapshot:()=>({activePanelId:null})}}},call:async(_method,input)=>{
    if(input.verify)return {leaseMs:4000,command};
    if(hold)await hold;
    if(fail)throw Error('HOST_UNAVAILABLE');
    const pending=nextCommand;nextCommand=null;return {leaseMs:4000,command:pending};
  }});t.after(dispose);
  await new Promise(resolve=>setTimeout(resolve,45));
  assert.equal(layer,true);
  return {interval:()=>interval(),advance:()=>{now+=10000;},failure:()=>{fail=true;},command(value){nextCommand=value;},hold(value){hold=value;},get layer(){return layer;},get clears(){return clears;}};
}
test('a throttled page renews its same Host lease without removing the presented colors',async t=>{
 const p=await page(t);p.advance();let release;p.hold(new Promise(resolve=>release=resolve));p.interval();
 assert.equal(p.layer,true,'colors remain while foreground renewal is pending');assert.equal(p.clears,0);
 release();await tick();assert.equal(p.layer,true);assert.equal(p.clears,0);
});
test('foreground renewal still honors an explicit exit or failed Host after expiry',async t=>{
 const stopped=await page(t);stopped.advance();stopped.command({id:'exit-2',kind:'exit',generation:2});stopped.interval();await tick();assert.equal(stopped.layer,false);
 const failed=await page(t);failed.advance();failed.failure();failed.interval();await tick();assert.equal(failed.layer,false);
});
