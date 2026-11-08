"""Verify desktop receipts and geometry from read-only native observations."""
import hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'reports/dsh-pet-integration-2026-11-04'
epoch=json.loads((REPORT/'acceptance-epoch.json').read_text())['at']
events=[json.loads(s) for s in (REPORT/'host-events.jsonl').read_text().splitlines()]
events=[e for e in events if e['at']>=epoch]
rows=[]
for line in (REPORT/'native-telemetry.jsonl').open():
    row=json.loads(line)
    if row['at']>=epoch: rows.append(row)
def renderer(row):return row['windows'][0]['renderer'] if row['windows'] else None
def sprite(row):
    r=renderer(row)
    return r['sprites'][0] if r and r['sprites'] else None
def front(row):
    r=renderer(row)
    return next((v for v in r['videos'] if v['front']),None) if r else None
def completion(action,first=False):
    values=[e for e in events if e['type']=='native-action-completed' and e['action']==action]
    return (values[0] if first else values[-1]) if values else None
def sample_after(at,predicate=lambda r:True):
    return next((r for r in rows if r['at']>=at and predicate(r)),None)
checks=[]
def check(name,ok,**detail):checks.append({'name':name,'pass':bool(ok),**detail})
playbacks={}
for e in events:
    if e['type']=='native-playback':playbacks.setdefault(e['playbackId'],[]).append(e)
receipts=[]
for id,items in playbacks.items():
    created=items[0]['createdAt'];end=items[-1]['updatedAt'];span=[r for r in rows if created-150<=r['at']<=end+150 and sprite(r)]
    before=max((r for r in rows if r['at']<=created and sprite(r)),key=lambda r:r['at'],default=None)
    after=sample_after(end,lambda r:sprite(r) is not None)
    dx=sprite(after)['pos']['x']-sprite(before)['pos']['x'] if before and after else None
    active=[r for r in span if sprite(r).get('playback')==id and front(r) and not front(r)['paused']]
    receipts.append({'playbackId':id,'name':items[0]['name'],'statuses':[e['status'] for e in items],'terminal':items[-1]['status'],'reason':items[-1].get('reason'),'durationMs':end-created,'deltaX':dx,'realPlayingSamples':len(active)})
for name,expected in [('walk',280*420/462),('run',-400*420/462)]:
    result=next((x for x in receipts if x['name']==name and x['terminal']=='ended'),None)
    check('native-'+name+'-lifecycle',result and 'playing' in result['statuses'] and result['realPlayingSamples']>0 and abs(result['deltaX']-expected)<3,receipt=result,expectedDeltaX=expected)
cancelled=next((x for x in receipts if x['name']=='walk' and x['terminal']=='cancelled'),None)
check('native-replacement-cancels-movement',cancelled and cancelled['reason']=='superseded' and cancelled['realPlayingSamples']>0 and cancelled['durationMs']<4000,receipt=cancelled)
busy=next((x for x in receipts if x['terminal']=='failed' and x['reason']=='busy'),None)
check('native-busy-is-real-busy',busy and busy['realPlayingSamples']==0,receipt=busy)
auto=completion('autonomy')
if auto:
    later=[e['at'] for e in events if e['type']=='native-user-command' and e['at']>auto['at']]
    click_file=REPORT/'native-click.json'
    click=json.loads(click_file.read_text()) if click_file.exists() else None
    stop=min(later+([click['before']] if click else [])+[rows[-1]['at']])
    observed=[r for r in rows if auto['at']<=r['at']<stop and sprite(r)]
    sources=list(dict.fromkeys(front(r)['source'] for r in observed if front(r)))
    facings=list(dict.fromkeys(sprite(r)['facing'] for r in observed))
    xs=[sprite(r)['pos']['x'] for r in observed]
    auto_detail={'start':auto['at'],'end':stop,'durationSec':(stop-auto['at'])/1000,'sources':sources,'facings':facings,'xRange':[min(xs),max(xs)] if xs else [],'frozenSamples':sum(sprite(r)['frozen'] for r in observed),'externalAnimCommands':len([e for e in events if auto['at']<e['at']<stop and e['type']=='native-api' and e['route'].startswith('anim?')])}
    check('upstream-autonomy-without-buttons',len(observed)>100 and len(sources)>=3 and len(facings)==2 and max(xs)-min(xs)>100 and auto_detail['frozenSamples']==0 and auto_detail['externalAnimCommands']==0,**auto_detail)
    if click:
        next_command=min([e['at'] for e in events if e['type']=='native-user-command' and e['at']>click['after']]+[click['after']+15000])
        after=[r for r in rows if click['before']<=r['at']<next_command and sprite(r)]
        interaction=[r for r in after if front(r) and front(r)['source']=='react.webm']
        resumed=[r for r in after if interaction and r['at']>interaction[-1]['at'] and front(r) and front(r)['source']!='react.webm' and not sprite(r)['frozen']]
        check('native-body-click-and-autonomy-resume',interaction and resumed,interactionSamples=len(interaction),resumedSources=list(dict.fromkeys(front(r)['source'] for r in resumed)))
def state_check(action,predicate,label):
    event=completion(action)
    end=min([e['at'] for e in events if event and e['type']=='native-user-command' and e['at']>event['at']]+[(event['at']+10000) if event else 0])
    found=next((r for r in rows if event and event['at']<=r['at']<end and predicate(r)),None)
    check(label,found is not None,at=found['at'] if found else None,windowCount=len(found['windows']) if found else None)
    return found
reading=state_check('reading',lambda r:sprite(r) and sprite(r)['sleepPhase']=='loop' and len(renderer(r)['props'])==2,'native-reading-two-independent-props')
work=state_check('work',lambda r:sprite(r) and sprite(r)['workState']=='working' and len(renderer(r)['props'])==0 and front(r)['source']=='work.webm' and front(r)['loop'],'work-interrupts-reading-and-clears-props')
restored=state_check('clear-work',lambda r:sprite(r) and not sprite(r)['workState'] and sprite(r)['sleepPhase']=='loop' and len(renderer(r)['props'])==2,'work-clear-restores-reading')
state_check('interact',lambda r:sprite(r) and not sprite(r)['frozen'] and sprite(r)['sleepPhase']=='loop' and len(renderer(r)['props'])==2,'interaction-restores-reading-intent')
move=completion('move-scene')
if move:
    before=max((r for r in rows if r['at']<move['at']-100 and renderer(r) and len(renderer(r)['props'])==2),key=lambda r:r['at'],default=None)
    after=sample_after(move['at']+1200,lambda r:renderer(r) and len(renderer(r)['props'])==2)
    dx=after['windows'][0]['bounds']['x']-before['windows'][0]['bounds']['x'] if before and after else 0
    check('props-follow-same-native-window-position',before and after and before['windows'][0]['id']==after['windows'][0]['id'] and abs(dx)>100,deltaX=dx)
with_props=[r for r in rows if renderer(r) and len(renderer(r)['props'])==2]
sizes={sprite(r)['size']:r for r in with_props}
ratios=[]
for r in with_props:
    stage=renderer(r)['stages'][0]['box']
    for prop in renderer(r)['props']:
        b=prop['box'];ratios.append({'name':prop['name'],'x':(b['x']-stage['x'])/stage['width'],'y':(b['y']-stage['y'])/stage['height'],'w':b['width']/stage['width'],'h':b['height']/stage['height']})
expected={'book':[.46,.65,.22,.30],'cup':[.67,.72,.095,.22]}
max_error=max((abs(r[key]-expected[r['name']][i]) for r in ratios for i,key in enumerate(['x','y','w','h'])),default=1)
check('prop-scale-and-anchor-follow',420 in sizes and 560 in sizes and max_error<.001,observedSizes=sorted(sizes),maxNormalizedAnchorError=max_error)
state_check('switch',lambda r:renderer(r) and len(renderer(r)['props'])==0 and renderer(r)['stages'][0]['intent']=='reading','skin-switch-clears-old-props')
state_check('restore',lambda r:renderer(r) and len(renderer(r)['props'])==2,'skin-restore-no-duplicate-props')
state_check('disable',lambda r:len(r['windows'])==0,'disable-removes-native-window-and-props')
state_check('enable',lambda r:len(r['windows'])==1 and renderer(r) and len(renderer(r)['props'])==2,'enable-recreates-exactly-one-scene')
errors=list(dict.fromkeys(e for r in rows for e in r['errors']))
adapter_errors=list(dict.fromkeys(e for r in rows if renderer(r) for e in renderer(r).get('debug',{}).get('errors',[])))
blocked=list(dict.fromkeys(e for r in rows for e in r.get('blocked',[])))
console_file=REPORT/'console-final.json'
console=json.loads(console_file.read_text()) if console_file.exists() else {}
check('desktop-console-and-renderer-clean',console_file.exists() and not errors and not adapter_errors and not blocked and not console.get('errors') and not console.get('blocked'),rendererErrors=errors,adapterErrors=adapter_errors,blockedRequests=blocked,consoleErrors=console.get('errors'),consoleBlocked=console.get('blocked'))
check('one-native-pet-window',max(len(r['windows']) for r in rows)==1,maxWindowCount=max(len(r['windows']) for r in rows))
value={'at':rows[-1]['at'],'epoch':epoch,'result':'pass' if all(c['pass'] for c in checks) else 'incomplete-or-failed','passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks,'playbacks':receipts,'note':'Desktop-only isolated mechanism experiment; old sleep clips represent sitting. No formal DSH/client or production skin acceptance.'}
(REPORT/'desktop-verification.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'result':value['result'],'passed':value['passed'],'total':value['total'],'remaining':[c['name'] for c in checks if not c['pass']]},ensure_ascii=False))
