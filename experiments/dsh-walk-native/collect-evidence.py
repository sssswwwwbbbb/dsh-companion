"""Read-only, bounded evidence extraction for this private native walking trial."""
import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/dsh-walk-native-2026-11-05'
LAB = ROOT / '.local/dsh-walk-native-20261105'
STATE = LAB / 'host-home/companion/a07562cb2bd2d8f7'


def read(name):
    return json.loads((REPORT / name).read_text())


def save(name, value):
    (REPORT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def slim(row):
    windows = []
    for w in row.get('windows', []):
        r = w.get('renderer') or {}
        windows.append({'id': w['id'], 'bounds': w['bounds'], 'visible': w['visible'],
                        'sprites': r.get('sprites', []), 'props': r.get('props', []),
                        'videos': [{k: v[k] for k in ['front', 'source', 'time', 'loop', 'paused', 'width', 'height']}
                                   for v in r.get('videos', [])]})
    return {'at': row['at'], 'windows': windows, 'errors': row.get('errors', [])}


rows = [json.loads(line) for line in (STATE / 'whole-pet/telemetry.jsonl').read_text().splitlines()]
natural = [slim(r) for r in rows if 1793845818953 <= r['at'] <= 1793845834453]
user = [slim(r) for r in rows if 1793846143805 <= r['at'] <= 1793846151000]
work = [slim(r) for r in rows if 1793846279800 <= r['at'] <= 1793846289500]
for name, data in [('natural', natural), ('user', user), ('work', work)]:
    save(name + '-native-timeline.json', data)
events = json.loads((STATE / 'runtime-events.json').read_text())
save('native-runtime-events.json', events)
inputs = {}
for line in (STATE / 'whole-pet/backend.log').read_text().splitlines():
    match = re.search(r'\[pet-host-input\] (\{.*\}) \(file:', line)
    if not match:
        continue
    item = json.loads(match.group(1))
    if 1793846143805 <= item['at'] <= 1793846151000:
        inputs[json.dumps(item, sort_keys=True)] = item
save('user-trusted-input.json', sorted(inputs.values(), key=lambda x: x['at']))


def actor(row):
    return row['windows'][0]['sprites'][0]


def front(row):
    return next(v for v in row['windows'][0]['videos'] if v['front'])


walking = [r for r in natural if actor(r)['moving']]
natural_idle = next(r for r in natural if r['at'] >= 1793845830567 and front(r)['source'] == 'master-idle.webm')
user_down = next(x for x in inputs.values() if x['type'] == 'pointerdown')
user_stop = next(r for r in user if r['at'] >= user_down['at'] and not actor(r)['moving'])
work_stop = next(r for r in work if r['at'] >= 1793846285483 and not actor(r)['moving'])
final = read('final-runtime-status.json')['value']
completed = read('work-completed-native.json')['value']
save('desktop-results.json', {
    'scope': 'finite left-facing six-cycle native fitting; implementation-line verification, primary review pending',
    'natural': {'playbackId': 'pb-mw2xhgn9-2', 'rootStart': [1100, 424],
                'rootEnd': actor(natural_idle)['pos'], 'actualDisplacementDIP': 1100 - actor(natural_idle)['pos']['x'],
                'allWalkingY': sorted(set(actor(r)['pos']['y'] for r in walking)),
                'monotonicLeft': all(actor(a)['pos']['x'] >= actor(b)['pos']['x'] for a, b in zip(walking, walking[1:])),
                'walkMediaSecondsObserved': [min(front(r)['time'] for r in walking), max(front(r)['time'] for r in walking)],
                'idleReturnedAt': natural_idle['at'], 'returnHandles': {k: actor(natural_idle)[k] for k in ['moving', 'positionFollow', 'contentMoveActive']},
                'sourceSize': [1920, 1080], 'declaredSeconds': 11.25, 'cycles': 6,
                'laterManualDragExcluded': {'downAt': 1793845843466, 'upAt': 1793845844450}},
    'userInterruption': {'playbackId': 'pb-mw2xofbj-1', 'trustedDown': user_down,
                         'firstObservedRootStop': user_stop, 'stopObservedAfterDownMs': user_stop['at'] - user_down['at'],
                         'settledPositions': sorted(set((actor(r)['pos']['x'], actor(r)['pos']['y']) for r in user if r['at'] >= user_stop['at'])),
                         'terminalEvidence': 'native-runtime-events.json records cancelled at 1793846147884; later direct receipt aged out',
                         'reactEndedAt': 1793846149785, 'idleReturned': True},
    'workInterruption': {'playbackId': 'pb-mw2xrc0e-4', 'originalSendRequestedAt': 1793846283866,
                         'actualTurnStartedAt': 1793846285483, 'firstObservedRootStop': work_stop,
                         'terminalEvidence': 'interrupted-playbacks.json: cancelled, reason superseded, updatedAt 1793846286094',
                         'completion': completed['desktopSkin']['workFeedback'], 'noWalkResume': True,
                         'externalModelCalls': read('work-completed-host.json')['value']['externalModelCalls']},
    'stopRestore': {'beforeFix': 'final-runtime-refreshed.json: live ready backend but sticky SKIN_NATIVE_LOST; excluded',
                    'stopped': read('atomic-stopped.json')['value']['skin']['stopped'],
                    'stoppedBackend': read('atomic-stopped.json')['value']['backend'],
                    'restoredPhase': final['phase'], 'restoredResults': final['skin']['results'],
                    'restoredGeneration': final['skin']['generation'], 'nativeGeneration': final['desktopSkin']['generation'],
                    'restoredBackendPid': final['backend']['pid'], 'restoredBackendReady': final['backend']['ready'],
                    'handles': final['backend']['windows'][0]['renderer']['sprites'][0],
                    'snapshotReadback': read('snapshot-read-race-after.json'), 'lifecyclePredicateUnchanged': True},
    'tests': {'file': 'targeted-tests.tap', 'pass': 6, 'fail': 0,
              'inheritedR2CoreRegression': '63 pass / 5 inherited failures; not rerun or changed in this walk fitting'},
})
save('excluded-attempts.json', {
    'firstNaturalTrial': {'files': ['natural-walk-start.json', 'natural-after.json', 'natural-frames.json'],
                          'result': 'not passed', 'actualDisplacementDIP': 1165,
                          'reason': 'logical 640 media canvas used directly instead of upstream PET_REF_WIDTH=462; corrected distanceRef conversion'},
    'firstUserClick': {'files': ['user-interrupt-start.json', 'user-interrupt-after.json'],
                       'result': 'not an interruption proof', 'walkAt': 1793845996664, 'actualClickAt': 1793846018692,
                       'reason': 'UI guard/refresh delayed input until after natural finite ending'},
    'firstStopRestore': {'file': 'final-runtime-refreshed.json', 'result': 'not passed',
                         'reason': 'non-atomic snapshot publication could expose empty JSON and sticky unavailable; atomic publication only fix'},
})

protected = []
for name in ['reports/dsh-workspace-r2-2026-11-05/source-freeze.json',
             'reports/dsh-workspace-r2-2026-11-05/runtime-freeze.json',
             'reports/dsh-pet-host-2026-11-04/compatibility/h4-lifecycle/source-freeze.json',
             'reports/dsh-pet-host-2026-11-04/compatibility/h4-lifecycle/runtime-freeze.json']:
    index = json.loads((ROOT / name).read_text())
    drift = []
    for item in index['files']:
        p = ROOT / item['path']
        actual = hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
        if actual != item['sha256']:
            drift.append({'path': item['path'], 'expected': item['sha256'], 'actual': actual})
    protected.append({'index': name, 'checked': len(index['files']), 'unchanged': len(index['files']) - len(drift), 'drift': drift})
save('protected-freeze-readback.json', {'checks': protected, 'inheritedH4Exception': 'Previously accepted unused main-config.jsonc pets.0.maxBodyWidthPct=100 regeneration; no new source/media drift'})

files = {}
for name in ['designs/dsh-skin-assets-v3/assets/motion/walk-loop-01.webm',
             '.local/dsh-walk-native-20261105/backend-template/master-walk-left.webm',
             '.local/dsh-walk-native-20261105/host-home/companion/a07562cb2bd2d8f7/whole-pet/home/dsh-pet/main-animation/webm/master-walk-left.webm']:
    p = ROOT / name
    files[name] = {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
unchanged = {}
for name in ['sprite/motion.js', 'sprite/playback.js', 'shared-core.js']:
    a = ROOT / '.local/dsh-workspace-r2-20261105/dsh-pet/runtime/electron-helper' / name
    b = LAB / 'dsh-pet/runtime/electron-helper' / name
    unchanged[name] = {'sha256': hashlib.sha256(b.read_bytes()).hexdigest(), 'unchangedFromR2': a.read_bytes() == b.read_bytes()}
processes = {}
for pid in [40804, 41629, 41700, 42529, final['backend']['pid'], final['pid']]:
    try:
        os.kill(pid, 0)
        processes[str(pid)] = True
    except ProcessLookupError:
        processes[str(pid)] = False
save('runtime-binding.json', {'hostPid': 40727, 'uiPid': 40779, 'supervisorPid': final['pid'],
                              'backendPid': final['backend']['pid'], 'contentKey': final['skin']['selected']['contentKey'],
                              'files': files, 'unchangedUpstreamMovement': unchanged, 'processAlive': processes,
                              'sourceReview': 'reports/coordination/skin-assets-v3-primary/new-media-2026-11-05/review.json',
                              'rawSourceUnchanged': files[next(iter(files))]['sha256'] == 'f7a64c9d56306d34ff82d236a34eef812fcacb4237fb5bee59e847fbab91c6a8'})
print(json.dumps({'collected': True, 'naturalDisplacement': 1100 - actor(natural_idle)['pos']['x'],
                  'userStopObservedMs': user_stop['at'] - user_down['at'],
                  'protected': [{'index': x['index'], 'unchanged': x['unchanged'], 'checked': x['checked']} for x in protected]}))
