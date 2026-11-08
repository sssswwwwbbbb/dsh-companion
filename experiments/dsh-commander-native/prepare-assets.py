"""Rasterize the existing authored vectors with Commander token colors, offline."""
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / 'designs/dsh-skin-commander-v1'
lab = root / '.local/dsh-commander-native-20261105'
report = root / 'reports/dsh-commander-native-2026-11-05'
output = lab / 'prepared'
output.mkdir(exist_ok=True)
items = json.loads((source / 'icons.json').read_text())
palettes = {'light': {'ink': '#52697e', 'detail': '#17627d'},
            'dark': {'ink': '#9badc2', 'detail': '#83d5ec'}}
records = []
for mode, colors in palettes.items():
    directory = output / 'icons' / mode
    directory.mkdir(parents=True, exist_ok=True)
    for item in items:
        original = source / 'assets/icons' / (item['id'] + '.svg')
        body = item['body'].replace('class="icon-detail"', 'stroke="' + colors['detail'] + '"')
        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="' + colors['ink'] + '" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'
        vector = directory / (item['id'] + '.svg')
        vector.write_text(svg)
        target = directory / (item['id'] + '.png')
        subprocess.run(['/usr/bin/sips', '-s', 'format', 'png', str(vector), '--out', str(target)], check=True, capture_output=True)
        records.append({'id': item['id'], 'mode': mode, 'shapeSource': str(original.relative_to(root)),
                        'shapeSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                        'file': str(target.relative_to(root)), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
cover = output / 'commander-cover.png'
subprocess.run(['/usr/bin/sips', '-s', 'format', 'png', str(source / 'assets/commander-cover.svg'), '--out', str(cover)], check=True, capture_output=True)
(report / 'prepared-assets.json').write_text(json.dumps({'scope': 'existing 56 vector shapes; token palette conversion only; existing authored cover rasterized unchanged',
    'palettes': palettes, 'icons': records, 'cover': {'source': 'designs/dsh-skin-commander-v1/assets/commander-cover.svg',
    'sourceSha256': hashlib.sha256((source / 'assets/commander-cover.svg').read_bytes()).hexdigest(),
    'file': str(cover.relative_to(root)), 'sha256': hashlib.sha256(cover.read_bytes()).hexdigest(), 'width': 960, 'height': 600}}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'iconPairs': len(items), 'cover': str(cover.relative_to(root)), 'buildOnlyRasterizer': 'macOS sips'}))
