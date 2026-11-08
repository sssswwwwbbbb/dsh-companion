# 独立验收返工回执：F1、F2、F3

日期：2026-11-03（Asia/Shanghai）。本轮为底座工作线修复与复验，不替代总体协调的再次独立验收。

原始独立回执 `docs/skin-foundation-acceptance-2026-11-03.md` 和 `reports/skin-foundation-acceptance-2026-11-03/` 原样保留。其结论仍是 M0 已声明范围通过、原 M1/M2 候选暂不通过。新证据单独写入 `reports/skin-foundation-rework-2026-11-03/`。

## 逐项修复

| 发现 | 修改 | 复验重点 |
| --- | --- | --- |
| F1 / P1：独立停止未取消在途原生激活 | 原生增加本地 revision 与持久停止锁；检查加载前、媒体 ready 后、回执及显现前。requestStop 不擅自推进 Host generation。未消费请求、自动恢复和旧回滚不能解除锁。只有对应当前 Host pending 的显式恢复操作可以在实际 ready 后解除 | 加载多个阶段、ready 回调内部、窗口显示前、Host 暂停、重启和请求仅消费一次、显式恢复 |
| F2 / P1：页面重新握手排入旧 A 覆盖新 B | 协调器记录进行中/待处理选择；页面接续当前命令，提交前确认当前页面身份。恢复需求保留到当前意图完成：B 成功时不另排 A；准备失败时才恢复仍然提交的内容。停止文件在页面 poll 前消费，避免重连重放旧 apply | 准备、页面应用、原生等待、提交确认、提交写入、最新选择及停止优先 |
| F3 / P2：忙碌时停止入口被锁 | 停止使用独立高优先级路径，按钮仅在本次停止自身进行时禁用；普通请求/状态轮询以 revision 失效，旧 finally 不解开新请求，迟到结果不能改写停止 UI | 原生鼠标点击真实停止按钮、普通成功响应延迟至停止后返回、重复点击与恢复；预期停止取消不显示普通失败 |

核心文件：runtime-src/skin.mjs、runtime-src/main.mjs、packages/dsh-skin-core/src/coordinator.mjs、src/state.mjs、adapters/page-mailbox.mjs、adapters/native.mjs；入口适配在 packages/dsh-companion/src/skins.mjs、client.template.js、client-requests.mjs。

在 Host 暂时不可用后，页面退出命令会留在 mailbox 内等待当前页面实际确认，最多使用原定 8 秒。没有把租期过期或通道失联虚构为清理完成；超时仍进入故障。Host 与原生 generation 保持同一来源，原生本地 revision 仅用于本端失效。

## 本线最终复验结果

| 检查 | 结果 | 新证据 |
| --- | --- | --- |
| 原独立反例原样重跑 | 2/2 通过 | after-races.json |
| 自动测试 | 62/62 通过，包含原有 42 项和新增 20 项 | all-tests.txt、race-regressions.txt |
| M0 合同包检查 | 6/6 符合预期（3 合法＋3 拒绝） | contract-checks.json |
| 定向隔离 GUI | 6/6 通过；含源码一致检查、两项原生鼠标停止、B 等待期重载、Host 暂停 4.5 秒和主动恢复 | gui-races.json |
| 原隔离宿主联调 | 23/23 重新通过 | isolated-host.json |
| dev.11 新进程启动回归 | 5/5 重新通过 | cold-regression.json |
| 构建、语法与差异格式 | 通过 | build-final.txt、syntax.txt、源码 diff 检查 |

本线修复与复验通过，候选可交回再次独立验收；这不是总体协调的最终验收放行，也不是用户真实客户端试用结果。

## 合同与兼容边界

formatVersion=2、theme/pet interfaceVersion=1/configVersion=1、公开配置与资源字段不变，首套内容无需重制。内部原生操作文件新增 operationId / resumeStop，ready 回执有本地 revision；这些由同一插件构建单位产生和验证，不是皮肤作者字段。自动恢复与回滚不携带显式恢复许可；停止请求仍先保存再消费。

本轮仍基于未提交的 dev.11 源码构建，Host/原生必须作为同一候选使用。没有发布新版本、替换真实安装或宣称混用旧执行端兼容。

## 新证据

- before-races.json / after-races.json：原独立反例的原样副本，在新目录复跑；原目录 race-probes.json 保持原来的失败证据。
- race-regressions.txt / all-tests.txt：新增边界回归和完整测试结果。
- gui-races.json：隔离官方 Host、官方 Web 客户端、独立 Electron renderer 与现有原生窗口，验证六项定向检查。停止按钮使用原生鼠标事件；常规导航通过页面 UI handler。
- contract-checks.json：3 个合法包及 3 个预期拒绝样例，配置格式保持一致。
- sdk-reuse.json：官方 SDK 来源/版本、许可和客户端摘要；reuse-decisions.md 记录复用选择。
- 更新的源码摘要、原始证据完整性、进程清理回执以本目录最终 summary.json 为准。

GUI 夹具只在隔离副本增加：媒体 ready 等待文件、调用生产 requestStop 的认证测试路由、成功选择回执延迟，以及关闭 dsh://open 对真实应用的前台唤醒。生产逻辑和夹具修改范围通过源码比较记录；没有把测试分支加入正常产品运行。

早期 GUI 尝试受窗口导航、引导弹窗、异步状态布局变化影响，相关 attempt.json 仍保留。最终脚本先等待界面稳定、关闭隔离 profile 的引导弹窗，再实际点击停止。Host 返回而页面未握手时的退出问题及该次运行检查点保留在 gui-offline-clear-attempt.json；随后通过等待真实退出确认修复，最终完整结果以 gui-races.json 为准。

## 仍未验证

真实用户安装/profile、真实客户端外壳、实际托盘菜单鼠标点击、多显示器拖拽/完整窗口矩阵、长时间 CPU/内存；真实会话的代码块、表格、滚动及完整对比度仍按原交接待验。没有真实模型调用。此次未加入工作状态反馈、新扫描开场、静态减少动态、字体或制作平台功能。

当前交付目标为供再次独立验收的修复候选；原始验收不自动改为通过。共享工作区未提交、推送、发布或操作公共暂存区，皮肤线内容保持其所有权。
