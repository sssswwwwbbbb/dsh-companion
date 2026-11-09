# Theme Box

[中文](README.md) · English

A DeepSeek Harness desktop plugin that provides the startup animation, a desktop pet, skin configuration and device licensing.

The installer ships no skins. Skins are imported as ZIP packages; without one, the startup animation does not play.

Current release: **1.1.3 / build 10016**, with the skin library and installed tabs, search/filter/pagination, a dedicated download queue, and compatibility with the last three DSH release candidates. Mac ARM64 and Windows x64 are built from the same source and keep the original plugin identity, settings and local licensing. The 1.0 freeze record remains as a historical baseline.

[Authoring guide and asset list](docs/skin-kit-v1/README.md) · [Configuration reference](docs/skin-author-reference.md) · [Historic acceptance and rebuild](docs/accepted-build-baseline.md) · [1.0 freeze record](docs/theme-box-v1.0.0-freeze-2026-11-08.md)

Build from source:

```sh
node scripts/fetch-electron.mjs all   # downloads and verifies Electron 45.2.1 (Mac and Windows)
npm run package:mac                   # Mac package
python3 experiments/dsh-windows-w1/build.py   # cross-build the Windows package from the Mac package
```

Self-built packages use a placeholder service URL. To point at your own service, write the address to `.local/cloud/service-url.txt` before building. Packages and local verification reports are recorded separately from Git commits, releases and end-user acceptance.

- `packages/dsh-companion`: plugin entry, host logic and page templates.
- `packages/dsh-skin-core`: skin contract, state coordination and adapters.
- `runtime-src`: desktop runtime and pet adapter.
- `experiments/dsh-windows-w0`, `experiments/dsh-windows-w1`: Windows probes and the current packaging recipe.

Repository: [sssswwwwbbbb/dsh-companion](https://github.com/sssswwwwbbbb/dsh-companion), default branch `main`.

Author: Dr.S (pen name).

This project is open source. The code is licensed under **AGPL-3.0-or-later**; see [LICENSE](LICENSE). If you cannot meet the AGPL obligations, a commercial license is available — see [NOTICE.md](NOTICE.md). Skin and character assets are licensed separately; see each skin's `ASSET-NOTICE.txt`.

See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute and [SECURITY.md](SECURITY.md) to report security issues. Operational scripts and deployment notes for the licensing service stay on the owner's machine and are not part of this repository. Upstream asset attribution is kept in [ASSET-NOTICE.txt](designs/dsh-companion-v1/ASSET-NOTICE.txt).

For the community build (no licensing service), see [community guide](docs/user-guide/社区版.md); packages come from GitHub Releases, not from the author server.
