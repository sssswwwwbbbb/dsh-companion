from pathlib import Path
from io import BytesIO
import datetime
import hashlib
import json
import tarfile
import zipfile

root = Path(__file__).resolve().parent.parent
metadata = json.loads((root / 'packages/dsh-companion/package.json').read_text())
version = metadata['version']
artifact = root / 'dist' / (metadata['name'].lstrip('@').replace('/','-') + '-' + version + '.tgz')
with tarfile.open(artifact) as archive:
    names = archive.getnames()
    private = [name for name in names if any(x in name for x in ['signing-private.pem','admin.token','database.json','activation.json','license.json','node_modules/','.local/','.ssh/'])]
    package = json.load(archive.extractfile('package/package.json'))
    config = json.load(archive.extractfile('package/config/service.json'))
    patch = 'package/' + package['dsh']['bundle']['patch'].removeprefix('./')
    zipped = archive.extractfile('package/runtime-bundles/DSHCompanion-darwin-arm64.zip').read()
    with zipfile.ZipFile(BytesIO(zipped)) as app:
        base = 'DSHCompanion.app/Contents/Resources/app/'
        inner = json.loads(app.read(base + 'config/service.json'))
        runtime = json.loads(app.read(base + 'package.json'))
        notice = base + 'ASSET-NOTICE.txt' in app.namelist()
        core_matches = app.read(base+'license-core.mjs') == (root/'packages/dsh-companion/src/license-core.mjs').read_bytes()
checks = {'privateFilesExcluded': not private, 'bundlePatchIncluded': patch in names,
          'desktopAndPluginConfigMatch': inner == config, 'desktopVersionMatches': runtime['version'] == version,
          'cloudEndpoint': config['serviceUrl'] == 'https://license-host.invalid/dsh-companion',
          'assetNoticeIncluded': notice, 'dshEnginePinned': package['engines']['dsh'] == '0.2.1-rc.5',
          'nativeLicenseVerifierMatchesPlugin':core_matches,
          'officialProxyPeerDeclared': package['peerDependencies'].get('@deepseek-ai/dsh-http-proxy') == '0.2.1-rc.5'}
report = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': version,
          'name': package['name'], 'files': len(names), 'sizeBytes': artifact.stat().st_size,
          'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(), 'checks': checks,
          'privateFiles': private, 'passed': all(checks.values()), 'signing': 'ad-hoc-development'}
(root / 'reports/cloud-package-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if report['passed'] else 1)
