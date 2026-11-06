import argparse
import hashlib
import io
import json
import shutil
import tarfile
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("mac_package", type=Path)
parser.add_argument("electron_zip", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
recipe = Path(__file__).resolve().parent

def sha256(file):
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

assert sha256(args.mac_package) == "ce4243371a1f0d1fbbd04ddf3d1bdf243fc6f5552ad52fcd329a59aa30e47f00"
assert sha256(args.electron_zip) == "7c342aee45d5b4ccafe5dfe9037028796b082735a576e21e2b4e2d8422ebb727"

with tarfile.open(args.mac_package, "r:gz") as package, zipfile.ZipFile(args.electron_zip) as electron:
    app = "DSHCompanion.app/Contents/Resources/app/"
    skin = "package/skins/archive-workspace-r2-private/"
    manifest = json.load(package.extractfile(skin + "skin.json"))
    runtime = package.extractfile("package/runtime-bundles/DSHCompanion-darwin-arm64.zip").read()
    with zipfile.ZipFile(io.BytesIO(runtime)) as donor, zipfile.ZipFile(
        args.output, "x", zipfile.ZIP_DEFLATED, compresslevel=1
    ) as output:
        for name in electron.namelist():
            if not name.endswith("/") and name != "resources/default_app.asar":
                with electron.open(name) as source, output.open(name, "w") as target:
                    shutil.copyfileobj(source, target)
        for name in donor.namelist():
            if name.startswith(app) and not name.endswith("/") and name not in (app + "entry.mjs", app + "backend.mjs"):
                output.writestr("resources/app/" + name[len(app):], donor.read(name))

        backend = donor.read(app + "backend.mjs").decode()
        env_line = "const env={HOME:process.env.HOME,PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,"
        assert backend.count(env_line) == 1
        win_env = """const windowsEnv=process.platform==='win32'
   ? Object.fromEntries(['SystemRoot','WINDIR','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP'].map(name=>[name,process.env[name]]))
   : {};
  const env={...windowsEnv,DSH_PET_GPU_SANDBOX:'1',HOME:process.env.HOME,PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,"""
        output.writestr("resources/app/backend.mjs", backend.replace(env_line, win_env))
        entry = """if(process.env.DSH_COMPANION_PET_WORKER!=='1') await import('./windows-w0.mjs');
else if(process.env.DSH_PET_DPI_PROBE==='1') await import('./pet-backend/dsh-pet/runtime/electron-helper/main.js');
else await import('./pet-backend/worker.cjs');
"""
        output.writestr("resources/app/entry.mjs", entry)
        output.write(recipe / "probe.mjs", "resources/app/windows-w0.mjs")
        backend_skin = json.loads(donor.read(app + "pet-backend/skin.json"))
        for asset in backend_skin["media"].values():
            content = package.extractfile(skin + manifest["assets"][asset["id"]]["path"]).read()
            assert hashlib.sha256(content).hexdigest() == asset["sha256"]
            output.writestr("resources/app/w0-media/" + asset["file"], content)
        output.writestr(
            "README.txt",
            "DSH Companion Windows x64 desktop pet probe\n"
            "Extract the entire ZIP and open electron.exe in the extracted directory.\n"
            "The pet resizes in place and exits. Check DSH-W0-result.json beside electron.exe.\n"
            "This probe uses a temporary profile and runs separately from the DSH application.\n",
        )

with zipfile.ZipFile(args.output) as output:
    assert output.testzip() is None
    with output.open("electron.exe") as binary:
        assert binary.read(2) == b"MZ"
print(json.dumps({"sha256": sha256(args.output), "artifact": str(args.output), "bytes": args.output.stat().st_size}))
