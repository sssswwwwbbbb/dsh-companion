"""Freeze immutable inputs, actual private runtime files and bounded evidence."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/dsh-commander-native-2026-11-05'
LAB = ROOT / '.local/dsh-commander-native-20261105'
KEY = json.loads((REPORT / 'candidate.json').read_text())['contentKey']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def index(name, paths, scope):
    files = []
    for p in sorted(set(paths)):
        if not p.is_file():
            raise RuntimeError('Missing freeze file: ' + str(p))
        files.append({'path': str(p.relative_to(ROOT)), 'sha256': digest(p.read_bytes()), 'bytes': p.stat().st_size})
    result = {'at': datetime.now(timezone.utc).isoformat(), 'scope': scope, 'fileCount': len(files),
              'digest': digest(json.dumps(files, separators=(',', ':'), ensure_ascii=False).encode()), 'files': files}
    (REPORT / name).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return {'files': len(files), 'digest': result['digest']}


source = []
for item in json.loads((ROOT / 'reports/dsh-workspace-r2-2026-11-05/source-freeze.json').read_text())['files']:
    if item['path'].startswith('.local/dsh-workspace-r2-20261105/'):
        source.append(ROOT / item['path'].replace('.local/dsh-workspace-r2-20261105/', '.local/dsh-commander-native-20261105/'))
for directory in [ROOT / 'experiments/dsh-commander-native', LAB / 'design-source', LAB / 'staging/packages/dsh-skin-core/adapters']:
    source.extend(p for p in directory.rglob('*') if p.is_file() and '__pycache__' not in str(p))
runtime = []
for item in json.loads((ROOT / 'reports/dsh-walk-native-2026-11-05/runtime-freeze.json').read_text())['files']:
    if '/skin-assets/' in item['path']:
        continue
    mapped = item['path'].replace('.local/dsh-walk-native-20261105/', '.local/dsh-commander-native-20261105/').replace('/a07562cb2bd2d8f7/', '/c45201e07f747f3a/').replace('cf3039e001e969cd02e9d86608e73953f1c39be31ff5bd88379016acd57fe9d5', KEY)
    runtime.append(ROOT / mapped)
for directory in [LAB / 'staging/packages/dsh-companion/skins/archive-workspace-r2-private',
                  LAB / 'host-home/companion/c45201e07f747f3a/skin-packages' / KEY,
                  LAB / 'host-home/companion/c45201e07f747f3a/skin-assets' / KEY,
                  LAB / 'staging/packages/dsh-companion/skin-core/adapters',
                  LAB / 'staging/packages/dsh-companion/runtime/darwin-arm64/DSHCompanion.app/Contents/Resources/app/skin-core/adapters']:
    runtime.extend(p for p in directory.rglob('*') if p.is_file())
print(json.dumps({'source': index('source-freeze.json', source, 'Current private implementation and immutable copies of approved design inputs; original frozen R2/walk remain separate'),
                  'runtime': index('runtime-freeze.json', runtime, 'Actual private app binaries, built client and adapters, registries, cached126 resources and loaded native media; credentials/state/logs excluded')}))
doc = ROOT / 'docs/dsh-commander-native-2026-11-05.md'
if doc.is_file():
    evidence = [p for p in REPORT.rglob('*') if p.is_file() and p.name not in ['evidence-freeze.json', 'receipt.json']]
    print(json.dumps({'evidence': index('evidence-freeze.json', evidence + [doc], 'Review artifacts and one outward entry; paths relative to repository root; index and receipt excluded')}))
