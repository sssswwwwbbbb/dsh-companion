# Mac dev.27 / Windows dev.31 验收基线

以下复建命令对应基线提交 `5963502`。从该提交准备独立构建目录，即可还原文档所列版本。

Mac 生产源码来自 `.local/dsh-cold-start-dev27-release/` 冻结目录，并与同版验收包核对。Windows dev.31 以本次从同一源码构建出的 Mac dev.27 包和 Windows Electron 为输入，应用原验收配方的 Windows 差异并打包。原始 Mac dev.27 归档提供构建素材；原始 W0、Windows dev.31 归档只用于历史复验和内容对照。

## 固定输入

在仓库根目录执行以下命令。请向项目维护者获取验收归档；表中路径是干净检出后建议存放的位置。原验收归档位于原仓库 `dist/`，Electron 缓存在 `.cache/electron/45.2.1/`。

| 建议路径 | SHA-256 |
| --- | --- |
| `.local/acceptance/dsh-plugin-companion-0.1.0-dev.27.tgz` | `ce4243371a1f0d1fbbd04ddf3d1bdf243fc6f5552ad52fcd329a59aa30e47f00` |
| `.local/acceptance/dsh-companion-w0-win32-x64.zip` | `5b093f8c993488e9d4956b58f225019ce347826b00ea871e0e6b84b19943177a` |
| `.local/acceptance/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz`（对照包） | `10a2e14073eb6ed7dc9984846a08ebdc492a1b811bc842ac71f7580c1b7e722a` |
| `.cache/electron/45.2.1/electron-v45.2.1-darwin-arm64.zip` | `a9a1a0a5b64df714957f83467c84823cb34792205922c6f136550b2403605922` |
| `.cache/electron/45.2.1/electron-v45.2.1-win32-x64.zip` | `7c342aee45d5b4ccafe5dfe9037028796b082735a576e21e2b4e2d8422ebb727` |

使用 Node **24.14.0**、npm **11.9.0**、Python **3.9.6** 复验。Mac arm64 构建需要 Xcode Command Line Tools（`clang`）和系统自带的 `ditto`、`codesign`、`PlistBuddy`。Electron 固定为 [45.2.1 官方发布](https://github.com/electron/electron/releases/tag/v45.2.1)。插件的 `fflate 0.8.2`、`undici 8.11.2` 固定版本，DSH peer 由宿主提供；测试用 npm 依赖见根目录及 `licensing/` 锁文件。

两套皮肤、角色图集和 dsh-pet 预编译依赖及光标从已核验 Mac 包提取到忽略目录。dsh-pet 0.4.1 的桌面辅助源码沿用随组件附带的 [MIT 许可](../runtime-src/pet-backend/dsh-pet/LICENSE)。已有角色样片遵循[原有声明](../designs/dsh-companion-v1/ASSET-NOTICE.txt)；复建不扩大素材的使用或传播许可。输入、生成结果、运行状态和授权凭据均不提交。

## 构建 Mac arm64

```sh
mac=.local/acceptance/dsh-plugin-companion-0.1.0-dev.27.tgz
python3 scripts/prepare-accepted-inputs.py "$mac"
npm run package:mac
python3 scripts/audit-package.py
python3 scripts/compare-accepted-package.py "$mac" dist/dsh-plugin-companion-0.1.0-dev.27.tgz
```

产出 `dist/dsh-plugin-companion-0.1.0-dev.27.tgz`，使用本地临时签名。构建生成 `client.js`、随包皮肤和 `skin-core` 副本。

```sh
npm ci
npm --prefix licensing ci
npm run check
npm run check:skin
npm test
npm run verify:geometry:mac
```

`npm test` 在测试前生成客户端；服务测试使用临时本地授权库，无需管理员密码、云端密钥或真实用户配置。

## 构建 Windows x64

先按上节生成 `dist/dsh-plugin-companion-0.1.0-dev.27.tgz`，再执行以下命令（已在 Mac arm64 复验）：

```sh
mkdir -p dist
python3 experiments/dsh-windows-w1/build.py \
  --mac-package dist/dsh-plugin-companion-0.1.0-dev.27.tgz \
  --electron-zip .cache/electron/45.2.1/electron-v45.2.1-win32-x64.zip \
  --output dist/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz
python3 scripts/compare-accepted-package.py \
  .local/acceptance/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz \
  dist/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz
```

`build.py` 校验 Mac 版本和内嵌运行时 SHA，以及 Windows Electron 的固定 SHA；检查脚本语法和 x64 PE 标头，并拒绝覆盖既有输出。Mac 产物中的插件和桌面应用文件进入 Windows 构建，原 W0 的环境变量/DPI 探针适配和 W1 的入口、托盘、授权等平台差异仍保留。可用 `python3 experiments/dsh-windows-w0/build-runtime.py <原Mac验收包> <Windows Electron ZIP> <探针输出ZIP>` 单独复建历史 W0。

现有 Windows 自动验证入口位于 [W1 配方目录](../experiments/dsh-windows-w1/)：`verify-autoplay.mjs <解出的dev.31 package目录>` 使用 POSIX 夹具模拟 Windows 进程查询，覆盖两版 DSH 的开场流程；`verify-capabilities.mjs <解出的dev.28 package目录> <解出的dev.31 package目录> <解出的dev.31 ZIP内 resources/app目录>` 覆盖从 dev.28 状态恢复主题、开场、桌宠和原地调整尺寸。可选的 dev.28 历史对照包来自原仓库 `dist/dsh-plugin-companion-0.1.0-dev.28-win32-x64.tgz`，SHA-256 为 `10017ac8cc779ac4f39aab2eb754811bc5d633e4363062e26b2d353e93ef25d9`。

## 比对口径

与原验收包相比，Mac 外层 189 个、桌面 ZIP 内 386 个常规文件；Windows 外层 188 个、桌面 ZIP 内 187 个常规文件。两平台的路径和内容均一致；ZIP 本身及记录其摘要的 manifest 会因打包元数据变化而改变，Mac 复建去掉了 AppleDouble 条目。原验收包的身份和原生验收记录继续独立保留。复建、自动回归和归档比对不代表重新安装、分发或实机验收。旧独立启动器说明与 `scripts/verify-workflow-host.mjs` 属于早期 MVP 流程，不作为此版本的验收入口。已有私有发布命令仍以 DSH rc.5 为发布参数，Windows 私有更新渠道尚未实施，留待后续 W3；本基线不改授权服务或管理页。


## dev.35 制作基线

源码提交为 `77730c2`。从该提交使用同一套历史素材输入和固定 Electron 归档重建。Mac 使用 `npm run package:mac`，Windows 使用本提交的 `experiments/dsh-windows-w1/build.py`，供给同版 Mac 包与固定 Windows Electron。111 项测试通过。重建的 Mac 和 Windows 包均与原归档逐文件核对，比较包内常规文件、运行时文件及运行时清单元数据。

| dev.35 原归档 | SHA-256 |
| --- | --- |
| Mac ARM64 | `ce4171100738460388c747d9614c23198c46206c80be77b0c53530a313b17d1d` |
| Windows x64 | `75d94845e152f82e6df1995bd45dab96d09fc2977dbba7126c373eab075d580c` |

归档时间等封装元数据可产生不同的包摘要。需要比对源码复建结果时，用 `scripts/compare-accepted-package.py` 对照原包内容。制作方优先使用原验收包及[离线工具](skin-author-reference.md)。
