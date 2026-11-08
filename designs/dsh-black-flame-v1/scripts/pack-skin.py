# -*- coding: utf-8 -*-
"""把 skin/ 打成可导入 ZIP，并复核清单与资源一致。

运行：python3 scripts/pack-skin.py [输出文件名]
默认输出 black-flame-<version>.zip。
"""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
SKIN = ROOT / "skin"


def main():
    global SKIN
    args = [a for a in sys.argv[1:]]
    if args and not args[0].startswith("-"):
        SKIN = (ROOT / args.pop(0)).resolve()
    manifest = json.loads((SKIN / "skin.json").read_text(encoding="utf-8"))
    output = Path(args[0]) if args else ROOT / f"{manifest['id']}-{manifest['version']}.zip"
    if output.exists():
        output.unlink()

    files = {}
    total = 0
    for asset_id, asset in manifest["assets"].items():
        relative = asset["path"]
        source = (SKIN / relative).resolve()
        if not source.is_relative_to(SKIN) or relative == "skin.json":
            raise SystemExit(f"非法资源路径：{relative}")
        data = source.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if len(data) != asset["bytes"] or digest != asset["sha256"]:
            raise SystemExit(f"资源与清单不一致：{relative}")
        files[relative] = data
        total += len(data)

    if len(manifest["assets"]) > 128:
        raise SystemExit("资源超过 128 项")
    if total > 128 * 1024 * 1024:
        raise SystemExit("资源合计超过 128 MiB")

    with ZipFile(output, "x", compression=ZIP_DEFLATED) as archive:
        archive.writestr("skin.json", json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
        for relative, data in files.items():
            archive.writestr(relative, data)

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(f"{output.name}  {len(files)} 项 / {total / 1048576:.2f} MiB / "
          f"ZIP {output.stat().st_size / 1048576:.2f} MiB")
    print(f"sha256  {digest}")


if __name__ == "__main__":
    main()
