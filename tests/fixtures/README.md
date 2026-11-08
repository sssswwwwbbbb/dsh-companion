# 测试夹具皮肤

`archive-workspace-r2-private/` 是测试专用皮肤，来自 1.0.0 发布包内的同一套皮肤，仅用于回归用例。

- 安装包自 1.0.1 起不再内置皮肤；皮肤从云端皮肤库安装。
- 因此 `tests/skin-library.test.mjs`、`tests/pet-activities.test.mjs`、`tests/pet-memory.test.mjs`、`tests/shared-character.test.mjs` 改为读取本目录。
- 本目录不参与打包，`package.json` 的 `files` 和构建脚本不引用它。
- 版权与授权同仓库根目录 `LICENSE`；夹具随仓库私有，不对外分发。
