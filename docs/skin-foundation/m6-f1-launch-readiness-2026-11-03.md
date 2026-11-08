# M6-F1 公开启动就绪语义返工

2026-11-03，模块线实施/定向验证，等待主控独立复验。原M6清单103文件、摘要`191e0a1bf938e7c44ef1b5b2d39cda66f26dbfbfdbde72e1c0201aa0b748efd2`及所有反例保留，不覆盖原送审身份。

独立探针复现了无皮肤公开API的兼容回归：`await start(); await action('react')`原来等pet.ready后成功，M6放宽为bridgeReady即返回后可能立即收到ACTION_UNAVAILABLE。action本身不自动启动。真实页面已按running/ready/availableActions保护动作入口，因此本问题不等于页面按钮普遍故障。原探针和before.json位于`reports/skin-foundation-m6-code-review/`，由主控提供。

生产只改`packages/dsh-companion/src/controller.mjs`启动轮询的一处条件：ready仍可结束等待；bridgeReady只有在调用明确传skinStandby，或原生已经登记可用的startup.ready为true时才能提前结束。两种adapter原来就传skinStandby，正常boot/显式预览则可利用真实冷快照登记状态；不只凭startup声明就放宽，也不新增调用参数、启动策略或时钟。无皮肤旧入口继续等待桌宠媒体。

原独立探针原样复跑到`reports/skin-foundation-m6-f1-2026-11-03/after-original-probe.json`：当前legacy等待303ms、返回ready=true，紧接react实际执行accepted；显式skinStandby在bridge阶段返回ready=false。`verify-startup-ready.mjs`补正常开场启动选项`{playIntro:true}`，受控原生状态为startup已登记可用、pet.ready持续false，实际Controller.start仅两次状态查询即返回，未阻塞于关闭的pet。三个分支均通过。探针使用真实生产Controller方法，原始探针还使用真实原生perform拒绝逻辑；子进程仅/usr/bin/true，无GUI或用户资料/授权库写入。

本地client/Mac构建与JavaScript/JSON检查通过；新清单仍用原103文件范围，除controller这一处外均与原M6一致，原生播放/恢复/停止源码和正式payload不变。0.7.1准确key`4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`的完整ended、文案及隔离进入回执沿用模块线原`content-071.json`；原15/8/2及整片不重跑。

现有隔离Host/renderer/native按主控要求保留供CUA复看，没有重启或热改。它仍加载原M6控制器；F1就绪条件由新源码的定向探针与构建核对验证，不将旧内存进程冒称F1实机部署。无真实DSH/profile、模型、提交、推送、部署或发布。
