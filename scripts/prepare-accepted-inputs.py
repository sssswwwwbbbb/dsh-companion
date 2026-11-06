"""Recover the private build inputs from the exact Mac dev.27 acceptance package."""

import argparse
import base64
import hashlib
import re
import shutil
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / ".local/accepted-inputs"
ARCHIVE_SHA = "ce4243371a1f0d1fbbd04ddf3d1bdf243fc6f5552ad52fcd329a59aa30e47f00"
ATLAS_SHA = "81633deff56754df5f2e1c8361ccd00d36e2abdc1b583824f772591bb68ecdbd"
SKINS = ("archive-warm-whale", "archive-workspace-r2-private")
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


def prepare(archive):
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

            client = package.extractfile("package/client.js").read()
            for portrait in re.findall(rb'"portrait":"data:image/png;base64,([\w+/=]+)"', client):
                data = base64.b64decode(portrait, validate=True)
                if hashlib.sha256(data).hexdigest() == ATLAS_SHA:
                    (out / "character-atlas-r2.png").write_bytes(data)
                    break
            else:
                raise ValueError("Missing accepted character atlas")

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
    prepare(parser.parse_args().archive)
