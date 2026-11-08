"""Build the Windows DSH plugin from the matching Mac package and the official Electron archive."""

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / "packages/dsh-companion/package.json").read_bytes())["version"]
PLATFORM = "win32-x64"
MAC_RUNTIME = "DSHCompanion-darwin-arm64.zip"
ELECTRON_SHA = "7c342aee45d5b4ccafe5dfe9037028796b082735a576e21e2b4e2d8422ebb727"
MAC_APP = "DSHCompanion.app/Contents/Resources/app/"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def replace(path, old, new, count=1):
    content = path.read_text(encoding="utf-8")
    if content.count(old) != count:
        raise ValueError(f"Unexpected baseline in {path.name}: {old}")
    path.write_text(content.replace(old, new), encoding="utf-8")


def adapt_plugin(plugin):
    metadata = plugin / "package.json"
    package = json.loads(metadata.read_bytes())
    package.update(
        version=VERSION,
        description="主题盒子 · DSH Windows x64 主题插件",
        os=["win32"],
        cpu=["x64"],
    )
    package["files"].remove("bin")
    write_json(metadata, package)

    controller = plugin / "src/controller.mjs"
    replace(controller, "'APPDATA','LOCALAPPDATA','DISPLAY'", "'APPDATA','LOCALAPPDATA','TEMP','TMP','DISPLAY'")
    replace(controller,
        "  async executable(){\n    if(process.platform!=='darwin'||process.arch!=='arm64')",
        "  supportsNativeRuntime(){return process.platform==='win32'&&process.arch==='x64';}\n"
        "  async executable(){\n    if(!this.supportsNativeRuntime())")
    for module in ("native", "startup"):
        replace(plugin / f"skin-core/adapters/{module}.mjs",
                "available(){return process.platform==='darwin'&&process.arch==='arm64';}",
                "available(){return this.controller.supportsNativeRuntime();}")
    replace(controller,
        "const relative='DSHCompanion.app/Contents/MacOS/Electron',development=join(packageRoot,'runtime','darwin-arm64',relative);\n    if(existsSync(development))return development;",
        "const relative='electron.exe';")
    replace(controller, "'DSHCompanion-darwin-arm64.zip'", "'DSHCompanion-win32-x64.zip'")
    replace(controller, "manifest.platform!=='darwin-arm64'", "manifest.platform!=='win32-x64'")
    replace(controller,
        "try{await execute('/usr/bin/ditto',['-x','-k',archive,temporary],{env:childEnvironment(process.env,{}),timeout:30000});",
        """const tar=join(process.env.SystemRoot||process.env.WINDIR||'C:\\\\Windows','System32','tar.exe');
    try{await execute(tar,['-xf',archive,'-C',temporary],{env:childEnvironment(process.env,{}),timeout:90000,windowsHide:true});""")
    replace(controller, "async installLauncher(){this.entitlement.require();this.integration.record(this.dshVersion);if(!this.settings().launcherEnabled)await this.configure({launcherEnabled:true});await this.integration.install(await this.executable());return this.status();}",
        "async installLauncher(){throw new Error('PLATFORM_UNSUPPORTED');}")
    license_core = plugin / "src/license-core.mjs"
    replace(license_core, "import { execFileSync } from 'node:child_process';",
        "import { execFileSync } from 'node:child_process';\nimport { join } from 'node:path';")
    source = license_core.read_text(encoding="utf-8")
    replace(license_core, source[source.index("  if (process.platform"):source.index("  return cachedDevice;", source.index("  if (process.platform"))], r"""  if (process.platform !== 'win32') throw new Error('PLATFORM_UNSUPPORTED');
  const registry = join(process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows', 'System32', 'reg.exe');
  let guid;
  try {
    const output = execFileSync(registry, ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'], {
      encoding: 'utf8', timeout: 3000, windowsHide: true
    });
    guid = output.match(/^\s*MachineGuid[ \t]+REG_SZ[ \t]+([\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})\s*$/im)?.[1];
  } catch {}
  if (!guid) throw new Error('DEVICE_ID_UNAVAILABLE');
  cachedDevice = createHash('sha256').update(productId + ':win-device-v1:' + guid.toUpperCase()).digest('hex');
""")

    # The renderer injection owns automatic playback. Keep the desktop
    # component's native player for the existing manual preview.
    replace(plugin / "index.js", "controller.boot({playIntro:playIntroOnBoot})", "controller.boot()")
    opening = plugin / "src/desktop-opening.mjs"
    replace(opening, "The official Mac Desktop shell forks this Host and sets DSH_CLIENT_VERSION.",
            "The official Desktop shell starts this Host with IPC and DSH_CLIENT_VERSION.")
    replace(opening, "process.platform!=='darwin'||process.arch!=='arm64'",
            "!controller.supportsNativeRuntime()")
    replace(opening, """  const born=execFileSync('/bin/ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8',timeout:400}).trim();
  return born?`${pid} ${born}`:null;""", r"""  const executable=path.join(process.env.SystemRoot||process.env.WINDIR||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const script=`(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks`;
  const born=execFileSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{
    encoding:'utf8',timeout:1600,windowsHide:true,
  }).trim();
  return /^\d{18}$/.test(born)?`win32:${pid}:${born}`:null;""")
    # The Windows native controls occupy the top 40 DIP on both target hosts.
    replace(opening, "skip.style.cssText='position:absolute;top:16px;right:16px;",
            "skip.style.cssText='position:absolute;"
            "top:calc(12px + max(40px, env(titlebar-area-y, 0px) + env(titlebar-area-height, 40px)));"
            "right:16px;-webkit-app-region:no-drag;")

    client = plugin / "client.js"
    replace(client, "check('startupEnabled','startupEnabled',!active),", "")
    replace(client, "h('p',{className:'dshc-note'},t('desktopOpeningIntro')),", "")
    replace(client, "h(Row,{title:autoPlayLabel,description:",
            "modules.startup?.values?.handoffSeconds&&h(Row,{title:autoPlayLabel,description:")
    replace(client, "macOS 的减少动态效果同样生效。", "系统的减少动态效果同样生效。")
    (plugin / "README.md").write_text((Path(__file__).parent / "plugin-readme.md").read_text(encoding="utf-8"), encoding="utf-8")


def build_runtime(mac_runtime, electron_zip, plugin, work):
    archive = plugin / "runtime-bundles" / "DSHCompanion-win32-x64.zip"
    archive.parent.mkdir()
    runtime_app = work / "resources" / "app"
    runtime_app.mkdir(parents=True)
    prefix = "resources/app/"
    adapted_names = {"entry.mjs", "backend.mjs", "main.mjs", "package.json", "license-core.mjs"}
    with zipfile.ZipFile(mac_runtime) as donor, zipfile.ZipFile(electron_zip) as electron, zipfile.ZipFile(
        archive, "w", zipfile.ZIP_DEFLATED, compresslevel=1
    ) as output:
        for name in electron.namelist():
            if not name.endswith("/") and name != "resources/default_app.asar":
                with electron.open(name) as source, output.open(name, "w") as target:
                    shutil.copyfileobj(source, target)

        for entry in donor.infolist():
            if entry.is_dir() or not entry.filename.startswith(MAC_APP):
                continue
            name = entry.filename.removeprefix(MAC_APP)
            if PurePosixPath(name).name.startswith("._") or name == "tray-win.png":
                continue
            with donor.open(entry) as source:
                if name in adapted_names:
                    with (runtime_app / name).open("xb") as target:
                        shutil.copyfileobj(source, target)
                else:
                    with output.open(prefix + name, "w") as target:
                        shutil.copyfileobj(source, target)

        # The accepted W0 worker needs the Windows environment and DPI probe.
        env_line = "const env={HOME:process.env.HOME,PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,"
        win_env = """const windowsEnv=process.platform==='win32'
   ? Object.fromEntries(['SystemRoot','WINDIR','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP'].map(name=>[name,process.env[name]]))
   : {};
  const env={...windowsEnv,DSH_PET_GPU_SANDBOX:'1',HOME:process.env.HOME,PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,"""
        replace(runtime_app / "backend.mjs", env_line, win_env)
        replace(runtime_app / "entry.mjs",
                "if(process.env.DSH_COMPANION_PET_WORKER==='1')await import('./pet-backend/worker.cjs');\n"
                "else await import('./main.mjs');",
                "if(process.env.DSH_COMPANION_PET_WORKER!=='1') await import('./main.mjs');\n"
                "else if(process.env.DSH_PET_DPI_PROBE==='1') await import('./pet-backend/dsh-pet/runtime/electron-helper/main.js');\n"
                "else await import('./pet-backend/worker.cjs');")
        package = runtime_app / "package.json"
        metadata = json.loads(package.read_bytes())
        metadata["version"] = VERSION
        write_json(package, metadata)

        main = runtime_app / "main.mjs"
        replace(main, "tray.setTitle(usesWorker()?'07':'鲸');", "if(process.platform==='darwin')tray.setTitle(usesWorker()?'07':'鲸');")
        replace(main, "tray=new Tray(nativeImage.createEmpty());", "tray=new Tray(nativeImage.createFromPath(join(root,'tray-win.png')).resize({width:32,height:32}));")
        replace(main, "if(openingDsh)return;", "if(process.platform!=='darwin'||openingDsh)return;")
        shutil.copyfile(plugin / "src/license-core.mjs", runtime_app / "license-core.mjs")

        for name in sorted(adapted_names):
            output.write(runtime_app / name, prefix + name)
        output.write(ROOT / "runtime-src/tray-win.png", prefix + "tray-win.png")

    with zipfile.ZipFile(archive) as runtime:
        if runtime.testzip() is not None:
            raise ValueError("Invalid runtime archive")
        with runtime.open("electron.exe") as exe:
            header = exe.read(64)
            exe.seek(struct.unpack_from("<I", header, 60)[0])
            if header[:2] != b"MZ" or exe.read(6) != b"PE\0\0\x64\x86":
                raise ValueError("Expected a Windows x64 Electron executable")

    write_json(archive.parent / "manifest.json", {
        "schemaVersion": 1, "platform": PLATFORM, "version": VERSION, "sha256": sha256(archive)
    })
    return runtime_app


def unpack_mac(mac_package, work):
    runtime = work / MAC_RUNTIME
    with tarfile.open(mac_package) as donor:
        manifest = json.load(donor.extractfile("package/runtime-bundles/manifest.json"))
        metadata = json.load(donor.extractfile("package/package.json"))
        if (manifest["platform"], manifest["version"], metadata["version"], metadata["name"]) != (
            "darwin-arm64", VERSION, VERSION, "dsh-plugin-companion"
        ):
            raise ValueError(f"Windows build requires the matching Mac plugin package ({VERSION})")
        with donor.extractfile(f"package/runtime-bundles/{MAC_RUNTIME}") as source, runtime.open("xb") as target:
            shutil.copyfileobj(source, target)
        if sha256(runtime) != manifest["sha256"]:
            raise ValueError("Mac runtime checksum does not match its manifest")

        for member in donor:
            name = PurePosixPath(member.name)
            if not member.isfile() or name.parts[:1] != ("package",):
                continue
            if ".." in name.parts:
                raise ValueError(f"Unsafe path in Mac package: {member.name}")
            if name.parts[1:2] in (("bin",), ("runtime-bundles",)):
                continue
            target = work.joinpath(*name.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with donor.extractfile(member) as source, target.open("xb") as dest:
                shutil.copyfileobj(source, dest)
    return runtime


def build(mac_package, electron_zip, output):
    if sha256(electron_zip) != ELECTRON_SHA:
        raise ValueError("Windows Electron 45.2.1 x64 archive checksum mismatch")
    if output.exists():
        raise FileExistsError(output)

    with tempfile.TemporaryDirectory(prefix="dsh-w1-") as temporary:
        work = Path(temporary)
        mac_runtime = unpack_mac(mac_package, work)
        plugin = work / "package"
        adapt_plugin(plugin)
        runtime = build_runtime(mac_runtime, electron_zip, plugin, work)
        for path in [*plugin.glob("*.js"), *plugin.glob("src/*.mjs"), *runtime.glob("*.mjs")]:
            subprocess.run(["node", "--check", str(path)], check=True)

        pack = subprocess.run(["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", str(work)],
                              cwd=plugin, check=True, capture_output=True, text=True)
        packed = work / json.loads(pack.stdout)[0]["filename"]
        with output.open("xb") as target, packed.open("rb") as source:
            shutil.copyfileobj(source, target)

    print(json.dumps({"artifact": str(output), "sha256": sha256(output), "bytes": output.stat().st_size}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mac-package", type=Path, default=ROOT / f"dist/dsh-plugin-companion-{VERSION}.tgz")
    parser.add_argument("--electron-zip", type=Path, default=ROOT / ".cache/electron/45.2.1/electron-v45.2.1-win32-x64.zip")
    parser.add_argument("--output", type=Path, default=ROOT / f"dist/dsh-plugin-companion-{VERSION}-{PLATFORM}.tgz")
    args = parser.parse_args()
    build(args.mac_package, args.electron_zip, args.output.resolve())
