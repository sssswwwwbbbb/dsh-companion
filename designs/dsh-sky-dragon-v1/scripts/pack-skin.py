#!/usr/bin/env python3
"""把 skin/ 目录打成可分发的皮肤 ZIP。

用法：python3 scripts/pack-skin.py [输出路径]
清单里的 bytes / sha256 已由 build-skin.mjs 写入，本脚本只负责打包与校验。
"""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

here = Path(__file__).resolve().parent
root = (here / ".." / "skin").resolve()
manifest = json.loads((root / "skin.json").read_text(encoding="utf-8"))
output = Path(sys.argv[1]) if len(sys.argv) > 1 else (here / ".." / f"duelist-sky-dragon-{manifest['version']}.zip").resolve()
files = {}
for key, asset in manifest["assets"].items():
    relative = asset["path"]
    source = (root / relative).resolve()
    if not source.is_relative_to(root) or relative == "skin.json":
        raise SystemExit(f"非法资源路径: {relative}")
    data = source.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if len(data) != asset["bytes"] or digest != asset["sha256"]:
        raise SystemExit(f"资源与清单不一致: {relative}（改过素材后请先跑 build-skin.mjs）")
    files[relative] = data

if output.exists():
    output.unlink()
license_file = here.parent / "delivery" / "LICENSE.md"
with ZipFile(output, "x", compression=ZIP_DEFLATED) as archive:
    archive.writestr("skin.json", json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
    if license_file.exists():
        archive.writestr("LICENSE.md", license_file.read_bytes())
    for relative, data in sorted(files.items()):
        archive.writestr(relative, data)

print(hashlib.sha256(output.read_bytes()).hexdigest(), output)
