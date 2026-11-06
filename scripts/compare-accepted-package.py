"""Compare regular package files and the embedded runtime payload with an acceptance archive."""

import argparse
import hashlib
import io
import json
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

BUNDLE = "package/runtime-bundles/"
MANIFEST = BUNDLE + "manifest.json"


def digest(stream):
    h = hashlib.sha256()
    with stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def inventory(package):
    with tarfile.open(package) as tar:
        files = {member.name: member for member in tar if member.isfile()}
        names = [name for name in files if name.startswith(BUNDLE) and name.endswith(".zip")]
        if len(names) != 1:
            raise ValueError("Expected exactly one embedded runtime ZIP")
        bundle_name = names[0]
        manifest = json.load(tar.extractfile(files[MANIFEST]))
        with tar.extractfile(files[bundle_name]) as stream:
            bundle = stream.read()
        if hashlib.sha256(bundle).hexdigest() != manifest.pop("sha256"):
            raise ValueError(f"Incorrect embedded runtime checksum in {package}")
        ordinary = {
            name: digest(tar.extractfile(member))
            for name, member in files.items()
            if name not in (MANIFEST, bundle_name)
        }
    with zipfile.ZipFile(io.BytesIO(bundle)) as zipped:
        runtime = {
            entry.filename: digest(zipped.open(entry))
            for entry in zipped.infolist()
            if not entry.is_dir() and not PurePosixPath(entry.filename).name.startswith("._")
        }
    return ordinary, (bundle_name, manifest), runtime


def compare(label, original, rebuilt):
    added = sorted(rebuilt.keys() - original.keys())
    removed = sorted(original.keys() - rebuilt.keys())
    changed = sorted(name for name in original.keys() & rebuilt.keys() if original[name] != rebuilt[name])
    print(f"{label}: {len(original)} accepted, {len(rebuilt)} rebuilt")
    for kind, paths in (("added", added), ("removed", removed), ("changed", changed)):
        for path in paths:
            print(f"  {kind}: {path}")
    return not (added or removed or changed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("accepted", type=Path)
    parser.add_argument("rebuilt", type=Path)
    args = parser.parse_args()
    old_files, old_bundle, old_runtime = inventory(args.accepted)
    new_files, new_bundle, new_runtime = inventory(args.rebuilt)
    ok = compare("Outer files (excluding ZIP and manifest)", old_files, new_files)
    ok = compare("Runtime files (excluding AppleDouble)", old_runtime, new_runtime) and ok
    if old_bundle != new_bundle:
        print("Runtime bundle name or manifest metadata changed")
        ok = False
    raise SystemExit(0 if ok else 1)
