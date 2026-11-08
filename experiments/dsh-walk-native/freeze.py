"""Freeze the bounded source, loaded runtime and review evidence for this trial."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/dsh-walk-native-2026-11-05'
LAB = ROOT / '.local/dsh-walk-native-20261105'
OLD = '.local/dsh-workspace-r2-20261105'
NEW = '.local/dsh-walk-native-20261105'
KEY = 'cf3039e001e969cd02e9d86608e73953f1c39be31ff5bd88379016acd57fe9d5'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save_index(name, paths, scope):
    files = []
    for p in sorted(set(paths)):
        files.append({'path': str(p.relative_to(ROOT)), 'sha256': digest(p.read_bytes()), 'bytes': p.stat().st_size})
    result = {'at': datetime.now(timezone.utc).isoformat(), 'scope': scope, 'fileCount': len(files),
              'digest': digest(json.dumps(files, separators=(',', ':'), ensure_ascii=False).encode()), 'files': files}
    (REPORT / name).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def mapped(name):
    result = []
    for item in json.loads((ROOT / 'reports/dsh-workspace-r2-2026-11-05' / name).read_text())['files']:
        p = item['path'].replace(OLD, NEW).replace('/e4d136e3260d7b96/', '/a07562cb2bd2d8f7/').replace('45fd34eef50be7b3e17e6cbfed3c545e0506379910c489868673b27cee43fe22', KEY)
        result.append(ROOT / p)
    return result


sources = mapped('source-freeze.json') + [p for p in (ROOT / 'experiments/dsh-walk-native').rglob('*') if p.is_file() and '__pycache__' not in str(p)]
sources.append(ROOT / 'designs/dsh-skin-assets-v3/assets/motion/walk-loop-01.webm')
runtime = mapped('runtime-freeze.json') + [LAB / 'atomic-snapshot.cjs', LAB / 'backend-template/master-walk-left.webm',
    LAB / 'host-home/companion/a07562cb2bd2d8f7/whole-pet/home/dsh-pet/main-animation/webm/master-walk-left.webm']
for directory in [LAB / 'staging/packages/dsh-companion/skins/archive-workspace-r2-private',
                  LAB / 'host-home/companion/a07562cb2bd2d8f7/skin-packages' / KEY,
                  LAB / 'host-home/companion/a07562cb2bd2d8f7/skin-assets' / KEY]:
    runtime.extend(p for p in directory.rglob('*') if p.is_file())
missing = [str(p.relative_to(ROOT)) for p in sources + runtime if not p.is_file()]
if missing:
    raise RuntimeError('Missing mapped freeze files: ' + json.dumps(missing))
source_index = save_index('source-freeze.json', sources, 'Accepted R2 mechanisms reused, new finite walk sources, fixed registry and source media; original R2 protected separately')
runtime_index = save_index('runtime-freeze.json', runtime, 'Private native binaries, helpers, built code, candidate resources, loaded media and actual configuration after atomic stop/restore')
print(json.dumps({'source': {'files': source_index['fileCount'], 'digest': source_index['digest']},
                  'runtime': {'files': runtime_index['fileCount'], 'digest': runtime_index['digest']}}))

if (ROOT / 'docs/dsh-walk-native-2026-11-05.md').is_file():
    excluded = {'evidence-freeze.json', 'receipt.json'}
    evidence = [p for p in REPORT.rglob('*') if p.is_file() and p.name not in excluded]
    evidence.append(ROOT / 'docs/dsh-walk-native-2026-11-05.md')
    index = save_index('evidence-freeze.json', evidence, 'Review artifacts and single outward document; paths relative to repository; receipt and evidence index excluded')
    print(json.dumps({'evidence': {'files': index['fileCount'], 'digest': index['digest']}}))
