"""Recover the private build inputs from the exact Mac dev.27 acceptance package."""

import argparse
import hashlib
import json
import shutil
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / ".local/accepted-inputs"
ARCHIVE_SHA = "ce4243371a1f0d1fbbd04ddf3d1bdf243fc6f5552ad52fcd329a59aa30e47f00"
SKINS = ("archive-workspace-r2-private",)
RUNTIME = "DSHCompanion.app/Contents/Resources/app/pet-backend/dsh-pet/"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def copy_member(path, stream):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as out:
        shutil.copyfileobj(stream, out)


def prepare(archive, replace_existing=False):
    if not replace_existing:
        for name, version in [("archive-workspace-r2-private", "0.4.0")]:
            manifest = TARGET / "skins" / name / "skin.json"
            if manifest.exists() and json.loads(manifest.read_text())["version"] != version:
                raise ValueError("Build inputs contain an upgraded skin. Use --replace-existing only when intentionally restoring the dev.27 baseline.")
    if digest(archive) != ARCHIVE_SHA:
        raise ValueError("Expected the archived Mac dev.27 package (SHA-256 mismatch)")
    TARGET.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="accepted-inputs-", dir=TARGET.parent) as work:
        work = Path(work)
        out = work / "inputs"
        with tarfile.open(archive) as package:
            for member in package.getmembers():
                name = PurePosixPath(member.name)
                if not member.isfile() or name.parts[:2] != ("package", "skins"):
                    continue
                if len(name.parts) < 4 or name.parts[2] not in SKINS or ".." in name.parts:
                    continue
                with package.extractfile(member) as stream:
                    copy_member(out.joinpath(*name.parts[1:]), stream)
            for skin in SKINS:
                if not (out / "skins" / skin / "skin.json").is_file():
                    raise ValueError("Missing accepted skin: " + skin)

            archive_path = work / "mac-runtime.zip"
            with package.extractfile("package/runtime-bundles/DSHCompanion-darwin-arm64.zip") as stream:
                copy_member(archive_path, stream)
            with zipfile.ZipFile(archive_path) as bundle:
                for entry in bundle.infolist():
                    if entry.is_dir() or not entry.filename.startswith(RUNTIME):
                        continue
                    path = PurePosixPath(entry.filename[len(RUNTIME):])
                    if ".." in path.parts or any(part.startswith(".") for part in path.parts):
                        continue
                    if path.parts[:1] == ("lib",) or path.parts[:2] == ("assets", "pic"):
                        with bundle.open(entry) as stream:
                            copy_member(out.joinpath("pet-backend", *path.parts), stream)
        if not (out / "pet-backend/lib/app.js").is_file() or not (out / "pet-backend/assets/pic/cursor-grab.png").is_file():
            raise ValueError("Missing accepted pet backend inputs")
        if TARGET.exists():
            shutil.rmtree(TARGET)
        out.rename(TARGET)
    print(TARGET)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Verified Mac dev.27 acceptance package")
    parser.add_argument("--replace-existing", action="store_true", help="Replace upgraded inputs with the original dev.27 baseline")
    args = parser.parse_args()
    prepare(args.archive, args.replace_existing)
