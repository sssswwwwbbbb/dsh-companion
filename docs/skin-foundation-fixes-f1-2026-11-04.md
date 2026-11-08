# 三项底座修复 F1 交审

F1 修复主题局部更新期间桌宠模型回复被丢弃的问题。相对上一轮只修改 `src/pet-interaction.mjs` 的阶段准入和 `tests/updates.test.mjs` 的定向回归，没有进入工作区整套集成或动作扩展。

## 修复与回归

原先 `PetInteraction.current()` 只接受 `ready`，而主题模块等待页面确认时协调器进入 `updating`，导致这时返回的桌宠模型回复报 `PET_NOT_AVAILABLE`。现在接受 `ready/updating` 两种已提交皮肤仍然存活的阶段，与现有工作反馈服务保持一致。

原有停止、已发起完整切换、模块启停、代次、内容标识、取消序号及 AbortSignal 检查保留。桌宠互动偏好的修改仍由桌宠适配器立即取消正在等待的互动；没有绕过当前性检查或增加新的调度框架。

新增测试连接真实 `SkinCoordinator.update`、`PageMailbox`、`PetInteraction` 和桌宠适配器的取消方法，用受控 provider 与原生传输回执控制交错：先开始点击互动，再让背景更新等待 Page ack，随后释放模型回复。回复在 `updating` 阶段执行一次且记录真实回执，之后主题确认到 0.09，代次保持不变。修复前此用例实际失败为 `PET_NOT_AVAILABLE`（`reproduced.txt`），修复后通过。测试没有调用真实模型或操作界面。

另一项定向检查用同一真实服务组合验证 Host 停止、独立停止、完整切换、禁用桌宠、互动偏好变化均抑制迟到回复，且不产生原生执行或历史记录；过期代次和内容标识也拒绝开始互动。

执行结果：

```sh
node --test --test-reporter=spec packages/dsh-skin-core/tests/updates.test.mjs packages/dsh-skin-core/tests/pet-interaction.test.mjs
# 20/20 passed, 0 skipped

node --test --test-reporter=spec packages/dsh-skin-core/tests/*.test.mjs tests/skin-library.test.mjs tests/skin-immersion.test.mjs
# 79/79 passed, 0 skipped

npm run build:client
```

同类阶段消费者已核对：工作反馈服务原已允许 `updating`；互动状态和原生事件轮询共用修复后的 `current()`。皮肤维护中的原生健康检查在 `ready` 时检查、局部更新期间暂缓，下个维护周期恢复；重复选择判断和设置页标签没有取消互动副作用。未发现需要随 F1 扩修的直接影响，没有改动这些消费者。

## 证据与隔离副本

原交审目录 `reports/skin-foundation-fixes-2026-11-04/` 及原 freeze 保留，原 77 项和实际隔离界面证据仍是该次提交的历史结果。F1 证据单列于 `reports/skin-foundation-fixes-f1-2026-11-04/`，新冻结、源码差异、语法检查、同步和保留产物核对见该目录下的 `source-freeze.json`、`summary.json`、`preview-source-match.json`、`preservation.json`。

本轮独立预览已从当前源码重新暂存、重新启动 Host 和页面，仍使用 `local.dsh.foundation.fixes.20261104`、“DSH 底座修复 · 隔离验收”、独立 dev.21 元数据及原本轮私有定位文件 `.local/skin-foundation-fixes-current.json`。修复后的 Host 模块字节已同步，原生和生成页面没有业务变更。F1 界面留存只确认预览恢复正常、健康皮肤及坏条目反馈仍可访问；本次模型交错证据是上述服务回归，后续由主控继续实际界面验收。

没有打 tgz、发布、修改日常 DSH、主控保留的 dev.20、未变素材，或执行 Git 提交/推送。当前停在同一节点，待主控独立复查。
