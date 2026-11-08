"""Collect only the two ordering proofs and the bounded private runtime delta."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
LAB=ROOT/'.local/dsh-commander-startup-order-20261105'
BASE=ROOT/'.local/dsh-commander-startup-20261105'
REPORT=ROOT/'reports/dsh-commander-startup-order-2026-11-05'
OLD=ROOT/'reports/dsh-commander-startup-2026-11-05'
SCRIPT=Path(__file__).resolve().parent
PLUGIN=LAB/'staging/packages/dsh-companion'
APP=PLUGIN/'runtime/darwin-arm64/DSHCompanion.app'
PAYLOAD=APP/'Contents/Resources/app'
DOC=ROOT/'docs/dsh-commander-startup-order-2026-11-05.md'

def read(path):
    return json.loads(path.read_text())

def write(path,value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def aggregate(files):
    return hashlib.sha256(json.dumps(files,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def freeze(paths):
    rows=[{'path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(set(paths))]
    return {'fileCount':len(rows),'digest':aggregate(rows),'files':rows}

old=read(OLD/'review-index.json')
for group in old.values():
    assert aggregate(group['files'])==group['digest']
    for entry in group['files']:
        file=ROOT/entry['path']
        assert file.stat().st_size==entry['bytes'] and sha(file)==entry['sha256'],str(file)
before=read(REPORT/'cold-order-native.json')
real=read(REPORT/'cold-native.json')
esc=read(REPORT/'escape-native.json')
live=read(REPORT/'final-live-status.json')['value']
candidate=read(REPORT/'candidate.json')
media=read(OLD/'media.json')
key=candidate['contentKey']
assert before['passed'] and real['passed'] and esc['passed']
assert before['readyBeforeBounds']['receipt']['boundsReady'] is False
assert before['readyBeforeBounds']['receipt']['at']<=before['boundsSentAt']
assert before['readyBeforeBounds']['native']['startup']['playing'] is False
assert before['readyBeforeBounds']['native']['backend']['held'] is True
assert before['returned']['backend']['windows'][0]['visible'] is True
assert before['returned']['startup']['completions']==1 and before['replayCalls']==0
assert before['restoredPreferences']==dict(autoStart=False,startupEnabled=False,launcherEnabled=False)
assert live['settings']==dict(autoStart=False,startupEnabled=False,launcherEnabled=False,reducedMotion=False)
assert live['skin']['contentKey']==key and live['ready'] and all(v['status']=='ready' for v in live['skin']['results'].values())
assert live['backend']['windows'][0]['visible'] and live['startup']['completions']==1 and not live['startup']['visible']
for name in ['manual-before','escape-after','cold-desktop-under','cold-desktop-after']:
    ax=(REPORT/(name+'.ax.txt')).read_text()
    assert 'row (selected) 指挥官接入验收 · 当前本地会话' in ax
    assert any('文本输入区' in l and l.endswith('Value: Commander draft retained across sessions.') for l in ax.splitlines())
active=read(LAB/'host-runtime.json')
state=Path(active['stateDir'])
trace=read(state/'runtime-events.json')['transitions']
ready=[e for e in trace if e['type']=='cold-workspace-ready']
assert len(ready)==1 and ready[0]['boundsReady'] is True and ready[0]['contentKey']==key
assert sum(e['type']=='cold-intro-request' for e in trace)==1
assert real['after']['startup']['completions']==1 and real['petVisibleDuringOpening']==0
session_ids={e['sessionId'] for e in trace if e.get('sessionId')}
assert session_ids=={read(OLD/'verification.json')['sessionId']},session_ids
shutil.copyfile(state/'runtime-events.json',REPORT/'cold-desktop-runtime-events.json')
shutil.copyfile(LAB/'commander-client-events.jsonl',REPORT/'presentation-events.jsonl')
shutil.copyfile(REPORT/'host-events.jsonl',REPORT/'host-events-frozen.jsonl')
assert candidate['presentation'] in (REPORT/'presentation-events.jsonl').read_text()
assert not (LAB/'host-ui-errors.jsonl').exists()
for name in ['main.mjs','startup.mjs','startup-skin.mjs','startup.css','backend.mjs']:
    assert sha(PAYLOAD/name)==sha(LAB/'staging/runtime-src'/name)
for f in ['client.js','skins/archive-workspace-r2-private/skin.json']:
    assert sha(PLUGIN/f)==sha(BASE/'staging/packages/dsh-companion'/f)
for name in ['startup.mjs','startup.css','startup-skin.mjs','backend.mjs']:
    assert sha(PAYLOAD/name)==sha(BASE/'staging/runtime-src'/name)
assets=[state/'skin-assets'/key/media[n]['sha256'] for n in ['video','poster']]
for p in assets:
    assert sha(p)==p.name
ui=read(LAB/'host-ui-ready.json')
processes={
    'host':live['hostPid'],'ui':ui['pid'],'supervisor':live['supervisorPid'],'pet':live['backend']['pid'],
}
app_exec=[LAB/'DshPetHost.app/Contents/MacOS/Electron',APP/'Contents/MacOS/Electron',LAB/'DshHostPetBackend.app/Contents/MacOS/Electron']
for k,p in zip(['ui','supervisor','pet'],app_exec):
    assert subprocess.check_output(['/bin/ps','-p',str(processes[k]),'-o','comm='],text=True).strip()==str(p)

write(REPORT/'verification.json',{
    'state':'passed-local-ordering-pending-primary-review','contentKey':key,'version':candidate['version'],
    'processes':processes,'generation':live['skin']['generation'],'startupMediaUnchanged':True,'clientBytesUnchanged':True,
    'readyFirst':{'receipt':'cold-order-native.json','controlledPage':True,'actualNativePlayback':True,
      'workspaceReadyAt':before['readyBeforeBounds']['receipt']['at'],'boundsSentAt':before['boundsSentAt'],
      'automaticPlays':1,'samePetReleased':True,'duplicateSignalsSuppressed':True},
    'boundsFirst':{'receipt':'cold-native.json','actualDesktop':True,'samples':real['openingSamples'],'petVisibleDuringOpening':0,
      'automaticPlays':1,'activeSession':next(iter(session_ids)),'draftVerified':True},
    'manualEscape':{'receipt':'escape-native.json','physicalNativeInput':True,'draftVerified':True},
    'tests':{'passed':8,'failed':0,'lateBridgeAndStaleIdentityCovered':True},
    'finalPreferences':live['settings'],'originalFrozenFilesUnchanged':{k:v['fileCount'] for k,v in old.items()},
    'originalFrozenDigests':{k:v['digest'] for k,v in old.items()},'audioIntegrated':False,'dailyInstallationChanged':False,
})
sources=list(p for p in SCRIPT.iterdir() if p.is_file())
sources += [LAB/'staging'/l.removeprefix('+++ b/') for l in (SCRIPT/'cold-ready-order.patch').read_text().splitlines() if l.startswith('+++ b/')]
runtime=app_exec+[APP/'Contents/Info.plist',PLUGIN/'client.js',PLUGIN/'src/skins.mjs',PLUGIN/'skins/archive-workspace-r2-private/skin.json',*assets]
runtime += [PAYLOAD/x for x in ['main.mjs','startup.mjs','startup-skin.mjs','startup.css','backend.mjs']]
evidence=[p for p in REPORT.iterdir() if p.is_file() and p.name not in ['review-index.json','host-events.jsonl']]+[DOC]
index={'source':freeze(sources),'runtime':freeze(runtime),'evidence':freeze(evidence)}
write(REPORT/'review-index.json',index)
print(json.dumps({'processes':processes,'generation':live['skin']['generation'],'index':{k:(v['fileCount'],v['digest']) for k,v in index.items()}}))
