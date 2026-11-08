# 主题盒子

DeepSeek Harness 桌面插件，提供启动动画、桌宠、皮肤配置和设备授权。

安装包不内置皮肤：皮肤从云端皮肤库安装到本机，未安装皮肤时不播放开机动画。

当前版本为 **1.1.0-dev.5 / build 10005**，包含在线／已安装分栏、搜索筛选分页、独立下载队列及最近三个 RC 的兼容。Mac ARM64 与 Windows x64 从同源出包，沿用原插件身份、授权和配置。最近 Windows 用户实机验收为 dev.3；dev.5 的官方 Host 验证与待集中实机项见 [RC 兼容验收记录](docs/dsh-rc-compatibility-2026-11-08.md)。1.0 封版记录作为历史基线保留。

[开发说明与素材清单](docs/skin-kit-v1/README.md) · [配置参考](docs/skin-author-reference.md) · [历史验收与复建](docs/accepted-build-baseline.md) · [1.0 封版与实机清单](docs/theme-box-v1.0.0-freeze-2026-11-08.md)

Mac 用 `npm run package:mac`；Windows 用 `python3 experiments/dsh-windows-w1/build.py`。安装包和本地验证报告与 Git 提交、远端发布、用户实机验收分别记录。

- `packages/dsh-companion`：插件入口、Host 逻辑及页面模板。
- `packages/dsh-skin-core`：皮肤合同、状态协调和适配器。
- `runtime-src`：桌面运行时和桌宠适配代码。
- `experiments/dsh-windows-w0`、`experiments/dsh-windows-w1`：Windows 历史探针与当前打包配方。

项目的私有 GitHub 仓库为 [sssswwwwbbbb/dsh-companion](https://github.com/sssswwwwbbbb/dsh-companion)，默认分支 `main`。

作者：Dr.S（笔名）。授权：专有商业授权，条款见 [LICENSE](LICENSE)；商业使用及对外分发须经作者书面授权，授权申请发至 swbzzzz2021@163.com。

授权服务的运维脚本与部署说明只保留在所有者本机，不随仓库发布。角色素材的原作者、许可及非商业使用范围见 [素材声明](designs/dsh-companion-v1/ASSET-NOTICE.txt)。
