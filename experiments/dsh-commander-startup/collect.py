"""Bind the review to the final isolated desktop processes, bytes, and receipts."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / '.local/dsh-commander-startup-20261105'
REPORT = ROOT / 'reports/dsh-commander-startup-2026-11-05'
EXPERIMENT = ROOT / 'experiments/dsh-commander-startup'
STAGE = LAB / 'staging'
PLUGIN = STAGE / 'packages/dsh-companion'
SUPERVISOR = PLUGIN / 'runtime/darwin-arm64/DSHCompanion.app'
PAYLOAD = SUPERVISOR / 'Contents/Resources/app'
DOC = ROOT / 'docs/dsh-commander-startup-2026-11-05.md'


def load(file):
    return json.loads(file.read_text())


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def aggregate(items):
    return hashlib.sha256(json.dumps(items, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def freeze(paths):
    rows = [{'path': str(p.relative_to(ROOT)), 'sha256': digest(p), 'bytes': p.stat().st_size}
            for p in sorted(set(paths))]
    return {'fileCount': len(rows), 'digest': aggregate(rows), 'files': rows}


def verify_old(rel, kind):
    idx = load(ROOT / 'reports' / rel / (kind + '-freeze.json'))
    files = idx['files']
    bad = [x['path'] for x in files if not (ROOT / x['path']).is_file()
           or digest(ROOT / x['path']) != x['sha256']
           or ('bytes' in x and (ROOT / x['path']).stat().st_size != x['bytes'])]
    return {'matched': len(files) - len(bad), 'count': len(files), 'different': bad, 'recordedDigest': idx['digest']}


def process(pid, expected):
    command = subprocess.check_output(['/bin/ps', '-p', str(pid), '-o', 'comm='], text=True).strip()
    if Path(command) != expected:
        raise ValueError('Wrong running executable: ' + str(pid))
    return {'pid': pid, 'executable': command}


candidate = load(REPORT / 'candidate.json')
key = candidate['contentKey']
media = load(REPORT / 'media.json')
assert digest(ROOT / media['source']) == media['sourceSha256']
native = load(REPORT / 'final-live-status.json')['value']
assert native['ready'] and native['skin']['phase'] == 'ready' and native['skin']['contentKey'] == key
assert native['settings'] == dict(autoStart=False, startupEnabled=False, launcherEnabled=False, reducedMotion=False)
assert not native['startup']['playing'] and not native['startup']['visible']
assert len(native['backend']['windows']) == 1 and native['backend']['windows'][0]['visible']
runtime = load(LAB / 'host-runtime.json')
state = Path(runtime['stateDir'])
ui = load(LAB / 'host-ui-ready.json')
host_paths = [
    process(native['hostPid'], Path('/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness')),
    process(ui['pid'], LAB / 'DshPetHost.app/Contents/MacOS/Electron'),
    process(native['supervisorPid'], SUPERVISOR / 'Contents/MacOS/Electron'),
    process(native['backend']['pid'], LAB / 'DshHostPetBackend.app/Contents/MacOS/Electron'),
]
capture = load(REPORT / 'native-live-handoff-capture.json')
assert capture['contentKey'] == key and capture['generation'] == native['skin']['generation']
assert 0 <= capture['snapshotRequestedAt'] - capture['at'] < 330
trace = load(state / 'runtime-events.json')
shutil.copyfile(state / 'runtime-events.json', REPORT / 'cold-and-visual-runtime-events.json')
for src, dest in [(LAB / 'host-window-events.jsonl', 'native-workspace-window-events.jsonl'),
                  (LAB / 'commander-client-events.jsonl', 'workspace-presentation-events.jsonl'),
                  (REPORT / 'host-events.jsonl', 'host-events-frozen.jsonl')]:
    shutil.copyfile(src, REPORT / dest)
assert any(json.loads(l).get('presentationId') == candidate['presentation'] or candidate['presentation'] in l
           for l in (REPORT / 'workspace-presentation-events.jsonl').read_text().splitlines())
assert not (LAB / 'host-ui-errors.jsonl').exists()
checks = {}
for name in ['manual', 'escape', 'stop', 'switch', 'reduced', 'cold']:
    result = load(REPORT / (name + '-native.json'))
    assert result['passed'] and result['petVisibleDuringOpening'] == 0
    assert result['playing']['skin']['contentKey'] == key and result['playing']['page']['available']
    start = next(event for event in result['events'] if event['type'] == 'intro-start')
    display = next(event for event in result['events'] if event['type'] == 'intro-presented')
    terminal = next(event for event in result['events'] if event['type'] in ('intro-cancelled', 'intro-complete'))
    assert start['ownerPid'] == result['playing']['hostPid'] and start['bounds'] == result['playing']['startup']['bounds']
    assert display['assetSha256'] == (media['poster'] if name == 'reduced' else media['video'])['sha256']
    checks[name] = {'receipt': name + '-native.json', 'ownerPid': start['ownerPid'], 'generation': start['generation'],
                    'bounds': start['bounds'], 'media': display['media'], 'loadedSha256': display['assetSha256'],
                    'visibleSamples': result['openingSamples'], 'terminal': terminal['type'],
                    'trigger': terminal.get('trigger', terminal.get('reason')), 'elapsedOnScreenMs': terminal['at'] - display['at']}
for name in ['accepted-draft-before','manual-before','manual-after','escape-after','stop-after','switch-after',
             'reduced-after','cold-before','cold-workspace-during','cold-after','final-desktop']:
    ax = (REPORT / (name + '.ax.txt')).read_text()
    assert 'row (selected) 指挥官接入验收 · 当前本地会话' in ax
    assert any('文本输入区' in l and l.endswith('Value: Commander draft retained across sessions.') for l in ax.splitlines())
for name in ['manual','escape','reduced','cold']:
    ax = load(REPORT / (name+'-native.json'))
    assert ax['playing']['supervisorPid'] == ax['after']['supervisorPid']
    assert ax['playing']['backend']['pid'] == ax['after']['backend']['pid']
cold = load(REPORT / 'cold-native.json')
assert cold['before']['startup']['coldPending'] and not cold['before']['page']['available']
assert cold['after']['startup']['completions'] == 1 and not cold['after']['startup']['playing']
assert sum(e['type'] == 'cold-intro-request' for e in trace['transitions']) == 1
assert len({e['sessionId'] for e in trace['transitions'] if e.get('sessionId')}) == 1
assert not any(e['type'] in ['intro-finish-failed','cold-intro-failed','start-failed'] for e in trace['transitions'])

prereviews = {name:{kind:verify_old(dir,kind) for kind in kinds}
              for name,dir,kinds in [
                  ('R2','dsh-workspace-r2-2026-11-05',['source','runtime']),
                  ('walk','dsh-walk-native-2026-11-05',['source','runtime']),
                  ('H4','dsh-pet-host-2026-11-04/compatibility/h4-lifecycle',['source','runtime']),
                  ('commander-theme-pet','dsh-commander-native-2026-11-05',['source','runtime','evidence'])]}
for name,pairs in prereviews.items():
    for kind,result in pairs.items():
        bad = result['different']
        assert not bad or (name == 'H4' and kind == 'runtime' and len(bad) == 1 and bad[0].endswith('/whole-pet/home/dsh-pet/main-config.jsonc')), (name,kind,bad)

actual_assets = [state / 'skin-assets' / key / media[name]['sha256'] for name in ['video','poster']]
for p in actual_assets:
    assert digest(p) == p.name
for p in [state / 'skin-packages' / key / 'skin.json',
          PLUGIN / 'skins/archive-workspace-r2-private/skin.json']:
    assert hashlib.sha256(json.dumps(load(p),ensure_ascii=False,separators=(',',':')).encode()).hexdigest() == key
registry = LAB / 'backend-template/runtime-candidates.json'
mapping = load(registry)['contents'][key]['media']
actual_pet = [state / 'whole-pet/home/dsh-pet/main-animation/webm' / v['file'] for v in mapping.values()]
for p,v in zip(actual_pet,mapping.values()):
    assert digest(p) == v['sha256']
build = load(REPORT / 'build.json')
for item in build['files']:
    assert digest(PLUGIN / item['file']) == item['sha256']
write(REPORT / 'verification.json', {
    'state': 'passed-local-native-pending-primary-review', 'key': key, 'skinVersion': candidate['version'],
    'dshVersion': native['dshVersion'], 'pluginVersion': native['pluginVersion'], 'desktopVersion': native['desktopVersion'],
    'processes': host_paths, 'generation': native['skin']['generation'], 'presentation': candidate['presentation'],
    'checks': checks, 'restoredSettings': native['settings'], 'automaticColdPlays': 1,
    'extraManualPlayForHandoffScreenshot': True, 'sameOriginalPrivateSessionAndDraft': True,
    'sessionId': next(e['sessionId'] for e in trace['transitions'] if e.get('sessionId')),
    'actualHandoffScreenshot': 'native-live-handoff.jpg', 'scope': 'isolated native Mac desktop; CUA window capture composites transparent sides on white',
    'tests': {'newPassed':3,'newFailed':0,'legacyPassed':5,'legacyPreExistingFailures':2},
    'protection': prereviews,'audioStreams':0,'externalModelCalls':0,'dailyInstallChanged':False,'published':False,
})
sources = [EXPERIMENT / 'native-handoff.patch', ROOT / media['source']]
sources += [p for p in EXPERIMENT.iterdir() if p.is_file()]
sources += [STAGE / line.removeprefix('+++ b/') for line in (EXPERIMENT / 'native-handoff.patch').read_text().splitlines() if line.startswith('+++ b/')]
actual = [PLUGIN / item['file'] for item in build['files']]
actual += [PAYLOAD / 'skin-core/src/schema.mjs', PLUGIN / 'skin-core/src/schema.mjs',
           PLUGIN / 'src/skins.mjs', PLUGIN / 'config/pet-backend-map.json', registry,
           SUPERVISOR / 'Contents/Info.plist', LAB / 'DshPetHost.app/Contents/Info.plist',
           LAB / 'DshHostPetBackend.app/Contents/Info.plist', state / 'skin-packages' / key / 'skin.json',
           PLUGIN / 'skins/archive-workspace-r2-private/skin.json', *actual_assets, *actual_pet]
actual += [Path(p['executable']) for p in host_paths[1:]]
evidence = [p for p in REPORT.iterdir() if p.is_file() and p.name not in ['review-index.json','host-events.jsonl']] + [DOC]
index = {'source': freeze(sources), 'runtime': freeze(actual), 'evidence': freeze(evidence)}
write(REPORT / 'review-index.json', index)
print(json.dumps({k:{'count':v['fileCount'],'digest':v['digest']} for k,v in index.items()}))
