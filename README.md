# 主题盒子

DeepSeek Harness 桌面插件，提供启动动画、桌宠、皮肤配置和设备授权。

已验收的基线为 **Mac arm64 `0.1.0-dev.27`** 和 **Windows x64 `0.1.0-dev.31`**，对应提交 `5963502`。[验收基线复建说明](docs/accepted-build-baseline.md)

Windows 已验收 `0.1.0-dev.37` 的工作反馈与桌宠动作。当前 `0.1.0-dev.38` 修复 DSH 0.2.2-rc.1 工作区导航和控件的皮肤图标命中，并支持导入皮肤的卡片封面。皮肤作者使用对应版本的[制作与校验说明](docs/skin-author-reference.md)。Windows DSH `0.2.2-rc.1` 上的 W3 覆盖升级基线为 `0.1.0-dev.32`。Mac 用 `npm run package:mac` 构建，Windows 用 `python3 experiments/dsh-windows-w1/build.py` 从同一次 Mac 构建及固定 Electron 输入出包。授权和设置沿用原插件身份。Windows 首次跨版本通过 DSH「添加插件」覆盖安装本地包，之后可从「授权与更新」查找私有安装包。

- `packages/dsh-companion`：插件入口、Host 逻辑及页面模板。
- `packages/dsh-skin-core`：皮肤合同、状态协调和适配器。
- `runtime-src`：桌面运行时和桌宠适配代码。
- `experiments/dsh-windows-w0`、`experiments/dsh-windows-w1`：Windows 历史探针与当前打包配方。

项目的私有 GitHub 仓库为 [sssswwwwbbbb/dsh-companion](https://github.com/sssswwwwbbbb/dsh-companion)，默认分支 `main`。

授权服务与管理页仍按 [部署说明](deploy/README.md) 维护。角色素材的原作者、许可及非商业使用范围见 [素材声明](designs/dsh-companion-v1/ASSET-NOTICE.txt)。
