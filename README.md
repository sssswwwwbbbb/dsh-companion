# DSH 陪伴

DeepSeek Harness 桌面插件，提供启动动画、桌宠、皮肤配置和设备授权。

当前仓库基线是已验收的 **Mac arm64 `0.1.0-dev.27`** 和 **Windows x64 `0.1.0-dev.31`**。构建与验证见 [验收基线复建说明](docs/accepted-build-baseline.md)。两个平台各自保留原安装包身份；复建仅用于开发验证。

- `packages/dsh-companion`：插件入口、Host 逻辑及页面模板。
- `packages/dsh-skin-core`：皮肤合同、状态协调和适配器。
- `runtime-src`：桌面运行时和桌宠适配代码。
- `experiments/dsh-windows-w0`、`experiments/dsh-windows-w1`：Windows 探针与 dev.31 打包配方。

项目的私有 GitHub 仓库为 [sssswwwwbbbb/dsh-companion](https://github.com/sssswwwwbbbb/dsh-companion)，默认分支 `main`。

授权服务与管理页仍按 [部署说明](deploy/README.md) 维护。角色素材的原作者、许可及非商业使用范围见 [素材声明](designs/dsh-companion-v1/ASSET-NOTICE.txt)。
