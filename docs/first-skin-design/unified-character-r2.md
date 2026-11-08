# 统一角色修订 R2

2026-11-03。回应用户“桌宠形象应该跟主题形象保持一致”和“优化下”的反馈。

## 视觉结果

以已确认的扫描开场为角色基准，生成同角色 Q 版四姿态：安静待机、侧头回应、轻轻挥手、伸懒腰。银蓝长发、蓝青眼睛、白色褶边头饰和深蓝侧蝴蝶结保持一致；比例和材质统一为柔和立体 Q 版。

设置横幅、启动与桌宠、角色对照共用 designs/dsh-skin-v1/assets/whale-unified-r2/character-atlas-r2.png。原图 1254×1254，透明 RGBA，四格等分，不改写生成原图。全身裙装、领结、鞋履是本轮设计延伸，扫描参考没有展示完整全身设定。当前 needs-review。

## 行为与页面

- 点击回应 1.8 秒、完成挥手 2.6 秒、可选伸懒腰 3 秒，结束回同角色待机。
- 当前为姿态切换及 CSS 轻动态，不是完整逐帧动作；减少动态显示静态角色，停止后清空队列，恢复不重播开场。
- 角色对照页提供扫描基准、当前桌宠、固定识别点与四姿态选择。素材细节收入折叠说明。
- 修复 390px 窄窗的扫描裁切、方格比例及桌宠遮挡反馈按钮问题。

## 生成与来源

使用内置 imagegen，参考生成模式，transparent_background=true。精确提示见 designs/dsh-skin-v1/assets/whale-unified-r2/prompt.md，来源摘要、产物 SHA-256 与布局见同目录 generation.json，使用边界见 NOTICE.md。

扫描片原作者与 NOTICE 摘要差异尚未确认；生成衍生姿态不补齐原始角色使用权链，不声明官方身份、独占权或对外分发授权。

## 验证及交接

R2 的 25 项浏览器检查通过，证据 reports/first-skin/r2-browser-validation.json；透明分格审计见 r2-atlas-audit.json。旧版保留在 designs/dsh-skin-v1/index-r1.html 与 revisions/r1/。

现有 content/archive-warm-whale/ 保持 R1 技术验证包及原内容摘要，仍引用旧桌宠。既有底座隔离报告不证明 R2 角色接入。完整逐帧动作、合同要求的状态资源及原生宿主验证需在后续接入阶段完成；本轮没有修改底座或真实 DSH。
