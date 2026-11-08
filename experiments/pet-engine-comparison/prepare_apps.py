"""Clone only the clean shared Electron runtime into private experiment apps."""
from pathlib import Path
import plistlib, subprocess
ROOT = Path(__file__).resolve().parents[2]
base = ROOT / '.cache/electron/45.2.1/darwin-arm64/Electron.app'
if not base.exists():
    raise SystemExit('Requires the already verified clean Electron 45.2.1 cache: ' + str(base))
lab = ROOT / '.local/pet-engine-comparison-20261104'
for name, suffix in [('DshPetComparison', 'dshpet'), ('PhaserComparison', 'phaser'), ('UpstreamPetNative', 'native')]:
    target = lab / (name + '.app')
    if not target.exists(): subprocess.run(['/usr/bin/ditto', str(base), str(target)], check=True)
    file = target / 'Contents/Info.plist'; info = plistlib.loads(file.read_bytes())
    info.update(CFBundleIdentifier='local.dsh.engine-comparison.' + suffix, CFBundleName=name, CFBundleDisplayName=name)
    file.write_bytes(plistlib.dumps(info))
print('Private Electron comparison apps prepared; source/runtime profiles unchanged')
