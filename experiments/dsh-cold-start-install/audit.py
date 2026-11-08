import hashlib
import io
import json
import plistlib
import re
import sys
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

root = Path(__file__).resolve().parents[2]
artifact, output = map(Path, sys.argv[1:3])
reference = root / ".local/dsh-commander-cold-start-20261105"
legacy = root / ".local/dev19-candidate-80tc_gs4"
digest = lambda data: hashlib.sha256(data).hexdigest()
version_match = re.fullmatch(r"dsh-plugin-companion-(0\.1\.0-dev\.(22|23|24|25|26|27))\.tgz", artifact.name)
assert version_match is not None
version, build = version_match.groups()
supported_hosts = ["0.2.1-rc.5", "0.2.2-rc.1"] if int(build) >= 27 else ["0.2.1-rc.5"]
private_parts = {
    ".local", ".cache", "node_modules", "tests", "examples", "reports", "fixtures",
    "bridge.json", "settings.json", "license.json", "activation.json", "signing-private.pem",
    "admin.token", "host-runtime.json", "snapshot.json", "backend-template", "smoke.js",
}
private_literals = (
    b"<本机路径> b"DSH_HOST_PET_LAB", b"picker-fixture.json",
    b"isolated-host-return", b"DSH_PET_SMOKE_OUT",
)


def clean_name(name):
    path = PurePosixPath(name)
    assert not path.is_absolute() and ".." not in path.parts, name
    assert not (set(path.parts) & private_parts), name


def clean_source(name, value):
    if Path(name).suffix in {".json", ".js", ".cjs", ".mjs", ".md", ".html", ".txt", ".yml"}:
        for marker in private_literals:
            assert marker not in value, (name, marker)
        assert not re.search(rb"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----", value), name


with tarfile.open(artifact, "r:gz") as outer:
    files = {member.name: member for member in outer.getmembers() if member.isfile()}
    assert all(member.isfile() or member.isdir() for member in outer.getmembers())
    for name in files:
        clean_name(name)
        assert name.startswith("package/") and not name.startswith("package/runtime/"), name

    def packed(relative):
        return outer.extractfile(files["package/" + relative]).read()

    for name in files:
        if not name.endswith(".zip"):
            clean_source(name, outer.extractfile(files[name]).read())

    plugin = json.loads(packed("package.json"))
    assert plugin["version"] == version and plugin["engines"]["dsh"] == " || ".join(supported_hosts)
    for dependency in ("@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-http-proxy"):
        assert plugin["peerDependencies"][dependency] == " || ".join(supported_hosts)
    assert plugin["os"] == ["darwin"] and plugin["cpu"] == ["arm64"]
    bundle = json.loads(packed("runtime-bundles/manifest.json"))
    zipped = packed("runtime-bundles/DSHCompanion-darwin-arm64.zip")
    assert bundle["version"] == version and bundle["sha256"] == digest(zipped)
    expected_service = json.loads((legacy / "packages/dsh-companion/config/service.json").read_bytes())
    expected_service["supportedDsh"] = supported_hosts
    service_bytes = packed("config/service.json")
    assert json.loads(service_bytes) == expected_service
    skins = {}
    for directory, source in (
        ("archive-warm-whale", legacy),
        ("archive-workspace-r2-private", reference / "staging"),
    ):
        base = "skins/" + directory + "/"
        raw = packed(base + "skin.json")
        assert raw == (source / "packages/dsh-companion" / base / "skin.json").read_bytes()
        manifest = json.loads(raw)
        for value in manifest["assets"].values():
            data = packed(base + value["path"])
            assert len(data) == value["bytes"] and digest(data) == value["sha256"]
        skins[manifest["id"]] = {"version": manifest["version"], "assets": len(manifest["assets"])}
    with zipfile.ZipFile(io.BytesIO(zipped)) as inner:
        assert inner.testzip() is None
        for name in inner.namelist():
            clean_name(name)
        app = "DSHCompanion.app/Contents/Resources/app/"
        for name in inner.namelist():
            if name.startswith(app) and not name.endswith("/"):
                clean_source(name, inner.read(name))
        assert inner.read(app + "config/service.json") == service_bytes
        assert inner.read(app + "ASSET-NOTICE.txt") == (legacy / "designs/dsh-companion-v1/ASSET-NOTICE.txt").read_bytes()
        pet = app + "pet-backend/dsh-pet/"
        assert inner.read(pet + "LICENSE") == (reference / "dsh-pet/LICENSE").read_bytes()
        executables = [name for name in inner.namelist() if name.endswith(".app/Contents/MacOS/Electron")]
        assert executables == ["DSHCompanion.app/Contents/MacOS/Electron"]
        assert not any(name.startswith(pet + "assets/webm/") for name in inner.namelist())
        for file in ("motion.js", "playback.js", "input.js"):
            name = "runtime/electron-helper/sprite/" + file
            if int(build) >= 25 and file == "playback.js":
                assert digest(inner.read(pet + name)) == "2eeef7d58328d8042bce99d0f53bacea357c593cf2636dcac70227e126b3cb74"
            else:
                assert inner.read(pet + name) == (reference / "dsh-pet" / name).read_bytes()
        native_meta = json.loads(inner.read(app + "package.json"))
        assert native_meta["version"] == version and native_meta["main"] == "entry.mjs"
        app_meta = plistlib.loads(inner.read("DSHCompanion.app/Contents/Info.plist"))
        assert app_meta["CFBundleVersion"] == build
        inner_files = len([name for name in inner.namelist() if name.startswith(app) and not name.endswith("/")])

result = {
    "artifact": str(artifact.resolve()), "bytes": artifact.stat().st_size,
    "sha256": digest(artifact.read_bytes()), "runtimeZipSha256": bundle["sha256"],
    "outerFiles": len(files), "nativePayloadFiles": inner_files, "skins": skins,
    "assetHashesMatch": True, "signing": bundle["localSigning"], "privateFilesIncluded": False,
}
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False))
