# 主题盒子 · 皮肤制作交接包

更新：2026-11-08。直接从下面对应工作读取。主题盒子是 DSH 插件，皮肤交付为可导入 ZIP。

| 接收人 | 请先读 |
| --- | --- |
| 你本地自行制作／自己的 Agent 制作 | [制作与自行上架流程 A](developer-guide.md#3-两套制作与交付流程)，完成后执行第 9 节云端发布 |
| 第三方独立制作 | [独立制作交付流程 B](developer-guide.md#b-第三方在自己的环境中制作并交付)，再读 [配置与校验参考](configuration-reference.md) |
| 无桌宠主题的 UI、美术、动效和音频人员 | [无桌宠版全量素材清单](materials-without-pet.md) |
| 带桌宠主题的制作人员 | [带桌宠版全量素材清单](materials-with-pet.md) |
| 要做小演出、更多交互或声音增强 | [可选增强与后续素材清单](materials-optional.md) |
| 图标设计师 | [逐枚图标清单](icons.md) 与 `icon-register.csv` |

`asset-register.csv`、`audio-cues.csv`、`action-catalog.csv` 可直接填写。`theme-tokens.json` 是真实支持的配色键。开发校验工具与可运行几何样例单独装在 `dsh-skin-author-kit-1.1.0-dev.5.zip` 中。

当前工具包为 1.1.0-dev.5 本地候选，继续兼容 1.0 合同；上线状态见项目复核/发布记录。1.0 的功能记录与安装包见项目封版说明。最近 Windows 用户验收为 1.1.0-dev.3；dev.4 的库和下载队列等待本轮集中验收。后续规划在各表中明确标记，制作素材不等同于引擎已接入。
