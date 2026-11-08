# M6 最小启动接入：主控验收

2026-11-03。**M6本地实现与隔离验收通过，采用0.7.1内容；唯一兼容返工M6-F1已独立复验关闭。** 不是正式分发、真实客户端或最终美术验收。

## 准确源码与内容

- 原送审103文件：`191e0a1bf938e7c44ef1b5b2d39cda66f26dbfbfdbde72e1c0201aa0b748efd2`。
- F1修正版同103文件：`d21a386180042d83b12aab325cbe0e3f69bd5bd950329ecd677c433ad8e77e3f`。主控逐项校验无漂移，对原送审只有controller.mjs变化。
- 内容 `archive-warm-whale/0.7.1`：`4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`，目录 `designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready/`。

0.7.1继承0.6.0的theme/pet/旧3资源与八项默认；另加startup两资源。0.7.0→0.7.1只改版本及poster/video摘要、字节和来源。主控校验loader/差异，并读实际poster像素，差异只在footer小范围；“随时跳过”已改为“就绪后进入”。单片仍1280×720、205帧/25fps、8.20秒、无音轨。

## 独立审查与检查

只读审查代理核对103文件及14个生产变更，覆盖冷快照、同id更新、登记/播放分开、自动/手动偏好、pet/startup独立清理、播放token、恢复等待及原两项时钟/恢复反例。公共SkinCoordinator与M5逐字节相同。

主控阅读startup原生实现和页面恢复入口，并独立复跑15项相关Node检查，通过。作者8项原生生命周期、2项时钟后接管/停止、最终静态poster在pet关闭时videos=0等证据已读取，不重复旧全量GUI/模型矩阵。

主控以CUA操作现有官方隔离客户端：核对0.7.1已应用、pet关闭、自动播放=false；实点现有“预览开场”，查看原生窗口及文案/进入按钮。随后官方Host读回videoEnded=true、正常complete恰好增加一次，自动偏好仍false。主控截图的前导、播放器文字和进入按钮没有遮挡；内容线与作者的准确0.7.1扫描/睁眼实帧也保留。

主控又实点“停止全部皮肤效果”，实际页面显示效果已停止。本次实点不是在影片遮挡期间的后台物理鼠标测试。作者影片覆盖场景的停止证据是实际页面DOM按钮click触发原handler，证明按钮启用/处理链响应；早期poster阶段另有原生鼠标输入，边界分列。

## M6-F1兼容返工

作者冻结后主动指出launch等待被全局放宽为bridgeReady||ready。独立审查用实际公开start()→action('react')、250ms媒体延迟及原生perform拒绝条件复现：旧版等待媒体后成功，原M6提前返回ready:false，紧接动作失败ACTION_UNAVAILABLE。页面自身已有running&&ready与动作子集保护，不是页面按钮普遍故障。

只将提前返回条件收窄为显式skinStandby或实际startup.ready，旧无皮肤start继续等ready。审查代理和主控分别复跑同一探针：旧式调用等待约302–303ms并执行react；skinStandby仍在桥阶段返回。主控另复跑已登记startup、pet.ready持续false的真实Controller.start({playIntro:true})受控检查，两次状态查询即可返回。该问题关闭，没有扩大启动框架。

F1只改Controller，10个原生文件与正式构建payload由主控逐字节核对相同。原M6实播和本次CUA使用的保留进程未热改F1；F1验证来自新源码探针和构建核对。原生播放代码未变，因此相应实播证据继续适用，不称旧内存进程已经部署新Controller。

## 原反例与剩余边界

2.18秒恢复截断和约0.27秒片尾提前收起的原始证据保留。修正后，同内容正常attach/reload让首轮完成一次再restore，显式停止/换内容仍失效；时钟从实际poster/首次playing校准，实际ended另记回执。当前不是仅以“能解码”判定完整播放。

主控产物：`reports/skin-foundation-m6-acceptance-2026-11-03/`，含15项测试、F1三个分支、修正版103文件/10个payload核对、CUA截图与预览前后状态、清理结果。原独立探针before/after在`reports/skin-foundation-m6-code-review/`。

Host/renderer/native已由主控停止，bridge移除、所属进程为0。真实模型/工具调用、真实DSH安装/profile与前台协议交接、完整多屏/长期性能、最终美术和公开素材权属仍未由本轮完成；没有暂存/提交/推送/部署/发布。

下一步按 [M7交接](handoff-first-skin-m7.md) 收拢实际管理入口、将当前内容同步进本地插件评审构建，并做少量日常串联。现源包尚无packages/dsh-companion/skins目录，之前准确内容由隔离夹具注入；不能把该方式误称为普通安装已含首套皮肤。
