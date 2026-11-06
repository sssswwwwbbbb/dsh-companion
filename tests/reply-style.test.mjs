import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReplyStyle} from '../packages/dsh-companion/src/reply-style.mjs';

test('reply style is explicit, scoped to its conversation and removed on skin or license changes',()=>{
  const stateDir=mkdtempSync(join(tmpdir(),'dsh-reply-style-'));
  try{
    const selected={contentKey:'style-snapshot',manifest:{id:'custom-skin',replyStyle:{address:'指挥官',tone:'先给结论。'}}};
    const core={phase:'ready',state:{selected,stopped:false}};
    let active=true,section;
    const controller={stateDir,skins:{core},entitlement:{status:()=>({active}),require(){if(!active)throw new Error('LICENSE_REQUIRED');}}};
    const sessions=new Map([['alpha',{}],['beta',{}]]);
    let style=new ReplyStyle(controller,sessions);
    const registry={section(value){section=value;return ()=>{section=null;};}};
    const unregister=style.register(registry);
    const render=sessionId=>section?.text({agent:{session:{id:sessionId}}})??'';
    const toggle=(sessionId,enabled)=>style.session({sessionId,enabled,contentKey:selected.contentKey});
    assert.equal(render('alpha'),'');
    assert.throws(()=>toggle('missing',true),/REPLY_STYLE_SESSION_MISSING/);
    assert.equal(toggle('alpha',true).enabled,true);
    assert.match(render('alpha'),/指挥官/);
    assert.equal(render('beta'),'');
    assert.equal(section.interpolate,false);
    style.save({contentKey:selected.contentKey,address:'搭档',tone:'语气平和，保留字面 {{原样}}。'});
    assert.match(render('alpha'),/搭档.*\{\{原样\}\}/);
    assert.doesNotMatch(render('alpha'),/指挥官/);
    core.state.selected={contentKey:'plain-snapshot',manifest:{id:'plain-skin'}};
    assert.equal(render('alpha'),'');
    assert.throws(()=>toggle('alpha',true),/SKIN_OPERATION_SUPERSEDED/);
    core.state.selected=selected;
    core.state.stopped=true;
    assert.equal(render('alpha'),'');
    core.state.stopped=false;
    active=false;
    assert.equal(render('alpha'),'');
    active=true;
    unregister();
    assert.equal(render('alpha'),'');
    style=new ReplyStyle(controller,sessions);
    style.register(registry);
    assert.match(render('alpha'),/搭档/);
    assert.equal(toggle('alpha',false).enabled,false);
    assert.equal(render('alpha'),'');
  }finally{rmSync(stateDir,{recursive:true,force:true});}
});
