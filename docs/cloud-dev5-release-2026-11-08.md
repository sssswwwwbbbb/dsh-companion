# dev.5 云端发布与固定下载入口

日期：2026-11-08。用户明确要求云端同步当前新版，并提供不含版本号的下载地址。本次已发布 Mac ARM64 和 Windows x64 的 `1.1.0-dev.5` / build `10005`，没有修改或上传皮肤包，没有改作者及授权声明，没有执行 Git 提交/标签/推送。

## 固定入口

- Mac ARM64：<https://license-host.invalid/dsh-companion/install/dsh-companion-latest.tgz>
- Windows x64：<https://license-host.invalid/dsh-companion/install/dsh-companion-latest-win32-x64.tgz>

入口始终按平台选择已明确公开发布(publicInstall=true)的最新build，响应为no-store，ETag和下载文件名对应当前真实版本。不会把更高build的私有包或其他平台包通过固定入口放出来。原有带版本号的URL继续固定到原文件并保留immutable缓存。

以后只需按现有publish命令发布新版本并加 --public-install，固定地址自动指向该平台的新公开版本，不需手工复制文件或修改下载链接。已安装用户优先从主题盒子“检查更新”获取签名的确切版本和摘要，再按DSH原生流程安装；固定链接用于日常提供下载安装入口。

## DSH重复安装的边界

用真实RC1 pluginManager及本地小包独立验证：同一固定URL首次安装A成功；服务端切到B后再次输入完全相同URL，DSH先返回already-installed且没有新HTTP请求，因此不能把这个结果归因于pnpm缓存。同路径加新查询参数能够安装B，此项仅作为验证，没有加入产品工作流。

固定地址适合分发下载和首次安装；已安装后的日常升级使用主题盒子“检查更新”，继续下载有版本号及签名摘要的确切包，避免DSH把完全相同来源当作已安装。地址不必反复向用户发送，更新仍走现有入口。证据为 reports/stable-install-review.json；路由及license-flow 10/10也已由独立Agent重跑通过。

## 当前包

| 平台 | 版本/构建 | SHA-256 |
| --- | --- | --- |
| Mac ARM64 | 1.1.0-dev.5 / 10005 | 7f2b908f72cdcd7c81b7a9b337714566ced6994313ec52aa479d126cb59dbec5 |
| Windows x64 | 1.1.0-dev.5 / 10005 | 6364b5f5ab9924222a976a4060ad06d2140bb0aa7668cab18cd14ffc37013b23 |

两包均包含在线/已安装分栏、搜索筛选分页、独立下载队列及最近三个RC兼容；不是仅改云端版本标签。服务端重新计算文件摘要并直接读包内client.js确认新页面和下载方法均存在。

## 验证与边界

- 使用真实dev.3安装包内的更新代码和临时授权，通过官方DSH代理策略验证：两个平台×三个RC共六个签名更新查询，均正确返回dev.5/build10005及各平台摘要；临时授权已撤销，有效授权仍为5个。
- 新版本链接及两个固定链接的公网HEAD/GET均200，长度/ETag/文件名正确；固定入口no-store，旧版本入口继续immutable。
- 固定入口本地回归覆盖空目录404、私有高版本隔离、平台隔离、新版切换/旧ETag失效、当前ETag304、旧链接固定和匿名下载不改授权。license-flow 10/10及JavaScript/JSON检查通过。
- 服务从console7更新到 `20261108-console8-cd44d4d7`，备份在 `<服务器备份目录>`。保留43条授权、11条插件发布及7条皮肤版本记录，管理员和签名身份保持，其他业务服务PID未变化，Nginx配置未变。代码回退目标console7，不覆盖线上授权/领取数据。
- 固定入口部署前后，授权数量、有效授权数量、插件发布列表及皮肤记录均核对保持。证据为 reports/cloud-dev5-release/ 下 publication、verification、server-packages、fixed-urls、stable-service-deployment报告。

用户要求上线不替代Windows人工实机验收。本轮Windows和各完整桌面壳原图标冷启动的待验项仍见 [RC兼容与集中验收](dsh-rc-compatibility-2026-11-08.md)。
